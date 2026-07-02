'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const REQUEST_ACCESS_ENUMS = {
  tradeType: ['perps-only', 'mostly-perps', 'mix', 'mostly-spot'],
  volume: ['lt-50k', '50k-250k', '250k-1m', '1m-5m', '5m-plus'],
  platforms: ['hyperliquid', 'dydx', 'gmx', 'cex', 'other-dex'],
  pain: ['recurring', 'few-times', 'suspect', 'no'],
  protection: ['multi-wallet', 'timing', 'smaller', 'private-rpc', 'nothing'],
  urgency: ['now', 'month', 'exploring'],
};

function clampString(input, max) {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function asArray(input) {
  if (Array.isArray(input)) return input;
  if (input == null || input === '') return [];
  return [input];
}

function pickEnum(value, allowed) {
  return allowed.includes(value) ? value : null;
}

function pickEnumArray(values, allowed) {
  return asArray(values)
    .map((v) => pickEnum(v, allowed))
    .filter(Boolean);
}

/**
 * Validates the Request Access payload. Returns { ok: true, data } or
 * { ok: false, error, field }. Every field is required — names, email, and
 * all six screener answers must be present and valid.
 */
function validateRequestAccess(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid payload.', field: null };
  }

  if (body.company_url) {
    // Honeypot — pretend success, log silently in the handler.
    return { ok: false, error: 'honeypot', field: 'company_url' };
  }

  const first_name = clampString(body.first_name, 60);
  if (!first_name) {
    return { ok: false, error: 'Enter your first name.', field: 'first_name' };
  }

  const last_name = clampString(body.last_name, 60);
  if (!last_name) {
    return { ok: false, error: 'Enter your last name.', field: 'last_name' };
  }

  const email = clampString(body.email, 254);
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Enter a valid email.', field: 'email' };
  }

  const trade_type = pickEnum(body['trade-type'] || body.trade_type, REQUEST_ACCESS_ENUMS.tradeType);
  if (!trade_type) {
    return { ok: false, error: 'Select what you primarily trade.', field: 'trade-type' };
  }

  const platforms = pickEnumArray(body.platforms, REQUEST_ACCESS_ENUMS.platforms);
  if (platforms.length === 0) {
    return { ok: false, error: 'Select at least one platform.', field: 'platforms' };
  }

  const volume = pickEnum(body.volume, REQUEST_ACCESS_ENUMS.volume);
  if (!volume) {
    return { ok: false, error: 'Select your monthly volume.', field: 'volume' };
  }

  const pain = pickEnum(body.pain, REQUEST_ACCESS_ENUMS.pain);
  if (!pain) {
    return { ok: false, error: 'Select an answer.', field: 'pain' };
  }

  const protection = pickEnumArray(body.protection, REQUEST_ACCESS_ENUMS.protection);
  if (protection.length === 0) {
    return { ok: false, error: 'Select at least one option.', field: 'protection' };
  }

  const urgency = pickEnum(body.urgency, REQUEST_ACCESS_ENUMS.urgency);
  if (!urgency) {
    return { ok: false, error: 'Select your timeline.', field: 'urgency' };
  }

  const data = {
    first_name,
    last_name,
    email: email.toLowerCase(),
    trade_type,
    platforms,
    volume,
    pain,
    protection,
    urgency,
  };

  return { ok: true, data };
}

function validateContact(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid payload.', field: null };
  }
  if (body.company_url) {
    return { ok: false, error: 'honeypot', field: 'company_url' };
  }

  const name = clampString(body.name, 120);
  if (!name) return { ok: false, error: 'Enter your name.', field: 'name' };

  const email = clampString(body.email, 254);
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'Enter a valid email.', field: 'email' };

  const message = clampString(body.message, 4000);
  if (message.length < 2) return { ok: false, error: 'Message is too short.', field: 'message' };

  return { ok: true, data: { name, email: email.toLowerCase(), message } };
}

module.exports = {
  validateRequestAccess,
  validateContact,
  REQUEST_ACCESS_ENUMS,
};
