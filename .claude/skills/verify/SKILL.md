---
name: verify
description: Run the full local verification (type-check, lint, DESIGN.md lint, unit tests, production build) and report a compact result table. Use before claiming any change is done, before creating a PR, and when the user asks to "verify", "check everything" or "is it green".
allowed-tools: Bash(npm run *), Bash(npx vitest *), Bash(git status *), Bash(git diff *)
---

# Verify

Run every check CI runs, in this order, and stop at the first failure only if later checks cannot run:

```sh
npm run compile       # TypeScript
npm run lint          # ESLint
npm run lint:design   # DESIGN.md tokens
npm run test          # Vitest
npm run build         # Chrome production build
```

Then check the repository hygiene that CI cannot see:

- `git status --short`: no stray files (`.output/`, `.dev-logs/`, `*.log`, `.claude/denylist.txt`).
- `CHANGELOG.md` has an entry under `## [Unreleased]` for the current change and only one heading per section.
- `public/_locales/en` and `de` have identical key sets when any locale changed.
- `grep -rnE '(title|aria-label|placeholder|data-tip)="[A-Za-z]' features/` shows no new hard-coded UI strings.

## Report

Print one table, then a verdict. Quote the failing output verbatim for anything red; never summarise a failure.

| Check | Result |
|---|---|
| compile | ✅ / ❌ |
| lint | ✅ / ❌ (n warnings) |
| lint:design | ✅ / ❌ |
| test | ✅ n passed / ❌ |
| build | ✅ / ❌ |
| hygiene | ✅ / ❌ (what) |

Verdict: "Green, ready for PR" or "Red: <first thing to fix>". Do not say "done" with anything red.
