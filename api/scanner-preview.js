'use strict';

const rateLimit = require('../lib/rate-limit');
const { sendJson, methodNotAllowed } = require('./_shared');

const walletRe = /^0x[0-9a-f]{40}$/i;

function scannerApiBase() {
  return (process.env.SCANNER_API_BASE || 'https://scanner-v2-canary.shieldtx.avail.tools').replace(/\/+$/, '');
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stringOrNull(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function publicStatus(value, fallback = 'unavailable') {
  return stringOrNull(value) || fallback;
}

function publicWarning(warning) {
  if (!warning || typeof warning !== 'object') return null;
  return {
    field: stringOrNull(warning.field),
    status: publicStatus(warning.status),
    message: stringOrNull(warning.message),
  };
}

function shapePreview(data, address) {
  const source = objectOrEmpty(data);
  const fieldMeta = objectOrEmpty(source.field_meta);
  const coverage = {
    scan: publicStatus(source.state),
    data_quality: publicStatus(source.data_quality, 'unknown'),
    stale: Boolean(source.stale),
    copy: publicStatus(source.copier_count_status || objectOrEmpty(fieldMeta.copier_count).status),
    positions: publicStatus(source.position_status || objectOrEmpty(fieldMeta.positions).status),
    activity: publicStatus(source.activity_status, 'unknown'),
  };

  return {
    ok: true,
    address,
    state: coverage.scan,
    privacy_score: numberOrNull(source.privacy_score),
    privacy_score_label: stringOrNull(source.privacy_score_label),
    privacy_tier: numberOrNull(source.privacy_tier),
    copy_exposure: numberOrNull(source.signal_copy_exposure),
    copier_count: numberOrNull(source.copier_count),
    copier_count_status: coverage.copy,
    recent_activity: {
      fill_count: numberOrNull(source.recent_fill_count),
      status: coverage.activity,
    },
    coverage,
    data_warnings: Array.isArray(source.data_warnings)
      ? source.data_warnings.map(publicWarning).filter(Boolean).slice(0, 4)
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
