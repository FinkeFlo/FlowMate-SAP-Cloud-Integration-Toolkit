---
version: alpha
name: FlowMate
description: Single light daisyUI theme ("flowmate") used across the content-script overlay, Options page, and Popup. Petrol for actions, ink for FlowMate's own chrome, a coral spark for things in motion; status colors only ever mean a status. No dark theme is active.
omitted:
  - spacing
colors:
  primary: "#0a5a65"
  primary-content: "#ffffff"
  secondary: "#e9eff0"
  secondary-content: "#0e1d20"
  accent: "#ff7a59"
  accent-content: "#0e1d20"
  neutral: "#0e1d20"
  neutral-content: "#ffffff"
  base-100: "#ffffff"
  base-200: "#f3f6f6"
  base-300: "#dfe6e7"
  base-content: "#0e1d20"
  info: "#1d64c8"
  info-content: "#ffffff"
  success: "#17783f"
  success-content: "#ffffff"
  warning: "#a35a00"
  warning-content: "#ffffff"
  error: "#c8322b"
  error-content: "#ffffff"
  muted: "#56676b"
  border: "#7d8d91"
  code-key: "#0a5a65"
  code-string: "#3b7a1c"
  code-number: "#a3460f"
  code-literal: "#6b3fa0"
  code-comment: "#5f6f73"
  code-punct: "#56676b"
typography:
  body-md:
    fontFamily: "Onest, '72', '72full', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: 14px
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: 12px
rounded:
  selector: 0.25rem
  field: 0.5rem
  box: 0.875rem
  pill: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-content}"
    rounded: "{rounded.pill}"
  button-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.error-content}"
    rounded: "{rounded.pill}"
  button-success:
    backgroundColor: "{colors.success}"
    textColor: "{colors.success-content}"
    rounded: "{rounded.pill}"
  button-warning:
    backgroundColor: "{colors.warning}"
    textColor: "{colors.warning-content}"
    rounded: "{rounded.pill}"
  button-info:
    backgroundColor: "{colors.info}"
    textColor: "{colors.info-content}"
    rounded: "{rounded.pill}"
  button-neutral:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.neutral-content}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-content}"
    rounded: "{rounded.pill}"
  button-accent:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-content}"
    rounded: "{rounded.pill}"
  card:
    backgroundColor: "{colors.base-100}"
    rounded: "{rounded.box}"
  card-subtle:
    backgroundColor: "{colors.base-200}"
    rounded: "{rounded.box}"
  divider:
    backgroundColor: "{colors.base-300}"
  body:
    backgroundColor: "{colors.base-100}"
    textColor: "{colors.base-content}"
  input:
    backgroundColor: "{colors.base-100}"
    textColor: "{colors.base-content}"
    rounded: "{rounded.field}"
  input-outline:
    backgroundColor: "{colors.border}"
  caption:
    backgroundColor: "{colors.base-100}"
    textColor: "{colors.muted}"
  toolbar-handle:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.neutral-content}"
    rounded: "{rounded.pill}"
  toast:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.neutral-content}"
    rounded: "{rounded.box}"
  code-key:
    backgroundColor: "{colors.base-200}"
    textColor: "{colors.code-key}"
  code-string:
    backgroundColor: "{colors.base-200}"
    textColor: "{colors.code-string}"
  code-number:
    backgroundColor: "{colors.base-200}"
    textColor: "{colors.code-number}"
  code-literal:
    backgroundColor: "{colors.base-200}"
    textColor: "{colors.code-literal}"
  code-comment:
    backgroundColor: "{colors.base-200}"
    textColor: "{colors.code-comment}"
  code-punct:
    backgroundColor: "{colors.base-200}"
    textColor: "{colors.code-punct}"
---

## Overview

FlowMate is a browser extension overlay for SAP Cloud Integration (CPI). It
sits *beside* SAP's Fiori/Horizon UI for a whole working day, so it must be
calm and functional — and it must never be mistaken for SAP itself, which is
why it has its own palette instead of SAP blue.

The identity comes from one picture: **a route and a message**. The logo is an
F drawn as an integration route (a stem, a run along the top and a branch that
forks off); a coral dot — the spark — is the message travelling on it. The UI
follows the same idea: lines for structure, dots for messages, capsules for
everything you press.

We use one consistent framework, **daisyUI v5 + Tailwind CSS v4**, everywhere
(content-script overlay, Options page, Popup), defined in a single shared theme
file: `assets/flowmate-theme.css`. There is exactly **one** active theme,
`flowmate` (light).

## Colors

- **Primary — petrol (`#0a5a65`):** FlowMate's action color: primary buttons,
  links, pressed and selected states, the focus ring. Soft variants
  (`btn-primary btn-soft`) for every action that is not the main one.
- **Neutral — ink (`#0e1d20`):** FlowMate's own chrome — the things FlowMate
  *says*: toolbar handle, toasts, tooltips. Also the body text color.
- **Accent — spark (`#ff7a59`):** the message dot from the logo. Only for things
  in motion (live/auto-refresh dot, loader). Never a status, never text on a
  light surface (2.6:1); text on an accent fill uses `accent-content`.
- **Secondary (`#e9eff0`):** quiet buttons such as Cancel.
- **Status colors only mean status:** success `#17783f` (Completed, deployed),
  error `#c8322b` (Failed, destructive), warning `#a35a00` (Retry, Escalated,
  slower than average), info `#1d64c8` (Processing, information). Every status
  also carries a word or an icon. A slow trace step is a warning, never an error.
- **Base-100/200/300 (`#ffffff` / `#f3f6f6` / `#dfe6e7`):** surface, sunken
  surface (code, tracks, hovered rows) and hairlines.
- **Muted (`#56676b`, `text-muted`):** secondary text — hints, metadata,
  timestamps, section labels. Never fade `base-content` with opacity instead.
- **Border (`#7d8d91`):** outlines of inputs, selects and checkboxes (3:1); the
  theme file applies it through daisyUI's `--input-color`.
- **Code colors (`code-*`):** syntax highlighting in `CodeViewer.tsx`, read as
  CSS variables by CodeMirror inside the Shadow Root.
- Status colors for messages come from `features/shared/status-tone.ts`
  (COMPLETED success, FAILED error, RETRY/ESCALATED warning, PROCESSING info,
  CANCELLED/DISCARDED/ABANDONED neutral) — use its class maps, not hex values.
- Text colors reach 4.5:1 on `base-100` and `base-200`, status colors also on
  their soft tints.

## Typography

**Onest** for everything people read, **JetBrains Mono** for everything a
machine wrote (GUIDs, timestamps, hosts, payloads, log levels). Both are bundled
as variable woff2 in `public/fonts/` (SIL Open Font License, license texts next
to the files) and registered on the popup and options pages by
`features/shared/fonts.ts`. Inside the SAP page the overlay falls back to SAP's
own `72` from the same stack, because `@font-face` does not apply inside a
Shadow Root. Weights: 400 text, 600 controls, 700 headings, 800 only for the
wordmark-sized options title.

## Shapes

Capsules you press, rectangles that hold:

- `--radius-box: 0.875rem` for cards, modals, alerts, the toolbar and popovers.
- `--radius-field: 0.5rem` for inputs, selects and tooltips.
- `--radius-selector: 0.25rem` for checkboxes.
- Buttons, badges, toggles and segmented tabs (`tabs-box`) are full capsules:
  the theme file scopes the radius variables on `.btn`, `.badge`, `.toggle` and
  `.tabs-box` to `9999px`, so no per-component class is needed.
- Flat: `--depth: 0` and `--noise: 0`. Only things that float over SAP cast a
  shadow — `shadow-float` (toolbar, popovers, toasts), `shadow-dock` (dock
  panel), `shadow-modal` (dialogs); content at rest uses `base-300` hairlines.

## Logo

The mark is an F drawn as a route with the spark as the message. Files:
`public/icon.svg` (app icon), `public/icon/*.png` (browser icons; 16 and 32 px
use a heavier small optical size), `assets/logo.svg` (lockup with the
wordmark). `features/shared/FlowMateLogo.tsx` draws it inline with theme colors
(`fill-primary`, `stroke-primary-content`, `fill-accent`) — the regular
drawing from 24 px, the heavier small one below. Never recolor the
spark or use the logo on SAP blue.

## Components

- **Buttons:** Use `btn-soft` variants (e.g. `btn-primary btn-soft`, `btn-error
  btn-soft`) by default for a flat, subtle-until-hover feel. Reserve solid
  fills for the single most important action on a page (Deploy, Add customer).
  Toggles show their state with `aria-pressed` and a fill; busy buttons use
  `aria-busy` and stay readable.
- **Toolbar:** the floating toolbar's header is an ink capsule (`btn-neutral`)
  with the logo; minimized, only that capsule remains.
- **Status:** messages are status discs (`TONE_DISC_CLASS`) with a glyph, never
  a colored left border or a glow; filters are capsules whose ink fill means
  "on". The live dot (`bg-accent`, pulsing) marks auto-refresh.
- **Toasts:** ink cards (`bg-neutral`) with a status disc and a Lucide icon.
- **Tabs:** segmented `tabs tabs-box` in dock-panel headers.
- **Empty states:** `features/shared/EmptyState.tsx` (the logo's route with an
  empty stop).
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

## Writing

FlowMate talks like a colleague who knows CPI: short, factual, specific. Every
string exists in `en` and `de` (`t()`, see `.claude/rules/i18n.md`).

- **German: always "du"**, lowercase ("Verwalte deine Tenants", "Wähle Start-
  und Enddatum aus"). Buttons and labels stay infinitive ("Kunde hinzufügen").
- **English: sentence case** ("Refresh status", "Add tenant"). SAP's own names
  keep SAP's spelling: Integration Content, Message Usage, iFlow.
- **CPI terms stay** in both languages: iFlow, Tenant, Trace, Payload,
  Log-Level, Deploy/Undeploy.
- **Buttons** start with the verb and say what happens; a confirm button
  repeats the verb of its dialog title. No OK, Yes or "Are you sure?".
- **Toasts** state the outcome; an error says what failed ("Failed to save: …").
  Details go into placeholders (`tSub`), never glued onto a translated fragment.
- **Empty states** say what is empty and when it fills: an `EmptyState` title
  plus one sentence.
- **Typography:** the ellipsis character ("Loading…"), the en dash for
  clauses, “…” in English and „…“ in German, a space before units ("850 ms",
  "30 s"). Dates are ISO ("2026-10-09") and times 24 h, both from
  `features/shared/time-format.ts`.
- **Status words** are words, not capitals: "Not deployed", "Trace on".
  Uppercase only comes from the overline style.

## Notes for AI agents / contributors

- The single source of truth for actual CSS values is
  `assets/flowmate-theme.css` — if this file and that one ever disagree,
  the CSS file wins; update this file to match.
- The inline-trace step colors are painted on SAP's SVG outside the Shadow
  Root, so they are hex values in `features/inline-trace/step-colors.ts`; keep
  them in sync with the theme.
- The deployment badges that `ArtifactStatus.ts` injects into SAP's own
  package table keep SAP's semantic colors on purpose: they live inside an SAP
  control and should read as part of it.
- **Shadow DOM caveat:** the content-script overlay renders inside a Shadow
  Root for style isolation from the SAP host page. daisyUI/Tailwind apply
  theme variables via `:root`/`[data-theme=...]`, and `:root` never matches
  inside a shadow tree — so `data-theme="flowmate"` is set explicitly on the
  Shadow Root container in `entrypoints/content.ts`.
- Do not introduce other CSS frameworks or hand-rolled component CSS. Only
  keep a component-local `.css` file for a genuine `@keyframes` animation
  with no Tailwind/daisyUI equivalent (see `DesignTimeToolbar.css`).
