/* Decorative cues preserve the existing controls, labels and scientific state. */
'use strict';
(()=>{
 function icon(name,className='action-icon'){
  const source=window.AresIcons?.[name];if(!source)return null;
  const svg=document.importNode(new DOMParser().parseFromString(source,'image/svg+xml').documentElement,true);
  svg.setAttribute('class',className);svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');return svg;
 }
 function decorate(node,name){if(!node||node.querySelector(':scope > .action-icon'))return;const svg=icon(name);if(svg){node.prepend(svg);node.classList.add('with-icon');}}
 const controls={chooseDestination:'target',swapEndpoints:'compare',dropPlanningPin:'location',showPlanningPlaces:'map','coordinate-start':'location','coordinate-goal':'target','coordinate-pin':'location',loadRegion:'location',pickStart:'location',pickGoal:'target',safeBtn:'route',cmpBtn:'compare',storyBtn:'inspect',exportBtn:'download',demoBtn:'reset',fitBtn:'target',map2dBtn:'map',terrain3dBtn:'cube',frame3dRoute:'route',frame3dRegion:'target',sourcesBtn:'database',reviewBtn:'check',roverBtn:'route',worldBtn:'map',mapCenterRegion:'target',overviewTab:'route',evidenceTab:'inspect',analysisTab:'compare'};
 const disclosureIcons={planningTools:'location',coordinatePlanning:'location',advancedSettings:'layers',regionOptions:'map',endpointCoordinates:'location',routeDetails:'clock',imageDetails:'satellite',reviewDetails:'report',surfaceDetails:'image',missionDetails:'science',terrain3dDetails:'database'};
 const metricIcons={'Planned distance':'distance','Walking duration':'clock','Route checkpoints':'location','Scientific candidates':'science','Terrain indicator':'hazard','Data coverage':'satellite'};
 function refresh(){
  for(const [id,name] of Object.entries(controls))decorate(document.getElementById(id),name);
  for(const [id,name] of Object.entries(disclosureIcons))decorate(document.querySelector('#'+id+' > summary'),name);
  for(const [selector,name] of [['.comparison-action','compare'],['.intelligence-heading h2','inspect'],['.workspace-heading h2','location']])decorate(document.querySelector(selector),name);
  for(const button of document.querySelectorAll('#missionPage .button')){const names={'Explore terrain':'terrain','Export route JSON':'download','Print / save PDF':'report','Inspect sources & provenance':'database'};const name=names[button.textContent.trim()];if(name)decorate(button,name);}
  for(const card of document.querySelectorAll('.mission-metric')){const label=card.querySelector('.metric-label');decorate(label,metricIcons[label?.textContent.trim()]||'elevation');}
  const page=document.getElementById('missionPage');
  if(page?.hidden===false&&document.body.dataset.section==='overview'&&!page.querySelector('.overview-quick-actions')){
   const actions=document.createElement('section');actions.className='overview-quick-actions';actions.setAttribute('aria-label','Mission shortcuts');
   for(const [section,glyph,title,description] of [['terrain','terrain','Explore the terrain','Navigate the map and compare 2D with 3D.'],['route','route','Plan a traverse','Choose endpoints and compare route alternatives.'],['science','inspect','Inspect the evidence','Examine checkpoint imagery, dates and sources.']]){
    const button=document.createElement('button');button.type='button';button.className='quick-action';button.append(icon(glyph,'shortcut-icon'));
    const text=document.createElement('span'),heading=document.createElement('strong'),detail=document.createElement('small');heading.textContent=title;detail.textContent=description;text.append(heading,detail);button.append(text,icon('arrow','shortcut-arrow'));button.onclick=()=>document.getElementById('nav-'+section).click();actions.append(button);
   }
   page.querySelector('.mission-page-header').after(actions);
  }
 }
 // Existing handlers occasionally replace button text. Restore decoration without
 // replacing elements, event listeners or accessible labels; no polling required.
 let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;refresh();});});
 observer.observe(document.querySelector('.workspace'),{childList:true,subtree:true});observer.observe(document.getElementById('missionPage'),{childList:true,subtree:true});refresh();
})();
