'use strict';

/**
 * DB adapter for ShieldTX site.
 *
 * Phase 1: in-memory stub. Submissions are logged to the function log and
 * held in module-scope arrays that vanish on the next cold start. Invite
 * codes can be seeded via DEV_SEED_INVITE_CODES (comma-separated).
 *
 * Plugging in a real DB later: replace the four functions below. The API
 * handlers and the public-script clients don't import any internals of
 * this module — they only call the four exports.
 */

const requestAccessSubmissions = [];
const contactSubmissions = [];
const inviteUses = [];

// Seed invite codes from env so local dev works without a DB.
const seededCodes = new Map();
(function seed() {
  const raw = (process.env.DEV_SEED_INVITE_CODES || '').trim();
  if (!raw) return;
  for (const code of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    seededCodes.set(code.toUpperCase(), {
      status: 'active',
      max_uses: 0,
      used_count: 0,
      expires_at: null,
    });
  }
})();

async function insertRequestAccess(submission) {
  const row = { ...submission, id: cryptoRandomId(), created_at: new Date().toISOString() };
  requestAccessSubmissions.push(row);
  await appendToSheet({
    email: row.email,
    trade_type: row.trade_type,
    platforms: row.platforms,
    volume: row.volume,
    pain: row.pain,
    protection: row.protection,
    urgency: row.urgency,
    ip_hash: row.ip_hash,
    user_agent: row.user_agent,
  });
  console.log('[request-access] submission stored', { id: row.id, email_domain: emailDomain(row.email) });
  return { id: row.id };
}

// Mirror a submission into Google Sheets via an Apps Script web app.
// No-op until SHEETS_WEBHOOK_URL + SHEETS_WEBHOOK_SECRET are set, so this
// deploys safely before the Google side is configured. Failures are logged
// but never block the form response.
async function appendToSheet(fields) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  const secret = process.env.SHEETS_WEBHOOK_SECRET;
  if (!url || !secret) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, ...fields }),
    });
  } catch (err) {
    console.error('[sheets] append failed', err);
  }
}

async function insertContact(submission) {
  const row = { ...submission, id: cryptoRandomId(), created_at: new Date().toISOString() };
  contactSubmissions.push(row);
  console.log('[contact] submission stored', { id: row.id, email_domain: emailDomain(row.email) });
  return { id: row.id };
}

async function lookupInviteCode(code) {
  if (!code) return null;
  const key = String(code).trim().toUpperCase();
  const found = seededCodes.get(key);
  if (!found) return null;
  return { ...found, code: key };
}

async function recordInviteUse(code, meta) {
  const key = String(code).trim().toUpperCase();
  const found = seededCodes.get(key);
  if (!found) return;
  found.used_count += 1;
  if (found.max_uses > 0 && found.used_count >= found.max_uses) {
    found.status = 'exhausted';
  }
  inviteUses.push({ code: key, ...meta, used_at: new Date().toISOString() });
  console.log('[invite] use recorded', { code: key, used_count: found.used_count, status: found.status });
}

function cryptoRandomId() {
  return require('crypto').randomBytes(16).toString('hex');
}

function emailDomain(email) {
  if (typeof email !== 'string') return null;
  const at = email.indexOf('@');
  return at === -1 ? null : email.slice(at + 1).toLowerCase();
}

module.exports = {
  insertRequestAccess,
  insertContact,
  lookupInviteCode,
  recordInviteUse,
};
