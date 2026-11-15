"""Cache authentic global MOLA 16 ppd products and losslessly tile them."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,requests,numpy as np
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw/mola_global'; OUT=ROOT/'data/processed/global'
BASE='https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg016/'
RAW.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
def obtain(name):
 p=RAW/name
 size=33177600 if name.endswith('.img') else None
 if p.exists() and (size is None or p.stat().st_size==size):return p
 r=requests.get(BASE+name,timeout=180);r.raise_for_status()
 if size and len(r.content)!=size:raise ValueError('Unexpected product size')
 p.write_bytes(r.content); print('Downloaded',name,flush=True);return p
names=[k+suffix for k in ['megt90n000eb','megc90n000eb'] for suffix in ['.img','.lbl','.xml']]
with ThreadPoolExecutor(max_workers=6) as pool:files=list(pool.map(obtain,names))
z=np.fromfile(RAW/'megt90n000eb.img',dtype='>i2').reshape(2880,5760)
c=np.fromfile(RAW/'megc90n000eb.img',dtype='>i2').reshape(2880,5760)
if z.min() < -10000 or z.max()>25000 or c.min()<0:raise ValueError('Unexpected scientific range')
for row in range(18):
 for col in range(36):
  a=np.stack([z[row*160:(row+1)*160,col*160:(col+1)*160],c[row*160:(row+1)*160,col*160:(col+1)*160]],axis=-1).astype('<i2')
  (OUT/f'tile_{row}_{col}.bin').write_bytes(a.tobytes())
meta={'schema_version':1,'product':'MEGT90N000EB','counts_product':'MEGC90N000EB','pixels_per_degree':16,'nominal_spacing_m':3705,'tile_degrees':10,'tile_size':160,'tile_format':'little-endian signed int16 elevation_m, observation_count interleaved; north-to-south, east-positive 0..360','acquired_start':'1997-09-15','acquired_end':'2001-06-30','product_created':'2003-04-03','release':'2003-05-07','source_url':'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html','products':[{'file':p.name,'url':BASE+p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files],'limitations':'Kilometer-scale gridded topography. Zero-count bins are interpolated, not direct laser observations. No local rock, sand, imagery, or EVA safety determination.'}
(OUT/'manifest.json').write_text(json.dumps(meta,indent=2)); print('Global MOLA tiles ready',z.min(),z.max(),flush=True)
