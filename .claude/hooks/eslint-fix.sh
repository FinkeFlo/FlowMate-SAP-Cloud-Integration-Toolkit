#!/usr/bin/env bash
# PostToolUse (Edit|Write): run ESLint --fix on the edited TS/TSX/JS file.
# Auto-fixable problems are fixed silently; remaining errors go back to Claude via exit 2 (stderr).
# Hook input is parsed with Node (always present in this project) instead of jq.
set -uo pipefail
[ -n "${CLAUDE_PROJECT_DIR:-}" ] || exit 0
file=$(node -e '
let s = "";
process.stdin.on("data", c => s += c).on("end", () => {
  try { process.stdout.write(String(JSON.parse(s).tool_input?.file_path ?? "")); } catch {}
});')
case "$file" in
  "$CLAUDE_PROJECT_DIR"/*.ts|"$CLAUDE_PROJECT_DIR"/*.tsx|"$CLAUDE_PROJECT_DIR"/*.js|"$CLAUDE_PROJECT_DIR"/*.mjs) ;;
  *) exit 0 ;;
esac
[ -f "$file" ] || exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
out=$(npx eslint --fix --no-warn-ignored "$file" 2>&1)
status=$?
if [ $status -ne 0 ]; then
  echo "ESLint reported problems that could not be auto-fixed:" >&2
  echo "$out" >&2
  exit 2
fi
exit 0
