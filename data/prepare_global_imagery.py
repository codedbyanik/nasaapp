"""Cache CTX context tiles for demo regions; preserve source attribution and hashes."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests,json,hashlib,math,io
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'data/processed/imagery';TILES=OUT/'ctx_tiles';TILES.mkdir(parents=True,exist_ok=True)
SERVICE='https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX1/MapServer'
r=requests.get(SERVICE,params={'f':'json'},timeout=30);r.raise_for_status();service=r.json()
assert service['spatialReference']['wkid']==104971 and service['tileInfo']['rows']==512 and service['tileInfo']['origin']=={'x':-180,'y':90}
def bbox(lat,lon):
 lon=(lon+180)%360-180
 return {'lat0':90-math.ceil((90-lat+3)*16)/16,'lat1':90-math.floor((90-lat-3)*16)/16,'lon0':math.floor((lon-3)*16)/16,'lon1':math.ceil((lon+3)*16)/16}
keys=set();presets={}
for name,lat,lon in [('gale',-5.4,137.8),('olympus',18.65,226.2)]:
 b=bbox(lat,lon);presets[name]=b;level=math.ceil(math.log2(.3515625/((b['lon1']-b['lon0'])/1024)));span=180/2**level
 for row in range(math.floor((90-b['lat1'])/span),math.ceil((90-b['lat0'])/span)):
  for col in range(math.floor((b['lon0']+180)/span),math.ceil((b['lon1']+180)/span)):keys.add((level,row,col%(2**(level+1))))
def obtain(key):
 level,row,col=key;name=f'{level}_{row}_{col}.png';path=TILES/name;url=f'{SERVICE}/tile/{level}/{row}/{col}'
 raw=ROOT/'data/raw/global_ctx_tiles'/('_'.join(map(str,key))+'.tile');raw.parent.mkdir(parents=True,exist_ok=True)
 if raw.exists():content=raw.read_bytes()
 elif path.exists():content=path.read_bytes();raw.write_bytes(content)
 else:
  response=requests.get(url,timeout=40);response.raise_for_status();assert response.headers.get('Content-Type','').startswith('image/');content=response.content;raw.write_bytes(content)
 image=Image.open(io.BytesIO(content));assert image.size==(512,512)
 if image.format=='PNG':prepared=content
 else:
  buffer=io.BytesIO();image.save(buffer,format='PNG');prepared=buffer.getvalue()
 path.write_bytes(prepared)
 return '_'.join(map(str,key)),{'file':'ctx_tiles/'+name,'url':url,'sha256':hashlib.sha256(prepared).hexdigest(),'source_sha256':hashlib.sha256(content).hexdigest(),'source_format':image.format,'processing':'Source PNG retained or decoded service image losslessly encoded to PNG.'}

with ThreadPoolExecutor(max_workers=6) as pool:tiles=dict(pool.map(obtain,sorted(keys)))
meta={'schema_version':1,'product':'Murray Lab Global CTX Mosaic V01','source_resolution_m':5,'release_year':2023,'capture_note':'Multi-orbit mosaic; no single capture date. Per-point acquisition metadata are not ingested.','service_url':SERVICE,'spatial_reference':104971,'projection':'geographic Mars 2000 sphere, east-positive -180..180','tile_pixels':512,'origin_lon':-180,'origin_lat':90,'level0_resolution_deg':.3515625,'credit':'NASA/JPL/MSSS/Caltech Murray Lab; streamed service by Esri','source_url':'https://murray-lab.caltech.edu/CTX/V01/TilePages/','publication_doi':'https://doi.org/10.1029/2024EA003555','archive_doi':'https://doi.org/10.17189/m23v-ae12','license_note':'Caltech Murray Lab grants free use of V01 for all purposes with NASA/JPL/MSSS/The Murray Lab credit. The hosted service also has Esri terms.','service_terms_url':'https://www.arcgis.com/home/item.html?id=30c4acfe36284b1784bf07d5d73f9e4d','presets':presets,'tiles':tiles}
(OUT/'global_ctx_manifest.json').write_text(json.dumps(meta,indent=2));print('Cached',len(tiles),'real CTX tiles for Gale and Olympus',flush=True)
