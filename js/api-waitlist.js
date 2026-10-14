/* ShieldTX v2 · API waitlist email capture (homepage).
   Logic unchanged from v1 script.js: POST { email } to data-endpoint, stash the
   email for /api-access/ prefill, then redirect to data-next. */
(() => {
  const form = document.getElementById('api-waitlist-form');
  if (!form) return;
  const input = form.querySelector('input[type="email"]');
  const errorEl = document.getElementById('api-waitlist-error');
  const statusEl = document.getElementById('api-waitlist-status');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
    form.classList.toggle('is-invalid', !!msg);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (input && input.value || '').trim();
    if (!EMAIL_RE.test(email)) {
      showError('Enter a valid email address.');
      if (input) input.focus();
      return;
    }
    showError('');
    form.classList.add('is-loading');
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      const res = await fetch(form.dataset.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        if (form.dataset.next) {
          try { sessionStorage.setItem('apiWaitlistEmail', email); } catch (_) {}
          if (statusEl) statusEl.hidden = false;
          window.location.assign(form.dataset.next);
          return;
        }
        form.hidden = true;
        if (statusEl) statusEl.hidden = false;
      } else {
        showError(json.error || 'Submission failed. Please try again.');
      }
    } catch (err) {
      console.error('[api-waitlist] network error', err);
      showError('Network error. Please try again.');
    } finally {
      form.classList.remove('is-loading');
      if (btn) btn.disabled = false;
    }
  });

  if (input) input.addEventListener('input', () => showError(''));
})();
