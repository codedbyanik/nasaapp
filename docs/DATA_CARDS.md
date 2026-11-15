# Active dataset cards

These cards describe sources connected to the current app. Product URLs, observation dates, processing details and checksums are retained in the manifests below and in the active Data & sources dialog.

| Dataset | Coverage and resolution | Role | Provenance |
|---|---|---|---|
| MRO CTX imagery | Jezero latitude 18.30?18.60, east longitude 77.17?77.69; 6 m source, reduced web display | Orbital visual context; imagery does not determine route costs | `data/processed/nasa/manifest.json`; USGS archive, DOI 10.5066/P906QQT8 |
| CTX stereo elevation | Same Jezero subset; 20 m source, approximately 100 m planning cells | Elevation, derived slope and relief, terrain-aware routes and exclusions | `data/processed/nasa/manifest.json`; method in `SCIENCE_METHOD.md` |
| MGS MOLA MEGT44N000HB | Jezero regional context, approximately 463 m source | Coarse elevation overlay; not a walking-scale DEM or independent validation of MOLA-controlled CTX | `data/processed/nasa/mola_manifest.json` and NASA manifest |
| MGS MOLA MEGT90N000EB / MEGC90N000EB | Global prepared terrain/count tiles; approximately 3.7 km cells | Regional candidate corridors; zero-count bins identify interpolated elevation | `data/processed/global/manifest.json` |
| Global CTX Mosaic V01 | Global orbital visual context, with preset tiles cached locally | Optional regional 3D imagery; does not refine MOLA terrain | `data/processed/imagery/global_ctx_manifest.json`; credits in `../THIRD_PARTY_NOTICES.md` |
| MRO HiRISE | Four curated Jezero observations; footprint-dependent coverage | Archived checkpoint imagery and acquisition/publication metadata | `data/processed/nasa/observations.json` |
| Perseverance Mastcam-Z | PIA24264 landing-site panorama and PIA24921 regional delta panorama | Ground imagery where the catalog association supports it | `data/processed/nasa/observations.json` |

## Archived observations

HiRISE IDs: ESP_094047_1985, ESP_093981_1985, ESP_073068_1985 and ESP_073912_1985. This is a curated snapshot, not an exhaustive archive search or a claim to provide the latest NASA release. Preview sampling is distinct from instrument/source resolution.

The landing panorama is associated with the nearby landing site. The delta panorama is regional context, not a photograph taken at every checkpoint.

## Derived information and assumptions

Slope, relief, route measurements, profiles and investigation candidates are calculated from the loaded terrain grid. Candidates are terrain hypotheses, not confirmed geological or mineral discoveries. The 20-degree exclusion is a prototype planning policy, not validated astronaut clearance. Local time/oxygen estimates are distance-derived assumptions and exclude return travel; regional EVA estimates are unavailable.

THEMIS thermal imagery, CRISM mineral rasters, live weather, AI4MARS classification, Kaggle experimental layers and hardware telemetry are not connected. Legacy starter files and their inactive outputs have been removed from the current tree; earlier commits retain their history. The active NASA preparation scripts, manifests, evaluation outputs and tests remain included.
