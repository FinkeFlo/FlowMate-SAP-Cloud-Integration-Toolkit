# FlowMate – Agent Instructions

Tool-neutral instructions for every AI coding agent (Claude Code, Copilot, …) working in this repository.
Humans: see `CONTRIBUTING.md` for the long form. Keep this file short; details live in the files it points to.

FlowMate is a **browser extension** (Chrome MV3, Firefox MV2) that adds productivity tools to the SAP Cloud
Integration (SAP CPI / Integration Suite) web UI. Stack: [WXT](https://wxt.dev/), Preact (TSX), TypeScript,
Tailwind CSS v4, daisyUI v5. There is no backend; all API calls use the user's existing SAP browser session.

## Commands

```sh
npm run dev           # Dev build with hot reload → .output/chrome-mv3-dev (load unpacked in Chrome)
npm run compile       # TypeScript type-check (tsc --noEmit)
npm run lint          # ESLint (no-console, react-hooks, typescript-eslint)
npm run lint:design   # Validate DESIGN.md tokens
npm run lint:i18n     # en/de key parity, every t() key exists, placeholders match
npm run test          # Vitest unit tests (features/**/*.test.ts)
npm run build         # Production build (Chrome); build:firefox for Firefox
npm run verify        # compile + lint + lint:design + lint:i18n + test + build — run before claiming anything is done
```

Node 24 (`.nvmrc`). CI runs exactly these checks; a change is only "done" when `npm run verify` is green locally.

## Repository map

```
entrypoints/          WXT entry points: background.ts (service worker), content.ts (SAP page overlay), popup/, options/
features/             All product logic, one directory per domain; index.ts is the public API of a feature
  shared/             Cross-feature utilities: messages.ts (typed protocol), api-client.ts, i18n.ts, navigation.ts, toast.ts
  <feature>/          e.g. message-log, inline-trace, package-design, log-throttle, trace-mode, tenant-links, settings
config/               SAP CPI URL patterns (content-script matches)
public/_locales/      i18n dictionaries (en, de) — both must always contain the same keys
assets/               flowmate-theme.css (the single theme, CSS source of truth) and SVGs
docs/                 Design specs (docs/superpowers/specs/) and other documentation
.claude/              Claude Code rules, hooks, skills and agents (see CLAUDE.md)
```

## Architecture essentials

- **Content ↔ background messaging.** Content scripts cannot make cross-origin calls. SAP API calls that need it go
  through the background service worker via the typed protocol in `features/shared/messages.ts`
  (`sendTypedMessage`). A new message type touches three places together: the `ExtensionMessage` union, the
  `MessageResponseMap`, and the handler `switch` in `entrypoints/background.ts`.
- **Shadow DOM.** The content overlay renders inside a Shadow Root (`createShadowRootUi`, `cssInjectionMode: 'ui'`).
  `:root` selectors never match inside it, so `data-theme="flowmate"` is set on the shadow container in
  `entrypoints/content.ts`. Native `title` tooltips are unreliable inside the shadow tree; use daisyUI `tooltip`.
- **SPA navigation.** SAP CPI is a single-page app. Detect page changes with `features/shared/navigation.ts` and
  render feature UI conditionally through the `usePageType` hook, never via `load`/`DOMContentLoaded`.
- **SAP CPI hosts.** The extension only runs on Integration Suite UI hosts
  (`<sub>.integrationsuite[-trial|-cpiNNN].cfapps.<region>[-NNN].hana.ondemand.com`).
  `features/shared/cpi-url.ts` is the single trust-boundary check; the manifest patterns in
  `config/sap-cpi-urls.ts` are derived from it. Verified hosts, sources and unsupported variants:
  `docs/sap-cpi-hosts.md`.
- **Dev logging.** `features/shared/dev-logger.ts` streams structured logs to `.dev-logs/` in dev builds only.
  `.dev-logs/` may contain real tenant data — never read it into an agent context or commit it.

## Conventions (enforced by hooks, lint and CI where possible)

1. **English only** for code, comments, commit messages, docs and changelog.
2. **i18n:** no hard-coded user-facing strings (including `title`, `aria-label`, `placeholder`, toast text).
   Use `t('key')` from `features/shared/i18n.ts`; add the key to **both** `public/_locales/en` and `de`.
3. **Styling:** daisyUI component classes first, Tailwind utilities for layout. One theme (`flowmate`, light only).
   No new CSS files except for a genuine `@keyframes`. Tokens are documented in `DESIGN.md`; the CSS wins on conflict.
4. **Feature structure:** `features/<name>/` with `index.ts` as public API; import via `@/features/<name>`.
   Components render; business logic lives in hooks or plain modules so it can be unit-tested.
5. **Security at trust boundaries:** validate every URL that comes from storage, the DOM or a message before using it
   in `fetch`, `tabs.create` or `window.open` (https only, host must be an SAP CPI host). Never store credentials.
6. **No `console.log`.** `console.warn`/`console.error` are allowed; use `devLog` for diagnostics.
7. **Dummy data only** in docs, tests and examples: `Acme Corp`, `https://tenant.example.integrationsuite.com`.
   Real customer names or tenant hostnames must never appear in the repository.
8. **Tests** (Vitest) for pure modules: validators, URL builders, formatters, exporters, message handlers.
   A bug fix in such a module comes with a regression test.

## Workflow

- Branch from `main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`. `main` is protected; everything goes through a PR
  and is squash-merged (PR title = Conventional Commit message).
- **Every commit updates `CHANGELOG.md`** under `## [Unreleased]` (Keep a Changelog sections: Added / Changed /
  Fixed / Removed / Security). One heading per section, no duplicates.
- Conventional Commits: `feat(scope): …`, `fix(scope): …`, `chore: …`, `docs: …`, `ci: …`, `test: …`.
  Breaking change: `feat!: …`. Keep messages short; no AI-generated essays.
- Releases are tag-driven: pushing `vX.Y.Z` bumps `package.json`/`CHANGELOG.md` and publishes a GitHub Release.
  Do not bump the version manually.
- Definition of done: `npm run verify` green, CHANGELOG updated, both locales updated, PR description matches the diff.
