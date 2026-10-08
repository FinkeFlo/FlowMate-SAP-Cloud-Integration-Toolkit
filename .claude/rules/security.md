# Security and data-privacy rules

These apply to every file and every message in this project.

- **No real customer or tenant data in the repository.** No customer names, no project code names, no tenant
  hostnames, no message GUIDs from real systems. Use `Acme Corp`, `Contoso`,
  `https://tenant.example.integrationsuite.com`. The local `.claude/denylist.txt` (gitignored) lists the terms the
  hooks scan for; keep it up to date and never commit it.
- **Never read `.dev-logs/`** into the agent context; it contains real API responses from dev sessions.
- **No credentials anywhere:** the extension authenticates with the user's existing SAP session cookies only.
  `storage.local` may hold tenant names and URLs, nothing else.
- **Validate at trust boundaries** (background message handler, storage read, DOM-derived values, `tabs.create`,
  `window.open`): `https:` only, host must match the SAP CPI pattern, fail closed (reject, do not pass through).
- **Permissions stay minimal:** `storage`, `tabs`, host permission for SAP CPI only. Never add
  `externally_connectable`, `<all_urls>` or `http:` matches. Adding a permission is a design decision, not a fix.
- **No dynamic code:** no `eval`, `new Function`, `innerHTML`/`dangerouslySetInnerHTML`. Preact escapes text nodes.
- **CSV/exports:** neutralise leading `= + - @` in cells (formula injection) when exporting user-controlled text.
- **Destructive tenant actions** (deploy, undeploy, log-level change) require an explicit confirmation step in the UI.
- Security findings are tracked as GitHub issues with the `security` label, not in ad-hoc documents.
