# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Changed
- Adopted daisyUI + Tailwind CSS v4 as the single mandatory styling framework across the entire extension (content-script overlay, Options page, Popup), replacing all hand-rolled component CSS.
- Introduced one shared light theme (`flowmate`) — no dark theme, matching SAP Cloud Integration's own UI.
- Migrated the content-script overlay to render inside an isolated Shadow Root (`cssInjectionMode: 'ui'`) instead of injecting CSS globally into the SAP host page.
- Fixed the floating design-time toolbar losing its FlowMate branding when expanded.
- Migrated the artifact Refresh/Undeploy buttons to daisyUI (`btn-primary btn-soft` / `btn-error btn-soft`).
- Migrated the Settings/Options page (customer & tenant management, add forms, confirm dialog) to daisyUI components (`card`, `input input-bordered`, `checkbox`, `modal`).
- Migrated the Popup and tenant quick-links panel (incl. SortableJS drag-and-drop) to daisyUI, softening quick-link buttons and replacing the broken "More links" table grid with clean pill chips.
- Migrated remaining components (Message Log, Message Detail popup, Inline Trace overlay/popup, Export button, Date Range dialog, Toast notifications, Log Throttle panel, Trace toggle button) to daisyUI, removing all their hand-rolled CSS files.

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
