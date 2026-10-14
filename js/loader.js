/* ShieldTX · opening loader — logic ported verbatim from the Whales deck intro
   (ShieldTX Presentation - Whales/deck/js/intro.js). Loaded right after its markup,
   without defer, so it starts before the page paints underneath it. */
(function () {
  'use strict';
  const intro = document.querySelector('.site-loader');
  if (!intro) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !intro.animate) {
    intro.classList.add('done'); return;
  }
  const arrive = intro.querySelector('.site-loader-arrive');
  const bands = [...intro.querySelectorAll('.site-loader-band')];

  /* The mark divides into seven equal bands; four are the logo. From the Figma path. */
  const TOP = 13.1265, BAND = 10.5353;
  const clipFor = (n, span, bleed) => {
    const t = TOP + n * BAND;
    const b = 100 - (t + BAND * span) - (bleed ? 0.14 : 0);
    return `inset(${t.toFixed(4)}% 0% ${b.toFixed(4)}% 0%)`;
  };
  const MECH = 'cubic-bezier(.65,.02,.18,1)';
  const OPEN = 'cubic-bezier(.36,.02,.2,1)';
  const EXPO = 'cubic-bezier(.16,1,.3,1)';

  const A  = (el, kf, o) => el.animate(kf, { fill: 'both', ...o });
  /* Act 3 must use fill:'forwards' — a later backwards fill would erase Act 2. */
  const AF = (el, kf, o) => el.animate(kf, { fill: 'forwards', ...o });

  intro.style.animation = 'none';   // JS is running: drop the CSS failsafe

  // Act 1 — the solid shield arrives
  A(arrive, [{ opacity: 0, transform: 'translateY(1.4%) scale(.95)' },
             { opacity: 1, transform: 'none' }],
    { duration: 520, delay: 80, easing: EXPO });

  bands.forEach((el, i) => {
    const n = i * 2;                         // logo bands are 0, 2, 4, 6
    el.style.clipPath = clipFor(n, 1);
    el.style.transformOrigin = `50% ${(TOP + n * BAND).toFixed(4)}%`;
    // Act 2 — contract from two bands to one: solid → logomark
    if (n !== 6) {
      A(el, [{ clipPath: clipFor(n, 2, true) }, { clipPath: clipFor(n, 1) }],
        { duration: 500, delay: 640 + i * 54, easing: MECH });
    }
    // Act 3 — alternating shutter: same top hinge, alternating direction
    const dir = (i % 2 === 1) ? 88 : -88;
    AF(el, [{ transform: 'rotateX(0deg)', opacity: 1 },
            { transform: `rotateX(${dir}deg)`, opacity: .10 }],
       { duration: 940, delay: 1560 + i * 92, easing: OPEN });
  });

  A(intro, [{ opacity: 1 }, { opacity: 0 }], { duration: 680, delay: 2120, easing: OPEN })
    .onfinish = () => intro.classList.add('done');
})();
