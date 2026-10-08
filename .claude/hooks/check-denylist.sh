#!/usr/bin/env bash
# PostToolUse (Edit|Write): block real customer / tenant names from entering the repository.
# Terms come from .claude/denylist.txt (gitignored, one term per line, case-insensitive, '#' comments).
# Copy .claude/denylist.example.txt to get started. If the list is missing, the hook is a no-op.
set -uo pipefail
[ -n "${CLAUDE_PROJECT_DIR:-}" ] || exit 0
list="$CLAUDE_PROJECT_DIR/.claude/denylist.txt"
[ -f "$list" ] || exit 0
file=$(node -e '
let s = "";
process.stdin.on("data", c => s += c).on("end", () => {
  try { process.stdout.write(String(JSON.parse(s).tool_input?.file_path ?? "")); } catch {}
});')
[ -n "$file" ] && [ -f "$file" ] || exit 0
case "$file" in
  "$list"|"$CLAUDE_PROJECT_DIR"/.dev-logs/*|"$CLAUDE_PROJECT_DIR"/node_modules/*|"$CLAUDE_PROJECT_DIR"/.output/*) exit 0 ;;
esac
terms=$(grep -v '^[[:space:]]*#' "$list" | grep -v '^[[:space:]]*$')
[ -n "$terms" ] || exit 0
hits=$(grep -n -i -F -f <(printf '%s\n' "$terms") "$file" 2>/dev/null | cut -c1-160)
if [ -n "$hits" ]; then
  echo "Denylist hit in ${file#"$CLAUDE_PROJECT_DIR"/}: the file contains a real customer/tenant term. Replace it with dummy data (Acme Corp, tenant.example.integrationsuite.com):" >&2
  echo "$hits" >&2
  exit 2
fi
exit 0
