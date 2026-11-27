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

  // ---- Landing attribution (PostHog) --------------------------------------
  // /newsletter has to answer "how many arrived, and from where". PostHog's
  // $pageview already carries $referrer and the campaign params, but it is
  // shared by every page and carries no classification, so charting
  // internal vs external vs campaign vs direct means parsing it every time.
  //
  // One dedicated event per load, plus the same values registered as super
  // properties so form_submit_succeeded is attributable without a join.
  //
  //   newsletter_landing_viewed { arrival, referrer_host, referrer_path,
  //                               utm_source, utm_medium, utm_campaign,
  //                               utm_term, utm_content, has_utm,
  //                               landing_path }
  //
  // arrival is one of: utm | internal | external | direct. A campaign link
  // wins the label even when it also has a referrer: that is what is being
  // measured. Nothing here reads or sends anything the visitor typed.
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  // Same site means the same registrable host: a visitor coming from
  // shieldtx.xyz to www.shieldtx.xyz (or from app./blog.) is an internal hop,
  // not an external referral. Comparing hostnames exactly reported those as
  // external, which would have made the apex and the app look like channels.
  function baseHost(host) {
    return String(host || '').toLowerCase().replace(/^www\./, '');
  }

  function trackLanding() {
    var params = null;
    try { params = new URLSearchParams(window.location.search); } catch (_) {}

    var props = { landing_path: window.location.pathname, has_utm: false, arrival: 'direct' };
    var superProps = {};

    if (params) {
      for (var i = 0; i < UTM_KEYS.length; i++) {
        var value = params.get(UTM_KEYS[i]);
        if (value) {
          props[UTM_KEYS[i]] = value;
          props.has_utm = true;
        }
      }
    }

    var referrer = document.referrer || '';
    if (referrer) {
      try {
        var url = new URL(referrer);
        props.referrer_host = url.hostname;
        props.referrer_path = url.pathname;
        props.arrival = (baseHost(url.hostname) === baseHost(window.location.hostname)) ? 'internal' : 'external';
      } catch (_) {
        props.arrival = 'external';
      }
    }
    if (props.has_utm) props.arrival = 'utm';

    superProps.nl_arrival = props.arrival;
    if (props.utm_source) superProps.nl_utm_source = props.utm_source;
    if (props.utm_campaign) superProps.nl_utm_campaign = props.utm_campaign;

    // The event is the artefact that matters, so it goes first and in its own
    // guard: a register() that throws must never cost the landing event.
    try {
      if (window.posthog && typeof window.posthog.capture === 'function') {
        window.posthog.capture('newsletter_landing_viewed', props);
      }
    } catch (_) {}

    try {
      if (window.posthog && typeof window.posthog.register === 'function') {
        window.posthog.register(superProps);
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
    trackLanding();
    var forms = document.querySelectorAll('[data-newsletter-form]');
    for (var i = 0; i < forms.length; i++) bind(forms[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
