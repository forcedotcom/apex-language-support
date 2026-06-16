#!/usr/bin/env bash
# Stop hook: run compile, lint, effect LS (uncommitted .ts only), test, bundle.
# On first failure, block with reason for agent to fix. Wireit cache hits = success.
# stderr → Hooks output channel
set -e

# Read stdin to check stop_hook_active
INPUT=$(cat)
if [ "$(echo "$INPUT" | jq -r '.stop_hook_active // false')" = "true" ]; then
  echo "[verify-stop] stop_hook_active=true, allowing stop" >&2
  exit 0
fi

ROOT="${CURSOR_PROJECT_DIR:-${CLAUDE_PROJECT_DIR:-.}}"
cd "$ROOT"
echo "[verify-stop] starting" >&2

fail() {
  local step="$1"
  local out="$2"
  # Strip control chars (incl. ANSI codes) so JSON stays valid; escape \ " for JSON
  local err
  err=$(printf '%s' "$out" | head -c 500 | tr -d '\000-\037\177' | tr '\n' ' ' | sed 's/\\/\\\\/g; s/"/\\"/g')
  echo "[verify-stop] failed: $step" >&2
  echo "{\"decision\": \"block\", \"reason\": \"Verification failed: $step — $err. Fix the errors and try again.\"}"
  exit 0
}

run_step() {
  local step="$1"
  local cmd="$2"
  local out
  out=$(eval "$cmd" 2>&1) || fail "$step" "$out"
}

# Check if this agent session made any changes.
# mark-edit.sh (.claude/hooks) touches this file via PostToolUse on every Edit/Write.
SESSION_MARKER="$ROOT/.claude/.edit-marker"

if [ ! -f "$SESSION_MARKER" ]; then
  echo "[verify-stop] no edits in this session, skipping verification" >&2
  exit 0
fi

echo "[verify-stop] edits detected in session, running verification" >&2
# Clean up marker for next run
rm -f "$SESSION_MARKER"

run_step "compile" "npm run compile" && echo "[verify-stop] compile ok" >&2
run_step "lint" "npm run lint" && echo "[verify-stop] lint ok" >&2

# Effect LS: only uncommitted .ts files.
# Invoke the locally-installed bin directly (never bare `npx`, which would
# silently fetch+execute an unscoped registry typosquat if the local install
# is missing). The package is a top-level devDep in package.json.
# Rich feedback: errors BLOCK; warnings/messages are surfaced (stderr) but do
# not block. Uses --format json so severities are parsed reliably (not regex).
EFFECT_LS="$ROOT/node_modules/.bin/effect-language-service"
ts_files=$(git diff --name-only HEAD 2>/dev/null | grep '\.ts$' | grep -v '^e2e-tests/' | grep -v '^scripts/' || true)
if [ -n "$ts_files" ] && [ -x "$EFFECT_LS" ]; then
  effect_advisories=""
  for f in $ts_files; do
    [ -f "$f" ] || continue
    json=$("$EFFECT_LS" diagnostics --file "$f" --format json 2>/dev/null || true)
    # Bad/empty JSON (tool crash) — surface, don't block.
    if ! echo "$json" | jq empty >/dev/null 2>&1; then
      echo "[verify-stop] WARNING: effect LS produced no parseable output for $f" >&2
      continue
    fi
    errs=$(echo "$json" | jq '[.diagnostics[]? | select(.severity == "error")]')
    if [ "$(echo "$errs" | jq 'length')" -gt 0 ]; then
      # Block on errors, like any other failed step.
      msg=$(echo "$errs" | jq -r '.[] | "\(.name) (line \(.line)): \(.message)"' | head -c 500)
      fail "effect LS ($f)" "$msg"
    fi
    # Collect warnings + messages (non-blocking) for end-of-run summary.
    adv=$(echo "$json" | jq -r --arg f "$f" \
      '.diagnostics[]? | select(.severity == "warning" or .severity == "message")
       | "  \($f):\(.line):\(.column) [\(.severity)] effect(\(.name)): \(.message)"')
    [ -n "$adv" ] && effect_advisories="${effect_advisories}${adv}"$'\n'
  done
  if [ -n "$effect_advisories" ]; then
    echo "[verify-stop] effect LS advisories (warnings/messages — not blocking, but address them):" >&2
    printf '%s' "$effect_advisories" >&2
  else
    echo "[verify-stop] effect LS ok (no errors/warnings/messages)" >&2
  fi
elif [ -n "$ts_files" ]; then
  echo "[verify-stop] WARNING: effect LS skipped — $EFFECT_LS not found (run npm install)" >&2
else
  echo "[verify-stop] effect LS skipped (no uncommitted .ts in packages)" >&2
fi

run_step "test" "npm run test" && echo "[verify-stop] test ok" >&2
run_step "bundle" "npm run bundle" && echo "[verify-stop] bundle ok" >&2
echo "[verify-stop] all passed" >&2
