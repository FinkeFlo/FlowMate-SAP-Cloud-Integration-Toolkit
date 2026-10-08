---
name: review
description: Structured review of a change from three fixed perspectives (software architect, SAP CPI expert, extension developer) with a severity-ranked report. Use when the user asks for a review, before opening a PR, or after a feature is implemented. Accepts a PR number, a branch, a path, or nothing (= uncommitted changes).
argument-hint: [pr-number | branch | path]
---

# Review (architect · CPI expert · developer)

## Scope

- `$ARGUMENTS` is a number → `gh pr diff <n>` and `gh pr view <n>`.
- It is a branch → `git diff main...<branch>`.
- It is a path → review those files.
- Empty → `git diff` + `git diff --cached` + untracked files from `git status --short`.

Read every changed file completely, plus the neighbours a finding depends on (message protocol, locales,
CHANGELOG, DESIGN.md). Do not edit files; report findings. The main session applies fixes.

## Perspective 1 — Software architect

- Feature isolation: logic in `features/<name>/`, public API through `index.ts`, no cross-feature imports except
  via `@/features/shared`.
- Components render; business logic is in hooks or plain modules. Files > 300 lines or hooks with > 5 `useState`
  are a smell: name the split.
- Message protocol: new message types update union, response map and background handler together.
- Docs drift: AGENTS.md / features README / CHANGELOG still describe reality after this change?
- Dependencies: nothing new in `dependencies` that is build-time only; no duplicated utility.

## Perspective 2 — SAP CPI expert

- Correct SAP endpoints and semantics (OData v2 escaping, `$format=json`, paging, `DeployIntegrationDesigntimeArtifact`
  version `active`, runtime vs design-time artifact ids, Neo `/itspaces` prefix vs Integration Suite).
- Trust boundary: `baseUrl`, tenant URLs and anything from storage/DOM validated before `fetch`/`tabs.create`.
- Destructive tenant actions (deploy, undeploy, log-level) are confirmed in the UI and visible in `devLog`.
- Large payload handling (size guards) and SPA navigation (no `load` listeners).
- No real tenant hostnames or customer names in code, tests, docs, screenshots.

## Perspective 3 — Extension developer

- TypeScript: no `any`, `noUncheckedIndexedAccess` respected, narrow non-null assertions only at guarded sites.
- Preact hooks: no ref writes during render, async init inside the effect, cleanup on unmount, stable callbacks.
- Styling rules (`.claude/rules/styling.md`): daisyUI first, one theme, Shadow DOM tooltip caveat, no new CSS.
- i18n: every user-visible string via `t()`, keys in both locales.
- Tests: pure modules changed → tests changed; bug fix → regression test.
- `npm run verify` result (run it, include the table from the `verify` skill).

## Output

```
## Review: <scope>
Verify: <table or "not run because …">

### 🔴 Must fix (correctness, security, broken convention with user impact)
- file:line — finding — why — proposed fix

### 🟡 Should fix (consistency, maintainability, missing tests)
### 🟢 Suggestions
### ✅ Confirmed good (2–4 lines, what was checked and found fine)
```

Every finding names file and line. No finding without a concrete proposed fix. If a perspective has nothing
to report, say so in one line instead of inventing findings.
