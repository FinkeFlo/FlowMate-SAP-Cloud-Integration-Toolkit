---
paths:
  - "features/**/*.tsx"
  - "entrypoints/**"
  - "assets/**"
  - "DESIGN.md"
---

# Styling rules

- **Stack:** Preact TSX + Tailwind CSS v4 + daisyUI v5. Nothing else. No CSS-in-JS, no other frameworks, no
  component `.css` files except for a genuine `@keyframes` (pattern: `features/design-tools/DesignTimeToolbar.css`).
- **Order of preference:** daisyUI component class (`btn`, `card card-border`, `input input-bordered`, `badge`,
  `alert`, `modal`, `tooltip`, `divider`) → Tailwind utility for layout/spacing → nothing custom.
- **Buttons:** `btn-<color> btn-soft` by default; solid fill only for the single primary action of a view.
- **Theme:** exactly one theme, `flowmate` (light). No dark theme. Every entrypoint imports
  `@/assets/flowmate-theme.css`; root elements set `data-theme="flowmate"`.
- **Shadow DOM:** the content overlay lives in a Shadow Root. `:root` does not match inside it; native `title`
  tooltips are unreliable there — use daisyUI `tooltip` + `data-tip`. Dialogs that must overlay the SAP page use
  `DockPanel` (`features/shared/DockPanel.tsx`) for tabbed/data-heavy views and daisyUI `modal` for short confirms.
- **Tokens:** colors, radii and fonts are defined once in `assets/flowmate-theme.css` and documented in `DESIGN.md`.
  Changing a token means changing both files and running `npm run lint:design`. No new hex literals in TSX.
- **Z-index:** use the existing layering (toolbar `z-[9999]`, panels above it, toasts on top). Do not invent new values.
- **Accessibility:** every icon-only button has an `aria-label` (translated); state is never conveyed by color
  alone (add an icon or text); interactive targets are at least 24 px; keyboard focus stays visible.
- **Confirmations:** no `window.confirm`/`alert`. Use the daisyUI modal pattern (`ConfirmDialog`).
