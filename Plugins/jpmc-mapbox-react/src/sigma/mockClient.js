import { DEFAULT_BASEMAP } from '../map/constants.js';

const sampleRoutes = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        'line-color': '#ff6f61',
        'line-width': 4,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-74.006, 40.7128],
          [-87.6298, 41.8781],
          [-118.2437, 34.0522],
        ],
      },
    },
    {
      type: 'Feature',
      properties: {
        'line-color': '#26a69a',
        'line-width': 3,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [-0.1276, 51.5074],
          [2.3522, 48.8566],
          [13.405, 52.52],
        ],
      },
    },
  ],
};

const sampleBranches = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        'circle-color': '#1e88e5',
        'circle-radius': 6,
        pin_type: 'Factory',
        pin_color: '#1e88e5',
      },
      geometry: {
        type: 'Point',
        coordinates: [-87.6298, 41.8781],
      },
    },
    {
      type: 'Feature',
      properties: {
        'circle-color': '#e53935',
        'circle-radius': 6,
        pin_type: 'Ship',
        pin_color: '#e53935',
      },
      geometry: {
        type: 'Point',
        coordinates: [-95.3698, 29.7604],
      },
    },
    {
      type: 'Feature',
      properties: {
        'circle-color': '#8e24aa',
        'circle-radius': 6,
        pin_type: 'Anchor',
        pin_color: '#8e24aa',
      },
      geometry: {
        type: 'Point',
        coordinates: [-122.4194, 37.7749],
      },
    },
    {
      type: 'Feature',
      properties: {
        'circle-color': '#43a047',
        'circle-radius': 6,
        pin_type: 'User',
        pin_color: '#43a047',
      },
      geometry: {
        type: 'Point',
        coordinates: [-118.2437, 34.0522],
      },
    },
  ],
};

const sampleRegions = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        'fill-color': '#f59a23',
        'fill-opacity': 0.35,
        'line-color': '#d47c00',
        'line-width': 2,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-104.05, 48.99],
            [-97.22, 48.98],
            [-96.58, 45.94],
            [-104.03, 45.94],
            [-104.05, 48.99],
          ],
        ],
      },
    },
  ],
};

const sampleLegendHtml = `
  <div style="font-family: Inter, sans-serif;">
    <h4 style="margin: 0 0 8px;">Map Legend</h4>
    <ul style="margin: 0; padding-left: 18px;">
      <li><span style="color:#ff6f61; font-weight:600;">Routes</span> – animated paths</li>
      <li><span style="color:#1e88e5; font-weight:600;">Branches</span> – clustered points</li>
      <li><span style="color:#f59a23; font-weight:600;">Region</span> – polygon coverage</li>
    </ul>
  </div>
`;

const sampleScatter = {
  latitude: ['37.7749', '34.0522', '40.7128', '47.6062'],
  longitude: ['-122.4194', '-118.2437', '-74.0060', '-122.3321'],
  legend: [JSON.stringify('West'), JSON.stringify('West'), JSON.stringify('East'), JSON.stringify('West')],
};

const createInitialConfig = () => ({
  basemapUrl: DEFAULT_BASEMAP,
  clusterPoints: true,
  layer1: 'layer1Element',
  layer1Geometry: 'geometry',
  layer1Title: 'Global Routes',
  animateLines1: true,
  fillPolygons1: false,
  pointType1: 'Circle',
  layer2: 'layer2Element',
  layer2Geometry: 'geometry',
  layer2Title: 'Branch Offices',
  animateLines2: false,
  fillPolygons2: false,
  pointType2: 'Icon',
  layer3: 'layer3Element',
  layer3Geometry: 'geometry',
  layer3Title: 'Coverage Regions',
  animateLines3: false,
  fillPolygons3: true,
  pointType3: 'Circle',
  layer4: null,
  layer4Geometry: null,
  layer4Title: 'Layer 4',
  animateLines4: false,
  fillPolygons4: false,
  pointType4: 'Circle',
  scatterLayerEnabled: true,
  scatterLayerTitle: 'Scatter Points',
  scatterSource: 'scatterElement',
  scatterLatitude: 'latitude',
  scatterLongitude: 'longitude',
  scatterLegend: 'legend',
  scatterPointType: 'Circle',
  filterLatitude: 'mockFilterLatitude',
  filterLongitude: 'mockFilterLongitude',
  legend: 'legendElement',
  legendHtml: 'html',
  menuBackgroundColor: '#3d293d',
  menuTextColor: '#ffffff',
  menuTextHoverColor: '#f59a23',
});

const createInitialElementStore = () => {
  const store = new Map();
  store.set('layer1Element', {
    geometry: [JSON.stringify(sampleRoutes)],
  });
  store.set('layer2Element', {
    geometry: [JSON.stringify(sampleBranches)],
  });
  store.set('layer3Element', {
    geometry: [JSON.stringify(sampleRegions)],
  });
  store.set('scatterElement', sampleScatter);
  store.set('legendElement', {
    html: [sampleLegendHtml],
  });
  return store;
};

const createMockSigmaClient = () => {
  let editorPanelDefinition = [];
  const configListeners = new Set();
  const elementListeners = new Map();
  const variableListeners = new Map();

  let config = createInitialConfig();
  const elementStore = createInitialElementStore();
  const variableStore = new Map();
  if (config.filterLatitude) {
    variableStore.set(config.filterLatitude, undefined);
  }
  if (config.filterLongitude) {
    variableStore.set(config.filterLongitude, undefined);
  }

  const notifyConfig = () => {
    configListeners.forEach(listener => listener({ ...config }));
  };

  const notifyElement = elementId => {
    const listeners = elementListeners.get(elementId);
    if (!listeners) {
      return;
    }
    const payload = elementStore.get(elementId) ?? {};
    listeners.forEach(listener => listener(payload));
  };

  const notifyVariable = variableId => {
    const listeners = variableListeners.get(variableId);
    if (!listeners) {
      return;
    }
    const value = variableStore.get(variableId);
    listeners.forEach(listener => listener(value));
  };

  const client = {
    __isMock: true,
    config: {
      get: () => ({ ...config }),
      getKey: key => config[key],
      subscribe: listener => {
        configListeners.add(listener);
        listener({ ...config });
        return () => {
          configListeners.delete(listener);
        };
      },
      configureEditorPanel: definition => {
        editorPanelDefinition = Array.isArray(definition) ? [...definition] : [];
      },
      getEditorPanelDefinition: () => [...editorPanelDefinition],
      set: nextConfig => {
        config = { ...config, ...nextConfig };
        notifyConfig();
      },
      update: partialConfig => {
        config = { ...config, ...partialConfig };
        notifyConfig();
      },
      getVariable: id => {
        if (!id) {
          return undefined;
        }
        if (!variableStore.has(id)) {
          variableStore.set(id, undefined);
        }
        return variableStore.get(id);
      },
      setVariable: (id, ...values) => {
        if (!id) {
          return;
        }
        const nextValue = values.length === 0 ? undefined : values.length === 1 ? values[0] : values;
        variableStore.set(id, nextValue);
        notifyVariable(id);
      },
      subscribeToWorkbookVariable: (id, listener) => {
        if (!id || typeof listener !== 'function') {
          return () => {};
        }

        if (!variableListeners.has(id)) {
          variableListeners.set(id, new Set());
        }
        const listeners = variableListeners.get(id);
        listeners.add(listener);

        if (variableStore.has(id)) {
          listener(variableStore.get(id));
        } else {
          variableStore.set(id, undefined);
          listener(undefined);
        }

        return () => {
          const currentListeners = variableListeners.get(id);
          if (!currentListeners) {
            return;
          }
          currentListeners.delete(listener);
          if (currentListeners.size === 0) {
            variableListeners.delete(id);
          }
        };
      },
    },
    elements: {
      subscribeToElementData: (elementId, listener) => {
        if (!elementId) {
          listener({});
          return () => {};
        }

        if (!elementListeners.has(elementId)) {
          elementListeners.set(elementId, new Set());
        }
        const listeners = elementListeners.get(elementId);
        listeners.add(listener);

        if (elementStore.has(elementId)) {
          listener(elementStore.get(elementId));
        }

        return () => {
          const currentListeners = elementListeners.get(elementId);
          if (!currentListeners) {
            return;
          }
          currentListeners.delete(listener);
          if (currentListeners.size === 0) {
            elementListeners.delete(elementId);
          }
        };
      },
    },
    __setElementData: (elementId, data) => {
      elementStore.set(elementId, data ?? {});
      notifyElement(elementId);
    },
  };

  return client;
};

export default createMockSigmaClient;
