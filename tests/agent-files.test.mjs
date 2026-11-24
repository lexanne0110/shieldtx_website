// Tests for the agent-facing files and routing config. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = p => readFileSync(new URL(p, root), 'utf8');

test('vercel.json: /contact redirects to /contact-us', () => {
  const cfg = JSON.parse(read('vercel.json'));
  assert.deepEqual(cfg.redirects.find(r => r.source === '/contact'), { source: '/contact', destination: '/contact-us', permanent: true });
});

test('vercel.json: pages send Vary: Accept, static files and /api do not', () => {
  const cfg = JSON.parse(read('vercel.json'));
  const rule = cfg.headers.find(h => h.headers.some(x => x.key === 'Vary' && x.value === 'Accept'));
  assert.ok(rule, 'Vary rule missing');
  const re = new RegExp('^' + rule.source + '$');
  for (const p of ['/', '/privacy', '/blog/what-is-shieldtx']) assert.ok(re.test(p), p);
  for (const p of ['/api/scanner-preview', '/assets/a.svg', '/llms.txt']) assert.ok(!re.test(p), p);
});

test('llms.txt: llmstxt.org shape plus a when-to-use section', () => {
  const t = read('llms.txt');
  assert.match(t, /^# ShieldTX\n\n> /); // H1 then blockquote summary
  assert.match(t, /^## When to use ShieldTX$/m);
  assert.match(t, /scanner\.shieldtx\.xyz\/#scan\/</);
  assert.doesNotMatch(t, /shieldtx\.xyz\/contact\//); // old 404 link
});

test('index.md: nonempty homepage Markdown with key links', () => {
  const t = read('index.md');
  assert.match(t, /^# ShieldTX/);
  for (const s of ['https://beta.shieldtx.xyz/', '/request-access', '/llms.txt', 'shieldtx-support@availproject.org']) assert.ok(t.includes(s), s);
});

test('contact page: at least 500 characters of main content', () => {
  const html = read('contact-us/index.html');
  const main = html.match(/<main[\s\S]*?<\/main>/)[0].replace(/<footer[\s\S]*?<\/footer>/, '').replace(/<svg[\s\S]*?<\/svg>/g, '');
  const text = main.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  assert.ok(text.length >= 500, `only ${text.length} characters`);
});
