#!/usr/bin/env bash
# Agent policy: block git commit when hooks would be skipped.
# Claude Code PreToolUse hook (matcher: Bash). Reads tool input on stdin and
# inspects the .command field. https://code.claude.com/docs/en/hooks.md
input=$(cat)
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
[[ "$tool_name" != "Bash" ]] && exit 0
command=$(echo "$input" | jq -r '.tool_input.command // .command // empty')
[[ "$command" =~ git.*--no-verify ]] && cat <<'EOF'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Commits that skip hooks are blocked for the agent. Use a normal git commit so hooks run."}}
EOF
exit 0
