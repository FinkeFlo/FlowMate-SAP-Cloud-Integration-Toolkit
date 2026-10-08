# FlowMate – Claude Code

@AGENTS.md

## Claude-specific setup

- **Rules** in `.claude/rules/` load automatically (some only when matching files are read). They refine, never
  contradict, `AGENTS.md`.
- **Skills:** `/verify` (full local check), `/review` (architect + CPI expert + developer review of a diff),
  `/new-feature` (scaffold a feature directory with i18n keys), `/release` (tag-driven release, user-invoked only).
- **Agents:** `flowmate-reviewer` (convention and correctness review, read-only) and `ux-reviewer`
  (daisyUI, accessibility, i18n, optional Playwright screenshots).
- **Hooks enforce** what prose cannot: ESLint `--fix` after every edit, `compile` + `lint` + `test` before the turn
  ends when source files changed, `CHANGELOG.md` must be part of every commit, and a denylist scan for real
  customer or tenant names (`.claude/denylist.txt`, local only, see `.claude/denylist.example.txt`).
- Library and framework documentation (WXT, Preact, daisyUI, Vitest, …) comes from Context7, not from memory.
- Before saying something is done: run `/verify` and report the result. Evidence before assertions.
