'use strict';

const rateLimit = require('../lib/rate-limit');
const { sendJson, methodNotAllowed } = require('./_shared');

const walletRe = /^0x[0-9a-f]{40}$/i;

function scannerApiBase() {
  return (process.env.SCANNER_API_BASE || 'https://intelligence.themuse.one').replace(/\/+$/, '');
}

function firstArrayItem(value) {
  return Array.isArray(value) && value.length > 0 ? value[0] : null;
}

function pickIdentity(identity) {
  if (!identity || typeof identity !== 'object') return null;
  return {
    display_name: identity.display_name || '',
    ens: identity.ens || '',
    twitter_handle: identity.twitter_handle || '',
    farcaster_username: identity.farcaster_username || '',
    arkham_label: identity.arkham_label || '',
  };
}

function shapePreview(data, address) {
  const topCoin = firstArrayItem(data.most_copied_coins);

  return {
    ok: true,
    address,
    privacy_score: data.privacy_score,
    privacy_score_label: data.privacy_score_label,
    copier_count: data.copier_count,
    avg_copier_delay_ms: data.avg_copier_delay_ms,
    alpha_leakage_usd_30d: data.alpha_leakage_usd_30d,
    position_count: data.position_count,
    account_value: data.account_value,
    identity: pickIdentity(data.identity),
    most_copied_coins: topCoin
      ? [{
          coin: topCoin.coin,
          matching_fills: topCoin.matching_fills,
          copier_count: topCoin.copier_count,
        }]
      : [],
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const limit = rateLimit.check(req, 'scanner-preview', { max: 30, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return sendJson(res, 429, { ok: false, error: 'Too many preview scans. Try again in a few minutes.' });
  }

  const rawAddress = String(req.query?.address || '').trim().toLowerCase();
  if (!walletRe.test(rawAddress)) {
    return sendJson(res, 400, { ok: false, error: 'Enter a valid wallet address starting with 0x.' });
  }

  try {
    const upstream = await fetch(`${scannerApiBase()}/api/v1/scan/${encodeURIComponent(rawAddress)}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return sendJson(res, upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502, {
        ok: false,
        error: data.error || 'No scanner preview is available for this wallet yet.',
      });
    }

    return sendJson(res, 200, shapePreview(data, rawAddress));
  } catch (err) {
    console.error('[scanner-preview] upstream error', err);
    return sendJson(res, 502, { ok: false, error: 'Scanner preview is temporarily unavailable.' });
  }
};
