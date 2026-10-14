/* ShieldTX v2 · shared site chrome. Loaded (defer) on every redesigned page.
   Ported from the design's app.js; every block is guarded so pages without a
   given element (hero, FAQ, dialogs) don't throw. */
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // Text appears line by line as each section comes into view.
  const revealGroups = document.querySelectorAll('.hero-copy,.section-heading,.scan-copy,.closing-copy,.page-intro');
  const revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('is-revealed', entry.isIntersecting);
  }, { threshold: .12 });
  for (const group of revealGroups) {
    const items = [];
    for (const element of group.querySelectorAll('h1,h2,h3,p')) {
      if (element.tagName === 'H1') {
        for (const line of element.children) { line.classList.add('reveal-item'); items.push(line); }
        continue;
      }
      const nodes = Array.from(element.childNodes);
      let line = document.createElement('span');
      line.className = 'reveal-line reveal-item';
      for (const node of nodes) {
        if (node.nodeName === 'BR') {
          element.appendChild(line); items.push(line);
          line = document.createElement('span'); line.className = 'reveal-line reveal-item';
          node.remove();
        } else line.appendChild(node);
      }
      if (line.childNodes.length) { element.appendChild(line); items.push(line); }
    }
    const actions = group.querySelector('.actions');
    if (actions) { actions.classList.add('reveal-item'); items.push(actions); }
    items.forEach((item, index) => item.style.setProperty('--reveal-delay', `${index * 110}ms`));
    if (!reducedMotion.matches) { group.classList.add('reveal-ready'); revealObserver.observe(group); }
  }
  reducedMotion.addEventListener('change', event => {
    if (event.matches) revealGroups.forEach(group => group.classList.add('is-revealed'));
  });

  // Mobile navigation.
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#navigation');
  const closeMenu = () => {
    if (!menu || !navigation) return;
    menu.setAttribute('aria-expanded', 'false');
    menu.setAttribute('aria-label', 'Open navigation');
    navigation.classList.remove('open');
  };
  if (menu && navigation) {
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      navigation.classList.toggle('open', open);
    });
    navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

    // Highlight the in-page section link currently in view (homepage only).
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        navigation.querySelectorAll('a').forEach(a => a.classList.toggle('active', a.pathname === location.pathname && a.hash === '#' + entry.target.id));
      }
    }, { rootMargin: '-15% 0px -65% 0px' });
    document.querySelectorAll('main > section[id]').forEach(section => observer.observe(section));
  }

  // Dialogs. Openers: [data-dialog="<id>"]. The wallet scan is an inline homepage
  // section now (js/wallet-scan.js), not a dialog.
  // Close: [data-dialog-close] / .scan-close, Escape (native), or a backdrop click.
  function openDialog(dialog) {
    closeMenu();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  }
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('[data-dialog-close],.scan-close').forEach(btn => btn.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
      // Only the backdrop itself: keyboard-submitted forms fire clicks at (0,0).
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.style.overflow = '';
      dialog.dispatchEvent(new CustomEvent('dialog:closed'));
    });
  });
  document.querySelectorAll('[data-dialog]').forEach(opener => opener.addEventListener('click', event => {
    const dialog = document.getElementById(opener.dataset.dialog);
    if (!dialog) return;
    event.preventDefault();
    openDialog(dialog);
  }));
})();

// Reveal section contents without transforming sticky scroll-story containers.
(() => {
  const targets = document.querySelectorAll('.exposure-window,.flow-window,.trust-window,.faq-grid>details,.footer-main>*,.exposure-summary>*,.reveal-block');
  if (!targets.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.target.classList.toggle('is-in-view', entry.isIntersecting));
  }, { threshold: 0, rootMargin: '0px 0px -55px 0px' });
  targets.forEach((element, i) => {
    element.classList.add('scroll-enter');
    element.style.setProperty('--enter-delay', `${element.matches('details') ? (i % 3) * 70 : 0}ms`);
    observer.observe(element);
  });
})();

// Animate native details in both directions, retaining keyboard activation.
document.querySelectorAll('.faq-grid details').forEach(details => {
  const summary = details.querySelector('summary');
  let animation = null, expanded = details.open;
  summary.addEventListener('click', event => {
    event.preventDefault();
    const from = details.getBoundingClientRect().height;
    animation?.cancel();
    expanded = !expanded;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { details.open = expanded; return; }
    details.open = true;
    const to = expanded ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + 2;
    animation = details.animate({ height: [from + 'px', to + 'px'] }, { duration: 340, easing: 'cubic-bezier(.22,1,.36,1)' });
    animation.onfinish = () => { details.open = expanded; animation = null; };
  });
});

// Muted autoplay videos: play while on screen, pause when off. Browsers can
// pause offscreen autoplay video and not resume it, so drive it explicitly.
(() => {
  const videos = document.querySelectorAll('video[autoplay][muted]');
  if (!videos.length) return;
  const observer = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) target.play().catch(() => {});
      else target.pause();
    }
  }, { threshold: .25 });
  videos.forEach(video => observer.observe(video));
})();

(() => {
  const button = document.querySelector('.scroll-top');
  if (!button) return;
  const update = () => { button.hidden = scrollY < innerHeight * .65; };
  button.addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }));
  addEventListener('scroll', update, { passive: true }); update();
})();

// In-page links (/#faq, /#wallet-scan, …). The homepage's scroll stories (trade flow runway,
// pinned product showcase) change the page height after load, so the browser's own hash jump
// lands on the wrong section. Announce the jump (trade-flow.js collapses its runway, wallet-scan.js
// opens), let layout settle, then scroll to the target's current position.
(() => {
  const find = hash => {
    if (!hash || hash.length < 2) return null;
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); } catch { return null; }
  };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function jump(target, smooth) {
    dispatchEvent(new CustomEvent('shield-hash-jump', { detail: target }));
    setTimeout(() => { // a beat for layout + ScrollTrigger pin spacers (timer, not rAF, so it also runs in background tabs)
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      target.scrollIntoView({ block: 'start', behavior: smooth && !reduced.matches ? 'smooth' : 'instant' });
    }, 60);
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href*="#"]');
    if (!link || link.target === '_blank' || link.origin !== location.origin || link.pathname !== location.pathname) return;
    const target = find(link.hash);
    if (!target) return;
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    jump(target, true);
  });
  // Arriving from another page with a hash. A reload restores the reading position instead (scroll-memory.js).
  const arrival = find(location.hash);
  if (arrival && !window.shieldScrollResume) {
    addEventListener('load', () => document.fonts.ready.then(() => jump(arrival, false)), { once: true });
  }
})();
