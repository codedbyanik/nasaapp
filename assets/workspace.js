/* Progressive disclosure for the existing planner; retains all control IDs. */
'use strict';
(function(){
 const $=id=>document.getElementById(id),q=s=>document.querySelector(s);
 function element(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;}
 function disclosure(id,title,...children){const d=element('details','disclosure');d.id=id;d.appendChild(element('summary','',title));const content=element('div','disclosure-content');content.append(...children);d.appendChild(content);return d;}
 function fold(node,id,title){const d=disclosure(id,title);node.before(d);d.lastChild.appendChild(node);return d;}
 function stage(number,title){const heading=element('div','stage-heading');heading.append(element('span','stage-number',number),element('h2','',title));return heading;}
 const sidebar=q('.sidebar'),main=q('.main-area'),region=q('.region-controls'),route=q('.route-card'),summary=q('.summary-card'),evidence=q('.observation-card'),analysis=q('.details-grid'),brief=q('.mission-brief');
 const layers=q('#l_ctx').closest('section'),preferences=$('w1').closest('section'),status=$('dataStatus'),regionTag=q('.region-tag');
 sidebar.replaceChildren();sidebar.classList.add('planner-sidebar');
 const intro=element('div','planner-intro');intro.append(element('h1','','Plan your Marswalk'),element('p','','Choose a place. Plan. Inspect.'));sidebar.append(intro,region);
 region.querySelector('h2').replaceWith(stage('1','Choose a place'));region.querySelector('label[for="regionPreset"]').textContent='Location';
 const area=disclosure('regionOptions','Area size & map browsing',region.querySelector('label[for="regionExtent"]'),$('regionExtent'),$('mapCenterRegion'),$('worldBtn'));
 region.insertBefore(area,$('regionNotice'));$('loadRegion').textContent='Open location';region.appendChild($('regionNotice'));
 $('regionNotice').textContent='Jezero has detailed terrain. Other locations use a coarse regional model.';
 const showMap=element('button','button subtle mobile-map-jump','Show map');showMap.id='showMapBtn';showMap.onclick=()=>q('.view-switch').scrollIntoView({block:'start',behavior:'smooth'});region.appendChild(showMap);sidebar.appendChild(region);
 const routeHeading=route.querySelector('.section-heading');routeHeading.querySelector('h2').textContent='Set your route';routeHeading.prepend(element('span','stage-number','2'));
 route.querySelector('.tag').textContent='ONE WAY';$('pickStart').textContent='Change';$('pickGoal').textContent='Change';$('pickStart').setAttribute('aria-label','Choose departure on the map');$('pickGoal').setAttribute('aria-label','Choose destination on the map');
 const coordinates=disclosure('endpointCoordinates','Coordinates',element('p','','Departure'),$('startCoords'),element('p','','Destination'),$('goalCoords'));
 $('safeBtn').textContent='Plan route';$('cmpBtn').textContent='Compare two routes';$('cmpBtn').className='button route-compare';
 route.querySelector('.secondary-actions').appendChild($('clrBtn'));route.querySelector('.secondary-actions').prepend(coordinates);preferences.appendChild($('baseBtn'));
 sidebar.appendChild(route);
 const inspect=element('section','inspect-stage');inspect.append(stage('3','Inspect the route'),element('p','hint','Select a numbered point for images and evidence.'));
 $('storyBtn').textContent='Inspect a checkpoint';$('storyBtn').className='button secondary';$('exportBtn').textContent='Export route';$('exportBtn').className='button subtle';const inspectActions=element('div','inspect-actions');inspectActions.append($('storyBtn'),$('exportBtn'));inspect.appendChild(inspectActions);sidebar.appendChild(inspect);
 const advanced=disclosure('advancedSettings','Map layers & route settings',layers,preferences);sidebar.appendChild(advanced);
 const footer=element('div','planner-data-note');footer.append(regionTag,element('p','','Research prototype. Routes are not operational EVA safety clearance.'),disclosure('dataStatusDetails','Data connection',status));sidebar.appendChild(footer);
 main.querySelector('.workspace-heading .eyebrow').textContent='EXPLORE MARS';$('demoBtn').textContent='Reset example';
 const tabs=element('div','workspace-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Route information');
 const panels={overview:summary,evidence,analysis};
 function open(name,scroll=false){
  for(const [key,panel] of Object.entries(panels)){panel.hidden=key!==name;$(key+'Tab').setAttribute('aria-selected',String(key===name));$(key+'Tab').tabIndex=key===name?0:-1;}
  queueMicrotask(()=>window.dispatchEvent(new CustomEvent('mars:panelchange',{detail:name})));
  if(scroll)tabs.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
 for(const [key,label] of [['overview','Your route'],['evidence','Checkpoint evidence'],['analysis','Analysis']]){const button=element('button','workspace-tab',label);button.id=key+'Tab';button.type='button';button.setAttribute('role','tab');button.setAttribute('aria-controls',key+'Panel');button.onclick=()=>open(key);tabs.appendChild(button);panels[key].id=key+'Panel';panels[key].setAttribute('role','tabpanel');panels[key].setAttribute('aria-labelledby',button.id);}
 tabs.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const keys=Object.keys(panels),current=keys.findIndex(k=>$(k+'Tab')===document.activeElement);let next=event.key==='Home'?0:event.key==='End'?keys.length-1:(current+(event.key==='ArrowRight'?1:-1)+keys.length)%keys.length;open(keys[next]);$(keys[next]+'Tab').focus();};
 const oldMissionGrid=q('.mission-grid');oldMissionGrid.replaceWith(tabs,summary,evidence,analysis); // Existing later nodes are moved, never cloned.
 summary.querySelector('h2').textContent='Route overview';const stats=summary.querySelector('.stats'),estimates=element('div','estimate-grid');for(const stat of [...stats.children].slice(1))estimates.appendChild(stat);
 const extras=disclosure('routeDetails','Elevation, estimates & simulation',estimates,$('elevationProfile'),$('survInfo'),summary.querySelector('.simulation-controls'),$('simStatus'));summary.appendChild(extras);
 const metadata=disclosure('imageDetails','Observation source & dates',evidence.querySelector('.observation-facts > .hint'),$('imageSource'));evidence.querySelector('.observation-facts').appendChild(metadata);
 const review=evidence.querySelector('.inspection-review'),surface=evidence.querySelector('.surface-section');fold(review,'reviewDetails','Add inspection notes');fold(surface,'surfaceDetails','See available rover photographs');
 $('observationHeading').textContent='Look around a checkpoint';$('observationChoice').closest('label').firstChild.textContent='Image';$('contextWidth').closest('label').firstChild.textContent='Area shown';
 fold(brief,'missionDetails','Mission story');q('.main-footer').before($('missionDetails'));
 $('map2dBtn').textContent='Map';$('terrain3dBtn').textContent='3D view';q('.view-switch > span').textContent='Explore the route from above or in 3D.';
 const caption=q('.terrain3d-caption'),legend=caption.querySelectorAll('p')[2],limit=caption.querySelector('small'),compact=element('p','terrain3d-instruction');compact.setAttribute('role','status');caption.prepend(compact);caption.appendChild(disclosure('terrain3dDetails','3D source & display limits',$('terrain3dSource'),$('terrain3dStatus'),$('terrain3dRange'),legend,limit));
 function compactStatus(){const text=$('terrain3dStatus').textContent;compact.textContent=/unavailable|lost|cannot/i.test(text)?text:/^Global CTX/.test(text)?'Orbital imagery loaded. The regional elevation model remains coarse.':/^CTX imagery draped/.test(text)?'Orbital imagery loaded. Drag to rotate, scroll or pinch to zoom.':/^Loading/.test(text)?'Loading the terrain view...':'Drag to rotate. Scroll or pinch to zoom. Select a numbered checkpoint to inspect.';}
 new MutationObserver(compactStatus).observe($('terrain3dStatus'),{childList:true,characterData:true,subtree:true});compactStatus();
 function locationInputs(){q('.coordinate-inputs').hidden=$('regionPreset').value!=='custom';}
 $('regionPreset').addEventListener('change',locationInputs);for(const id of ['mapCenterRegion','demoBtn'])$(id).addEventListener('click',()=>queueMicrotask(locationInputs));locationInputs();open('overview');
 window.MarsWorkspace={open,showMap(){if(matchMedia('(max-width: 700px)').matches)q('.view-switch').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}};
})();
