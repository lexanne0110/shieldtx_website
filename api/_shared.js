'use strict';

/**
 * Shared helpers for ShieldTX API handlers. Vercel Node serverless
 * functions receive (req, res) — req.body is already parsed for JSON
 * when Content-Type is application/json, but we add a safe fallback.
 */

function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return null;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res, allowed = ['POST']) {
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
}

module.exports = { readJsonBody, sendJson, methodNotAllowed };
