---
paths:
  - "**/*.test.ts"
  - "vitest.config.ts"
---

# Testing rules

- Framework: Vitest, `node` environment, config in `vitest.config.ts`. Run with `npm run test`
  (`npm run test:watch` while developing). Import `describe/it/expect/vi` explicitly from `vitest`.
- Test files sit next to the module: `features/settings/validators.ts` → `features/settings/validators.test.ts`.
  They are type-checked by `npm run compile`; fixtures must satisfy the real types.
- What gets tests: pure modules at trust boundaries and with real logic — validators, URL builders, formatters,
  CSV/export, message handlers, parsers. Preact components are not unit-tested (manual check via
  `npm run playwright:session`).
- Mock the browser-extension edge, not the logic: `vi.mock('@/features/shared/i18n', ...)` returns keys;
  `vi.mock('@/features/shared/toast', ...)` is a no-op. Never mock the module under test.
- Every bug fix in a tested module adds a regression test that fails before the fix.
- Test data uses dummy tenants only (`https://acme-dev.integrationsuite.cfapps.eu10.hana.ondemand.com`).
