# Ares Trail: scientific method and implementation boundaries

## Questions

How do distance-only and slope/relief-aware routes differ on actual Jezero terrain when both obey the same exclusion policy? What observed terrain transitions could motivate further scientific inspection near a planned traverse?

## Inputs

1. NASA Mars Reconnaissance Orbiter CTX: `JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0.tif`, 6 m source imagery.
2. MRO CTX stereo topography: `JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif`, 20 m elevation relative to the Mars equipotential surface. This USGS product is registered to MOLA. Both products are in the [official USGS archive](https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/index.html); data release DOI [10.5066/P906QQT8](https://doi.org/10.5066/P906QQT8).
3. NASA Mars Global Surveyor MOLA: `MEGT44N000HB`, 128 pixels/degree (~463 m), from the [PDS maintained archive](https://pds-geosciences.wustl.edu/missions/mgs/megdr.html). Its separate regional layer is context only, not a fine-resolution routing input. MOLA bins can be interpolated between laser tracks. Because CTX is tied to MOLA, agreement is not independent accuracy validation.
4. Departure: [NASA NTRS landing-coordinate reference](https://ntrs.nasa.gov/citations/20210024644), 18.44463° N, 77.45088° E. The delta-area destination is a user-selected study waypoint; no real astronaut route is claimed.

The product manifests preserve URLs, downloaded file sizes, SHA-256 checksums, source labels, coordinate systems, and retrieval time. MOLA uses an exact documented HTTP byte range; its checksum identifies the stored strip, not the entire source image.

## Spatial preparation

Study bounds: 18.30–18.60° N, 77.17–77.69° E. Coordinates are Mars planetocentric, east-positive longitude. Read the embedded Mars equirectangular CRS rather than assigning an Earth CRS. CTX's recorded spherical radius is 3,396,190 m; MOLA records 3,396,000 m. Display rasters are transformed to Mars Mercator and attached to their geographic bounds. This has the same angular screen geometry as Leaflet Web Mercator, without treating source meters as Earth meters.

Display imagery is downsampled and stretched between its 2nd and 98th percentiles. This changes appearance, not georeferencing or elevation. MOLA is rendered with nearest-neighbor sampling to preserve its visibly coarser information.

## Derivatives and policies

Compute finite-difference elevation gradients on the **native 20 m CTX DEM**. Since the source equirectangular standard parallel is zero, ground east-west spacing is `map_dx * cos(latitude)`. Calculate `slope_deg = atan(sqrt((dz/dx_ground)^2 + (dz/dy)^2)) * 180/pi`.

Calculate an elevation-residual proxy as `abs(elevation - GaussianSmooth(elevation, sigma=2 native pixels))`. The smoothing scale is approximately 40 m. This is topographic residual relief; it is **not** a rock-size, material, sand, or soil classifier.

Aggregate onto approximately 100 m cells: mean elevation, mean slope, maximum native slope, and mean residual. A cell is excluded if data or valid derivative neighbors are incomplete, or if maximum slope (rounded to the exported precision) reaches 20°. This is a **prototype policy**, not a NASA EVA requirement. NoData is never silently converted to flat terrain.

The browser A* graph uses eight neighbors and prohibits diagonal corner cutting. Edge traversal checks every intersected grid cell. Both modes share the same grid, exclusions, endpoints, and Mars-radius distance metric. The distance-only mode minimizes distance. Terrain-aware edge cost is distance multiplied by `1 + w1 * min(mean_slope/20,1) + w2 * min(residual_m/3,1)`.

Report exposure as the distance integral of the unweighted normalized slope and residual penalties, in penalty-km. It is a comparison statistic, not a risk probability. Report distance-weighted mean slope, maximum native slope in visited cells, ascent/descent from cell-mean elevations, and distance through cells with a maximum slope ≥10°. Cell maximum is not the same as directional grade along a path.

## Investigation candidates

Select observed, unblocked cells with 5–12° mean slope in the fixed demo corridor (18.425–18.50 N / 77.39–77.47 E). Rank by elevation residual, retain at least 500 m separation, and select at most 12. These mark terrain transitions worth inspecting. Geologic interpretation remains unconfirmed; there is no mineral detection. Near-route proximity is geometric distance to segments, with a 0.75 km cutoff, not a validated detour or accessibility assessment.

## Evaluation

`node experiments/evaluate_routes.cjs` evaluates three fixed corridors and four weight settings on the default corridor. It writes paths, metrics, assumptions, and source hashes to `comparison_report.json` and exports a CSV. The corridors are selected case studies, not a random sample. Do not infer universal superiority from them.

Tests compare A* against Dijkstra, verify all path segments, test blocked/unknown cells and same-cell endpoints, and verify slope against analytically known flat and inclined planes. Browser tests check actual data loading, measurements, exports, interaction lifecycle, and failure behavior.

## Checkpoint observations and mission story

`data/prepare_observations.py` preserves the official HiRISE pages, PDS RED labels, map-projected browse images, and two NASA-linked Perseverance panoramas. The observation catalog records source URLs, source-file and preview SHA-256 hashes, catalog footprints, dates, and display processing. This is a **curated snapshot**, not an exhaustive or live NASA archive search.

HiRISE products `ESP_094047_1985` and `ESP_093981_1985` were acquired on 19 and 14 August 2026. Historical comparison products are `ESP_073068_1985` and `ESP_073912_1985`. Point-in-polygon matching uses the rounded footprint published by the instrument team; proximity alone never becomes an exact coverage match. Select the newest **covering observation in this snapshot**. Acquisition times and product-creation times come from the PDS labels; public-release dates are unknown where the labels do not provide them. CTX metadata records a publication date of 24 July 2020; individual source capture dates for a mosaic pixel are not supplied. Never present retrieval or processing timestamps as image acquisition dates.

Georeference official RED browse imagery using the PDS rectangular latitude/longitude extrema. Verify that the browse aspect ratio matches the full map-projected product dimensions, then reproject to Mars Mercator at 6 m projected spacing. Source sampling (0.25–0.5 m) is **not** preview resolution: the downloaded browse has already been downsampled. Source browse spacing is recorded separately. Black padding becomes transparent; coverage alone does not establish visible detail at each pixel. CTX evidence imagery is separately rendered from the real 6 m orthoimage, with a 2–98 percentile grayscale stretch. Neither image source modifies the routing DEM.

For `ESP_094047_1985`, also cache the official 0.5 m RED JP2 (~334 MB). Validate native dimensions against the PDS label; read a corridor window at approximately 1 m sampling, then reproject to 1 m Mars Mercator pixels. The detail region is 18.427–18.50 N / 77.40–77.475 E. A 2–98 percentile grayscale stretch improves contrast; invalid/zero padding is transparent. The browser chooses this detail only when the entire requested viewing window is inside its extent; otherwise it shows the labeled browse preview. Source sampling is not a claim that all objects that size are resolved. Neither display nor registration has been independently ground-truthed here.

The observatory centers image crops using Mercator latitude geometry, draws the actual planned route and selected coordinate, and shows an approximate local distance scale. Numbered checkpoints are actual route waypoints selected at departure, one-third and two-thirds distance, the greatest cell maximum among sampled route waypoints, and arrival. Duplicate locations are merged. They are inspection prompts rather than scientific detections.

`PIA24264` is NASA's published first Mastcam-Z panorama, associated with the landing site and shown as nearby context only within 150 m of the landing reference. This is not a surveyed camera-coordinate solution or a visibility calculation. `PIA24921` is a published delta panorama assembled from June 2022 observations; NASA's regional association is preserved, but no exact camera coordinates are assigned. It is always labeled **regional context**, never a photograph from an arbitrary checkpoint. Images can be explored by scrolling sideways; this is a flat published panorama, not a reconstructed 3-D street view. Both mosaics retain their publication/capture dates and credit; the delta product is enhanced color.

The human expedition narrative is explicitly fictional. Manual notes describe the user's reasoning; recording a review does not certify route safety. Changes to a route reset reviews. Exports include checkpoint coordinates, measured terrain, notes, review timestamps, matching observation IDs, date semantics, and evidence hashes. Missing catalog or preview assets leave terrain planning available but visibly disable the corresponding evidence view; no invented replacement appears.

## Limitations

- A 20 m source DEM and 100 m grid cannot resolve individual rocks, narrow trenches, or foot-scale hazards. Stereo topography has measurement errors; no uncertainty raster is supplied here.
- Source projection and mean-radius route distances differ by about 0.2% in reference radius. Actual terrain surface distances are not modeled.
- Weights, 20° exclusion, and residual normalization are design choices requiring sensitivity analysis and future EVA validation.
- Walk speed (3 km/h) and oxygen (0.8 kg/h plus 30% reserve) remain unvalidated demonstration assumptions. They do not account for slope-dependent speed, suit design, workload, return travel, or rescue margin.
- No CRISM mineral raster, THEMIS thermal raster, live weather, or physical rover telemetry is integrated. Earlier schematic mission overlays are removed from the active app.
- MOLA and CTX share reference information; the coarse MOLA layer does not independently validate CTX accuracy.

## Reproduction

```powershell
python -m pip install -r data/requirements.txt
python -B data/prepare_nasa.py
python -B data/download_hirise_detail.py
python -B data/prepare_observations.py
node experiments/evaluate_routes.cjs
python -B experiments/plot_analysis.py
node tests/planner.test.cjs
node tests/observations.test.cjs
python -B tests/science_test.py
python -B tests/observations_test.py
python -B tests/backend_test.py
node tests/browser-check.cjs
```

Downloads are cached. Original inputs remain in `data/raw/nasa`; processed arrays, map images, georeferenced derivative GeoTIFFs, and manifests are under `data/processed/nasa`.


## Global regional planning

Use Explore another region to choose Gale, Olympus Mons, or a custom center. Browse Mars zooms out; Use current map center copies the visible center. Load selected region downloads cached native MOLA tiles, then set departure/destination on the map and compare routes. Regions are 6, 12, or 16 degrees wide (about 355?950 km north?south). Longitude wraps through 0/360 and ?180. Centers are limited to ?80?; bounds are clipped to ?85? for the Mercator map. This does not support polar or planet-wide optimal routes. Reset demo restores detailed CTX Jezero.

Sources are NASA PDS MEGT90N000EB global topography and MEGC90N000EB observation counts at 16 pixels/degree (~3.705 km north?south; east?west spacing shrinks with latitude). Acquisition: September 1997?June 2001. Product creation: April 3, 2003; final MEGDR release May 7, 2003. Archive migration dates do not imply new observations. Reproduce with `python data/prepare_global.py`. Full original IMG/LBL/XML files and SHA-256 hashes are retained. Tiles losslessly preserve big-endian source elevation and observation counts as interleaved little-endian int16.

Regional slopes are finite differences of the native MOLA grid with latitude-corrected spacing, rather than subpixel detail. Regional relief is the absolute residual against four adjacent cells, normalized at 300 m for routing. Boundary cells are blocked because derivative support is incomplete. The 20? exclusion is a prototype policy at coarse resolution; it misses many steep local features. Zero-count elevation bins are interpolated and receive a fixed 0.5 added edge-cost penalty in terrain-aware routing; distance-only routing shares slope exclusions but does not apply terrain or support penalties. Route metrics include distance on interpolated cells. Cells with observations are still aggregated medians, not a local survey. Minimum endpoint separation is one nominal cell width.

The colored regional map is elevation, not photographic imagery, and is resampled into Mercator display rows. Regional checkpoint evidence displays elevation, slope, bin observation count, source and historical dates; it does not substitute Jezero images. No regional walking time, oxygen estimate, rover simulation, or safety clearance is supplied. Exports identify the actual active dataset and hashes and set regional EVA estimates to null. Orbital and rover image inspection remains available for the detailed Jezero mode. A candidate route is optimal only for the chosen grid, cost weights and loaded region; it is not a validated safest route.
