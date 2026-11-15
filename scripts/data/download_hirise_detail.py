"""Download the large official JP2 with validated, resumable range requests."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
import shutil
import requests

RAW=Path(__file__).resolve().parents[2]/'data/raw/nasa'
NAME='ESP_094047_1985_RED.JP2'
URL='https://hirise-pds.lpl.arizona.edu/PDS/RDR/ESP/ORB_094000_094099/ESP_094047_1985/'+NAME


def download():
    target=RAW/NAME
    head=requests.head(URL,timeout=30);head.raise_for_status()
    size=int(head.headers['Content-Length'])
    if target.exists():
        if target.stat().st_size!=size:raise RuntimeError('Existing JP2 is incomplete')
        return
    prefix=target.with_suffix('.JP2.part')
    offset=prefix.stat().st_size if prefix.exists() else 0
    if offset>size:raise RuntimeError('Partial JP2 is larger than the source')
    ranges=[(start,min(size-1,start+8*1024*1024-1)) for start in range(offset,size,8*1024*1024)]
    def get(bounds):
        start,end=bounds;part=RAW/(NAME+f'.range-{start}-{end}')
        if part.exists() and part.stat().st_size==end-start+1:return part
        for attempt in range(3):
            try:
                with requests.get(URL,headers={'Range':f'bytes={start}-{end}'},stream=True,timeout=(25,90)) as r:
                    r.raise_for_status()
                    if r.status_code!=206 or r.headers.get('Content-Range')!=f'bytes {start}-{end}/{size}':
                        raise RuntimeError('Unexpected range response')
                    with part.with_suffix(part.suffix+'.tmp').open('wb') as f:
                        for chunk in r.iter_content(1024*1024):f.write(chunk)
                temporary=part.with_suffix(part.suffix+'.tmp')
                if temporary.stat().st_size!=end-start+1:raise RuntimeError('Incomplete range')
                temporary.replace(part);return part
            except (requests.RequestException,RuntimeError):
                if attempt==2:raise
    print(f'Resuming {offset/1024/1024:.0f} / {size/1024/1024:.0f} MB with 6 validated range requests',flush=True)
    parts={};completed=offset
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures={pool.submit(get,b):b for b in ranges}
        for future in as_completed(futures):
            bounds=futures[future];parts[bounds]=future.result();completed+=bounds[1]-bounds[0]+1
            print(f'Cached {completed/1024/1024:.0f} / {size/1024/1024:.0f} MB',flush=True)
    assembly=target.with_suffix('.JP2.assembly')
    with assembly.open('wb') as f:
        if offset:
            with prefix.open('rb') as p:shutil.copyfileobj(p,f,1024*1024)
        for b in ranges:
            with parts[b].open('rb') as p:shutil.copyfileobj(p,f,1024*1024)
    if assembly.stat().st_size!=size:raise RuntimeError('Assembled file has the wrong size')
    assembly.replace(target)
    for p in parts.values():p.unlink()
    if prefix.exists():prefix.unlink()
    print('Official JP2 downloaded and validated',flush=True)


if __name__=='__main__':download()
