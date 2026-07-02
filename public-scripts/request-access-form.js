/* =========================================================================
   ShieldTX — Request Access form behavior (shared)

   The form markup lives in HTML on each page that uses it (the hero modal in
   /index.html and the permalink page in /request-access/index.html). This
   module only attaches behavior — step navigation, the brand dropdown
   component, validation, and the POST to /api/request-access.

   Usage:
     window.ShieldTX.bindRequestAccessForm(formEl, { mode })

   - formEl: HTMLFormElement (the <form class="waitlist-form">)
   - mode:   "modal" | "page"

   Field/structure contract expected by this module:
   - <form data-state="idle"> with a [data-form-error] live region
   - <section class="waitlist-step is-active" data-step="1|2|3|result">
   - [data-dropdown] wrappers around hidden <select> + trigger + panel
   - [data-waitlist-back], [data-waitlist-next], [data-waitlist-submit],
     [data-waitlist-done], [data-waitlist-progress]
   ========================================================================= */

(function () {
  'use strict';

  const ShieldTX = (window.ShieldTX = window.ShieldTX || {});

  ShieldTX.bindRequestAccessForm = function bindRequestAccessForm(formEl, opts) {
    const form = typeof formEl === 'string' ? document.querySelector(formEl) : formEl;
    if (!form || form.dataset.boundRequestAccess === '1') return null;
    form.dataset.boundRequestAccess = '1';
    const mode = (opts && opts.mode) || 'modal';
    form.classList.add(`is-mode-${mode}`);

    const root = form.closest('.waitlist-mount') || form.parentElement || form;
    const steps = Array.from(form.querySelectorAll('.waitlist-step'));
    const progressFill = root.querySelector('[data-waitlist-progress]');
    const backBtn = form.querySelector('[data-waitlist-back]');
    const nextBtn = form.querySelector('[data-waitlist-next]');
    const submitBtn = form.querySelector('[data-waitlist-submit]');
    const doneBtn = form.querySelector('[data-waitlist-done]');
    const errorEl = form.querySelector('[data-form-error]');
    const questionSteps = steps.filter((s) => s.dataset.step !== 'result');
    let idx = Math.max(0, steps.findIndex((s) => s.classList.contains('is-active')));

    form.querySelectorAll('[data-dropdown]').forEach(initDropdown);

    function stepValid() {
      const step = steps[idx];
      if (!step) return false;
      const emailInput = step.querySelector('input[type="email"]');
      if (emailInput) {
        const v = emailInput.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return false;
        // Also require any text inputs marked required on this step (name fields).
        const requiredTexts = step.querySelectorAll('input[type="text"][required]');
        return Array.from(requiredTexts).every((t) => t.value.trim().length > 0);
      }
      const selects = step.querySelectorAll('select');
      if (selects.length === 0) return true;
      return Array.from(selects).every((sel) => {
        if (sel.multiple) return Array.from(sel.selectedOptions).some((o) => o.value);
        return !!sel.value;
      });
    }

    function updateChrome() {
      const isResult = steps[idx].dataset.step === 'result';
      const isLastQ = idx === questionSteps.length - 1;
      if (progressFill) {
        progressFill.style.width = isResult ? '100%' : `${((idx + 1) / questionSteps.length) * 100}%`;
      }
      if (backBtn) backBtn.hidden = idx === 0 || isResult;
      if (nextBtn) nextBtn.hidden = isLastQ || isResult;
      if (submitBtn) submitBtn.hidden = !isLastQ || isResult;
      if (doneBtn) doneBtn.hidden = !isResult;
      const valid = stepValid();
      if (nextBtn) nextBtn.disabled = !valid;
      if (submitBtn) submitBtn.disabled = !valid || form.dataset.state === 'submitting';
    }

    function goTo(target) {
      steps[idx].classList.remove('is-active');
      idx = target;
      steps[idx].classList.add('is-active');
      updateChrome();
      const focusable = steps[idx].querySelector('input, button[data-dropdown-trigger]');
      if (focusable) setTimeout(() => focusable.focus(), 60);
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (!stepValid()) return;
        if (idx >= questionSteps.length - 1) return;
        goTo(idx + 1);
      });
    }
    if (backBtn) {
      backBtn.addEventListener('click', () => { if (idx > 0) goTo(idx - 1); });
    }

    form.addEventListener('input', updateChrome);
    form.addEventListener('change', updateChrome);
    form.addEventListener('reset', () => {
      setTimeout(() => {
        steps.forEach((s) => s.classList.remove('is-active'));
        idx = 0;
        steps[0].classList.add('is-active');
        setState('idle');
        showError('');
        updateChrome();
      }, 0);
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!stepValid()) return;
      if (form.dataset.state === 'submitting') return;

      const data = new FormData(form);
      const payload = {
        first_name: (data.get('first_name') || '').toString().trim(),
        last_name: (data.get('last_name') || '').toString().trim(),
        email: (data.get('email') || '').toString().trim(),
        'trade-type': data.get('trade-type') || null,
        platforms: data.getAll('platforms'),
        volume: data.get('volume') || null,
        pain: data.get('pain') || null,
        protection: data.getAll('protection'),
        urgency: data.get('urgency') || null,
        company_url: data.get('company_url') || '',
      };

      setState('submitting');
      showError('');

      try {
        const res = await fetch('/api/request-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.ok) {
          setState('success');
          const resultIdx = steps.findIndex((s) => s.dataset.step === 'result');
          if (resultIdx > -1) goTo(resultIdx);
        } else {
          setState('idle');
          showError(json.error || 'Submission failed. Please try again.');
        }
      } catch (err) {
        console.error('[request-access] network error', err);
        setState('idle');
        showError('Network error. Please try again.');
      }
    });

    if (doneBtn) {
      doneBtn.addEventListener('click', () => {
        const modal = form.closest('.modal');
        if (modal) {
          const closeBtn = modal.querySelector('[data-modal-close]');
          if (closeBtn) closeBtn.click();
        } else if (mode === 'page') {
          window.location.assign('/');
        }
      });
    }

    function setState(state) {
      form.dataset.state = state;
      if (submitBtn) {
        submitBtn.disabled = state === 'submitting' || !stepValid();
        submitBtn.classList.toggle('is-loading', state === 'submitting');
      }
    }

    function showError(msg) {
      if (!errorEl) return;
      if (msg) {
        errorEl.textContent = msg;
        errorEl.hidden = false;
      } else {
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
    }

    updateChrome();
    return { reset: () => form.reset() };
  };

  function initDropdown(root) {
    if (root.dataset.boundDropdown === '1') return;
    root.dataset.boundDropdown = '1';

    const select = root.querySelector('.waitlist-dropdown-native');
    const trigger = root.querySelector('[data-dropdown-trigger]');
    const labelEl = trigger && trigger.querySelector('.waitlist-dropdown-label');
    const panel = root.querySelector('[data-dropdown-panel]');
    if (!select || !trigger || !panel || !labelEl) return;

    const multi = select.multiple;
    const placeholder = labelEl.textContent;
    root.classList.add(multi ? 'is-multi' : 'is-single');

    while (panel.firstChild) panel.removeChild(panel.firstChild);
    const opts = Array.from(select.options).filter((o) => !o.disabled);
    opts.forEach((opt) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'waitlist-dropdown-row';
      row.setAttribute('role', 'option');
      row.dataset.value = opt.value;
      if (multi) {
        const check = document.createElement('span');
        check.className = 'waitlist-dropdown-check';
        check.setAttribute('aria-hidden', 'true');
        row.appendChild(check);
      }
      const lbl = document.createElement('span');
      lbl.className = 'waitlist-dropdown-row-label';
      lbl.textContent = opt.textContent;
      row.appendChild(lbl);
      panel.appendChild(row);
    });

    const syncFromSelect = () => {
      if (multi) {
        const picked = Array.from(select.selectedOptions);
        if (picked.length === 0) {
          labelEl.textContent = placeholder;
          labelEl.classList.add('is-placeholder');
        } else if (picked.length === 1) {
          labelEl.textContent = picked[0].textContent;
          labelEl.classList.remove('is-placeholder');
        } else {
          labelEl.textContent = `${picked.length} Selected`;
          labelEl.classList.remove('is-placeholder');
        }
      } else {
        const v = select.value;
        if (!v) {
          labelEl.textContent = placeholder;
          labelEl.classList.add('is-placeholder');
        } else {
          labelEl.textContent = select.options[select.selectedIndex].textContent;
          labelEl.classList.remove('is-placeholder');
        }
      }
      panel.querySelectorAll('.waitlist-dropdown-row').forEach((row) => {
        const opt = Array.from(select.options).find((o) => o.value === row.dataset.value);
        const isSel = !!opt && opt.selected;
        row.classList.toggle('is-selected', isSel);
        row.setAttribute('aria-selected', isSel ? 'true' : 'false');
      });
    };

    const closeAll = () => {
      document.querySelectorAll('[data-dropdown]').forEach((d) => {
        const p = d.querySelector('[data-dropdown-panel]');
        const t = d.querySelector('[data-dropdown-trigger]');
        if (p && !p.hidden) p.hidden = true;
        if (t) t.setAttribute('aria-expanded', 'false');
        d.classList.remove('is-open');
      });
    };
    const openThis = () => {
      closeAll();
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      root.classList.add('is-open');
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (panel.hidden) openThis(); else closeAll();
    });

    panel.addEventListener('click', (e) => {
      const row = e.target.closest('.waitlist-dropdown-row');
      if (!row) return;
      e.preventDefault();
      const opt = Array.from(select.options).find((o) => o.value === row.dataset.value);
      if (!opt) return;
      if (multi) opt.selected = !opt.selected;
      else Array.from(select.options).forEach((o) => { o.selected = (o === opt); });
      select.dispatchEvent(new Event('change', { bubbles: true }));
      syncFromSelect();
      if (!multi) closeAll();
    });

    document.addEventListener('click', (e) => {
      if (!root.contains(e.target) && !panel.hidden) closeAll();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) closeAll();
    });

    if (select.form) {
      select.form.addEventListener('reset', () => setTimeout(syncFromSelect, 0));
    }

    syncFromSelect();
  }
})();
