# ShieldTX — Brand Book (v2)

The designer's brand system for the app and the website: logo, surfaces, text, brand colour, trading colours, cards & states, CTAs, typography, radius & spacing, motion. Published at `/brand-document`. Not linked from the main nav (the footer's "Brand book" links here).

Standalone document layout (its own contents nav, no site footer) with the site nav on top, so the "Start trading" CTA is the same on every page. `brand.css` ends with a marked block of site additions that keep the document pixel-identical to the designer's file and keep `brand.css` out of the site nav.

## Structure

```
brand-document/
├── index.html      # the document (designer's markup; site head + analytics partial added)
├── brand.css       # designer's styles; fonts from /assets/v2/fonts/; one marked site addition at the end
├── brand.js        # loader demo replay
├── assets/         # ShieldTX_Logo / LogoMark / LogoType SVGs
└── README.md
```

Source: `_redesign/design-source/` (designer's zip). Analytics, nav and dialogs come from `partials/` via `npm run sync`.
