/* Run the same browser model on fixed study corridors and preserve evidence. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const P=require('../../src/core/planner.js');
const out=path.resolve(__dirname,'../../data/processed/nasa');
const grid=JSON.parse(fs.readFileSync(path.join(out,'terrain_grid.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
P.setDataset(grid);
const corridors=[
 {name:'Landing to selected delta-area waypoint',start:P.DEFAULT_START,goal:P.DEFAULT_GOAL},
 {name:'Crater-floor study corridor',start:[18.43,77.49],goal:[18.47,77.46]},
 {name:'Western terrain study corridor',start:[18.45,77.40],goal:[18.50,77.38]}
];
function compare(corridor,weights){const base=P.plan(corridor.start,corridor.goal,{mode:'base',...weights}),safe=P.plan(corridor.start,corridor.goal,{mode:'safe',...weights});if(base.error||safe.error)throw Error(base.error||safe.error);
 for(const result of [base,safe])for(let i=1;i<result.path.length;i++)assert(P.segmentSafe(result.path[i-1],result.path[i]));
 const b=P.metrics(base.path),s=P.metrics(safe.path);
 return {...corridor,weights,baseline:b,terrain_aware:s,baseline_path:base.path,terrain_aware_path:safe.path,
         exposure_change_percent:100*(s.c-b.c)/b.c,distance_change_percent:100*(s.d-b.d)/b.d};}
const results=corridors.map(c=>compare(c,{w1:1.2,w2:1.5}));
const sensitivity=[{w1:0,w2:0},{w1:1.2,w2:0},{w1:1.2,w2:1.5},{w1:3,w2:3}].map(w=>compare(corridors[0],w));
const report={created_utc:new Date().toISOString(),source_product:grid.source_product,
 source_checksums:manifest.products.filter(p=>p.file.endsWith('.tif')).map(p=>({file:p.file,sha256:p.sha256})),
 grid:{rows:grid.rows,cols:grid.cols,nominal_cell_m:100,source_dem_m:20},
 slope_exclusion_deg:20,exposure_definition:'Integral over distance of min(mean slope / 20 degrees, 1) + min(elevation residual / 3 m, 1), in penalty-km',
 assumptions:{speed_kmh:3,oxygen_kg_per_hour:.8,reserve_fraction:.3,one_way:true},
 results,sensitivity,limitations:['Fixed selected corridors, not statistical proof of general route superiority',
 'Same slope constraints and inputs for both route modes',
 'Source CTX DEM is tied to MOLA; MOLA context is not independent accuracy validation',
 'Policy thresholds, weights, relief normalization, speed, and oxygen assumptions are not validated EVA limits',
 'Grid cell slope does not measure foot-scale rock hazards, traction, or material classes']};
fs.writeFileSync(path.join(out,'comparison_report.json'),JSON.stringify(report,null,2));
const fields=['corridor','mode','distance_km','mean_slope_deg','max_cell_slope_deg','ascent_m','descent_m','steep_cell_distance_km','exposure_penalty_km','walk_hours_assumed','oxygen_kg_assumed'];
const rows=results.flatMap(r=>[['baseline',r.baseline],['terrain_aware',r.terrain_aware]].map(([mode,m])=>[r.name,mode,m.d,m.meanSlope,m.maxSlope,m.ascent,m.descent,m.steepKm,m.c,m.hrs,m.o2].map(v=>typeof v==='number'?v.toFixed(6):v).join(',')));
fs.writeFileSync(path.join(out,'route_comparison.csv'),[fields.join(','),...rows].join('\n')+'\n');
for(const r of results)console.log(`${r.name}: ${r.baseline.d.toFixed(3)} → ${r.terrain_aware.d.toFixed(3)} km; mean slope ${r.baseline.meanSlope.toFixed(2)} → ${r.terrain_aware.meanSlope.toFixed(2)}°; exposure ${r.exposure_change_percent.toFixed(1)}%`);
console.log('Saved comparison_report.json and route_comparison.csv; no operational safety claim.');
