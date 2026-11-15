# Martian Mars / Ares Trail — Marswalk Mission Planner

> Repository status: runnable prototype imported from the earlier Marswalk planner. Original development history is retained. This upload is not a claim that the implementation was created during the hackathon.

A NASA Space Apps prototype for **Interplanetary Survival Guide: Martian Map**, now driven by real Jezero imagery and topography from MRO CTX and regional elevation context from MGS MOLA.

This is an independent hackathon prototype, not an official NASA application or a validated astronaut safety system.

## Repository data

Prepared browser assets, regional MOLA tiles, source manifests, and download scripts are included. Large original downloads in `data/raw/`, local credentials, backups, and generated preview screenshots are excluded from Git. Nothing is removed from an existing local working copy.

After a fresh clone, the prepared app runs without downloading the raw products. To reproduce the processing or run source-hash science tests, first run the preparation commands below, plus `python -B data/prepare_global.py` for the global MOLA originals. References below to cached originals describe the development working copy; a fresh clone needs those downloads. The original page backup is also local only.

## Run the prepared app

```powershell
python -B -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. The processed imagery, terrain grid, and manifests are already included. HTTP is required to load the JSON data. Leaflet and optional fonts load from external CDNs; fonts have system fallbacks. Missing terrain disables planning rather than reverting to fabricated costs.

## What is implemented

- A locally served, georeferenced CTX image mosaic from a **6 m source**, displayed at reduced resolution for the web.
- A **20 m CTX stereo elevation model**, MOLA-controlled by its USGS producers, with native-resolution slope and an elevation-residual relief proxy.
- A **separate MGS MOLA MEGDR subset**, ~463 m source resolution, shown as coarse regional context.
- Approximately **100 m route cells** (178 rows × 293 columns), with mean elevation/slope and conservative maximum-native-slope constraints.
- A* distance-only and terrain-aware routes sharing the same exclusion and coverage model. NoData and cells reaching the prototype 20° policy are excluded; edge checks cover every crossed grid cell.
- Measured topographic route statistics, a cell-elevation profile, and a traceable JSON export with source hashes.
- Numbered, clickable **route checkpoints** and an observatory for arbitrary map locations, with local orbital crops, approximate scales, terrain measurements, and image dates.
- **Four real MRO HiRISE observations**, including acquisitions on 14 and 19 August 2026, matched by published catalog footprints. The newest covering record is selected within this curated snapshot; this is not an exhaustive archive search.
- **Two real Perseverance Mastcam-Z panoramas**: landing-site context near the departure and a clearly labeled regional delta view. Exact ground photography is not invented where coverage is missing.
- Inspection notes and review state saved with checkpoints, observation IDs, dates, sources and hashes in the route export. Replanning resets reviews; human review is not a safety certificate.
- DEM-derived **terrain-inspection candidates**, with unconfirmed geological interpretation. Near-route distance is shown; science detours are not independently planned.
- A reliable illustrative rover simulation, with synthetic obstacle pause/resume. No physical telemetry or calibrated waypoint follower is connected.

Source links, hashes, methods, assumptions, and downloadable results appear in **Data & sources**. Full methodology is in [docs/SCIENCE_METHOD.md](docs/SCIENCE_METHOD.md).

## Reproduce the science

```powershell
python -m pip install -r data/requirements.txt
python -B data/prepare_nasa.py
python -B data/download_hirise_detail.py
python -B data/prepare_observations.py
node experiments/evaluate_routes.cjs
python -B experiments/plot_analysis.py
```

The preparation downloads and caches two official USGS GeoTIFFs and their metadata (~46 MB combined) and a documented MOLA byte-range strip (~1 MB). Original files stay in `data/raw/nasa`; derivatives and browser assets stay in `data/processed/nasa`.

The observation preparation adds four official HiRISE browse products/labels and two NASA-linked rover panoramas. A **~334 MB official 0.5 m HiRISE JP2** supplies a local **1 m detail preview** in the demo corridor; it is already cached. `download_hirise_detail.py` validates ranged responses and can resume an interrupted download. Outside that detailed corridor or in older observations, the interface explicitly shows a 6 m projected browse preview. No AI-generated imagery is used.

The evaluation creates `comparison_report.json`, `route_comparison.csv`, and shareable plots. It tests three fixed corridors and weight sensitivity. `python -B experiments/run_compare.py` is a compatibility entry point for the same real-data evaluation.

## Demo

1. The app opens at the published Perseverance landing coordinate and compares routes to a selected delta-area waypoint.
2. Toggle CTX imagery/elevation, derived slope, coarse MOLA context, exclusions, and candidates. Visibility does not change routing constraints.
3. Click numbered checkpoints or any map coordinate. Compare CTX with covering HiRISE observations, change the view width, inspect capture/publication dates, and open rover panoramas.
4. Record inspection notes and explain what the visible evidence supports and what still needs a closer survey. Set endpoints and change slope/relief weights to plan your own route.
5. Explain the measured distance and slope trade-off, source versus preview resolution, and the prototype exclusion policy.
6. Run the rover simulation and resume after its explicitly synthetic obstacle.
7. Export the route with inspection reasoning and open Data & sources to show exact products and the route evaluation.

## Validation

```powershell
node --check assets/app.js
node tests/planner.test.cjs
node tests/observations.test.cjs
python -B tests/science_test.py
python -B tests/observations_test.py
python -B tests/backend_test.py
node tests/browser-check.cjs
```

Science tests use known flat and inclined surfaces, verify longitude spacing, NoData behavior, source hashes, grid policies, and candidate coordinates. Planner checks cover Dijkstra agreement, complete segment constraints, unknown/steep endpoints, and same-cell paths. Browser checks exercise actual data loading, source-bearing export, desktop/mobile layouts, interactions, and failure handling. Playwright and Chromium are required for the browser checks.

## Optional summary backend

```powershell
python -m pip install -r backend/requirements.txt
python backend/app.py
```

POST `/route` with `{"waypoints":[[18.44463,77.45088],[18.48,77.42]]}` to receive distance/time/oxygen estimates. This API is a summary service: it does not independently validate slope constraints or generate motor commands. Invalid inputs return HTTP 400.

## Important scientific boundaries

These are **data-informed planning comparisons, not validated EVA safety predictions**. The 20° threshold, cost weights, 3 m residual normalization, 3 km/h speed, and 0.8 kg/h oxygen plus 30% reserve remain design assumptions. Estimates exclude return travel. Source/route resolution cannot detect individual rocks or narrow hazards. MOLA is not an independent validation of a MOLA-controlled CTX product.

No real CRISM mineral or THEMIS thermal raster is currently integrated. Earlier synthetic circles, invented terrain-sample coordinates, and misleading AI4MARS labels have been removed from the active interface and cost model. Old data and notebook experiments are retained as historical work. The original pre-redesign page remains in `index.html.bak`.


## Global regional planning

Use Explore another region to choose Gale, Olympus Mons, or a custom center. Browse Mars zooms out; Use current map center copies the visible center. Load selected region downloads cached native MOLA tiles, then set departure/destination on the map and compare routes. Regions are 6, 12, or 16 degrees wide (about 355-950 km north-south). Longitude wraps through 0/360 and +/-180. Centers are limited to +/-80 degrees; bounds are clipped to +/-85 degrees for the Mercator map. This does not support polar or planet-wide optimal routes. Reset demo restores detailed CTX Jezero.

Sources are NASA PDS MEGT90N000EB global topography and MEGC90N000EB observation counts at 16 pixels/degree (~3.705 km north-south; east-west spacing shrinks with latitude). Acquisition: September 1997-June 2001. Product creation: April 3, 2003; final MEGDR release May 7, 2003. Archive migration dates do not imply new observations. Reproduce with `python data/prepare_global.py`. Full original IMG/LBL/XML files and SHA-256 hashes are retained. Tiles losslessly preserve big-endian source elevation and observation counts as interleaved little-endian int16.

Regional slopes are finite differences of the native MOLA grid with latitude-corrected spacing, rather than subpixel detail. Regional relief is the absolute residual against four adjacent cells, normalized at 300 m for routing. Boundary cells are blocked because derivative support is incomplete. The 20-degree exclusion is a prototype policy at coarse resolution; it misses many steep local features. Zero-count elevation bins are interpolated and receive a fixed 0.5 added edge-cost penalty in terrain-aware routing; distance-only routing shares slope exclusions but does not apply terrain or support penalties. Route metrics include distance on interpolated cells. Cells with observations are still aggregated medians, not a local survey. Minimum endpoint separation is one nominal cell width.

The colored regional map is elevation, not photographic imagery, and is resampled into Mercator display rows. Regional checkpoint evidence displays elevation, slope, bin observation count, source and historical dates; it does not substitute Jezero images. No regional walking time, oxygen estimate, rover simulation, or safety clearance is supplied. Exports identify the actual active dataset and hashes and set regional EVA estimates to null. Orbital and rover image inspection remains available for the detailed Jezero mode. A candidate route is optimal only for the chosen grid, cost weights and loaded region; it is not a validated safest route.


## Review corrections

The sources dialog follows the active terrain dataset: CTX Jezero or global MOLA, with source products, dates, spacing and hashes. Regional mode detaches local CTX/HiRISE imagery, coverage and science pins; unavailable controls are disabled. The MOLA elevation checkbox controls the regional overlay. Reset demo restores detailed Jezero layers and prior checkbox choices.

The comparison column is an **unweighted slope/relief index**, not the A* objective. It excludes the selected preference weights and the regional interpolated-bin penalty. The numerical routing model has not changed. Regional maximum slope is labeled the maximum sampled coarse gradient, never a within-bin maximum.

Run `node tests/browser-check.cjs` and `node tests/global-check.cjs` with Playwright installed (`npm install --no-save playwright`). The tests start and stop their own HTTP servers and close their browsers. They use a downloaded Playwright browser, an installed Chrome/Edge on Windows, or `BROWSER_EXECUTABLE_PATH`. If no browser is installed, run `npx playwright install chromium`. Regional checks cover Gale, Olympus, antimeridian routing, active provenance, disabled local layers, regional overlay visibility, restored Jezero state and failed data loads.


## Three.js terrain and route view

Choose **3D terrain** above the map to open a locally bundled Three.js view. Drag to orbit, scroll/pinch to zoom, and right-drag to pan. Frame route and Frame region adjust the camera. Numbered 3D markers and the checkpoint buttons open the existing evidence inspector. Set on map returns to 2D for endpoint selection. Clearing or replanning a route updates the 3D overlay; switching regions rebuilds the terrain from the active dataset.

The mesh uses the active elevation grid, including the ~100 m Jezero routing cells or ~3.7 km native global MOLA cells. It does not reconstruct features below that spacing. Missing elevations leave mesh holes. Surface coloring comes from elevation; local CTX imagery is available in Jezero, with a separate global CTX mosaic available for regional 3D visual context. Imagery is draped using the preview's Mercator coordinates. The 3D display uses a local planar projection, not a whole-planet globe or a ground-level Mars reconstruction. Regional curvature/distortion is not corrected.

Vertical scale defaults to 1x. The optional 3x/5x/10x display exaggeration changes neither routing inputs nor route/export metrics. Route polylines follow the rendered triangle surface with a small visibility offset; annotations are display symbols. Lighting is illustrative and does not encode actual solar conditions. Large areas retain the original coarse data limitation, regardless of zoom.

The renderer is lazy-loaded from `assets/vendor/three/` and adds no CDN requests. WebGL2 support is required for 3D; if unavailable, the 2D planner remains usable. The existing 2D map still loads Leaflet externally. Three.js 0.180.0, its MIT license, package integrity and file hashes are preserved; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Validate with `node tests/terrain-geometry.test.cjs` and `node tests/terrain3d-check.cjs`. Tests cover triangle-exact route draping, NoData holes, unchanged metrics under display exaggeration, checkpoint inspection, regional and longitude-seam transitions, mobile sizing and WebGL fallback.


## Global CTX orbital visual context

Regional 3D views now offer Surface > CTX global mosaic. This is the Caltech/Murray Lab Global CTX Mosaic V01, based on NASA/JPL/MSSS imagery, with an optional Esri-hosted geographic tile service. It is separate from both the local USGS Jezero orthoimage and the MOLA topography. Source: https://murray-lab.caltech.edu/CTX/V01/TilePages/ ; archive DOI: https://doi.org/10.17189/m23v-ae12 ; paper: https://doi.org/10.1029/2024EA003555 .

The mosaic has a native 5 m/pixel source. Whole-region previews intentionally request coarser tile levels (~hundreds of meters/pixel), with actual tile and display spacing shown in the viewer. The mesh and routing remain ~3.7 km/cell outside Jezero. Imagery cannot improve the resolution of the height model, establish within-cell slopes, or certify a walking route. V01 was released in 2023 and combines images from multiple orbits; this app does not ingest per-point capture dates. It is not a latest-image service. Coverage gaps can occur.

The default 6-degree Gale and Olympus regions have 21 cached PNG tiles and checksums in `data/processed/imagery/global_ctx_manifest.json`. Those previews work without the external imagery service. Custom footprints and larger extents stream additional tiles and require internet. If any requested tile is unavailable, the 3D view returns to elevation coloring with a clear message rather than substituting an unrelated photograph. Tile columns wrap at the antimeridian. Rendering uses the service's Mars 2000 geographic coordinates (WKID 104971), not Earth Web Mercator coordinates.

Reproduce cached imagery with `python -B data/prepare_global_imagery.py`. Validate with `node tests/global-imagery.test.cjs`. A route export records loaded 3D imagery product, geographic footprint, preview spacing, source links, tile IDs and available SHA-256 hashes under `visualization.imagery`, separately from route terrain provenance. Display imagery does not change route costs or metrics.

Cached service images retain original-source hashes and are kept as PNG for consistent browser delivery. Non-PNG responses are decoded and losslessly encoded to PNG; the manifest distinguishes prepared-file hashes from original-source hashes. Original response bytes remain in the local raw-data cache, excluded from Git.


## Development history and transparency

This repository imports the existing Ares Trail prototype, which was developed before the official 2026 hackathon. Its earlier commit history is preserved alongside the initial Martian Mars documentation and the repository owner's additional file. Upload and merge dates do not change the original development timeline.

Further changes are recorded as new work. Any event submission should distinguish prior implementation from work completed during the event and follow organizer guidance about eligibility.

ChatGPT/Codex assisted with implementation, tests, and documentation. The actual NASA imagery, source metadata, model limitations, and third-party component notices remain documented in the app and its manifests.
