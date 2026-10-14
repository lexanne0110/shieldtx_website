/* ShieldTX v2 · wallet exposure scan (homepage section #wallet-scan).
   "Check my wallet" expands the panel below the band. The panel validates the address,
   shows a public preview from /api/scanner-preview (same endpoint and response contract
   as v1), then hands off to scanner.shieldtx.xyz with the v1 UTM attribution.
   /#wallet-scan (nav + footer links) scrolls here (js/site.js) and opens the panel. */
(() => {
  const section = document.getElementById('wallet-scan');
  const form = document.getElementById('scan-form');
  if (!section || !form) return;

  const toggle = document.getElementById('scan-toggle');
  const panel = document.getElementById('scan-panel');
  const wallet = document.getElementById('wallet-address');
  const error = document.getElementById('scan-error');
  const fallback = document.getElementById('scan-fallback');
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit ? submit.querySelector('.scan-submit-label') : null;
  const result = document.getElementById('scan-result');
  const openFull = document.getElementById('scan-open-full');
  const walletRe = /^0x[0-9a-f]{40}$/i;
  const SCANNER = (form.dataset.scannerUrl || 'https://scanner.shieldtx.xyz/').replace(/\/+$/, '');
  const ENDPOINT = form.dataset.previewEndpoint || '/api/scanner-preview';
  const ATTRIBUTION = 'utm_source=shieldtx_xyz&utm_campaign=scanner_growth&source=shieldtx_xyz';
  let abort = null;

  const els = {
    summary: document.getElementById('scan-result-summary'),
    score: document.getElementById('scan-result-score'),
    scoreMeta: document.getElementById('scan-result-score-meta'),
    copy: document.getElementById('scan-result-copy'),
    copiers: document.getElementById('scan-result-copiers'),
    fills: document.getElementById('scan-result-fills'),
  };

  // ---- Expand / collapse ----
  function setOpen(open, { focus = true } = {}) {
    section.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    if (open && focus) setTimeout(() => wallet.focus({ preventScroll: true }), 250);
  }
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  setOpen(false, { focus: false });
  // /#wallet-scan links: js/site.js scrolls here and announces the jump; open the panel.
  addEventListener('shield-hash-jump', event => { if (event.detail === section) setOpen(true, { focus: false }); });

  // ---- Preview ----
  const fullScannerUrl = address => walletRe.test(address || '')
    ? `${SCANNER}/?${ATTRIBUTION}#scan/${encodeURIComponent(address.toLowerCase())}`
    : `${SCANNER}/?${ATTRIBUTION}`;
  const isNum = v => typeof v === 'number' && Number.isFinite(v);
  const compact = v => isNum(v)
    ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: v >= 1000 ? 1 : 0 }).format(v)
    : '—';
  const short = a => a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '';

  function setError(message) {
    error.textContent = message || '';
    error.hidden = !message;
    if (message) wallet.setAttribute('aria-invalid', 'true');
    else wallet.removeAttribute('aria-invalid');
  }

  function setLoading(loading) {
    form.classList.toggle('is-loading', loading);
    if (submit) submit.disabled = loading;
    if (submitLabel) submitLabel.textContent = loading ? 'Scanning…' : 'Preview wallet exposure';
  }

  function render(data, address) {
    const coverage = data.coverage || {};
    const recent = data.recent_activity || {};
    const scanStatus = coverage.scan || data.state || 'unavailable';
    const missing = scanStatus === 'not_in_dataset';
    const score = !missing && isNum(data.privacy_score) ? data.privacy_score : null;
    const copy = !missing && isNum(data.copy_exposure) ? data.copy_exposure : null;
    const copiers = !missing && isNum(data.copier_count) ? data.copier_count : null;
    const fills = !missing && isNum(recent.fill_count) ? recent.fill_count : null;

    const label = missing
      ? 'not found in the current scanner dataset'
      : data.privacy_score_label ? `${data.privacy_score_label} exposure` : 'preview ready';
    els.summary.textContent = '';
    const b = document.createElement('b');
    b.textContent = short(data.address || address);
    els.summary.append(b, ` · ${label}.`);

    els.score.textContent = score === null ? '—' : String(Math.round(score));
    els.scoreMeta.textContent = score === null
      ? 'Public visibility is unavailable in this preview.'
      : score > 70 ? 'Highly visible to public trackers.'
        : score > 40 ? 'A meaningful public footprint.'
          : 'Lower visibility, but still public.';
    els.copy.textContent = copy === null ? '—' : String(Math.round(copy));
    els.copiers.textContent = compact(copiers);
    els.fills.textContent = compact(fills);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const address = wallet.value.trim().toLowerCase();
    if (!walletRe.test(address)) {
      setError('Enter a valid public wallet address: 0x followed by 40 hexadecimal characters.');
      wallet.focus();
      return;
    }
    setError('');
    fallback.hidden = true;
    openFull.href = fullScannerUrl(address);
    if (abort) abort.abort();
    abort = new AbortController();
    setLoading(true);
    try {
      const res = await fetch(`${ENDPOINT}?address=${encodeURIComponent(address)}`, {
        headers: { Accept: 'application/json' },
        signal: abort.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No scanner preview is available for this wallet yet.');
      render(json, address);
      result.hidden = false;
      openFull.focus({ preventScroll: true });
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      // The preview is a bonus: never block the hand-off to the full scanner.
      setError(`${err && err.message ? err.message : 'Preview failed.'} You can still open the full scan.`);
      result.hidden = true;
      fallback.hidden = false;
      fallback.href = fullScannerUrl(address);
    } finally {
      setLoading(false);
    }
  });

  wallet.addEventListener('input', () => setError(''));
})();
