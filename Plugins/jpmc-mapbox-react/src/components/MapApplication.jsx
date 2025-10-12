import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVariable } from '@sigmacomputing/plugin';
import { useSigmaRuntime } from '../context/useSigmaRuntime.js';
import { useSigmaElementData } from '../hooks/useSigmaElementData.js';
import MapService from '../map/MapService.js';
import { DEFAULT_BASEMAP } from '../map/constants.js';
import { deriveScatterFeatureCollection } from '../map/deriveScatterLayer.js';
import MapView from './MapView.jsx';
import MainMenu from './overlay/MainMenu.jsx';
import LayerVisibilityPanel from './overlay/LayerVisibilityPanel.jsx';
import LegendPanel from './overlay/LegendPanel.jsx';
import Tooltip from './overlay/Tooltip.jsx';
import SelectionToolbar from './overlay/SelectionToolbar.jsx';
import MockConfigPanel from './sidebar/MockConfigPanel.jsx';

const BASE_LAYER_KEYS = ['layer1', 'layer2', 'layer3', 'layer4'];
const SCATTER_LAYER_KEY = 'scatterLayer';
const hiddenTooltip = { visible: false, feature: null, position: { left: 0, top: 0 } };

const MapApplication = () => {
  const mapContainerRef = useRef(null);
  const mapServiceRef = useRef(null);
  if (!mapServiceRef.current) {
    mapServiceRef.current = new MapService();
  }

  const { client, config, isMock, updateConfig } = useSigmaRuntime();

  const layer1Data = useSigmaElementData(config.layer1, client);
  const layer2Data = useSigmaElementData(config.layer2, client);
  const layer3Data = useSigmaElementData(config.layer3, client);
  const layer4Data = useSigmaElementData(config.layer4, client);
  const legendData = useSigmaElementData(config.legend, client);
  const scatterEnabled = Boolean(config.scatterLayerEnabled);
  const scatterData = useSigmaElementData(scatterEnabled ? config.scatterSource : null, client);
  const scatterFeatureCollection = useMemo(() => {
    if (!scatterEnabled) {
      return null;
    }
    return deriveScatterFeatureCollection(scatterData, {
      latitudeColumn: config.scatterLatitude,
      longitudeColumn: config.scatterLongitude,
      legendColumn: config.scatterLegend,
    });
  }, [
    config.scatterLatitude,
    config.scatterLongitude,
    config.scatterLegend,
    scatterData,
    scatterEnabled,
  ]);

  const scatterElementData = useMemo(() => {
    if (!scatterEnabled) {
      return null;
    }
    if (!scatterFeatureCollection) {
      return {};
    }
    return { __derivedGeometry: [JSON.stringify(scatterFeatureCollection)] };
  }, [scatterEnabled, scatterFeatureCollection]);

  const [, rawSetFilterLatitude] = useVariable(config.filterLatitude);
  const [, rawSetFilterLongitude] = useVariable(config.filterLongitude);

  const [mapReady, setMapReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [legendVisible, setLegendVisible] = useState(false);
  const [layerPanelVisible, setLayerPanelVisible] = useState(false);
  const [mockPanelVisible, setMockPanelVisible] = useState(false);
  const [trackedLayers, setTrackedLayers] = useState([]);
  const [tooltip, setTooltip] = useState(hiddenTooltip);
  const [lassoActive, setLassoActive] = useState(false);
  const setFilterLatitude = useCallback(
    (...values) => {
      if (!config.filterLatitude || typeof rawSetFilterLatitude !== 'function') {
        return;
      }
      rawSetFilterLatitude(...values);
    },
    [config.filterLatitude, rawSetFilterLatitude],
  );

  const setFilterLongitude = useCallback(
    (...values) => {
      if (!config.filterLongitude || typeof rawSetFilterLongitude !== 'function') {
        return;
      }
      rawSetFilterLongitude(...values);
    },
    [config.filterLongitude, rawSetFilterLongitude],
  );

  const scatterSelectionRef = useRef(new Map());
  const previousScatterFeatureCollectionRef = useRef(scatterFeatureCollection);
  const skipNextMapClickClearRef = useRef(false);

  const basemapUrl = config.basemapUrl || DEFAULT_BASEMAP;
  const clusterPoints = Boolean(config.clusterPoints);

  useEffect(() => () => mapServiceRef.current?.dispose(), []);

  useEffect(() => {
    const unsubscribe = mapServiceRef.current.subscribeToLayerState(setTrackedLayers);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (config.menuBackgroundColor) {
      root.style.setProperty('--menu-bg', config.menuBackgroundColor);
    }
    if (config.menuTextColor) {
      root.style.setProperty('--menu-text', config.menuTextColor);
    }
    if (config.menuTextHoverColor) {
      root.style.setProperty('--menu-accent', config.menuTextHoverColor);
    }
  }, [config.menuBackgroundColor, config.menuTextColor, config.menuTextHoverColor]);

  const baseLayerSettings = useMemo(
    () =>
      BASE_LAYER_KEYS.map((key, index) => ({
        key,
        title: config[`${key}Title`] ?? `Layer ${index + 1}`,
        animateLines: Boolean(config[`animateLines${index + 1}`]),
        fillPolygons: Boolean(config[`fillPolygons${index + 1}`]),
        pointType: config[`pointType${index + 1}`] ?? 'Circle',
        element: config[key] ?? null,
        geometryColumn: config[`${key}Geometry`] ?? null,
      })),
    [config],
  );

  const scatterLayerSettings = useMemo(() => {
    if (!scatterEnabled) {
      return [];
    }
    return [
      {
        key: SCATTER_LAYER_KEY,
        title: config.scatterLayerTitle ?? 'Scatter Layer',
        animateLines: false,
        fillPolygons: false,
        pointType: config.scatterPointType ?? 'Circle',
        element: config.scatterSource ?? null,
        geometryColumn: '__derivedGeometry',
        columns: {
          latitude: config.scatterLatitude ?? null,
          longitude: config.scatterLongitude ?? null,
          legend: config.scatterLegend ?? null,
        },
      },
    ];
  }, [
    config.scatterLatitude,
    config.scatterLayerTitle,
    config.scatterLegend,
    config.scatterPointType,
    config.scatterSource,
    config.scatterLongitude,
    scatterEnabled,
  ]);

  const layerSettings = useMemo(
    () => [...baseLayerSettings, ...scatterLayerSettings],
    [baseLayerSettings, scatterLayerSettings],
  );

  const elementDataByLayer = useMemo(() => {
    const data = {
      layer1: layer1Data,
      layer2: layer2Data,
      layer3: layer3Data,
      layer4: layer4Data,
    };
    if (scatterEnabled) {
      data[SCATTER_LAYER_KEY] = scatterElementData ?? {};
    }
    return data;
  }, [layer1Data, layer2Data, layer3Data, layer4Data, scatterElementData, scatterEnabled]);

  const legendElementHtml = useMemo(() => {
    if (!legendData || !config.legendHtml) {
      return '';
    }
    const columnValues = legendData[config.legendHtml];
    if (!Array.isArray(columnValues)) {
      return '';
    }
    const firstValue = columnValues.find(value => typeof value === 'string' && value.trim().length > 0);
    return firstValue || '';
  }, [legendData, config.legendHtml]);

  const scatterLegendHtml = useMemo(() => {
    if (!scatterEnabled || !config.scatterLegend) {
      return '';
    }
    const features = scatterFeatureCollection?.features ?? [];
    if (features.length === 0) {
      return '';
    }

    const legendEntries = new Map();
    features.forEach(feature => {
      const legendValue = feature?.properties?.legend;
      const color = feature?.properties?.['circle-color'] ?? '#2563eb';
      const key = legendValue !== undefined && legendValue !== null && `${legendValue}`.trim().length > 0 ? `${legendValue}` : 'Value';
      if (!legendEntries.has(key)) {
        legendEntries.set(key, color);
      }
    });

    if (legendEntries.size === 0) {
      return '';
    }

    const title = config.scatterLayerTitle ?? 'Scatter Layer';
    const items = Array.from(legendEntries.entries())
      .map(
        ([label, color]) =>
          `
            <li style="display:flex;align-items:center;gap:0.5rem;margin:0.25rem 0;">
              <span style="display:inline-block;width:12px;height:12px;border-radius:9999px;background:${color};border:1px solid rgba(15,23,42,0.2);"></span>
              <span>${label}</span>
            </li>
          `,
      )
      .join('');

    return `
      <div>
        <h4 style="margin:0 0 8px;">${title}</h4>
        <ul style="margin:0;padding-left:0;list-style:none;">
          ${items}
        </ul>
      </div>
    `;
  }, [config.scatterLayerTitle, config.scatterLegend, scatterEnabled, scatterFeatureCollection]);

  const combinedLegendHtml = useMemo(() => {
    const sections = [];
    if (legendElementHtml) {
      sections.push(legendElementHtml);
    }
    if (scatterLegendHtml) {
      sections.push(scatterLegendHtml);
    }

    if (sections.length === 0) {
      return '';
    }

    if (sections.length === 1) {
      return sections[0];
    }

    return sections.join('<hr style="border:none;border-top:1px solid rgba(15,23,42,0.12);margin:12px 0;">');
  }, [legendElementHtml, scatterLegendHtml]);

  const clampTooltipPosition = useCallback((x, y) => {
    const container = mapContainerRef.current;
    const tooltipWidth = 260;
    const tooltipHeight = 180;
    if (!container) {
      return { left: x + 12, top: y + 12 };
    }
    const { width, height } = container.getBoundingClientRect();
    let left = x + 12;
    let top = y + 12;
    if (left + tooltipWidth > width) {
      left = Math.max(12, width - tooltipWidth - 12);
    }
    if (top + tooltipHeight > height) {
      top = Math.max(12, height - tooltipHeight - 12);
    }
    return { left, top };
  }, []);

  const handleHoverEnter = useCallback(
    (feature, point) => {
      const position = clampTooltipPosition(point.x, point.y);
      setTooltip({ visible: true, feature, position });
    },
    [clampTooltipPosition],
  );

  const handleHoverMove = useCallback(
    point => {
      setTooltip(prev => {
        if (!prev.visible) {
          return prev;
        }
        return { ...prev, position: clampTooltipPosition(point.x, point.y) };
      });
    },
    [clampTooltipPosition],
  );

  const handleHoverLeave = useCallback(() => {
    setTooltip(prev => (prev.visible ? hiddenTooltip : prev));
  }, []);

  const hoverCallbacks = useMemo(
    () => ({
      onHoverEnter: handleHoverEnter,
      onHoverMove: handleHoverMove,
      onHoverLeave: handleHoverLeave,
    }),
    [handleHoverEnter, handleHoverLeave, handleHoverMove],
  );

  const setScatterVariablesFromSelection = useCallback(
    features => {
      if (!scatterEnabled) {
        return;
      }

      const coordinates = features
        .map(feature => feature?.geometry?.coordinates)
        .filter(value => Array.isArray(value) && value.length >= 2);

      const latitudes = coordinates.map(coord => coord[1]).filter(value => typeof value === 'number');
      const longitudes = coordinates.map(coord => coord[0]).filter(value => typeof value === 'number');

      if (latitudes.length > 0) {
        setFilterLatitude(latitudes.join(','));
      } else {
        setFilterLatitude(null);
      }

      if (longitudes.length > 0) {
        setFilterLongitude(longitudes.join(','));
      } else {
        setFilterLongitude(null);
      }
    },
    [scatterEnabled, setFilterLatitude, setFilterLongitude],
  );

  const clearScatterVariables = useCallback(() => {
    setFilterLatitude();
    setFilterLongitude();
  }, [setFilterLatitude, setFilterLongitude]);

  const clearScatterSelection = useCallback(() => {
    scatterSelectionRef.current.clear();
    skipNextMapClickClearRef.current = false;
    clearScatterVariables();
  }, [clearScatterVariables]);

  const handleScatterFeatureSelect = useCallback(
    (features, event) => {
      if (!scatterEnabled) {
        return;
      }

      if (!features || features.length === 0) {
        clearScatterSelection();
        return;
      }

      const additive = Boolean(event?.originalEvent?.shiftKey || event?.additive);
      if (!additive) {
        scatterSelectionRef.current.clear();
      }

      features.forEach(feature => {
        if (!feature) {
          return;
        }
        const coordinates = feature.geometry?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          return;
        }
        const featureKey = feature.id ?? JSON.stringify(coordinates);
        scatterSelectionRef.current.set(featureKey, feature);
      });

      skipNextMapClickClearRef.current = true;
      setScatterVariablesFromSelection(Array.from(scatterSelectionRef.current.values()));
    },
    [clearScatterSelection, scatterEnabled, setScatterVariablesFromSelection],
  );

  useEffect(() => {
    if (!scatterEnabled) {
      clearScatterSelection();
    }
  }, [scatterEnabled, clearScatterSelection]);

  useEffect(() => {
    if (!scatterFeatureCollection || (scatterFeatureCollection.features ?? []).length === 0) {
      clearScatterSelection();
    }
  }, [scatterFeatureCollection, clearScatterSelection]);

  useEffect(() => {
    if (previousScatterFeatureCollectionRef.current !== scatterFeatureCollection) {
      previousScatterFeatureCollectionRef.current = scatterFeatureCollection;
      if (scatterFeatureCollection && (scatterFeatureCollection.features ?? []).length > 0) {
        clearScatterSelection();
      }
    }
  }, [scatterFeatureCollection, clearScatterSelection]);

  const scatterCallbacks = useMemo(
    () => ({
      ...hoverCallbacks,
      onFeatureSelect: handleScatterFeatureSelect,
    }),
    [handleScatterFeatureSelect, hoverCallbacks],
  );

  const configSignature = useMemo(
    () =>
      JSON.stringify({
        clusterPoints,
        layers: layerSettings.map(layer => ({
          key: layer.key,
          element: layer.element,
          geometryColumn: layer.geometryColumn,
          title: layer.title,
          animateLines: layer.animateLines,
          fillPolygons: layer.fillPolygons,
          pointType: layer.pointType,
          columns: layer.columns ?? null,
        })),
      }),
    [clusterPoints, layerSettings],
  );

  const configSignatureRef = useRef(configSignature);

  useEffect(() => {
    if (!mapReady) {
      configSignatureRef.current = configSignature;
      return;
    }

    if (configSignatureRef.current !== configSignature) {
      const service = mapServiceRef.current;
      service.clearMapLayers();
      configSignatureRef.current = configSignature;
      setTooltip(hiddenTooltip);
      clearScatterSelection();
    }
  }, [clearScatterSelection, configSignature, mapReady]);

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    const service = mapServiceRef.current;
    service.clearHandlers();

    layerSettings.forEach(layer => {
      const data = elementDataByLayer[layer.key];
      const callbacks = layer.key === SCATTER_LAYER_KEY ? scatterCallbacks : hoverCallbacks;
      service.processLayerData(
        data,
        layer.key,
        layer.title,
        layer.animateLines,
        layer.pointType,
        layer.fillPolygons,
        clusterPoints,
        callbacks,
      );
    });

    service.animateDashArray();
  }, [clusterPoints, elementDataByLayer, hoverCallbacks, layerSettings, mapReady, scatterCallbacks]);

  const handleLayerToggle = useCallback(layerKey => {
    mapServiceRef.current.toggleLayerVisibility(layerKey);
  }, []);

  const handleMapReadyChange = useCallback(
    ready => {
      setMapReady(Boolean(ready));
      if (!ready) {
        setTooltip(hiddenTooltip);
        setLassoActive(false);
        mapServiceRef.current.disableLassoSelection?.();
      }
    },
    [],
  );

  const handleMapClick = useCallback(
    event => {
      if (lassoActive) {
        return;
      }

      if (skipNextMapClickClearRef.current) {
        skipNextMapClickClearRef.current = false;
      } else {
        clearScatterSelection();
      }

      if (event?.defaultPrevented) {
        return;
      }

      setTooltip(prev => (prev.visible ? hiddenTooltip : prev));
    },
    [clearScatterSelection, lassoActive],
  );

  const handleUpdateConfig = useCallback(
    partialConfig => {
      updateConfig(partialConfig);
    },
    [updateConfig],
  );

  const handleLassoToggle = useCallback(async () => {
    const service = mapServiceRef.current;
    if (!service || !mapReady || !scatterEnabled) {
      return;
    }

    if (lassoActive) {
      service.disableLassoSelection();
      setLassoActive(false);
      return;
    }

    const enabled = await service.enableLassoSelection(SCATTER_LAYER_KEY, selectedFeatures => {
      if (!selectedFeatures || selectedFeatures.length === 0) {
        handleScatterFeatureSelect([], {});
        return;
      }
      handleScatterFeatureSelect(selectedFeatures, {});
    });

    if (enabled) {
      setLassoActive(true);
    }
  }, [handleScatterFeatureSelect, lassoActive, mapReady, scatterEnabled]);

  useEffect(() => {
    if (!scatterEnabled || !mapReady) {
      mapServiceRef.current.disableLassoSelection?.();
      setLassoActive(false);
    }
  }, [mapReady, scatterEnabled]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden',
      }}
    >
      <MapView
        containerRef={mapContainerRef}
        mapService={mapServiceRef.current}
        basemapUrl={basemapUrl}
        onReadyChange={handleMapReadyChange}
        onMapClick={handleMapClick}
      />

      <SelectionToolbar
        lassoActive={lassoActive}
        onLassoToggle={handleLassoToggle}
        disabled={!scatterEnabled || !mapReady}
      />

      <MainMenu
        open={menuOpen}
        onToggle={() => setMenuOpen(value => !value)}
        onLegendToggle={() => setLegendVisible(value => !value)}
        legendVisible={legendVisible}
        onLayerSelectorToggle={() => {
          setLayerPanelVisible(value => !value);
          setMockPanelVisible(false);
        }}
        onMockConfigToggle={() => {
          setMockPanelVisible(value => !value);
          setLayerPanelVisible(false);
        }}
        showMockControls={isMock}
      />

      <LayerVisibilityPanel
        visible={layerPanelVisible}
        layers={trackedLayers}
        onToggle={handleLayerToggle}
        onClose={() => setLayerPanelVisible(false)}
      />

      <LegendPanel visible={legendVisible} html={combinedLegendHtml} />
      <Tooltip tooltip={tooltip} />

      <MockConfigPanel
        open={mockPanelVisible && isMock}
        onClose={() => setMockPanelVisible(false)}
        config={config}
        onUpdate={handleUpdateConfig}
      />
    </div>
  );
};

export default MapApplication;
