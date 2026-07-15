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
│   ├── request-access.js         # POST submissions from the hero modal + /request-access
│   ├── support.js                # POST submissions from /contact-us (Contact Us / support)
│   └── _shared.js                # tiny req/res helpers
├── lib/                          # Server-only helpers (Node)
│   ├── db.js                     # DB adapter — in-memory stub; swap for Supabase/Neon later
│   ├── validate.js               # Input validation + sanitization
│   ├── rate-limit.js             # In-memory IP rate limiter
│   └── crypto.js                 # IP hashing
├── public-scripts/               # Browser-served JS (shared across pages)
│   └── request-access-form.js    # bindRequestAccessForm — multi-step screener + brand dropdowns
├── assets/                       # Logos + demo video
├── request-access/               # /request-access — full-page permalink for the form
├── contact-us/                   # /contact-us — email/subject/details form (POSTs to /api/support)
├── trust-model/                  # /trust-model — on-chain trust docs
├── brand-document/               # Internal brand spec (not linked from public nav)
├── index.html                    # Landing page (hero, features, FAQ, modal)
├── styles.css                    # All styles (brand tokens at the top)
├── script.js                     # Lenis + ScrollTrigger, hero chart, modal open/close
├── vercel.json                   # Headers, clean URLs
├── package.json                  # Minimal — Node 20 engine, no build step
├── .env.example                  # Required env vars
├── robots.txt                    # Excludes /api, /brand-document
├── sitemap.xml
└── README.md
```

## Routes

- `/` — Landing
- `/request-access` — Form permalink (also embedded in the landing modal)
- `/contact-us` — Contact Us / support form (email, subject, details)
- `/trust-model` — On-chain trust docs
- `/brand-document` — Internal brand spec (excluded from robots + sitemap)

## Env vars

See [.env.example](./.env.example). Copy to `.env.local` for `vercel dev`. Required in production:
- `IP_HASH_PEPPER` — 32+ random bytes; peppers stored IP hashes
- `DATABASE_URL` — left blank for the in-memory stub; fill when wiring a real DB

## Forms

Two forms, two endpoints. All do real validation, IP-keyed rate limiting, a hidden honeypot field, and ship idle / submitting / success / error states.

| Form                          | Endpoint                | Source of truth for markup                                  |
| ----------------------------- | ----------------------- | ------------------------------------------------------------- |
| Hero modal "Request Access"   | `POST /api/request-access` | `index.html` (mirrored in `/request-access`)               |
| Permalink page                | `POST /api/request-access` | `request-access/index.html`                                   |
| Contact Us / support          | `POST /api/support`        | `contact-us/index.html`                                       |

The Request Access form markup is duplicated across two pages. Behavior is shared via `public-scripts/request-access-form.js → ShieldTX.bindRequestAccessForm(formEl, { mode })`. When editing fields, update both HTML copies. The support form is self-contained (inline script in `contact-us/index.html`).

Both `request-access` and `support` mirror submissions into Airtable via `lib/db.js → appendToAirtable(fields, tableName)` — request-access → `AIRTABLE_TABLE` (default "Invite Requests"), support → `AIRTABLE_SUPPORT_TABLE` (default "Support Queries"). No-op until `AIRTABLE_TOKEN` + `AIRTABLE_BASE_ID` are set.

## DB

`lib/db.js` is the only place that touches storage. It exports two functions used by the API handlers:

```js
insertRequestAccess(payload)  // → { id }  (+ Airtable mirror)
insertSupport(payload)        // → { id }  (+ Airtable mirror)
```

Today's implementation is an in-memory stub (lost on cold start) plus the optional Airtable mirror. To wire a real DB (Supabase / Neon / Vercel Postgres), replace those two function bodies — the API handlers don't reach inside.

Schema proposal is in the plan doc.

## Brand tokens

Defined in `:root` of `styles.css`:

- `--brand-blue: #3370ff`
- `--brand-blue-bright: #5ba0ff`
- `--brand-blue-deep: #1e3a8a`
- `--brand-gradient` — hero + final-cta
- Geist + Geist Mono via Google Fonts

## Animation

Subdued by design. All animations respect `prefers-reduced-motion`. The custom morphing cursor, page-wide grain, tilt cards, and char-by-char headline splits were removed during the v2.0 refactor — the OS pointer and a single fade reveal carry the motion budget.
