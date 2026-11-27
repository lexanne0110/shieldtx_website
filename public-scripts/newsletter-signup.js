/* =========================================================================
   ShieldTX — weekly report sign-up

   Progressive enhancement for the one-field email form on /newsletter (there
   are two instances: hero + footer CTA). Without this file the form posts
   natively to `action="#"` and the page simply reloads, so nothing is ever
   silently lost.

   Contract expected by this module:
     <form data-newsletter-form="hero|footer">
       <input class="nl-input" type="email" name="email" required>
       <p class="nl-error" data-nl-error hidden></p>
     </form>
     <div class="nl-success" role="status">…</div>   ← immediate sibling

   Submission destination defaults to /api/newsletter (POST { email, source })
   and can be overridden with window.SHIELDTX_NEWSLETTER_ENDPOINT. The address
   lands in the "Newsletter Signups" tab of the same Google Sheet the other
   forms write to.

   Analytics reuse the site's form funnel taxonomy with form_id 'newsletter',
   PII-free: field names only, never the address.
   ========================================================================= */

(function () {
  'use strict';

  var FORM_ID = 'newsletter';

  function capture(event, props) {
    try {
      if (window.posthog && typeof window.posthog.capture === 'function') {
        window.posthog.capture(event, props || {});
      }
    } catch (_) {}
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function bind(form) {
    if (form.dataset.boundNewsletter === '1') return;
    form.dataset.boundNewsletter = '1';

    var source = form.getAttribute('data-newsletter-form') || 'unknown';
    var input = form.querySelector('input[name="email"]');
    var errorEl = form.querySelector('[data-nl-error]');
    var button = form.querySelector('button[type="submit"]');
    var successEl = form.nextElementSibling;
    var started = false;

    if (!input || !button) return;

    function trackStart() {
      if (started) return;
      started = true;
      capture('form_started', { form_id: FORM_ID, source: source });
    }

    function showError(message) {
      form.classList.add('is-invalid');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.hidden = false;
      }
      input.setAttribute('aria-invalid', 'true');
    }

    function clearError() {
      form.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
    }

    input.addEventListener('focus', trackStart, { once: true });
    input.addEventListener('input', function () {
      trackStart();
      if (form.classList.contains('is-invalid')) clearError();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      trackStart();

      var value = (input.value || '').trim();

      if (!value) {
        showError('Enter your email address.');
        capture('form_validation_error', { form_id: FORM_ID, field: 'email', reason: 'empty' });
        input.focus();
        return;
      }
      if (!EMAIL_RE.test(value)) {
        showError('That email address does not look right.');
        capture('form_validation_error', { form_id: FORM_ID, field: 'email', reason: 'format' });
        input.focus();
        return;
      }

      clearError();
      form.dataset.state = 'submitting';
      form.setAttribute('aria-busy', 'true');
      button.disabled = true;
      capture('form_submitted', { form_id: FORM_ID, source: source });

      var endpoint = window.SHIELDTX_NEWSLETTER_ENDPOINT || '/api/newsletter';
      var honeypot = form.querySelector('[name="company_url"]');
      var request = fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: value,
          source: source,
          company_url: honeypot ? honeypot.value : '',
          ts: new Date().toISOString()
        })
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          if (!response.ok || !data.ok) {
            var err = new Error(data && data.error ? data.error : 'HTTP ' + response.status);
            err.status = response.status;
            throw err;
          }
          return data;
        });
      });

      request
        .then(function (data) {
          capture('form_submit_succeeded', { form_id: FORM_ID, source: source, duplicate: Boolean(data && data.duplicate) });
          form.classList.add('is-sent');
          form.dataset.state = 'sent';
          form.removeAttribute('aria-busy');
          if (successEl && successEl.classList.contains('nl-success')) {
            successEl.setAttribute('tabindex', '-1');
            successEl.focus({ preventScroll: true });
          }
        })
        .catch(function (error) {
          var status = error && error.status;
          var message = 'Something went wrong. Try again in a moment.';
          if (status === 400 && error.message) message = error.message;
          if (status === 429) message = 'Too many attempts. Try again in a few minutes.';

          capture('form_submit_failed', { form_id: FORM_ID, source: source, status: status || 0, reason: String(error && error.message || 'error') });
          form.dataset.state = 'idle';
          form.removeAttribute('aria-busy');
          button.disabled = false;
          showError(message);
        });
    });
  }

  function init() {
    var forms = document.querySelectorAll('[data-newsletter-form]');
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
