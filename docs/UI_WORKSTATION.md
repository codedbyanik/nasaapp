# Ares Trail workstation

## Existing architecture retained

The frontend is a static HTML/CSS/JavaScript application. Leaflet 1.9.4 owns the interactive 2D map. Locally vendored Three.js 0.180 owns the lazy 3D view. `src/core/planner.js` owns A* routing, grid exclusions and route measurements. `src/features/observations.js` owns image evidence, checkpoints, reviews and their exports. Regional MOLA preparation, CTX/HiRISE preparation and the optional Flask API remain unchanged.

Jezero uses the prepared CTX stereo elevation derivatives and archived orbital/rover observations. Regional routing uses the existing coarser MOLA elevation/count grids. Global CTX imagery adds context without refining the elevation model. The sources dialog continues to follow the active dataset.

## Presentation components

- `src/ui/workspace.js`: original reusable disclosures and accessible route/evidence/analysis tabs; keeps bound controls and IDs.
- `src/ui/workstation.js`: navigation rail, compact mission header, three-panel terrain layout, contextual route facts, overview, activity, comparison charts and report rendering. Moves the existing map and controls rather than creating replacement engines.
- `src/ui/visual-cues.js`: local Lucide action icons, accessible visible labels and mission overview shortcuts. Restores decoration after existing handlers update labels.
- `src/styles/workstation.css`: requested color tokens, locally hosted typography, Lucide styling, responsive panels and print layout.
- `assets/vendor/fonts/`, `assets/vendor/lucide-icons.js`: local presentation assets and retained upstream licenses.

The only additions to planner orchestration are a read-only snapshot of the two existing comparison metrics and a route-calculated UI event. Explicit observation selection also emits a UI activity event. Scientific calculations, exclusions, source data, backend behavior and review/export state ownership are unchanged.

## Workspace behavior

Terrain Explorer is the default. Desktop shows navigation, exploration controls, live map/3D and terrain intelligence. The bottom profiles can collapse; the profile panel can resize vertically on desktop. The navigation rail collapses and uses compact mode on tablets. Mobile prioritizes the terrain; selecting Route Planning or Settings brings the corresponding controls forward. The contextual panel scrolls without replacing the map.

Overview uses the active route export. Reports show route coordinates, measurements, checkpoint notes and explicit assumptions, support the existing JSON export, and can print/save PDF using the browser. Activity reflects this browser session only. Reviews and activity are not a persistent multi-user mission database.

Comparison displays the two alternatives the existing planner calculates. It does not synthesize a third route. The slope profile samples cell-mean slope at route vertices; it is not a continuous ground-level grade survey. Route estimates retain their original distance-based assumptions. Regional consumable estimates remain unavailable. No safety percentage or validated mission clearance is introduced.

## Validation

There is no bundler or production compilation step. The deployed frontend serves the same static assets as the local HTTP server.

- `node tests/browser/workstation-check.cjs`: navigation, mission values, comparison charts, reports/notes/export, local presentation assets and desktop/tablet/mobile behavior.
- `node tests/browser/workspace-check.cjs`: original progressive disclosure, accessible tabs, lazy image loading and map-first mobile layout.
- `node tests/browser/browser-check.cjs`: original route, evidence, review, export, simulation and failure scenarios.
- `node tests/browser/global-check.cjs`: regional source/layer behavior, antimeridian and dataset failures.
- `node tests/browser/terrain3d-check.cjs`: original interactive 3D behavior and fallback.
- Existing planner, observations, terrain geometry, global imagery and backend suites remain applicable.

Leaflet's existing CDN dependency and uncached remote imagery still require connectivity. Font and icon delivery introduces no additional remote runtime dependency.


## First-visit guidance

`src/ui/onboarding.js` presents a welcome dialog on first visit. Visitors can start a seven-step walkthrough or skip directly to the app. The Guide button reopens the introduction at any time. A versioned browser-local preference remembers start, skip or completion; no account, tracking service or server storage is used. Guidance remains usable if local storage is blocked, although the choice cannot persist across visits in that case.

The walkthrough highlights existing controls for region selection, endpoints, calculation/comparison, checkpoint inspection, 3D, sources and reports. It changes workspace views, not routes, weights, data or review notes. Visitors can go back, exit, finish or press Escape. Native dialog semantics handle welcome focus; the optional tour is non-modal so the actual site remains usable.

`node tests/browser/onboarding-check.cjs` covers fresh/returning visits, skip, all tour steps, replay, keyboard focus, mobile and blocked storage. Other browser suites use a returning-visitor fixture to continue testing their existing workflows.
