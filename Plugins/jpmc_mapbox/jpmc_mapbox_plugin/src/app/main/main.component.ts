import { Component, ElementRef, OnDestroy, OnInit, AfterViewInit, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { Subscription, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { client, WorkbookElementData } from '@sigmacomputing/plugin';

import { PopoverModule } from 'primeng/popover';

import { ConfigService } from '../services/core/config.service';
import { ElementDataService } from '../services/core/element-data.service';
import { GetLegendService } from '../services/plugin/get-legend.service';
import { UiStateService } from '../services/plugin/ui-state.service';

import { MainMenuComponent } from './menu/main-menu.component';
import { TooltipComponent } from './tooltip/tooltip.component';
import { LayerVisibilityComponent } from './components/layer-visibility/layer-visibility.component';
import { LegendDisplayComponent } from './components/legend-display/legend-display.component';
import { MapService } from './services/map.service';
import { MapInteractionCallbacks, MapLayer } from './models/map-layer.model';

@Component({
    selector: 'app-main',
    templateUrl: './main.component.html',
    styleUrls: ['./main.component.css'],
    standalone: true,
    imports: [CommonModule, PopoverModule, MainMenuComponent, TooltipComponent, LayerVisibilityComponent, LegendDisplayComponent]
})

export class MainComponent implements OnInit, AfterViewInit, OnDestroy {

    // Acts as a thin Angular wrapper around a Mapbox GL map. All of the heavy
    // lifting happens in Mapbox; Angular just gives us structured lifecycle hooks
    // and access to Sigma's plugin services.

    @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
    @ViewChild('layerSelectorPopover') layerSelectorPopover: any;
    private platformId = inject(PLATFORM_ID);

    private subscriptions: Subscription[] = [];

    private lastLegendDataString: string = '';
    lastLegendData: SafeHtml = '';

    // array to track layers added to the map
    public addedLayers: MapLayer[] = [];

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

    // Mapbox clustering defaults to OFF; authors can enable it from the global toggle.
    private _clusterPoints: boolean = false;
    private get clusterPoints(): boolean {
        return this._clusterPoints;
    }
    private set clusterPoints(value: boolean) {
        if (this._clusterPoints !== value) {
            this._clusterPoints = value;
            console.log('[Map] clusterPoints changed:', value);
        }
    }

    private layer1Title: string = 'Layer 1';
    private layer2Title: string = 'Layer 2';
    private layer3Title: string = 'Layer 3';
    private layer4Title: string = 'Layer 4';

    private tooltipContainer: any;
    public tooltipFeature: any = null;
    public tooltipVisible: boolean = false;
    public tooltipX: number = 0;
    public tooltipY: number = 0;

    config: any;
    elementData: WorkbookElementData = {};

    private mainMenuVisible: boolean = false;
    legendVisible: boolean = false;
    layerSelectorVisible: boolean = false;

    constructor(
        private configService: ConfigService,
        private elementDataService: ElementDataService,
        private getLegendService: GetLegendService,
        private uiStateService: UiStateService,
        private sanitizer: DomSanitizer,
        private mapService: MapService
    ) {
        this.addedLayers = this.mapService.getTrackedLayers();
    }

    async ngOnInit() {

        // Configure Sigma's editor sidebar. Everything defined here becomes a toggle
        // or dropdown that authors can use to control the map from inside Sigma.
        client.config.configureEditorPanel([
            { name: 'basemapUrl', type: 'text', label: 'Basemap URL' },
            { type: 'toggle', name: 'clusterPoints', label: 'Cluster Points', defaultValue: false },

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

    ngAfterViewInit() {
        this.tooltipContainer = document.getElementById('tooltipContainer');
    }

    // toggle layer visibility on the map
    public toggleLayerVisibility(layerKey: string): void {
        this.mapService.toggleLayerVisibility(layerKey);
    }



    private processLayerData(
        data: any,
        layerKey: string,
        layerTitle: string,
        animateLines: boolean,
        pointType: string,
        fillPolygons: boolean,
        clusterPoints: boolean
    ) {
        const callbacks: MapInteractionCallbacks = {
            onHoverEnter: (feature, point) => this.showTooltip(feature, point.x, point.y),
            onHoverMove: point => this.updateTooltipPosition(point.x, point.y),
            onHoverLeave: () => this.hideTooltip()
        };

        return this.mapService.processLayerData(
            data,
            layerKey,
            layerTitle,
            animateLines,
            pointType,
            fillPolygons,
            clusterPoints,
            callbacks
        );
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

        if (Object.prototype.hasOwnProperty.call(config, 'clusterPoints')) {
            this.clusterPoints = this.toBoolean(config.clusterPoints, false);
        }
        this.subscriptions.forEach(subscription => subscription.unsubscribe());
        this.subscriptions = [];
        this.mapService.dispose();
        this.addedLayers = this.mapService.getTrackedLayers();

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

        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const map = await this.mapService.initMap(this.mapContainer.nativeElement, this.basemapUrl);

        map.on('load', () => {
            const dataSubscription1 = this.elementDataService.getElementData(config.layer1).pipe(
                switchMap(data => {
                    return this.processLayerData(data, 'layer1', this.layer1Title, this.animateLines1, this.pointType1, this.fillPolygons1, this.clusterPoints);
                })
            ).subscribe();
            const dataSubscription2 = this.elementDataService.getElementData(config.layer2).pipe(
                switchMap(data => {
                    return this.processLayerData(data, 'layer2', this.layer2Title, this.animateLines2, this.pointType2, this.fillPolygons2, this.clusterPoints);
                })
            ).subscribe();
            const dataSubscription3 = this.elementDataService.getElementData(config.layer3).pipe(
                switchMap(data => {
                    return this.processLayerData(data, 'layer3', this.layer3Title, this.animateLines3, this.pointType3, this.fillPolygons3, this.clusterPoints);
                })
            ).subscribe();
            const dataSubscription4 = this.elementDataService.getElementData(config.layer4).pipe(
                switchMap(data => {
                    return this.processLayerData(data, 'layer4', this.layer4Title, this.animateLines4, this.pointType4, this.fillPolygons4, this.clusterPoints);
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
            map.on('click', () => {
                this.hideTooltip();
            });

            this.mapService.animateDashArray();
        });

    }

    private toBoolean(value: any, fallback: boolean = false): boolean {
        if (value === undefined || value === null) {
            return fallback;
        }
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === 'true') {
                return true;
            }
            if (normalized === 'false') {
                return false;
            }
        }
        return Boolean(value);
    }

    toggleMainMenu() {
        this.uiStateService.setMainMenuVisible(!this.mainMenuVisible);
    }

    onLayerSelectorClick(event: Event) {
        this.layerSelectorPopover.toggle(event);
    }

    ngOnDestroy(): void {

        this.subscriptions.forEach((subscription) => subscription.unsubscribe());
        this.mapService.dispose();

    }

}
