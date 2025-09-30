import { Injectable } from '@angular/core';
import { of, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { GetGeoJsonsService } from '../../services/plugin/get-geojsons.service';
import { MapLayer, MapInteractionCallbacks } from '../models/map-layer.model';

@Injectable({ providedIn: 'root' })
export class MapService {
  private map: any;
  private addedLayers: MapLayer[] = [];
  private activeDashedLayerIds: string[] = [];
  private layersWithClickHandlers: Set<string> = new Set();
  private clusterLayersWithHandlers: Set<string> = new Set();
  private lastGeoJsonStateByLayer: Record<string, {
    geoJsonHash: string;
    clusterPoints: boolean;
    pointType: string;
    animateLines: boolean;
    fillPolygons: boolean;
  }> = {};

  private dashArraySequence = [
    [0, 4, 3],
    [0.5, 4, 2.5],
    [1, 4, 2],
    [1.5, 4, 1.5],
    [2, 4, 1],
    [2.5, 4, 0.5],
    [3, 4, 0],
    [0, 0.5, 3, 3.5],
    [0, 1, 3, 3],
    [0, 1.5, 3, 2.5],
    [0, 2, 3, 2],
    [0, 2.5, 3, 1.5],
    [0, 3, 3, 1],
    [0, 3.5, 3, 0.5]
  ];

  private dashStep = 0;
  private animationFrameId: number | null = null;

  constructor(private getGeoJsonsService: GetGeoJsonsService) {}

  getMap(): any {
    return this.map;
  }

  async initMap(container: HTMLElement, basemapUrl: string): Promise<any> {
    const mapboxgl = (await import('mapbox-gl')).default;
    this.map = new mapboxgl.Map({
      accessToken: 'pk.eyJ1IjoicHNvcmFsIiwiYSI6ImNtZHJwOXJ1MjBpN2EybW9vYzFpMHE5a3UifQ.CGKehwJSuaC0L-cFW8_I2w',
      container,
      style: basemapUrl,
      center: [-98.54818, 40.00811],
      zoom: 4
    });

    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    return this.map;
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    this.resetTracking();
  }

  getTrackedLayers(): MapLayer[] {
    return this.addedLayers;
  }

  toggleLayerVisibility(layerKey: string): void {
    if (!this.map) {
      return;
    }

    const layer = this.addedLayers.find(l => l.key === layerKey);
    if (!layer) {
      return;
    }

    layer.ids.forEach(id => {
      const currentVisibility = this.map.getLayoutProperty(id, 'visibility');
      const isVisible = currentVisibility === 'visible' || currentVisibility === undefined;
      const nextVisibility = isVisible ? 'none' : 'visible';
      this.map.setLayoutProperty(id, 'visibility', nextVisibility);
      layer.visible = nextVisibility === 'visible';
    });
  }

  animateDashArray(startTimestamp = 0): void {
    const stepAnimation = (timestamp: number) => {
      const newStep = Math.floor((timestamp / 50) % this.dashArraySequence.length);
      if (newStep !== this.dashStep) {
        this.activeDashedLayerIds.forEach(layerId => {
          if (this.map?.getLayer(layerId)) {
            this.map.setPaintProperty(layerId, 'line-dasharray', this.dashArraySequence[newStep]);
          }
        });
        this.dashStep = newStep;
      }
      this.animationFrameId = requestAnimationFrame(stepAnimation);
    };

    this.animationFrameId = requestAnimationFrame(stepAnimation);
  }

  clearTrackedLayers(): void {
    this.addedLayers.splice(0, this.addedLayers.length);
  }

  clearHandlers(): void {
    this.layersWithClickHandlers.clear();
    this.clusterLayersWithHandlers.clear();
  }

  clearMapLayers(): void {
    if (!this.map) {
      return;
    }
    const style = this.map.getStyle();
    if (style && style.layers) {
      style.layers.forEach((layer: any) => {
        if (layer.id.startsWith('line-background-') || layer.id.startsWith('line-dashed-')) {
          if (this.map.getLayer(layer.id)) {
            this.map.removeLayer(layer.id);
          }
        }
      });
    }

    if (style && style.sources) {
      Object.keys(style.sources).forEach((sourceId: string) => {
        if (sourceId.startsWith('route-')) {
          if (this.map.getSource(sourceId)) {
            this.map.removeSource(sourceId);
          }
        }
      });
    }

    this.resetTracking();
  }

  processLayerData(
    data: any,
    layerKey: string,
    layerTitle: string,
    animateLines: boolean,
    pointType: string,
    fillPolygons: boolean,
    clusterPoints: boolean,
    callbacks: MapInteractionCallbacks
  ): Observable<any> {
    if (!data || Object.keys(data).length === 0) {
      return of([]);
    }

    return this.getGeoJsonsService.getGeoJsons(data).pipe(
      tap((geoJsons: any[]) => {
        const previousState = this.lastGeoJsonStateByLayer[layerKey];
        const geoJsonHash = JSON.stringify(geoJsons);
        const stateChanged =
          !previousState ||
          previousState.geoJsonHash !== geoJsonHash ||
          previousState.clusterPoints !== clusterPoints ||
          previousState.pointType !== pointType ||
          previousState.animateLines !== animateLines ||
          previousState.fillPolygons !== fillPolygons;

        if (!stateChanged || !this.map) {
          return;
        }

        let existingLayerInTracker = this.addedLayers.find(layer => layer.key === layerKey);
        if (!existingLayerInTracker) {
          existingLayerInTracker = { key: layerKey, title: layerTitle, visible: true, ids: [] };
          this.addedLayers.push(existingLayerInTracker);
        }

        const lineSourceId = `line-${layerKey}`;
        const backgroundLayerId = `line-background-${layerKey}`;
        const dashedLayerId = `line-dashed-${layerKey}`;
        const pointSourceId = `point-${layerKey}`;
        const pointLayerId = `point-layer-${layerKey}`;
        const pointClusterLayerId = `point-cluster-layer-${layerKey}`;
        const pointClusterCountLayerId = `point-cluster-count-layer-${layerKey}`;
        const polygonFillLayerId = `polygon-fill-layer-${layerKey}`;

        const lineFeatureCollection = {
          type: 'FeatureCollection',
          features: [] as any[]
        };

        const pointFeatureCollection = {
          type: 'FeatureCollection',
          features: [] as any[]
        };

        geoJsons.forEach(featureCollection => {
          if (!featureCollection) {
            return;
          }

          const features = featureCollection.features || [];
          const lineFeatures = features.filter((feature: any) =>
            feature.geometry.type === 'LineString' ||
            feature.geometry.type === 'MultiLineString' ||
            feature.geometry.type === 'Polygon' ||
            feature.geometry.type === 'MultiPolygon'
          );
          const pointFeatures = features.filter((feature: any) =>
            feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint'
          );

          if (lineFeatures.length > 0) {
            lineFeatureCollection.features.push(...lineFeatures);
          }

          if (pointFeatures.length > 0) {
            pointFeatureCollection.features.push(...pointFeatures);
          }
        });

        const addTrackedLayerId = (id: string) => {
          if (!existingLayerInTracker!.ids.includes(id)) {
            existingLayerInTracker!.ids.push(id);
          }
        };

        const removeLayerAndTracking = (id: string) => {
          if (this.map.getLayer(id)) {
            this.map.removeLayer(id);
          }
          existingLayerInTracker!.ids = existingLayerInTracker!.ids.filter(existingId => existingId !== id);
          this.layersWithClickHandlers.delete(id);
          this.clusterLayersWithHandlers.delete(id);
        };

        const clearPointArtifacts = () => {
          [pointLayerId, pointClusterLayerId, pointClusterCountLayerId].forEach(removeLayerAndTracking);
          if (this.map.getSource(pointSourceId)) {
            this.map.removeSource(pointSourceId);
          }
        };

        if (lineFeatureCollection.features.length > 0) {
          const existingLineSource = this.map.getSource(lineSourceId);
          if (existingLineSource) {
            existingLineSource.setData(lineFeatureCollection);
          } else {
            this.map.addSource(lineSourceId, {
              type: 'geojson',
              lineMetrics: true,
              data: lineFeatureCollection,
              generateId: true
            });
          }

          if (animateLines && !this.map.getLayer(backgroundLayerId)) {
            this.map.addLayer({
              type: 'line',
              source: lineSourceId,
              id: backgroundLayerId,
              paint: {
                'line-color': ['get', 'line-color'],
                'line-width': ['coalesce', ['get', 'line-width'], 2],
                'line-opacity': 0.4
              }
            });
            addTrackedLayerId(backgroundLayerId);
          }

          if (animateLines && !this.map.getLayer(dashedLayerId)) {
            this.map.addLayer({
              type: 'line',
              source: lineSourceId,
              id: dashedLayerId,
              paint: {
                'line-color': ['get', 'line-color'],
                'line-width': ['coalesce', ['get', 'line-width'], 2],
                'line-dasharray': [0, 4, 3],
                'line-emissive-strength': 1
              }
            });
            if (!this.activeDashedLayerIds.includes(dashedLayerId)) {
              this.activeDashedLayerIds.push(dashedLayerId);
            }
            addTrackedLayerId(dashedLayerId);
          }

          if (!animateLines && !this.map.getLayer(dashedLayerId)) {
            this.map.addLayer({
              type: 'line',
              source: lineSourceId,
              id: dashedLayerId,
              paint: {
                'line-color': ['get', 'line-color'],
                'line-width': ['coalesce', ['get', 'line-width'], 2],
                'line-emissive-strength': 1
              }
            });
            addTrackedLayerId(dashedLayerId);
          }

          if (fillPolygons && !this.map.getLayer(polygonFillLayerId)) {
            this.map.addLayer({
              type: 'fill',
              source: lineSourceId,
              id: polygonFillLayerId,
              paint: {
                'fill-color': ['get', 'fill-color'],
                'fill-opacity': ['coalesce', ['get', 'fill-opacity'], 0.4]
              }
            });
            addTrackedLayerId(polygonFillLayerId);
          }

          this.registerHoverHandlers(dashedLayerId, callbacks);
        }

        if (pointFeatureCollection.features.length > 0) {
          clearPointArtifacts();

          const pointSourceConfig: any = {
            type: 'geojson',
            data: pointFeatureCollection,
            generateId: true
          };

          if (clusterPoints) {
            pointSourceConfig.cluster = true;
            pointSourceConfig.clusterRadius = 50;
            pointSourceConfig.clusterMaxZoom = 14;
          }

          this.map.addSource(pointSourceId, pointSourceConfig);

          if (pointType === 'Icon') {
            const pointLayerConfig: any = {
              id: pointLayerId,
              type: 'symbol',
              source: pointSourceId,
              layout: {
                'icon-image': [
                  'image',
                  ['case',
                    ['==', ['get', 'pin_type'], 'Factory'], 'Factory',
                    ['==', ['get', 'pin_type'], 'Ship'], 'Ship',
                    ['==', ['get', 'pin_type'], 'Anchor'], 'Anchor',
                    ['==', ['get', 'pin_type'], 'User'], 'User',
                    'flag'
                  ],
                  { params: { pin_color: ['get', 'pin_color'] } },
                ],
                'icon-anchor': 'bottom'
              }
            };

            if (clusterPoints) {
              pointLayerConfig.filter = ['!', ['has', 'point_count']];
            }

            this.map.addLayer(pointLayerConfig);
            addTrackedLayerId(pointLayerId);
          }

          if (pointType === 'Circle') {
            const pointLayerConfig: any = {
              id: pointLayerId,
              type: 'circle',
              source: pointSourceId,
              paint: {
                'circle-radius': ['coalesce', ['get', 'circle-radius'], 2],
                'circle-color': ['coalesce', ['get', 'circle-color'], '#3d293d'],
                'circle-stroke-width': ['coalesce', ['get', 'circle-stroke-width'], 1],
                'circle-stroke-color': ['coalesce', ['get', 'circle-stroke-color'], '#3d293d'],
                'circle-opacity': ['coalesce', ['get', 'circle-opacity'], 1]
              }
            };

            if (clusterPoints) {
              pointLayerConfig.filter = ['!', ['has', 'point_count']];
            }

            this.map.addLayer(pointLayerConfig);
            addTrackedLayerId(pointLayerId);
          }

          if (clusterPoints) {
            this.map.addLayer({
              id: pointClusterLayerId,
              type: 'circle',
              source: pointSourceId,
              filter: ['has', 'point_count'],
              paint: {
                'circle-color': [
                  'step',
                  ['get', 'point_count'],
                  '#51bbd6',
                  100,
                  '#f1f075',
                  750,
                  '#f28cb1'
                ],
                'circle-radius': [
                  'step',
                  ['get', 'point_count'],
                  20,
                  100,
                  30,
                  750,
                  40
                ],
                'circle-opacity': 0.85
              }
            });
            addTrackedLayerId(pointClusterLayerId);

            this.map.addLayer({
              id: pointClusterCountLayerId,
              type: 'symbol',
              source: pointSourceId,
              filter: ['has', 'point_count'],
              layout: {
                'text-field': '{point_count_abbreviated}',
                'text-size': 12,
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold']
              },
              paint: {
                'text-color': '#ffffff'
              }
            });
            addTrackedLayerId(pointClusterCountLayerId);

            this.setupClusterInteraction(pointSourceId, pointClusterLayerId, pointClusterCountLayerId, callbacks);
          }

          this.registerHoverHandlers(pointLayerId, callbacks);
        } else {
          clearPointArtifacts();
        }

        this.lastGeoJsonStateByLayer[layerKey] = {
          geoJsonHash,
          clusterPoints,
          pointType,
          animateLines,
          fillPolygons
        };
      })
    );
  }

  private registerHoverHandlers(layerId: string, callbacks: MapInteractionCallbacks): void {
    if (!this.map || this.layersWithClickHandlers.has(layerId) || !this.map.getLayer(layerId)) {
      return;
    }

    this.map.on('mouseenter', layerId, (e: any) => {
      this.map.getCanvas().style.cursor = 'pointer';
      if (callbacks.onHoverEnter && e.features && e.features.length > 0) {
        callbacks.onHoverEnter(e.features[0], { x: e.point.x, y: e.point.y });
      }
    });

    this.map.on('mousemove', layerId, (e: any) => {
      if (callbacks.onHoverMove) {
        callbacks.onHoverMove({ x: e.point.x, y: e.point.y });
      }
    });

    this.map.on('mouseleave', layerId, () => {
      this.map.getCanvas().style.cursor = '';
      if (callbacks.onHoverLeave) {
        callbacks.onHoverLeave();
      }
    });

    this.layersWithClickHandlers.add(layerId);
  }

  private setupClusterInteraction(
    sourceId: string,
    clusterLayerId: string,
    clusterCountLayerId: string,
    callbacks: MapInteractionCallbacks
  ): void {
    if (!this.map) {
      return;
    }

    [clusterLayerId, clusterCountLayerId].forEach(layerId => {
      if (this.clusterLayersWithHandlers.has(layerId) || !this.map!.getLayer(layerId)) {
        return;
      }

      this.map!.on('click', layerId, (e: any) => {
        const features = this.map!.queryRenderedFeatures(e.point, { layers: [layerId] });
        if (!features.length) {
          return;
        }
        const clusterFeature = features[0];
        const clusterId = clusterFeature.properties?.cluster_id;
        const source = this.map!.getSource(sourceId);
        if (!source || clusterId === undefined) {
          return;
        }
        source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) {
            return;
          }
          this.map!.easeTo({ center: clusterFeature.geometry.coordinates, zoom });
        });
      });

      this.map!.on('mouseenter', layerId, () => {
        this.map!.getCanvas().style.cursor = 'pointer';
      });

      this.map!.on('mouseleave', layerId, () => {
        this.map!.getCanvas().style.cursor = '';
      });

      this.clusterLayersWithHandlers.add(layerId);
    });
  }

  private resetTracking(): void {
    this.addedLayers.splice(0, this.addedLayers.length);
    this.activeDashedLayerIds = [];
    this.layersWithClickHandlers.clear();
    this.clusterLayersWithHandlers.clear();
    this.lastGeoJsonStateByLayer = {};
    this.dashStep = 0;
  }
}
