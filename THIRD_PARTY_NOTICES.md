# Third-party components

## Three.js

- Version: 0.180.0
- Source: https://github.com/mrdoob/three.js
- Distribution: https://registry.npmjs.org/three/-/three-0.180.0.tgz
- License: MIT. The full copyright and permission notice is retained in `assets/vendor/three/LICENSE`.
- Vendored files: `three.module.min.js`, `three.core.min.js`, `OrbitControls.js`.
- Modification: OrbitControls imports the adjacent local Three.js module instead of the bare `three` specifier.
- Verified package SHA-512 integrity and SHA-256 hashes of distributed files: `assets/vendor/three/NOTICE.json`.

## Existing map and science dependencies

The 2D map loads Leaflet 1.9.4 (BSD-2-Clause) from unpkg; upstream: https://github.com/Leaflet/Leaflet. The map attribution identifies NASA imagery and OpenPlanetaryMap. Prepared NASA/USGS data products, dates, hashes, image credits and source references are documented by the active manifests, `docs/SCIENCE_METHOD.md`, and the app's Data & sources dialog.

Python processing dependencies are listed in `data/requirements.txt`; optional backend dependencies are listed in `backend/requirements.txt`. This notice documents the bundled 3D dependency and does not assign a project-wide license or alter upstream data terms.


## Global CTX Mosaic V01

- Product: Caltech Murray Lab Global CTX Mosaic V01 (2023 release), from NASA/JPL/MSSS orbital imagery.
- Credit: NASA/JPL/MSSS/The Murray Lab; geographic tile delivery by Esri.
- Product and usage statement: https://murray-lab.caltech.edu/CTX/V01/TilePages/
- Archive: https://doi.org/10.17189/m23v-ae12
- Scientific publication: https://doi.org/10.1029/2024EA003555
- Service item and its terms: https://www.arcgis.com/home/item.html?id=30c4acfe36284b1784bf07d5d73f9e4d
- The service item states that the Murray Lab/Caltech grants free use of V01 for all purposes, with NASA/JPL/MSSS/The Murray Lab credit. Esri's hosted-service terms also apply; the source-data permission does not replace those service terms.
- Cached files, source URLs and hashes are listed in `data/processed/imagery/global_ctx_manifest.json`. The app fetches only bounded context tiles; it does not download or redistribute the complete multi-terabyte mosaic.


## Workstation typography and icons

- Inter, Space Grotesk and IBM Plex Mono are served locally from `assets/vendor/fonts/`. Fonts were obtained through Google Fonts; each family's SIL Open Font License is retained alongside the font.
- A subset of Lucide SVG icons is embedded in `assets/vendor/lucide-icons.js`, obtained from https://github.com/lucide-icons/lucide. The ISC license and upstream notices are retained in `assets/vendor/lucide-LICENSE.txt`.
- These are presentation assets and do not represent NASA datasets or mission instrumentation.
