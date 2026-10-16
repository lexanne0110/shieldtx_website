/* Reference rising-light field: density 220, riseSpeed 12, opacity 48, scale 8. */
(() => {
  const host=document.querySelector('.closing');if(!host)return;
  const canvas=document.createElement('canvas');canvas.className='closing-particles';canvas.setAttribute('aria-hidden','true');host.prepend(canvas);
  const ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let width=0,height=0,visible=false,frame=0,last=0,lines=[],dots=[],seed=0xc0ffee;
  function random(){let t=seed=seed+0x6d2b79f5>>>0;t=Math.imul(t^t>>>15,1|t);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;}
  const spread=()=> {const x=random();return (x<.5?.5-Math.pow(random(),.65)*.5:.5+Math.pow(random(),.65)*.5)*width;},scale=8/7;
  const length=()=>Math.max(1,Math.floor((random()<.12?70+30*random():20+35*Math.pow(random(),.7))*scale));
  const dotSize=()=>(1.5+3.5*Math.pow(random(),1.8))*scale;
  function resize(){width=host.clientWidth;height=host.clientHeight;const dpr=Math.min(devicePixelRatio,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.floor(width*height*(innerWidth<=700?420:220)/320000);seed=0xc0ffee;
    lines=Array.from({length:Math.min(count,4000)},()=>{const p={x:spread(),y:(height-1)*(1-random()*.95),speed:10+40*random(),size:length()};random();random();return p;});
    dots=Array.from({length:Math.min(Math.floor(count*.3),1200)},()=>{const p={x:spread(),y:(height-1)*(1-random()*.95),speed:8+28*random(),size:dotSize()};random();random();return p;});draw(0);
  }
  function draw(dt){
    ctx.globalCompositeOperation='source-over';ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);ctx.globalCompositeOperation='lighter';
    const bottom=height-1,radius=40*scale;
    ctx.save();ctx.translate(width/2,bottom);ctx.scale(width*.5/radius,1);
    const horizon=ctx.createRadialGradient(0,0,0,0,0,radius);
    [[0,.22],[.35,.143],[.7,.044],[1,0]].forEach(([stop,a])=>horizon.addColorStop(stop,`rgba(161,161,170,${a})`));ctx.fillStyle=horizon;ctx.fillRect(-radius-2,-radius-2,(radius+2)*2,(radius+2)*2);ctx.restore();
    function advance(p,dot){p.y-=p.speed*2.2*dt;if(p.y<-(dot?2*p.size:p.size)){p.x=spread();p.y=bottom-10*random();p.speed=dot?8+28*random():10+40*random();p.size=dot?dotSize():length();}const progress=Math.max(0,Math.min(1,(bottom-p.y)/Math.max(1,bottom)));return(progress<.2?progress/.2:Math.max(0,1-(progress-.2)/.8))*(innerWidth<=700?.65:.48);}
    for(const p of dots){const alpha=advance(p,true);if(alpha<.01)continue;const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);g.addColorStop(0,`rgba(228,228,231,${alpha})`);g.addColorStop(.4,`rgba(228,228,231,${alpha*.45})`);g.addColorStop(1,'rgba(228,228,231,0)');ctx.fillStyle=g;ctx.fillRect(p.x-p.size,p.y-p.size,2*p.size,2*p.size);if(p.size>2.5){ctx.fillStyle=`rgba(255,255,255,${alpha})`;ctx.fillRect(Math.floor(p.x),Math.floor(p.y),1,1);}}
    for(const p of lines){const alpha=advance(p,false);if(alpha<.01)continue;const y=Math.floor(p.y),g=ctx.createLinearGradient(0,y,0,y+p.size);g.addColorStop(0,'rgba(228,228,231,0)');g.addColorStop(.7,`rgba(228,228,231,${alpha})`);g.addColorStop(1,`rgba(228,228,231,${alpha})`);ctx.fillStyle=g;ctx.fillRect(Math.floor(p.x),y,1,p.size);}
  }
  function tick(now){frame=0;if(!visible||document.hidden||reduced.matches)return;draw(last?Math.min((now-last)/1000,.05):0);last=now;frame=requestAnimationFrame(tick);}
  function start(){if(visible&&!document.hidden&&!reduced.matches&&!frame){last=0;frame=requestAnimationFrame(tick);}}
  new ResizeObserver(resize).observe(host);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;start();}).observe(host);document.addEventListener('visibilitychange',start);reduced.addEventListener('change',start);
})();
