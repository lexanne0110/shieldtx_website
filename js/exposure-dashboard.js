(() => {
  const root=document.querySelector('#problem');if(!root)return;
  // v2 (user, 2026-10-13): pinned scroll story. The four public-footprint rows replace the
  // dashboard tabs; scrolling through the section lights each row in turn and highlights
  // its radar label. Rows (and radar labels) are clickable: on the pinned layout they
  // scroll to their step so click and scroll stay in sync. No pin on phones / reduced motion.
  const rows=[...root.querySelectorAll('.exposure-row')],labels=[...root.querySelectorAll('[data-exposure-label]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const pinned=matchMedia('(min-width: 701px) and (prefers-reduced-motion: no-preference)');
  let current=null;
  function select(key){
    if(key===current)return;current=key;
    rows.forEach(row=>{const on=row.dataset.exposure===key;row.setAttribute('aria-pressed',String(on));row.parentElement.classList.toggle('is-active',on);});
    labels.forEach(label=>label.setAttribute('aria-pressed',String(label.dataset.exposureLabel===key)));
  }
  const travel=()=>Math.max(1,root.offsetHeight-innerHeight);
  function fromScroll(){
    if(!pinned.matches||!rows.length)return;
    const p=Math.max(0,Math.min(.9999,-root.getBoundingClientRect().top/travel()));
    select(rows[Math.floor(p*rows.length)].dataset.exposure);
  }
  let queued=0;
  addEventListener('scroll',()=>{if(!queued)queued=requestAnimationFrame(()=>{queued=0;fromScroll();});},{passive:true});
  addEventListener('resize',fromScroll);pinned.addEventListener('change',fromScroll);
  function go(i){
    if(!pinned.matches){select(rows[i].dataset.exposure);return;}
    const top=root.getBoundingClientRect().top+scrollY+travel()*(i+.5)/rows.length;
    scrollTo({top,behavior:reduced.matches?'instant':'smooth'});
  }
  rows.forEach((row,i)=>row.addEventListener('click',()=>go(i)));
  labels.forEach(label=>label.addEventListener('click',()=>{const i=rows.findIndex(r=>r.dataset.exposure===label.dataset.exposureLabel);if(i>-1)go(i);}));
  if(rows.length)select(rows[0].dataset.exposure);
  fromScroll();
  const svg=root.querySelector('.exposure-threat-rays'),ns='http://www.w3.org/2000/svg';
  const rayLabels=['COPY BOTS','MEDIA DESKS','WALLET TRACKING','PNL SCRUTINY','POSITION WATCHERS','STRATEGY MIRRORING','LIQUIDATION ALERTS','REPUTATION EXPOSURE'];
  const origins=[[87,168],[544,353],[402,71],[115,468],[528,197],[52,326],[393,531],[206,67]];
  const create=(tag,attrs)=>{let el=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;};
  const rays=origins.map(([x,y],i)=>{const a=Math.atan2(y-300,x-300);x=300+296*Math.cos(a);y=300+296*Math.sin(a);let group=create('g',{opacity:0}),path=create('path',{fill:'none'}),dot=create('circle',{r:2}),text=create('text',{x,y:y-13,'text-anchor':x>480?'end':x<110?'start':'middle'});text.textContent=rayLabels[i];group.append(path,dot,text);svg.append(group);return{group,path,dot,x,y};});
  let visible=false,frame=0,elapsed=0,last=0;
  const clamp=n=>Math.max(0,Math.min(1,n));
  function draw(seconds){rays.forEach((r,i)=>{const age=(seconds-i*.88)%7.04,live=reduced.matches?i<3:age>=0&&age<2.3;if(!live){r.group.setAttribute('opacity',0);return;}const f=reduced.matches?1:clamp(age/1.75),alpha=reduced.matches?.4:clamp(age/.22)*clamp((2.3-age)/.45);const dx=300-r.x,dy=300-r.y,d=Math.hypot(dx,dy),x=r.x+(dx-dx/d*52)*f,y=r.y+(dy-dy/d*52)*f;r.path.setAttribute('d',`M${r.x} ${r.y}L${x} ${y}`);r.dot.setAttribute('cx',x);r.dot.setAttribute('cy',y);r.group.setAttribute('opacity',alpha);});}
  function tick(now){frame=0;if(!visible||document.hidden||reduced.matches)return;if(last)elapsed+=Math.min(80,now-last)/1000;last=now;draw(elapsed);frame=requestAnimationFrame(tick);}
  function start(){if(reduced.matches){draw(0);return;}if(visible&&!document.hidden&&!frame){last=0;frame=requestAnimationFrame(tick);}}
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;root.classList.toggle('exposure-paused',!visible);start();},{threshold:.1}).observe(svg);
  document.addEventListener('visibilitychange',start);reduced.addEventListener('change',start);draw(0);
})();
