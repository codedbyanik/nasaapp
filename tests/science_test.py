"""Test geospatial numerics against known planes and verify source integrity."""
import hashlib
import importlib.util
import json
from pathlib import Path
import unittest
import numpy as np
import rasterio

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('prepare', ROOT / 'data/prepare_nasa.py')
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


class ScienceTests(unittest.TestCase):
    def test_flat_surface(self):
        z = np.full((30,30), -2500., dtype=float)
        slope, relief, usable = prepare.native_derivatives(z,np.ones_like(z,dtype=bool),20,20,np.zeros(30))
        self.assertTrue(usable.all())
        np.testing.assert_allclose(slope,0,atol=1e-9)
        np.testing.assert_allclose(relief,0,atol=1e-9)

    def test_analytic_plane_and_longitude_spacing(self):
        y,x = np.mgrid[:30,:30]
        z = .2*x*20 + .1*y*20
        valid = np.ones_like(z,dtype=bool)
        for latitude in [0,60]:
            slope,_,_ = prepare.native_derivatives(z,valid,20,20,np.full(30,latitude))
            expected = np.rad2deg(np.arctan(np.hypot(.2/np.cos(np.deg2rad(latitude)),.1)))
            np.testing.assert_allclose(slope,expected,atol=1e-9)

    def test_missing_data_cannot_make_a_flat_cell(self):
        z=np.zeros((20,20));valid=np.ones_like(z,dtype=bool);valid[10,10]=False
        slope,_,usable=prepare.native_derivatives(z,valid,20,20,np.zeros(20))
        self.assertFalse(usable[10,10]);self.assertFalse(usable[10,9])
        self.assertFalse(np.isfinite(slope[10,9]))

    def test_manifest_checksums_and_grid_policy(self):
        manifest=json.loads((ROOT/'data/processed/nasa/manifest.json').read_text())
        for product in manifest['products']:
            file=ROOT/'data/raw/nasa'/product['file']
            self.assertEqual(file.stat().st_size,product['bytes'])
            with file.open('rb') as stream:
                self.assertEqual(hashlib.file_digest(stream,'sha256').hexdigest(),product['sha256'])
        grid=json.loads((ROOT/'data/processed/nasa/terrain_grid.json').read_text())
        known=np.array(grid['known'],dtype=bool);blocked=np.array(grid['blocked'],dtype=bool)
        max_slope=np.array(grid['slope_max_deg'],dtype=float)
        self.assertTrue(blocked[~known].all())
        self.assertTrue((max_slope[~blocked]<20).all())
        self.assertEqual(int((~blocked).sum()),manifest['stats']['traversable_cells'])
        with rasterio.open(ROOT/'data/processed/nasa/elevation_100m.tif') as raster:
            self.assertEqual(raster.shape,(grid['rows'],grid['cols']))
            self.assertIn('3396190',raster.crs.to_wkt())

    def test_science_candidates_are_real_observed_cells(self):
        grid=json.loads((ROOT/'data/processed/nasa/terrain_grid.json').read_text())
        geo=json.loads((ROOT/'data/processed/nasa/science_candidates.geojson').read_text())
        self.assertGreater(len(geo['features']),0)
        for feature in geo['features']:
            p=feature['properties'];r,c=p['row'],p['col']
            self.assertEqual(grid['known'][r][c],1);self.assertEqual(grid['blocked'][r][c],0)
            self.assertAlmostEqual(p['mean_slope_deg'],grid['slope_mean_deg'][r][c],places=2)
            self.assertIn('unconfirmed',p['classification'])


if __name__ == '__main__':
    unittest.main()
