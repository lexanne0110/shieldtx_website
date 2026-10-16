/* Copy buttons for colour values. Each colour <code> gets a small copy button.
   Copies data-copy when present, otherwise the first value in the code text
   (e.g. "#040405 · --canvas" copies "#040405"). */
(function () {
  'use strict';
  const COLOUR = /(#[0-9a-f]{3,8}\b|rgba?\([^)]*\))/i;
  const ICON_COPY = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="2"/><path d="M10.5 5.5v-1a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1"/></svg>';
  const ICON_DONE = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m3.5 8.5 3 3 6-7"/></svg>';

  function write(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const t = document.createElement('textarea');
    t.value = text; t.setAttribute('readonly', ''); t.className = 'copy-buffer';
    document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove();
    return Promise.resolve();
  }

  document.querySelectorAll('.swatch code, .brand-hero code, .spec code').forEach(code => {
    const value = code.dataset.copy || (code.textContent.match(COLOUR) || [])[0];
    if (!value) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'copy';
    btn.setAttribute('aria-label', 'Copy ' + value); btn.title = 'Copy ' + value;
    btn.innerHTML = ICON_COPY;
    btn.addEventListener('click', () => {
      write(value).then(() => {
        btn.innerHTML = ICON_DONE; btn.classList.add('done');
        clearTimeout(btn._t);
        btn._t = setTimeout(() => { btn.innerHTML = ICON_COPY; btn.classList.remove('done'); }, 1400);
      });
    });
    code.after(btn);
    code.parentElement.classList.add('has-copy');
  });
})();

/* Loader demo — the website opening loader (dist/loader.js), played inside a stage.
   Plays when scrolled into view and on Replay. Final frame holds the logomark. */
(function () {
  'use strict';
  const stage = document.querySelector('[data-loader-demo]');
  if (!stage || !stage.animate) return;
  const arrive = stage.querySelector('.loader-arrive');
  const bands = [...stage.querySelectorAll('.loader-band')];
  const TOP = 13.1265, BAND = 10.5353;
  const clipFor = (n, span, bleed) => {
    const t = TOP + n * BAND, b = 100 - (t + BAND * span) - (bleed ? 0.14 : 0);
    return `inset(${t.toFixed(4)}% 0% ${b.toFixed(4)}% 0%)`;
  };
  const MECH = 'cubic-bezier(.65,.02,.18,1)', OPEN = 'cubic-bezier(.36,.02,.2,1)', EXPO = 'cubic-bezier(.16,1,.3,1)';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function reset() {
    [arrive, ...bands].forEach(el => el.getAnimations().forEach(a => a.cancel()));
    bands.forEach((el, i) => { const n = i * 2; el.style.clipPath = clipFor(n, 1); el.style.transformOrigin = `50% ${(TOP + n * BAND).toFixed(4)}%`; });
  }
  function play() {
    reset();
    if (reduced) return;                       // static logomark only
    const A = (el, kf, o) => el.animate(kf, { fill: 'both', ...o });
    const AF = (el, kf, o) => el.animate(kf, { fill: 'forwards', ...o });
    A(arrive, [{ opacity: 0, transform: 'translateY(1.4%) scale(.95)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 80, easing: EXPO });
    bands.forEach((el, i) => {
      const n = i * 2;
      if (n !== 6) A(el, [{ clipPath: clipFor(n, 2, true) }, { clipPath: clipFor(n, 1) }], { duration: 500, delay: 640 + i * 54, easing: MECH });
      const dir = (i % 2 === 1) ? 88 : -88;
      AF(el, [{ transform: 'rotateX(0deg)', opacity: 1 }, { transform: `rotateX(${dir}deg)`, opacity: .10 }], { duration: 940, delay: 1560 + i * 92, easing: OPEN });
    });
    // bring the mark back after the shutter so the stage never sits empty
    bands.forEach((el, i) => AF(el, [{ transform: 'rotateX(0deg)', opacity: 0 }, { transform: 'rotateX(0deg)', opacity: 1 }], { duration: 500, delay: 3300 + i * 60, easing: EXPO }));
  }
  reset();
  stage.querySelector('.loader-replay').addEventListener('click', play);
  new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { play(); o.disconnect(); } }, { threshold: .5 }).observe(stage);
})();
