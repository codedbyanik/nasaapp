"""Verify cached evidence integrity and the downsampled image geometry."""
import hashlib
import json
from pathlib import Path
import unittest
from PIL import Image
import sys

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'data'))
import prepare_observations as prep


class ObservationTests(unittest.TestCase):
    def test_evidence_files_and_preview_hashes(self):
        catalog=json.loads((ROOT/'data/processed/nasa/observations.json').read_text())
        for o in [catalog['ctx'],*catalog['orbital'],*catalog['surface']]:
            with (ROOT/o['image']).open('rb') as stream:
                self.assertEqual(hashlib.file_digest(stream,'sha256').hexdigest(),o['preview_sha256'])
            for f in o.get('files',[]):
                source=ROOT/'data/raw/nasa'/f['file']
                self.assertEqual(source.stat().st_size,f['bytes'])
                with source.open('rb') as stream:
                    self.assertEqual(hashlib.file_digest(stream,'sha256').hexdigest(),f['sha256'])

    def test_pds_metadata_and_browse_geometry(self):
        catalog=json.loads((ROOT/'data/processed/nasa/observations.json').read_text())
        for o in catalog['orbital']:
            label=(ROOT/'data/raw/nasa'/(o['id']+'_RED.LBL')).read_text()
            self.assertEqual(prep.field(label,'START_TIME')+'Z',o['captured_start'])
            self.assertEqual(float(prep.field(label,'MAP_SCALE')),o['source_resolution_m'])
            h,w=o['browse_shape']
            expected=float(prep.field(label,'LINE_LAST_PIXEL'))/float(prep.field(label,'SAMPLE_LAST_PIXEL'))
            self.assertAlmostEqual(h/w,expected,delta=.01)
            self.assertGreater(o['browse_ground_spacing_m'],o['source_resolution_m'])
            with Image.open(ROOT/o['image']) as preview:
                self.assertEqual(preview.mode,'RGBA')
                self.assertEqual(list(reversed(preview.size)),catalog['ctx']['shape'])
            if 'detail' in o:
                detail=o['detail']
                with (ROOT/detail['image']).open('rb') as stream:
                    self.assertEqual(hashlib.file_digest(stream,'sha256').hexdigest(),detail['sha256'])
                self.assertLess(detail['preview_spacing_m'],o['preview_spacing_m'])
                with Image.open(ROOT/detail['image']) as image:
                    self.assertEqual(list(reversed(image.size)),detail['shape'])


if __name__=='__main__':unittest.main()
