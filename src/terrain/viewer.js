/* Lazy, local Three.js display of the active NASA grid and existing route. */
'use strict';
window.MarsTerrain3D={create({onCheckpoint,onMap,onEvidenceChanged=()=>{}}){
 const $=id=>document.getElementById(id);let state=null,visible=false,loading=null,THREE,OrbitControls,renderer,scene,camera,controls,terrain,routeGroup,model,gridRef=null,frame=null,version=0,texture=null,regionalTexture=null,imageryEvidence=null,imageController=null,down=null;
 const host=$('terrain3dCanvas'),exaggeration=()=>Number($('verticalScale').value);
 function dispose(group){if(!group)return;const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])materials.add(m);});geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(m.userData.labelTexture)m.map?.dispose();m.dispose();});scene.remove(group);}
 function label(text,color,size){const c=document.createElement('canvas');c.width=128;c.height=128;const x=c.getContext('2d');x.fillStyle='#142024';x.beginPath();x.arc(64,64,51,0,Math.PI*2);x.fill();x.strokeStyle=color;x.lineWidth=6;x.stroke();x.fillStyle=color;x.textAlign='center';x.textBaseline='middle';x.font='bold 58px sans-serif';x.fillText(text,64,67);const map=new THREE.CanvasTexture(c),mat=new THREE.SpriteMaterial({map,depthTest:false,sizeAttenuation:false});mat.userData.labelTexture=true;const sprite=new THREE.Sprite(mat);sprite.scale.set(.035,.035,1);sprite.renderOrder=5;return sprite;}
 function reportError(error){if(scene&&routeGroup){dispose(routeGroup);routeGroup=null;}host.dataset.routePoints='0';host.dataset.checkpoints='0';$('terrain3dCheckpoints').replaceChildren();$('terrain3dStatus').textContent='3D display unavailable for this route: '+error.message+' Continue with the 2D map and source data.';}
 function resize(){if(!renderer||!visible)return;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 function fit(route=false){if(!model||!camera)return;const pts=route&&state.path?.length?model.drape(state.path,exaggeration()):null;const center=new THREE.Vector3(0,(model.high-model.low)/2000*exaggeration(),0);let radius=Math.max(model.width,model.depth)*.6;if(pts){const box=new THREE.Box3().setFromPoints(pts.map(p=>new THREE.Vector3(...p)));box.getCenter(center);radius=Math.max(box.getSize(new THREE.Vector3()).length()*.7,Math.min(model.width/model.grid.cols,model.depth/model.grid.rows)*5);}const distance=radius/Math.sin(camera.fov*Math.PI/360)*1.1;camera.position.copy(center).add(new THREE.Vector3(.55,.8,.8).normalize().multiplyScalar(distance));camera.near=Math.max(.0001,distance/10000);camera.far=Math.max(100,distance*30,model.width*10,model.depth*10);camera.updateProjectionMatrix();controls.target.copy(center);controls.maxDistance=Math.max(model.width,model.depth)*8;controls.minDistance=Math.max(.005,Math.min(model.width/model.grid.cols,model.depth/model.grid.rows)*.8);controls.update();}
 function routes(){
  if(!renderer||!model)return;dispose(routeGroup);routeGroup=new THREE.Group();scene.add(routeGroup);
  const radius=Math.max(.002,Math.min(model.width/model.grid.cols,model.depth/model.grid.rows)*.045),lift=radius*2;
  for(const [path,color] of [[state.baseline,'#dcca8d'],[state.path,state.mode==='base'?'#dcca8d':'#89c5db']]){
   if(!path?.length)continue;const pts=model.drape(path,exaggeration()).map(p=>new THREE.Vector3(p[0],p[1]+lift,p[2]));
   const geometry=new THREE.CylinderGeometry(1,1,1,8),material=new THREE.MeshBasicMaterial({color}),mesh=new THREE.InstancedMesh(geometry,material,pts.length-1),dummy=new THREE.Object3D(),up=new THREE.Vector3(0,1,0);
   for(let i=1;i<pts.length;i++){const d=pts[i].clone().sub(pts[i-1]);dummy.position.copy(pts[i]).add(pts[i-1]).multiplyScalar(.5);dummy.quaternion.setFromUnitVectors(up,d.clone().normalize());dummy.scale.set(radius,d.length(),radius);dummy.updateMatrix();mesh.setMatrixAt(i-1,dummy.matrix);}mesh.instanceMatrix.needsUpdate=true;routeGroup.add(mesh);
  }
  const size=Math.max(radius*14,Math.max(model.width,model.depth)*.006);
  for(const c of state.checkpoints||[]){const p=model.project(c.p,model.height(c.p),exaggeration());if(!p)continue;const sprite=label(String(c.number),'#ec986e',size);sprite.position.set(p[0],p[1]+size*.65,p[2]);sprite.userData.checkpoint=c;routeGroup.add(sprite);}
  const list=$('terrain3dCheckpoints');list.replaceChildren();for(const c of state.checkpoints||[]){const button=document.createElement('button');button.className='button tiny terrain3d-checkpoint';button.textContent=c.number+' / '+c.title;button.onclick=()=>onCheckpoint(c.id);list.appendChild(button);}
  host.dataset.routePoints=String(state.path?.length||0);host.dataset.checkpoints=String(state.checkpoints?.length||0);
 }
 async function style(){
  if(!terrain)return;const token=++version,want=$('terrainStyle').value==='imagery';imageController?.abort();imageryEvidence=null;
  terrain.material.map=null;terrain.material.vertexColors=!want;terrain.material.color.set('#ffffff');terrain.material.needsUpdate=true;onEvidenceChanged();
  if(!want){$('terrain3dStatus').textContent='Elevation colors derived from the active NASA grid. Drag to orbit, scroll or pinch to zoom; right-drag to pan. Vertical scale: '+exaggeration()+'x'+(exaggeration()===1?' (no exaggeration).':' (exaggerated for display only).');return;}
  $('terrain3dStatus').textContent=state.grid.regional?'Loading global CTX orbital imagery. Local demo tiles are used when cached; other areas require internet.':'Loading local Jezero CTX imagery...';
  try{
   if(state.grid.regional){
    const controller=new AbortController();imageController=controller;const timeout=setTimeout(()=>controller.abort(),35000);let result;
    try{result=await MarsGlobalImagery.load(state.grid,{signal:controller.signal});}finally{clearTimeout(timeout);}
    if(token!==version)return;regionalTexture?.dispose();regionalTexture=new THREE.CanvasTexture(result.canvas);regionalTexture.colorSpace=THREE.SRGBColorSpace;regionalTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());terrain.material.map=regionalTexture;terrain.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(terrain.geometry.userData.geographicUV,2));imageryEvidence=result.evidence;
    $('terrain3dStatus').textContent='Global CTX Mosaic V01 / NASA/JPL/MSSS/Caltech Murray Lab; Esri service. Source 5 m/pixel; tile preview ~'+result.evidence.preview_north_south_m_per_pixel.toFixed(0)+' m/pixel; texture ~'+result.evidence.display_north_south_m_per_pixel.toFixed(0)+' m/pixel north-south. Mosaic capture dates vary; gaps may occur. MOLA terrain remains ~3.7 km/cell. Vertical scale '+exaggeration()+'x. Visual context only.';
   }else{
    if(!texture){texture=await new THREE.TextureLoader().loadAsync('data/processed/nasa/ctx_imagery.png');texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}
    if(token!==version)return;terrain.material.map=texture;terrain.geometry.setAttribute('uv',new THREE.Float32BufferAttribute(terrain.geometry.userData.mercatorUV,2));imageryEvidence={product:'USGS Jezero CTX orthoimage preview',image:'data/processed/nasa/ctx_imagery.png',source_manifest:'data/processed/nasa/manifest.json',role:'Visual context only'};
    $('terrain3dStatus').textContent='CTX imagery draped over the routing grid. Lighting is illustrative; small hazards remain unresolved. Vertical scale '+exaggeration()+'x.';
   }
   terrain.material.needsUpdate=true;onEvidenceChanged();
  }catch(error){if(token!==version)return;terrain.material.map=null;terrain.material.vertexColors=true;terrain.material.needsUpdate=true;$('terrain3dStatus').textContent='CTX imagery unavailable: '+error.message+' Showing elevation colors; no substitute photograph is used.';onEvidenceChanged();}
 }

 function build(){
  if(!state?.grid||!renderer)return;const changed=gridRef!==state.grid;gridRef=state.grid;model=MarsTerrainGeometry.create(state.grid);dispose(terrain);
  const values=model.mesh(exaggeration()),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(values.positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(values.colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(values.uv,2));g.userData.mercatorUV=values.uv;g.userData.geographicUV=values.geographicUV;g.setIndex(values.indices);g.computeVertexNormals();
  terrain=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide}));scene.add(terrain);
  $('terrainStyle').querySelector('[value="imagery"]').textContent=state.grid.regional?'CTX global mosaic':'CTX imagery / Jezero';
  $('terrain3dSource').textContent=(state.grid.regional?'MOLA / ~3.7 km cells':'MRO CTX / ~100 m route cells, 20 m DEM source')+` / ${state.grid.rows} x ${state.grid.cols} cells / ${exaggeration()}x vertical scale`;
  $('terrain3dRange').textContent=`Elevation ${model.low.toFixed(0)} to ${model.high.toFixed(0)} m / local planar preview`;
  $('terrain3dStatus').textContent='Drag to orbit, scroll or pinch to zoom, right-drag to pan. Click a numbered checkpoint to inspect its evidence. '+(exaggeration()===1?'Vertical scale is 1x.':'Vertical relief is exaggerated '+exaggeration()+'x for display only.');
  host.dataset.product=state.grid.source_product;host.dataset.meshVertices=String(values.positions.length/3);host.dataset.exaggeration=String(exaggeration());routes();style();if(changed)fit(!!state.path);
 }
 function animate(){if(!visible)return;controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate);}
 async function setup(){
  if(renderer)return;
  const modules=await Promise.all([import('../../assets/vendor/three/three.module.min.js'),import('../../assets/vendor/three/OrbitControls.js')]);THREE=modules[0];OrbitControls=modules[1].OrbitControls;
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor('#111a1e');renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','NASA elevation terrain with the planned route and numbered checkpoints');renderer.domElement.setAttribute('role','img');
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(45,1,.001,1000);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.49;scene.add(new THREE.HemisphereLight('#e2e9e8','#4c2820',2));const sun=new THREE.DirectionalLight('#ffe4c6',2.5);sun.position.set(-10,15,8);scene.add(sun);
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('terrain3dStatus').textContent='3D graphics context lost. Reload this page to retry, or continue with the 2D map.';});
  renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
  renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>6)return;const r=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hit=ray.intersectObjects(routeGroup?.children.filter(c=>c.userData.checkpoint)||[])[0];if(hit)onCheckpoint(hit.object.userData.checkpoint.id);});
  new ResizeObserver(resize).observe(host);
 }
 function hide(){visible=false;if(frame!==null)cancelAnimationFrame(frame);frame=null;$('terrain3dPanel').hidden=true;document.querySelector('.map-shell').hidden=false;$('terrain3dBtn').setAttribute('aria-pressed','false');$('map2dBtn').setAttribute('aria-pressed','true');onMap();}
 async function show(){
  if(!state?.grid)return;visible=true;document.querySelector('.map-shell').hidden=true;$('terrain3dPanel').hidden=false;$('terrain3dBtn').setAttribute('aria-pressed','true');$('map2dBtn').setAttribute('aria-pressed','false');$('terrain3dStatus').textContent='Loading the local 3D renderer...';
  try{if(!loading)loading=setup().catch(error=>{loading=null;throw error;});await loading;if(!visible)return;build();resize();if(frame===null)animate();}
  catch(error){$('terrain3dStatus').textContent='3D unavailable: '+error.message+'. The 2D map and route planning remain available.';}
 }
 $('terrain3dBtn').onclick=show;$('map2dBtn').onclick=hide;$('frame3dRoute').onclick=()=>{try{fit(true);}catch(error){reportError(error);}};$('frame3dRegion').onclick=()=>{try{fit(false);}catch(error){reportError(error);}};$('verticalScale').onchange=()=>{if(renderer){try{build();fit(!!state.path);}catch(error){reportError(error);}}};$('terrainStyle').onchange=style;
 window.addEventListener('pagehide',()=>{visible=false;if(frame!==null)cancelAnimationFrame(frame);controls?.dispose();if(renderer){dispose(terrain);dispose(routeGroup);texture?.dispose();regionalTexture?.dispose();imageController?.abort();renderer.dispose();}});
 return {hide,exportView(){return {visible,vertical_scale:exaggeration(),terrain_product:state?.grid?.source_product||null,imagery:imageryEvidence};},update(next){const changed=state?.grid!==next.grid;if(changed){version++;imageController?.abort();imageryEvidence=null;}state=next;$('terrain3dBtn').disabled=!next.grid;if(!visible||!renderer)return;try{if(changed)build();else routes();}catch(error){reportError(error);}},show};
}};
