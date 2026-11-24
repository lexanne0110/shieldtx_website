// Tests for middleware.js (Markdown content negotiation). Run: npm test
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import middleware, { prefersMarkdown, NOT_FOUND_MARKDOWN, config } from '../middleware.js';

const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

// Fake the deployment: '/index.md' and '/privacy' exist, everything else is 404.
function fakeSite(calls = []) {
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(input);
    calls.push({ path: url.pathname, method: init.method || 'GET', accept: init.headers?.accept });
    if (url.pathname === '/index.md') return new Response('# ShieldTX\n\nhello', { status: 200 });
    if (url.pathname === '/privacy') return new Response(null, { status: 200 });
    if (url.pathname === '/contact') return new Response(null, { status: 308 });
    return new Response(null, { status: 404 });
  };
  return calls;
}
const req = (path, accept) => new Request('https://www.shieldtx.xyz' + path, { headers: accept ? { accept } : {} });

test('prefersMarkdown: ranks text/markdown against text/html', () => {
  assert.equal(prefersMarkdown('text/markdown'), true);
  assert.equal(prefersMarkdown('text/markdown, text/html;q=0.9'), true);
  assert.equal(prefersMarkdown('text/html, text/markdown;q=0.5'), false);
  assert.equal(prefersMarkdown('text/markdown;q=0'), false);
  assert.equal(prefersMarkdown('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'), false); // browser
  assert.equal(prefersMarkdown('*/*'), false);
  assert.equal(prefersMarkdown(null), false);
});

test('browsers and plain clients pass through untouched (no fetch)', async () => {
  const calls = fakeSite();
  assert.equal(await middleware(req('/', 'text/html')), undefined);
  assert.equal(await middleware(req('/nope', '*/*')), undefined);
  assert.equal(await middleware(req('/')), undefined);
  assert.equal(calls.length, 0);
});

test('homepage: Markdown body, text/markdown, Vary: Accept', async () => {
  fakeSite();
  const res2 = await middleware(req('/', 'text/markdown'));
  assert.equal(res2.status, 200);
  assert.match(res2.headers.get('content-type'), /^text\/markdown/);
  assert.equal(res2.headers.get('vary'), 'Accept');
  assert.equal(await res2.text(), '# ShieldTX\n\nhello');
});

test('homepage: falls back to HTML if index.md is missing', async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 });
  assert.equal(await middleware(req('/', 'text/markdown')), undefined);
});

test('missing page: 404 with a Markdown body that links to llms.txt and the sitemap', async () => {
  fakeSite();
  const res = await middleware(req('/__ora-404-probe', 'text/markdown'));
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /^text\/markdown/);
  assert.equal(res.headers.get('vary'), 'Accept');
  const body = await res.text();
  assert.equal(body, NOT_FOUND_MARKDOWN);
  assert.ok(body.length >= 20);
  assert.match(body, /llms\.txt/);
  assert.match(body, /sitemap\.xml/);
});

test('existing page without Markdown version and redirects: normal handling', async () => {
  const calls = fakeSite();
  assert.equal(await middleware(req('/privacy', 'text/markdown')), undefined);
  assert.equal(await middleware(req('/contact', 'text/markdown')), undefined);
  // The existence probe asks for HTML so it does not loop back into Markdown handling.
  assert.ok(calls.every(c => c.method === 'HEAD' && c.accept === 'text/html'));
});

test('matcher covers pages but not api, assets or files', () => {
  // Vercel matchers are path-to-regexp; the second entry is a plain regex group.
  const re = new RegExp('^' + config.matcher[1].replace(/^\//, '/') + '$');
  for (const p of ['/', '/privacy', '/blog/what-is-shieldtx', '/__ora-404-probe-7hysiteq']) assert.ok(p === '/' || re.test(p), p);
  for (const p of ['/api/scanner-preview', '/assets/x.svg', '/css/site.css', '/llms.txt', '/index.md']) assert.ok(!re.test(p), p);
});
