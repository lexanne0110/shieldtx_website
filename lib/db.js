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
  await appendToAirtable({
    email: row.email,
    trade_type: row.trade_type,
    platforms: row.platforms,
    volume: row.volume,
    pain: row.pain,
    protection: row.protection,
    urgency: row.urgency,
    ip_hash: row.ip_hash,
    user_agent: row.user_agent,
    created_at: row.created_at,
  });
  console.log('[request-access] submission stored', { id: row.id, email_domain: emailDomain(row.email) });
  return { id: row.id };
}

// Mirror a submission into an Airtable base via the REST API.
// Token-based auth (Bearer PAT) instead of resource-level sharing, so it
// can't be blocked by Workspace admin policy the way the Apps Script route was.
// No-op until AIRTABLE_TOKEN + AIRTABLE_BASE_ID are set, so this deploys
// safely before the Airtable side is configured. Failures are logged but
// never block the form response.
async function appendToAirtable(fields) {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE || 'Invite Requests';
  if (!token || !baseId) return;

  // Airtable plain-text/single-line columns can't take arrays — join the
  // multi-select fields into comma-separated strings.
  const record = {
    ...fields,
    platforms: Array.isArray(fields.platforms) ? fields.platforms.join(', ') : fields.platforms,
    protection: Array.isArray(fields.protection) ? fields.protection.join(', ') : fields.protection,
  };

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(table)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [{ fields: record }], typecast: true }),
      },
    );
    if (!res.ok) {
      console.error('[airtable] append failed', res.status, await res.text());
    }
  } catch (err) {
    console.error('[airtable] append failed', err);
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
