const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../assets/planner.js');
assert(P.plan(P.DEFAULT_START,P.DEFAULT_GOAL).error,'Missing data must disable planning');
const grid=JSON.parse(fs.readFileSync(path.join(__dirname,'../data/processed/nasa/terrain_grid.json'),'utf8'));
P.setDataset(grid);
const start=P.DEFAULT_START,goal=P.DEFAULT_GOAL;
assert(P.sample(start).known&&!P.hazardAt(start),'Actual NASA landing coordinate must be covered');
assert(P.plan([0,0],goal).error);assert(P.plan(start,start).error);assert(P.plan([NaN,77.4],goal).error);
assert(P.plan(start,goal,{w1:-1}).error);assert(P.plan(start,goal,{w2:Infinity}).error);
let steep;
for(let r=0;r<grid.rows&&!steep;r++)for(let c=0;c<grid.cols;c++)if(grid.blocked[r][c]){steep=P.toLatLon(r,c);break;}
assert(P.plan(steep,goal).error,'Observed steep endpoint must be rejected');
const base=P.plan(start,goal,{mode:'base'}),safe=P.plan(start,goal);
assert(base.path&&safe.path);
for(const result of [base,safe]){
 assert.deepEqual(result.path[0],start);assert.deepEqual(result.path.at(-1),goal);
 for(let i=1;i<result.path.length;i++)assert(P.segmentSafe(result.path[i-1],result.path[i]));
}
const mb=P.metrics(base.path),ms=P.metrics(safe.path);
assert(ms.d>=mb.d-1e-9);assert(ms.c<mb.c,'The fixed default corridor reduces DEM-derived exposure');
assert(ms.meanSlope<mb.meanSlope);assert(ms.maxSlope<20);
const dijkstra=P.plan(start,goal,{mode:'base',heuristic:false});
assert(Math.abs(P.metrics(dijkstra.path).d-mb.d)<1e-9,'A* distance must match Dijkstra');
assert(Math.abs(P.km([0,0],[1,0])-P.R*Math.PI/180)<1e-9);
const [sr,sc]=P.toGrid(start),center=P.toLatLon(sr,sc),a=[center[0]-.0002,center[1]],b=[center[0]+.0002,center[1]];
assert.deepEqual(P.toGrid(a),P.toGrid(b));assert.deepEqual(P.plan(a,b).path,[a,b]);
const nearby=P.nearby([[18.4,77.3],[18.4,77.5]],[{n:'Midpoint',p:[18.4,77.4]},{n:'Distant',p:[18.55,77.3]}]);
assert.equal(nearby.length,1);assert(nearby[0].distance<1e-6);
assert.deepEqual(P.toGrid([grid.bbox.lat0,grid.bbox.lon1]),[grid.rows-1,grid.cols-1]);
// Small independent fixture exercises thin crossed cells and unknown data.
const matrix=value=>Array.from({length:7},()=>Array(7).fill(value));
const fixture={schema_version:1,rows:7,cols:7,bbox:{lat0:18.4,lat1:18.413,lon0:77.4,lon1:77.413},slope_limit_deg:20,elevation_m:matrix(100),slope_mean_deg:matrix(0),slope_max_deg:matrix(0),relief_m:matrix(0),known:matrix(1),blocked:matrix(0)};
fixture.blocked[3][3]=1;fixture.slope_max_deg[3][3]=30;fixture.slope_mean_deg[3][3]=25;
P.setDataset(fixture);const fstart=P.toLatLon(3,0),fgoal=P.toLatLon(3,6);
assert(!P.segmentSafe(fstart,fgoal),'A segment crossing an excluded cell must fail');
const detour=P.plan(fstart,fgoal,{mode:'base'});assert(detour.path);for(let i=1;i<detour.path.length;i++)assert(P.segmentSafe(detour.path[i-1],detour.path[i]));
fixture.known[2][2]=0;fixture.blocked[2][2]=1;fixture.elevation_m[2][2]=null;P.setDataset(fixture);
assert(P.plan(P.toLatLon(2,2),fgoal).error,'NoData endpoint must be rejected');
fixture.blocked[2][2]=0;assert.throws(()=>P.setDataset(fixture),/Unknown cells/);
P.setDataset(grid);
console.log('Planner checks passed:',JSON.stringify({baseline:mb,terrainAware:ms}));
