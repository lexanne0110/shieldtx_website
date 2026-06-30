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

module.exports = { hashIp };
