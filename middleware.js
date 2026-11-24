// Vercel Routing Middleware: Markdown content negotiation for AI agents.
//
// Browsers never send Accept: text/markdown, so for them this returns nothing
// and the static site is served exactly as before. For a client that prefers
// text/markdown:
//   - "/" gets /index.md with Content-Type: text/markdown and Vary: Accept
//   - a path that does not exist gets a 404 with a Markdown body
//   - any other existing page falls through to its normal HTML
// The Vary: Accept header on the HTML responses is set in vercel.json.
// Tests: tests/middleware.test.mjs (npm test).

export const config = {
  runtime: 'nodejs', // Edge runtime is deprecated on Vercel.
  // Page paths only: no /api, no static files (anything with a dot).
  matcher: ['/', '/((?!api/|assets/|css/|js/)[^.]*)'],
};

// Pages that have a Markdown version, keyed by path.
const MARKDOWN_PAGES = { '/': '/index.md' };

export const NOT_FOUND_MARKDOWN = `# 404: Page not found

There is no page at this address on shieldtx.xyz. It may have moved, or the link may be mistyped.

- Home: https://www.shieldtx.xyz/
- Agent guide: https://www.shieldtx.xyz/llms.txt
- Sitemap: https://www.shieldtx.xyz/sitemap.xml
- Contact: https://www.shieldtx.xyz/contact-us
`;

// True when the Accept header ranks text/markdown at least as high as
// text/html (and above zero). "*/*" alone does not count.
export function prefersMarkdown(accept) {
  if (!accept) return false;
  const q = { md: -1, html: -1 };
  for (const part of accept.toLowerCase().split(',')) {
    const [type, ...params] = part.trim().split(';').map(s => s.trim());
    const qParam = params.find(p => p.startsWith('q='));
    const weight = qParam ? Number(qParam.slice(2)) : 1;
    if (Number.isNaN(weight)) continue;
    if (type === 'text/markdown') q.md = Math.max(q.md, weight);
    if (type === 'text/html') q.html = Math.max(q.html, weight);
  }
  return q.md > 0 && q.md >= q.html;
}

function markdown(body, status) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept',
      'Cache-Control': status === 200 ? 'public, max-age=0, must-revalidate' : 'no-store',
    },
  });
}

export default async function middleware(request) {
  if (!prefersMarkdown(request.headers.get('accept'))) return;

  const url = new URL(request.url);
  const mdPath = MARKDOWN_PAGES[url.pathname];
  if (mdPath) {
    const res = await fetch(new URL(mdPath, url), { headers: { accept: 'text/plain' } });
    if (res.ok) return markdown(await res.text(), 200);
    return; // Markdown file missing: serve the HTML page rather than an error.
  }

  // No Markdown version. Check whether the page exists at all; the probe asks
  // for HTML, so it passes through this middleware untouched.
  const probe = await fetch(url, { method: 'HEAD', headers: { accept: 'text/html' }, redirect: 'manual' });
  if (probe.status === 404) return markdown(NOT_FOUND_MARKDOWN, 404);
  // Exists (or redirects, or is protected): normal handling.
}
