/* Restore this tab's reading position on reload, after layout and fonts settle. */
(() => {
  const key='shieldtx-reading-position';
  let saved=null,ready=false;
  try{if(performance.getEntriesByType('navigation')[0]?.type==='reload')saved=JSON.parse(sessionStorage.getItem(key)||'null');}catch{}
  window.shieldScrollResume=saved;
  window.shieldScrollRestoring=Boolean(saved);
  if(saved)history.scrollRestoration='manual';
  function remember(){
    if(!ready)return;
    try{
      const sections=[...document.querySelectorAll('main > section')];
      const section=sections.find(el=>el.getBoundingClientRect().bottom>innerHeight*.2);
      sessionStorage.setItem(key,JSON.stringify({y:scrollY,section:section?.id|| (section?.classList.contains('closing')?'closing':null),offset:section?-section.getBoundingClientRect().top:0}));
    }catch{}
  }
  addEventListener('load',async()=>{
    await document.fonts.ready;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(saved&&Number.isFinite(saved.y)){
        const section=saved.section==='closing'?document.querySelector('.closing'):document.getElementById(saved.section||'');
        const top=section?section.getBoundingClientRect().top+scrollY+(saved.section==='how-it-works'?0:saved.offset||0):saved.y;
        scrollTo({top,behavior:'instant'});
      }
      window.shieldScrollRestoring=false;
      dispatchEvent(new Event('shield-scroll-restored'));
      ready=true;
      history.scrollRestoration='auto';
      remember();
    }));
  },{once:true});
  addEventListener('pagehide',remember);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)remember();});
  let pending;
  addEventListener('scroll',()=>{clearTimeout(pending);pending=setTimeout(remember,120);},{passive:true});
})();
