---
description: Run one auto-build-wi tick — drain GUS [ai-auto] work items (claim → plan → build → review → draft PR)
---

Run a single tick of the `auto-build-wi` workflow.

**What this does:** invokes the [auto-build-wi.js](../workflows/auto-build-wi.js) workflow once. The tick resolves runner identity, monitors in-flight `[ai-auto]` WIs, and — if under the in-flight cap — claims the highest-ranked unblocked candidate, then plans → builds → reviews → opens a **draft PR**. It is stateless across ticks: each run queries current GUS/GitHub state and acts. See [workflows/README.md](../workflows/README.md) for the full tick flow, exit codes, and phase notes.

**This mutates real state** — flips GUS WIs to `In Progress`, creates git worktrees under `../<project>-wt/`, pushes branches, opens draft PRs, and posts to Slack `#ide-exp-code-review`. It is not a dry run.

## Prerequisites (fail fast if unmet)

1. `"enableWorkflows": true` in [.claude/settings.json](../settings.json) — without it the `Workflow` tool is unavailable.
2. `gus` alias present (`sf alias list`), and the runner's gus username is listed under **Team members** in [gus-cli/SKILL.md](../skills/gus-cli/SKILL.md). First run caches identity to `$HOME/.claude/runner-identity.json`.
3. Slack MCP reachable (`mcp__slack__slack_send_message`). Run `/salesforce-trust-foundations:mcp-auth` if MCP calls 401.

## Run it

Invoke the `Workflow` tool with the named workflow `auto-build-wi`. Parse `$ARGUMENTS` token by token (whitespace-separated), order-independent:

- a **bare integer** (e.g. `3`) → `args.maxInFlight: 3`
- one of `approve` | `steward` | `full` (case-insensitive) → `args.mode` (lowercased)
- anything else → pass it through unchanged as `args.mode` so the workflow rejects it as `bad-mode` rather than guessing

Build `args` from whatever matched; omit `args` entirely if `$ARGUMENTS` is empty (the workflow defaults to `maxInFlight: 5`, `mode: 'full'`). Examples:

- `/auto-build-wi` → no `args` (full mode, cap 5)
- `/auto-build-wi 3` → `args: { maxInFlight: 3 }`
- `/auto-build-wi steward` → `args: { mode: 'steward' }`
- `/auto-build-wi approve` → `args: { mode: 'approve' }`
- `/auto-build-wi 3 steward` → `args: { maxInFlight: 3, mode: 'steward' }`
- `/auto-build-wi full 2` → `args: { mode: 'full', maxInFlight: 2 }`

The three modes are cumulative — `approve` (peer-approve only) ⊂ `steward` (+ monitor & maintain in-flight WIs) ⊂ `full` (+ claim/plan/build/review/draft new work). The workflow holds its own lock (`.claude/auto-build-wi.lock`) for the whole run, so overlapping ticks are safe.

## Continuous draining

Pair with `/loop` to run on a schedule, e.g. `/loop 10m /auto-build-wi`. Each scheduled tick monitors in-flight WIs and may claim one new one (up to the cap). To run a lighter cadence — peer-approve and upkeep only, no new builds — schedule with a mode, e.g. `/loop 10m /auto-build-wi steward`.
