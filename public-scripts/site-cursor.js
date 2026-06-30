/* =========================================================================
   ShieldTX — Site cursor

   A tiny brand-blue dot + thin outer ring follows the pointer. The dot
   tracks instantly; the ring lerps slightly behind for a subtle drift.
   On hover over interactive targets (buttons, links, inputs, [data-cursor]),
   the ring grows and fills with brand-blue-soft. On mousedown it snaps
   tight for a fraction of a second.

   Hidden on touch devices and when prefers-reduced-motion is set — the
   OS pointer continues to work normally in those cases.
   ========================================================================= */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (!hasFinePointer || reduceMotion) return;

  // Don't double-mount if the script is included twice by mistake.
  if (document.documentElement.dataset.shieldCursor === '1') return;
  document.documentElement.dataset.shieldCursor = '1';

  // Outlined-ring-only design: a single thin ring follows the pointer.
  // The .shield-cursor-dot element is kept in the DOM (hidden by CSS) so
  // we can swap designs without re-shipping JS.
  const dot = document.createElement('div');
  dot.className = 'shield-cursor-dot';
  dot.setAttribute('aria-hidden', 'true');

  const ring = document.createElement('div');
  ring.className = 'shield-cursor-ring';
  ring.setAttribute('aria-hidden', 'true');

  document.body.appendChild(ring);
  document.body.appendChild(dot);
  document.documentElement.classList.add('has-shield-cursor');
  document.documentElement.dataset.cursorStyle = 'ring';

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let visible = false;

  // Selectors for dark surfaces. When the cursor is over any of these,
  // it switches to a light color so the dot + ring stay visible.
  const DARK_SURFACES = [
    '.hero', '.scan-band', '.final-cta', '.footer',
    '.compare-dark', '.modal.is-open',
    '[data-cursor-dark]',
  ].join(', ');
  let lastDark = false;

  function detectDarkUnderCursor() {
    // elementFromPoint returns null when the cursor is outside the viewport.
    const el = document.elementFromPoint(mouseX, mouseY);
    const dark = !!(el && el.closest && el.closest(DARK_SURFACES));
    if (dark !== lastDark) {
      lastDark = dark;
      dot.classList.toggle('on-dark', dark);
      ring.classList.toggle('on-dark', dark);
    }
  }

  function show() {
    if (visible) return;
    visible = true;
    dot.classList.add('is-visible');
    ring.classList.add('is-visible');
  }
  function hide() {
    visible = false;
    dot.classList.remove('is-visible');
    ring.classList.remove('is-visible');
  }

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    show();
    detectDarkUnderCursor();
  }, { passive: true });

  document.addEventListener('mouseleave', hide);
  document.addEventListener('mouseenter', () => { /* will show on next move */ });

  document.addEventListener('mousedown', () => { ring.classList.add('is-pressed'); });
  document.addEventListener('mouseup',   () => { ring.classList.remove('is-pressed'); });

  // Hover state — listen for pointerover/out on interactive elements globally.
  const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"], [data-cursor-hover]';
  document.addEventListener('pointerover', (e) => {
    if (e.target && e.target.closest && e.target.closest(INTERACTIVE)) {
      ring.classList.add('is-hover');
    }
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const to = e.relatedTarget;
    if (!to || !to.closest || !to.closest(INTERACTIVE)) {
      ring.classList.remove('is-hover');
    }
  }, { passive: true });

  // Ring-only mode: ring tracks the pointer instantly (no lerp lag) since
  // it's the visible element. If you swap to dot+ring later, increase
  // LERP_RING < 1 to add drift.
  const LERP_RING = 1;
  function tick() {
    ringX += (mouseX - ringX) * LERP_RING;
    ringY += (mouseY - ringY) * LERP_RING;
    dot.style.transform  = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
