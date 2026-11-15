"""Reproduce the Jezero CTX imagery/elevation preparation; no trained ML model.

Download official USGS products, preserve them, derive slope on the native DEM,
aggregate conservatively to a ~100 m routing grid, and render local map assets.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path
import xml.etree.ElementTree as ET

import numpy as np
import requests
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_bounds
from rasterio.warp import reproject, transform_bounds, Resampling
from scipy.ndimage import gaussian_filter, maximum_filter
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/raw/nasa"
OUT = ROOT / "data/processed/nasa"
BASE = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/CTX/"
DEM = "JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0"
ORTHO = "JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0"
BBOX = {"lat0": 18.30, "lat1": 18.60, "lon0": 77.17, "lon1": 77.69}
SLOPE_LIMIT = 20.0  # Demonstration policy, not a validated EVA threshold.


def download(name: str) -> Path:
    RAW.mkdir(parents=True, exist_ok=True)
    dest = RAW / name
    if dest.exists():
        return dest
    with requests.get(BASE + name + "?download=ares-full", stream=True,
                      timeout=(30, 180)) as response:
        response.raise_for_status()
        if response.status_code != 200:
            raise RuntimeError("Expected a complete product, not a range response")
        part = dest.with_suffix(dest.suffix + ".part")
        with part.open("wb") as stream:
            for chunk in response.iter_content(1024 * 1024):
                stream.write(chunk)
        expected = response.headers.get("Content-Length")
        if expected and part.stat().st_size != int(expected):
            raise RuntimeError("Incomplete download: " + name)
        part.replace(dest)
    return dest


def native_derivatives(elevation, valid, dx, dy, latitudes):
    """Finite differences in meters; correct east-west spacing for eqc(lat_ts=0)."""
    z = np.where(valid, elevation, np.nan)
    dzdy, dzdx = np.gradient(z, dy, dx)
    dzdx = dzdx / np.cos(np.deg2rad(latitudes))[:, None]
    slope = np.rad2deg(np.arctan(np.hypot(dzdx, dzdy)))
    # A residual relief proxy at ~40 m smoothing scale, not rock/sand detection.
    weights = gaussian_filter(valid.astype(float), sigma=2)
    smooth = gaussian_filter(np.where(valid, elevation, 0), sigma=2)
    smooth = np.divide(smooth, weights, out=np.full_like(smooth, np.nan), where=weights > .99)
    relief = np.abs(z - smooth)
    usable = valid & np.isfinite(slope) & np.isfinite(relief)
    return slope, relief, usable


def warp_array(array, src_transform, src_crs, shape, dst_transform, dst_crs,
               resampling=Resampling.average):
    dest = np.full(shape, np.nan, dtype=np.float32)
    reproject(array.astype(np.float32), dest, src_transform=src_transform,
              src_crs=src_crs, src_nodata=np.nan, dst_transform=dst_transform,
              dst_crs=dst_crs, dst_nodata=np.nan, resampling=resampling)
    return dest


def write_tiff(name, array, transform, crs):
    with rasterio.open(OUT / name, "w", driver="GTiff", width=array.shape[1],
                       height=array.shape[0], count=1, dtype="float32", nodata=np.nan,
                       crs=crs, transform=transform, compress="deflate") as dest:
        dest.write(array.astype(np.float32), 1)


def as_list(array, decimals=2):
    rounded = np.round(array, decimals)
    return [[float(v) if np.isfinite(v) else None for v in row] for row in rounded]


def image_rgba(values, valid, low, high, palette, alpha=175):
    position = np.clip(np.nan_to_num((values - low) / (high - low)), 0, 1)
    anchors = np.linspace(0, 1, len(palette))
    rgb = np.stack([np.interp(position, anchors, [p[c] for p in palette])
                    for c in range(3)], axis=-1)
    return np.concatenate([rgb.astype(np.uint8),
                           np.where(valid, alpha, 0).astype(np.uint8)[..., None]], axis=-1)


def prepare_mola(display_shape, display_transform, mercator):
    """Read just the Jezero latitude strip from the official 128 ppd product."""
    url = "https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg128/megt44n000hb"
    for suffix in [".xml", ".lbl", ".hdr"]:
        dest = RAW / ("megt44n000hb" + suffix)
        if not dest.exists():
            response = requests.get(url + suffix, timeout=60)
            response.raise_for_status()
            dest.write_bytes(response.content)
    # PDS label: 11520 columns, 5632 rows; 16-bit MSB signed integers; no header.
    first = math.floor((44 - BBOX["lat1"]) * 128) - 2
    last = math.ceil((44 - BBOX["lat0"]) * 128) + 2
    left = math.floor(BBOX["lon0"] * 128) - 2
    right = math.ceil(BBOX["lon1"] * 128) + 2
    offset, end = first * 23040, last * 23040 - 1
    strip_file = RAW / f"megt44n000hb_rows_{first}_{last}.bin"
    if not strip_file.exists():
        response = requests.get(url + ".img", headers={"Range": f"bytes={offset}-{end}"}, timeout=120)
        response.raise_for_status()
        if response.status_code != 206 or len(response.content) != end - offset + 1:
            raise RuntimeError("MOLA server did not supply the exact requested range")
        strip_file.write_bytes(response.content)
    raw = np.frombuffer(strip_file.read_bytes(), dtype=">i2").reshape(last-first, 11520)[:, left:right].astype(np.float32)
    bounds = (left/128, 44-last/128, right/128, 44-first/128)
    transform = from_bounds(*bounds, raw.shape[1], raw.shape[0])
    geographic = CRS.from_string("+proj=longlat +R=3396000 +no_defs")
    write_tiff("mola_128ppd.tif", raw, transform, geographic)
    values = warp_array(raw, transform, geographic, display_shape,
                        display_transform, mercator, Resampling.nearest)
    Image.fromarray(image_rgba(values, np.isfinite(values), *np.nanpercentile(values, [2, 98]),
                              [(50, 75, 110), (100, 167, 157), (233, 187, 112)], 165)).save(OUT / "mola.png", optimize=True)
    record = {"product_id": "MEGT44N000HB", "mission": "Mars Global Surveyor", "instrument": "MOLA",
              "url": url + ".img", "label_url": url + ".xml", "source_resolution_pixels_per_degree": 128,
              "source_nominal_resolution_m": 463.0576672, "bbox": list(bounds), "shape": list(raw.shape),
              "retrieved_byte_range": [offset, end], "stored_strip": strip_file.name,
              "sha256": hashlib.file_digest(strip_file.open("rb"), "sha256").hexdigest(),
              "role": "independent mission product displayed as coarse regional elevation context; not used for fine slope constraints",
              "limitations": "MEGDR bins can be interpolated between laser tracks; source ~463 m. Not a 100 m measurement or independent validation of MOLA-controlled CTX DEM."}
    (OUT / "mola_manifest.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    return record


def prepare():
    OUT.mkdir(parents=True, exist_ok=True)
    files = [download(product + extension) for product in [DEM, ORTHO]
             for extension in [".tif", ".xml"]]
    geographic = CRS.from_string("+proj=longlat +R=3396190 +no_defs")
    mercator = CRS.from_string("+proj=merc +R=3396190 +lon_0=0 +units=m +no_defs")
    # Display assets use Mars Mercator; its angular geometry matches Leaflet's
    # Earth Web Mercator without mislabeling a Mars raster as EPSG:4326/3857.
    west, south, east, north = BBOX["lon0"], BBOX["lat0"], BBOX["lon1"], BBOX["lat1"]
    merc_bounds = transform_bounds(geographic, mercator, west, south, east, north)
    display_shape = (960, 1580)
    display_transform = from_bounds(*merc_bounds, display_shape[1], display_shape[0])

    with rasterio.open(RAW / (DEM + ".tif")) as source:
        elevation = source.read(1).astype(np.float64)
        valid = (source.read_masks(1) > 0) & np.isfinite(elevation) & (elevation > -10000) & (elevation < 10000)
        y = source.transform.f + (np.arange(source.height) + .5) * source.transform.e
        latitude = y / 3396190 * 180 / math.pi
        slope, relief, usable = native_derivatives(elevation, valid, *source.res, latitude)
        # The routing grid remains eqc with the source's Mars datum. Corrected
        # ground spacing is approximately 100 m, with exact cell bounds recorded.
        bounds = transform_bounds(geographic, source.crs, west, south, east, north)
        rows = math.ceil((bounds[3] - bounds[1]) / 100)
        cols = math.ceil((bounds[2] - bounds[0]) * math.cos(math.radians(18.45)) / 100)
        grid_transform = from_bounds(*bounds, cols, rows)
        grid_shape = (rows, cols)
        mean_z = warp_array(np.where(usable, elevation, np.nan), source.transform, source.crs,
                            grid_shape, grid_transform, source.crs)
        mean_slope = warp_array(np.where(usable, slope, np.nan), source.transform, source.crs,
                                grid_shape, grid_transform, source.crs)
        max_slope = warp_array(np.where(usable, slope, np.nan), source.transform, source.crs,
                               grid_shape, grid_transform, source.crs, Resampling.max)
        mean_relief = warp_array(np.where(usable, relief, np.nan), source.transform, source.crs,
                                 grid_shape, grid_transform, source.crs)
        coverage = warp_array(usable.astype(float), source.transform, source.crs,
                              grid_shape, grid_transform, source.crs)
        # Cells must be entirely observed; invalid native neighbors also exclude
        # derivative edges rather than manufacturing gradients across NoData.
        unknown_native = maximum_filter((~usable).astype(np.uint8), size=3)
        unknown = warp_array(unknown_native.astype(float), source.transform, source.crs,
                             grid_shape, grid_transform, source.crs, Resampling.max)
        known = (coverage >= .999) & (unknown == 0) & np.isfinite(max_slope)
        # Apply policy at the precision exported to the browser so a value
        # rounded to 20.00 degrees cannot remain traversable.
        blocked = ~known | (np.round(max_slope, 2) >= SLOPE_LIMIT)
        write_tiff("elevation_100m.tif", mean_z, grid_transform, source.crs)
        write_tiff("slope_mean_100m.tif", mean_slope, grid_transform, source.crs)
        write_tiff("slope_max_100m.tif", max_slope, grid_transform, source.crs)
        write_tiff("relief_100m.tif", mean_relief, grid_transform, source.crs)
        dz = warp_array(np.where(usable, elevation, np.nan), source.transform, source.crs,
                        display_shape, display_transform, mercator)
        ds = warp_array(np.where(usable, slope, np.nan), source.transform, source.crs,
                        display_shape, display_transform, mercator)
        db = warp_array(np.where(blocked, 1, 0), grid_transform, source.crs,
                        display_shape, display_transform, mercator, Resampling.nearest)
        footprint = {"type": "Feature", "properties": {"product_id": DEM,
                      "instrument": "MRO CTX", "resolution_m": 20},
                     "geometry": {"type": "Polygon", "coordinates": [[
                       [west, south], [east, south], [east, north], [west, north], [west, south]]]}}
        source_crs = source.crs.to_wkt()

    with rasterio.open(RAW / (ORTHO + ".tif")) as source:
        raw = source.read(1).astype(np.float32)
        good = source.read_masks(1) > 0
        image = warp_array(np.where(good, raw, np.nan), source.transform, source.crs,
                           display_shape, display_transform, mercator, Resampling.bilinear)
        lo, hi = np.nanpercentile(image, [2, 98])
        image_valid = np.isfinite(image)
        grey = np.clip(np.nan_to_num((image-lo)/(hi-lo)), 0, 1)
        rgba = np.stack([(grey*255).astype(np.uint8)]*3 + [np.where(image_valid, 255, 0).astype(np.uint8)], axis=-1)
        Image.fromarray(rgba).save(OUT / "ctx_imagery.png", optimize=True)

    Image.fromarray(image_rgba(dz, np.isfinite(dz), *np.nanpercentile(dz, [2, 98]),
                              [(52, 80, 103), (103, 162, 158), (230, 189, 111)])).save(OUT / "elevation.png", optimize=True)
    Image.fromarray(image_rgba(ds, np.isfinite(ds), 0, 25,
                              [(74, 118, 91), (225, 186, 101), (219, 83, 72)])).save(OUT / "slope.png", optimize=True)
    hazards = np.zeros((*display_shape, 4), dtype=np.uint8)
    hazards[..., :3] = [219, 90, 76]
    hazards[..., 3] = np.where(db >= .5, 175, 0)
    Image.fromarray(hazards).save(OUT / "constraints.png", optimize=True)
    mola = prepare_mola(display_shape, display_transform, mercator)

    manifest = {
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "source_archive": BASE + "index.html", "doi": "10.5066/P906QQT8",
        "mola_context": mola,
        "products": [], "bbox": BBOX, "source_dem_resolution_m": 20,
        "source_image_resolution_m": 6, "source_crs_wkt": source_crs,
        "coordinate_type": "Mars planetocentric latitude, east-positive longitude",
        "display_projection": "Mars spherical Mercator, radius 3396190 m",
        "method": {"slope": "atan(hypot(dz/dx_ground,dz/dy)) from native 20 m DEM; east-west cos(latitude) correction",
                   "relief": "absolute elevation residual after Gaussian smoothing sigma=2 native pixels (~40 m)",
                   "grid": "~100 m cells; mean slope for cost, maximum native slope for exclusion",
                   "nodata": "missing elevation/derivative samples and incomplete cells excluded",
                   "slope_exclusion_deg": SLOPE_LIMIT,
                   "policy": "20-degree exclusion and cost weights are configurable prototype policies, not NASA EVA requirements"},
        "stats": {"rows": rows, "cols": cols, "known_cells": int(known.sum()),
                  "unknown_cells": int((~known).sum()), "steep_cells": int((known & blocked).sum()),
                  "traversable_cells": int((~blocked).sum()),
                  "elevation_range_m": [float(np.nanmin(mean_z)), float(np.nanmax(mean_z))],
                  "mean_slope_percentiles_deg": [float(v) for v in np.nanpercentile(mean_slope[known], [50, 90, 99])]},
        "limitations": ["20 m source resolution cannot identify individual rocks or narrow obstacles",
                        "100 m aggregation hides small-scale terrain; slope is scale-dependent",
                        "Terrain model is CTX stereo topography registered to MOLA, not a material classifier",
                        "No validated EVA limits, weather, hardware telemetry, or mineral raster integration"]}
    for file in files:
        metadata = {}
        if file.suffix == ".xml":
            node = ET.parse(file).getroot()
            metadata = {"title": node.findtext(".//citeinfo/title"), "published": node.findtext(".//citeinfo/pubdate")}
        manifest["products"].append({"file": file.name, "url": BASE + file.name,
                                     "bytes": file.stat().st_size, "sha256": hashlib.file_digest(file.open("rb"), "sha256").hexdigest(), **metadata})
    grid = {"schema_version": 1, "bbox": BBOX, "rows": rows, "cols": cols,
            "row_order": "north_to_south", "cell_ground_size_m": 100,
            "elevation_m": as_list(mean_z), "slope_mean_deg": as_list(mean_slope),
            "slope_max_deg": as_list(max_slope), "relief_m": as_list(mean_relief),
            "known": known.astype(int).tolist(), "blocked": blocked.astype(int).tolist(),
            "slope_limit_deg": SLOPE_LIMIT, "source_product": DEM, "manifest": "manifest.json"}
    # Observational candidates, not confirmed minerals or previously published
    # outcrops. Every location is an actual DEM cell; selection is documented.
    candidates = []
    options = np.argwhere(known & ~blocked & (mean_slope >= 5) & (mean_slope <= 12))
    options = sorted(options, key=lambda rc: -mean_relief[tuple(rc)])
    for row, col in options:
        lat = north - (row + .5) / rows * (north-south)
        lon = west + (col + .5) / cols * (east-west)
        if not (18.425 <= lat <= 18.50 and 77.39 <= lon <= 77.47):
            continue
        if any(math.hypot((lat-f["geometry"]["coordinates"][1])*59274,
                          (lon-f["geometry"]["coordinates"][0])*56220) < 500 for f in candidates):
            continue
        candidates.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]},
                           "properties": {"name": f"Terrain inspection {len(candidates)+1:02d}",
                            "classification": "DEM-derived investigation candidate; geological interpretation unconfirmed",
                            "source_product": DEM, "row": int(row), "col": int(col),
                            "mean_slope_deg": round(float(mean_slope[row, col]), 2),
                            "max_slope_deg": round(float(max_slope[row, col]), 2),
                            "elevation_m": round(float(mean_z[row, col]), 2),
                            "relief_m": round(float(mean_relief[row, col]), 2)}})
        if len(candidates) == 12:
            break
    candidate_data = {"type": "FeatureCollection", "features": candidates,
                      "selection": "Known, unblocked cells with mean slope 5–12 degrees, within 18.425–18.50 N / 77.39–77.47 E; rank by Gaussian elevation residual; minimum 500 m spacing; at most 12",
                      "interpretation": "Candidate places to inspect terrain transitions, not validated outcrops, mineral detections, or reachable science detours."}
    (OUT / "science_candidates.geojson").write_text(json.dumps(candidate_data, indent=2), encoding="utf-8")
    manifest["science_candidate_selection"] = candidate_data["selection"]
    (OUT / "terrain_grid.json").write_text(json.dumps(grid, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, allow_nan=False), encoding="utf-8")
    (OUT / "coverage.geojson").write_text(json.dumps({"type": "FeatureCollection", "features": [footprint]}), encoding="utf-8")
    print(json.dumps(manifest["stats"], indent=2))
    print("Prepared real Jezero imagery, slope, constraints, terrain grid, and provenance.")


if __name__ == "__main__":
    prepare()
