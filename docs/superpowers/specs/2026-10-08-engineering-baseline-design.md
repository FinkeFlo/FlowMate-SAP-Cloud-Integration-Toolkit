# Engineering baseline: conventions, enforcement and AI-agent setup

**Date:** 2026-10-08 · **Status:** approved (chat review, four decisions recorded below)

## Goal

Every change to FlowMate — by a human, by Claude Code, by Copilot — follows the same pattern and is checked by the
same rules, so the codebase does not drift. The baseline is reviewed from three perspectives: software architect,
SAP CPI expert, extension developer.

## Findings that motivated this (state before the change)

- Conventions existed only as prose (`CONTRIBUTING.md`, `.github/copilot-instructions.md`); nothing enforced the
  changelog rule, i18n rule or dummy-data rule. No `CLAUDE.md`, no `.claude/`.
- The `main` ruleset (`main-protection`, GitHub Rulesets; the legacy branch-protection API reports 404) did not
  require unit tests (none existed) and allowed merge/rebase merges although the documented strategy is squash.
- No test framework; pure boundary modules (validators, URL builder, formatters, CSV export) were untested.
- Documentation drift: stale `features/README.md`, Node 20 vs 24, manual version bump vs tag-driven release,
  DESIGN.md prose colours ≠ CSS, German audit doc in an English-only repo.
- Open security findings from `docs/audit-2026-06.md` (S1–S3, S6) had no tracking.
- Working tree mixed a dependency bump with a feature and violated the i18n rule (`title="Drag to resize"`).

## Design

### 1. Instruction layer (prose, versioned)

- `AGENTS.md` (root): tool-neutral source of truth — commands, repository map, architecture essentials,
  conventions, workflow, definition of done. Copilot reads it natively; `CLAUDE.md` imports it with `@AGENTS.md`.
- `CLAUDE.md`: thin; lists Claude-specific skills, agents and hooks.
- `.claude/rules/`: `styling.md`, `messaging.md`, `i18n.md`, `testing.md` (path-scoped via `paths:` frontmatter),
  `security.md`, `git-workflow.md` (always loaded).
- `.github/copilot-instructions.md`: points to `AGENTS.md`; repeats only the review-relevant rules (Copilot code
  review reads only this file).

### 2. Enforcement layer (hooks, lint, CI, GitHub)

| Rule | Enforced by |
|---|---|
| ESLint clean after every edit | PostToolUse `Edit\|Write` → `.claude/hooks/eslint-fix.sh` |
| compile + lint + test green before a turn ends with changed sources | Stop → `verify-on-stop.sh` (also covers Bash edits) |
| en/de locale key parity | `verify-on-stop.sh` when locales changed |
| CHANGELOG.md part of every commit | PreToolUse `Bash` → `require-changelog.sh` |
| No real customer/tenant names | PostToolUse + Stop denylist scan (`.claude/denylist.txt`, gitignored) |
| No `console.log` | ESLint `no-console` (allow warn/error; dev-logger and background exempt) |
| Tests run in CI | new `test` job in `ci.yml`, part of the aggregating `CI` check |
| PR hygiene | `.github/pull_request_template.md` checklist |
| No direct pushes / red merges to `main` | GitHub ruleset: PR required, status check `CI`, no force-push/deletion |

### 3. Workflow layer (skills, agents)

- Skills: `verify`, `review` (architect · CPI · developer, fixed output format), `new-feature` (scaffold shape),
  `release` (user-invoked only).
- Agents: `flowmate-reviewer` (conventions + correctness, read-only), `ux-reviewer` (daisyUI, a11y, i18n).

### 4. Tests

Vitest (`vitest.config.ts`, node environment, `@/` alias). Tests next to pure modules:
`validators`, `tenant-url-builder`, `formatters`, `csv-exporter`. Components are not unit-tested.

## Decisions (approved 2026-10-08)

1. Vitest introduced for boundary modules, with CI job. ✅
2. GitHub ruleset for `main`: the existing `main-protection` ruleset (PR required, 0 reviewers, required checks,
   release-bot bypass) was extended with the `Unit tests` check and restricted to squash merges. ✅
3. Feature branch `feat/deploy-multiple-iflows` rebased onto `main`, duplicate commits dropped, working tree split
   into `chore(deps)` and `feat(ui)` commits, force-pushed with lease. ✅
4. Security findings S1–S3 (+S6) are fixed in a **separate PR**; tracked as GitHub issues; the audit document is
   retired in favour of issues. ✅

## Out of scope (tracked as issues)

Security fixes S1–S3/S6, replacing `window.confirm` with `ConfirmDialog`, remaining hard-coded strings in
`log-throttle`/`message-log`, tightening `host_permissions` (needs verification against real tenant host schemes).
