/* Traceable observations for human inspection; review never certifies safety. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MarsObservations=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const RAD=Math.PI/180,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function contains(p,geometry){
 if(geometry?.type!=='Polygon')return false;
 const inRing=ring=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [x,y]=ring[i],[xj,yj]=ring[j],cross=(y>p[0])!==(yj>p[0])&&p[1]<(xj-x)*(p[0]-y)/(yj-y)+x;if(cross)inside=!inside;
 }return inside;};
 return inRing(geometry.coordinates[0])&&!geometry.coordinates.slice(1).some(inRing);
}
function matches(p,catalog){return catalog.orbital.filter(o=>contains(p,o.footprint)).sort((a,b)=>b.captured_start.localeCompare(a.captured_start));}
function checkpoints(path,P){
 if(!path?.length)return [];
 const distances=[0];for(let i=1;i<path.length;i++)distances.push(distances[i-1]+P.km(path[i-1],path[i]));
 let steep=0;for(let i=1;i<path.length;i++)if(P.sample(path[i]).maxSlope>P.sample(path[steep]).maxSlope)steep=i;
 const nearest=f=>distances.reduce((best,d,i)=>Math.abs(d-distances.at(-1)*f)<Math.abs(distances[best]-distances.at(-1)*f)?i:best,0);
 const specifications=[[0,'Departure','Establish the visual baseline. Compare the orbital texture with any available rover view.'],
  [nearest(.33),'Crater-floor crossing','Look for changes in texture and relief along the crossing. Small obstacles remain below the terrain model’s resolution.'],
  [steep,'Slope review','Inspect the steepest terrain cell sampled at route waypoints. Decide what needs a closer survey before a human traverse.'],
  [nearest(.67),'Approach review','Compare the approach with nearby terrain. Record what the imagery shows and what it cannot resolve.'],
  [path.length-1,'Destination','Review the selected endpoint and the regional delta panorama. Scientific interpretation needs a dedicated investigation.']];
 if(P.dataset?.regional)for(const spec of specifications){if(spec[1]==='Crater-floor crossing')spec[1]='Regional crossing';spec[2]='Inspect coarse MOLA elevation and measurement support. Local imagery and hazards are unresolved; this is a regional candidate corridor.';}
 const unique=new Map();for(const [index,title,prompt] of specifications){const existing=unique.get(index);if(existing){existing.title+=' / '+title;existing.prompt+=' '+prompt;}else unique.set(index,{index,title,prompt,p:path[index].slice(),distance:distances[index]});}
 return [...unique.values()].sort((a,b)=>a.index-b.index).map((c,i)=>({...c,id:'checkpoint-'+(i+1),number:i+1,reviewed:false,note:''}));
}
function pixel(p,b,width,height){const m=lat=>Math.log(Math.tan(Math.PI/4+lat*RAD/2));return [(p[1]-b.lon0)/(b.lon1-b.lon0)*width,(m(b.lat1)-m(p[0]))/(m(b.lat1)-m(b.lat0))*height];}
function rendition(record,p,widthM){
 const d=record.detail;if(!d)return record;
 const [h,w]=d.shape,[x,y]=pixel(p,d.bbox,w,h),spacing=(d.bbox.lon1-d.bbox.lon0)*RAD*3396190*Math.cos(p[0]*RAD)/w,sw=widthM/spacing,sh=sw*2/3;
 return x-sw/2>=0&&x+sw/2<=w&&y-sh/2>=0&&y+sh/2<=h?{...record,...d,fullDetail:true}:record;
}
function date(s){if(!s)return 'Not supplied';return new Date(s.length===10?s+'T00:00:00Z':s).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}
function create({map,planner:P,footprintLayer,onReviewChanged=()=>{}}){
 const $=id=>document.getElementById(id),markers=L.layerGroup().addTo(map),focus=L.layerGroup().addTo(map),images=new Map();
 let catalog=null,stops=[],extra=[],selected=null,route=null,version=0,view='ctx',widthM=1200,failed=false;
 window.addEventListener('mars:panelchange',event=>{if(event.detail==='evidence'&&selected&&catalog&&!failed&&!P.dataset?.regional)renderImage();});
 const snapshot={get catalog(){return catalog;},setRoute,inspect,load,exportReview,focusCheckpoint(id){const c=stops.find(c=>c.id===id);if(c)select(c,true);}};
 $('checkpointList').addEventListener('click',event=>{const button=event.target.closest('[data-checkpoint]');if(button)select(stops.find(c=>c.id===button.dataset.checkpoint),true);});
 $('observationChoice').onchange=()=>{view=$('observationChoice').value;renderImage();};
 $('contextWidth').onchange=()=>{widthM=Number($('contextWidth').value);renderImage();};
 $('reviewNote').oninput=()=>{if(selected){selected.note=$('reviewNote').value;selected.reviewed=false;selected.reviewed_at=null;renderReview();onReviewChanged();}};
 $('reviewBtn').onclick=()=>{if(selected){selected.reviewed=!selected.reviewed;selected.reviewed_at=selected.reviewed?new Date().toISOString():null;renderReview();onReviewChanged();}};
 $('storyBtn').onclick=()=>{const c=stops.find(c=>c.title.includes('Slope review'))||stops[0];if(c)select(c,true);};
 async function load(){
  try{const response=await fetch('data/processed/nasa/observations.json');if(!response.ok)throw Error('Evidence catalog unavailable');catalog=await response.json();if(catalog.schema_version!==1||!catalog.ctx||!Array.isArray(catalog.orbital)||!Array.isArray(catalog.surface))throw Error('Evidence catalog invalid');
   $('observationStatus').textContent=`${catalog.orbital.length} orbital observations · ${catalog.surface.length} rover panoramas · snapshot ${date(catalog.snapshot_utc)}`;
   $('snapshotNote').textContent=`Curated snapshot built ${date(catalog.snapshot_utc)}. “Newest” means newest covering image in these ${catalog.orbital.length} records; the full NASA archive may contain others.`;
   if(footprintLayer)catalog.orbital.forEach((o,i)=>L.geoJSON(o.footprint,{interactive:false,style:{color:i<2?'#89c5db':'#bbd6a5',weight:1,fillOpacity:0,dashArray:'6 4',attribution:'NASA/JPL-Caltech/UArizona HiRISE'}}).addTo(footprintLayer));
   if(selected)select(selected);else if(stops.length)select(stops[0]);
  }catch(error){failed=true;$('observationStatus').textContent='Observation evidence unavailable';$('observationContent').hidden=true;$('evidenceUnavailable').hidden=false;$('evidenceUnavailable').textContent='The observation catalog could not load. Terrain planning still works; image evidence and review are unavailable. Reload or run scripts/data/prepare_observations.py.';console.error(error.message);}
 }
 function setRoute(path,mode){
  version++;focus.clearLayers();markers.clearLayers();route=path;selected=null;extra=[];stops=checkpoints(path,P);window._checkpoints=stops;
  $('missionStory').textContent=P.dataset?.regional?'Regional reconnaissance: compare kilometer-scale terrain corridors. Acquire local imagery and detailed elevation before choosing an astronaut route.':path?'Mission briefing: inspect terrain on the approach to Jezero’s ancient delta. Start from a known landing reference, review the crossing and slope changes, then examine the selected destination. Fictional human expedition; actual NASA observations.':'Mission briefing: choose a departure and destination, compare routes, then inspect the evidence at each checkpoint.';
  $('storyBtn').disabled=!path;$('storyRouteMode').textContent=path?(mode==='base'?'DISTANCE-ONLY ROUTE':'TERRAIN-AWARE ROUTE'):'NO ROUTE';
  for(const c of stops){L.marker(c.p,{bubblingMouseEvents:false,icon:L.divIcon({className:'',html:`<div class="checkpoint-pin">${c.number}</div>`,iconSize:[23,23],iconAnchor:[11,11]}),title:`Checkpoint ${c.number}: ${c.title}`,zIndexOffset:400}).on('click',()=>select(c,true)).addTo(markers);}
  renderReview();if(stops.length)select(stops[0]);else{$('observationContent').hidden=true;$('evidenceUnavailable').hidden=false;$('evidenceUnavailable').textContent=failed?'Observation evidence unavailable; terrain planning can continue.':'Plan a route for checkpoints, or click a terrain location to inspect its observations.';}
 }
 function inspect(p,title='Selected map location'){const key=p.map(n=>n.toFixed(5)).join(',');let c=extra.find(c=>c.id===key);if(!c){c={id:key,number:null,title,p:p.slice(),distance:null,prompt:'Inspect the surroundings at this coordinate. Observations are historical; coverage and small hazards need separate checks.',reviewed:false,note:''};extra.push(c);}select(c,true);}
 function select(c,move=false){
  if(!c||failed)return;if(move){window.MarsWorkspace?.open('evidence');window.dispatchEvent(new CustomEvent('mars:inspection',{detail:{title:c.title}}));}selected=c;version++;window._observationPoint=c.p.slice();
  if(!catalog){$('observationTitle').textContent='Loading observation evidence…';return;}
  if(P.dataset?.regional){
   $('observationContent').hidden=true;$('evidenceUnavailable').hidden=false;
   const cell=P.sample(c.p);$('observationTitle').textContent=c.title;
   $('evidenceUnavailable').textContent=cell?.known?`MOLA regional evidence: elevation ${cell.elevation.toFixed(0)} m; coarse slope ${cell.slope.toFixed(2)} degrees; ${cell.observationCount} laser measurements in this bin${cell.observationCount===0?' (interpolated elevation)':''}. Source: MEGT90N000EB / MEGC90N000EB, acquired 1997-2001; product created April 2003. ~3.7 km cells. The colored map is topography, not a photograph. The checkpoint photo catalog is limited to Jezero; 3D also offers a global CTX orbital mosaic for regional visual context. Imagery does not refine the MOLA terrain. Detailed terrain and image surveys are required before evaluating a Marswalk.`:'Outside loaded MOLA terrain. Load a region around this location.';
   renderReview();if(move)$('observationHeading').scrollIntoView({block:'start',behavior:'auto'});return;
  }
  focus.clearLayers();L.circleMarker(c.p,{radius:16,color:'#ec986e',weight:2,fillOpacity:0,bubblingMouseEvents:false}).addTo(focus);if(move)map.panTo(c.p);
  $('observationContent').hidden=false;$('evidenceUnavailable').hidden=true;$('observationTitle').textContent=(c.number?`Checkpoint ${c.number} · `:'')+c.title;
  $('observationCoords').textContent=`${c.p[0].toFixed(5)}° N / ${c.p[1].toFixed(5)}° E${c.distance!==null?' · '+c.distance.toFixed(2)+' km from departure':''}`;
  $('checkpointPrompt').textContent=c.prompt;$('reviewNote').value=c.note;
  const cell=P.sample(c.p);$('evidenceMeasurements').innerHTML=cell?.known?`<div><span>Elevation</span><b>${cell.elevation.toFixed(1)} m</b></div><div><span>Mean slope</span><b>${cell.slope.toFixed(2)}°</b></div><div><span>Cell max slope</span><b>${cell.maxSlope.toFixed(2)}°</b></div><div><span>Elevation residual</span><b>${cell.relief.toFixed(2)} m</b></div>`:'<p>Outside known CTX terrain coverage. No terrain measurements.</p>';
  $('checkpointPolicy').textContent=!cell?.known?'Unknown terrain · no route clearance':cell.blocked?'Excluded by the 20° prototype policy':'Below the 20° exclusion at terrain-map resolution';
  $('checkpointPolicy').classList.toggle('excluded',!cell?.known||cell.blocked);
  const covering=matches(c.p,catalog);$('observationChoice').innerHTML='<option value="ctx">CTX · broad terrain context</option>'+covering.map(o=>`<option value="${esc(o.id)}">HiRISE · ${date(o.captured_start)}${o===covering[0]?' · newest in snapshot':''}</option>`).join('');
  view=covering.length?covering[0].id:'ctx';$('observationChoice').value=view;
  $('coverageNote').textContent=covering.length?`${covering.length} HiRISE catalog footprints cover this coordinate. Compare dates using the image selector.`:'No HiRISE match in this snapshot. CTX imagery covers the study area; this does not mean NASA has no other observations here.';
  renderSurface(c);renderReview();if(!document.getElementById('evidencePanel')?.hidden)renderImage();else $('imageCaption').textContent='Open Checkpoint evidence to load archived imagery.';if(move)$('observationHeading').scrollIntoView({block:'start',behavior:'auto'});
 }
 function renderReview(){
  $('checkpointList').innerHTML=stops.length?stops.map(c=>`<button class="checkpoint-button${selected?.id===c.id?' selected':''}" data-checkpoint="${c.id}" aria-pressed="${selected?.id===c.id}"><span>${c.reviewed?'✓':c.number}</span><strong>${esc(c.title)}</strong><small>${c.distance.toFixed(2)} km · ${c.reviewed?'review recorded':'inspect evidence'}</small></button>`).join(''):'<p class="hint">Checkpoints appear after planning.</p>';
  $('reviewProgress').textContent=`${stops.filter(c=>c.reviewed).length} / ${stops.length} checkpoint reviews recorded`;
  $('reviewBtn').disabled=!selected;$('reviewBtn').textContent=selected?.reviewed?'✓ Review recorded · undo':'Record my inspection';
 }
 function getImage(url){if(!images.has(url))images.set(url,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Image preview unavailable'));image.src=url;}));return images.get(url);}
 async function renderImage(){
  if(!selected||!catalog)return;const v=++version,p=selected.p.slice(),source=view==='ctx'?catalog.ctx:catalog.orbital.find(o=>o.id===view),record=rendition(source,p,widthM);
  $('imageCaption').textContent='Loading archived image…';$('imageOpen').href=record.image;
  $('imageSource').innerHTML=`<b>${esc(record.instrument)} / ${esc(record.id)}</b><dl><dt>Captured</dt><dd>${record.captured_start?date(record.captured_start):'Not supplied for this mosaic'}</dd><dt>Published</dt><dd>${date(record.published)}</dd>${record.product_created?`<dt>Product created</dt><dd>${date(record.product_created)}</dd>`:''}<dt>Source sampling</dt><dd>${record.source_resolution_m} m/pixel</dd><dt>This preview</dt><dd>${record.preview_spacing_m} m projected pixels${record.fullDetail?' · from full-resolution JP2':record.browse_ground_spacing_m?' · browse input ~'+record.browse_ground_spacing_m.toFixed(1)+' m/pixel':''}</dd></dl><p>${esc(record.capture_note||record.publication_note||'')}</p><p>${esc(record.credit||'NASA/JPL-Caltech/MSSS / USGS')}</p><a href="${esc(record.source_url)}" target="_blank" rel="noopener noreferrer">Official observation ↗</a> · <a href="${esc(record.label_url)}" target="_blank" rel="noopener noreferrer">Metadata label ↗</a>${record.full_resolution_url?` · <a href="${esc(record.full_resolution_url)}" target="_blank" rel="noopener noreferrer">Full-resolution product ↗</a>`:''}`;
  const canvas=$('observationCanvas'),ctx=canvas.getContext('2d');canvas.width=900;canvas.height=600;ctx.fillStyle='#101618';ctx.fillRect(0,0,900,600);
  try{const image=await getImage(record.image);if(v!==version)return;
   const b=record.bbox,[x,y]=pixel(p,b,image.width,image.height),metresPerPixel=(b.lon1-b.lon0)*RAD*3396190*Math.cos(p[0]*RAD)/image.width;
   const sw=widthM/metresPerPixel,sh=sw*canvas.height/canvas.width;
   ctx.drawImage(image,x-sw/2,y-sh/2,sw,sh,0,0,canvas.width,canvas.height);
   // Route is contextual only; it was computed from the separate CTX DEM.
   if(route){ctx.strokeStyle='#89c5db';ctx.lineWidth=3;ctx.beginPath();route.forEach((q,i)=>{const [qx,qy]=pixel(q,b,image.width,image.height);const cx=(qx-x+sw/2)/sw*900,cy=(qy-y+sh/2)/sh*600;if(i)ctx.lineTo(cx,cy);else ctx.moveTo(cx,cy);});ctx.stroke();}
   ctx.strokeStyle='#ec986e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(450,300,12,0,2*Math.PI);ctx.moveTo(430,300);ctx.lineTo(470,300);ctx.moveTo(450,280);ctx.lineTo(450,320);ctx.stroke();
   ctx.fillStyle='#111a1de8';ctx.fillRect(18,540,205,42);ctx.fillStyle='#edf0e9';ctx.font='16px sans-serif';const scale=widthM/5;ctx.fillText(`${scale.toFixed(0)} m · approximate`,28,558);ctx.fillRect(28,568,180,3);
   ctx.fillStyle='#111a1de8';ctx.fillRect(835,16,45,55);ctx.fillStyle='#edf0e9';ctx.fillText('N ↑',840,45);
   const viewed={id:record.id,image:record.image,preview_sha256:record.fullDetail?record.sha256:record.preview_sha256,captured_start:record.captured_start,published:record.published,preview_spacing_m:record.preview_spacing_m,view_width_m:widthM,viewed_at:new Date().toISOString()};selected.viewed=selected.viewed||[];const previous=selected.viewed.findIndex(o=>o.id===viewed.id&&o.image===viewed.image);if(previous<0)selected.viewed.push(viewed);else selected.viewed[previous]=viewed;onReviewChanged();
   $('imageCaption').textContent=`${record.instrument} orbital crop · ${record.fullDetail?'detail from the full-resolution JP2 · ':''}approximately ${(widthM/1000).toFixed(1)} km across. Blue: planned route. Orange: selected coordinate. Blank pixels: outside this preview or padding. This image does not update the routing DEM.`;
  }catch(error){if(v!==version)return;$('imageCaption').textContent='This image preview could not load. Use the official source link; no substitute imagery is shown.';}
 }
 function renderSurface(c){
  const atLanding=P.km(c.p,P.DEFAULT_START)<=.15;
  const records=catalog.surface.filter(o=>o.association==='regional_context'||(o.association==='landing_site'&&atLanding));
  $('surfaceCoverage').textContent=atLanding?'A published rover panorama is associated with the nearby landing site. The delta view is regional context.':'No exact ground-level photograph is located at this checkpoint in our catalog. The delta panorama below is regional context; it was not captured here.';
  $('surfaceImages').innerHTML=records.map(o=>`<details class="surface-observation"><summary><span>${o.association==='landing_site'?'NEAR LANDING SITE':'REGIONAL CONTEXT'}</span><strong>${esc(o.title)}</strong><small>Captured ${date(o.capture_dates[0])}${o.capture_dates.length>1?'–'+date(o.capture_dates.at(-1)):''} · published ${date(o.published)}</small></summary><div class="panorama-scroll" tabindex="0" aria-label="Scrollable NASA panorama"><img src="${esc(o.image)}" alt="${esc(o.title)} — actual Perseverance Mastcam-Z mosaic" loading="lazy"></div><p>Scroll sideways to explore · ${esc(o.color_processing)} · ${esc(o.credit)}<br>${esc(o.coordinate_note)}</p><a href="${esc(o.source_url)}" target="_blank" rel="noopener noreferrer">NASA caption and provenance ↗</a> · <a href="${esc(o.image)}" target="_blank" rel="noopener noreferrer">Open panorama ↗</a></details>`).join('');
 }
 function exportReview(){const serialize=c=>({id:c.id,title:c.title,coordinate:c.p,distance_km:c.distance,terrain:P.sample(c.p),review_recorded:c.reviewed,reviewed_at:c.reviewed_at||null,note:c.note,viewed_observations:c.viewed||[],covering_observations:catalog?matches(c.p,catalog).map(o=>({id:o.id,captured_start:o.captured_start,product_created:o.product_created,published:o.published,source_url:o.source_url,preview_sha256:o.preview_sha256,detail_sha256:o.detail?.sha256||null,source_files:o.files})):[]});return {snapshot_utc:catalog?.snapshot_utc||null,catalog:'data/processed/nasa/observations.json',scope:catalog?.scope||'Observation evidence unavailable',review_is_safety_certification:false,checkpoints:stops.map(serialize),additional_inspections:extra.map(serialize)};}
 return snapshot;
}
return {contains,matches,checkpoints,pixel,rendition,create};
});
