# FlowMate – Feature Structure

Every product capability lives in its own directory under `features/`. `index.ts` is the public API of a feature;
other features import only through `@/features/<name>` or `@/features/shared`.

```
features/
├── ContentApp.tsx       # Root of the SAP-page overlay: mounts features by page type
├── design-tools/        # Floating, draggable/resizable toolbar hosting the overlay panels
├── inline-trace/        # Inline trace visualisation on the iFlow canvas + step detail panel
├── log-throttle/        # "Top loggers" panel: message volume per iFlow, log-level changes
├── message-log/         # Message processing log panel + message detail panel
├── message-usage/       # Message usage CSV export (date range dialog, exporter)
├── package-design/      # Package artifacts page: status, deploy, undeploy, refresh
├── popup/               # Extension popup
├── settings/            # Options page: customers, tenants, validators, storage
├── tenant-links/        # Quick links per tenant (sortable), tenant URL builder
├── trace-mode/          # Trace on/off toggle for an iFlow
└── shared/              # Cross-feature code: messages.ts (typed protocol), api-client.ts, fetch-client.ts,
                         # i18n.ts, navigation.ts, usePageType.ts, toast.ts, dev-logger.ts, formatters.ts,
                         # CodeViewer.tsx, DockPanel.tsx, ToastContainer.tsx, constants.ts
```

## Rules of the directory

1. **Isolation:** a feature owns its components, hooks, API module and types. Shared code goes to `shared/`.
2. **Public API:** export through `index.ts` only.
3. **Rendering vs logic:** components render; SAP calls and business rules live in `*-api.ts` / hooks so they can
   be unit-tested with Vitest (`*.test.ts` next to the module).
4. **i18n:** every string via `t()`; keys prefixed with the feature name, present in `en` and `de`.
5. **Styling:** daisyUI + Tailwind only; see `DESIGN.md` and `.claude/rules/styling.md`.

## Adding a feature

Use the `/new-feature` skill (Claude Code) or follow the same steps by hand: create `features/<name>/` with
`index.ts`, wire it into `ContentApp.tsx` / `PopupApp.tsx` / `SettingsApp.tsx`, add locale keys, add tests for
pure modules, add a `CHANGELOG.md` entry.
