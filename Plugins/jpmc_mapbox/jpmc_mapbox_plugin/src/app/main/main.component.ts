import { Component, ElementRef, OnDestroy, OnInit, AfterViewInit, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { Subscription, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { client, WorkbookElementData } from '@sigmacomputing/plugin';

import { PopoverModule } from 'primeng/popover';
import { CheckboxModule } from 'primeng/checkbox';

import { ConfigService } from '../services/core/config.service';
import { ElementDataService } from '../services/core/element-data.service';
import { VariableService } from '../services/core/variable.service';
import { GetGeoJsonsService } from '../services/plugin/get-geojsons.service';
import { GetLegendService } from '../services/plugin/get-legend.service';
import { UiStateService } from '../services/plugin/ui-state.service';

import { MainMenuComponent } from './menu/main-menu.component';
import { TooltipComponent } from './tooltip/tooltip.component';

@Component({
    selector: 'app-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.css'],
    standalone: true,
    imports: [CommonModule, FormsModule, PopoverModule, CheckboxModule, MainMenuComponent, TooltipComponent]
})

export class MainComponent implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
    @ViewChild('layerSelectorPopover') layerSelectorPopover: any;
    private platformId = inject(PLATFORM_ID);

    private subscriptions: Subscription[] = [];

    private map: any;

    private layerIds: { [key: string]: string } = {};
    private layerCreationInProgress: { [key: string]: boolean } = {};

    private lastGeoJsonsData: any;
    private lastLegendDataString: string = '';
    lastLegendData: SafeHtml = '';
    private activeDashedLayerIds: string[] = [];
    
    // array to track layers added to the map
    public addedLayers: { key: string; title: string; visible: boolean; ids: string[] }[] = [];

    private basemapUrl: string = 'mapbox://styles/psoral/cme3ei4xl000701rad5l8c6b4';

    private animateLines1: boolean = false;
    private animateLines2: boolean = false;
    private animateLines3: boolean = false;
    private animateLines4: boolean = false;

    private fillPolygons1: boolean = false;
    private fillPolygons2: boolean = false;
    private fillPolygons3: boolean = false;
    private fillPolygons4: boolean = false;

    private pointType1: string = 'Circle';
    private pointType2: string = 'Circle';
    private pointType3: string = 'Circle';
    private pointType4: string = 'Circle';

    private selectedFeature: any = null;
    private layersWithClickHandlers: Set<string> = new Set();

    private layer1Title: string = 'Layer 1';
    private layer2Title: string = 'Layer 2';
    private layer3Title: string = 'Layer 3';
    private layer4Title: string = 'Layer 4';

    private tooltipContainer: any;
    public tooltipFeature: any = null;
    public tooltipVisible: boolean = false;
    public tooltipX: number = 0;
    public tooltipY: number = 0;

    private elementDataSubscription: Subscription | null = null;

    config: any;
    elementData: WorkbookElementData = {};

    dashArraySequence = [
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

    step = 0;

    private mainMenuVisible: boolean = false;
    legendVisible: boolean = false;
    layerSelectorVisible: boolean = false;

    constructor(
        private configService: ConfigService,
        private elementDataService: ElementDataService,
        private variableService: VariableService,
        private getGeoJsonsService: GetGeoJsonsService,
        private getLegendService: GetLegendService,
        private uiStateService: UiStateService,
        private sanitizer: DomSanitizer
    ) {}

    async ngOnInit() {

        client.config.configureEditorPanel([
            { name: 'basemapUrl', type: 'text', label: 'Basemap URL' },

            { name: 'layer1', type: 'element' },
            { name: 'layer1Geometry', type: 'column', source: 'layer1', allowMultiple: false, label: 'Geometry' },
            { name: 'layer1Title', type: 'text', source: 'layer1', defaultValue: 'Layer 1' },
            { type: 'toggle', name: 'animateLines1', label: 'Animate Lines', defaultValue: false, source: 'layer1' },
            { type: 'toggle', name: 'fillPolygons1', label: 'Fill Polygons', defaultValue: false, source: 'layer1' },
            { type: 'dropdown', name: 'pointType1', label: 'Point Type', defaultValue: 'Circle', source: 'layer1', values: ['Circle', 'Icon'] },

            { name: 'layer2', type: 'element' },
            { name: 'layer2Geometry', type: 'column', source: 'layer2', allowMultiple: false, label: 'Geometry' },
            { name: 'layer2Title', type: 'text', source: 'layer2', defaultValue: 'Layer 2' },
            { type: 'toggle', name: 'animateLines2', label: 'Animate Lines', defaultValue: false, source: 'layer2' },
            { type: 'toggle', name: 'fillPolygons2', label: 'Fill Polygons', defaultValue: false, source: 'layer2' },
            { type: 'dropdown', name: 'pointType2', label: 'Point Type', defaultValue: 'Circle', source: 'layer2', values: ['Circle', 'Icon'] },

            { name: 'layer3', type: 'element' },
            { name: 'layer3Geometry', type: 'column', source: 'layer3', allowMultiple: false, label: 'Geometry' },
            { name: 'layer3Title', type: 'text', source: 'layer3', defaultValue: 'Layer 3' },
            { type: 'toggle', name: 'animateLines3', label: 'Animate Lines', defaultValue: false, source: 'layer3' },
            { type: 'toggle', name: 'fillPolygons3', label: 'Fill Polygons', defaultValue: false, source: 'layer3' },
            { type: 'dropdown', name: 'pointType3', label: 'Point Type', defaultValue: 'Circle', source: 'layer3', values: ['Circle', 'Icon'] },

            { name: 'layer4', type: 'element' },
            { name: 'layer4Geometry', type: 'column', source: 'layer4', allowMultiple: false, label: 'Geometry' },
            { name: 'layer4Title', type: 'text', source: 'layer4', defaultValue: 'Layer 4' },
            { type: 'toggle', name: 'animateLines4', label: 'Animate Lines', defaultValue: false, source: 'layer4' },
            { type: 'toggle', name: 'fillPolygons4', label: 'Fill Polygons', defaultValue: false, source: 'layer4' },
            { type: 'dropdown', name: 'pointType4', label: 'Point Type', defaultValue: 'Circle', source: 'layer4', values: ['Circle', 'Icon'] },

            { name: 'legend', type: 'element' },
            { name: 'legendHtml', type: 'column', source: 'legend', allowMultiple: false, label: 'Legend HTML' },

            { type: 'group', name: 'theme', label: 'Theme'},
            { type: 'color', name: 'menuBackgroundColor', label: 'Menu Background Color', source: 'theme' },
            { type: 'color', name: 'menuTextColor', label: 'Menu Text Color', source: 'theme' },
            { type: 'color', name: 'menuTextHoverColor', label: 'Menu Text Color (Hover)', source: 'theme' }
        ]);

        this.getConfig();

        this.subscriptions.push(
            this.uiStateService.mainMenuVisible$.subscribe(visible => {
            this.mainMenuVisible = visible;
        }));

        this.subscriptions.push(
            this.uiStateService.legendVisible$.subscribe(visible => {
                this.legendVisible = visible;
            })
        );

        this.subscriptions.push(
            this.uiStateService.layerSelectorVisible$.subscribe(visible => {
                this.layerSelectorVisible = visible;
            })
        );

    }

    private showTooltip = (feature: any, mouseX: number, mouseY: number) => {
        if (!this.tooltipContainer) {
            console.warn('tooltip container not found');
            return;
        }

        this.tooltipFeature = feature;
        this.tooltipVisible = true;
        
        // Position tooltip near mouse cursor with boundary checking
        this.updateTooltipPosition(mouseX, mouseY);

    };

    private updateTooltipPosition(mouseX: number, mouseY: number) {
        const mapContainer = this.mapContainer.nativeElement;
        const padding = 10; // distance from mouse cursor
        
        // fallback dimensions
        let tooltipWidth = 230;
        let tooltipHeight = 80;
        
        // get actual tooltip dimensions if it exists and is visible
        if (this.tooltipContainer && this.tooltipVisible) {
            const rect = this.tooltipContainer.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                tooltipWidth = rect.width;
                tooltipHeight = rect.height;
            }
        }
        
        // calculate preferred position (left of cursor)
        let x = mouseX - tooltipWidth;
        let y = mouseY - padding;
        
        // check boundaries and adjust if necessary
        if (x < 0) {
            // position to the right of cursor if too close to left edge
            x = mouseX + padding;
        }
        
        if (y < 0) {
            // Position below cursor if too close to top edge
            y = mouseY + padding;
        }
        
        if (y + tooltipHeight > mapContainer.clientHeight) {
            // position above cursor if too close to bottom edge
            y = mouseY - padding - tooltipHeight;
        }
        
        // Ensure minimum distance from edges
        x = Math.max(5, Math.min(x, mapContainer.clientWidth - tooltipWidth - 5));
        y = Math.max(5, Math.min(y, mapContainer.clientHeight - tooltipHeight - 5));
        
        this.tooltipX = x;
        this.tooltipY = y;
    }

    private hideTooltip = () => {
        this.tooltipVisible = false;
        this.tooltipFeature = null;
    };

    private setupClickHandler(layerId: string): void {

        // check if we already set up a click handler for this layer
        if (this.layersWithClickHandlers.has(layerId)) {
            return;
        }

        if (this.map.getLayer(layerId)) {
            
            // in the future, if we want to add an interaction based on clicks, we can do it here
            /*
            this.map.on('click', layerId, (e: any) => {

                if (e.features && e.features.length > 0) {
                    const feature = e.features[0];
                    
                    // clear previous selection if it had an ID
                    if (this.selectedFeature && this.selectedFeature.id !== undefined) {
                        this.map.setFeatureState(this.selectedFeature, { selected: false });
                    }
    
                    this.selectedFeature = feature;
                    
                    // only set feature state if the feature has an ID
                    if (feature.id !== undefined) {
                        this.map.setFeatureState(feature, { selected: true });
                    }
                    
                    this.showTooltip(feature);
                }
            });
            */

            // change cursor on hover, show tooltip, set selected state of feature
            this.map.on('mouseenter', layerId, (e: any) => {

                this.map.getCanvas().style.cursor = 'pointer';
                if (e.features && e.features.length > 0) {
                    const feature = e.features[0];
                    this.selectedFeature = feature;
                    this.map.setFeatureState(feature, { selected: true });
                    this.showTooltip(feature, e.point.x, e.point.y);
                }
            });

            // update tooltip position on mouse move when tooltip is visible
            this.map.on('mousemove', layerId, (e: any) => {
                if (this.tooltipVisible) {
                    this.updateTooltipPosition(e.point.x, e.point.y);
                }
            });

            // remove pointer cursor, hide tooltip, remove selected state of feature
            this.map.on('mouseleave', layerId, () => {
                if (this.selectedFeature) {
                    this.map.getCanvas().style.cursor = '';
                    this.map.setFeatureState(this.selectedFeature, { selected: false });
                    this.hideTooltip();
                }
            });

            // mark this layer as having a click handler
            // processLayerData and therefore setupClickHandler gets called multiple times
            // we need to prevent the click handler from being added multiple times
            this.layersWithClickHandlers.add(layerId);
        }
    }

    ngAfterViewInit() {
        this.tooltipContainer = document.getElementById('tooltipContainer');
    }

    // toggle layer visibility on the map
    public toggleLayerVisibility(layerKey: string): void {

        if (!this.map) return;

        // find the entry in addedLayers that matches the layerKey
        // loop through all ids for the layerKey and toggle the visibility of each

        const layer = this.addedLayers.find(l => l.key === layerKey);
        if (!layer) return;

        layer.ids.forEach(id => {

            const currentVisibility = this.map.getLayoutProperty(id, 'visibility');

            // isCurrentlyVisible will be true if mapbox returns visible or undefined
            const isCurrentlyVisible = currentVisibility === 'visible' || currentVisibility === undefined;

            // if isCurrentlyVisible is true, set layer visibility to none (hidden)
            // if isCurrentlyVisible is false, set layer visibility to visible
            const newVisibility = isCurrentlyVisible ? 'none' : 'visible';
        
            this.map.setLayoutProperty(id, 'visibility', newVisibility);
            layer.visible = newVisibility === 'visible';
        });

    }

    // public method to clear the tracked layers array
    public clearTrackedLayers(): void {
        this.addedLayers = [];
    }



    private processLayerData = (data: any, layerKey: string, layerTitle: string, animateLines: boolean, pointType: string, fillPolygons: boolean) => {
            
        // since multiple layers are involved, getData gets called for layer2 before layer1 has a chance to complete
        // this check prevents layers from getting created multiple times
        /* if (this.layerCreationInProgress[layerKey]) {
            return;
        } */

        if (data && Object.keys(data).length > 0) {

            this.elementData = data;

            // we have elementData, get geoJsons
            return this.getGeoJsonsService.getGeoJsons(this.elementData).pipe(
                tap((geoJsons: any[]) => {

                    // check if geoJsons data has actually changed
                    const geoJsonsDataString = JSON.stringify(geoJsons);
                    if (geoJsonsDataString !== this.lastGeoJsonsData) {

                        this.lastGeoJsonsData = geoJsonsDataString;

                        // check if key already exists in addedLayers, if not add it
                        let existingLayerInTracker = this.addedLayers.find(layer => layer.key === layerKey);
                        if (!existingLayerInTracker) {
                            this.addedLayers.push({
                                key: layerKey,
                                title: layerTitle,
                                visible: true,
                                ids: []
                            });
                            existingLayerInTracker = this.addedLayers[this.addedLayers.length - 1];
                        }

                        const lineSourceId = `line-${layerKey}`;
                        const backgroundLayerId = `line-background-${layerKey}`;
                        const dashedLayerId = `line-dashed-${layerKey}`;

                        const pointSourceId = `point-${layerKey}`;
                        const pointLayerId = `point-layer-${layerKey}`;

                        const polygonFillLayerId = `polygon-fill-layer-${layerKey}`;

                        const lineFeatureCollection = {
                            type: 'FeatureCollection',
                            features: []
                        };

                        const pointFeatureCollection = {
                            type: 'FeatureCollection',
                            features: []
                        };

                        const polygonFeatureCollection = {
                            type: 'FeatureCollection',
                            features: []
                        };

                        // process each FeatureCollection in the geoJsons array
                        geoJsons.forEach((featureCollection, index) => {
                            // skip null or undefined featureCollection objects
                            if (!featureCollection) {
                                return;
                            }

                            const features = featureCollection.features || [];

                            // separate features by geometry type
                            const lineFeatures = features.filter((feature: any) => 
                                feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString' || feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon'
                            );

                            if (lineFeatures.length > 0) {

                                lineFeatureCollection.features = lineFeatureCollection.features.concat(lineFeatures);

                                // check if source exists and update or add accordingly
                                const existingLineSource = this.map.getSource(lineSourceId);
                                if (existingLineSource) {
                                    // source exists, update its data
                                    existingLineSource.setData(lineFeatureCollection);
                                } else {
                                    // source doesn't exist, add it
                                    this.map.addSource(lineSourceId, {
                                        'type': 'geojson',
                                        'lineMetrics': true,
                                        'data': lineFeatureCollection,
                                        'generateId': true
                                    });
                                }

                                // check if layers exist before adding them
                                if (animateLines && !this.map.getLayer(backgroundLayerId)) {
                                    // add background layer
                                    this.map.addLayer({
                                        type: 'line',
                                        source: lineSourceId,
                                        id: backgroundLayerId,
                                        paint: {
                                            'line-color': ['get','line-color'],
                                            'line-width': ['coalesce', ['get', 'line-width'], 2],
                                            'line-opacity': 0.4
                                        }
                                    });
                                    existingLayerInTracker.ids.push(backgroundLayerId);
                                }

                                if (animateLines && !this.map.getLayer(dashedLayerId)) {
                                    // add dashed layer for animation
                                    this.map.addLayer({
                                        type: 'line',
                                        source: lineSourceId,
                                        id: dashedLayerId,
                                        paint: {
                                            'line-color': ['get','line-color'],
                                            'line-width': ['coalesce', ['get', 'line-width'], 2],
                                            'line-dasharray': [0, 4, 3],
                                            'line-emissive-strength': 1
                                        }
                                    });

                                    // track this dashed layer for animation (only when first created)
                                    this.activeDashedLayerIds.push(dashedLayerId);
                                    existingLayerInTracker.ids.push(dashedLayerId);
                                    
                                }

                                if (!animateLines && !this.map.getLayer(dashedLayerId)) {
                                    this.map.addLayer({
                                        type: 'line',
                                        source: lineSourceId,
                                        id: dashedLayerId,
                                        paint: {
                                            'line-color': ['get','line-color'],
                                            'line-width': ['coalesce', ['get', 'line-width'], 2],
                                            'line-emissive-strength': 1
                                        }
                                    });
                                    existingLayerInTracker.ids.push(dashedLayerId);
                                }

                                if (fillPolygons && !this.map.getLayer(polygonFillLayerId)) {
                                    // add fill layer for polygons
                                    this.map.addLayer({
                                        type: 'fill',
                                        source: lineSourceId,
                                        id: polygonFillLayerId,
                                        paint: {
                                            'fill-color': ['get','fill-color'],
                                            'fill-opacity': ['coalesce', ['get', 'fill-opacity'], 0.4]
                                        }
                                    });

                                    // track this dashed layer for animation (only when first created)
                                    existingLayerInTracker.ids.push(polygonFillLayerId);
                                    
                                }
                                
                                this.setupClickHandler(dashedLayerId);

                            }

                            const pointFeatures = features.filter((feature: any) => 
                                feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint'
                            );

                            if (pointFeatures.length > 0) {

                                pointFeatureCollection.features = pointFeatureCollection.features.concat(pointFeatures);

                                // check if point source exists and update or add accordingly
                                const existingPointSource = this.map.getSource(pointSourceId);
                                if (existingPointSource) {
                                    // source exists, update its data
                                    existingPointSource.setData(pointFeatureCollection);
                                } else {
                                    // source doesn't exist, add it
                                    this.map.addSource(pointSourceId, {
                                        'type': 'geojson',
                                        'data': pointFeatureCollection,
                                        'generateId': true
                                    });
                                }

                                // check if point layer exists before adding it
                                if (!this.map.getLayer(pointLayerId) && pointType === 'Icon') {
                                    // dynamically color svg icons
                                    this.map.addLayer({
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
                                    });
                                    existingLayerInTracker.ids.push(pointLayerId);
                                    
                                }

                                // check if point layer exists before adding it
                                if (!this.map.getLayer(pointLayerId) && pointType === 'Circle') {
                                    // dynamically color svg icons
                                    this.map.addLayer({
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
                                    });
                                    existingLayerInTracker.ids.push(pointLayerId);
                                }

                                this.setupClickHandler(pointLayerId);

                            }
                            
                        });

                    }

                })
            );
        }

        // return empty observable if no data
        return of([]);
    }

    private getConfig(): void {
        
        // get Sigma config object
        const configSubscription = this.configService.getConfig().subscribe(config => {

            this.config = config;

            const menuBackgroundColor = config.menuBackgroundColor || '#3d293d';
            document.documentElement.style.setProperty('--surface-900', menuBackgroundColor);

            const menuTextColor = config.menuTextColor || '#ffffff';
            document.documentElement.style.setProperty('--surface-0', menuTextColor);

            const menuTextHoverColor = config.menuTextHoverColor || '#f59a23';
            document.documentElement.style.setProperty('--primary-color', menuTextHoverColor);
            
            this.getData(config);
        });

        this.subscriptions.push(configSubscription);
    }

    private async getData(config: any) {

        if (config.basemapUrl) {
            this.basemapUrl = config.basemapUrl;
        }

        if (!config.layer1 && !config.layer2 && !config.layer3 && !config.layer4) {
            return;
        }

        if (config.layer1 && config.animateLines1 !== undefined) {
            this.animateLines1 = config.animateLines1;
            this.pointType1 = config.pointType1;
            this.fillPolygons1 = config.fillPolygons1;
            this.layer1Title = config.layer1Title || 'Layer 1';
        }

        if (config.layer2 && config.animateLines2 !== undefined) {
            this.animateLines2 = config.animateLines2;
            this.pointType2 = config.pointType2;
            this.fillPolygons2 = config.fillPolygons2;
            this.layer2Title = config.layer2Title || 'Layer 2';
        }

        if (config.layer3 && config.animateLines3 !== undefined) {
            this.animateLines3 = config.animateLines3;
            this.pointType3 = config.pointType3;
            this.fillPolygons3 = config.fillPolygons3;
            this.layer3Title = config.layer3Title || 'Layer 3';
        }

        if (config.layer4 && config.animateLines4 !== undefined) {
            this.animateLines4 = config.animateLines4;
            this.pointType4 = config.pointType4;
            this.fillPolygons4 = config.fillPolygons4;
            this.layer4Title = config.layer4Title || 'Layer 4';
        }

        if (isPlatformBrowser(this.platformId)) { // SSR check to ensure this runs in the browser as GL JS requires a browser environment
            const mapboxgl = (await import('mapbox-gl')).default // dynamically import mapbox-gl as the default export
      
            // create a new map instance
            
            this.map = new mapboxgl.Map({
              accessToken: 'pk.eyJ1IjoicHNvcmFsIiwiYSI6ImNtZHJwOXJ1MjBpN2EybW9vYzFpMHE5a3UifQ.CGKehwJSuaC0L-cFW8_I2w',
              container: this.mapContainer.nativeElement, // Reference to the map container element
              style: this.basemapUrl,
              center: [-98.54818, 40.00811], // Center coordinates for map over the continental US
              zoom: 4
            });
        }

        
        this.map.on('load', () => {
            const dataSubscription1 = this.elementDataService.getElementData(config.layer1).pipe(
                switchMap(data => {
                    return this.processLayerData(data, 'layer1', this.layer1Title, this.animateLines1, this.pointType1, this.fillPolygons1);
                })
            ).subscribe();
            const dataSubscription2 = this.elementDataService.getElementData(config.layer2).pipe(
                switchMap(data => {
                    return this.processLayerData(data, 'layer2', this.layer2Title, this.animateLines2, this.pointType2, this.fillPolygons2);
                })
            ).subscribe();
            const dataSubscription3 = this.elementDataService.getElementData(config.layer3).pipe(
                switchMap(data => {
                    return this.processLayerData(data, 'layer3', this.layer3Title, this.animateLines3, this.pointType3, this.fillPolygons3);
                })
            ).subscribe();
            const dataSubscription4 = this.elementDataService.getElementData(config.layer4).pipe(
                switchMap(data => {
                    return this.processLayerData(data, 'layer4', this.layer4Title, this.animateLines4, this.pointType4, this.fillPolygons4);
                })
            ).subscribe();
            const legendSubscription = this.elementDataService.getElementData(config.legend).pipe(
                switchMap(data => {
                    if (data && Object.keys(data).length > 0) {

                        this.elementData = data;
        
                        // we have elementData, get legend
                        return this.getLegendService.getLegend(this.elementData).pipe(
                            tap((legend: any[]) => {
        
                                // check if legend data has actually changed
                                const legendDataString = legend[0];
                                if (legendDataString !== this.lastLegendDataString) {
                                    this.lastLegendDataString = legendDataString;
                                    this.lastLegendData = this.sanitizer.bypassSecurityTrustHtml(legendDataString);
                                }
                            })
                        );
                    }

                    // return empty observable if no data
                    return of([]);
                })
            ).subscribe();
            this.subscriptions.push(dataSubscription1, dataSubscription2, dataSubscription3, dataSubscription4, legendSubscription);

            // add click handler on map to hide tooltip when clicking on empty areas
            this.map.on('click', (e: any) => {
                // hide tooltip when clicking on empty areas (no features)
                this.hideTooltip();
            });

            // start animation for all dashed layers
            this.animateDashArray(0);

        });

    }

    private clearMapLayers(): void {
        // remove existing route-related sources and layers
        const style = this.map.getStyle();
        
        if (style && style.layers) {
            // remove layers first
            style.layers.forEach((layer: any) => {
                if (layer.id.startsWith('line-background-') || layer.id.startsWith('line-dashed-')) {
                    if (this.map.getLayer(layer.id)) {
                        this.map.removeLayer(layer.id);
                    }
                }
            });
        }
        
        if (style && style.sources) {
            // remove sources
            Object.keys(style.sources).forEach((sourceId: string) => {
                if (sourceId.startsWith('route-')) {
                    if (this.map.getSource(sourceId)) {
                        this.map.removeSource(sourceId);
                    }
                }
            });
        }
        
        this.activeDashedLayerIds = [];
        this.addedLayers = [];
        this.layersWithClickHandlers.clear();
    }

    animateDashArray(timestamp: number) {
        // Update line-dasharray for all active dashed layers
        const newStep = Math.floor(
            (timestamp / 50) % this.dashArraySequence.length
        );

        if (newStep !== this.step) {
            // Update all dashed layers
            this.activeDashedLayerIds.forEach(layerId => {
                if (this.map.getLayer(layerId)) {
                    this.map.setPaintProperty(
                        layerId,
                        'line-dasharray',
                        this.dashArraySequence[this.step]
                    );
                }
            });
            this.step = newStep;
        }

        // Request the next frame of the animation.
        requestAnimationFrame(this.animateDashArray.bind(this));
    }

    toggleMainMenu() {
        this.uiStateService.setMainMenuVisible(!this.mainMenuVisible);
    }

    onLayerSelectorClick(event: Event) {
        this.layerSelectorPopover.toggle(event);
    }

    ngOnDestroy(): void {

        this.subscriptions.forEach((subscription) => subscription.unsubscribe());

        if (this.map) {
            this.map.remove();
        }

        // clear click handler tracking
        this.layersWithClickHandlers.clear();

    }

}