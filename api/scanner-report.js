'use strict';

const db = require('../lib/db');
const rateLimit = require('../lib/rate-limit');
const { hashIp } = require('../lib/crypto');
const { validateRequestAccess } = require('../lib/validate');
const { readJsonBody, sendJson, methodNotAllowed } = require('./_shared');

const walletRe = /^0x[0-9a-f]{40}$/i;

function scannerApiBase() {
  return (process.env.SCANNER_API_BASE || 'https://scanner-api-canary.shieldtx.avail.tools').replace(/\/+$/, '');
}

function scannerAppBase() {
  return (process.env.SCANNER_APP_BASE || 'https://scanner-canary.shieldtx.avail.tools').replace(/\/+$/, '');
}

function scanDetailUrl(address) {
  return `${scannerAppBase()}/#scan/${encodeURIComponent(address)}`;
}

async function requestScannerReport(address, email) {
  const upstream = await fetch(`${scannerApiBase()}/api/v1/scan/${encodeURIComponent(address)}/unlock`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, send_email: true }),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const err = new Error(data.error || 'Unable to generate the scanner report right now.');
    err.status = upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502;
    throw err;
  }
  return data;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const limit = rateLimit.check(req, 'scanner-report', { max: 10, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfterSec));
    return sendJson(res, 429, { ok: false, error: 'Too many report requests. Try again in a few minutes.' });
  }

  const body = readJsonBody(req);
  const rawAddress = String(body?.address || '').trim().toLowerCase();
  if (!walletRe.test(rawAddress)) {
    return sendJson(res, 400, { ok: false, error: 'Preview a valid wallet before requesting the report.' });
  }

  const result = validateRequestAccess(body);
  if (!result.ok && result.error === 'honeypot') {
    console.log('[scanner-report] honeypot triggered');
    return sendJson(res, 200, { ok: true, scan_detail_url: scanDetailUrl(rawAddress) });
  }
  if (!result.ok) {
    return sendJson(res, 400, { ok: false, error: result.error, field: result.field });
  }

  try {
    const ip = rateLimit.getClientIp(req);
    await db.insertRequestAccess({
      ...result.data,
      scanner_wallet: rawAddress,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 500),
      ip_hash: hashIp(ip),
    });

    const report = await requestScannerReport(rawAddress, result.data.email);
    return sendJson(res, 200, {
      ok: true,
      alpha_report_url: report.alpha_report_url || null,
      scan_detail_url: scanDetailUrl(rawAddress),
    });
  } catch (err) {
    console.error('[scanner-report] error', err);
    return sendJson(res, err.status || 502, {
      ok: false,
      error: err.message || 'Scanner report is temporarily unavailable.',
    });
  }
};
