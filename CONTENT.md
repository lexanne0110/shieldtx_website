# ShieldTX — Site Content & Section Order

**Audience:** The Copied Trader (P0) + institutional desks/vaults (P1)
**Last aligned:** 2026-04-28

Narrative arc: **What (brief) → Why → Back to what (more details) → How → FAQ → CTA/close**

---

## Global

### Nav
- **Logo:** ShieldTX
- **Links:** Product · Compare · FAQ · Scan your wallet
- **CTA:** Request access → `#beta`

### Footer
- **Style:** Brand-blue-deep (`#1e3a8a`) base with brand-blue radial blooms.
- **Tagline:** Trade with confidence. Powered by **Avail**.
- **Status:** Live · build v2.0.0
- **Product:** Features · Compare · How it works · Beta access
- **Resources:** FAQ · Scan · Preview
- **Company:** About · Contact · Legal
- **Copyright:** © 2026 ShieldTX · All rights reserved.

### Brand colors (Brand Doc V3)
- `--brand-blue: #3370ff` — primary
- `--brand-blue-bright: #5ba0ff`
- `--brand-blue-deep: #1e3a8a`
- `--brand-cyan: #4dd5e8` — secondary accent (prefill chips, feature tags, final-CTA trust line, hover/highlights)
- `--brand-gradient: linear-gradient(135deg, #1e3a8a 0%, #3370ff 50%, #5ba0ff 100%)`

---

## Section order (10 sections + footer)

| # | Section | ID | Narrative role |
|---|---|---|---|
| 1 | Hero | `#hero` | What (brief) |
| 2 | Problem | `#problem` | Why |
| 3 | What you do today | `#today` | Why (workarounds fail) |
| 4 | Scan your wallet | `#scan-tool` | Interactive proof |
| 5 | Features (Your edge) | `#features` | Back to what — product detail |
| 6 | Preview | `#preview` | Back to what — visual proof |
| 7 | How it works | `#how` | How |
| 8 | Compare | `#compare` | Positioning |
| 9 | FAQ | `#faq` | FAQ |
| 10 | Join the private beta (Final CTA) | `#beta` | CTA / close |

---

## 1. Hero

**Layout:** Left/right split. Copy on the left, full live trade UI on the right (mirrors Preview).

**H1:** Stop Trading In **Public.** *(accent gradient on "Public.")*

**Sub:** Your Hyperliquid positions are live on 12+ copy bot feeds in seconds. ShieldTX breaks the signal. Same fills, zero footprint.

**Primary CTA:** `Scan your wallet →` → `#scan-tool` (white pill on brand-gradient hero)
**Secondary link:** `Request beta access` → `#beta`

**Visual:** Full `shieldtx.app/trade` browser frame with avail nav, HYPE-USDC pair (10x leverage), candle chart, order book, market order panel, and positions table.

---

## 2. Problem (Why)

**Eyebrow:** The Problem
**H2:** Your wallet exposes everything.

**3 cards:**
| 01 | **Everything is public** | Your full P&L, position history, and account size are visible to everyone the moment you place a trade. |
| 02 | **Profits leak to copy traders** | Tools like HyperDash and Dexly mirror your trades within seconds of execution and copy traders erode your profitability. |
| 03 | **Enterprises are left out** | Trading desks and vaults with substantial size cannot use a venue where competitors read your book, every hour of every day. |

---

## 3. What you do today (Why — workarounds)

**Eyebrow:** What you do today
**H2:** Today's workarounds fail.

1. Using multiple wallets fractures your workflow.
2. Managing gas, seed phrases & transaction history across wallets increases operational overhead.
3. Arkham and Nansen efficiently cluster your different wallets through temporal correlation anyway.
4. CEX routing requires handing over custody of your assets.

---

## 4. Scan your wallet (Interactive proof)

**Eyebrow:** Scan your wallet
**H2:** See what you're broadcasting.

**Sub:**
> Paste any Hyperliquid wallet. We'll show you which bots are copying it, how fast they follow, and what it's costing in bps. No wallet connection or sign-in required.

**Form:**
- Input placeholder: `0x… your Hyperliquid address`
- CTA: `Scan`

**Pre-fill chips (cyan):** "Don't have an address?" + Try sample whale · Try sample alpha trader · Try sample leaderboard

**Results panel** (revealed on scan):
- Footnote: `Based on N fills over the past D days.`
- 3 stat cards with explainer captions:
  - **13** Bots copying this wallet · *HyperDash, Dexly, +11 others*
  - **3.6s** Avg follow speed · *From your fill to copy bot fill*
  - **12bps** Cost per round trip · *Slippage from copy traders front-running you*
- **What's being published from this wallet** card:
  - Position size · Entry & exit prices · Liquidation level · Account balance · Full trade history — all "Visible in real time"
- **Top wallets copying you** card with bar-chart counts (e.g., `47 copy fills`)

---

## 5. Features — Your edge (Back to what)

**Eyebrow:** Your edge
**H2:** Same trade. No broadcast.
**Lede:** Confidential execution on Hyperliquid, with the compliance and custody desks need.

**Layout:** Vertical stack (4 cards). Each card: 3-column grid — meta (number + tag pill in cyan) · body (title + paragraph) · visual.

| # | Title | Body | Visual |
|---|---|---|---|
| 01 | Execution shielding | Your position size, entry, and liquidation levels stay off the radar. Nothing on-chain links your trades to you, so copy bots have nothing to follow. | SIZE / ENTRY / LIQ masked rows + shield watermark |
| 02 | Hyperliquid fill parity | Trades route to the native HL order book. Fills match direct Hyperliquid execution. Same liquidity, same fill quality, no routing tax. | Brand-blue sparkline + "Native HL · 0 bps routing tax" |
| 03 | Compliant by design | Deposit screening, geo-blocking, and sanction compliance are built in. Desks and vaults get the highest compliance bar so size can move on-venue without exposure. | Globe with `BLOCKED` pill + red dots |
| 04 | You hold the keys | Non-custodial vault on Arbitrum. Withdrawals are permissionless and verifiable. No admin key, no lockups, no counterparty risk. | `Vault 25,000 USDC → Your wallet 25,000 USDC` flow |

---

## 6. Preview (Visual)

**Eyebrow:** Preview
**H2:** Trade on Hyperliquid
**Sub:** It's perp trading on Hyperliquid, minus the broadcast.

**Body:** Full live trading terminal in a `shieldtx.app/trade` browser frame.

---

## 7. How it works (How)

**Eyebrow:** How it works
**H2:** Three steps. Zero footprint.

| Step | Title | Description |
|---|---|---|
| 1 | Add Funds | Deposit from any chain via Nexus. Funds are secured by the ShieldTX vault on Arbitrum. |
| 2 | Open Trade | Confidential trades placed from a fresh, unlinkable wallet on Hyperliquid. |
| 3 | Close Trade | Continue trading or re-shield balance for maximum unlinkability. |

Each step has a visual mock. Step 1 mock now shows: `Bridge: Nexus · any chain` → `Vault: ShieldTX · Arbitrum` → `Deposit: 25,000 USDC` → `Status: Secured`.

---

## 8. Compare

**Eyebrow:** Compare
**H2:** See how we're different.
**Style:** Light grey band (`--ice`). White table card.

| Feature | ShieldTX | Direct Hyperliquid | Multi-Wallet | CEX |
|---|---|---|---|---|
| Position Confidentiality | ✓ | ✕ | ✕ | ✓ |
| Non-custodial | ✓ | ✓ | ✓ | ✕ |
| Copy-bot resistant | ✓ | ✕ | ✕ | ✓ |
| Wallet De-linked | ✓ | ✕ | ✕ | ✕ |
| Compliant by design | ✓ | ✓ | ✕ | ✓ |
| Operational Overhead | Low | Low | High | Low |

---

## 9. FAQ

**Eyebrow:** FAQ
**H2:** Q&A

7 questions:

### Is this like Tornado Cash?
No. ShieldTX doesn't pool funds or obfuscate transactions. It executes natively on Hyperliquid: same order book, same counterparties, fully on-chain. The difference: Tornado Cash hides the transaction. ShieldTX shields your position data. Execution stays transparent. Your strategy doesn't.

### What pairs are supported?
ETH, BTC, SOL, and HYPE perpetuals at launch. Same pairs as native Hyperliquid trading. More pairs are easy to add past this and will be added based on demand.

### Does shielding affect my fills?
No. Execution is native HL: same order book, same liquidity. There is no slippage premium for shielding.

### Why not just use multiple wallets?
Because Arkham and Nansen cluster them anyway. Temporal correlation analysis links wallets through on-chain behaviour: same asset, same direction, seconds apart is enough. ShieldTX breaks linkability at the source. One account, no clustering exposure.

### What does it cost?
5bps on entry, 5bps on exit. Copy traders could take up to 100bps per trade from you. ShieldTX costs less than the leak it closes.

### Who controls the vault / my funds?
You do. Funds are locked in a smart contract on Arbitrum. Core operations are permissionless and verified by zero-knowledge proofs, no admin key required.

### Is there an API?
API access is on the roadmap post-MVP. If you're running algo strategies, reach out directly. Early access conversations are open.

---

## 10. Join the private beta (Final CTA / Close)

**Style:** Brand-blue-deep base with brand-cyan + brand-blue radial blooms (matches footer hierarchy).

**Eyebrow:** Private beta (cyan)
**H2:** Join the private beta.
**Sub:** 500 invites for the first cohort. Shipping now.

**Form:**
- Label: Invite Code:
- Input placeholder: x3…t99
- CTA: `Join` (white pill, hovers to cyan)

**Helper line:** Don't have an invite code? **Request one →** *(opens modal)*

**Trust line (below form, separated by hairline):**
- · BUILT ON AVAIL
- · NON-CUSTODIAL
- · ARBITRUM VAULT

*(Each item prefixed with a small cyan dot.)*

---

## Removed (vs. previous version)

- Breaker A (gradient brand-blue) — replaced by direct narrative flow
- Breaker B (flat brand-blue) — same
- Breaker C ("Stop broadcasting. Start shielding.") — replaced by the new Final CTA
- Hero chart-only widget — replaced by full trade UI in left/right split

---

## Language Guide

### Use
- Shielded execution · Position confidentiality · Confidential positioning
- Same fills, zero footprint · Native HL · No routing tax
- Compliant by design · Built-in screening
- Non-custodial · Self-custody · Permissionless withdrawals

### Never use
- Privacy (triggers Tornado Cash / OFAC associations)
- Hide your trades · Anonymous trading · Untraceable
- Em dashes (—) — use `:`, `.`, or rephrase
