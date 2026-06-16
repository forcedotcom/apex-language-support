#!/usr/bin/env bash
# PostToolUse hook: after a .ts edit, run Effect LS on just that file and
# surface findings (errors AND warnings AND messages) as a non-blocking
# followup_message — point-of-edit feedback so corrections happen immediately.
# Does NOT block; the Stop hook (verify-stop.sh) is the gate. stderr → Hooks channel.
set -e

ROOT="${CLAUDE_PROJECT_DIR:-${CURSOR_PROJECT_DIR:-.}}"
cd "$ROOT"

# Read PostToolUse stdin; find the edited file path (if any).
INPUT=$(cat)
EDITED_FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // ""')

# Only .ts edits, file must exist, and skip excluded trees.
case "$EDITED_FILE" in
  *.ts) : ;;
  *) exit 0 ;;
esac
[ -f "$EDITED_FILE" ] || exit 0
case "$EDITED_FILE" in
  */e2e-tests/*|e2e-tests/*|*/scripts/*|scripts/*) exit 0 ;;
esac

# Invoke the locally-installed bin directly (never bare `npx`, which would
# silently fetch+execute an unscoped registry typosquat if the local install
# is missing). The package is a top-level devDep in package.json.
EFFECT_LS="$ROOT/node_modules/.bin/effect-language-service"
if [ ! -x "$EFFECT_LS" ]; then
  echo "[verify-on-edit] effect LS skipped — $EFFECT_LS not found (run npm install)" >&2
  exit 0
fi

echo "[verify-on-edit] running effect LS on $EDITED_FILE" >&2
json=$("$EFFECT_LS" diagnostics --file "$EDITED_FILE" --format json 2>/dev/null || true)

if ! echo "$json" | jq empty >/dev/null 2>&1; then
  echo "[verify-on-edit] effect LS produced no parseable output" >&2
  exit 0
fi

count=$(echo "$json" | jq '[.diagnostics[]?] | length')
if [ "$count" -eq 0 ]; then
  echo "[verify-on-edit] effect LS clean" >&2
  exit 0
fi

# Build a human-readable findings list (errors + warnings + messages).
findings=$(echo "$json" | jq -r \
  '.diagnostics[]? | "- line \(.line):\(.column) [\(.severity)] effect(\(.name)): \(.message)"' \
  | head -c 1500)

# Emit a non-blocking followup_message; escape for JSON via jq.
echo "[verify-on-edit] effect LS findings on $EDITED_FILE" >&2
jq -cn --arg file "$EDITED_FILE" --arg body "$findings" \
  '{followup_message: ("Effect LS findings on \($file) — address warnings and messages, not just errors:\n" + $body)}'
exit 0
