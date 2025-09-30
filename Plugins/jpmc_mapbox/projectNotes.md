
# Project overview

Goal: Build a single Angular-based map plugin for a Sigma workbook that supports four upload types (trajectory, line, point, polygon) + all requested UX/features (address search, property verification / satellite view, interactive geography selection, custom drawing, multi-layer choropleths, clustering/dynamic zoom, layer management, property tiles, and Sigma input-table integration). Reuse code from existing Angular base plugin and adapt the Mapbox React plugin using the recommended migration approach (details below).

---

# High-level architecture

* **Frontend:** Angular (existing base plugin), TypeScript, Map rendering with `mapbox-gl` (or MapLibre) + `mapbox-gl-draw` for drawing tools.
* **State & Services:** RxJS services for UI state, layer state, upload pipeline, and map interactions (use your existing `UiStateService` pattern).
* **Data Model:** Standardized TypeScript interfaces for geometry records (trajectory, line, point, polygon) and layer metadata.
* **Integration surface:** Sigma workbook plugin host (embedded Angular plugin). Use Sigma Input Tables for write-back / batch uploads; read GeoJSON / tabular data from Snowflake tables surfaced into Sigma.
* **Adapted React Mapbox plugin:** Convert into Angular components (recommended) or wrap as a micro-frontend/iframe only as a short-term option.
* **Storage & Preprocessing:** CSV/JSON uploads accepted by the plugin → client-side validation & GeoJSON conversion → POST to Sigma input table or present an SQL snippet for warehouse ingestion.

---

# Feature mapping (from your doc) → component / implementation notes

(Reference file: feature requests doc. )

1. **Address Search Bar**

   * Component: `AddressSearchComponent`
   * Implementation: Mapbox Geocoding (or a configured geocoder) returning coordinates + center + optional place metadata.
   * Acceptance: typing a JPMC property string returns pinpointable result + zoom-to.

2. **Property Verification (street / satellite view)**

   * Component: `PropertyViewerModal`
   * Implementation: Show Mapbox satellite/streets style toggles, and a property info tile.
   * Acceptance: click property pin → open modal with satellite imagery and property metadata.

3. **Interactive Map (select by state/county/zip)**

   * Component: `GeoSelector` / `ChoroplethLayer`
   * Implementation: GeoJSON boundaries (from warehouse) + click/select interactions that filter property pins.
   * Acceptance: clicking a county triggers filter, updates tiles and analytics.

4. **Custom drawing on the map**

   * Component: `MapDrawControls` (using Mapbox Draw)
   * Implementation: allow polygons/lines/points; selection pipes back to analytics (e.g., count properties, aggregated metrics).
   * Acceptance: draw polygon → table of enclosed properties updates + analytics calculation triggers.

5. **Multi-layering (choropleth + parcels + external datasets)**

   * Component: `LayerManager` + `LayerList` UI
   * Implementation: GeoJSON layers with style rules driven by properties (choropleth uses property value ranges). Ensure admin can create new layers from existing ones.
   * Acceptance: user toggles layers; choropleth scales redraw.

6. **Dynamic Zoom / Clustering**

   * Component: cluster handling in `MapService` (use supercluster or Mapbox cluster)
   * Implementation: aggregated cluster display at low zoom, expand to individual pins on zoom-in.
   * Acceptance: zoom out shows single aggregated centroids with aggregated value; zoom in unpacks.

7. **Custom UI Components (property tiles)**

   * Component: `PropertyTile`, `PropertyListPanel`
   * Implementation: clickable tiles anchored to map pins; shows details and links to workbook rows.
   * Acceptance: clicking tile focuses map and opens detailed panel.

8. **Input Tables / Tools (batch uploads via Sigma)**

   * Implementation: integrate with Sigma Input Tables (no plugin needed to write back; plugin reads/writes into table).
   * Acceptance: upload CSV -> plugin validates and suggests input-table load or provides SQL snippet.

9. **Layer management & admin tools**

   * Component: `LayerAdmin` (only for admin role)
   * Implementation: ability to create, rename, enable/disable, and set metadata for layers.
   * Acceptance: new layer created and appears in `LayerList`.

10. **API Capabilities** (note)

* Your feature doc explicitly states data must exist in the warehouse — external direct API pulls are not supported by Sigma; data must be loaded to warehouse. Keep this constraint in the design (store datasets in Snowflake/Sigma). 

---

# Recommended approach to adapt the React Mapbox plugin to Angular

Three options (pros/cons) — **recommendation: port to Angular** for maintainability.

1. **Rewrite/Port to Angular (Recommended)**

   * Pros: full integration, easier to debug and maintain, consistent state model, better performance/UX in Sigma.
   * Cons: initial dev work to translate React components → Angular.
   * Steps:

     1. Audit React plugin: list used Mapbox APIs, utility functions, style objects, drawing tools, custom hooks.
     2. Extract plain JS helpers (geo transforms, CSV → GeoJSON) and reuse them as TS modules.
     3. Reimplement React components as Angular components using the same logic and styles. Use `ngx-mapbox-gl` or direct `mapbox-gl` + Angular lifecycle hooks.
     4. Implement shared services (MapService, LayerService, UploadService).

2. **Wrap React component in an iframe / micro-frontend**

   * Pros: fastest to demo, less rewrite.
   * Cons: brittle cross-frame comms, inconsistent UX and styling, heavier maintenance. Use `postMessage` for communication.

3. **Create a Web Component wrapper for the React plugin**

   * Pros: reuse React code as a custom element (e.g., `react-to-webcomponent`) and embed in Angular.
   * Cons: still tricky for sigma-hosted environment and eventing; sometimes causes CSS isolation issues.

---

# Concrete repo & module structure (suggested)

```
/sigma-map-plugin
├─ README.md
├─ package.json
├─ angular.json
├─ src/
│  ├─ app/
│  │  ├─ app.module.ts
│  │  ├─ map/
│  │  │  ├─ components/
│  │  │  │  ├─ map-root.component.ts
│  │  │  │  ├─ layer-list.component.ts
│  │  │  │  ├─ address-search.component.ts
│  │  │  │  ├─ property-tile.component.ts
│  │  │  │  └─ draw-controls.component.ts
│  │  │  ├─ services/
│  │  │  │  ├─ map.service.ts
│  │  │  │  ├─ upload.service.ts
│  │  │  │  └─ layer.service.ts
│  │  ├─ shared/
│  │  │  ├─ models/
│  │  │  │  ├─ geo-record.model.ts
│  │  │  │  └─ layer.model.ts
│  │  │  └─ utils/
│  │  │     └─ geo-utils.ts
│  ├─ assets/
│  └─ styles/
└─ docs/
   └─ demo-script.md
```

---

# Key TypeScript interfaces (example)

```ts
// src/app/shared/models/geo-record.model.ts
export type GeometryType = 'Point'|'LineString'|'Polygon'|'Trajectory';

export interface GeoRecord {
  id: string;
  geometry: GeoJSON.Geometry;
  properties: {
    source?: string;      // e.g. 'uploaded_csv' | 'input_table'
    name?: string;
    timestamp?: string;
    [k: string]: any;
  }
}

export interface LayerMeta {
  id: string;
  name: string;
  visible: boolean;
  order: number;
  type: 'point'|'line'|'polygon'|'choropleth';
  sourceTable?: string; // warehouse table reference
  style?: any;
}
```

---

# Upload → ingestion flow (UX)

1. User clicks **Upload** → modal with 4 tabs (Trajectory / Line / Point / Polygon).
2. Client-side validation (geometry existence, coordinate order, time fields for trajectory).
3. Convert to GeoJSON. Offer quick preview on map.
4. Option A: “Write to Sigma Input Table” — plugin will push data into a Sigma Input Table (user confirms).
   Option B: “Download GeoJSON / SQL Snippet” to run in warehouse ingestion.
5. On success, layer is created/registered in `LayerManager`.

---

# Acceptance criteria & QA checklist (use in demo)

* Upload: CSV/GeoJSON uploads accepted for each geometry type and show immediately on map.
* Address search: searches a property name and centers + pins it.
* Drawing: user draws polygon → properties list updates and summary counts/metrics recalc.
* Choropleth: a demographic layer displays via choropleth (color by property).
* Clustering: clustered points show aggregated count and metric when zoomed-out.
* Property tile: clicking pin opens tile with details and “Open Satellite” button.
* Layer admin: create/rename/toggle visibility of layers.
* Sigma integration: show read from / write to Sigma Input Table for at least one demo dataset.
* Non-functional: map interactions are smooth; state persists across small view refresh.

---

# Demo script (short)

1. Start with a baseline dataset loaded to Sigma (points representing properties).
2. Show Address Search → type an address → map centers and opens property tile (satellite view).
3. Upload a trajectory CSV → show path plotted, animate or step through points.
4. Toggle choropleth layer (demographics) and click a county → property list filters.
5. Draw a polygon → show analytics update (property count + average value).
6. Zoom out to show clustering and aggregated metric.
7. Open LayerAdmin to create a new layer from the current selection (save to warehouse).
8. Show “Write to Sigma Input Table” flow & confirm data now visible in workbook.

---

# Testing & QA

* Unit tests: `map.service`, `upload.service`, `geo-utils`.
* E2E: Cypress test for upload → preview → write-to-input-table flow; for drawing and filter interactions.
* Cross-browser: Chrome (primary), Safari, and a headless run for CI.
* Demo checklist run before meeting.

---

# Prioritized implementation backlog (start here)

1. Core map shell + `map-root` + basic layer rendering (point/line/polygon).
2. Upload pipeline + client-side GeoJSON conversion + preview.
3. Address Search + satellite layer + property tile modal.
4. Map drawing controls + selection→analytics pipeline.
5. Choropleth + layer manager + clustering.
6. Admin tools (layer create) + write-to-Sigma Input Table integration.
7. Adapt React Mapbox plugin: begin porting reusable Mapbox code and styles.
8. QA, tests, polish & demo script rehearsal.

---

# Migration tasks for the React Mapbox plugin (practical checklist)

* [ ] `git clone` existing React repo; run it locally.
* [ ] Create `migration-audit.md`: list all Mapbox usage, third-party deps, custom styles, and utility functions.
* [ ] Move pure-logic JS helpers into `src/app/shared/utils` and convert to TS.
* [ ] Recreate core React UI components as Angular components (one-to-one mapping).
* [ ] Replace React state/hooks with Angular services + BehaviorSubjects.
* [ ] Reuse Mapbox style JSONs and tilesets; import into Angular assets.

If you want the fastest path for the demo and can accept a short-term tradeoff, you can embed the React build in an iframe and communicate via `postMessage`. But for a robust product and long-term maintainability, porting is the right long-term choice.

---

# Deliverables I can produce next (pick any, I’ll do it now)

* Detailed `migration-audit.md` from React plugin (list Mapbox APIs and helpers to port).
* A ready-to-drop-in Angular module skeleton with `map-root` + Mapbox init + sample layer rendering (TS + HTML).
* Example upload-to-GeoJSON converter + sample CSV template for your demo.
* Demo script formatted as a one-page talking points sheet.

Tell me which one you want first and I’ll produce it right away.
