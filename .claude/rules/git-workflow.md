# Git workflow

## Branches

| Branch | Purpose | Protection |
|---|---|---|
| `main` | Only long-lived branch | Ruleset `main-protection`: PR required, required checks (`CI`, `Unit tests`, …), squash only, no force-push, no deletion; release bot may bypass |
| `feat/*`, `fix/*`, `chore/*`, `docs/*`, `ci/*` | Short-lived work branches, always branched from `main` | none |
| Tag `v*` | Release marker, triggers `release.yml` | immutable |

## Day-to-day

1. `git checkout main && git pull && git checkout -b feat/<topic>` (worktrees also branch from `main`).
2. Implement. Each commit: Conventional Commit message **and** an entry under `## [Unreleased]` in `CHANGELOG.md`
   (a hook blocks commits without it). Keep one `### Added` / `### Changed` / `### Fixed` heading per section.
3. `npm run verify` must be green before a PR.
4. `gh pr create` with a Conventional-Commit title; the PR template checklist must be complete.
5. Squash-merge via GitHub (`gh pr merge --squash`). The PR title becomes the commit on `main`.

## Never

- Push directly to `main`, or merge with red checks.
- Rewrite history of a pushed branch, force-push, or delete branches unless the user explicitly asks for that
  specific operation in that session.
- Bump `package.json` version by hand; releases are tag-driven (`git tag vX.Y.Z && git push origin vX.Y.Z`).
- Commit `.claude/settings.local.json`, `.claude/denylist.txt`, `.dev-logs/`, `.output/`.

## Dependabot

Dependabot opens grouped weekly PRs. Prefer merging those over manual bumps; if a manual bump is unavoidable,
keep it in its own `chore(deps)` commit, separate from feature work, and close the overlapping Dependabot PR.
