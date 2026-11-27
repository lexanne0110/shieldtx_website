# The weekly report — two editions, one set of numbers

Each issue ships twice:

| Edition | File | Served at | Purpose |
|---|---|---|---|
| Web | `issue-00N/index.html` | `/newsletter/issue-00N` | the canonical, full-fidelity page — the target of every "view in browser" link |
| Email | `issue-00N/email.html` | `/newsletter/issue-00N/email.html` (noindex) | the send. Table layout, inline styles, zero images |

`issue-00N/issue.json` holds the figures. It is the single source of truth for
anything numeric; the two editions carry their own prose.

## Weekly loop

```bash
# 1. copy the previous issue and edit the data + prose
cp -r newsletter/issue-001 newsletter/issue-002

# 2. render the email edition from issue.json
python3 scripts/build-newsletter-email.py newsletter/issue-002

# 3. gate it: client safety, size, and figure parity against the web page
python3 scripts/check-newsletter-email.py newsletter/issue-002
```

`check-newsletter-email.py` exits non-zero on: flex/grid/float/position/box-shadow,
`<script>`/`<link>`/`<img>`/SVG/`url()`, non-absolute hrefs, a table without
`role="presentation"`, over 102KB (Gmail clips), a missing preheader or
unsubscribe, and any figure that disagrees between `issue.json`, `email.html`
and `index.html`.

## Why the email edition looks different

- **No images at all.** No chart PNG, no logo file. Blocked images are the
  default state for a first send, and a data product whose only visual is a
  blocked image is a broken product. The trend is a table-built bar chart; the
  size bands are table-built bars; the wordmark is type.
- **Tables, not layout CSS.** Outlook renders with the Word engine: no flex, no
  grid, no float, no `background-image`, no `border-radius` (it degrades to
  square).
- **Every colour set twice** — as an attribute and in `style` — because Word
  drops one of them.
- **Display figures are set in the sans face, not mono.** Mono at 66px makes
  `$14.2M` read as `$14 . 2M`.
- **Numbers are tabular and right-aligned** in the leaderboard so the column
  scans vertically.

## Known limits

- The renderer has been verified in Chrome at 640px and 390px. It has not been
  through Outlook (Windows), Gmail app on Android, or Apple Mail. Run a real
  send test — Litmus / Email on Acid, or send to yourself across clients —
  before the first campaign.
- Clients that strip `<style>` (Gmail on non-Google IMAP accounts) lose the
  mobile media query and get the 600px layout scaled down. That degrades
  gracefully; nothing breaks.
- `{{ unsubscribe }}` is Brevo's subscriber-variable syntax. If the list moves
  to another ESP, change it in `issue.json` → `footer.unsubscribe_url`.
