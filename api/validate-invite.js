'use strict';

const db = require('../lib/db');
const { validateInviteCode } = require('../lib/validate');
const rateLimit = require('../lib/rate-limit');
const { hashIp, signInviteToken } = require('../lib/crypto');
const { readJsonBody, sendJson, methodNotAllowed } = require('./_shared');

const COOKIE_NAME = 'shieldtx_invite';
const TTL_SECONDS = 600;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const limit = rateLimit.check(req, 'validate-invite', { max: 10, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return sendJson(res, 429, { ok: false, error: 'Too many attempts. Try again in a few minutes.' });
  }

  const body = readJsonBody(req);
  const result = validateInviteCode(body);
  if (!result.ok) {
    return sendJson(res, 400, { ok: false, error: result.error, field: result.field });
  }

  try {
    const found = await db.lookupInviteCode(result.data.code);
    if (!found || found.status !== 'active') {
      return sendJson(res, 401, { ok: false, error: 'Invalid or expired code.' });
    }
    if (found.expires_at && new Date(found.expires_at).getTime() < Date.now()) {
      return sendJson(res, 401, { ok: false, error: 'Invalid or expired code.' });
    }
    if (found.max_uses > 0 && found.used_count >= found.max_uses) {
      return sendJson(res, 401, { ok: false, error: 'Invalid or expired code.' });
    }

    const ip = rateLimit.getClientIp(req);
    await db.recordInviteUse(result.data.code, {
      ip_hash: hashIp(ip),
      user_agent: String(req.headers['user-agent'] || '').slice(0, 500),
    });

    const token = signInviteToken({ ttlSeconds: TTL_SECONDS });
    const isProd = process.env.VERCEL_ENV === 'production';
    const cookieAttrs = [
      `${COOKIE_NAME}=${token}`,
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      `Max-Age=${TTL_SECONDS}`,
    ];
    if (isProd) cookieAttrs.push('Secure');
    res.setHeader('Set-Cookie', cookieAttrs.join('; '));

    const redirect = process.env.APP_URL || 'https://beta.shieldtx.xyz/';
    return sendJson(res, 200, { ok: true, redirect });
  } catch (err) {
    console.error('[validate-invite] error', err);
    return sendJson(res, 500, { ok: false, error: 'Something went wrong. Please try again.' });
  }
};
