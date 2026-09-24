'use strict';

const sheets = require('./sheets');

/**
 * DB adapter for ShieldTX site.
 *
 * Phase 1: in-memory stub. Submissions are logged to the function log and
 * held in a module-scope array that vanishes on the next cold start.
 *
 * Plugging in a real DB later: replace insertRequestAccess below. The API
 * handlers and the public-script clients don't import any internals of
 * this module — they only call the exports.
 */

const requestAccessSubmissions = [];

async function insertRequestAccess(submission) {
  const row = { ...submission, id: cryptoRandomId(), created_at: new Date().toISOString() };
  requestAccessSubmissions.push(row);

  // Google Sheets is the durable store for request-access submissions (it
  // replaced the old Airtable mirror). Same never-blocks contract as the API
  // access form's mirror: a broken write must never fail the form response;
  // every failure is logged loudly under GOOGLE_SHEETS_APPEND_FAILED with
  // the full row, so the function log is the recovery buffer of last resort.
  const mirror = await sheets.appendRow('Invite Requests', [
    row.email,
    row.trade_type,
    Array.isArray(row.platforms) ? row.platforms.join(', ') : row.platforms,
    row.volume,
    null, // pain — legacy, no longer collected
    Array.isArray(row.protection) ? row.protection.join(', ') : row.protection,
    null, // urgency — legacy, no longer collected
    row.ip_hash,
    row.user_agent,
    row.created_at,
    null, null, null, null, // counts/scores — manual triage
    null, null, null, null, // scores/total — manual triage
    null, null, null, null, // tier/unrecognized/completion/invite codes — manual
    null, null, null, // invite_code, sync_status, sync_updated_at — manual
    row.first_name,
    row.last_name,
    row.use_type,
    row.api_interest,
    null, null, null, // brevo_message_id, brevo_invite_sent_at, brevo_send_status — manual
  ]);

  console.log('[request-access] submission stored', {
    id: row.id,
    email_domain: emailDomain(row.email),
    mirror: mirror.ok ? 'ok' : `failed:${mirror.reason}`,
  });
  return { id: row.id, mirror };
}

// API waitlist — same phase-1 stub pattern: in-memory row plus a log line.
// No Sheets mirror yet; wire one here if the team wants these in the sheet.
const apiWaitlistSubmissions = [];

async function insertApiWaitlist(submission) {
  const row = { ...submission, id: cryptoRandomId(), created_at: new Date().toISOString() };
  apiWaitlistSubmissions.push(row);

  console.log('[api-waitlist] signup stored', {
    id: row.id,
    email_domain: emailDomain(row.email),
  });
  return { id: row.id };
}

// API access requests — same phase-1 stub pattern: in-memory row plus a log
// line. No Sheets mirror yet; wire one here if the team wants these in the sheet.
const apiAccessSubmissions = [];

async function insertApiAccess(submission) {
  const row = { ...submission, id: cryptoRandomId(), created_at: new Date().toISOString() };
  apiAccessSubmissions.push(row);

  // Mirror into Google Sheets ("API Access Requests" tab, created on demand)
  // — same never-blocks contract as the invite-request mirror: never blocks the
  // response, failures are logged loudly under a stable alert token.
  const mirror = await sheets.appendRow('API Access Requests', [
    row.created_at,
    row.email,
    row.use_case,
    row.venue_coverage,
    Array.isArray(row.other_venues) ? row.other_venues.join(', ') : row.other_venues,
    row.setup,
    row.walkthrough,
    row.ip_hash,
    row.user_agent,
  ]);

  console.log('[api-access] request stored', {
    id: row.id,
    email_domain: emailDomain(row.email),
    use_case: row.use_case,
    venue_coverage: row.venue_coverage,
    setup: row.setup,
    walkthrough: row.walkthrough,
    mirror: mirror.ok ? 'ok' : `failed:${mirror.reason}`,
  });
  return { id: row.id, mirror };
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
  insertApiWaitlist,
  insertApiAccess,
};
