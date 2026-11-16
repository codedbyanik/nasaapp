# Project architecture

ARES TRAIL is a static browser application with an optional Flask summary API and reproducible Python data pipelines. It deliberately has no frontend compilation step.

```text
nasaapp/
├── index.html                 # Static application entry point
├── src/                       # First-party browser source
│   ├── app.js                 # Planner orchestration and map event bindings
│   ├── core/                  # Terrain-aware routing and measurements
│   ├── features/              # Observations, regional datasets, context
│   ├── terrain/               # 3D viewer, mesh geometry, imagery delivery
│   ├── ui/                    # Workspace layout and presentation
│   └── styles/                # Base styles and workstation theme
├── assets/                    # Static favicon and licensed vendor assets
│   └── vendor/                # Three.js, fonts, Lucide, upstream licenses
├── backend/                   # Optional Flask route-summary API
├── scripts/
│   ├── data/                  # Source downloads and terrain preparation
│   └── evaluation/            # Route comparisons and scientific figures
├── data/
│   ├── processed/             # Prepared runtime data and provenance manifests
│   └── raw/                   # Reproducible original downloads, Git-ignored
├── tests/
│   ├── unit/                  # Routing, observations, geometry, imagery
│   ├── browser/               # End-to-end UI and map behavior
│   ├── backend/               # Flask API validation
│   ├── science/               # Numerics and original-product integrity
│   └── helpers/               # Shared browser and local-server utilities
├── docs/                      # Architecture, datasets, methods, UI behavior
├── package.json               # Development and validation commands
├── package-lock.json          # Locked JavaScript test dependencies
└── vercel.json                # Explicit static deployment from repository root
```

## Boundaries

`src/core/planner.js` owns the scientific routing calculations. `src/app.js` binds that model to Leaflet. Observation review state stays in `src/features/observations.js`; the 3D viewer remains lazy. UI modules present the same state without replacing the scientific models.

`backend/app.py` remains an optional coordinate-summary service. The deployed browser planner does not depend on it or send it terrain for independent route validation. This reorganization does not add an API integration.

Data preparation and evaluation scripts resolve the repository root from their own location, keeping inputs under `data/raw/` and outputs under `data/processed/`. Existing runtime data URLs, prepared product bytes, checksums and source manifests are preserved.

## Development

From the repository root:

```sh
npm ci
npm start
npm test
npm run test:browser
npm run test:backend
```

Browser tests require a Playwright browser, installed Chrome/Edge, or `BROWSER_EXECUTABLE_PATH`. Install Chromium with `npx playwright install chromium` if needed. Flask dependencies are separate: `python -m pip install -r backend/requirements.txt`.

Data preparation dependencies are installed with `python -m pip install -r scripts/data/requirements.txt`. Scientific source-integrity tests under `tests/science/` require the corresponding raw products; a fresh clone includes prepared runtime products, not those large originals.

## Deployment

Vercel serves the root `index.html`. `vercel.json` selects static output from the repository root, with no installation or build command. JavaScript test dependencies are development tools and are not required to serve the app. Dataset URLs remain stable; the configured `/api/route` rewrite forwards requests to the optional Render summary service. Browser-based terrain routing does not depend on that service.

The root entry point is intentional: moving it would change every relative data and documentation URL without improving the scientific or UI architecture. Local development uses the same static URL layout as deployment.
