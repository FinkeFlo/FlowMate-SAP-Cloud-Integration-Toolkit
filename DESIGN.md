---
version: alpha
name: FlowMate
description: Single light daisyUI theme ("flowmate") used across the content-script overlay, Options page, and Popup. No dark theme exists — SAP Cloud Integration itself has no dark mode.
omitted:
  - spacing
colors:
  primary: "#0070f2"
  primary-content: "#ffffff"
  secondary: "#f5f5f5"
  secondary-content: "#24292f"
  accent: "#0070f2"
  accent-content: "#ffffff"
  neutral: "#24292f"
  neutral-content: "#ffffff"
  base-100: "#ffffff"
  base-200: "#f5f5f5"
  base-300: "#e0e0e0"
  base-content: "#24292f"
  info: "#0a6ed1"
  info-content: "#ffffff"
  success: "#15803d"
  success-content: "#ffffff"
  warning: "#b45309"
  warning-content: "#ffffff"
  error: "#d32f2f"
  error-content: "#ffffff"
typography:
  body-md:
    fontFamily: "'72', '72full', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: 14px
rounded:
  selector: 0.5rem
  field: 0.375rem
  box: 0.625rem
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-content}"
  button-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.error-content}"
  button-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.success-content}"
  button-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.warning-content}"
  button-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.info-content}"
  button-neutral:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.neutral-content}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-content}"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-content}"
  card:
    backgroundColor: "{colors.base-100}"
  card-subtle:
    backgroundColor: "{colors.base-200}"
  body:
    backgroundColor: "{colors.base-100}"
    textColor: "{colors.base-content}"
  input:
    backgroundColor: "{colors.base-100}"
    textColor: "{colors.base-content}"
---

## Overview

FlowMate is a browser extension overlay for SAP Cloud Integration (CPI). The
UI must feel calm, functional, and native-adjacent to SAP's own Fiori/Horizon
design — not flashy. We use one consistent framework, **daisyUI v5 + Tailwind
CSS v4**, everywhere (content-script overlay, Options page, Popup), defined in
a single shared theme file: `assets/flowmate-theme.css`.

There is exactly **one** theme, `flowmate` (light). We intentionally do not
ship a dark theme, because SAP Cloud Integration itself has no dark mode —
adding one to our overlay would look inconsistent with the host app.

## Colors

The palette is anchored on FlowMate's brand blue, taken directly from the
extension's logo, plus SAP-Fiori-adjacent neutrals.

- **Primary (`#0070f2`):** FlowMate brand blue. Used for primary actions,
  links, and the "Design" quick link.
- **Success (`#16a34a`):** Deployed/processed/healthy states (e.g. "Processed
  Messages" quick link, success toasts).
- **Error (`#d32f2f`):** Failed/destructive states (e.g. "Failed Messages"
  quick link, Undeploy button, error toasts).
- **Warning (`#d97706`):** Escalated/retry/above-average-performance states.
- **Info (`#0a6ed1`):** Informational badges, below-average-performance
  states.
- **Neutral (`#24292f`):** Dark slate used sparingly for the "Integration
  Content" quick link and neutral badges — not a background color.
- **Base-100/200/300 (`#ffffff` / `#f5f5f5` / `#e0e0e0`):** Surface, subtle
  surface, and border colors respectively. Prefer `btn-*-soft` variants
  (tinted background instead of solid fill) for a calmer, flatter look —
  used for the Refresh/Undeploy buttons and quick links.

## Typography

Font stack matches SAP's own UI (`72`/`72full`, falling back to system
sans-serif) so text doesn't look out of place next to native Fiori
components.

## Shapes

Rounded corners are modest, not pill-shaped: `--radius-box: 0.625rem` for
cards/containers, `--radius-field: 0.375rem` for inputs/small controls,
`--radius-selector: 0.5rem` for checkboxes/toggles.

## Components

- **Buttons:** Use `btn-soft` variants (e.g. `btn-primary btn-soft`, `btn-error
  btn-soft`) by default for a flat, subtle-until-hover feel. Reserve solid
  fills for the single most important action on a page.
- **Cards:** `card card-border`, using `base-100`/`base-300` for background and
  border.
- **Modals/Dialogs:** daisyUI `modal modal-open` / `modal-box` / `modal-action`
  structure for short, single-purpose confirmations (see `ConfirmDialog.tsx`,
  `DateRangeDialog.tsx`).
- **Docked detail panels:** For tabbed, data-heavy detail views whose content
  height varies a lot between tabs (trace steps, message details), use
  `DockPanel` (`features/shared/DockPanel.tsx`) instead of a centered modal.
  It docks to the bottom of the viewport with a fixed/user-resizable height,
  so switching tabs never re-centers or visually "jumps" the panel. Header +
  tabs go in the `header` prop (pinned, never scrolls); tab content goes in
  `children` (scrollable). See `TraceStepPopup.tsx`, `MessageDetailPopup.tsx`.

## Notes for AI agents / contributors

- The single source of truth for actual CSS values is
  `assets/flowmate-theme.css` — if this file and that one ever disagree,
  the CSS file wins; update this file to match.
- **Shadow DOM caveat:** the content-script overlay renders inside a Shadow
  Root for style isolation from the SAP host page. daisyUI/Tailwind apply
  theme variables via `:root`/`[data-theme=...]`, and `:root` never matches
  inside a shadow tree — so `data-theme="flowmate"` is set explicitly on the
  Shadow Root container in `entrypoints/content.ts`.
- Do not introduce other CSS frameworks or hand-rolled component CSS. Only
  keep a component-local `.css` file for a genuine `@keyframes` animation
  with no Tailwind/daisyUI equivalent (see `DesignTimeToolbar.css`).
