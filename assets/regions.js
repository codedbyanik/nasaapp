/* Real global MOLA MEGDR, lossless native 16 ppd tiles. */
window.MarsRegions={async load(lat,lon,extent){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>80)throw Error('Choose a center between 80 degrees S and 80 degrees N; polar planning needs a different projection.');
 lon=((lon+180)%360+360)%360-180;
 const get=async u=>{const r=await fetch(u);if(!r.ok)throw Error('Global MOLA data unavailable.');return r;};
 const meta=await (await get('data/processed/global/manifest.json')).json(),ppd=meta.pixels_per_degree;
 const r0=Math.max(80,Math.floor((90-lat-extent/2)*ppd)),r1=Math.min(2800,Math.ceil((90-lat+extent/2)*ppd));
 const c0=Math.floor((lon-extent/2)*ppd),c1=Math.ceil((lon+extent/2)*ppd),rows=r1-r0,cols=c1-c0,tiles=new Map();
 const wrap=c=>((c%5760)+5760)%5760;
 for(let r=r0;r<r1;r+=1)for(let c=c0;c<c1;c+=1){const key=Math.floor(r/160)+'_'+Math.floor(wrap(c)/160);if(!tiles.has(key))tiles.set(key,null);}
 await Promise.all([...tiles.keys()].map(async key=>{const bytes=await (await get('data/processed/global/tile_'+key+'.bin')).arrayBuffer();if(bytes.byteLength!==160*160*4)throw Error('Invalid MOLA tile length');tiles.set(key,new DataView(bytes));}));
 const grid={schema_version:1,rows,cols,bbox:{lat0:90-r1/ppd,lat1:90-r0/ppd,lon0:c0/ppd,lon1:c1/ppd},slope_limit_deg:20,source_product:meta.product,grid_resolution_m:meta.nominal_spacing_m,regional:true,minimum_route_km:meta.nominal_spacing_m/1000,relief_scale_m:300};
 for(const k of ['elevation_m','slope_mean_deg','slope_max_deg','relief_m','known','blocked','observation_count'])grid[k]=Array.from({length:rows},()=>Array(cols).fill(0));
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const rr=r+r0,cc=wrap(c+c0),v=tiles.get(Math.floor(rr/160)+'_'+Math.floor(cc/160)),offset=((rr%160)*160+cc%160)*4;grid.elevation_m[r][c]=v.getInt16(offset,true);grid.observation_count[r][c]=v.getInt16(offset+2,true);}
 const z=(r,c)=>grid.elevation_m[Math.max(0,Math.min(rows-1,r))][Math.max(0,Math.min(cols-1,c))],dy=3396000*Math.PI/180/ppd;
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const dx=dy*Math.cos((grid.bbox.lat1-(r+.5)/ppd)*Math.PI/180),gx=(z(r,c+1)-z(r,c-1))/(c===0||c===cols-1?dx:2*dx),gy=(z(r+1,c)-z(r-1,c))/(r===0||r===rows-1?dy:2*dy),s=Math.atan(Math.hypot(gx,gy))*180/Math.PI;grid.slope_mean_deg[r][c]=s;grid.slope_max_deg[r][c]=s;grid.relief_m[r][c]=Math.abs(z(r,c)-(z(r-1,c)+z(r+1,c)+z(r,c-1)+z(r,c+1))/4);grid.known[r][c]=1;grid.blocked[r][c]=+(s>=20||r===0||c===0||r===rows-1||c===cols-1);}
 return {grid,meta};
},image(grid){const canvas=document.createElement('canvas');canvas.width=grid.cols;canvas.height=grid.rows;const ctx=canvas.getContext('2d'),lo=Math.min(...grid.elevation_m.map(row=>Math.min(...row))),hi=Math.max(...grid.elevation_m.map(row=>Math.max(...row))),im=ctx.createImageData(grid.cols,grid.rows);for(let r=0;r<grid.rows;r++)for(let c=0;c<grid.cols;c++){const merc=lat=>Math.log(Math.tan(Math.PI/4+lat*Math.PI/360)),a=merc(grid.bbox.lat1),b=merc(grid.bbox.lat0),lat=(2*Math.atan(Math.exp(a-(r+.5)/grid.rows*(a-b)))-Math.PI/2)*180/Math.PI,rr=Math.max(0,Math.min(grid.rows-1,Math.floor((grid.bbox.lat1-lat)/(grid.bbox.lat1-grid.bbox.lat0)*grid.rows)));const i=(r*grid.cols+c)*4,t=Math.max(0,Math.min(1,(grid.elevation_m[rr][c]-lo)/Math.max(1,hi-lo)));im.data[i]=50+t*190;im.data[i+1]=95+t*80;im.data[i+2]=140-t*95;im.data[i+3]=255;}ctx.putImageData(im,0,0);return canvas.toDataURL();}};
