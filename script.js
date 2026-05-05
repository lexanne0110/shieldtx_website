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

  // -------- Text splitting (chars / words) --------
  const splitChars = (el) => {
    const text = el.textContent;
    el.textContent = '';
    const frag = document.createDocumentFragment();
    text.split('').forEach((ch) => {
      if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
      const span = document.createElement('span');
      span.className = 'split-char';
      span.textContent = ch;
      frag.appendChild(span);
    });
    el.appendChild(frag);
  };

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

  const deepSplit = (root) => {
    // Split text into words → chars, so inline-block chars never break mid-word.
    // Preserve child elements like <br/> and <span class="accent">.
    const nodes = Array.from(root.childNodes);
    nodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (!text.trim()) return;
        const frag = document.createDocumentFragment();
        text.split(/(\s+)/).forEach((token) => {
          if (!token) return;
          if (/^\s+$/.test(token)) { frag.appendChild(document.createTextNode(' ')); return; }
          const wordWrap = document.createElement('span');
          wordWrap.className = 'split-word-wrap';
          token.split('').forEach((ch) => {
            const span = document.createElement('span');
            span.className = 'split-char';
            span.textContent = ch;
            wordWrap.appendChild(span);
          });
          frag.appendChild(wordWrap);
        });
        root.replaceChild(frag, node);
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'BR') {
        deepSplit(node);
      }
    });
  };

  document.querySelectorAll('[data-split]').forEach(deepSplit);
  document.querySelectorAll('[data-split-words]').forEach((el) => splitWords(el));

  // -------- GSAP reveal animations --------
  if (window.gsap && window.ScrollTrigger && !reduceMotion) {

    // Generic reveal
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.fromTo(el,
        { y: 22, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.9, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        }
      );
    });

    // Char-split reveals
    gsap.utils.toArray('[data-split]').forEach((el) => {
      const chars = el.querySelectorAll('.split-char');
      if (!chars.length) return;
      gsap.fromTo(chars,
        { y: '110%', opacity: 0 },
        {
          y: '0%', opacity: 1, duration: 1, ease: 'expo.out', stagger: 0.012,
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        }
      );
    });

    // Word-split reveals (blur in)
    gsap.utils.toArray('[data-split-words]').forEach((el) => {
      const words = el.querySelectorAll('.split-word');
      if (!words.length) return;
      gsap.fromTo(words,
        { y: 14, opacity: 0, filter: 'blur(6px)' },
        {
          y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out', stagger: 0.015,
          scrollTrigger: { trigger: el, start: 'top 80%', once: true },
        }
      );
    });

    // Phone parallax
    gsap.utils.toArray('[data-parallax]').forEach((el) => {
      const amt = parseFloat(el.dataset.parallax) || 0.15;
      gsap.to(el, {
        y: () => -window.innerHeight * amt,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // How-it-works: stagger reveal each step + activate (rail draws, tape pulses, counters run)
    gsap.utils.toArray('.step').forEach((step) => {
      gsap.fromTo(step,
        { y: 60, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.9, ease: 'expo.out',
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

  // -------- Custom cursor --------
  if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
    const cursor = document.querySelector('.cursor');
    if (cursor) {
      let tx = 0, ty = 0, cx = 0, cy = 0;
      document.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; });
      const loop = () => {
        cx += (tx - cx) * 0.18;
        cy += (ty - cy) * 0.18;
        cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);

      document.querySelectorAll('a, button, input, [data-magnetic], [data-tilt]').forEach((el) => {
        el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
      });
    }
  }

  // -------- Tilt cards --------
  if (!reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const max = 6;
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(1000px) rotateX(${-py * max}deg) rotateY(${px * max}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

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
  const heroScanForm = document.querySelector('.hero .scan');

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

  if (scanToolForm) {
    scanToolForm.addEventListener('submit', (e) => {
      e.preventDefault();
      revealStats({ scroll: true });
    });
  }

  // Prefill chips: drop a sample address into the scan input + run it
  document.querySelectorAll('.scan-prefill-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const addr = chip.dataset.prefill;
      if (scanAddrInput && addr) scanAddrInput.value = addr;
      revealStats({ scroll: true });
    });
  });

  if (heroScanForm) {
    heroScanForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = heroScanForm.querySelector('.scan-input')?.value?.trim();
      if (v && scanAddrInput) scanAddrInput.value = v;
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

  const inviteForm = document.getElementById('invite-request-form');
  if (inviteForm) {
    inviteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const success = inviteForm.parentElement.querySelector('[data-modal-success]');
      if (success) success.hidden = false;
    });
  }
})();
