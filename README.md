# Shield TX — Landing Page

Marketing landing page for Shield TX — shielded execution for Hyperliquid perp trading.

Static site, no build step. Plain HTML/CSS/JS with Lenis (smooth scroll) and GSAP + ScrollTrigger (animations) loaded from CDN.

## Run locally

```bash
# Any static server works. Examples:
python3 -m http.server 8000
# or
npx serve .
```

Then open http://localhost:8000.

## Project structure

```
.
├── index.html              # Landing page
├── styles.css              # All styles (brand tokens at the top)
├── script.js               # Lenis + ScrollTrigger animations, hero chart, modal, FAQ
├── assets/
│   └── logo.svg            # Shield TX logo
├── brand-document/         # Internal brand spec (V3 — colors, type, voice)
│   ├── index.html
│   └── assets/
│       ├── logo.svg
│       └── refs/           # Reference imagery for the moodboard
├── CONTENT.md              # Source-of-truth copy + section order
├── .gitignore
└── README.md
```

## Sections

1. **Hero** — Brand-gradient background. Live chart widget (HYPE-USDC) with auto-ticking price + hover crosshair.
2. **Steps** — Three-step "How it works" with rail line, animated counters, tape-pulse on the active step.
3. **Breaker A** — Brand-gradient band with invite-code form. "Request one" opens the email modal.
4. **Preview** — Full live trading UI inside a `shieldtx.app/trade` browser frame.
5. **Problem** — "Your wallet exposes everything." 3-card layout.
6. **What you do today** — 4-card grid of failed workarounds.
7. **See your exposure** — Wallet scan tool. Dark band wraps the form; results panel reveals on-brand light cards on submit.
8. **Breaker B** — Flat brand-blue band with invite-code form (visual variation of A).
9. **Features** — Pinned horizontal scroll through 6 cards, each with a unique CSS-built visual placeholder.
10. **Compare** — Light grey table comparing Shield TX vs Direct Hyperliquid / Multi-Wallet / CEX.
11. **Beta breaker** — Light blue band, "Stop broadcasting. Start shielding." + invite-code form.
12. **FAQ** — Accordion.
13. **Footer** — Brand-blue-deep base with brand-blue radial blooms.

## Brand tokens

Defined in `:root` of `styles.css` per Brand Document V3:

- `--brand-blue: #3370ff` — primary
- `--brand-blue-bright: #5ba0ff`
- `--brand-blue-deep: #1e3a8a`
- `--brand-gradient: linear-gradient(135deg, #1e3a8a 0%, #3370ff 50%, #5ba0ff 100%)` — used on hero, breaker A, manifesto-class surfaces
- Geist + Geist Mono — Google Fonts

## Animation behavior

All animations gate on `prefers-reduced-motion`. Lenis smooth scroll, GSAP triggers, hero chart ticker, hover crosshair, custom cursor, and the Features pinned horizontal scroll all fall back gracefully when reduced motion is set.

## Modal

The "Request one" link in any of the three invite-code forms opens a single shared modal (`#invite-modal`). Closes via overlay click, × button, or Escape key. Body scroll locks while open.

## Notes

- No backend. Form submits are intercepted (`onsubmit="return false"`); the modal shows a static success state.
- Reference imagery in `brand-document/assets/refs/*.png` is large (~13 MB total) and only used by the brand spec moodboard. Safe to swap or delete if you don't need the brand document.
