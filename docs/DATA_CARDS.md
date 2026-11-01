> **Historical planning notes:** The active app now uses downloaded, georeferenced MRO CTX imagery/elevation and a separate MGS MOLA context product. Real native-resolution DEM derivatives drive its route costs and exclusions. The old synthetic mission overlays and terrain-sample placements are inactive. See README.md, docs/SCIENCE_METHOD.md, and data/processed/nasa/manifest.json for the current method and sources.

# Dataset cards — freeze before coding (Eval Guide Step 2, Roadmap §10)

Rule: no dataset enters the MVP without a role + coverage check. NASA layers are authoritative;
Kaggle sets are supporting (AI, hazards, weather, gallery).

## Official NASA (authoritative basemap — P0 BUILD)
| Layer | Product | Source | Role |
|---|---|---|---|
| CTX base ~6m/px | MRO CTX Jezero mosaic | Mars Trek / PDS | Base imagery (poster panel 2) |
| HiRISE 0.25–0.5m/px | ESP_042657_1985, ESP_037396_1985 | uahirise.org / Trek | Detail footprints |
| DEM | MOLA + HiRISE DTM | PDS Geosciences / Trek | Elevation → slope → cost |
| THEMIS | Thermal/inertia (Odyssey) | ASU THEMIS portal | Geology unit |
| CRISM | Mineral (MRO) | JHUAPL portal | Carbonate/clay science |
| Route context | PIA25244 delta-to-rim routes, Sep 2022 | https://www.jpl.nasa.gov/images/pia25244-potential-driving-routes-for-nasas-perseverance-rover/ | Validates our demo corridor |

Study area (frozen): Jezero bbox lat 18.30–18.60, lon 77.15–77.70. Check every product covers it in QGIS before web work (Gate G2).

## Kaggle (supporting — P1, Gardner rule: simplify if it threatens P0)
1. **Mars Surface Images** (`markmbaum/mars-surface-images`) → Gallery / POI thumbnails / youth mode. NOT a basemap. Provenance: MSL/Mastcam derivatives — label as illustration, keep NASA Trek as map truth.
2. **Mars Terrain Binary / Underexposed** (`sanjidh090/underexposed-mars-rover-images`) → Preprocessing demo: histogram-equalization before AI. Shows “NoData/dark-frame handling” (Gate G1). Do not route on it.
3. **Mars Crater Study** (`codebreaker619/mars-crater-study-dataset`) → Hazard layer: crater rims in bbox become extra blocked cells for A*. Needs lat/lon filter + radius→grid rasterize. Cite catalog version.
4. **REMS Environmental Station** (`deepcontractor/mars-rover-environmental-monitoring-station`) → Survival weather strip: daily temp/pressure/wind curve in panel. Label as Gale-Crater heritage (MSL REMS), not Jezero live weather — no fake “live Mars weather” claim.
5. **AI4MARS June 2026** (`parthd144/ai4mars-dataset-june-2026`) → AI perception: 4 classes (soil, bedrock, sand, big rock) → terrain penalty w₂. Eval: accuracy + confusion matrix + failure cases (Eval Table 6). Decision rule: keep only if it beats heuristic penalty within schedule; else freeze as precomputed layer (Eval §10).

## G4 evidence (closed 2026-10-10, SIMPLIFY path)
- Script: `data/terrain_classify.py` on 10 real Kaggle Navcam frames.
- Result: 9 sand (0.9) / 1 soil (0.2), stability raw-vs-equalized 8/10.
- Artifacts: `data/processed/ai_terrain.geojson` (5 pts, auto-loaded by map over http, embedded fallback for file://) + `terrain_report.json` (distribution, failure file, limitations).
- Honest scope: close-range sample is sand-dominated; bedrock/minerals from orbital THEMIS/CRISM layers. DL classifier (MobileNet, AI4MARS crowdsourced labels) remains in `colab/` as next step.
- Mars-surface-images.zip (966MB) download interrupted (BadZip); gallery-only, not gating. Resume: `python -m kaggle datasets download -d markmbaum/mars-surface-images -p "data/raw/mars-surface-images" --unzip`

## Drive papers
`https://drive.google.com/drive/folders/1ouiGzEy9vqSv0Dzsd4Db4SHufJpHWvw_?usp=sharing` — currently not public (needs access). Make it “Anyone with link” or drop PDFs into `docs/papers/` and list title→claim→how we used it. Minimum: one paper backing cost weights, one backing O₂/EVA numbers.

## What NOT to build (Roadmap §19)
Full-Mars mapping, real-time weather, RL/SLAM, Mars-physics sim, 3D globe — all DROP/SIMPLIFY for MVP.
