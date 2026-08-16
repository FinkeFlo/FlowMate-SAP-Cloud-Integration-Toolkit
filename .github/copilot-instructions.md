# FlowMate – Copilot Instructions

FlowMate is a **browser extension** that enhances SAP Cloud Integration (SAP CPI) in the browser. It is built with the [WXT framework](https://wxt.dev/), Preact (TSX), Tailwind CSS v4, and daisyUI v5.

---

## Commands

```sh
npm run dev           # Dev build → .output/chrome-mv3-dev (load unpacked in Chrome)
npm run build         # Production build (Chrome MV3)
npm run build:firefox # Production build (Firefox MV2)
npm run compile       # TypeScript type-check only (no emit)
npm run lint          # ESLint
npm run lint:design   # Validate DESIGN.md tokens (design.md lint)
```

There is no automated test suite; validation is done via `compile` + `lint` + manual Playwright session (`npm run playwright:session`).

---

## Architecture

```
entrypoints/          # WXT entry points (background, content script, popup, options page)
features/             # All product logic, grouped by domain
  shared/             # Cross-feature utilities (api client, i18n, navigation, toast, …)
  <feature>/          # Self-contained feature (index.ts = public API)
config/               # App-wide config (SAP CPI URL patterns)
public/_locales/      # i18n dictionaries (en / de)
assets/               # Global CSS (flowmate-theme.css) and SVGs
```

### Content script ↔ background messaging
Content scripts **cannot** make cross-origin API calls directly. All SAP CPI API calls go through the **background service worker** via a typed message protocol defined in `features/shared/messages.ts`. Use `sendTypedMessage()` from content scripts; handle messages in `entrypoints/background.ts`. When adding a new message type, update `ExtensionMessage`, `MessageResponseMap`, and the background handler together.

### Shadow DOM isolation
The content script mounts a Preact app inside a Shadow Root (`createShadowRootUi`, `cssInjectionMode: 'ui'`). Because `:root` selectors do not reach inside a shadow tree, `data-theme="flowmate"` **must** be set explicitly on the shadow container element — not just on `<html>`. See `entrypoints/content.ts` for the pattern.

### SPA navigation detection
SAP CPI is a single-page app. Use `features/shared/navigation.ts` to detect URL/page-type changes rather than relying on standard `load` / `DOMContentLoaded` events.

### Page type detection
Use the `usePageType` hook (`features/shared/usePageType.ts`) to conditionally render feature UI only on relevant SAP CPI pages.

---

## Key Conventions

### Localization
Never hard-code user-facing strings. All UI text must be in `public/_locales/en/messages.json` (and `de/`). Reference with `t('key')` from `features/shared/i18n.ts`.

### Styling
- Use **daisyUI component classes first** (`btn`, `card`, `input input-bordered`, `badge`, `alert`, etc.), then Tailwind utility classes for layout/spacing.
- There is exactly **one theme**: `flowmate` (light only — no dark theme).
- Only add a component-local `.css` file for genuinely custom `@keyframes` animations. Never use local CSS for layout or color rules.
- Every entrypoint must import `@/assets/flowmate-theme.css`. Validate design tokens against `DESIGN.md` with `npm run lint:design`; keep `assets/flowmate-theme.css` as the CSS source of truth.

### Feature structure
- Each feature lives in its own `features/<name>/` directory and exports its public API through `index.ts`.
- Import using `@/features/<name>` (the `@/` alias maps to the repo root).
- Keep components focused on rendering; extract business logic into separate hooks or utility files.

### Language
All code, variable names, comments, and commit messages must be in **English**.

### Commits & changelog
- Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, etc.).
- Update `CHANGELOG.md` before every commit, even for minor changes.
- PRs are squash-merged; the PR title becomes the squash commit message.

### Dummy data in docs/tests
Never use real client names or tenant URLs. Use generic placeholders like `Acme Corp` or `https://tenant.example.integrationsuite.com`.

### Dev logging
In development builds, use `features/shared/dev-logger.ts` for structured debug output — it streams through the WXT dev server WebSocket to `.dev-logs/debug.log` and `.dev-logs/responses/`.
