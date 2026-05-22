/* =========================================================================
   ShieldTX V2 — motion + interactions
   Lenis smooth scroll + GSAP ScrollTrigger + vanilla canvas chart
   ========================================================================= */

(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // -------- Footer year --------
  const yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // -------- Lenis smooth scroll --------
  let lenis = null;
  if (!reduceMotion && window.Lenis) {
    lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
    });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  // -------- GSAP ScrollTrigger --------
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  // -------- Nav progress + blur on scroll + bg-aware link color --------
  const nav = document.querySelector('.nav');
  const navProgress = document.querySelector('.nav-progress');
  const darkSelector = '.hero, .scan-band, .final-cta, .footer';
  const darkSections = Array.from(document.querySelectorAll(darkSelector));
  const heroSection = document.querySelector('.hero');
  const navH = nav ? nav.getBoundingClientRect().height : 64;

  const updateNav = () => {
    const y = window.scrollY || document.documentElement.scrollTop;
    const max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
    if (nav) nav.classList.toggle('is-scrolled', y > 12);
    if (navProgress) navProgress.style.width = Math.min(100, (y / max) * 100) + '%';
    if (nav) {
      const probe = navH * 0.6;
      const overDark = darkSections.some((s) => {
        const r = s.getBoundingClientRect();
        return r.top <= probe && r.bottom > probe;
      });
      nav.classList.toggle('is-over-dark', overDark);
      let overHero = false;
      if (heroSection) {
        const r = heroSection.getBoundingClientRect();
        overHero = r.top <= probe && r.bottom > probe;
      }
      nav.classList.toggle('is-over-hero', overHero);
    }
  };
  updateNav();
  requestAnimationFrame(updateNav);
  window.addEventListener('load', updateNav);
  window.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav);

  // -------- Word splitting for headline reveals --------
  // splitChars + deepSplit were removed when char-by-char animations were
  // retired. Word splitting is kept for the subtle [data-split-words] fade.
  const splitWords = (el) => {
    const text = el.textContent;
    el.textContent = '';
    const frag = document.createDocumentFragment();
    text.split(/(\s+)/).forEach((w) => {
      if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
      const span = document.createElement('span');
      span.className = 'split-word';
      span.textContent = w;
      frag.appendChild(span);
    });
    el.appendChild(frag);
  };

  document.querySelectorAll('[data-split-words]').forEach((el) => splitWords(el));

  // -------- GSAP reveal animations --------
  if (window.gsap && window.ScrollTrigger && !reduceMotion) {

    // Generic reveal (calmer: shorter duration + snappier easing)
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.fromTo(el,
        { y: 14, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        }
      );
    });

    // Char-split reveals were removed — they read as gimmicky and slow
    // readability. Headlines now fade in via the generic reveal above.

    // Word-split reveals (fade + tiny rise; no blur)
    gsap.utils.toArray('[data-split-words]').forEach((el) => {
      const words = el.querySelectorAll('.split-word');
      if (!words.length) return;
      gsap.fromTo(words,
        { y: 8, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.012,
          scrollTrigger: { trigger: el, start: 'top 80%', once: true },
        }
      );
    });

    // Parallax — reduced depth (was 15%) for a calmer scroll feel.
    gsap.utils.toArray('[data-parallax]').forEach((el) => {
      const amt = parseFloat(el.dataset.parallax) || 0.06;
      gsap.to(el, {
        y: () => -window.innerHeight * amt,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // How-it-works: stagger reveal each step + activate
    gsap.utils.toArray('.step').forEach((step) => {
      gsap.fromTo(step,
        { y: 30, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, ease: 'power3.out',
          scrollTrigger: {
            trigger: step,
            start: 'top 80%',
            once: true,
            onEnter: () => {
              step.classList.add('is-active');
              // Animate step-counter spans inside this step
              step.querySelectorAll('.step-counter').forEach((el) => {
                if (el.dataset.counted === '1') return;
                const target = parseFloat(el.dataset.countTo);
                const prefix = el.dataset.prefix || '';
                const suffix = el.dataset.suffix || '';
                const obj = { n: 0 };
                gsap.to(obj, {
                  n: target, duration: 1.4, ease: 'power2.out',
                  onUpdate: () => {
                    el.textContent = prefix + Math.round(obj.n).toLocaleString() + suffix;
                  },
                  onComplete: () => { el.dataset.counted = '1'; },
                });
              });
            },
          },
        }
      );
    });

    // Features section is now a vertical stack — no horizontal-scroll pin needed.
    // Card reveal animations are handled by the generic [data-reveal] sweep above.

    // Count-up numbers (skip elements inside .stats-panel — those run on scan click)
    gsap.utils.toArray('[data-count-to]').forEach((el) => {
      if (el.closest('.stats-panel')) return;
      const target = parseFloat(el.dataset.countTo);
      const decimals = el.dataset.decimals
        ? parseInt(el.dataset.decimals, 10)
        : (target % 1 === 0 ? 0 : 2);
      const obj = { n: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 85%', once: true,
        onEnter: () => {
          gsap.to(obj, {
            n: target, duration: 1.6, ease: 'power2.out',
            onUpdate: () => {
              el.textContent = decimals === 0 ? Math.round(obj.n).toString() : obj.n.toFixed(decimals);
            },
          });
        },
      });
    });
  } else {
    // Reduced motion: show everything
    document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-in'));
    document.querySelectorAll('.split-char, .split-word').forEach((el) => {
      el.style.opacity = '1'; el.style.transform = 'none'; el.style.filter = 'none';
    });
    document.querySelectorAll('[data-count-to]').forEach((el) => {
      if (el.closest('.stats-panel')) return;
      const t = parseFloat(el.dataset.countTo);
      const d = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : (t % 1 === 0 ? 0 : 2);
      el.textContent = d === 0 ? t.toString() : t.toFixed(d);
    });
    document.querySelectorAll('.step').forEach((s) => s.classList.add('is-active'));
    document.querySelectorAll('.step-counter').forEach((el) => {
      const target = parseFloat(el.dataset.countTo);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      el.textContent = prefix + Math.round(target).toLocaleString() + suffix;
    });
  }

  // Custom cursor + tilt cards were removed for a calmer, premium-fintech
  // surface (see plan §5). The OS pointer reads correctly on text and cards.

  // -------- Hero market card sparkline (one-shot SVG) --------
  const heroCard = document.querySelector('.hero-card-mini');
  const spark = document.querySelector('.hcm-spark');
  if (spark) {
    const W = 360, H = 80;
    const N = 48;
    const series = [];
    let v = 40;
    for (let i = 0; i < N; i++) {
      v += (Math.sin(i / 5) * 1.4) + (Math.random() - 0.45) * 4;
      v = Math.max(8, Math.min(72, v));
      series.push(v);
    }
    const stepX = W / (N - 1);
    const pts = series.map((y, i) => [i * stepX, H - y]);
    const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const fillPath = `${linePath} L${W},${H} L0,${H} Z`;

    spark.innerHTML = `
      <defs>
        <linearGradient id="hcmSparkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#93c5fd"/>
          <stop offset="60%" stop-color="#60a5fa"/>
          <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
        <linearGradient id="hcmSparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(96,165,250,.35)"/>
          <stop offset="100%" stop-color="rgba(96,165,250,0)"/>
        </linearGradient>
      </defs>
      <path class="hcm-spark-fill" d="${fillPath}"/>
      <path class="hcm-spark-path" d="${linePath}"/>
    `;

    // Set dasharray length for stroke reveal
    const path = spark.querySelector('.hcm-spark-path');
    if (path && path.getTotalLength) {
      const len = path.getTotalLength();
      path.style.setProperty('--len', len);
    }
  }
  if (heroCard) {
    // Trigger above-the-fold reveal of status rows
    requestAnimationFrame(() => heroCard.classList.add('is-in'));
  }

  // -------- Scroll anchors (with Lenis) --------
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -72 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // -------- Scan-tool reveal --------
  const scanTool = document.getElementById('scan-tool');
  const statsPanel = document.getElementById('stats-panel');
  const scanToolForm = document.getElementById('scan-form');
  const scanAddrInput = document.getElementById('scan-addr');
  const scanUnlockForm = document.getElementById('scan-unlock-form');
  const scanUnlockEmail = document.getElementById('scan-unlock-email');
  const scanUnlockError = document.getElementById('scan-unlock-error');
  const heroScanForm = document.querySelector('.hero .scan');
  const walletRe = /^0x[0-9a-f]{40}$/i;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  let lastScannedWallet = '';

  function runStatsCountUps() {
    if (!statsPanel) return;
    statsPanel.querySelectorAll('[data-count-to]').forEach((el) => {
      if (el.dataset.counted === '1') return;
      const target = parseFloat(el.dataset.countTo);
      const decimals = el.dataset.decimals
        ? parseInt(el.dataset.decimals, 10)
        : (target % 1 === 0 ? 0 : 2);
      if (reduceMotion || !window.gsap) {
        el.textContent = decimals === 0 ? Math.round(target).toString() : target.toFixed(decimals);
        el.dataset.counted = '1';
        return;
      }
      const obj = { n: 0 };
      gsap.to(obj, {
        n: target, duration: 1.4, ease: 'power2.out',
        onUpdate: () => {
          el.textContent = decimals === 0 ? Math.round(obj.n).toString() : obj.n.toFixed(decimals);
        },
        onComplete: () => { el.dataset.counted = '1'; },
      });
    });
    statsPanel.querySelectorAll('.wp-bar').forEach((bar, i) => {
      bar.style.setProperty('--run', '1');
      bar.style.transitionDelay = `${i * 70}ms`;
    });
  }

  function revealStats({ scroll = false } = {}) {
    if (!statsPanel) return;
    const resultsEl = document.getElementById('scan-results');
    if (resultsEl) resultsEl.classList.add('is-open');
    if (!statsPanel.classList.contains('revealed')) {
      statsPanel.classList.add('revealed');
      statsPanel.setAttribute('aria-hidden', 'false');
    }
    if (scroll && scanTool) {
      if (lenis) lenis.scrollTo(statsPanel, { offset: -72 });
      else statsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTimeout(runStatsCountUps, 220);
  }

  // Scan form validation — empty submit shows an inline error rather than
  // silently revealing the stats panel.
  const scanError = document.getElementById('scan-error');
  const setScanInvalid = (invalid) => {
    if (!scanToolForm) return;
    scanToolForm.classList.toggle('is-invalid', invalid);
    if (scanAddrInput) scanAddrInput.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    if (scanError) {
      if (invalid) scanError.removeAttribute('hidden');
      else scanError.setAttribute('hidden', '');
    }
  };

  if (scanToolForm) {
    scanToolForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = scanAddrInput ? scanAddrInput.value.trim().toLowerCase() : '';
      if (!walletRe.test(value)) {
        setScanInvalid(true);
        if (scanAddrInput) scanAddrInput.focus();
        return;
      }
      lastScannedWallet = value;
      setScanInvalid(false);
      revealStats({ scroll: true });
    });
  }
  if (scanAddrInput) {
    // Clear the error state as soon as the user starts typing.
    // Note: don't clear on `focus` — the submit handler programmatically
    // focuses the field when empty, which would race-cancel the error we
    // just raised.
    scanAddrInput.addEventListener('input', () => {
      if (scanAddrInput.value.trim()) setScanInvalid(false);
    });
  }

  // Prefill chips: drop a sample address into the scan input + run it
  document.querySelectorAll('.scan-prefill-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const addr = chip.dataset.prefill;
      if (scanAddrInput && addr) scanAddrInput.value = addr;
      if (addr && walletRe.test(addr)) lastScannedWallet = addr.toLowerCase();
      setScanInvalid(false);
      revealStats({ scroll: true });
    });
  });

  function fullScannerUrl() {
    const base = (scanToolForm && scanToolForm.dataset.scannerUrl) || 'https://intelligence.themuse.one/';
    const cleanBase = base.replace(/\/+$/, '');
    const wallet = lastScannedWallet || (scanAddrInput && scanAddrInput.value.trim().toLowerCase()) || '';
    return walletRe.test(wallet)
      ? `${cleanBase}/#scan/${encodeURIComponent(wallet)}`
      : `${cleanBase}/`;
  }

  function setUnlockError(message) {
    if (!scanUnlockError) return;
    if (message) {
      scanUnlockError.textContent = message;
      scanUnlockError.removeAttribute('hidden');
    } else {
      scanUnlockError.textContent = '';
      scanUnlockError.setAttribute('hidden', '');
    }
  }

  if (scanUnlockForm) {
    scanUnlockForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = scanUnlockEmail ? scanUnlockEmail.value.trim() : '';
      if (!emailRe.test(email)) {
        setUnlockError('Enter a valid email to continue.');
        if (scanUnlockEmail) scanUnlockEmail.focus();
        return;
      }

      setUnlockError('');
      scanUnlockForm.classList.add('is-submitting');

      try {
        const res = await fetch('/api/request-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            platforms: ['hyperliquid'],
            protection: ['nothing'],
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Submission failed. Please try again.');
        }
        window.location.assign(fullScannerUrl());
      } catch (err) {
        scanUnlockForm.classList.remove('is-submitting');
        setUnlockError(err && err.message ? err.message : 'Network error. Please try again.');
      }
    });

    if (scanUnlockEmail) {
      scanUnlockEmail.addEventListener('input', () => setUnlockError(''));
    }
  }

  if (heroScanForm) {
    heroScanForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = heroScanForm.querySelector('.scan-input')?.value?.trim();
      if (v && scanAddrInput) scanAddrInput.value = v;
      if (v && walletRe.test(v)) lastScannedWallet = v.toLowerCase();
      if (scanTool) {
        if (lenis) lenis.scrollTo(scanTool, { offset: -72 });
        else scanTool.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setTimeout(() => revealStats({ scroll: false }), 700);
    });
  }

  // -------- Trade dashboard candle charts (preview + hero) --------
  document.querySelectorAll('.ta-candles').forEach((taSvg) => {
    const isHero = taSvg.classList.contains('ta-candles-hero');
    const palette = isHero
      ? { up: '#3ad29f', down: '#f06767', mark: '#60a5fa', baseline: 'rgba(255,255,255,.08)' }
      : { up: '#3ad29f', down: '#f06767', mark: '#3ad29f', baseline: '#2e2e2d' };
    const vb = (taSvg.getAttribute('viewBox') || '0 0 800 460').split(' ').map(Number);
    const W = vb[2], H = vb[3];
    const padTop = isHero ? 28 : 40;
    const padBottom = isHero ? 32 : 40;
    const volArea = isHero ? 50 : 70;
    const priceArea = H - padTop - padBottom - volArea;
    const volBase = H - padBottom;

    const N = 60;
    let p = 232;
    const candles = [];
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < N; i++) {
      const o = p;
      const drift = (Math.sin(i / 8) * 1.6) + (Math.cos(i / 14) * 2.2);
      const noise = (Math.random() - 0.5) * 5.2;
      const c = Math.max(190, Math.min(282, o + drift + noise));
      const high = Math.max(o, c) + Math.random() * 3.2;
      const low  = Math.min(o, c) - Math.random() * 3.2;
      candles.push({ o, c, h: high, l: low });
      lo = Math.min(lo, low);
      hi = Math.max(hi, high);
      p = c;
    }
    // Force last close to 278.81 to match Mark
    candles[N - 1].c = 278.81;
    candles[N - 1].h = Math.max(candles[N - 1].h, 280);
    hi = Math.max(hi, 282);
    lo = Math.min(lo, 188);

    const xStep = W / N;
    const cw = xStep * 0.62;
    const yScale = (price) => padTop + ((hi - price) / (hi - lo)) * priceArea;

    const ns = 'http://www.w3.org/2000/svg';
    const g = document.createElementNS(ns, 'g');

    candles.forEach((cd, i) => {
      const x = i * xStep + xStep / 2;
      const up = cd.c >= cd.o;
      const fill = up ? palette.up : palette.down;
      // wick
      const wick = document.createElementNS(ns, 'line');
      wick.setAttribute('x1', x); wick.setAttribute('x2', x);
      wick.setAttribute('y1', yScale(cd.h)); wick.setAttribute('y2', yScale(cd.l));
      wick.setAttribute('stroke', fill);
      wick.setAttribute('stroke-width', '1');
      g.appendChild(wick);
      // body
      const body = document.createElementNS(ns, 'rect');
      const yo = yScale(up ? cd.c : cd.o);
      const yc = yScale(up ? cd.o : cd.c);
      body.setAttribute('x', x - cw / 2);
      body.setAttribute('y', yo);
      body.setAttribute('width', cw);
      body.setAttribute('height', Math.max(1, yc - yo));
      body.setAttribute('fill', fill);
      g.appendChild(body);
      // vol bar
      const vh = 8 + Math.random() * volArea * 0.85;
      const vbar = document.createElementNS(ns, 'rect');
      vbar.setAttribute('x', x - cw / 2);
      vbar.setAttribute('y', volBase - vh);
      vbar.setAttribute('width', cw);
      vbar.setAttribute('height', vh);
      vbar.setAttribute('fill', fill);
      vbar.setAttribute('fill-opacity', '0.32');
      g.appendChild(vbar);
    });

    // mark price line at last close
    const markY = yScale(candles[N - 1].c);
    const markLine = document.createElementNS(ns, 'line');
    markLine.setAttribute('x1', 0); markLine.setAttribute('x2', W);
    markLine.setAttribute('y1', markY); markLine.setAttribute('y2', markY);
    markLine.setAttribute('stroke', palette.mark);
    markLine.setAttribute('stroke-width', '1');
    markLine.setAttribute('stroke-dasharray', '4 4');
    markLine.setAttribute('stroke-opacity', '0.6');
    g.appendChild(markLine);

    // vol baseline
    const volLine = document.createElementNS(ns, 'line');
    volLine.setAttribute('x1', 0); volLine.setAttribute('x2', W);
    volLine.setAttribute('y1', volBase); volLine.setAttribute('y2', volBase);
    volLine.setAttribute('stroke', palette.baseline);
    volLine.setAttribute('stroke-width', '1');
    g.appendChild(volLine);

    taSvg.appendChild(g);

    // Position the .ta-mark-tag at the same y as markLine
    const wrap = taSvg.parentElement;
    const tag = wrap && wrap.querySelector('.ta-mark-tag');
    if (tag) {
      const pct = (markY / H) * 100;
      tag.style.top = `calc(${pct}% - 9px)`;
    }
  });

  // -------- Hero chart: live ticker + hover crosshair --------
  const heroChart = document.getElementById('hero-chart');
  if (heroChart) {
    const canvas    = heroChart.querySelector('.hcc-canvas');
    const svg       = heroChart.querySelector('.ta-candles');
    const priceEl   = heroChart.querySelector('#hcc-price');
    const deltaEl   = heroChart.querySelector('#hcc-delta');
    const markTag   = heroChart.querySelector('#hcc-mark-tag');
    const crossX    = heroChart.querySelector('.hcc-crosshair-x');
    const crossY    = heroChart.querySelector('.hcc-crosshair-y');
    const cursorTag = heroChart.querySelector('.hcc-cursor-tag');
    const cursorPx  = heroChart.querySelector('#hcc-cursor-price');
    const cursorTm  = heroChart.querySelector('#hcc-cursor-time');

    // Live ticker: drift the price every 1.6s, flash up/down
    let basePrice = 278.81;
    const baseDelta = -2.58;
    const setPrice = (next) => {
      const dir = next >= basePrice ? 'is-up' : 'is-down';
      basePrice = next;
      if (priceEl) {
        priceEl.textContent = next.toFixed(2);
        priceEl.classList.remove('is-up', 'is-down');
        priceEl.classList.add(dir, 'is-pulsing');
        setTimeout(() => priceEl.classList.remove('is-pulsing'), 900);
      }
      if (markTag) {
        markTag.textContent = next.toFixed(2);
        markTag.classList.toggle('is-down', next < 278);
      }
    };
    if (!reduceMotion) {
      setInterval(() => {
        const drift = (Math.random() - 0.48) * 0.6;
        const next = Math.max(270, Math.min(286, basePrice + drift));
        setPrice(parseFloat(next.toFixed(2)));
      }, 1600);
    }

    // Hover crosshair + cursor tag
    const months = ['Jun','Jul','Aug','Sep','Oct','Nov','Dec','2026','Feb'];
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (crossX) crossX.style.top  = y + 'px';
      if (crossY) crossY.style.left = x + 'px';

      // Price interpolation: top of canvas = 282, bottom = 200 (matches Y axis)
      const priceTop = 282, priceBottom = 200;
      const pricePct = y / r.height;
      const cursorPrice = (priceTop - (priceTop - priceBottom) * pricePct).toFixed(2);

      const monthIdx = Math.min(months.length - 1, Math.floor((x / r.width) * months.length));
      if (cursorPx) cursorPx.textContent = cursorPrice;
      if (cursorTm) cursorTm.textContent = months[monthIdx];

      if (cursorTag) {
        // Position the cursor tag near pointer, but keep it inside the canvas
        const tagW = 86, tagH = 38, gap = 12;
        let tx = x + gap;
        let ty = y - tagH - gap;
        if (tx + tagW > r.width)  tx = x - tagW - gap;
        if (ty < 0)                ty = y + gap;
        cursorTag.style.left = tx + 'px';
        cursorTag.style.top  = ty + 'px';
      }
    });
  }

  // -------- FAQ accordion (single-open, first open by default) --------
  const faqItems = Array.from(document.querySelectorAll('.faq-item'));
  const closeFaq = (item) => {
    const btn = item.querySelector('.faq-q');
    const panel = item.querySelector('.faq-a');
    item.classList.remove('is-open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (panel) panel.style.maxHeight = '0px';
  };
  const openFaq = (item) => {
    const btn = item.querySelector('.faq-q');
    const panel = item.querySelector('.faq-a');
    item.classList.add('is-open');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    if (panel) panel.style.maxHeight = panel.scrollHeight + 'px';
  };
  faqItems.forEach((item, i) => {
    const btn = item.querySelector('.faq-q');
    const panel = item.querySelector('.faq-a');
    if (!btn || !panel) return;
    // First item open by default
    if (i === 0) requestAnimationFrame(() => openFaq(item));
    btn.addEventListener('click', () => {
      const wasOpen = item.classList.contains('is-open');
      // Close all others
      faqItems.forEach((other) => { if (other !== item) closeFaq(other); });
      // Toggle the clicked one
      if (wasOpen) closeFaq(item);
      else openFaq(item);
    });
  });

  // -------- Request-invite modal --------
  const openModal = (id) => {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-locked');
    if (lenis && typeof lenis.stop === 'function') lenis.stop();
    const firstInput = modal.querySelector('input, button');
    if (firstInput) setTimeout(() => firstInput.focus(), 60);
  };
  const closeModal = (modal) => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-locked');
    if (lenis && typeof lenis.start === 'function') lenis.start();
    // Reset success state for next open
    const success = modal.querySelector('[data-modal-success]');
    if (success) success.hidden = true;
    const form = modal.querySelector('form');
    if (form) form.reset();
  };

  document.querySelectorAll('[data-modal-open]').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(trigger.getAttribute('data-modal-open'));
    });
  });
  document.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', () => {
      closeModal(el.closest('.modal'));
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal.is-open').forEach(closeModal);
  });

  // -------- Request Access form binding --------
  // The brand-styled dropdown component and the multi-step waitlist form
  // logic now live in /public-scripts/request-access-form.js (shared with
  // /request-access and /app). We just hand the in-page modal form to it.
  if (window.ShieldTX && window.ShieldTX.bindRequestAccessForm) {
    const inPageForm = document.getElementById('waitlist-form');
    if (inPageForm) {
      window.ShieldTX.bindRequestAccessForm(inPageForm, { mode: 'modal' });
    }
  }

  // The legacy brand-dropdown / multi-step / scoring code below was removed
  // when the form was extracted. Keeping the placeholder so future readers
  // looking at git blame find this note.
  /* removed-in-refactor: initDropdown + waitlist-form scoring */

  // -------- Cross-page deep-link to waitlist (?waitlist=1) --------
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('waitlist') === '1') {
      setTimeout(() => {
        const trigger = document.querySelector('[data-modal-open="invite-modal"]');
        if (trigger) trigger.click();
        // Strip query so refresh doesn't re-open
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        }
      }, 250);
    }
  } catch (_) {}

  // -------- Hero flow auto-cycle (Connect → Authorize → Issued → Trade) --------
  const flow = document.getElementById('hero-flow');
  if (flow) {
    const cards = Array.from(flow.querySelectorAll('.hero-flow-card'));
    const dots = Array.from(flow.querySelectorAll('.hero-flow-dot'));
    let active = 0;
    let timer = null;
    const INTERVAL = 3500;

    function setActive(i) {
      active = ((i % cards.length) + cards.length) % cards.length;
      cards.forEach((c, idx) => c.classList.toggle('is-active', idx === active));
      dots.forEach((d, idx) => d.classList.toggle('is-active', idx === active));
    }

    function start() {
      stop();
      timer = window.setInterval(() => setActive(active + 1), INTERVAL);
    }
    function stop() {
      if (timer) { window.clearInterval(timer); timer = null; }
    }

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const step = parseInt(dot.dataset.flowJump, 10);
        if (!isNaN(step)) {
          setActive(step - 1);
          start(); // reset cadence after manual jump
        }
      });
    });

    // Pause on hover for a more deliberate read
    flow.addEventListener('mouseenter', stop);
    flow.addEventListener('mouseleave', start);

    // Pause when offscreen to save cycles
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.2 });
      io.observe(flow);
    } else {
      start();
    }
  }

  // -------- Hero stage — 5-beat looping shielded-wallet onboarding --------
  // Cycles `data-stage` through 1→2→3→4→5→1 on a ~12s loop. CTAs are
  // clickable to advance manually (via [data-hero-step]). Paused when
  // off-screen via IntersectionObserver. Reduced motion → static beat 5.
  //
  // Slower, breathier timings so each beat lands and the cursor easing
  // (0.8s→1.2s) reads as intentional rather than rushed.
  (function initHeroStage() {
    const stage = document.querySelector('.hero-stage');
    if (!stage) return;
    if (reduceMotion) { stage.setAttribute('data-stage', '5'); return; }

    // Beat 6 = post-deposit success ("Funds shielded"). It pauses longer
    // than the action beats so the success registers before restart.
    const TIMINGS = { 1: 2400, 2: 2200, 3: 2600, 4: 2800, 5: 2600, 6: 4200 };
    const LAST_BEAT = 6;

    let current = 1, timeoutId = null, running = false, manual = false;

    // Demo cursor — animated SVG pointer that walks the viewer through each
    // beat. We resolve a CSS selector for each stage to a bounding rect and
    // park the cursor there. Beats with an actionable CTA get a click pulse
    // shortly before the auto-advance.
    const demoCursor = stage.querySelector('.hero-stage-demo-cursor');
    const TARGETS = {
      1: '.hero-stage-beat-1 .hero-stage-cta',                  // Connect to ShieldTX
      2: '.hero-stage-beat-2 .hero-stage-cta',                  // Continue
      3: '.hero-stage-beat-3 .hero-stage-field',                // Shielded wallet readout
      4: '.hsa-deposit',                                        // Deposit button in trading UI (triggers overlay)
      5: '.hero-stage-overlay .hero-stage-cta',                 // Deposit CTA in overlay
      6: '.hero-stage-confirm-icon',                            // Success checkmark (no click)
    };
    const CLICK_BEATS = new Set([1, 2, 4, 5]);
    let clickTimer = null;

    function moveCursorTo(n) {
      if (!demoCursor) return;
      const sel = TARGETS[n];
      const target = sel && stage.querySelector(sel);
      if (!target) return;
      // Compute the target's center relative to the stage's content box.
      const stageRect = stage.getBoundingClientRect();
      const r = target.getBoundingClientRect();
      const cx = r.left - stageRect.left + r.width / 2;
      const cy = r.top  - stageRect.top  + r.height / 2;
      demoCursor.style.setProperty('--hsc-x', cx + 'px');
      demoCursor.style.setProperty('--hsc-y', cy + 'px');

      // Click pulse — fires near the end of beats that have a real CTA so
      // the visual "click" lines up with the auto-advance. Adds a press
      // class to the target element so the button visibly reacts too.
      clearTimeout(clickTimer);
      if (CLICK_BEATS.has(n)) {
        const dur = TIMINGS[n] || 2400;
        clickTimer = setTimeout(() => {
          demoCursor.classList.add('is-clicking');
          target.classList.add('is-pressed-by-cursor');
          setTimeout(() => {
            demoCursor.classList.remove('is-clicking');
            target.classList.remove('is-pressed-by-cursor');
          }, 450);
        }, Math.max(300, dur * 0.65));
      }
    }

    function setStage(n) {
      current = n;
      stage.setAttribute('data-stage', String(n));
      moveCursorTo(n);
    }
    function schedule() {
      clearTimeout(timeoutId);
      const dur = TIMINGS[current] || 1500;
      timeoutId = setTimeout(() => {
        const next = current === LAST_BEAT ? 1 : current + 1;
        setStage(next);
        schedule();
      }, dur);
    }
    function start() {
      if (running || manual) return;
      running = true;
      schedule();
    }
    function stop() {
      running = false;
      clearTimeout(timeoutId);
      clearTimeout(clickTimer);
    }
    function resumeAfter(delay) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => { manual = false; running = false; start(); }, delay);
    }

    stage.querySelectorAll('[data-hero-step]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = parseInt(btn.dataset.heroStep, 10);
        if (Number.isNaN(target)) return;
        manual = true;
        stop();
        setStage(target);
        resumeAfter(4500);
      });
    });

    // Re-anchor the cursor on resize — beat targets shift with layout.
    window.addEventListener('resize', () => moveCursorTo(current), { passive: true });

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => (e.isIntersecting ? start() : stop()));
      }, { threshold: 0.1 });
      io.observe(stage);
    } else {
      start();
    }

    // Park the cursor on beat 1 immediately so it doesn't pop in at (0,0).
    requestAnimationFrame(() => moveCursorTo(1));
  })();
})();
