import { DEFAULT_BASEMAP } from '../map/constants.js';

export const buildEditorPanelDefinition = () => {
  const layerControls = [];
  for (let index = 1; index <= 4; index += 1) {
    const layerKey = `layer${index}`;
    layerControls.push(
      { name: layerKey, type: 'element' },
      { name: `${layerKey}Geometry`, type: 'column', source: layerKey, allowMultiple: false, label: 'Geometry' },
      { name: `${layerKey}Title`, type: 'text', source: layerKey, defaultValue: `Layer ${index}` },
      { type: 'toggle', name: `animateLines${index}`, label: 'Animate Lines', defaultValue: false, source: layerKey },
      { type: 'toggle', name: `fillPolygons${index}`, label: 'Fill Polygons', defaultValue: false, source: layerKey },
      {
        type: 'dropdown',
        name: `pointType${index}`,
        label: 'Point Type',
        defaultValue: 'Circle',
        source: layerKey,
        values: ['Circle', 'Icon'],
      },
    );
  }

  const scatterLayerControls = [
    { type: 'group', name: 'scatterLayer', label: 'Scatter Layer' },
    { type: 'toggle', name: 'scatterLayerEnabled', label: 'Enable Scatter Layer', defaultValue: false, source: 'scatterLayer' },
    { name: 'scatterLayerTitle', type: 'text', label: 'Layer Title', defaultValue: 'Scatter Layer', source: 'scatterLayer' },
    { name: 'scatterSource', type: 'element', label: 'Scatter Source', source: 'scatterLayer' },
    {
      name: 'scatterLatitude',
      type: 'column',
      source: 'scatterSource',
      allowMultiple: false,
      label: 'Latitude',
      group: 'scatterLayer',
    },
    {
      name: 'scatterLongitude',
      type: 'column',
      source: 'scatterSource',
      allowMultiple: false,
      label: 'Longitude',
      group: 'scatterLayer',
    },
    {
      name: 'scatterLegend',
      type: 'column',
      source: 'scatterSource',
      allowMultiple: false,
      label: 'Legend (optional)',
      group: 'scatterLayer',
    },
    {
      type: 'dropdown',
      name: 'scatterPointType',
      label: 'Point Type',
      defaultValue: 'Circle',
      source: 'scatterLayer',
      values: ['Circle', 'Icon'],
    },
    { type: 'variable', name: 'filterLatitude', label: 'Filter Latitude Variable', source: 'scatterLayer' },
    { type: 'variable', name: 'filterLongitude', label: 'Filter Longitude Variable', source: 'scatterLayer' },
  ];

  return [
    { name: 'basemapUrl', type: 'text', label: 'Basemap URL', defaultValue: DEFAULT_BASEMAP },
    { type: 'toggle', name: 'clusterPoints', label: 'Cluster Points', defaultValue: false },
    ...layerControls,
    ...scatterLayerControls,
    { name: 'legend', type: 'element' },
    { name: 'legendHtml', type: 'column', source: 'legend', allowMultiple: false, label: 'Legend HTML' },
    { type: 'group', name: 'theme', label: 'Theme' },
    { type: 'color', name: 'menuBackgroundColor', label: 'Menu Background Color', source: 'theme' },
    { type: 'color', name: 'menuTextColor', label: 'Menu Text Color', source: 'theme' },
    { type: 'color', name: 'menuTextHoverColor', label: 'Menu Text Color (Hover)', source: 'theme' },
  ];
};
