/* =========================================================================
   ShieldTX — Modal controller (shared)

   Wires up `[data-modal-open="<id>"]` and `[data-modal-close]` triggers,
   handles the Escape key, locks body scroll, and (for the Request Access
   modal) syncs the URL bar to `/request-access` via history.pushState so the
   modal has a real permalink. Closing the modal calls history.back(); the
   standalone page at /request-access/ is the fallback for direct visits.

   Usage:
     window.ShieldTX.modal.init();          // wires page on DOMContentLoaded
     window.ShieldTX.modal.open(id);        // imperative open (rare)
     window.ShieldTX.modal.close(modalEl);  // imperative close (rare)

   URL-synced modals are listed in URL_SYNCED_MODALS below; opening one
   pushes its mapped path, closing pops history.
   ========================================================================= */

(function () {
  'use strict';

  const ShieldTX = (window.ShieldTX = window.ShieldTX || {});
  if (ShieldTX.modal) return;

  const URL_SYNCED_MODALS = {
    'invite-modal': '/request-access',
  };

  const STATE_KEY = 'shieldtxModal';

  let suppressHistory = false;

  function lockScroll() {
    document.body.classList.add('modal-locked');
    if (window.lenis && typeof window.lenis.stop === 'function') window.lenis.stop();
  }

  function unlockScroll() {
    document.body.classList.remove('modal-locked');
    if (window.lenis && typeof window.lenis.start === 'function') window.lenis.start();
  }

  function openDom(modal) {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    lockScroll();
    const focusTarget = modal.querySelector('input, button, [tabindex]:not([tabindex="-1"])');
    if (focusTarget) setTimeout(() => focusTarget.focus(), 60);
  }

  function closeDom(modal) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.is-open')) unlockScroll();
    const success = modal.querySelector('[data-modal-success]');
    if (success) success.hidden = true;
    const form = modal.querySelector('form');
    if (form && typeof form.reset === 'function') form.reset();
  }

  function open(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    openDom(modal);
    const path = URL_SYNCED_MODALS[id];
    if (!path || suppressHistory) return;
    const state = { [STATE_KEY]: id, prev: location.pathname + location.search };
    try { history.pushState(state, '', path); } catch (_) { /* noop */ }
  }

  function close(modal) {
    if (!modal) return;
    const id = modal.id;
    const isSynced = id && URL_SYNCED_MODALS[id];
    const ourStateOnStack = isSynced && history.state && history.state[STATE_KEY] === id;
    if (ourStateOnStack) {
      // Let popstate run closeDom — avoids double-close and keeps history clean.
      history.back();
      return;
    }
    closeDom(modal);
  }

  function onPopState() {
    const openModals = document.querySelectorAll('.modal.is-open');
    if (!openModals.length) return;
    // If our state is no longer on top, close any URL-synced modal silently.
    const top = history.state && history.state[STATE_KEY];
    openModals.forEach((modal) => {
      const id = modal.id;
      if (URL_SYNCED_MODALS[id] && top !== id) closeDom(modal);
    });
  }

  function wireTriggers(root) {
    (root || document).querySelectorAll('[data-modal-open]').forEach((trigger) => {
      if (trigger.dataset.modalBound === '1') return;
      trigger.dataset.modalBound = '1';
      trigger.addEventListener('click', (e) => {
        const id = trigger.getAttribute('data-modal-open');
        if (!document.getElementById(id)) return; // let the href fall through
        e.preventDefault();
        open(id);
      });
    });
    (root || document).querySelectorAll('[data-modal-close]').forEach((el) => {
      if (el.dataset.modalCloseBound === '1') return;
      el.dataset.modalCloseBound = '1';
      el.addEventListener('click', () => close(el.closest('.modal')));
    });
  }

  function onKeydown(e) {
    if (e.key !== 'Escape') return;
    const openModal = document.querySelector('.modal.is-open');
    if (openModal) close(openModal);
  }

  function init() {
    wireTriggers(document);
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('popstate', onPopState);
  }

  ShieldTX.modal = {
    init,
    open,
    close,
    openSilently(id) {
      // Used by legacy ?waitlist=1 handler: open without pushing a new state.
      suppressHistory = true;
      try { open(id); } finally { suppressHistory = false; }
    },
    wire: wireTriggers,
  };
})();
