# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- `npm run lint:i18n` (`scripts/check-i18n.mjs`): fails on en/de key mismatches, keys used in code that are missing from the locales, and placeholder/message mismatches; warns on unused keys. Part of `npm run verify`, the CI lint job and the Claude stop hook.
- **Configurable message-log auto-refresh interval** (closes #14): the Options page has a new "Preferences" card with a 5/10/15/30/60 s selector (default now 10 s, previously a fixed 30 s). Stored in `browser.storage.sync` via the new `features/shared/preferences.ts`; the message log panel picks up changes live and shows the current interval in the "Auto" button tooltip.
- **Engineering baseline for humans and AI agents**: `AGENTS.md` (tool-neutral conventions, imported by `CLAUDE.md`), path-scoped rules in `.claude/rules/` (styling, messaging/SAP API, i18n, security, git workflow, testing), skills `/verify`, `/review`, `/new-feature`, `/release`, and read-only reviewer agents (`flowmate-reviewer`, `ux-reviewer`). Design spec: `docs/superpowers/specs/2026-10-08-engineering-baseline-design.md`.
- **Enforcement hooks** (`.claude/hooks/`): ESLint `--fix` after every edit, type-check + lint + tests + en/de locale-key parity before a turn ends with changed sources, `CHANGELOG.md` required in every commit, and a local denylist scan for real customer/tenant names (`.claude/denylist.example.txt`).
- **Vitest unit tests** for the pure boundary modules `validators`, `tenant-url-builder`, `formatters` and `csv-exporter` (28 tests); `npm run test`, `npm run test:watch`, and `npm run verify` (compile + lint + lint:design + test + build). New `Unit tests` job in CI, part of the aggregating `CI` check.
- `.github/pull_request_template.md` with the definition-of-done checklist; `.nvmrc` (Node 24) and `engines` in `package.json`.
- **Resizable toolbar width**: The floating `DesignTimeToolbar` now has a right-edge drag handle (ew-resize cursor) so users can widen or narrow the overlay. The chosen width is persisted in `localStorage` (`flowmate-design-toolbar-width`). Default 420 px, min 280 px, max 720 px.
- **iFlow name tooltip in Top Logger panel**: Truncated iFlow names in `LogThrottlePanel` now show a daisyUI `tooltip` on hover with the full symbolic name — works correctly inside the Shadow DOM where native `title` attributes are unreliable.
- **Deploy multiple iFlows from package overview**: New "Deploy" button in the FlowMate toolbar on the Package Artifacts page. Selecting one or more iFlow rows and clicking Deploy triggers `DeployIntegrationDesigntimeArtifact` for each selected artifact (version `active`). Works for both deployed (redeploy) and undeployed artifacts. Design-time artifact IDs are fetched from the OData API (`IntegrationPackages/.../IntegrationDesigntimeArtifacts`) on page load alongside the existing runtime status fetch.
- **`PackageArtifactsPanel` component**: Replaces the three loose buttons in `ContentApp.tsx` with a structured panel. The panel shows a "Status" section (Refresh button) and a "Deployment" section (Deploy + Undeploy side by side as a flex row), separated by a labeled divider.
- `CodeViewer` size guards + download: payloads over ~2 MB skip CodeMirror rendering entirely (avoids freezing the UI on huge message bodies) and show a "Download" action instead; the pretty-print formatter is skipped above ~500 KB for the same reason. A "Download" button is now always available in `CodeViewer` (Body tab, Persist tab) to save the currently displayed payload as a `.json`/`.xml`/`.txt` file.
- Optional JSON/XML "Format" toggle in `CodeViewer` (`features/shared/CodeViewer.tsx`, `features/shared/formatters.ts`): reformats a compact/minified payload into an indented, readable view on demand, off by default so the raw payload is shown unchanged. Used by both the inline-trace Body tab and the Message Detail Persist tab (now rendered via `CodeViewer` for syntax highlighting too).
- `DockPanel` component (`features/shared/DockPanel.tsx`): a bottom-docked, user-resizable panel replacing centered modals for tabbed, data-heavy detail views.
- `DESIGN.md` documenting the flowmate daisyUI theme (colors, typography, shapes) for humans and AI agents, following the DESIGN.md format.
- CI workflow (`.github/workflows/ci.yml`): typecheck, ESLint, `DESIGN.md` lint, and chrome/firefox build checks on every PR and push to `main`, gated behind a single aggregating `CI` job for stable branch-protection status checks.
- Tag-driven release workflow (`.github/workflows/release.yml`): pushing a `v*` tag bumps `package.json`/`CHANGELOG.md`, builds chrome/firefox zips, and publishes a GitHub Release with artifacts and changelog notes.
- `.github/dependabot.yml` for weekly npm and GitHub Actions dependency updates.
- ESLint 9 flat config (`eslint.config.mjs`) with TypeScript, Preact hooks, and WXT auto-import globals support; added `lint` and `lint:design` npm scripts.
- CodeQL security analysis workflow (`.github/workflows/codeql.yml`).

### Changed
- **New visual identity, copy**: German texts always say "du" (no more "Sie"), English labels use sentence case ("Add customer", "Refresh status"), and status words are no longer in capitals ("Not deployed", "Trace on"). Loading texts use the ellipsis character, quotes are typographic (“…”, „…“), durations have a space before the unit ("850 ms", "1.2 s"), and dates and times in the message log and detail panels are ISO and 24 h (new `features/shared/time-format.ts`, tested). Empty message-log states say when they fill. The last hard-coded labels are translated: message log filter tooltips, message detail sections, the empty payload text and the options page title. The unused English fallbacks after `t()` are removed. `DESIGN.md` gains a Writing section.
- **New visual identity, components**:
  - **Toolbar**: the floating toolbar has an ink handle with the logo and minimizes to a compact capsule. Trace is a soft toggle with `aria-pressed`. Messages is a quiet row with a message count.
  - **Message log**: shows status discs with icons instead of colored left borders and glows. Filter chips have an ink "on" fill, auto-refresh pulses a spark dot, day separators are overline labels, and empty states use the logo route.
  - **Toasts**: ink cards with a status disc and Lucide icons instead of ✔ ✖ ⚠ ℹ, with `role="status"` or `role="alert"`.
  - **Detail panels**: dock panels have rounded tops and segmented tabs (`tabs-box`). Message and trace details show a status badge, mono keys and overline sections. Destructive confirmations get a warning icon.
  - **Popup and options page**: the popup shows the logo and capsule quick links with icons, with "More links" as chips. The options page uses flat cards with tenant rows and icon actions.
  - **Code viewer**: uses JetBrains Mono without ligatures and theme syntax colors (`--color-code-*`).
  - **Theme and status colors**: `text-muted` replaces faded text (`base-content/40–60`, which failed contrast). Status colors come from the new `features/shared/status-tone.ts` (tested) instead of `MPL_STATUS_COLORS`. The theme gains `shadow-float`, `shadow-dock` and `shadow-modal`. Input, select and checkbox outlines now reach 3:1.
  - **Panels**: in Top loggers, "above threshold" is a warning, not an error. Deploy on the package page is the one solid action.
- **New visual identity, foundation**: the `flowmate` theme leaves SAP blue for FlowMate's own palette. Petrol `#0a5a65` is for actions, ink `#0e1d20` for chrome and text, and a coral spark `#ff7a59` for things in motion. The status colors pass WCAG AA. Buttons, badges and toggles are capsules; fields are 8 px and boxes 14 px. A new logo (an F drawn as an integration route, with the message as a dot) replaces `public/icon/*.png`, `public/icon.svg`, `assets/logo.svg` and the toolbar mark. Onest and JetBrains Mono are bundled in `public/fonts/` (SIL OFL) and registered on the popup and options pages (`features/shared/fonts.ts`); the overlay keeps SAP's "72". Inline-trace step colors now follow the theme through `features/inline-trace/step-colors.ts`, and the slowest step shows as a warning instead of an error, because slow is not failed. `DESIGN.md` is updated and its lint is now warning-free.
- Dependabot ignores TypeScript major updates until `typescript-eslint` supports TypeScript 7 (the grouped bump failed `npm ci` with ERESOLVE).
- **Confirmations use the FlowMate dialog instead of `window.confirm`** (closes #36): Deploy, Undeploy and the two "Silence" actions in the Top Logger panel open the shared daisyUI `ConfirmDialog` (`features/shared/ConfirmDialog.tsx`, moved from `features/settings/components/`) with a translated title, the list of affected artifacts/iFlows and a colored confirm button. The dialog has `role="dialog"`, `aria-modal`, Escape-to-cancel, a minimal focus trap, initial focus (Cancel for destructive actions) and focus restore on close. It is portaled next to the toolbar so it covers the whole page.
- Dependabot ignores TypeScript major updates until `typescript-eslint` supports TypeScript 7 (the grouped bump failed `npm ci` with ERESOLVE).
- ESLint: `no-console` is now an error (`console.warn`/`console.error` allowed; `dev-logger.ts` and `background.ts` exempt).
- `.github/copilot-instructions.md` now points to `AGENTS.md` and repeats only the review-relevant rules.
- `CONTRIBUTING.md`: Node 24, tag-driven release instructions (no manual version bump), verification and AI-agent section. `features/README.md` regenerated from the actual directory layout. `DESIGN.md` prose colours for success/warning aligned with the theme CSS.
- `.gitignore`: `.claude/settings.local.json` and `.claude/denylist.txt`.
- `LogThrottlePanel` root element no longer has fixed `min-w`/`max-w` — width is now driven by the resizable `DesignTimeToolbar` container.
- Upgraded `preact` 10 → 11, `eslint` 9 → 10, `eslint-plugin-react-hooks` 5 → 7 and `globals` 15 → 17; adapted `ContentApp`, `MessageLogPanel` and `TraceToggleButton` to the stricter react-hooks v7 rules (no ref writes during render, effect-scoped async init). Moved `vite` and `@preact/preset-vite` to `devDependencies` (build-time only).
- Upgraded `wxt` 0.21.2 → 0.21.4; upgraded `@release-it/conventional-changelog` 11 → 12 (required peer dependency for `release-it` v21).
- Added `.github/copilot-instructions.md` with build commands, architecture overview, and key conventions for AI-assisted development sessions.
- Made the extension name/environment visible in the manifest so development builds appear as `FlowMate (DEV)` in the browser extension list, while production builds keep the normal `FlowMate` name.
- Upgraded `wxt` 0.20.27 → 0.21.2 (and its `vite`/`rolldown` toolchain), which removes the unused `web-ext-run` dependency and with it four vulnerable transitive packages (`shell-quote` critical+high, `adm-zip` high, `tmp` high, `uuid` medium). Added `@types/node` as an explicit dev dependency (needed by `wxt.config.ts`'s `node:fs`/`node:path` imports, previously resolved transitively) and dropped the now-unsupported `esbuild.charset` Vite option (Vite 8 no longer exposes it; ASCII-escaping for content scripts is still handled by the existing `asciiContentScriptPlugin`).
- Enabled by wxt 0.21's generated `tsconfig`: `noUncheckedIndexedAccess`. Fixed the ~20 newly-surfaced strict-null findings across `InlineTraceOverlay.ts`, `TraceStepPopup.tsx`, `MessageDetailPopup.tsx`, `MessageLogPanel.tsx`, `ExportButton.tsx`, `ArtifactStatus.ts`, `api-client.ts`, and `trace-api.ts` — all were array-index accesses already guarded by a preceding length/existence check, so fixed with narrow non-null assertions at the guarded call sites.
- `TraceStepPopup` and `MessageDetailPopup` now use `DockPanel` instead of a centered `modal modal-open` — fixes the popup visually "jumping"/re-centering when switching tabs with different content heights (e.g. Properties → Body). Tabs are now pinned and no longer scroll out of view with long content.
- Adopted daisyUI + Tailwind CSS v4 as the single mandatory styling framework across the entire extension (content-script overlay, Options page, Popup), replacing all hand-rolled component CSS.
- Introduced one shared light theme (`flowmate`) — no dark theme, matching SAP Cloud Integration's own UI.
- Migrated the content-script overlay to render inside an isolated Shadow Root (`cssInjectionMode: 'ui'`) instead of injecting CSS globally into the SAP host page.
- Fixed the floating design-time toolbar losing its FlowMate branding when expanded.
- Migrated the artifact Refresh/Undeploy buttons to daisyUI (`btn-primary btn-soft` / `btn-error btn-soft`).
- Migrated the Settings/Options page (customer & tenant management, add forms, confirm dialog) to daisyUI components (`card`, `input input-bordered`, `checkbox`, `modal`).
- Migrated the Popup and tenant quick-links panel (incl. SortableJS drag-and-drop) to daisyUI, softening quick-link buttons and replacing the broken "More links" table grid with clean pill chips.
- Migrated remaining components (Message Log, Message Detail popup, Inline Trace overlay/popup, Export button, Date Range dialog, Toast notifications, Log Throttle panel, Trace toggle button) to daisyUI, removing all their hand-rolled CSS files.

### Fixed
- The German name validation showed an English word ("Customer-Name darf nicht leer sein"). Customer and tenant names now have their own messages ("Kundenname …", "Tenant-Name …").
- Saving preferences could fail with a toast that read "Error saving: : …": the error was appended instead of filling the message's placeholder. Export errors now use placeholders too.
- The message log grouped messages by their UTC day, so a message shortly after midnight showed under the previous day's separator. Separators now use the local day, like the times below them.
- The close buttons of the message and trace detail panels had no accessible name; they now have a translated label, as do the filter chips and the step navigation.
- Secondary buttons such as Cancel, Edit and Add tenant had dark outlines. The theme did not define daisyUI's `--depth`, so button borders fell back to the text color. The theme now sets `--depth: 0` and `--noise: 0`, which gives a flat look.
- The overlay on SAP pages rendered in the browser's default serif font. WXT resets the shadow host with `all: initial`, so no font was inherited and the theme's font stack never applied. The overlay container now sets `font-sans`, so on SAP pages it shows SAP's "72".
- **All remaining hard-coded UI strings are translated** (closes #37): tooltips, `aria-label`s, placeholders, toasts and status badges in the message log, message details, trace step navigation, Top Logger panel, trace toggle, inline trace, package artifacts (deploy/undeploy/status badge), quick links, popup and settings forms now use `t()` with keys in both `en` and `de` (about 75 new keys); keys that were referenced in code but missing from the locales (settings forms, export dialog) are added, and confirm texts are single keys with placeholders instead of concatenated fragments.
- The floating toolbar's drag-to-move behavior was attached to its entire container instead of just the header handle, so pointerdown/move events bubbling up from nested buttons (message log filters, refresh, auto-refresh, etc.) could hijack the toolbar's drag state and swallow the click. Dragging is now scoped to the header handle only — nested panel buttons work reliably regardless of small mouse movement during a click.
- Message log status filter dots (success/error/processing) and per-message row status dots relied on color (green/red/orange/gray) alone, which is hard to distinguish for red/green color-blind users. Both now show a distinct icon (check/cross/clock/ban) inside the dot so the meaning no longer depends on hue perception.
- Replaced substring-based `hana.ondemand.com` hostname checks with anchored `endsWith`/hostname-parsed checks in `validators.ts` and `useActiveTenant.ts` — fixes CodeQL "Incomplete URL substring sanitization" alerts (bypassable via crafted hostnames like `evil-hana.ondemand.com.attacker.com`).
- Inline-trace step highlighting (`InlineTraceOverlay.ts`) set `fill`/`stroke` on BPMN SVG shapes using `var(--color-success)` etc. — these daisyUI CSS variables only exist inside our Shadow Root, so on the SAP host page (outside the Shadow Root) they were invalid, causing the SVG `fill` to fall back to its initial value and paint highlighted steps solid black. Now uses hardcoded hex values matching the `flowmate` theme.
- Message log row action buttons (Info/Open in Monitoring/Inline Trace/Open Trace) were hidden until hover, causing them to appear/disappear and shift focus when moving the mouse; now always visible.
- `CodeViewer` used CodeMirror's bundled dark `oneDark` theme, which looked out of place against the rest of the (light-only) extension UI; replaced with a light theme matching the `flowmate` palette, slightly larger font size, and soft line-wrapping for long lines (copy/paste still yields the original, unwrapped content).
- Darkened `success` (#16a34a → #15803d) and `warning` (#d97706 → #b45309) theme colors to meet WCAG AA contrast (4.5:1) for white button/badge text — found via `design.md lint`.
- Migrated a missed component, `ProgressBar` (message-usage export), to daisyUI's native `progress` element — was still using leftover dark-theme inline styles.

### Removed
- `docs/audit-2026-06.md`: open findings are now GitHub issues (`security` / `tech-debt` labels); fixed findings needed no record.

### Security
- **Host permissions restricted to Integration Suite hosts, `https` only** (closes #45, audit S4). `host_permissions` and the content-script `matches` are now `https://*.hana.ondemand.com/*` instead of `*://*.hana.ondemand.com/*` (no plain `http:`); they are derived from `CPI_UI_DOMAIN_SUFFIXES` in `features/shared/cpi-url.ts`, so manifest and runtime check cannot drift. The runtime host regex now also accepts SAP-operated `integrationsuite-cpiNNN` tenants (previously the extension silently did not mount there); `isIntegrationSuite`, `getCpiBaseUrl`, `validateCpiUrl` and the popup's active-tab detection reuse that single check instead of their own `hana.ondemand.com` substring tests. Verified host table with sources, unverified cases (China `platform.sapcloud.cn`, other sovereign landscapes — added when users report them) and unsupported variants (Neo, standalone `it-cpiNNN`, custom domains): `docs/sap-cpi-hosts.md`.
- **Trust-boundary validation for every URL that reaches `fetch`, `tabs.create` or `window.open`** (closes #32, #33, #34, #35). New pure module `features/shared/cpi-url.ts` with an anchored Integration Suite hostname check (`<sub>.integrationsuite(-trial).cfapps.<region>.hana.ondemand.com`, https only, no credentials). The background worker now ignores messages from other senders, reduces `baseUrl` to a validated origin before metering calls, and refuses to open tenant tabs for non-CPI URLs. The content script mounts only on an exact Integration Suite host instead of any hostname containing `integrationsuite`. Tenant URLs are validated in the storage layer (add/update) and invalid stored tenants are dropped on read. `extractHost`/`extractHostname` return `null` instead of the raw input on parse failure. The message-log "Open in Monitoring" link is only rendered for CPI URLs.

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
