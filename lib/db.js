'use strict';

/**
 * DB adapter for ShieldTX site.
 *
 * Phase 1: in-memory stub. Submissions are logged to the function log and
 * held in module-scope arrays that vanish on the next cold start.
 *
 * Plugging in a real DB later: replace the two functions below. The API
 * handlers and the public-script clients don't import any internals of
 * this module — they only call the two exports.
 */

const requestAccessSubmissions = [];
const supportSubmissions = [];

async function insertRequestAccess(submission) {
  const row = { ...submission, id: cryptoRandomId(), created_at: new Date().toISOString() };
  requestAccessSubmissions.push(row);
  await appendToAirtable({
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    trade_type: row.trade_type,
    platforms: row.platforms,
    volume: row.volume,
    pain: row.pain,
    protection: row.protection,
    urgency: row.urgency,
    use_type: row.use_type,
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
async function appendToAirtable(fields, tableName) {
  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = tableName || process.env.AIRTABLE_TABLE || 'Invite Requests';
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

async function insertSupport(submission) {
  const row = { ...submission, id: cryptoRandomId(), created_at: new Date().toISOString() };
  supportSubmissions.push(row);
  await appendToAirtable(
    {
      email: row.email,
      subject: row.subject,
      details: row.details,
      ip_hash: row.ip_hash,
      user_agent: row.user_agent,
      created_at: row.created_at,
    },
    process.env.AIRTABLE_SUPPORT_TABLE || 'Support Queries',
  );
  console.log('[support] submission stored', { id: row.id, email_domain: emailDomain(row.email) });
  return { id: row.id };
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
  insertSupport,
};
