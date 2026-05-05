# Shield TX — Brand Document V3

A self-contained 28-slide HTML brand document covering identity, palette, typography, voice, design-system components, section patterns, and motion principles.

Single-page, vanilla HTML/CSS/JS. No build step. No dependencies beyond Google Fonts (loaded via CDN).

## Structure

```
brand-document/
├── index.html              # the entire document — inline CSS + JS
├── assets/
│   ├── logo.svg            # Shield TX wordmark
│   └── refs/
│       ├── ref-1.png       # visual references / moodboard
│       ├── ref-2.png
│       ├── ref-3.png
│       ├── ref-4.png
│       └── ref-5.png
└── README.md
```

## View locally

Any static server works. From this directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Or with Node:

```bash
npx serve .
```

## Slide index

| # | Slide |
|---|---|
| 01 | Cover — logo + brand colour strip on Figma gradient |
| 02 | Visual references — 5-image moodboard |
| 03 | The brand idea |
| 04 | Logo & wordmark — three surfaces |
| 05 | On Brand — gradient + single tone |
| 06 | Blue ramp — 50 → 900 |
| 07 | Neutrals |
| 08 | Success |
| 09 | Danger |
| 10 | Buy / Sell — trading semantic |
| 11 | Typography — Geist |
| 12 | Typography — Geist Mono |
| 13 | Type scale |
| 14 | Spacing & radius |
| 15 | Voice & vocabulary — use vs never use |
| 16 | Tone principles |
| 17 | Buttons |
| 18 | Form inputs |
| 19 | Cards |
| 20 | Badges, tags, chips, status |
| 21 | Comparison table |
| 22 | Accordion |
| 23 | Navigation |
| 24 | Hero pattern |
| 25 | Tools callout pattern |
| 26 | Hero callout / Not-a-mixer combo |
| 27 | Motion — Decode |
| 28 | Closing — Trade with confidence. Powered by Avail. |

## Navigation

- **Arrow Down / Page Down** — next slide
- **Arrow Up / Page Up** — previous slide
- **Home** — jump to cover
- **End** — jump to closing
- Scroll-snap on `<html>` keeps each slide aligned

## Tokens

Brand tokens live in the `:root` block at the top of `index.html`:

- `--brand-blue: #3370ff` — primary
- `--brand-blue-bright: #5ba0ff` — lighter accent stop
- `--brand-blue-deep: #1e3a8a` — darker stop
- `--brand-gradient: linear-gradient(135deg, #1e3a8a 0%, #3370ff 50%, #5ba0ff 100%)`
- Full blue ramp `--blue-50` … `--blue-900`
- Neutrals `--snow` → `--ink`
- Semantic `--ok`, `--danger`, `--buy`, `--sell`

## Fonts

Geist (display + body) + Geist Mono (labels + data). Both loaded from Google Fonts.

## Deploy

Drag the folder onto Vercel / Netlify / Cloudflare Pages — or push to a GitHub Pages repo (root). No build config needed.

## Print to PDF

Open in Chrome or Safari, `⌘P`, set paper to **Landscape · 16:9** custom dimensions (e.g. 1920×1080), background graphics ON, scale 100%.
