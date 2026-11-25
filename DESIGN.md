# BrightHorizon Design System (`DESIGN.md`)

> Brand alignment: Live visual system extracted from `https://www.brighthorizons.com/`
> Applied methodology: OpenDesign (`brand-extract`, `redesign-skill`, `frontend-design`) and OpenDesign craft contracts (`color`, `typography`, `anti-ai-slop`, `state-coverage`, `animation-discipline`, `accessibility-baseline`, `laws-of-ux`).

---

## 1. Visual Theme & Atmosphere

BrightHorizon pairs **institutional clarity** with **approachable warmth**. Grounded in Bright Horizons' signature Nile Blue, Cerulean Teal, Buttercup Gold, and Horizon Emerald palette, the interface reads as a calm, trustworthy analytics studio—never a generic dark-mode template or an indigo/purple AI clone.

- **Visual style:** Clean enterprise SaaS, bright cool ice-slate canvas (`#F3F6F7`), crisp white elevated work surfaces (`#FFFFFF`), moderately rounded `10px` interactive controls, and flat tonal separation over heavy drop shadows.
- **Signature motifs:**
  - Rising Buttercup Gold sun over a sweeping Emerald and Nile Blue horizon arc.
  - A subtle `3px` horizon accent bar anchoring the top edge of the workspace.
  - Dual-weight `Mulish` headlines (light `300`/`400` paired with extra-bold `800`) underlined by a crisp `4px` Buttercup Gold bar on hero/empty-state focal points.
  - Router-style onboarding prompt cards with right-aligned Buttercup Gold chevrons.

---

## 2. Color

### Four-Layer Palette Structure
- **Neutrals (70–90% of pixels):** Cool ice-slate canvas (`#F3F6F7`), crisp white surfaces (`#FFFFFF`), subtle surface (`#EBF1F4`), deep slate headings (`#142632`), Bright Horizons body charcoal (`#464646`), muted slate metadata (`#5B6E7A`), and cool hairline borders (`#D8E3E8`, `#E9EFF2`). Never mix warm beige grays with cool slate grays.
- **Primary & Accent (5–10% of pixels):**
  - **Nile Blue (`--bh-nile: #1A475F` / `--bh-nile-hover: #215A78` / `--bh-nile-deep: #0E2633`):** Primary structural brand color for user message bubbles, active navigation accents, primary sidebar actions, and editorial brand anchors.
  - **Cerulean Teal (`--bh-cerulean: #3C889E` / `--bh-sky: #54AFCB`):** Secondary brand color for links, focus borders, subtle horizon strokes, and interactive hover highlights.
  - **Buttercup Gold (`--bh-buttercup: #F0BD1B` / `--bh-buttercup-hover: #DDA90D` / `--bh-buttercup-soft: #FEF8E2` / `--bh-buttercup-ink: #7D5B00`):** Signature Bright Horizons primary CTA accent (`Send`, `Sign In`, `Connect GA4 Account`, `+ New Chat`).
- **Semantic (0–5% of pixels):**
  - **Horizon Emerald (`--success: #0B8743` / `--success-soft: #ECF8F1`):** Connected GA4 status, copied confirmations, positive feedback.
  - **Warning (`--warn: #C48D00` / `--warn-soft: #FEF8E2`):** Session expiry alerts, medium severity banners.
  - **Danger (`--danger: #BD0F0F` / `--danger-soft: #FEF3F3`):** Validation errors, destructive confirmations, critical severity banners.
- **Effect (<1% of pixels):** Subtle directional gradients (`#0E2633 -> #1A475F -> #2B6D83`) reserved strictly for the editorial auth brand panel and the `3px` horizon strip.

### Contrast & Mode Harmonization
| Pair | Ratio / Target | Rule |
|---|---|---|
| `--bh-nile` (`#1A475F`) + `#FFFFFF` | ~9.9:1 (AAA) | Safe for user bubbles, buttons, and headers |
| `--fg-2` (`#464646`) on `#FFFFFF` / `#F3F6F7` | >8.7:1 (AAA) | Default body copy |
| `--muted` (`#5B6E7A`) on `#FFFFFF` / `#F3F6F7` | ≥4.7:1 (AA) | Metadata, captions, timestamps |
| `--bh-buttercup` (`#F0BD1B`) + `--bh-nile-deep` (`#0E2633`) | ~8.8:1 (AAA) | **Mandatory** text color on gold fills; never use white text on `#F0BD1B` |
| `--bh-buttercup-ink` (`#7D5B00`) on `--bh-buttercup-soft` (`#FEF8E2`) | ≥5.4:1 (AA) | Gold-toned badges and GA4 mode pills |

- **GTM vs. GA4 Mode Differentiation:** Both apps share the unified Bright Horizons palette (eliminating off-brand orange `#e8710a`). Differentiate modes via crisp header pills (`GTM Auditor` in `#EBF5F8` / `#1A475F`; `GA4 Analyst` in `#FEF8E2` / `#7D5B00` with a `#F0BD1B` indicator dot) and mode-specific iconography and copy.
- **Accent Cap:** At most 2 visible high-emphasis accent fills per screen (e.g., `New Chat` or `Send` CTA + active indicator).

---

## 3. Typography

- **Families:**
  - Display & Body: `'Mulish', system-ui, -apple-system, sans-serif` (modern variable successor to Bright Horizons' `Muli`).
  - Code & Tabular Identifiers: `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace`.
- **Three-Weight Rhythm:**
  - `400` (Read): Body copy, chat prose, descriptions.
  - `500`–`600` (Emphasize): Navigation items, buttons, table cells, labels.
  - `700`–`800` (Announce): Headings, primary CTAs, dual-weight editorial emphasis (`font-light` + `font-extrabold`).
- **Scale & Tracking Rules:**
  - Display / Hero headings (`≥32px`): `line-height: 1.1`–`1.2`, `letter-spacing: -0.02em`, `text-wrap: balance`.
  - Body text (`14px`–`16px`): `line-height: 1.55`–`1.65`, `letter-spacing: 0`, prose reading measure capped at `max-w-[68ch]`.
  - Uppercase section labels & table headers (`11px`): `letter-spacing: 0.07em` (`0.06em`–`0.1em` floor).
  - Numeric tables, file sizes, property IDs: `font-variant-numeric: tabular-nums`.

---

## 4. Spacing & Grid

- **Base Grid:** `4px` unit (`4 / 8 / 12 / 16 / 20 / 24 / 32 / 48px`).
- **Radii Language:**
  - Interactive buttons, inputs, router cards, nav pills: `10px` (`--radius-sm` / `--radius-md` Bright Horizons signature).
  - Elevated panels, chat bubbles, modals, auth card: `16px` (`--radius-lg`).
  - Badges & status pills: `9999px` (`--radius-pill`) or crisp `8px` tags.
- **Variable Rhythm:** Tighter spacing (`8px`–`12px`) within grouped items; generous separation (`24px`–`32px`) between distinct sections.

---

## 5. Layout & Composition

- **AppShell Chrome:**
  - Top `3px` `.bh-horizon-strip` brand signature.
  - `56px` (`h-14`) crisp white header with sidebar toggle, brand lockup, mode pill, and `ModelSelector`.
  - Collapsible `288px` white sidebar (`border-r border-[var(--border)]`) on desktop; spring-animated slide-over drawer on mobile.
- **Conversation Canvas:**
  - `#F3F6F7` cool ice-slate background with centered `max-w-4xl` message column and floating right-edge `ChatOutline` jump rail.
  - Grounded `#FFFFFF` composer dock (`max-w-4xl`) uniting attachment trigger, auto-resizing textarea, pending attachment pills, and primary Buttercup Gold `Send` CTA.
- **Authentication Screen:**
  - Bright two-column split screen (`min-h-[100dvh]`): left Nile-to-Cerulean editorial brand panel with crisp architectural horizon arcs and dual-weight headline; right `#F3F6F7` canvas centering a crisp `#FFFFFF` auth card.

---

## 6. Components

- **Primary Accent Button:** `#F0BD1B` fill, `#0E2633` bold text, `10px` radius, `#DDA90D` hover, `scale(0.98)` press feedback.
- **Primary Structural Button:** `#1A475F` fill, `#FFFFFF` semibold text, `10px` radius, `#215A78` hover.
- **Secondary / Ghost Button:** `#FFFFFF` or `#F8FAFB` surface, `1px solid #D8E3E8`, `#1A475F` text, hover border `#3C889E`.
- **Router Prompt Cards:** White cards (`10px` radius, `1px solid #D8E3E8`) with Cerulean leading icon and Buttercup Gold chevron (`ChevronRight`) that glides `3px` right on hover.
- **Severity Banners:** Crisp `10px`-radius tinted banners (`1px` semantic border + `8px` indicator dot), replacing generic `border-l-4` stripes.
- **Tables:** Rounded `12px` wrapper, `#F3F6F7` header band, `#1A475F` `11px` uppercase tracked column headers, `tabular-nums` cells, hover `#F8FAFB`, keyboard-accessible copy-table trigger.
- **Toasts:** Elevated `#FFFFFF` cards with semantic icon well, `role="status"` / `role="alert"`, and pause-on-hover/focus auto-dismiss.

---

## 7. Motion & Interaction

- **Duration & Easing:** `150ms` for micro-interactions (hover, press, focus), `220ms` for dropdowns/modals/panels using Material 3 standard `cubic-bezier(0.2, 0, 0, 1)`.
- **Springs:** Used strictly for physical drawer/message layout transitions (`stiffness: 280, damping: 28`).
- **Reduced Motion:** Global `<MotionConfig reducedMotion="user">` in `AppShell` and CSS `@media (prefers-reduced-motion: reduce)` stripping transforms and smooth scrolling.
- **Required States:** Every async surface provides explicit loading (skeleton/status), empty (headline + explanation + CTA), error (cause + recovery action), and edge-case overflow handling.

---

## 8. Voice & Brand

- **Tone:** Clear, calm, analytical, and human-centric.
- **Microcopy:** Literal action labels (`Sign In`, `Create Account`, `Reconnect GA4`, `New Chat`), zero AI hype clichés ("Elevate", "Unleash", "Seamless", "Next-Gen"), zero invented metrics (`10x faster`, `99.9%`).
- **Empty & Error States:** State what happened and what the user can do next without exclamation-mark noise or "Oops!" filler.

---

## 9. Anti-Patterns (Brand Guardrails)

1. **No off-brand indigo (`#6366f1`) or legacy orange (`#e8710a`)** — all brand chrome derives from `tokens.css`.
2. **No white text on Buttercup Gold (`#F0BD1B`)** — always pair gold fills with `#0E2633` / `#1A475F`.
3. **No dark `#0f172a` blurred-orb login screen** — keep the experience bright, crisp, and architecturally grounded.
4. **No rounded cards with `border-l-4` stripes** — use full `1px` semantic borders + indicator dots.
5. **No emojis as UI icons** — use crisp `1.75px` monoline Lucide / custom brand SVGs.
6. **No `outline: none` without `:focus-visible` replacement** and no unlabeled form inputs or icon buttons.
