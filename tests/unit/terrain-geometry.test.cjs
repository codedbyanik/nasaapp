const assert=require('node:assert/strict'),G=require('../../src/terrain/geometry.js');
function grid(){const rows=4,cols=5,fill=fn=>Array.from({length:rows},(_,r)=>Array.from({length:cols},(_,c)=>fn(r,c)));return {rows,cols,bbox:{lat0:18,lat1:19,lon0:77,lon1:78},elevation_m:fill((r,c)=>500+r*100+c*50),known:fill(()=>1),blocked:fill(()=>0)};}
const data=grid(),model=G.create(data),mesh=model.mesh();
assert.equal(mesh.positions.length/3,(data.rows+2)*(data.cols+2));assert.equal(mesh.indices.length,(data.rows+1)*(data.cols+1)*6);
for(let r=0;r<data.rows;r++)for(let c=0;c<data.cols;c++)assert(Math.abs(model.height([19-(r+.5)/4,77+(c+.5)/5])-data.elevation_m[r][c])<1e-8);
const path=[[18.94,77.03],[18.09,77.97]],draped=model.drape(path);assert(draped.length>2);const inverse=p=>[18.5-p[2]/model.depth,77.5+p[0]/model.width];
for(let i=1;i<draped.length;i++){const a=draped[i-1],b=draped[i],p=a.map((n,k)=>(n+b[k])/2);assert(Math.abs((model.height(inverse(p))-model.low)/1000-p[1])<1e-8,'Every displayed line segment follows one terrain triangle');}
const exaggerated=model.drape(path,5);for(let i=0;i<draped.length;i++){assert.equal(exaggerated[i][0],draped[i][0]);assert.equal(exaggerated[i][2],draped[i][2]);assert(Math.abs(exaggerated[i][1]-draped[i][1]*5)<1e-9);}
const snapshot=JSON.stringify(data);model.mesh(10);model.drape(path,10);assert.equal(JSON.stringify(data),snapshot,'Display scale must never mutate science data');
data.known[1][2]=0;const hole=G.create(data),holeMesh=hole.mesh();assert(holeMesh.indices.length<mesh.indices.length);assert.equal(hole.height([19-1.5/4,77+2.5/5]),null);assert.throws(()=>hole.drape([[18.9,77.1],[18.625,77.5]]));
const seam=grid();seam.bbox.lon0=179;seam.bbox.lon1=181;const m=G.create(seam);assert(m.width<120);assert(m.drape([[18.9,179.1],[18.1,180.9]]).every(p=>p.every(Number.isFinite)));
console.log('3D geometry checks passed: measured samples, triangle-exact route draping, NoData holes, vertical scale isolation and longitude seam.');
