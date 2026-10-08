---
name: new-feature
description: Scaffold a new FlowMate feature directory the standard way (feature folder, index.ts public API, i18n keys in both locales, page-type wiring, CHANGELOG entry). Use when the user asks to "add a feature", "create a new panel/button/tool" for the SAP CPI overlay, popup or options page.
argument-hint: <feature-name> [page-type]
---

# New feature scaffold

Before writing code, follow the brainstorming/design process the session uses; this skill only fixes the
**shape** of the result so every feature looks the same.

1. **Name:** kebab-case directory `features/<feature-name>/`. Component files PascalCase `.tsx`, modules
   kebab-case `.ts`, hooks `useX.ts`.
2. **Files:**
   - `index.ts` — the only import surface: `export { XPanel } from './XPanel';` plus exported types.
   - `<Feature>Panel.tsx` / `<Feature>Button.tsx` — rendering only, daisyUI classes, `t()` for every string.
   - `<feature>-api.ts` — SAP calls (OData/REST) through `fetch-client.ts`, or via background message if
     cross-origin. Pure functions, unit-testable, no DOM access.
   - `use<Feature>.ts` — state/effects if the component would otherwise exceed ~150 lines.
   - `<feature>-api.test.ts` — Vitest for the pure module (dummy tenant data only).
3. **Wiring:** add the page condition to `features/shared/usePageType.ts` if a new SAP page is involved, and
   mount the component in `features/ContentApp.tsx` (overlay), `features/popup/PopupApp.tsx` or
   `features/settings/components/SettingsApp.tsx`.
4. **Messaging:** if the background must call SAP, add the message type in `features/shared/messages.ts`
   (union + response map) and the `case` in `entrypoints/background.ts` — in the same commit.
5. **i18n:** add every key to `public/_locales/en/messages.json` and `de/messages.json`, prefixed with the
   feature name.
6. **Docs:** `CHANGELOG.md` → `### Added`; `AGENTS.md` repository map if a new top-level concept appears.
7. **Verify:** run the `verify` skill; then the `review` skill before the PR.

Reference implementation to copy from: `features/package-design/` (panel + buttons + api + status module).
