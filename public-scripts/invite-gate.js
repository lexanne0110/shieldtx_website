/* =========================================================================
   ShieldTX — Invite gate

   Lives on /app. Submits the code to /api/validate-invite. On success,
   the API returns { ok: true, redirect } and sets a short-lived signed
   cookie. We then window.location.assign(redirect) — the beta app at
   APP_URL handles its own session.

   States are reflected on the form via data-state="idle|submitting|error".
   Focus is trapped inside the gate; Escape sends the user back to "/".
   ========================================================================= */

(function () {
  'use strict';

  const form = document.getElementById('invite-form');
  if (!form) return;

  const input = form.querySelector('input[name="code"]');
  const submitBtn = form.querySelector('[data-invite-submit]');
  const errorEl = form.querySelector('[data-invite-error]');

  function setState(state) {
    form.dataset.state = state;
    submitBtn.disabled = state === 'submitting';
    submitBtn.classList.toggle('is-loading', state === 'submitting');
  }

  function showError(msg) {
    if (!errorEl) return;
    if (msg) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
      form.classList.add('is-shake');
      setTimeout(() => form.classList.remove('is-shake'), 320);
    } else {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.dataset.state === 'submitting') return;
    const code = input.value.trim();
    if (!code) {
      showError('Enter your invite code.');
      input.focus();
      return;
    }

    setState('submitting');
    showError('');

    try {
      const res = await fetch('/api/validate-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok && json.redirect) {
        // Briefly show success state, then redirect.
        setState('success');
        setTimeout(() => window.location.assign(json.redirect), 350);
        return;
      }
      setState('idle');
      showError(json.error || 'Invalid or expired code.');
      input.select();
    } catch (err) {
      console.error('[invite-gate] network error', err);
      setState('idle');
      showError('Network error. Please try again.');
    }
  });

  input.addEventListener('input', () => {
    if (errorEl && !errorEl.hidden) showError('');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modalAccess = document.getElementById('invite-modal');
      if (modalAccess && modalAccess.classList.contains('is-open')) return;
      window.location.assign('/');
    }
  });

  // Autofocus the input on mount.
  setTimeout(() => input.focus(), 80);
})();
