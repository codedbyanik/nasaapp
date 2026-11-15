/* NASA CTX imagery via the documented Caltech/Murray Lab geographic tile service. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MarsGlobalImagery=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const cache=new Map();let manifestPromise=null;
function plan(b,size=1024){
 if(!b||![b.lat0,b.lat1,b.lon0,b.lon1].every(Number.isFinite)||b.lat0>=b.lat1||b.lon0>=b.lon1||b.lon1-b.lon0>20||b.lat0< -85||b.lat1>85)throw Error('Imagery requires a loaded regional footprint within 85 degrees latitude.');
 const level=Math.max(0,Math.min(12,Math.ceil(Math.log2(.3515625/((b.lon1-b.lon0)/size))))),resolution=.3515625/2**level,span=resolution*512,columns=2**(level+1),tiles=[];
 for(let row=Math.floor((90-b.lat1)/span);row<Math.ceil((90-b.lat0)/span);row++)for(let col=Math.floor((b.lon0+180)/span);col<Math.ceil((b.lon1+180)/span);col++)tiles.push({level,row,col:((col%columns)+columns)%columns,west:-180+col*span,north:90-row*span,span});
 if(tiles.length>64)throw Error('Imagery footprint needs too many tiles. Choose a smaller region.');
 return {tiles,level,resolution,width:size,height:Math.max(1,Math.round(size*(b.lat1-b.lat0)/(b.lon1-b.lon0))),bbox:{...b}};
}
async function metadata(){if(!manifestPromise)manifestPromise=fetch('data/processed/imagery/global_ctx_manifest.json').then(r=>{if(!r.ok)throw Error('CTX source manifest unavailable.');return r.json();}).catch(error=>{manifestPromise=null;throw error;});return manifestPromise;}
async function load(grid,{signal}={}){
 const meta=await metadata();if(meta.schema_version!==1||meta.spatial_reference!==104971||meta.tile_pixels!==512||meta.level0_resolution_deg!==.3515625)throw Error('Unsupported CTX tile metadata.');
 const layout=plan(grid.bbox),canvas=document.createElement('canvas');canvas.width=layout.width;canvas.height=layout.height;const ctx=canvas.getContext('2d'),sources=[];let next=0;
 async function tile(t){
  if(signal?.aborted)throw new DOMException('Image request cancelled.','AbortError');
  const key=[t.level,t.row,t.col].join('_'),record=meta.tiles[key],url=record?'data/processed/imagery/'+record.file:meta.service_url+'/tile/'+t.level+'/'+t.row+'/'+t.col;
  let value=cache.get(url);
  if(!value){const r=await fetch(url,{signal});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error('CTX tile unavailable; coverage or network access may be missing.');const blob=await r.blob(),bytes=await blob.arrayBuffer();let hash=null;if(globalThis.crypto?.subtle)hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');if(record&&hash&&record.sha256!==hash)throw Error('Cached CTX tile checksum mismatch.');const image=await createImageBitmap(blob);if(image.width!==512||image.height!==512){image.close();throw Error('Unexpected CTX tile dimensions.');}value={image,hash};cache.set(url,value);if(cache.size>64)cache.delete(cache.keys().next().value);}
  const b=layout.bbox;ctx.drawImage(value.image,(t.west-b.lon0)/(b.lon1-b.lon0)*canvas.width,(b.lat1-t.north)/(b.lat1-b.lat0)*canvas.height,t.span/(b.lon1-b.lon0)*canvas.width,t.span/(b.lat1-b.lat0)*canvas.height);
  sources.push({level:t.level,row:t.row,col:t.col,url:record?.url||url,local_file:record?'data/processed/imagery/'+record.file:null,sha256:value.hash||record?.sha256||null,sha256_scope:record?'Prepared local PNG bytes':'Streamed service bytes',source_sha256:record?.source_sha256||value.hash||null,source_format:record?.source_format||null,processing:record?.processing||'Streamed service image decoded for canvas'});
 }
 await Promise.all(Array.from({length:Math.min(6,layout.tiles.length)},async()=>{while(next<layout.tiles.length)await tile(layout.tiles[next++]);}));
 if(signal?.aborted)throw new DOMException('Image request cancelled.','AbortError');
 return {canvas,evidence:{product:meta.product,source_url:meta.source_url,service_url:meta.service_url,credit:meta.credit,source_resolution_m:meta.source_resolution_m,preview_north_south_m_per_pixel:layout.resolution*Math.PI/180*3396190,display_north_south_m_per_pixel:(grid.bbox.lat1-grid.bbox.lat0)/canvas.height*Math.PI/180*3396190,capture_note:meta.capture_note,release_year:meta.release_year,bbox:{...grid.bbox},tiles:sources,loaded_at:new Date().toISOString(),terrain_resolution_m:grid.grid_resolution_m,role:'Visual context only; imagery does not change the MOLA elevation model or routing.'}};
}
return {plan,load};
});
