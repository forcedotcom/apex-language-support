#!/usr/bin/env bash
# Agent policy: block git commit when hooks would be skipped.
input=$(cat)
command=$(echo "$input" | jq -r '.command // empty')
[[ "$command" =~ git.*--no-verify ]] && echo '{"permission":"deny","agent_message":"Commits that skip hooks are blocked for the agent. Use a normal git commit so hooks run."}' || echo '{"permission":"allow"}'
