# Ares Trail workstation

## Existing architecture retained

The frontend is a static HTML/CSS/JavaScript application. Leaflet 1.9.4 owns the interactive 2D map. Locally vendored Three.js 0.180 owns the lazy 3D view. `assets/planner.js` owns A* routing, grid exclusions and route measurements. `assets/observations.js` owns image evidence, checkpoints, reviews and their exports. Regional MOLA preparation, CTX/HiRISE preparation and the optional Flask API remain unchanged.

Jezero uses the prepared CTX stereo elevation derivatives and archived orbital/rover observations. Regional routing uses the existing coarser MOLA elevation/count grids. Global CTX imagery adds context without refining the elevation model. The sources dialog continues to follow the active dataset.

## Presentation components

- `assets/workspace.js`: original reusable disclosures and accessible route/evidence/analysis tabs; keeps bound controls and IDs.
- `assets/workstation.js`: navigation rail, compact mission header, three-panel terrain layout, contextual route facts, overview, activity, comparison charts and report rendering. Moves the existing map and controls rather than creating replacement engines.
- `assets/workstation.css`: requested color tokens, locally hosted typography, Lucide styling, responsive panels and print layout.
- `assets/vendor/fonts/`, `assets/vendor/lucide-icons.js`: local presentation assets and retained upstream licenses.

The only additions to planner orchestration are a read-only snapshot of the two existing comparison metrics and a route-calculated UI event. Explicit observation selection also emits a UI activity event. Scientific calculations, exclusions, source data, backend behavior and review/export state ownership are unchanged.

## Workspace behavior

Terrain Explorer is the default. Desktop shows navigation, exploration controls, live map/3D and terrain intelligence. The bottom profiles can collapse; the profile panel can resize vertically on desktop. The navigation rail collapses and uses compact mode on tablets. Mobile prioritizes the terrain; selecting Route Planning or Settings brings the corresponding controls forward. The contextual panel scrolls without replacing the map.

Overview uses the active route export. Reports show route coordinates, measurements, checkpoint notes and explicit assumptions, support the existing JSON export, and can print/save PDF using the browser. Activity reflects this browser session only. Reviews and activity are not a persistent multi-user mission database.

Comparison displays the two alternatives the existing planner calculates. It does not synthesize a third route. The slope profile samples cell-mean slope at route vertices; it is not a continuous ground-level grade survey. Route estimates retain their original distance-based assumptions. Regional consumable estimates remain unavailable. No safety percentage or validated mission clearance is introduced.

## Validation

There is no bundler or production compilation step. The deployed frontend serves the same static assets as the local HTTP server.

- `node tests/workstation-check.cjs`: navigation, mission values, comparison charts, reports/notes/export, local presentation assets and desktop/tablet/mobile behavior.
- `node tests/workspace-check.cjs`: original progressive disclosure, accessible tabs, lazy image loading and map-first mobile layout.
- `node tests/browser-check.cjs`: original route, evidence, review, export, simulation and failure scenarios.
- `node tests/global-check.cjs`: regional source/layer behavior, antimeridian and dataset failures.
- `node tests/terrain3d-check.cjs`: original interactive 3D behavior and fallback.
- Existing planner, observations, terrain geometry, global imagery and backend suites remain applicable.

Leaflet's existing CDN dependency and uncached remote imagery still require connectivity. Font and icon delivery introduces no additional remote runtime dependency.
