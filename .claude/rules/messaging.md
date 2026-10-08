---
paths:
  - "entrypoints/background.ts"
  - "entrypoints/content.ts"
  - "features/shared/messages.ts"
  - "features/shared/fetch-client.ts"
  - "features/shared/api-client.ts"
  - "features/**/*-api*.ts"
  - "features/**/*ApiClient.ts"
---

# Messaging and SAP API rules

## Content ↔ background protocol

- All cross-origin SAP calls go through `entrypoints/background.ts`; content scripts call `sendTypedMessage()`.
- Adding a message type = three edits in one commit: `ExtensionMessage` union + `MessageResponseMap` in
  `features/shared/messages.ts`, and the `case` in the background `switch`. Keep `MSG_*` constants `as const`.
- Responses always use the `ApiResponse<T>` envelope (`success`, `data`, `error`). Never throw across the message
  boundary; convert to `{ success: false, error }`.

## Trust boundary (background is the boundary)

- Treat every field of an incoming message as untrusted, even though only our own content script can send it.
  Validate `sender.id === browser.runtime.id` and derive or verify `baseUrl` against the SAP CPI host pattern
  before using it with `fetch(..., { credentials: 'include' })`.
- URLs passed to `browser.tabs.create`, `window.open` or `fetch` must be `https:` and match an SAP CPI host.
  Reuse `validateCpiUrl` (`features/settings/validators.ts`); never trust `new URL()` success alone.
- Every `fetch` has a timeout (`AbortController`); the default is in `fetch-client.ts`. Non-2xx → `Error` with status.

## SAP CPI specifics

- Integration Suite UI hosts look like `<sub>.integrationsuite(-trial)?.cfapps.<region>.hana.ondemand.com`;
  Neo/Classic tenants need the `/itspaces` prefix (`getCpiBaseUrl`). Do not hard-code tenant hosts anywhere.
- OData (`/api/v1/...`): escape `'` in filter values, use `$format=json`, respect `__next` paging for large sets.
  Deploy/undeploy calls (`DeployIntegrationDesigntimeArtifact`, runtime artifact DELETE) are destructive on the
  tenant: always confirm in the UI first and log the artifact id via `devLog`.
- Responses from SAP can be large (multi-MB payloads). Guard rendering with the size limits in
  `features/shared/formatters.ts`; never pretty-print or syntax-highlight unbounded content.
- Never log full response bodies in production builds; `devLog.response` is dev-only and writes to `.dev-logs/`.
