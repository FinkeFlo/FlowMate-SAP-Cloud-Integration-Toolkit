#!/usr/bin/env bash
# PreToolUse (Bash): a `git commit` is only allowed when CHANGELOG.md is part of it.
# Satisfied when CHANGELOG.md is already staged, is modified in the working tree (and the commit uses -a or
# adds it in the same command line), or the command itself mentions CHANGELOG.md.
# Exempt: --amend, release/version bump commits, and commits that explicitly say [skip changelog].
set -uo pipefail
[ -n "${CLAUDE_PROJECT_DIR:-}" ] || exit 0
cmd=$(node -e '
let s = "";
process.stdin.on("data", c => s += c).on("end", () => {
  try { process.stdout.write(String(JSON.parse(s).tool_input?.command ?? "")); } catch {}
});')
case "$cmd" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac
case "$cmd" in
  *--amend*|*"[skip changelog]"*|*"chore(release)"*|*"chore: bump version"*|*"git commit --allow-empty"*) exit 0 ;;
  *CHANGELOG.md*) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR" || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
if git diff --cached --name-only | grep -qx 'CHANGELOG.md'; then exit 0; fi
if git diff --name-only | grep -qx 'CHANGELOG.md'; then
  # modified but not staged: only fine when the command stages everything (-a / -A / add .)
  case "$cmd" in
    *" -a"*|*" -am"*|*"--all"*|*"git add -A"*|*"git add ."*|*"git add --all"*) exit 0 ;;
  esac
fi
echo "Blocked: CHANGELOG.md is not part of this commit. Add an entry under '## [Unreleased]' and stage it (every commit updates the changelog, see AGENTS.md). Use '[skip changelog]' in the message only for commits that genuinely change nothing user- or developer-facing." >&2
exit 2
