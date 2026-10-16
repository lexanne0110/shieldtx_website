(() => {
 'use strict';
 const section=document.querySelector('#shieldtx');
 if(!section)return;
 // v2: the protection-steps pop-up and its trigger were removed; the steps
 // are an inline section (#steps). Only the laptop scroll story remains.
 if(!window.gsap||!window.ScrollTrigger)return;
 gsap.registerPlugin(ScrollTrigger);
 const stage=section.querySelector('.shieldtx-stage');
 new IntersectionObserver(entries=>stage.classList.toggle('is-in-view',entries[0].isIntersecting),{threshold:.05}).observe(stage);
 const laptop=section.querySelector('.shieldtx-photo');
 const heading=section.querySelector('.shieldtx-heading');
 gsap.matchMedia().add('(prefers-reduced-motion: no-preference)',()=>{
  gsap.fromTo(heading,{translateY:32},{translateY:0,ease:'none',scrollTrigger:{trigger:section,start:'top 90%',end:'top top',scrub:.45}});
  gsap.fromTo(laptop,{opacity:0},{opacity:1,ease:'none',scrollTrigger:{trigger:section,start:'top 75%',end:'top top',scrub:.45}});
  // Enlarge the complete laptop gently, keeping the keyboard inside the viewport.
  const metrics=()=>{
   const room=stage.clientHeight;
   const scale=Math.max(1,Math.min(1.22,(stage.clientWidth-64)/laptop.clientWidth,(room-100)/laptop.clientHeight));
   return {scale,y:room/2-laptop.offsetTop-laptop.clientHeight*scale/2};
  };
  const timeline=gsap.timeline({scrollTrigger:{trigger:section,start:'top top',end:'bottom bottom',scrub:.7,invalidateOnRefresh:true}});
  timeline.to(heading,{opacity:0,y:-24,duration:.22,ease:'none'},.06)
   .to(laptop,{scale:()=>metrics().scale,y:()=>metrics().y,duration:.76,ease:'power1.inOut'},.12)
   .to({}, {duration:.12},.88) // hold where the trigger used to fade in, keeping the scroll pacing
   .to({}, {duration:.15});
 });
 let refreshFrame;
 new ResizeObserver(()=>{cancelAnimationFrame(refreshFrame);refreshFrame=requestAnimationFrame(()=>ScrollTrigger.refresh());}).observe(document.querySelector('#how-it-works'));
 // v2: the demo video plays on the laptop screen; refresh once its size is known.
 const media=section.querySelector('.product-video');
 const refreshScreen=()=>requestAnimationFrame(()=>ScrollTrigger.refresh());
 if(!media||media.readyState>=1)refreshScreen();else media.addEventListener('loadedmetadata',refreshScreen,{once:true});
 addEventListener('pageshow',refreshScreen);
 document.fonts.ready.then(()=>ScrollTrigger.refresh());
})();
