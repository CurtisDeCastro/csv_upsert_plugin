# JPMorgan Chase Sigma Mapbox Plugin

A React + Vite application that renders Sigma element data on Mapbox GL while mirroring the behaviour of the original Plotly-based plugin. Authors can configure up to four GeoJSON-driven layers, add an additional scatter layer built from latitude/longitude columns, toggle a legend and layer visibility panel, and push user selections back into Sigma workbook variables.

## Features

- **Sigma integration** – pulls configuration, element data, and workbook variables using `@sigmacomputing/plugin` hooks with a mock client for local development.
- **Layer pipeline** – converts Sigma GeoJSON payloads into Mapbox sources/layers supporting animated lines, filled polygons, circle/icon points, and clustering.
- **Scatter layer** – derives GeoJSON points from latitude/longitude/legend columns with automatic color categories and optional filtering variables.
- **Interactive UI** – contextual main menu, layer visibility sheet, legend overlay, tooltip, and optional mock config panel mirroring Sigma editor controls.
- **Selection feedback** – click or Shift+click points to emit comma-separated lat/long values; enable lasso mode to make polygonal selections powered by Mapbox Draw.
- **Theme overrides** – configurable menu colors, Mapbox basemap URL, and legend HTML supplied from a Sigma element.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

This pulls the project dependencies including `mapbox-gl` and `@mapbox/mapbox-gl-draw` (used for lasso selection).

### Development server

```bash
npm run dev
```

- Opens Vite dev server (usually http://localhost:5173).
- Loads the mock Sigma client with sample data; use the mock configuration panel to tweak runtime settings.

### Linting

```bash
npm run lint
```

Runs ESLint with the project configuration.

### Build & Preview

```bash
pm run build
npm run preview
```

Generates a production build and serves it locally for verification.

## Project Structure

```
src/
  App.jsx                 # SigmaProvider + MapApplication root
  components/
    MapApplication.jsx    # Main orchestrator for layers, UI, selections
    MapView.jsx           # Initializes Mapbox map via MapService
    overlay/
      MainMenu.jsx
      LayerVisibilityPanel.jsx
      LegendPanel.jsx
      Tooltip.jsx
      SelectionToolbar.jsx
    sidebar/
      MockConfigPanel.jsx
  context/
    SigmaProvider.jsx     # Loads Sigma client, builds editor definition
    SigmaContext.js
  hooks/
    useSigmaElementData.js
  map/
    MapService.js         # Mapbox layer management & lasso selection
    constants.js
    geojson.js
  config/
    editorPanelDefinition.js
  sigma/
    getSigmaClient.js
    mockClient.js         # Mock sigma client for local dev
  ...
```

### Key Concepts

- **SigmaProvider / context** – bootstraps the Sigma client (real or mock), registers the editor panel definition, and exposes `config`, `client`, and helper APIs via React context.
- **MapService** – encapsulates Mapbox GL usage: loading data, managing sources/layers, dash animations, hover handlers, clustering, and lasso selection using Mapbox Draw. It also notifies the layer visibility panel of current layers.
- **MapApplication** – pulls layer data, builds layer settings, manages tooltip state, handles MapService interactions, renders overlays, and syncs Sigma variables (`filterLatitude`, `filterLongitude`). Scatter selections set variables to comma-separated lat/lon strings or clear them when nothing selected.
- **Scatter derivation** – `deriveScatterLayer.js` transforms tabular lat/lon arrays into GeoJSON FeatureCollections, inferring colors per legend value and carrying over circle / icon styling properties.

## Selection Workflow

1. **Click selection** – clicking a scatter point selects it (Shift+click to add). The app records coordinates, updates Sigma variables, and highlights the feature.
2. **Lasso selection** – toggle "Enable Lasso". MapService loads Mapbox Draw, switches to polygon mode, and disables default map gestures. Draw a polygon around points; on completion the map queries rendered scatter points and updates the Sigma variables with the selected coordinates. The polygon is cleared and draw mode remains active for additional lassos until toggled off.
3. **Clearing selections** – clicking outside points (with lasso disabled) or selecting nothing clears both variables.

## Configuration Overview

`editorPanelDefinition.js` exposes the properties available in Sigma:

- Basemap URL, cluster toggle.
- Layers 1-4: GeoJSON element + geometry column, point type, animation, fill.
- Scatter layer: enable toggle, source element, lat/lon/legend columns, point type, legend title, filter variable bindings.
- Legend HTML element reference.
- Theme color overrides.

The mock config panel mirrors these settings for local use.

## Extending the App

- **Additional layers** – Update `LAYER_KEYS` in `MapService` and corresponding definitions if you need more slots.
- **Custom styling** – Extend `deriveScatterLayer` for new properties (eg. dynamic icon images) and MapService to interpret them.
- **New controls** – Add buttons or panels by composing components in `MapApplication`, referencing the existing context hooks.
- **Sigma integration** – Replace the mock client by embedding within Sigma; `SigmaProvider` automatically uses the runtime client when provided by Sigma.

## Troubleshooting

- After adding dependencies ensure `npm install` runs; missing `@mapbox/mapbox-gl-draw` will break the lasso feature (`Failed to resolve import`).
- When running inside Sigma, set the Mapbox access token (`mapbox-gl` requires it) via configuration.
- If selections do not update, confirm the scatter layer is enabled and filter variables are assigned in the editor panel.

## License

This project is provided as internal tooling for JPMorgan Chase plugin development. Consult your team’s guidelines before distributing or reusing.
