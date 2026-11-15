from pathlib import Path
import unittest,json,hashlib,numpy as np
ROOT=Path(__file__).resolve().parents[2]
class GlobalDataTests(unittest.TestCase):
 def test_product_hashes(self):
  meta=json.loads((ROOT/'data/processed/global/manifest.json').read_text())
  for p in meta['products']:
   self.assertEqual(hashlib.sha256((ROOT/'data/raw/mola_global'/p['file']).read_bytes()).hexdigest(),p['sha256'])
 def test_lossless_tiles_across_hemispheres(self):
  raw=ROOT/'data/raw/mola_global'; out=ROOT/'data/processed/global'
  z=np.memmap(raw/'megt90n000eb.img',dtype='>i2',mode='r',shape=(2880,5760));c=np.memmap(raw/'megc90n000eb.img',dtype='>i2',mode='r',shape=(2880,5760))
  for r,col in [(0,0),(8,7),(9,35),(17,18),(8,18)]:
   tile=np.fromfile(out/f'tile_{r}_{col}.bin',dtype='<i2').reshape(160,160,2)
   np.testing.assert_array_equal(tile[:,:,0],z[r*160:(r+1)*160,col*160:(col+1)*160]);np.testing.assert_array_equal(tile[:,:,1],c[r*160:(r+1)*160,col*160:(col+1)*160])
if __name__=='__main__':unittest.main()
