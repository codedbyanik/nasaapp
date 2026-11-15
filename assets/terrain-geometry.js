/* Display geometry only: never changes terrain samples or route planning. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MarsTerrainGeometry=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function create(grid){
 const {rows,cols,bbox:b}=grid,R=3389.5,rad=Math.PI/180,lat=(b.lat0+b.lat1)/2,lon=(b.lon0+b.lon1)/2;
 const width=(b.lon1-b.lon0)*rad*R*Math.cos(lat*rad),depth=(b.lat1-b.lat0)*rad*R;
 const elevations=grid.elevation_m.flat().filter((z,i)=>grid.known[Math.floor(i/cols)][i%cols]&&Number.isFinite(z));
 if(!elevations.length)throw Error('No measured terrain available for 3D.');
 let low=Infinity,high=-Infinity;for(const z of elevations){low=Math.min(low,z);high=Math.max(high,z);}
 const xs=[b.lon0,...Array.from({length:cols},(_,c)=>b.lon0+(c+.5)/cols*(b.lon1-b.lon0)),b.lon1];
 const ys=[b.lat1,...Array.from({length:rows},(_,r)=>b.lat1-(r+.5)/rows*(b.lat1-b.lat0)),b.lat0];
 const sample=(r,c)=>{r=Math.max(0,Math.min(rows-1,r-1));c=Math.max(0,Math.min(cols-1,c-1));return {z:grid.elevation_m[r][c],known:!!grid.known[r][c],blocked:!!grid.blocked[r][c]};};
 function locate(t,n){const f=Math.max(0,Math.min(1,t))*n-.5;if(f<0)return {i:0,t:(f+.5)*2};if(f>=n-1)return {i:n,t:(f-n+1)*2};return {i:Math.floor(f)+1,t:f-Math.floor(f)};}
 function cell(p){const x=locate((p[1]-b.lon0)/(b.lon1-b.lon0),cols),y=locate((b.lat1-p[0])/(b.lat1-b.lat0),rows);return {r:y.i,c:x.i,tx:x.t,ty:y.t};}
 function height(p){
  if(p[0]<b.lat0||p[0]>b.lat1||p[1]<b.lon0||p[1]>b.lon1)return null;
  const {r,c,tx,ty}=cell(p),a=sample(r,c),v=sample(r,c+1),w=sample(r+1,c),d=sample(r+1,c+1);
  if(tx+ty<=1){if(!a.known||!v.known||!w.known)return null;return a.z+tx*(v.z-a.z)+ty*(w.z-a.z);}
  if(!d.known||!v.known||!w.known)return null;return d.z+(1-tx)*(w.z-d.z)+(1-ty)*(v.z-d.z);
 }
 const project=(p,z=height(p),exaggeration=1)=>z===null?null:[(p[1]-lon)/(b.lon1-b.lon0)*width,(z-low)/1000*exaggeration,(lat-p[0])/(b.lat1-b.lat0)*depth];
 function mesh(exaggeration=1){
  const positions=[],colors=[],uv=[],geographicUV=[],indices=[],merc=l=>Math.log(Math.tan(Math.PI/4+l*rad/2)),m0=merc(b.lat0),m1=merc(b.lat1);
  for(let r=0;r<rows+2;r++)for(let c=0;c<cols+2;c++){
   const s=sample(r,c),p=project([ys[r],xs[c]],s.known?s.z:low,exaggeration);positions.push(...p);
   const t=s.known?(s.z-low)/Math.max(1,high-low):0;colors.push(.28+.48*t,.16+.36*t,.12+.25*t);uv.push((xs[c]-b.lon0)/(b.lon1-b.lon0),(merc(ys[r])-m0)/(m1-m0));geographicUV.push((xs[c]-b.lon0)/(b.lon1-b.lon0),(ys[r]-b.lat0)/(b.lat1-b.lat0));
  }
  for(let r=0;r<rows+1;r++)for(let c=0;c<cols+1;c++){
   const a=r*(cols+2)+c,v=a+1,w=a+cols+2,d=w+1;
   if(sample(r,c).known&&sample(r,c+1).known&&sample(r+1,c).known)indices.push(a,w,v);
   if(sample(r,c+1).known&&sample(r+1,c).known&&sample(r+1,c+1).known)indices.push(v,w,d);
  }
  return {positions,colors,uv,geographicUV,indices};
 }
 function drape(path,exaggeration=1){
  if(!path?.length)return [];
  const result=[];
  for(let k=1;k<path.length;k++){
   const a=path[k-1],d=[path[k][0]-a[0],path[k][1]-a[1]],point=t=>[a[0]+t*d[0],a[1]+t*d[1]],ts=[0,1];
   if(d[0])for(const y of ys){const t=(y-a[0])/d[0];if(t>0&&t<1)ts.push(t);}
   if(d[1])for(const x of xs){const t=(x-a[1])/d[1];if(t>0&&t<1)ts.push(t);}
   const cuts=[...new Set(ts)].sort((a,b)=>a-b);
   for(let i=1;i<cuts.length;i++){
    const l=cuts[i-1],h=cuts[i],{r,c}=cell(point((l+h)/2));
    const side=t=>{const p=point(t);return (p[1]-xs[c])/(xs[c+1]-xs[c])+(ys[r]-p[0])/(ys[r]-ys[r+1])-1;};
    const u=side(l),v=side(h);if(u*v<0)ts.push(l+(h-l)*(-u)/(v-u));
   }
   for(const t of [...new Set(ts)].sort((a,b)=>a-b)){
    if(k>1&&t===0)continue;const p=project(point(t),height(point(t)),exaggeration);if(!p)throw Error('Route display intersects missing terrain.');result.push(p);
   }
  }
  return result;
 }
 return {width,depth,low,high,project,height,mesh,drape,grid};
}
return {create};
});
