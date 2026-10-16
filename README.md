# ShieldTX — Marketing site

Marketing site for ShieldTX. Static HTML/CSS/JS plus Vercel serverless functions for forms.

## Run locally

```bash
# Static-only preview (forms won't POST, but layout works):
python3 -m http.server 3000

# Full stack (forms + /api routes):
npx vercel dev
```

Open <http://localhost:3000>.

## Project structure

```
.
├── api/                          # Vercel serverless functions
│   ├── request-access.js         # POST from /request-access
│   ├── api-access.js             # POST from /api-access
│   ├── api-waitlist.js           # POST from the homepage API waitlist email box
│   ├── scanner-preview.js        # GET wallet exposure preview (homepage + nav scan dialog)
│   ├── scanner-report.js
│   └── _shared.js                # tiny req/res helpers
├── lib/                          # Server-only helpers (Node): db, validate, rate-limit, crypto, sheets
├── css/                          # v2 design styles (see "Styles" below)
├── js/                           # v2 design scripts; js/vendor/ = three, gsap, ScrollTrigger
├── public-scripts/               # Form behaviour: request-access-form.js, api-access-form.js
├── partials/                     # Shared chrome, synced into every page by `npm run sync`
│   ├── head-global.html          # PostHog + Google Analytics
│   ├── nav.html                  # Site header + "Start trading" CTA
│   ├── footer.html
│   └── site-end.html             # Scroll-to-top, account + wallet-scan dialogs, site scripts
├── scripts/
│   ├── sync-partials.py          # `npm run sync`
│   └── darken-hero.py            # Recolour a bright-blue blog hero to the dark design
├── assets/                       # Logos, favicons, OG image, demo video; assets/v2/ = design fonts + images
├── blog/                         # /blog index, posts, blog/styles.css, blog/_template/
├── request-access/  api-access/  contact-us/  trust-model/  privacy/  terms/
├── brand-document/               # Brand book (standalone doc + site nav; not in sitemap)
├── index.html                    # Landing page
├── vercel.json                   # Headers, clean URLs (/assets/* cached 1 year, immutable)
├── package.json                  # No build step
├── .env.example                  # Required env vars
├── robots.txt                    # Excludes /api, /brand-document
├── sitemap.xml
└── README.md
```

## Styles

Load order on every page: `css/theme.css` (the designer's stylesheet, tokens in `:root`) → `css/site.css` (shared overrides: 1760px wide-screen cap, dialogs) → the page's own file (`css/home.css`, `css/forms.css`, `blog/styles.css`, `trust-model/styles.css` for the docs/legal layout, `contact-us/styles.css`, `brand-document/brand.css`). Bump the `?v=N` on a CSS/JS link whenever that file changes. Never put CSS/JS under `/assets/` (cached for a year).

## Routes

- `/` — Landing
- `/request-access` — Request access form ("No, request access" in the Start trading dialog)
- `/api-access` — API access form (homepage "Get API access")
- `/blog`, `/blog/<slug>` — Blog
- `/trust-model` — On-chain trust docs
- `/privacy`, `/terms` — Legal
- `/contact-us` — Support email (mailto, no backend)
- `/brand-document` — Brand book (excluded from robots + sitemap)

## Env vars

See [.env.example](./.env.example). Copy to `.env.local` for `vercel dev`. Required in production:
- `IP_HASH_PEPPER` — 32+ random bytes; peppers stored IP hashes
- `DATABASE_URL` — left blank for the in-memory stub; fill when wiring a real DB

## Forms

| Form | Endpoint | Markup | Behaviour |
| --- | --- | --- | --- |
| Request access (2 steps) | `POST /api/request-access` | `request-access/index.html` | `public-scripts/request-access-form.js` |
| API access | `POST /api/api-access` | `api-access/index.html` | `public-scripts/api-access-form.js` |
| API waitlist (email) | `POST /api/api-waitlist` → redirects to `/api-access` | `index.html` | `js/api-waitlist.js` |
| Wallet scan preview | `GET /api/scanner-preview` → scanner.shieldtx.xyz | `partials/site-end.html` | `js/scan-dialog.js` |

Form scripts depend on the `waitlist-*` classes and `data-*` hooks in the markup — keep them when restyling. Request-access submissions are mirrored to Google Sheets via `lib/sheets.js → appendRow` ("Invite Requests" tab; no-op until `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY` + `GOOGLE_SHEET_ID` are set).

**Contact Us** (`contact-us/index.html`) has no backend: a `mailto:` link to `shieldtx-support@availproject.org`.

## DB

`lib/db.js` is the only place that touches storage. It exports one function used by the request-access handler:

```js
insertRequestAccess(payload)  // → { id }  (+ Google Sheets mirror)
```

Today's implementation is an in-memory stub (lost on cold start) plus the Google Sheets mirror (`lib/sheets.js`). To wire a real DB (Supabase / Neon / Vercel Postgres), replace those function bodies — the API handlers don't reach inside.

Schema proposal is in the plan doc.

## Brand tokens

Defined in `:root` of `css/theme.css` (the design): `--canvas #040405`, `--panel`, `--well`, `--text-1…4`, `--brand #3B82F6`, `--brand-light #60A5FA`, `--long #00D885`, radii `--r-lg/--r/--r-sm`, fonts Geist + Geist Mono (self-hosted in `assets/v2/fonts/`). See `/brand-document`.

## Animation

All animations respect `prefers-reduced-motion`. Homepage scroll stories use GSAP + ScrollTrigger (`js/vendor/`); muted autoplay videos play only while on screen (`js/site.js`).
