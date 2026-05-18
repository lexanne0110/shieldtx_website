'use strict';

const crypto = require('crypto');

/**
 * Hash a client IP with a server-side pepper so we keep abuse signal
 * (same IP) without storing raw IPs alongside form submissions.
 */
function hashIp(ip) {
  const pepper = process.env.IP_HASH_PEPPER || '';
  if (!pepper) {
    // Dev fallback. A warning in prod is enough — we don't want to break
    // the form flow if the secret is misconfigured.
    if (process.env.VERCEL_ENV === 'production') {
      console.warn('[crypto] IP_HASH_PEPPER missing in production');
    }
  }
  return crypto.createHmac('sha256', pepper).update(String(ip)).digest('hex').slice(0, 32);
}

/**
 * Generate a short-lived signed token for the invite-gate cookie.
 * Format: base64url(payload).base64url(hmac).
 * payload = JSON({ exp: epoch_seconds })
 */
function signInviteToken({ ttlSeconds = 600 } = {}) {
  const secret = process.env.INVITE_CODE_SECRET || 'dev-only-secret-do-not-use-in-prod';
  const payload = JSON.stringify({ exp: Math.floor(Date.now() / 1000) + ttlSeconds });
  const p = b64url(payload);
  const sig = b64url(crypto.createHmac('sha256', secret).update(p).digest());
  return `${p}.${sig}`;
}

function verifyInviteToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [p, sig] = token.split('.');
  const secret = process.env.INVITE_CODE_SECRET || 'dev-only-secret-do-not-use-in-prod';
  const expected = b64url(crypto.createHmac('sha256', secret).update(p).digest());
  if (!safeEqual(sig, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(p, 'base64').toString('utf8'));
    return payload.exp && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input));
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

module.exports = { hashIp, signInviteToken, verifyInviteToken };
