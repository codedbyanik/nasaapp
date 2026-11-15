/* Routing uses downloaded CTX DEM derivatives; it never invents terrain. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MarsPlanner=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const R=3389.5,RAD=Math.PI/180;
const DEFAULT_START=[18.44463,77.45088],DEFAULT_GOAL=[18.480,77.420];
let data=null;
function setDataset(value){
 if(!value||value.schema_version!==1||!Number.isInteger(value.rows)||!Number.isInteger(value.cols)||value.rows<2||value.cols<2)throw Error('Invalid terrain grid dimensions');
 const b=value.bbox;if(!b||![b.lat0,b.lat1,b.lon0,b.lon1].every(Number.isFinite)||b.lat0>=b.lat1||b.lon0>=b.lon1)throw Error('Invalid terrain grid bounds');
 if(!Number.isFinite(value.slope_limit_deg)||value.slope_limit_deg<=0||value.slope_limit_deg>90)throw Error('Invalid slope policy');
 for(const field of ['elevation_m','slope_mean_deg','slope_max_deg','relief_m','known','blocked']){
  if(!Array.isArray(value[field])||value[field].length!==value.rows||value[field].some(row=>!Array.isArray(row)||row.length!==value.cols))throw Error('Invalid terrain grid: '+field);
 }
 for(let r=0;r<value.rows;r++)for(let c=0;c<value.cols;c++){
  if(![0,1].includes(value.known[r][c])||![0,1].includes(value.blocked[r][c]))throw Error('Invalid terrain validity flags');
  if(value.known[r][c]&&(!['elevation_m','slope_mean_deg','slope_max_deg','relief_m'].every(k=>Number.isFinite(value[k][r][c]))||value.slope_mean_deg[r][c]<0||value.slope_max_deg[r][c]<value.slope_mean_deg[r][c]-.02||value.relief_m[r][c]<0))throw Error('Invalid terrain measurements');
  if(!value.known[r][c]&&!value.blocked[r][c])throw Error('Unknown cells must be blocked');
  if(value.slope_max_deg[r][c]>=value.slope_limit_deg&&!value.blocked[r][c])throw Error('Steep cells must be blocked');
 }
 data=value;
}
function km(a,b){const h=Math.sin((b[0]-a[0])*RAD/2)**2+Math.cos(a[0]*RAD)*Math.cos(b[0]*RAD)*Math.sin((b[1]-a[1])*RAD/2)**2;return 2*R*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));}
function inside(p){const b=data?.bbox;return !!b&&Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&p[0]>=b.lat0&&p[0]<=b.lat1&&p[1]>=b.lon0&&p[1]<=b.lon1;}
function toGrid(p){const b=data.bbox;return [Math.min(data.rows-1,Math.floor((b.lat1-p[0])/(b.lat1-b.lat0)*data.rows)),Math.min(data.cols-1,Math.floor((p[1]-b.lon0)/(b.lon1-b.lon0)*data.cols))];}
function toLatLon(i,j){const b=data.bbox;return [b.lat1-(i+.5)/data.rows*(b.lat1-b.lat0),b.lon0+(j+.5)/data.cols*(b.lon1-b.lon0)];}
function sample(p){if(!inside(p))return null;const [r,c]=toGrid(p);return {row:r,col:c,elevation:data.elevation_m[r][c],slope:data.slope_mean_deg[r][c],maxSlope:data.slope_max_deg[r][c],relief:data.relief_m[r][c],observationCount:data.observation_count?.[r][c]??null,known:!!data.known[r][c],blocked:!!data.blocked[r][c]};}
function hazardAt(p){const cell=sample(p);if(!cell)return {n:'Outside terrain coverage'};if(!cell.known)return {n:'Unknown elevation'};if(cell.blocked)return {n:'Native DEM slope ≥ '+data.slope_limit_deg+'°'};return null;}
function slope(p){const s=sample(p);return s?.known?Math.min(1,s.slope/data.slope_limit_deg):null;}
function terrain(p){const s=sample(p);return s?.known?Math.min(1,s.relief/(data.relief_scale_m||3)):null;}
function segmentIntervals(a,b){
 if(!inside(a)||!inside(b))return [];
 const box=data.bbox,ts=[0,1],dlat=b[0]-a[0],dlon=b[1]-a[1],[ar,ac]=toGrid(a),[br,bc]=toGrid(b);
 if(dlat)for(let i=Math.min(ar,br)+1;i<=Math.max(ar,br);i++){const lat=box.lat1-i/data.rows*(box.lat1-box.lat0),t=(lat-a[0])/dlat;if(t>0&&t<1)ts.push(t);}
 if(dlon)for(let j=Math.min(ac,bc)+1;j<=Math.max(ac,bc);j++){const lon=box.lon0+j/data.cols*(box.lon1-box.lon0),t=(lon-a[1])/dlon;if(t>0&&t<1)ts.push(t);}
 ts.sort((x,y)=>x-y);const intervals=[];
 for(let i=1;i<ts.length;i++){if(ts[i]-ts[i-1]<1e-10)continue;const t=(ts[i]+ts[i-1])/2;intervals.push({fraction:ts[i]-ts[i-1],cell:sample([a[0]+dlat*t,a[1]+dlon*t])});}
 return intervals;
}
function segmentSafe(a,b){return inside(a)&&inside(b)&&!hazardAt(a)&&!hazardAt(b)&&segmentIntervals(a,b).every(v=>v.cell?.known&&!v.cell.blocked);}
class Heap{constructor(){this.items=[];}push(v){const a=this.items;a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p][0]<=v[0])break;a[i]=a[p];i=p;}a[i]=v;}pop(){const a=this.items,top=a[0],v=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let child=i*2+1;if(child+1<a.length&&a[child+1][0]<a[child][0])child++;if(a[child][0]>=v[0])break;a[i]=a[child];i=child;}a[i]=v;}return top;}get length(){return this.items.length;}}
function plan(start,goal,{mode='safe',w1=1.2,w2=1.5,heuristic=true}={}){
 if(!data)return {error:'NASA terrain data has not loaded. Serve this app over HTTP and retry.'};
 if(![w1,w2].every(v=>Number.isFinite(v)&&v>=0))return {error:'Avoidance weights must be finite and nonnegative.'};
 if(!inside(start)||!inside(goal))return {error:'Choose endpoints inside the loaded terrain coverage.'};
 if(km(start,goal)<(data.minimum_route_km||.02))return {error:'Choose distinct endpoints at least '+((data.minimum_route_km||.02)*1000).toFixed(0)+' m apart.'};
 if(hazardAt(start)||hazardAt(goal))return {error:'An endpoint is in an excluded slope cell or has unknown elevation. Choose another location.'};
 const s=toGrid(start),g=toGrid(goal),cols=data.cols,key=(i,j)=>i*cols+j,sk=key(...s),gk=key(...g);
 if(sk===gk)return segmentSafe(start,goal)?{path:[start.slice(),goal.slice()]}:{error:'Endpoint connection crosses excluded terrain.'};
 const positions=new Map(),edges=new Map();
 const point=(i,j)=>{const k=key(i,j);if(!positions.has(k))positions.set(k,k===sk?start:k===gk?goal:toLatLon(i,j));return positions.get(k);};
 const blocked=(i,j)=>!!data.blocked[i][j];
 const estimate=p=>heuristic?km(p,goal):0,open=new Heap();open.push([estimate(start),...s]);
 const gs=new Float64Array(data.rows*cols);gs.fill(Infinity);gs[sk]=0;
 const came=new Int32Array(gs.length);came.fill(-1);const closed=new Uint8Array(gs.length);let expanded=0;
 while(open.length){const [,i,j]=open.pop(),k=key(i,j);if(closed[k])continue;
  if(k===gk){const path=[goal.slice()];let current=k;while(came[current]>=0){current=came[current];path.unshift(point(Math.floor(current/cols),current%cols).slice());}return {path,expanded};}
  closed[k]=1;expanded++;
  for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){
   if(!di&&!dj)continue;const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=data.rows||nj>=cols||blocked(ni,nj))continue;
   if(di&&dj&&(blocked(i+di,j)||blocked(i,j+dj)))continue;
   const nk=key(ni,nj);if(closed[nk])continue;const a=point(i,j),b=point(ni,nj),ek=Math.min(k,nk)+':'+Math.max(k,nk);
   if(!edges.has(ek)){
    const intervals=segmentIntervals(a,b);let penalty=0,ok=true;
    for(const v of intervals){if(!v.cell?.known||v.cell.blocked){ok=false;break;}if(mode!=='base')penalty+=v.fraction*(w1*Math.min(1,v.cell.slope/data.slope_limit_deg)+w2*Math.min(1,v.cell.relief/(data.relief_scale_m||3))+(v.cell.observationCount===0?.5:0));}
    edges.set(ek,ok?km(a,b)*(1+penalty):Infinity);
   }
   const next=gs[k]+edges.get(ek);if(next<gs[nk]){gs[nk]=next;came[nk]=k;open.push([next+estimate(b),ni,nj]);}
  }
 }
 return {error:'No route connects these endpoints under the current slope and coverage constraints.'};
}
function metrics(path){let d=0,c=0,slopeDistance=0,maxSlope=0,ascent=0,descent=0,steepKm=0,interpolatedKm=0;
 for(let i=1;i<path.length;i++){
  const length=km(path[i-1],path[i]);d+=length;const a=sample(path[i-1]),b=sample(path[i]);if(!a?.known||!b?.known)throw Error('Cannot measure a route outside terrain coverage');
  const dz=b.elevation-a.elevation;ascent+=Math.max(0,dz);descent+=Math.max(0,-dz);
  for(const v of segmentIntervals(path[i-1],path[i])){const s=v.cell;if(!s?.known||s.blocked)throw Error('Route crosses excluded terrain');const dist=length*v.fraction;if(s.observationCount===0)interpolatedKm+=dist;slopeDistance+=dist*s.slope;maxSlope=Math.max(maxSlope,s.maxSlope);if(s.maxSlope>=10)steepKm+=dist;c+=dist*(Math.min(1,s.slope/data.slope_limit_deg)+Math.min(1,s.relief/(data.relief_scale_m||3)));}
 }
 return {d,hrs:d/3,o2:d/3*.8*1.3,c,meanSlope:d?slopeDistance/d:0,maxSlope,ascent,descent,steepKm,interpolatedKm};
}
function distanceToSegment(p,a,b){const cos=Math.cos(p[0]*RAD),scale=R*RAD,xy=q=>[(q[1]-p[1])*scale*cos,(q[0]-p[0])*scale];const [ax,ay]=xy(a),[bx,by]=xy(b),dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/len)):0;return Math.hypot(ax+t*dx,ay+t*dy);}
function nearby(path,pois,maxDistance=.75){return pois.map(p=>({...p,distance:Math.min(...path.slice(1).map((b,i)=>distanceToSegment(p.p,path[i],b)))})).filter(p=>p.distance<=maxDistance).sort((a,b)=>a.distance-b.distance);}
return {R,DEFAULT_START,DEFAULT_GOAL,setDataset,km,inside,hazardAt,segmentSafe,toGrid,toLatLon,sample,slope,terrain,plan,metrics,nearby,get BBOX(){return data?.bbox;},get dataset(){return data;}};
});
