/* Browser-local first-visit guidance; never changes route or scientific state. */
'use strict';
(()=>{
 const key='aresTrail:onboarding:v1',$=id=>document.getElementById(id);
 function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;}
 function remember(value){try{localStorage.setItem(key,value);}catch{/* Guidance still works when browser storage is unavailable. */}}
 function seen(){try{return !!localStorage.getItem(key);}catch{return false;}}
 const welcome=el('dialog','welcome-dialog');welcome.id='welcomeDialog';welcome.setAttribute('aria-labelledby','welcomeTitle');welcome.setAttribute('aria-describedby','welcomeDescription');
 const close=el('button','welcome-close','×');close.type='button';close.setAttribute('aria-label','Skip introduction');
 const title=el('h2','','Your first Marswalk starts here');title.id='welcomeTitle';const description=el('p','','Explore real Mars terrain, plan a candidate route, and inspect the observations behind it.');description.id='welcomeDescription';
 const facts=el('ol','welcome-steps');for(const [label,text] of [['Choose a region','Start with detailed Jezero terrain.'],['Plan a traverse','Set endpoints and compare alternatives.'],['Inspect the evidence','Review imagery, measurements and sources.']]){const item=el('li');item.append(el('strong','',label),el('span','',text));facts.append(item);}
 const actions=el('div','welcome-actions'),start=el('button','button primary','Show me around'),skip=el('button','button subtle','Skip and explore');start.id='startGuide';start.autofocus=true;skip.id='skipGuide';start.type=skip.type='button';actions.append(start,skip);
 const intro=el('div','welcome-intro');intro.setAttribute('aria-label','Illustrative spacecraft landing animation, not NASA footage');intro.innerHTML='<svg viewBox="0 0 430 110" role="img" aria-label="Illustrative landing above a Martian horizon"><path class="intro-surface" d="M0 99Q90 67 170 87T430 82V110H0Z"/><path class="intro-orbit" d="M18 77Q110 13 270 57"/><g class="intro-stars"><circle cx="30" cy="18" r="1"/><circle cx="126" cy="30" r="1"/><circle cx="360" cy="20" r="1"/><circle cx="395" cy="47" r="1"/></g><g class="intro-lander"><path class="intro-flame" d="m277 60 5 19 5-19Z"/><path d="m274 49 8-13 8 13v17h-16zM274 59l-8 18m24-18 8 18M262 77h9m22 0h9M278 52h8"/></g><circle class="intro-beacon" cx="282" cy="84" r="5"/></svg>';intro.append(el('span','','ILLUSTRATIVE ARRIVAL · YOUR MISSION STARTS HERE'));
 welcome.append(close,intro,el('span','eyebrow','WELCOME TO ARES TRAIL'),title,description,facts,actions,el('small','welcome-note','About two minutes. Your choice is remembered on this browser.'));
 document.body.append(welcome);
 const help=el('button','button subtle guide-button','Guide');help.id='guideBtn';help.type='button';help.setAttribute('aria-label','Open site guidance');help.title='Replay the getting-started guide';const mark=el('span','guide-mark','i');mark.setAttribute('aria-hidden','true');help.prepend(mark);document.querySelector('.topbar').insertBefore(help,document.querySelector('.operator-menu'));
 const ring=el('div','guide-highlight');ring.hidden=true;ring.setAttribute('aria-hidden','true');document.body.append(ring);
 const card=el('section','guide-card');card.id='guideCard';card.hidden=true;card.setAttribute('role','dialog');card.setAttribute('aria-modal','false');card.setAttribute('aria-labelledby','guideTitle');card.setAttribute('aria-describedby','guideDescription');
 const progress=el('p','guide-progress');progress.setAttribute('aria-live','polite');const heading=el('h2');heading.id='guideTitle';const body=el('p');body.id='guideDescription';const controls=el('div','guide-controls'),exit=el('button','text-button','Exit tour'),back=el('button','button subtle','Back'),next=el('button','button primary','Next');exit.id='exitGuide';back.id='guideBack';next.id='guideNext';for(const button of [exit,back,next])button.type='button';controls.append(exit,back,next);card.append(progress,heading,body,controls);document.body.append(card);
 const steps=[
  {nav:'terrain',target:'#regionPreset',title:'1. Choose your exploration region',text:'Jezero has detailed terrain for this prototype. Gale, Olympus Mons and custom coordinates use a much coarser regional model. Select a place, then choose Open location.'},
  {nav:'route',open:'planningTools',target:'#destinationPicker',title:'2. Find destinations and save planning pins',text:'Destination shortcuts label the real landing coordinate, example points and DEM-derived candidates. Drop a pin on the map to bookmark your own location. Pins do not confirm science value or route access.'},
  {nav:'route',open:'coordinatePlanning',target:'#planningLat',title:'3. Set endpoints your way',text:'Use Change beside A or B and click the map, or enter exact coordinates here. Swap A / B reverses the endpoints for a new one-way plan. Right-click the map for location actions. Escape cancels map selection.'},
  {nav:'route',target:'#safeBtn',title:'4. Plan and compare routes',text:'Plan route calculates a terrain-aware candidate. Compare two routes adds the distance-focused alternative. Review distance, slope and ascent; these are not safety ratings.'},
  {nav:'settings',target:'#w1',title:'5. Adjust slope avoidance',text:'Higher slope avoidance gives sloped cells a larger routing cost. Lower values put less emphasis on this factor. It does not change the 20-degree exclusion policy. Changing preferences clears the old route; plan again to apply them.'},
  {nav:'settings',target:'#w2',title:'6. Adjust relief avoidance',text:'Relief is a local elevation-residual measure, not total ascent or a measured energy cost. Higher relief avoidance favors lower residual values. Default, Lower slopes and Lower relief presets offer starting weights, not validated safety policies.'},
  {nav:'settings',target:'#l_haz',title:'7. Control what the map shows',text:'Toggle imagery, elevation, derived slope, coverage, observations, exclusions, candidates and planning places. Availability depends on the region. Hiding exclusions does not disable route constraints.'},
  {nav:'terrain',target:'#storyBtn',title:'8. Look around a checkpoint',text:'Select a numbered route marker or Inspect a checkpoint. The Inspect panel shows available images, terrain measurements and observation dates. Expand inspection notes to record your reasoning. Place markers are separate from route checkpoints.'},
  {nav:'terrain',target:'#terrain3dBtn',title:'9. Explore the terrain in 3D',text:'Switch between Map and 3D view. In 3D, drag to rotate and scroll or pinch to zoom. Choose elevation colors or available CTX imagery. Vertical exaggeration changes the display, not route measurements.'},
  {nav:'terrain',target:'#terrainProfile > summary',title:'10. Read the terrain profiles',text:'Expand the bottom panel for elevation and sampled mean slope along the active route. These profiles use the loaded terrain grid. Fine rocks and small hazards between samples remain unresolved.'},
  {nav:'terrain',target:'#sourcesBtn',title:'11. Check what the data can tell you',text:'Sources identifies the active NASA products and their limitations. REAL DATA, DERIVED and POLICY badges separate observations, calculations and assumptions. Missing coverage is not filled with invented evidence.'},
  {nav:'reports',target:'.page-actions',title:'12. Save your mission plan',text:'Mission Reports brings together the route, checkpoints and assumptions. Export route JSON or print to PDF. Saved planning pins are included in JSON. Export inspection notes before reloading or replanning. Replay this guide anytime using Guide.'}
 ];
 let index=-1,target=null,frame=null;
 function unmark(){if(target){target.removeAttribute('data-guide-target');target=null;}}
 function position(){frame=null;if(index<0||!target?.isConnected)return;const r=target.getBoundingClientRect();ring.style.cssText=`left:${Math.max(3,r.left-5)}px;top:${Math.max(3,r.top-5)}px;width:${Math.min(innerWidth-6,r.width+10)}px;height:${r.height+10}px;`;
  card.classList.toggle('guide-card-top',r.top>innerHeight*.5);
 }
 function schedule(){if(index>=0&&frame===null)frame=requestAnimationFrame(position);}
 function stop(value='skipped'){if(index<0)return;remember(value);index=-1;unmark();card.hidden=ring.hidden=true;if(frame!==null){cancelAnimationFrame(frame);frame=null;}help.focus({preventScroll:true});}
 card.dataset.stepCount=String(steps.length);
 function showStep(value){unmark();index=value;const step=steps[index];$('nav-'+step.nav).click();if(step.open){const planning=$('planningTools'),details=$(step.open);if(planning)planning.open=true;if(details)details.open=true;}target=document.querySelector(step.target);progress.textContent=`QUICK START · STEP ${index+1} OF ${steps.length}`;heading.textContent=step.title;body.textContent=step.text+(target?'':' This control is unavailable while map or data resources are missing.');back.disabled=index===0;next.textContent=index===steps.length-1?'Finish':'Next';card.hidden=false;ring.hidden=!target;
  if(target){target.dataset.guideTarget='true';target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});}position();next.focus({preventScroll:true});
 }
 function dismiss(){remember('skipped');welcome.close();}
 start.onclick=()=>{remember('started');welcome.close();showStep(0);};skip.onclick=close.onclick=dismiss;
 welcome.addEventListener('cancel',()=>remember('skipped'));welcome.addEventListener('click',event=>{if(event.target===welcome){const r=welcome.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dismiss();}});
 exit.onclick=()=>stop();back.onclick=()=>{if(index>0)showStep(index-1);};next.onclick=()=>{if(index===steps.length-1)stop('completed');else showStep(index+1);};
 help.onclick=()=>{stop();if(!welcome.open)welcome.showModal();};
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&index>=0)stop();});window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);
 // If another workspace is selected during a step, end guidance gracefully.
 document.querySelector('.mission-navigation').addEventListener('click',event=>{if(event.isTrusted&&index>=0&&event.target.closest('button'))stop();});
 window.addEventListener('pagehide',()=>{if(frame!==null)cancelAnimationFrame(frame);});
 if(!seen())welcome.showModal();
})();
