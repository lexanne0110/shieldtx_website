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
 * { ok: false, error, field }. We accept missing optional screener fields
 * so the form can be submitted from step 1 (email-only) in future.
 */
function validateRequestAccess(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid payload.', field: null };
  }

  if (body.company_url) {
    // Honeypot — pretend success, log silently in the handler.
    return { ok: false, error: 'honeypot', field: 'company_url' };
  }

  const email = clampString(body.email, 254);
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: 'Enter a valid email.', field: 'email' };
  }

  const data = {
    email: email.toLowerCase(),
    trade_type: pickEnum(body['trade-type'] || body.trade_type, REQUEST_ACCESS_ENUMS.tradeType),
    platforms: pickEnumArray(body.platforms, REQUEST_ACCESS_ENUMS.platforms),
    volume: pickEnum(body.volume, REQUEST_ACCESS_ENUMS.volume),
    pain: pickEnum(body.pain, REQUEST_ACCESS_ENUMS.pain),
    protection: pickEnumArray(body.protection, REQUEST_ACCESS_ENUMS.protection),
    urgency: pickEnum(body.urgency, REQUEST_ACCESS_ENUMS.urgency),
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

function validateInviteCode(body) {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid payload.' };
  }
  const code = clampString(body.code, 64);
  if (!code) return { ok: false, error: 'Enter your invite code.', field: 'code' };
  if (!/^[A-Za-z0-9_-]+$/.test(code)) {
    return { ok: false, error: 'Invalid characters in code.', field: 'code' };
  }
  return { ok: true, data: { code } };
}

module.exports = {
  validateRequestAccess,
  validateContact,
  validateInviteCode,
  REQUEST_ACCESS_ENUMS,
};
