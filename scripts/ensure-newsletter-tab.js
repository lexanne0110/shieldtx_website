#!/usr/bin/env node
'use strict';

/**
 * Creates the "Newsletter Signups" tab in the ShieldTX spreadsheet, with a
 * header row formatted like the neighbouring tabs' headers.
 *
 *   node scripts/ensure-newsletter-tab.js          # create if missing
 *   node scripts/ensure-newsletter-tab.js --check  # report only, no writes
 *
 * Idempotent: if the tab already has a header in A1 it does nothing. Writes no
 * data rows — the API function owns those. Reads credentials from .env.local
 * (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..');
const TAB = 'Newsletter Signups';
const HEADERS = ['Created at', 'Email', 'Source', 'IP hash (internal)', 'User agent'];
const FORMAT_SOURCE_TAB = 'API Access Requests'; // header style reference
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const CHECK_ONLY = process.argv.includes('--check');

function loadEnv() {
  const file = path.join(REPO, '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = v.replace(/\\n/g, '\n');
  }
}

const b64url = (s) => Buffer.from(s).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function token() {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const sig = b64url(signer.sign(process.env.GOOGLE_PRIVATE_KEY));

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${sig}`,
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) throw new Error(`token exchange failed: HTTP ${res.status} ${body.error || ''}`);
  return body.access_token;
}

async function api(tok, url, init = {}) {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${tok}`, ...(init.headers || {}) } });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${url} → HTTP ${res.status} ${text.slice(0, 300)}`);
  return body;
}

async function main() {
  loadEnv();
  const id = process.env.GOOGLE_SHEET_ID;
  const missing = ['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_SHEET_ID'].filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`missing env: ${missing.join(', ')}`);

  const base = `https://sheets.googleapis.com/v4/spreadsheets/${id}`;
  const tok = await token();

  const meta = await api(tok, `${base}?fields=sheets.properties(title,index,sheetId)`);
  const sheets = (meta.sheets || []).map((s) => s.properties);
  const titles = sheets.map((p) => p.title);
  console.log('tabs now:', titles.join(' · '));

  if (!titles.includes(TAB)) {
    if (CHECK_ONLY) {
      console.log(`--check: tab "${TAB}" is MISSING (would be created)`);
      return;
    }
    await api(tok, `${base}:batchUpdate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: TAB } } }] }),
    });
    console.log(`created tab "${TAB}"`);
  } else {
    console.log(`tab "${TAB}" exists`);
  }

  const head = await api(tok, `${base}/values/${encodeURIComponent(`${TAB}!A1:E1`)}?valueRenderOption=UNFORMATTED_VALUE`);
  const existing = (head.values && head.values[0]) || [];
  if (existing.length && String(existing[0] || '').trim()) {
    console.log('header already present:', existing.join(' | '));
    return;
  }

  if (CHECK_ONLY) {
    console.log(`--check: header row is EMPTY (would be written)`);
    return;
  }

  // Copy the header's formatting from a neighbouring tab so the new tab does
  // not look bolted on: same font, weight, fill and frozen row.
  const fresh = (await api(tok, `${base}?fields=sheets.properties(title,sheetId)`)).sheets
    .map((s) => s.properties)
    .find((p) => p.title === TAB);
  const source = sheets.find((p) => p.title === FORMAT_SOURCE_TAB);

  if (source && fresh) {
    await api(tok, `${base}:batchUpdate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            copyPaste: {
              source: { sheetId: source.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
              destination: { sheetId: fresh.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
              pasteType: 'PASTE_FORMAT',
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId: fresh.sheetId, gridProperties: { frozenRowCount: 1 } },
              fields: 'gridProperties.frozenRowCount',
            },
          },
        ],
      }),
    });
    console.log(`header format copied from "${FORMAT_SOURCE_TAB}", row 1 frozen`);
  }

  await api(tok, `${base}/values/${encodeURIComponent(`${TAB}!A1:E1`)}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [HEADERS] }),
  });
  console.log('header written:', HEADERS.join(' | '));
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
