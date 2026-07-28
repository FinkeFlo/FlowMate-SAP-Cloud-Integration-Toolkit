# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Fixed
- The floating toolbar's drag-to-move behavior was attached to its entire container instead of just the header handle, so pointerdown/move events bubbling up from nested buttons (message log filters, refresh, auto-refresh, etc.) could hijack the toolbar's drag state and swallow the click. Dragging is now scoped to the header handle only — nested panel buttons work reliably regardless of small mouse movement during a click.
- Message log status filter dots (success/error/processing) and per-message row status dots relied on color (green/red/orange/gray) alone, which is hard to distinguish for red/green color-blind users. Both now show a distinct icon (check/cross/clock/ban) inside the dot so the meaning no longer depends on hue perception.

### Changed
- Upgraded `wxt` 0.20.27 → 0.21.2 (and its `vite`/`rolldown` toolchain), which removes the unused `web-ext-run` dependency and with it four vulnerable transitive packages (`shell-quote` critical+high, `adm-zip` high, `tmp` high, `uuid` medium). Added `@types/node` as an explicit dev dependency (needed by `wxt.config.ts`'s `node:fs`/`node:path` imports, previously resolved transitively) and dropped the now-unsupported `esbuild.charset` Vite option (Vite 8 no longer exposes it; ASCII-escaping for content scripts is still handled by the existing `asciiContentScriptPlugin`).
- Enabled by wxt 0.21's generated `tsconfig`: `noUncheckedIndexedAccess`. Fixed the ~20 newly-surfaced strict-null findings across `InlineTraceOverlay.ts`, `TraceStepPopup.tsx`, `MessageDetailPopup.tsx`, `MessageLogPanel.tsx`, `ExportButton.tsx`, `ArtifactStatus.ts`, `api-client.ts`, and `trace-api.ts` — all were array-index accesses already guarded by a preceding length/existence check, so fixed with narrow non-null assertions at the guarded call sites.

### Added
- `CodeViewer` size guards + download: payloads over ~2 MB skip CodeMirror rendering entirely (avoids freezing the UI on huge message bodies) and show a "Download" action instead; the pretty-print formatter is skipped above ~500 KB for the same reason. A "Download" button is now always available in `CodeViewer` (Body tab, Persist tab) to save the currently displayed payload as a `.json`/`.xml`/`.txt` file.
- Optional JSON/XML "Format" toggle in `CodeViewer` (`features/shared/CodeViewer.tsx`, `features/shared/formatters.ts`): reformats a compact/minified payload into an indented, readable view on demand, off by default so the raw payload is shown unchanged. Used by both the inline-trace Body tab and the Message Detail Persist tab (now rendered via `CodeViewer` for syntax highlighting too).
- `DockPanel` component (`features/shared/DockPanel.tsx`): a bottom-docked, user-resizable panel replacing centered modals for tabbed, data-heavy detail views.
- `DESIGN.md` documenting the flowmate daisyUI theme (colors, typography, shapes) for humans and AI agents, following the DESIGN.md format.
- CI workflow (`.github/workflows/ci.yml`): typecheck, ESLint, `DESIGN.md` lint, and chrome/firefox build checks on every PR and push to `main`, gated behind a single aggregating `CI` job for stable branch-protection status checks.
- Tag-driven release workflow (`.github/workflows/release.yml`): pushing a `v*` tag bumps `package.json`/`CHANGELOG.md`, builds chrome/firefox zips, and publishes a GitHub Release with artifacts and changelog notes.
- `.github/dependabot.yml` for weekly npm and GitHub Actions dependency updates.
- ESLint 9 flat config (`eslint.config.mjs`) with TypeScript, Preact hooks, and WXT auto-import globals support; added `lint` and `lint:design` npm scripts.
- CodeQL security analysis workflow (`.github/workflows/codeql.yml`).

### Fixed
- Replaced substring-based `hana.ondemand.com` hostname checks with anchored `endsWith`/hostname-parsed checks in `validators.ts` and `useActiveTenant.ts` — fixes CodeQL "Incomplete URL substring sanitization" alerts (bypassable via crafted hostnames like `evil-hana.ondemand.com.attacker.com`).
- Inline-trace step highlighting (`InlineTraceOverlay.ts`) set `fill`/`stroke` on BPMN SVG shapes using `var(--color-success)` etc. — these daisyUI CSS variables only exist inside our Shadow Root, so on the SAP host page (outside the Shadow Root) they were invalid, causing the SVG `fill` to fall back to its initial value and paint highlighted steps solid black. Now uses hardcoded hex values matching the `flowmate` theme.
- Message log row action buttons (Info/Open in Monitoring/Inline Trace/Open Trace) were hidden until hover, causing them to appear/disappear and shift focus when moving the mouse; now always visible.
- `CodeViewer` used CodeMirror's bundled dark `oneDark` theme, which looked out of place against the rest of the (light-only) extension UI; replaced with a light theme matching the `flowmate` palette, slightly larger font size, and soft line-wrapping for long lines (copy/paste still yields the original, unwrapped content).

### Changed
- `TraceStepPopup` and `MessageDetailPopup` now use `DockPanel` instead of a centered `modal modal-open` — fixes the popup visually "jumping"/re-centering when switching tabs with different content heights (e.g. Properties → Body). Tabs are now pinned and no longer scroll out of view with long content.

### Fixed
- Darkened `success` (#16a34a → #15803d) and `warning` (#d97706 → #b45309) theme colors to meet WCAG AA contrast (4.5:1) for white button/badge text — found via `design.md lint`.
### Fixed
- Migrated a missed component, `ProgressBar` (message-usage export), to daisyUI's native `progress` element — was still using leftover dark-theme inline styles.
### Changed
- Adopted daisyUI + Tailwind CSS v4 as the single mandatory styling framework across the entire extension (content-script overlay, Options page, Popup), replacing all hand-rolled component CSS.
- Introduced one shared light theme (`flowmate`) — no dark theme, matching SAP Cloud Integration's own UI.
- Migrated the content-script overlay to render inside an isolated Shadow Root (`cssInjectionMode: 'ui'`) instead of injecting CSS globally into the SAP host page.
- Fixed the floating design-time toolbar losing its FlowMate branding when expanded.
- Migrated the artifact Refresh/Undeploy buttons to daisyUI (`btn-primary btn-soft` / `btn-error btn-soft`).
- Migrated the Settings/Options page (customer & tenant management, add forms, confirm dialog) to daisyUI components (`card`, `input input-bordered`, `checkbox`, `modal`).
- Migrated the Popup and tenant quick-links panel (incl. SortableJS drag-and-drop) to daisyUI, softening quick-link buttons and replacing the broken "More links" table grid with clean pill chips.
- Migrated remaining components (Message Log, Message Detail popup, Inline Trace overlay/popup, Export button, Date Range dialog, Toast notifications, Log Throttle panel, Trace toggle button) to daisyUI, removing all their hand-rolled CSS files.

### Docs
- Documented daisyUI + Tailwind CSS v4 as the mandatory UI framework in `CONTRIBUTING.md`, including the Shadow-DOM `data-theme` caveat for content-script theming.

## [0.1.0] - 2026-07-28
### Added
- Extracted hardcoded UI strings to `i18n` localization dictionaries (English & German).
- Added `CONTRIBUTING.md` establishing rules for English-only code, Conventional Commits, and data privacy.
- Enforced concise AI/developer commit messages and mandatory CHANGELOG updates.
- Comprehensive public README with installation and usage instructions.
- Public documentation files (`docs/`).
- Main SAP CPI integration modules (`features/`): Inline-Trace, Message Log, Settings, and more.
- Browser extension entrypoints (`entrypoints/`): Background workers, content scripts, popup, and options pages.
- Core configuration files (`config/`) for SAP CPI environments.
- Utility scripts (`scripts/`) for development and testing.
- Initial setup of the WXT framework.
- Tailwind CSS and DaisyUI configuration.
- Basic project structure and core configurations.
- Assets and public resources.
