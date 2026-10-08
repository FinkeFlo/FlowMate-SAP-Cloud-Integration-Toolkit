# FlowMate – Copilot Instructions

The tool-neutral project instructions live in [`AGENTS.md`](../AGENTS.md) at the repository root (commands,
repository map, architecture essentials, conventions, workflow). Read that file first; this file only adds what
Copilot needs on top.

## Copilot code review

Copilot code review reads only this file, so the review-relevant rules are repeated here:

- Every PR updates `CHANGELOG.md` under `## [Unreleased]` and keeps one heading per section.
- No hard-coded user-facing strings in TSX (`title`, `aria-label`, `placeholder`, toasts): use `t('key')` and add
  the key to both `public/_locales/en` and `de`.
- daisyUI component classes first, Tailwind utilities for layout; no new CSS files; one theme (`flowmate`).
- URLs from storage, DOM or messages are validated (`https:`, SAP CPI host) before `fetch`/`tabs.create`/`window.open`.
- New message types update `ExtensionMessage`, `MessageResponseMap` and the background `switch` together.
- No real customer names or tenant hostnames anywhere; dummy data only (`Acme Corp`,
  `https://tenant.example.integrationsuite.com`).
- Pure modules (validators, URL builders, formatters, exporters) come with Vitest tests next to the file.
- `console.log` is forbidden (`no-console`), `console.warn`/`console.error` are allowed.
