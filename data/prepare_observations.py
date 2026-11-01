"""Cache official observation evidence and georeferenced browse imagery.

Run after prepare_nasa.py. This is a curated snapshot, not an exhaustive/latest
NASA search. Publication, product creation, acquisition and retrieval differ.
"""
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import re
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image
import requests
import rasterio
from rasterio.crs import CRS
from rasterio.transform import from_bounds
from rasterio.windows import from_bounds as window_from_bounds
from affine import Affine
from rasterio.warp import transform_bounds, Resampling

from prepare_nasa import BBOX, RAW, OUT, ORTHO, warp_array

EVIDENCE = OUT / 'observations'
IDS = ['ESP_094047_1985', 'ESP_093981_1985', 'ESP_073068_1985', 'ESP_073912_1985']
Image.MAX_IMAGE_PIXELS = 300_000_000  # Known official NASA panorama exceeds PIL's default.


def cached(url, name):
    dest = RAW / name
    if not dest.exists():
        part = dest.with_suffix(dest.suffix + '.part')
        received=0
        with requests.get(url, stream=True, timeout=(25,180)) as response:
            response.raise_for_status()
            expected = response.headers.get('Content-Length')
            with part.open('wb') as stream:
                for chunk in response.iter_content(1024*1024):
                    stream.write(chunk);received+=len(chunk)
            if expected and int(expected) != received:
                raise RuntimeError('Incomplete download: ' + name)
        part.replace(dest)
    with dest.open('rb') as stream:
        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
    return dest, {'url': url, 'file': name, 'bytes': dest.stat().st_size, 'sha256': digest,
                  'cached_utc':datetime.fromtimestamp(dest.stat().st_mtime,timezone.utc).isoformat()}


def field(text, key):
    match = re.search(r'^\s*' + re.escape(key) + r'\s*=\s*([^\r\n]+)', text, re.M)
    if not match:
        raise ValueError('Missing PDS field ' + key)
    return match[1].split(' <')[0].strip('" ')


def detailed_corridor(record, label, geographic, mercator):
    """Render a ~1 m corridor from the actual 0.5 m JP2, not a browse upscale."""
    source,source_record=cached(record['full_resolution_url'],record['id']+'_RED.JP2')
    bbox={'lat0':18.427,'lat1':18.50,'lon0':77.40,'lon1':77.475}
    bounds=transform_bounds(geographic,mercator,bbox['lon0'],bbox['lat0'],bbox['lon1'],bbox['lat1'])
    shape=(math.ceil(bounds[3]-bounds[1]),math.ceil(bounds[2]-bounds[0]))
    transform=from_bounds(*bounds,shape[1],shape[0])
    # Latitude and longitude are linear in this north-up equirectangular image.
    # Use the PDS rectangular extrema rather than an Earth CRS assumption.
    west=float(field(label,'WESTERNMOST_LONGITUDE'));east=float(field(label,'EASTERNMOST_LONGITUDE'))
    south=float(field(label,'MINIMUM_LATITUDE'));north=float(field(label,'MAXIMUM_LATITUDE'))
    with rasterio.open(source) as raster:
        if raster.height!=int(field(label,'LINE_LAST_PIXEL')) or raster.width!=int(field(label,'SAMPLE_LAST_PIXEL')):
            raise ValueError('JP2 dimensions do not match the official PDS label')
        angular_transform=from_bounds(west,south,east,north,raster.width,raster.height)
        window=window_from_bounds(bbox['lon0'],bbox['lat0'],bbox['lon1'],bbox['lat1'],angular_transform).round_offsets().round_lengths()
        source_shape=(math.ceil(window.height/2),math.ceil(window.width/2))
        z=raster.read(1,window=window,out_shape=source_shape,resampling=Resampling.average).astype('float32')
        mask=raster.read_masks(1,window=window,out_shape=source_shape,resampling=Resampling.nearest)>0
        source_transform=rasterio.windows.transform(window,angular_transform)*Affine.scale(window.width/source_shape[1],window.height/source_shape[0])
        z=np.where(mask&(z>0),z,np.nan)
        values=warp_array(z,source_transform,geographic,shape,transform,mercator,Resampling.bilinear)
        lo,hi=np.nanpercentile(values,[2,98])
        gray=np.clip(np.nan_to_num((values-lo)/(hi-lo))*255,0,255).astype('uint8')
        alpha=np.where(np.isfinite(values),255,0).astype('uint8')
        dest=EVIDENCE/(record['id']+'_detail.png')
        Image.fromarray(np.stack([gray,gray,gray,alpha],axis=-1)).save(dest)
    with dest.open('rb') as stream:digest=hashlib.file_digest(stream,'sha256').hexdigest()
    record['files'].append(source_record)
    record['detail']={'image':'data/processed/nasa/observations/'+dest.name,'bbox':bbox,
                      'preview_spacing_m':1,'shape':list(shape),'sha256':digest,
                      'processing':'Actual 0.5 m PDS JP2 read at ~1 m sampling, reprojected to 1 m Mars Mercator pixels; grayscale 2–98 percentile stretch. Invalid/zero padding is transparent. No synthetic detail.'}
    print('Full-resolution corridor prepared',shape,flush=True)


def prepare():
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    geographic = CRS.from_string('+proj=longlat +R=3396190 +no_defs')
    mercator = CRS.from_string('+proj=merc +R=3396190 +lon_0=0 +units=m +no_defs')
    bounds = transform_bounds(geographic, mercator, BBOX['lon0'], BBOX['lat0'], BBOX['lon1'], BBOX['lat1'])
    shape = (math.ceil((bounds[3]-bounds[1])/6), math.ceil((bounds[2]-bounds[0])/6))
    transform = from_bounds(*bounds, shape[1], shape[0])
    with rasterio.open(RAW / (ORTHO + '.tif')) as source:
        z = source.read(1).astype(float)
        valid = (source.read_masks(1) > 0) & np.isfinite(z)
        values = warp_array(np.where(valid, z, np.nan), source.transform, source.crs, shape, transform, mercator, Resampling.bilinear)
        lo, hi = np.nanpercentile(values, [2, 98])
        gray = np.clip(np.nan_to_num((values-lo)/(hi-lo))*255, 0, 255).astype('uint8')
        rgba = np.stack([gray,gray,gray,np.where(np.isfinite(values),255,0).astype('uint8')], axis=-1)
        Image.fromarray(rgba).save(EVIDENCE/'ctx_detail.png')
    xml = ET.parse(RAW/(ORTHO+'.xml')).getroot()
    publication = xml.findtext('.//citeinfo/pubdate')
    doi = xml.findtext('.//citeinfo/onlink')
    ctx = {'id': ORTHO, 'mission':'Mars Reconnaissance Orbiter', 'instrument':'CTX',
           'image':'data/processed/nasa/observations/ctx_detail.png', 'bbox':BBOX,
           'source_resolution_m':6, 'preview_spacing_m':6, 'shape':list(shape),
           'captured_start':None, 'captured_end':None,
           'capture_note':'Individual acquisition dates are not supplied by this mosaic label. The 2006–2020 range describes the input mission dataset, not this pixel.',
           'published':datetime.strptime(publication,'%Y%m%d').date().isoformat(),
           'source_url':doi, 'label_url':'data/raw/nasa/'+ORTHO+'.xml',
           'processing':'Bilinear reprojection to Mars Mercator; grayscale 2–98 percentile contrast stretch. No invented image detail.'}
    orbital=[]
    for id in IDS:
        page_url='https://www.uahirise.org/'+id
        page, page_record=cached(page_url,id+'.html')
        text=page.read_text(encoding='utf-8')
        urls=re.findall(r"https[^\"'\s<>]+",text)
        label_url=next(u for u in urls if u.endswith(id+'_RED.LBL'))
        browse_url=next(u for u in urls if u.endswith(id+'_RED.browse.jpg'))
        label,label_record=cached(label_url,id+'_RED.LBL')
        browse,browse_record=cached(browse_url,id+'_RED.browse.jpg')
        label_text=label.read_text()
        polygon_text=re.search(r'map\.drawPolygon\(\[([^]]+)\]',text).group(1)
        numbers=[float(n.strip()) for n in polygon_text.split(',')]
        ring=[numbers[i:i+2] for i in range(0,len(numbers),2)];ring.append(ring[0])
        west=float(field(label_text,'WESTERNMOST_LONGITUDE'));east=float(field(label_text,'EASTERNMOST_LONGITUDE'))
        south=float(field(label_text,'MINIMUM_LATITUDE'));north=float(field(label_text,'MAXIMUM_LATITUDE'))
        image=np.array(Image.open(browse).convert('L'),dtype=float)
        expected_ratio=float(field(label_text,'LINE_LAST_PIXEL'))/float(field(label_text,'SAMPLE_LAST_PIXEL'))
        if abs(image.shape[0]/image.shape[1]-expected_ratio)>.01:
            raise ValueError('Browse geometry differs from the map-projected PDS product: '+id)
        # The official RED map-projected browse is a downsampled equirectangular
        # image. Its PDS extrema provide its rectangular extent, including padding.
        source_transform=from_bounds(west,south,east,north,image.shape[1],image.shape[0])
        values=warp_array(image,source_transform,geographic,shape,transform,mercator,Resampling.bilinear)
        gray=np.clip(np.nan_to_num(values),0,255).astype('uint8')
        alpha=np.where(np.isfinite(values)&(values>0),255,0).astype('uint8')
        Image.fromarray(np.stack([gray,gray,gray,alpha],axis=-1)).save(EVIDENCE/(id+'.png'))
        capture=field(label_text,'START_TIME')+'Z'
        product_created=field(label_text,'PRODUCT_CREATION_TIME')+'Z'
        orbital.append({'id':id, 'mission':'Mars Reconnaissance Orbiter', 'instrument':'HiRISE',
                        'title':field(label_text,'RATIONALE_DESC'), 'captured_start':capture,
                        'captured_end':field(label_text,'STOP_TIME')+'Z', 'product_created':product_created,
                        'published':None, 'publication_note':'Public-release timestamp is not supplied by this product label.',
                        'source_resolution_m':float(field(label_text,'MAP_SCALE')),
                        'browse_ground_spacing_m':(east-west)*math.pi/180*3396190*math.cos(math.radians((south+north)/2))/image.shape[1],
                        'preview_spacing_m':6,'browse_shape':list(image.shape),'bbox':BBOX,
                        'image':'data/processed/nasa/observations/'+id+'.png',
                        'footprint':{'type':'Polygon','coordinates':[ring]},
                        'source_url':page_url,'label_url':label_url,'original_image_url':browse_url,
                        'full_resolution_url':label_url.replace('.LBL','.JP2'),
                        'credit':'NASA/JPL-Caltech/UArizona',
                        'processing':'Official downsampled RED browse, georeferenced from PDS rectangular extrema and reprojected to a 6 m Mars Mercator preview; black padding transparent. The catalog polygon is rounded. Coverage does not prove visible detail at every pixel.',
                        'files':[page_record,label_record,browse_record]})
        print(id,capture,'browse shape',image.shape,flush=True)
    detailed_corridor(orbital[0],(RAW/(IDS[0]+'_RED.LBL')).read_text(),geographic,mercator)
    surface=[]
    for id,url,title,captures,published,association,coordinate in [
        ('PIA24264','https://www.jpl.nasa.gov/images/pia24264-mastcam-zs-first-360-degree-panorama/',
         'First view from the landing site',['2021-02-21'],'2021-02-24','landing_site',[18.44463,77.45088]),
        ('PIA24921','https://www.jpl.nasa.gov/images/pia24921-detailed-panorama-of-mars-jezero-crater-delta/',
         'Jezero delta panorama',['2022-06-12','2022-06-13','2022-06-16','2022-06-17','2022-06-20'],
         '2022-09-14','regional_context',None)]:
        source,record=cached('https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpeg'+id+'.jpg',id+'.jpg')
        image=Image.open(source); original=list(image.size)
        image.thumbnail((10000,3000));image.save(EVIDENCE/(id+'.jpg'),quality=91)
        surface.append({'id':id,'mission':'Mars 2020 Perseverance','instrument':'Mastcam-Z','title':title,
                        'capture_dates':captures,'published':published,'association':association,'coordinate':coordinate,
                        'coordinate_note':'Landing-site association, not a surveyed camera position.' if coordinate else 'NASA identifies the delta region; camera coordinates are not supplied here. Not attached to an exact checkpoint.',
                        'source_url':url,'image':'data/processed/nasa/observations/'+id+'.jpg',
                        'original_image_url':record['url'],'original_dimensions':original,'preview_dimensions':list(image.size),
                        'color_processing':'Enhanced color' if id=='PIA24921' else 'Published color mosaic',
                        'credit':'NASA/JPL-Caltech/ASU/MSSS','files':[record]})
    output={'schema_version':1,'snapshot_utc':datetime.now(timezone.utc).isoformat(),
            'scope':'Four curated HiRISE products and two published Perseverance panoramas. Not an exhaustive archive search; no claim of the latest NASA release.',
            'coordinate_system':'Mars planetocentric latitude, east-positive longitude',
            'ctx':ctx,'orbital':orbital,'surface':surface}
    for record in [ctx,*orbital,*surface]:
        image=Path(__file__).resolve().parents[1]/record['image']
        with image.open('rb') as stream:record['preview_sha256']=hashlib.file_digest(stream,'sha256').hexdigest()
    (OUT/'observations.json').write_text(json.dumps(output,indent=2),encoding='utf-8')
    print('Observation snapshot saved',flush=True)


if __name__=='__main__':prepare()
