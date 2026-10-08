#!/usr/bin/env bash
# Stop: before Claude ends a turn with uncommitted source changes, type-check, lint and test must pass.
# Covers edits made through Bash (sed, heredocs) that the Edit|Write hooks never see.
# Exit 2 sends the failure output back to Claude so it fixes the problem instead of reporting "done".
set -uo pipefail
[ -n "${CLAUDE_PROJECT_DIR:-}" ] || exit 0
input=$(cat)
active=$(printf '%s' "$input" | node -e '
let s = "";
process.stdin.on("data", c => s += c).on("end", () => {
  try { process.stdout.write(String(JSON.parse(s).stop_hook_active ?? false)); } catch { process.stdout.write("false"); }
});')
[ "$active" = "true" ] && exit 0   # avoid blocking loops
cd "$CLAUDE_PROJECT_DIR" || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0

changed=$(git status --porcelain --untracked-files=all | awk '{print $NF}' \
  | grep -E '\.(ts|tsx|mjs|js|json|css)$' | grep -vE '^(node_modules|\.output|\.wxt|\.dev-logs)/' || true)
[ -n "$changed" ] || exit 0

fail() {
  echo "Stop check failed ($1). Fix this before finishing:" >&2
  echo "$2" | tail -60 >&2
  exit 2
}

out=$(npm run -s compile 2>&1) || fail "npm run compile" "$out"
out=$(npm run -s lint 2>&1) || fail "npm run lint" "$out"
if echo "$changed" | grep -qE '\.(ts|tsx)$'; then
  out=$(npx vitest run --silent 2>&1) || fail "npm run test" "$out"
fi
if echo "$changed" | grep -qE '^(public/_locales/|features/|entrypoints/)'; then
  out=$(npm run -s lint:i18n 2>&1) || fail "npm run lint:i18n" "$out"
fi

list="$CLAUDE_PROJECT_DIR/.claude/denylist.txt"
if [ -f "$list" ]; then
  terms=$(grep -v '^[[:space:]]*#' "$list" | grep -v '^[[:space:]]*$')
  if [ -n "$terms" ]; then
    hits=$( { git diff; git diff --cached; git ls-files --others --exclude-standard -z | xargs -0 cat 2>/dev/null; } \
      | grep -n -i -F -f <(printf '%s\n' "$terms") | cut -c1-160 || true)
    [ -z "$hits" ] || fail "denylist scan of uncommitted changes" "$hits"
  fi
fi
exit 0
