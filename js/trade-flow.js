/* Scroll the first transaction; subsequent transactions use the same timeline. */
(() => {
  const section=document.querySelector('#how-it-works');
  if(!section)return;
  const $=s=>section.querySelector(s), $$=s=>[...section.querySelectorAll(s)];
  const diagram=$('.flow-diagram'),sticky=$('.flow-sticky'),token=$('.flow-token');
  const hasReturn=()=>innerWidth>700, endTime=()=>hasReturn()?11.8:9.4;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const nodes=$$('[data-node]'),buttons=$$('[data-step]'),routes=$$('.trade-routes > path:not(.trade-return)'),returnRoute=$('.trade-return');
  const flap=$('#fund-wallet .wallet-flap'),clasp=$('#fund-wallet .wallet-clasp');
  const walletInner=$('#fund-wallet .wallet-back-inner'),walletCorner=$('#fund-wallet .wallet-corner'),walletDepth=$('#fund-wallet .wallet-depth');
  const current=$('.account-current'),placeholder=$('.account-placeholder'),history=$$('.account-history');
  const execution=$('#execution'),candles=$('#execution .candles'),chart=$('.chart-trace'),check=$('.execution-check'),plus=$('.new-plus');
  const seal=$('.mini-bank-seal'),accountLabel=$('.account-number');
  const copy=['Deposit USDC into your ShieldTX account to start trading.','ShieldTX separates your funding wallet from the accounts that trade.','New accounts are opened for each trade.','Execute on Hyperliquid using your new trading account.'];
  const clamp=v=>Math.max(0,Math.min(1,v)),ramp=(t,a,b)=>clamp((t-a)/(b-a));
  // Start time of each step; a tab click jumps here and the trade carries on from there.
  const STEP_STARTS=[0,3,5.2,7.8];
  const smooth=v=>v*v*(3-2*v),lerp=(a,b,t)=>a+(b-a)*t;
  let completed=false,trade=1,time=0,last=0,frame=0,visible=false,pinned=null,centers=[],curve=[],curveLength=0;
  let waitingFromBelow=false;
  let runway=0,start=0,span=1,pinTop=100,pinnedLayout=false,lastStage=-1,lastCopy='';
  let viewportWidth=innerWidth,viewportHeight=innerHeight;
  const setOpacity=(el,value)=>{if(el)el.style.opacity=String(value);};
  function showCopy(message){
    if(message===lastCopy)return;
    const host=$('#step-copy'),previous=host.lastElementChild;
    // Keep only the outgoing and incoming text, even during rapid step changes.
    [...host.children].forEach(child=>{if(child!==previous)child.remove();});
    if(!previous)host.textContent='';
    const incoming=document.createElement('span');incoming.textContent=message;
    host.append(incoming);lastCopy=message;
    if(reduced.matches){previous?.remove();return;}
    incoming.animate([{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:440,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'});
    if(previous){previous.getAnimations().forEach(a=>a.cancel());previous.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-4px)'}],{duration:240,easing:'ease-out',fill:'forwards'}).finished.then(()=>previous.remove()).catch(()=>{});}
  }
  function render(t){
    const fade=1-ramp(t,endTime()+.8,endTime()+1.4),stage=t<3?0:t<5.2?1:t<7.8?2:3;
    diagram.dataset.phase=t<9.4?['fund','shield','create','execute'][stage]:t<endTime()?'return':'complete';
    diagram.dataset.flowTime=t.toFixed(3);diagram.dataset.trade=String(trade);
    const chosen=pinned??stage;
    if(chosen!==lastStage){lastStage=chosen;nodes.forEach((n,i)=>n.classList.toggle('is-active',i===chosen));buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===chosen)));$('#step-count').textContent=`0${chosen+1} / 04`;}
    const message=pinned===null&&t>=endTime()?'Trade complete. A fresh wallet will be created for the next trade.':pinned===null&&t>=9.4?'Closing proceeds return to your ShieldTX balance.':copy[chosen];
    showCopy(message);
    // 1. the latch flips up off the cover; 2. the cover swings a little toward the viewer on its
    // spine (x=-47), so the inside shows in the gap on the right; closing reverses both steps.
    // Oblique projection: across the cover is (1, -18/95), toward the viewer is (.45, .55).
    const latch=smooth(ramp(t,.1,.45))*(1-smooth(ramp(t,2.75,3)));
    const opened=smooth(ramp(t,.45,1))*(1-smooth(ramp(t,2.2,2.7)));
    const swing=opened*40*Math.PI/180,cs=Math.cos(swing),sn=Math.sin(swing);
    const cover=`translate(-47 0) matrix(${cs+.45*sn} ${-18/95*(cs-1)+.55*sn} 0 1 0 0) translate(47 0)`;
    flap.setAttribute('transform',cover);
    clasp.setAttribute('transform',`${cover} translate(35 -11) rotate(${-55*latch}) translate(-35 11)`);
    setOpacity(clasp,1);
    setOpacity(walletInner,opened);
    const edges=1-Math.min(1,opened*4);setOpacity(walletCorner,edges);setOpacity(walletDepth,1);
    const created=smooth(ramp(t,5.2,6.2))*fade;
    setOpacity(placeholder,(1-created)*.18);setOpacity(current,created);
    current.setAttribute('transform',`translate(0 ${(1-smooth(ramp(t,5.2,6.2)))*14-ramp(t,endTime()+.8,endTime()+1.4)*9})`);
    setOpacity(plus,ramp(t,5.8,6.2)*fade);
    history.forEach(el=>setOpacity(el,0));
    accountLabel.textContent=`ACCOUNT ${String(trade).padStart(2,'0')}`;
    setOpacity(execution,.36+.64*ramp(t,7.6,8.2)*fade);
    setOpacity(candles,.12+.88*ramp(t,7.8,8.4)*fade);
    chart.style.strokeDasharray='1';chart.style.strokeDashoffset=String(1-ramp(t,7.8,9));setOpacity(chart,ramp(t,7.8,8)*fade);
    setOpacity(check,ramp(t,9,9.4)*fade);
    routes.forEach((route,i)=>{const progress=ramp(t,[1,3.6,6.2][i],[3,5.2,7.8][i]);route.style.strokeDashoffset=String(1-progress);route.style.opacity=String(progress*.65*fade);route.style.markerEnd=progress===1?'url(#trade-arrow)':'none';});
    const returning=hasReturn()?ramp(t,9.4,11.8):0;
    returnRoute.style.strokeDashoffset=String(1-returning);returnRoute.style.opacity=String(returning*.85*fade);returnRoute.style.markerEnd=returning===1?'url(#trade-arrow)':'none';
    nodes.forEach((node,i)=>node.style.setProperty('--step-progress',String(ramp(t,[.3,3,5.2,7.8][i],[3,5.2,7.8,9.4][i])*fade)));
    const point=fundingPoint(ramp(t,1.2,3));
    if(point&&t<1.2)point.y=centers[0].y+8-52*smooth(ramp(t,.7,1.2));
    if(point){token.style.left=point.x+'px';token.style.top=point.y+'px';token.style.opacity=String(ramp(t,.7,1)*fade);}
    $('.trade-counter').textContent=`TRADE ${String(trade).padStart(2,'0')}`;
  }
  function fundingPoint(progress){
    if(!curve.length)return centers[0];
    const distance=progress*curveLength;let i=1;while(i<curve.length-1&&curve[i].d<distance)i++;
    const a=curve[i-1],b=curve[i],f=(distance-a.d)/(b.d-a.d||1);return {x:lerp(a.x,b.x,f),y:lerp(a.y,b.y,f)};
  }
  function measure(){
    const bounds=diagram.getBoundingClientRect();
    centers=nodes.map(n=>{const r=n.querySelector('.flow-art').getBoundingClientRect();return {x:r.left-bounds.left+r.width/2,y:r.top-bounds.top+r.height/2,w:r.width};});
    const artBox=nodes[0].querySelector('.flow-art').getBoundingClientRect();
    $('.trade-routes').setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
    routes.forEach((route,i)=>{const a=centers[i],b=centers[i+1];const gap=Math.abs(b.x-a.x);let d;
      if(Math.abs(a.y-b.y)<10){const dir=b.x>a.x?1:-1;const offset=Math.min(artBox.width*.36,gap*.3);d=`M${a.x+dir*offset} ${a.y}H${b.x-dir*offset}`;}
      else if(innerWidth<=700){const side=bounds.width-8,edge=Math.min(a.w*.34,48);d=`M${a.x+edge} ${a.y}H${side-8}Q${side} ${a.y} ${side} ${a.y+8}V${b.y-8}Q${side} ${b.y} ${side-8} ${b.y}H${b.x+edge}`;}
      else d=`M${a.x} ${a.y+55}V${(a.y+b.y)/2}H${b.x}V${b.y-55}`;
      route.setAttribute('d',d);route.setAttribute('pathLength','1');
    });
    const labels=nodes.map(n=>{const r=n.querySelector('h3').getBoundingClientRect();return {x:r.left-bounds.left+r.width/2,y:r.bottom-bounds.top+12};});
    const from=labels[3],to=labels[1],bottom=from.y+36;
    returnRoute.setAttribute('d',`M${from.x} ${from.y}V${bottom-8}Q${from.x} ${bottom} ${from.x-8} ${bottom}H${to.x+8}Q${to.x} ${bottom} ${to.x} ${bottom-8}V${to.y}`);returnRoute.setAttribute('pathLength','1');
    chart.setAttribute('pathLength','1');
    // Project the institution's coin center directly; hidden SVG group bounds are unreliable on iOS.
    const bankSVG=seal.ownerSVGElement,bankBounds=bankSVG.getBoundingClientRect(),view=bankSVG.viewBox.baseVal;
    const bankScale=Math.min(bankBounds.width/view.width,bankBounds.height/view.height);
    const bank={x:bankBounds.left-bounds.left+(bankBounds.width-view.width*bankScale)/2+(140-view.x)*bankScale,y:bankBounds.top-bounds.top+(bankBounds.height-view.height*bankScale)/2+(139-view.y)*bankScale};
    const a={...centers[0],y:centers[0].y-44},b=bank,lift=innerWidth>700?80:48;curve=[];curveLength=0;
    for(let i=0;i<=100;i++){const u=i/100,v=1-u;const x=v*v*v*a.x+3*v*v*u*(a.x+12)+3*v*u*u*(b.x-48)+u*u*u*b.x,y=v*v*v*a.y+3*v*v*u*(a.y-lift)+3*v*u*u*(b.y-lift*.7)+u*u*u*b.y;const prev=curve[i-1];if(prev)curveLength+=Math.hypot(x-prev.x,y-prev.y);curve.push({x,y,d:curveLength});}
    pinTop=16;
    const css=getComputedStyle(section),padding=parseFloat(css.paddingTop)+parseFloat(css.paddingBottom),height=sticky.offsetHeight;
    // Keep the card's bottom visible even when the section is taller than the viewport.
    pinTop=Math.min(pinTop,viewportHeight-height-16);
    diagram.dataset.viewportHeight=String(viewportHeight);
    pinnedLayout=!completed&&!reduced.matches;
    runway=pinnedLayout?Math.max(800,viewportHeight*1.2):0;
    section.classList.toggle('flow-scroll-story',pinnedLayout);section.style.setProperty('--flow-pin-top',pinTop+'px');
    section.style.minHeight=pinnedLayout?(height+padding+runway)+'px':'';
    const sectionTop=section.getBoundingClientRect().top+scrollY;
    start=pinnedLayout?sectionTop+parseFloat(css.paddingTop)-pinTop:bounds.top+scrollY-viewportHeight*.68;
    span=pinnedLayout?runway:Math.max(360,bounds.height+viewportHeight*.3);
    render(time);
  }
  function finishFirst(keepScroll=true){
    if(completed)return;completed=true;time=endTime();render(time);diagram.dataset.firstTrade='complete';$('.flow-mode').textContent='CONTINUOUS TRADES';
    if(pinnedLayout){const before=sticky.getBoundingClientRect().top;section.classList.remove('flow-scroll-story');section.style.minHeight='';const shift=sticky.getBoundingClientRect().top-before;if(keepScroll)window.scrollBy({top:shift,behavior:'instant'});}
    measure();schedule();
  }
  function onScroll(){
    if(completed||reduced.matches||window.shieldScrollRestoring)return;
    if(waitingFromBelow){if(scrollY>start)return;waitingFromBelow=false;}
    // The first pass cannot leave its sticky runway before the first trade finishes executing.
    if(scrollY>start+span)window.scrollTo({top:start+span,behavior:'instant'});
    const progress=clamp((scrollY-start)/span);
    time=(progress>.998?1:progress)*endTime();
    render(time);
    if(progress>.998)finishFirst();
  }
  function tick(now){
    frame=0;if(!completed||document.hidden||reduced.matches)return;
    const dt=last?Math.min(now-last,80)/1000:0;last=now;
    if(!visible)return;
    time+=dt;
    if(time>=endTime()+1.6){time-=endTime()+1.6;trade++;}
    render(time);frame=requestAnimationFrame(tick);
  }
  function schedule(){
    if(document.hidden||reduced.matches||frame)return;
    if(completed&&visible){last=0;frame=requestAnimationFrame(tick);}
  }
  buttons.forEach((button,i)=>button.addEventListener('click',()=>{
    if(!completed)finishFirst();
    pinned=null;$('.flow-replay').hidden=true;time=STEP_STARTS[i];
    render(time);schedule();
  }));
  $('.flow-replay').addEventListener('click',()=>{pinned=null;$('.flow-replay').hidden=true;render(time);schedule();});
  $('.flow-caption').setAttribute('aria-live','off');
  diagram.dataset.firstTrade=completed||reduced.matches?'complete':'scroll';
  if(completed){time=0;$('.flow-mode').textContent='CONTINUOUS TRADES';}
  if(reduced.matches){completed=true;time=endTime()+.4;$('.flow-mode').textContent='TRADE FLOW';}
  measure();onScroll();
  // In-page link to a section below (js/site.js): skip the first-trade runway so the
  // scroll isn't held here, and collapse it before site.js measures the target.
  addEventListener('shield-hash-jump',event=>{const el=event.detail;if(!completed&&el&&el.compareDocumentPosition(section)&Node.DOCUMENT_POSITION_PRECEDING)finishFirst(false);});
  addEventListener('shield-scroll-restored',()=>{measure();waitingFromBelow=scrollY>start+span;onScroll();});
  let scrollFrame=0;
  addEventListener('scroll',()=>{if(!scrollFrame)scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;onScroll();});},{passive:true});
  // Safari/Chrome address bars resize the viewport during a swipe. Keep the first
  // trade's runway stable; remeasure on orientation/width or substantial size changes.
  let resizePending;
  addEventListener('resize',()=>{
    if(innerWidth===viewportWidth&&Math.abs(innerHeight-viewportHeight)<180)return;
    clearTimeout(resizePending);resizePending=setTimeout(()=>{
      viewportWidth=innerWidth;viewportHeight=innerHeight;measure();onScroll();
    },120);
  });
  document.fonts.ready.then(()=>{measure();onScroll();});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.05}).observe(diagram);
  document.addEventListener('visibilitychange',schedule);
  reduced.addEventListener('change',()=>{if(reduced.matches){completed=true;time=endTime()+.4;diagram.dataset.firstTrade='complete';section.classList.remove('flow-scroll-story');section.style.minHeight='';$('.flow-mode').textContent='TRADE FLOW';render(time);}else{$('.flow-mode').textContent='CONTINUOUS TRADES';schedule();}measure();});
})();
