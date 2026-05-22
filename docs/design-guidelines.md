# Design Guidelines

> Cross-links: [code-standards.md](code-standards.md) | [codebase-summary.md](codebase-summary.md)

**Status:** v1 placeholder — design tokens and component patterns are reasonable defaults. Refine after the first real screen is built in Phase 1.

---

## Philosophy

- **Mobile-first:** design and implement for small screens first; layer complexity for larger viewports.
- **Content-first:** layout serves content, not the other way around. No decorative chrome that competes with the user's task.
- **Accessible by default:** WCAG 2.1 AA is the minimum target, not an afterthought. Every component must pass before it ships.

---

## Breakpoints

Use these breakpoints consistently. They map directly to Tailwind CSS v4 defaults (now the project standard) or custom CSS custom properties.

| Token | Min width (px) | Use case |
|-------|---------------|----------|
| `sm`  | 480           | Large phones, landscape |
| `md`  | 768           | Tablets, small laptops |
| `lg`  | 1024          | Laptops, desktop |
| `xl`  | 1280          | Wide desktop |
| `2xl` | 1536          | Very wide / ultrawide |

**Rule:** write base styles for `< 480px` (no prefix), then use `sm:`, `md:`, `lg:`, `xl:`, `2xl:` to progressively enhance.

---

## Color Tokens

> v1 placeholder palette. Refine after first real screen — these hex values are starting points, not final brand colors.

Each scale: `50` = lightest tint, `900` = darkest shade.

### Primary (brand blue)

| Token | Hex |
|-------|-----|
| `primary-50`  | `#EFF6FF` |
| `primary-100` | `#DBEAFE` |
| `primary-300` | `#93C5FD` |
| `primary-500` | `#3B82F6` |
| `primary-700` | `#1D4ED8` |
| `primary-900` | `#1E3A8A` |

### Neutral (grays)

| Token | Hex |
|-------|-----|
| `neutral-50`  | `#F9FAFB` |
| `neutral-100` | `#F3F4F6` |
| `neutral-300` | `#D1D5DB` |
| `neutral-500` | `#6B7280` |
| `neutral-700` | `#374151` |
| `neutral-900` | `#111827` |

### Success (green)

| Token | Hex |
|-------|-----|
| `success-50`  | `#F0FDF4` |
| `success-100` | `#DCFCE7` |
| `success-300` | `#86EFAC` |
| `success-500` | `#22C55E` |
| `success-700` | `#15803D` |
| `success-900` | `#14532D` |

### Warning (amber)

| Token | Hex |
|-------|-----|
| `warning-50`  | `#FFFBEB` |
| `warning-100` | `#FEF3C7` |
| `warning-300` | `#FCD34D` |
| `warning-500` | `#F59E0B` |
| `warning-700` | `#B45309` |
| `warning-900` | `#78350F` |

### Danger (red)

| Token | Hex |
|-------|-----|
| `danger-50`  | `#FFF1F2` |
| `danger-100` | `#FFE4E6` |
| `danger-300` | `#FCA5A5` |
| `danger-500` | `#EF4444` |
| `danger-700` | `#B91C1C` |
| `danger-900` | `#7F1D1D` |

**Contrast rule:** text on any background must meet ≥ 4.5:1 contrast ratio (WCAG AA normal text). Use `neutral-700` or darker on white backgrounds. Never place `primary-300` or lighter text on white.

---

## Typography Scale

Base font: system-ui stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`). Set a Vietnamese-friendly fallback: `'Noto Sans', sans-serif`.

| Step | Size (px / rem) | Line-height | Typical use |
|------|----------------|-------------|-------------|
| `text-xs`  | 12 / 0.75rem  | 1.5 (18px)  | Captions, badges, helper text |
| `text-sm`  | 14 / 0.875rem | 1.5 (21px)  | Secondary labels, table cells |
| `text-base`| 16 / 1rem     | 1.5 (24px)  | Body copy, form inputs |
| `text-lg`  | 18 / 1.125rem | 1.5 (27px)  | Lead paragraphs |
| `text-xl`  | 20 / 1.25rem  | 1.4 (28px)  | Card titles, section subheadings |
| `text-2xl` | 24 / 1.5rem   | 1.35 (32px) | Page subheadings (h3) |
| `text-3xl` | 30 / 1.875rem | 1.3 (39px)  | Section headings (h2) |
| `text-4xl` | 36 / 2.25rem  | 1.2 (43px)  | Page titles (h1, desktop) |
| `text-5xl` | 48 / 3rem     | 1.1 (53px)  | Hero headings (large viewport only) |

**Weights:** Regular (400) for body; Medium (500) for labels and subheadings; Semibold (600) for headings and button text. Avoid bold (700) except for critical callouts.

---

## Spacing Scale

4-pt grid. All margins, padding, and gaps must use one of these values.

| Token | px | rem |
|-------|----|-----|
| `space-1`  | 4  | 0.25 |
| `space-2`  | 8  | 0.5  |
| `space-3`  | 12 | 0.75 |
| `space-4`  | 16 | 1    |
| `space-6`  | 24 | 1.5  |
| `space-8`  | 32 | 2    |
| `space-12` | 48 | 3    |
| `space-16` | 64 | 4    |

Do not use arbitrary pixel values. If a layout needs a gap that doesn't fit this scale, revisit the design.

---

## Component Patterns

### Button

Four variants: `primary` (filled `primary-500`), `secondary` (outlined `primary-500` border), `ghost` (no border, text only), `danger` (filled `danger-500`). Each variant has five states: default, hover (10% darker), focus (2px ring `primary-500` offset 2px), active (15% darker), disabled (opacity 40%, cursor not-allowed). Minimum tap target: 44 × 44px. Button text is always sentence-case, never ALL CAPS. Loading state replaces the label with a spinner + "..." while keeping the button width stable to prevent layout shift. Icon-only buttons must have an `aria-label`.

### Form Field + Validation

Label above input, never placeholder-only. Placeholder text is supplemental hint, not the label. Input border: `neutral-300` default, `primary-500` on focus (2px), `danger-500` on error. Validation messages appear below the input in `text-sm danger-500`. Show errors on blur, not on every keystroke. Required fields are marked with an asterisk (`*`) next to the label with a screen-reader note at the top of the form. Use `aria-describedby` to associate the error message with the input.

### Modal / Dialog

Centered overlay with `neutral-900/60` backdrop. Max-width `32rem` (512px) on mobile full-bleed with `space-4` side padding. Header with title + close button (×); footer with cancel + confirm actions right-aligned. Focus is trapped inside the modal while open. `Escape` closes the modal. Scroll is locked on the page behind. Use the native `<dialog>` element where browser support permits; otherwise a `role="dialog"` div with `aria-modal="true"` and `aria-labelledby`.

### Navigation

Top navigation bar: sticky, `neutral-50` background, `neutral-200` bottom border, `space-4` vertical padding. Mobile: collapses to a hamburger menu that opens a full-height side drawer. Active link: `primary-700` text + `primary-500` left border (sidebar) or bottom border (top nav). Breadcrumbs for routes deeper than two levels. Skip-to-content link as the first focusable element on every page.

### Table

Full-width with horizontal scroll on `md` and below (never truncate cells). Header row: `neutral-100` background, `text-sm` semibold, sticky on vertical scroll if > 10 rows. Row hover: `neutral-50`. Zebra striping optional; if used, even rows `neutral-50`. Cell padding: `space-3` vertical, `space-4` horizontal. Numeric columns right-aligned. Empty state (zero rows) renders the empty state component inside the table body, spanning all columns. Pagination below the table: show current page, total pages, and prev/next controls.

### Empty State

Centered in its container: optional illustration (max 120px), heading (`text-xl` semibold), one-line description (`text-sm neutral-500`), optional primary action button. Do not show an empty table with just a "No data" cell — use this component. Keep the copy actionable: "No orders yet — place your first order" rather than "No results found."

### Loading Skeleton

Replaces content while data loads. Use a gray animated pulse (`neutral-200` background, shimmer animation). Match the skeleton shape to the real content's shape (e.g., a card skeleton has a rectangle for the image, two lines for title/subtitle). Never show a spinner for an entire page; use skeleton for content areas and a spinner only for button-triggered actions. Respect `prefers-reduced-motion`: replace shimmer with a static `neutral-100` block.

### Error Boundary UI

Catches unhandled React render errors. Shows: a short user-friendly message ("Something went wrong"), a "Try again" button that resets the boundary, and a collapsed "Technical details" disclosure (for dev/staging only, hidden in prod). Log the error to the structured logging pipeline. Never show a raw JS stack trace to end users in production.

---

## Responsive Layout Patterns

### Stack-then-Grid

On mobile: single-column stack (full width). On `md+`: CSS Grid or Flexbox multi-column. Use `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` for card grids to handle intermediate viewport widths without hard breakpoints.

### Sidebar Collapse

On `lg+`: fixed-width sidebar (240px) + fluid main content. On `md` and below: sidebar collapses behind a toggle. The collapsed sidebar overlays content (does not push it). Sidebar state is persisted in `localStorage` for returning users.

### Sticky Header

Top nav is `position: sticky; top: 0; z-index: 40`. Content below must have `padding-top` equal to the header height to avoid overlap (use a CSS custom property `--header-height` updated via ResizeObserver). On scroll, add a subtle `box-shadow` to visually separate the header from content.

### Safe-Area Aware

For mobile web and PWA use cases, apply `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` to fixed positioned elements (bottom nav, floating action buttons) to avoid notch and home-indicator overlap.

---

## Accessibility

- **Semantic HTML first:** use `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`, `<section>`, `<article>`, `<button>`, `<a>` for their intended purpose. Never use a `<div>` for interaction.
- **Focus rings:** never remove the default focus ring with `outline: none` without providing a custom visible replacement. Minimum: `outline: 2px solid currentColor; outline-offset: 2px`.
- **ARIA discipline:** add ARIA only when semantic HTML is insufficient. Wrong ARIA is worse than none. Follow the rule: no ARIA > native element > ARIA role.
- **Contrast:** body text ≥ 4.5:1, large text (18pt+ or 14pt bold) ≥ 3:1, UI components and focus indicators ≥ 3:1.
- **Keyboard navigation:** all interactive elements reachable and operable via keyboard in logical DOM order. Tab order must match visual order. Modals trap focus; close on `Escape`.
- **prefers-reduced-motion:** wrap all CSS animations and transitions in `@media (prefers-reduced-motion: no-preference) { ... }`. Provide an instant/no-animation fallback.
- **Screen reader testing:** test with VoiceOver (macOS/iOS) or NVDA (Windows) before merging any new interactive component.

---

## Internationalisation (i18n)

- Default locale: **`vi`** (Vietnamese), matching `DEFAULT_LOCALE` env on the backend.
- Supported locales: `vi`, `en`.
- Never hardcode display strings in JSX. Use `react-i18next`'s `useTranslation` hook: `const { t } = useTranslation('namespace')`.
- Keys are structured: `section.key` within a namespace (e.g., `useTranslation('auth')` → `t('login.submitButton')`).
- Mirror the backend's translation key namespace where UI strings correspond to API messages (e.g., validation errors).
- Number, date, and currency formatting must use `Intl` APIs with the active locale.
- Text expansion: Vietnamese strings can be 20–40% longer than their English equivalents — design layouts to accommodate this without overflow.
- RTL: not required now; avoid writing CSS that would break under `dir="rtl"` (prefer logical properties: `margin-inline-start` over `margin-left`).

---

## Image & Asset Guidelines

- **Lazy-load** all images below the fold: `<img loading="lazy" />`. Do not lazy-load images in the viewport on page load (hero, above-fold thumbnails).
- **srcset for retina:** provide 1x and 2x sources for all images. Use `<picture>` with `webp` as the first source and `jpeg/png` as fallback.
- **Hero images:** maximum 200 KB at 1x. Use lossy WebP compression (quality 75–85).
- **Icons:** use inline SVG or an SVG sprite. Do not use PNG icons.
- **Alt text:** every `<img>` must have `alt`. Decorative images: `alt=""`. Informative images: describe what the image conveys, not what it looks like.
- **Fonts:** self-host or use a preconnect + preload strategy. Do not block render on font loading; use `font-display: swap`.

---

## Performance Budget

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | ≤ 2.5 s on mid-range mobile (Moto G4 equivalent) |
| CLS (Cumulative Layout Shift) | < 0.1 |
| FCP (First Contentful Paint) | ≤ 1.8 s |
| TTI (Time to Interactive) | ≤ 3.8 s |
| JS bundle (initial, gzipped) | ≤ 200 KB |
| Total page weight (initial load) | ≤ 1 MB |

Measure with Lighthouse CI in the GitHub Actions pipeline (Phase 3). Any PR that regresses LCP or CLS beyond the threshold must be fixed before merge.

---

*Last updated: 2026-05-22*
