'use strict';

/**
 * POST /api/newsletter — the weekly report sign-up.
 *
 * One field. The address lands in the "Newsletter Signups" tab of the same
 * Google Sheet every other form on the site writes to (see lib/db.js and
 * lib/sheets.js), so the whole list lives in one document and needs no ESP
 * import step to be read by a human.
 *
 * Never blocks on a broken mirror: lib/sheets.js swallows the failure and
 * logs the full row under GOOGLE_SHEETS_APPEND_FAILED.
 */

const db = require('../lib/db');
const { validateNewsletterSignup } = require('../lib/validate');
const rateLimit = require('../lib/rate-limit');
const { hashIp } = require('../lib/crypto');
const { readJsonBody, sendJson, methodNotAllowed } = require('./_shared');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  // Generous: a legitimate reader submits once, and the page has two forms.
  const limit = rateLimit.check(req, 'newsletter', { max: 6, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return sendJson(res, 429, { ok: false, error: 'Too many attempts. Try again in a few minutes.' });
  }

  const body = readJsonBody(req);
  const result = validateNewsletterSignup(body);

  // Honeypot: answer 200 so the bot sees the same thing a person does.
  if (!result.ok && result.error === 'honeypot') {
    console.log('[newsletter] honeypot triggered');
    return sendJson(res, 200, { ok: true });
  }

  if (!result.ok) {
    return sendJson(res, 400, { ok: false, error: result.error, field: result.field });
  }

  try {
    const ip = rateLimit.getClientIp(req);
    const stored = await db.insertNewsletterSignup({
      ...result.data,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 500),
      ip_hash: hashIp(ip),
    });

    // A duplicate is reported as success on purpose: telling a caller "you are
    // already subscribed" leaks whether an address is on the list.
    return sendJson(res, 200, { ok: true, duplicate: Boolean(stored.duplicate) });
  } catch (err) {
    console.error('[newsletter] db error', err);
    return sendJson(res, 500, { ok: false, error: 'Something went wrong. Please try again.' });
  }
};
