# ShieldTX — Marketing site

Marketing site for ShieldTX. Static HTML/CSS/JS plus Vercel serverless functions for forms and the invite-code gate.

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
│   ├── contact.js                # POST submissions from /contact
│   ├── validate-invite.js        # POST invite-code check used by /app
│   └── _shared.js                # tiny req/res helpers
├── lib/                          # Server-only helpers (Node)
│   ├── db.js                     # DB adapter — in-memory stub; swap for Supabase/Neon later
│   ├── validate.js               # Input validation + sanitization
│   ├── rate-limit.js             # In-memory IP rate limiter
│   └── crypto.js                 # IP hashing + signed invite token
├── public-scripts/               # Browser-served JS (shared across pages)
│   ├── request-access-form.js    # bindRequestAccessForm — multi-step screener + brand dropdowns
│   └── invite-gate.js            # /app gate behavior
├── assets/                       # Logos + demo video
├── app/                          # /app — blurred preview + invite-gate modal
├── request-access/               # /request-access — full-page permalink for the form
├── contact/                      # /contact — name/email/message form (POSTs to /api/contact)
├── trust-model/                  # /trust-model — on-chain trust docs
├── brand-document/               # Internal brand spec (not linked from public nav)
├── index.html                    # Landing page (hero, features, FAQ, modal)
├── styles.css                    # All styles (brand tokens at the top)
├── script.js                     # Lenis + ScrollTrigger, hero chart, modal open/close
├── vercel.json                   # Headers, clean URLs
├── package.json                  # Minimal — Node 20 engine, no build step
├── .env.example                  # Required env vars
├── robots.txt                    # Excludes /app, /api, /brand-document
├── sitemap.xml
└── README.md
```

## Routes

- `/` — Landing
- `/request-access` — Form permalink (also embedded in the landing modal)
- `/app` — Invite gate. On valid code, redirects to `APP_URL` (set in env, e.g. `https://beta.shieldtx.xyz/`)
- `/contact` — General contact form
- `/trust-model` — On-chain trust docs
- `/brand-document` — Internal brand spec (excluded from robots + sitemap)

## Env vars

See [.env.example](./.env.example). Copy to `.env.local` for `vercel dev`. Required in production:
- `APP_URL` — where the gate redirects on a valid code
- `INVITE_CODE_SECRET` — 32+ random bytes; signs the short-lived gate cookie
- `IP_HASH_PEPPER` — 32+ random bytes; peppers stored IP hashes
- `DATABASE_URL` — left blank for the in-memory stub; fill when wiring a real DB

For local dev with a seeded invite code, set `DEV_SEED_INVITE_CODES=SHIELD-DEV`.

## Forms

Three forms, three endpoints. All do real validation, IP-keyed rate limiting, a hidden honeypot field, and ship idle / submitting / success / error states.

| Form                          | Endpoint                | Source of truth for markup                                  |
| ----------------------------- | ----------------------- | ------------------------------------------------------------- |
| Hero modal "Request Access"   | `POST /api/request-access` | `index.html` (mirrored in `/request-access` and `/app` modal) |
| Permalink page                | `POST /api/request-access` | `request-access/index.html`                                   |
| Contact                       | `POST /api/contact`        | `contact/index.html`                                           |
| Invite gate                   | `POST /api/validate-invite`| `app/index.html`                                              |

The Request Access form markup is duplicated across three pages. Behavior is shared via `public-scripts/request-access-form.js → ShieldTX.bindRequestAccessForm(formEl, { mode })`. When editing fields, update all three HTML copies.

## DB

`lib/db.js` is the only place that touches storage. It exports four functions used by every API handler:

```js
insertRequestAccess(payload)  // → { id }
insertContact(payload)        // → { id }
lookupInviteCode(code)        // → { status, expires_at, max_uses, used_count } | null
recordInviteUse(code, meta)
```

Today's implementation is an in-memory stub (lost on cold start) seeded from `DEV_SEED_INVITE_CODES`. To wire a real DB (Supabase / Neon / Vercel Postgres), replace those four function bodies — the API handlers don't reach inside.

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
