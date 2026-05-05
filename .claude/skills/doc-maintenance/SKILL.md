---
name: doc-maintenance
description: Delegate to the doc-maintenance subagent when code/config/scripts change to catch code→doc drift. Use after editing TS/TSX, package.json, esbuild config, scripts, .vscodeignore, .vscode, tsconfig, or GitHub workflow files.
---

When code is edited (or code changes are in conversation context), delegate to the [doc-maintenance agent](../../agents/doc-maintenance.md) with `run_in_background: true`. Subagent fixes docs directly; no report-back required.

## Activate on changes to

- `**/*.ts`, `**/*.tsx`
- `**/package.json`
- `**/esbuild.config.*`
- `scripts/**`
- `**/.vscodeignore`
- `**/.vscode/**`
- `**/tsconfig*.json`
- `.esbuild-web-extra-settings.json`
- `.github/**`

## Scope

- In scope: `.claude/skills/`, `.claude/agents/`, `.cursor/rules/`, `docs/`, `contributing/`, `packages/**/README.md`
- Excluded: `**/*.plan.md`, `**/plan.md`
