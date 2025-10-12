import { DASH_SEQUENCE, DEFAULT_BASEMAP, MAP_ACCESS_TOKEN, MAP_DEFAULT_VIEW } from './constants.js';
import { extractGeoJsons, flattenFeatures } from './geojson.js';

let mapboxDrawLoader = null;

const loadMapboxDraw = async () => {
  if (!mapboxDrawLoader) {
    mapboxDrawLoader = import('@mapbox/mapbox-gl-draw').then(module => module.default ?? module);
  }
  return mapboxDrawLoader;
};

const isPointInRing = (point, ring) => {
  let isInside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersects = yi > point[1] !== yj > point[1] && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) {
      isInside = !isInside;
    }
  }
  return isInside;
};

const pointInPolygon = (point, polygon) => {
  if (!Array.isArray(polygon)) {
    return false;
  }
  for (let polyIndex = 0; polyIndex < polygon.length; polyIndex += 1) {
    const rings = polygon[polyIndex];
    if (!Array.isArray(rings) || rings.length === 0) {
      continue;
    }
    if (!isPointInRing(point, rings[0])) {
      continue;
    }
    let inHole = false;
    for (let ringIndex = 1; ringIndex < rings.length; ringIndex += 1) {
      if (isPointInRing(point, rings[ringIndex])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) {
      return true;
    }
  }
  return false;
};

const LAYER_KEYS = ['layer1', 'layer2', 'layer3', 'layer4', 'scatterLayer'];

const LAYER_ID_TOKENS = {
  lineSource: key => `line-${key}`,
  lineBackground: key => `line-background-${key}`,
  lineDashed: key => `line-dashed-${key}`,
  polygonFill: key => `polygon-fill-layer-${key}`,
  pointSource: key => `point-${key}`,
  pointLayer: key => `point-layer-${key}`,
  pointCluster: key => `point-cluster-layer-${key}`,
  pointClusterCount: key => `point-cluster-count-layer-${key}`,
};

const cloneLayerState = layers => layers.map(layer => ({ ...layer, ids: [...layer.ids] }));

class MapService {
  constructor() {
    this.map = null;
    this.mapbox = null;
    this.addedLayers = [];
    this.activeDashedLayerIds = [];
    this.layersWithHoverHandlers = new Set();
    this.clusterLayersWithHandlers = new Set();
    this.layerEventHandlers = new Map();
    this.clusterEventHandlers = new Map();
    this.selectedFeatureByLayer = {};
    this.lastGeoJsonStateByLayer = {};
    this.layerSubscribers = new Set();
    this.animationFrameId = null;
    this.dashStep = 0;
    this.drawControl = null;
    this.drawControlAdded = false;
    this.activeLassoLayerKey = null;
    this.lassoCallback = null;
    this.handleDrawEvent = this.handleDrawEvent.bind(this);
    this.handleDrawModeChange = this.handleDrawModeChange.bind(this);
  }

  subscribeToLayerState(listener) {
    if (typeof listener !== 'function') {
      return () => {};
    }
    this.layerSubscribers.add(listener);
    listener(cloneLayerState(this.addedLayers));
    return () => {
      this.layerSubscribers.delete(listener);
    };
  }

  notifyLayerSubscribers() {
    const snapshot = cloneLayerState(this.addedLayers);
    this.layerSubscribers.forEach(listener => listener(snapshot));
  }

  async initMap(container, basemapUrl = DEFAULT_BASEMAP) {
    if (!container) {
      throw new Error('MapService.initMap requires a container element.');
    }

    if (!this.mapbox) {
      const mapboxModule = await import('mapbox-gl');
      this.mapbox = mapboxModule.default ?? mapboxModule;
      this.mapbox.accessToken = MAP_ACCESS_TOKEN;
    }

    if (this.map) {
      this.dispose();
    }

    this.map = new this.mapbox.Map({
      container,
      style: basemapUrl || DEFAULT_BASEMAP,
      center: MAP_DEFAULT_VIEW.center,
      zoom: MAP_DEFAULT_VIEW.zoom,
    });

    this.map.addControl(new this.mapbox.NavigationControl(), 'top-right');
    return this.map;
  }

  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.map) {
      this.disableLassoSelection();
      this.detachAllEventHandlers();
      this.map.remove();
      this.map = null;
    }

    this.resetTracking();
    this.notifyLayerSubscribers();
  }

  resetTracking() {
    this.addedLayers = [];
    this.activeDashedLayerIds = [];
    this.layersWithHoverHandlers.clear();
    this.clusterLayersWithHandlers.clear();
    this.layerEventHandlers.clear();
    this.clusterEventHandlers.clear();
    this.selectedFeatureByLayer = {};
    this.lastGeoJsonStateByLayer = {};
    this.dashStep = 0;
    this.activeLassoLayerKey = null;
    this.lassoCallback = null;
  }

  detachAllEventHandlers() {
    if (!this.map) {
      return;
    }

    this.layerEventHandlers.forEach((handlers, layerId) => {
      if (handlers.mouseenter) {
        this.map.off('mouseenter', layerId, handlers.mouseenter);
      }
      if (handlers.mousemove) {
        this.map.off('mousemove', layerId, handlers.mousemove);
      }
      if (handlers.mouseleave) {
        this.map.off('mouseleave', layerId, handlers.mouseleave);
      }
    });

    this.clusterEventHandlers.forEach((handlers, layerId) => {
      if (handlers.click) {
        this.map.off('click', layerId, handlers.click);
      }
      if (handlers.mouseenter) {
        this.map.off('mouseenter', layerId, handlers.mouseenter);
      }
      if (handlers.mouseleave) {
        this.map.off('mouseleave', layerId, handlers.mouseleave);
      }
    });

    this.layerEventHandlers.clear();
    this.clusterEventHandlers.clear();
    this.layersWithHoverHandlers.clear();
    this.clusterLayersWithHandlers.clear();
  }

  clearTrackedLayers() {
    this.addedLayers.splice(0, this.addedLayers.length);
    this.notifyLayerSubscribers();
  }

  clearHandlers() {
    this.detachAllEventHandlers();
  }

  clearMapLayers() {
    if (!this.map) {
      return;
    }

    const style = this.map.getStyle?.();
    if (style?.layers) {
      [...style.layers]
        .filter(layer =>
          layer.id.startsWith('line-background-') ||
          layer.id.startsWith('line-dashed-') ||
          layer.id.startsWith('polygon-fill-layer-') ||
          layer.id.startsWith('point-layer-') ||
          layer.id.startsWith('point-cluster-layer-') ||
          layer.id.startsWith('point-cluster-count-layer-'),
        )
        .forEach(layer => {
          if (this.map.getLayer(layer.id)) {
            this.map.removeLayer(layer.id);
          }
        });
    }

    if (style?.sources) {
      Object.keys(style.sources)
        .filter(sourceId => sourceId.startsWith('line-') || sourceId.startsWith('point-'))
        .forEach(sourceId => {
          if (this.map.getSource(sourceId)) {
            this.map.removeSource(sourceId);
          }
        });
    }

    this.resetTracking();
    this.notifyLayerSubscribers();
  }

  getTrackedLayers() {
    return this.addedLayers;
  }

  toggleLayerVisibility(layerKey) {
    if (!this.map) {
      return;
    }

    const targetLayer = this.addedLayers.find(layer => layer.key === layerKey);
    if (!targetLayer) {
      return;
    }

    targetLayer.ids.forEach(id => {
      if (!this.map.getLayer(id)) {
        return;
      }
      const current = this.map.getLayoutProperty(id, 'visibility');
      const isVisible = current === 'visible' || current === undefined;
      this.map.setLayoutProperty(id, 'visibility', isVisible ? 'none' : 'visible');
      targetLayer.visible = !isVisible;
    });

    this.notifyLayerSubscribers();
  }

  stopDashAnimation() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  animateDashArray() {
    if (!this.map || this.activeDashedLayerIds.length === 0) {
      this.stopDashAnimation();
      return;
    }

    this.stopDashAnimation();

    const stepAnimation = timestamp => {
      const nextStep = Math.floor((timestamp / 50) % DASH_SEQUENCE.length);
      if (nextStep !== this.dashStep) {
        this.activeDashedLayerIds.forEach(layerId => {
          if (this.map?.getLayer(layerId)) {
            this.map.setPaintProperty(layerId, 'line-dasharray', DASH_SEQUENCE[nextStep]);
          }
        });
        this.dashStep = nextStep;
      }
      this.animationFrameId = requestAnimationFrame(stepAnimation);
    };

    this.animationFrameId = requestAnimationFrame(stepAnimation);
  }

  processLayerData(
    elementData,
    layerKey,
    layerTitle,
    animateLines,
    pointType,
    fillPolygons,
    clusterPoints,
    callbacks = {},
  ) {
    if (!this.map || !LAYER_KEYS.includes(layerKey)) {
      return;
    }

    const tracker = this.ensureLayerTracker(layerKey, layerTitle);

    if (!elementData || Object.keys(elementData).length === 0) {
      this.removeLayerArtifacts(layerKey, tracker);
      delete this.lastGeoJsonStateByLayer[layerKey];
      this.notifyLayerSubscribers();
      return;
    }

    const geoJsons = extractGeoJsons(elementData);
    const geoJsonHash = JSON.stringify(geoJsons);
    const previousState = this.lastGeoJsonStateByLayer[layerKey];
    const stateChanged =
      !previousState ||
      previousState.geoJsonHash !== geoJsonHash ||
      previousState.clusterPoints !== clusterPoints ||
      previousState.pointType !== pointType ||
      previousState.animateLines !== animateLines ||
      previousState.fillPolygons !== fillPolygons;

    if (!stateChanged) {
      return;
    }

    const lineFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };
    const pointFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };

    let polygonsPresent = false;

    geoJsons.forEach(geoJson => {
      const features = flattenFeatures(geoJson);
      features.forEach(feature => {
        const geometryType = feature.geometry?.type;
        if (!geometryType) {
          return;
        }

        if (geometryType === 'Point') {
          pointFeatureCollection.features.push(feature);
          return;
        }

        if (geometryType === 'MultiPoint') {
          (feature.geometry.coordinates ?? []).forEach(coord => {
            pointFeatureCollection.features.push({
              type: 'Feature',
              properties: feature.properties ?? {},
              geometry: { type: 'Point', coordinates: coord },
            });
          });
          return;
        }

        if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
          lineFeatureCollection.features.push(feature);
          return;
        }

        if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
          polygonsPresent = true;
          lineFeatureCollection.features.push(feature);
        }
      });
    });

    const hasLines = lineFeatureCollection.features.length > 0;
    const hasPoints = pointFeatureCollection.features.length > 0;

    const lineSourceId = LAYER_ID_TOKENS.lineSource(layerKey);
    const backgroundLayerId = LAYER_ID_TOKENS.lineBackground(layerKey);
    const dashedLayerId = LAYER_ID_TOKENS.lineDashed(layerKey);
    const fillLayerId = LAYER_ID_TOKENS.polygonFill(layerKey);
    const pointSourceId = LAYER_ID_TOKENS.pointSource(layerKey);
    const pointLayerId = LAYER_ID_TOKENS.pointLayer(layerKey);
    const pointClusterLayerId = LAYER_ID_TOKENS.pointCluster(layerKey);
    const pointClusterCountLayerId = LAYER_ID_TOKENS.pointClusterCount(layerKey);

    const removeLayerAndTracking = id => {
      if (this.map?.getLayer(id)) {
        this.map.removeLayer(id);
      }
      this.detachLayerHandlers(id);
      tracker.ids = tracker.ids.filter(existingId => existingId !== id);
    };

    const removeSourceIfExists = id => {
      if (this.map?.getSource(id)) {
        this.map.removeSource(id);
      }
    };

    const addTrackedLayerId = id => {
      if (!tracker.ids.includes(id)) {
        tracker.ids.push(id);
      }
      tracker.visible = true;
    };

    const clearPointArtifacts = () => {
      removeLayerAndTracking(pointLayerId);
      removeLayerAndTracking(pointClusterLayerId);
      removeLayerAndTracking(pointClusterCountLayerId);
      removeSourceIfExists(pointSourceId);
    };

    const clearLineArtifacts = () => {
      removeLayerAndTracking(backgroundLayerId);
      removeLayerAndTracking(dashedLayerId);
      removeLayerAndTracking(fillLayerId);
      removeSourceIfExists(lineSourceId);
      this.activeDashedLayerIds = this.activeDashedLayerIds.filter(id => id !== dashedLayerId);
    };

    if (hasLines) {
      if (this.map.getSource(lineSourceId)) {
        this.map.getSource(lineSourceId).setData(lineFeatureCollection);
      } else {
        this.map.addSource(lineSourceId, {
          type: 'geojson',
          data: lineFeatureCollection,
          lineMetrics: true,
          generateId: true,
        });
      }

      if (animateLines) {
        if (!this.map.getLayer(backgroundLayerId)) {
          this.map.addLayer({
            id: backgroundLayerId,
            type: 'line',
            source: lineSourceId,
            paint: {
              'line-color': ['coalesce', ['get', 'line-color'], '#3d293d'],
              'line-width': ['coalesce', ['get', 'line-width'], 2],
              'line-opacity': 0.4,
            },
          });
        }
        addTrackedLayerId(backgroundLayerId);

        if (!this.map.getLayer(dashedLayerId)) {
          this.map.addLayer({
            id: dashedLayerId,
            type: 'line',
            source: lineSourceId,
            paint: {
              'line-color': ['coalesce', ['get', 'line-color'], '#3d293d'],
              'line-width': ['coalesce', ['get', 'line-width'], 2],
              'line-dasharray': DASH_SEQUENCE[0],
              'line-emissive-strength': 1,
            },
          });
        }
        if (!this.activeDashedLayerIds.includes(dashedLayerId)) {
          this.activeDashedLayerIds.push(dashedLayerId);
        }
      } else {
        removeLayerAndTracking(backgroundLayerId);
        if (!this.map.getLayer(dashedLayerId)) {
          this.map.addLayer({
            id: dashedLayerId,
            type: 'line',
            source: lineSourceId,
            paint: {
              'line-color': ['coalesce', ['get', 'line-color'], '#3d293d'],
              'line-width': ['coalesce', ['get', 'line-width'], 2],
            },
          });
        }
        this.activeDashedLayerIds = this.activeDashedLayerIds.filter(id => id !== dashedLayerId);
      }
      addTrackedLayerId(dashedLayerId);

      if (fillPolygons && polygonsPresent) {
        if (!this.map.getLayer(fillLayerId)) {
          this.map.addLayer({
            id: fillLayerId,
            type: 'fill',
            source: lineSourceId,
            paint: {
              'fill-color': ['coalesce', ['get', 'fill-color'], '#f59a23'],
              'fill-opacity': ['coalesce', ['get', 'fill-opacity'], 0.35],
            },
          });
        }
        addTrackedLayerId(fillLayerId);
      } else {
        removeLayerAndTracking(fillLayerId);
      }

      this.registerHoverHandlers(dashedLayerId, callbacks);
    } else {
      clearLineArtifacts();
    }

    if (hasPoints) {
      clearPointArtifacts();

      const sourceConfig = {
        type: 'geojson',
        data: pointFeatureCollection,
        generateId: true,
      };

      if (clusterPoints) {
        sourceConfig.cluster = true;
        sourceConfig.clusterRadius = 50;
        sourceConfig.clusterMaxZoom = 14;
      }

      this.map.addSource(pointSourceId, sourceConfig);

      if (pointType === 'Icon') {
        const pointLayerConfig = {
          id: pointLayerId,
          type: 'symbol',
          source: pointSourceId,
          layout: {
            'icon-image': [
              'image',
              [
                'case',
                ['==', ['get', 'pin_type'], 'Factory'], 'Factory',
                ['==', ['get', 'pin_type'], 'Ship'], 'Ship',
                ['==', ['get', 'pin_type'], 'Anchor'], 'Anchor',
                ['==', ['get', 'pin_type'], 'User'], 'User',
                'flag',
              ],
              { params: { pin_color: ['get', 'pin_color'] } },
            ],
            'icon-anchor': 'bottom',
          },
        };

        if (clusterPoints) {
          pointLayerConfig.filter = ['!', ['has', 'point_count']];
        }

        this.map.addLayer(pointLayerConfig);
      } else {
        const pointLayerConfig = {
          id: pointLayerId,
          type: 'circle',
          source: pointSourceId,
          paint: {
            'circle-radius': ['coalesce', ['get', 'circle-radius'], 4],
            'circle-color': ['coalesce', ['get', 'circle-color'], '#3d293d'],
            'circle-stroke-width': ['coalesce', ['get', 'circle-stroke-width'], 1],
            'circle-stroke-color': ['coalesce', ['get', 'circle-stroke-color'], '#ffffff'],
            'circle-opacity': ['coalesce', ['get', 'circle-opacity'], 0.9],
          },
        };

        if (clusterPoints) {
          pointLayerConfig.filter = ['!', ['has', 'point_count']];
        }

        this.map.addLayer(pointLayerConfig);
      }

      addTrackedLayerId(pointLayerId);

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
              '#f28cb1',
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              20,
              100,
              30,
              750,
              40,
            ],
            'circle-opacity': 0.85,
          },
        });
        this.map.addLayer({
          id: pointClusterCountLayerId,
          type: 'symbol',
          source: pointSourceId,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 12,
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          },
          paint: {
            'text-color': '#ffffff',
          },
        });
        addTrackedLayerId(pointClusterLayerId);
        addTrackedLayerId(pointClusterCountLayerId);
        this.setupClusterInteraction(pointSourceId, pointClusterLayerId, pointClusterCountLayerId, callbacks);
      } else {
        removeLayerAndTracking(pointClusterLayerId);
        removeLayerAndTracking(pointClusterCountLayerId);
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
      fillPolygons,
    };

    this.notifyLayerSubscribers();
  }

  ensureLayerTracker(layerKey, layerTitle) {
    let tracker = this.addedLayers.find(layer => layer.key === layerKey);
    if (!tracker) {
      tracker = {
        key: layerKey,
        title: layerTitle,
        visible: true,
        ids: [],
      };
      this.addedLayers.push(tracker);
    } else if (layerTitle && tracker.title !== layerTitle) {
      tracker.title = layerTitle;
    }
    return tracker;
  }

  removeLayerArtifacts(layerKey, tracker) {
    if (!this.map) {
      return;
    }

    const lineSourceId = LAYER_ID_TOKENS.lineSource(layerKey);
    const backgroundLayerId = LAYER_ID_TOKENS.lineBackground(layerKey);
    const dashedLayerId = LAYER_ID_TOKENS.lineDashed(layerKey);
    const fillLayerId = LAYER_ID_TOKENS.polygonFill(layerKey);
    const pointSourceId = LAYER_ID_TOKENS.pointSource(layerKey);
    const pointLayerId = LAYER_ID_TOKENS.pointLayer(layerKey);
    const pointClusterLayerId = LAYER_ID_TOKENS.pointCluster(layerKey);
    const pointClusterCountLayerId = LAYER_ID_TOKENS.pointClusterCount(layerKey);

    const removeLayerAndTracking = id => {
      if (this.map.getLayer(id)) {
        this.map.removeLayer(id);
      }
      this.detachLayerHandlers(id);
      if (tracker) {
        tracker.ids = tracker.ids.filter(existingId => existingId !== id);
      }
      this.activeDashedLayerIds = this.activeDashedLayerIds.filter(existingId => existingId !== id);
    };

    const removeSourceIfExists = id => {
      if (this.map.getSource(id)) {
        this.map.removeSource(id);
      }
    };

    removeLayerAndTracking(backgroundLayerId);
    removeLayerAndTracking(dashedLayerId);
    removeLayerAndTracking(fillLayerId);
    removeLayerAndTracking(pointLayerId);
    removeLayerAndTracking(pointClusterLayerId);
    removeLayerAndTracking(pointClusterCountLayerId);

    removeSourceIfExists(lineSourceId);
    removeSourceIfExists(pointSourceId);

    if (tracker && tracker.ids.length === 0) {
      tracker.visible = false;
    }
  }

  detachLayerHandlers(layerId) {
    if (!this.map) {
      return;
    }

    const handlers = this.layerEventHandlers.get(layerId);
    if (handlers) {
      if (handlers.mouseenter) {
        this.map.off('mouseenter', layerId, handlers.mouseenter);
      }
      if (handlers.mousemove) {
        this.map.off('mousemove', layerId, handlers.mousemove);
      }
      if (handlers.mouseleave) {
        this.map.off('mouseleave', layerId, handlers.mouseleave);
      }
      if (handlers.click) {
        this.map.off('click', layerId, handlers.click);
      }
      this.layerEventHandlers.delete(layerId);
    }

    const clusterHandlers = this.clusterEventHandlers.get(layerId);
    if (clusterHandlers) {
      if (clusterHandlers.click) {
        this.map.off('click', layerId, clusterHandlers.click);
      }
      if (clusterHandlers.mouseenter) {
        this.map.off('mouseenter', layerId, clusterHandlers.mouseenter);
      }
      if (clusterHandlers.mouseleave) {
        this.map.off('mouseleave', layerId, clusterHandlers.mouseleave);
      }
      this.clusterEventHandlers.delete(layerId);
    }

    this.layersWithHoverHandlers.delete(layerId);
    this.clusterLayersWithHandlers.delete(layerId);
    this.updateSelectedFeature(layerId, null);
  }

  async enableLassoSelection(layerKey, callback) {
    if (!this.map) {
      return false;
    }

    const MapboxDraw = await loadMapboxDraw();
    if (!this.drawControl) {
      this.drawControl = new MapboxDraw({ displayControlsDefault: false });
    }

    if (!this.drawControlAdded) {
      this.map.addControl(this.drawControl, 'top-left');
      this.drawControlAdded = true;
    }

    this.disableLassoSelection(true);

    this.activeLassoLayerKey = layerKey;
    this.lassoCallback = callback;

    this.map.on('draw.create', this.handleDrawEvent);
    this.map.on('draw.modechange', this.handleDrawModeChange);

    this.drawControl.deleteAll();
    this.drawControl.changeMode('draw_polygon');

    this.map.dragPan?.disable();
    this.map.boxZoom?.disable();
    this.map.doubleClickZoom?.disable();
    this.map.keyboard?.disable();

    return true;
  }

  disableLassoSelection(preserveControl = false) {
    if (!this.map) {
      this.activeLassoLayerKey = null;
      this.lassoCallback = null;
      return;
    }

    if (this.drawControl) {
      this.map.off('draw.create', this.handleDrawEvent);
      this.map.off('draw.modechange', this.handleDrawModeChange);
      this.drawControl.deleteAll();
      if (!preserveControl && this.drawControlAdded) {
        this.map.removeControl(this.drawControl);
        this.drawControlAdded = false;
      } else {
        this.drawControl.changeMode('simple_select');
      }
    }

    this.map.dragPan?.enable();
    this.map.boxZoom?.enable();
    this.map.doubleClickZoom?.enable();
    this.map.keyboard?.enable();

    this.activeLassoLayerKey = null;
    this.lassoCallback = null;
  }

  isLassoActive() {
    return Boolean(this.map && this.drawControl && this.activeLassoLayerKey);
  }

  handleDrawModeChange(event) {
    if (!this.map || !this.drawControl || !this.activeLassoLayerKey) {
      return;
    }

    if (event?.mode !== 'draw_polygon') {
      this.drawControl.changeMode('draw_polygon');
    }
  }

  handleDrawEvent(event) {
    if (!this.map || !this.activeLassoLayerKey) {
      return;
    }

    const features = event?.features;
    if (!Array.isArray(features) || features.length === 0) {
      return;
    }

    const polygonFeature = features[0];
    const geometry = polygonFeature?.geometry;
    if (!geometry || !geometry.coordinates) {
      return;
    }

    const pointLayerId = LAYER_ID_TOKENS.pointLayer(this.activeLassoLayerKey);
    const renderedPoints = this.map.queryRenderedFeatures({ layers: [pointLayerId] }) ?? [];
    const selected = renderedPoints.filter(feature => {
      if (feature?.properties?.cluster) {
        return false;
      }
      const coords = feature.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) {
        return false;
      }
      if (geometry.type === 'Polygon') {
        return pointInPolygon(coords, [geometry.coordinates]);
      }
      if (geometry.type === 'MultiPolygon') {
        return pointInPolygon(coords, geometry.coordinates);
      }
      return false;
    });

    if (typeof this.lassoCallback === 'function') {
      this.lassoCallback(selected, polygonFeature);
    }

    if (this.drawControl && polygonFeature?.id !== undefined) {
      this.drawControl.delete(polygonFeature.id);
      this.drawControl.changeMode('draw_polygon');
    }
  }

  updateSelectedFeature(layerId, feature) {
    if (!this.map) {
      delete this.selectedFeatureByLayer[layerId];
      return;
    }

    const previous = this.selectedFeatureByLayer[layerId];
    if (previous && previous.id !== undefined) {
      try {
        this.map.setFeatureState(previous, { selected: false });
      } catch {
        // ignore - feature may no longer exist
      }
    }

    if (feature && feature.id !== undefined) {
      try {
        this.map.setFeatureState(feature, { selected: true });
        this.selectedFeatureByLayer[layerId] = feature;
        return;
      } catch {
        // ignore errors when feature state cannot be set
      }
    }

    delete this.selectedFeatureByLayer[layerId];
  }

  registerHoverHandlers(layerId, callbacks) {
    if (!this.map || !this.map.getLayer(layerId)) {
      return;
    }

    const existingHandlers = this.layerEventHandlers.get(layerId);
    if (existingHandlers) {
      return;
    }

    const handleMouseEnter = event => {
      this.map.getCanvas().style.cursor = 'pointer';
      const feature = event.features && event.features.length > 0 ? event.features[0] : null;
      if (feature) {
        this.updateSelectedFeature(layerId, feature);
        callbacks.onHoverEnter?.(feature, { x: event.point.x, y: event.point.y });
      }
    };

    const handleMouseMove = event => {
      callbacks.onHoverMove?.({ x: event.point.x, y: event.point.y });
    };

    const handleMouseLeave = () => {
      this.map.getCanvas().style.cursor = '';
      this.updateSelectedFeature(layerId, null);
      callbacks.onHoverLeave?.();
    };

    this.map.on('mouseenter', layerId, handleMouseEnter);
    this.map.on('mousemove', layerId, handleMouseMove);
    this.map.on('mouseleave', layerId, handleMouseLeave);

    let handleClick = null;
    if (callbacks.onFeatureSelect) {
      handleClick = event => {
        event.preventDefault?.();
        const features =
          event.features && event.features.length > 0
            ? event.features
            : this.map?.queryRenderedFeatures(event.point, { layers: [layerId] }) ?? [];
        callbacks.onFeatureSelect(features, event, layerId);
      };
      this.map.on('click', layerId, handleClick);
    }

    this.layerEventHandlers.set(layerId, {
      mouseenter: handleMouseEnter,
      mousemove: handleMouseMove,
      mouseleave: handleMouseLeave,
      click: handleClick,
    });
    this.layersWithHoverHandlers.add(layerId);
  }

  setupClusterInteraction(sourceId, clusterLayerId, clusterCountLayerId, callbacks) {
    if (!this.map) {
      return;
    }

    const registerForLayer = layerId => {
      if (!this.map || !this.map.getLayer(layerId) || this.clusterEventHandlers.has(layerId)) {
        return;
      }

      const handleClick = event => {
        if (!this.map) {
          return;
        }
        const features = this.map.queryRenderedFeatures(event.point, { layers: [layerId] });
        if (!features.length) {
          return;
        }
        const clusterFeature = features[0];
        const clusterId = clusterFeature.properties?.cluster_id;
        const source = this.map.getSource(sourceId);
        if (!source || clusterId === undefined) {
          return;
        }
        source.getClusterExpansionZoom(clusterId, (error, zoom) => {
          if (error) {
            return;
          }
          this.map.easeTo({ center: clusterFeature.geometry.coordinates, zoom });
        });
      };

      const handleMouseEnter = () => {
        if (!this.map) {
          return;
        }
        this.map.getCanvas().style.cursor = 'pointer';
        callbacks.onHoverLeave?.();
      };

      const handleMouseLeave = () => {
        if (!this.map) {
          return;
        }
        this.map.getCanvas().style.cursor = '';
      };

      this.map.on('click', layerId, handleClick);
      this.map.on('mouseenter', layerId, handleMouseEnter);
      this.map.on('mouseleave', layerId, handleMouseLeave);

      this.clusterEventHandlers.set(layerId, {
        click: handleClick,
        mouseenter: handleMouseEnter,
        mouseleave: handleMouseLeave,
      });
      this.clusterLayersWithHandlers.add(layerId);
    };

    registerForLayer(clusterLayerId);
    registerForLayer(clusterCountLayerId);
  }
}

export default MapService;
