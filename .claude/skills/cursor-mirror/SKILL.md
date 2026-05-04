---
name: cursor-mirror
description: Explains the one-way sync from .claude/ to .cursor/ that keeps Cursor users unblocked while .claude/ is the source of truth. Read when editing any mapped file, when wondering why a .cursor/ file changed, or when adding a new file that needs mirroring.
---

# Cursor mirror

`.claude/` is the source of truth for agent infrastructure (skills, agents, hooks). `.cursor/` is kept in sync for team members still on Cursor. Sync is **one-way**: `.claude/` → `.cursor/`.

A `PostToolUse` hook at `.claude/hooks/sync-cursor-mirrors.sh` runs after every Edit/Write and copies mapped files to their `.cursor/` counterparts. This skill documents the contract; the hook enforces it.

## Rules

- Edit only the `.claude/` side. Do not hand-edit `.cursor/` mirrors — the next Edit on the `.claude/` source will overwrite them.
- If a file needs to exist in both, add it to the mapping table in `.claude/hooks/sync-cursor-mirrors.sh`.
- `.cursor/`-only files not in the mapping (plans, `.cursor/hooks.json`, deprecated pointer rules) are ignored by the hook and stay put.

## Mapping

| `.claude/` source | `.cursor/` mirror | Frontmatter when mirrored |
|---|---|---|
| `.claude/agents/apex-language-rules.md` | `.cursor/agents/apex-language-rules.md` | copy body verbatim |
| `.claude/agents/verifier.md` | `.cursor/agents/verifier.md` | copy body verbatim |
| `.claude/skills/apex-language/references/language-rules.md` | `.cursor/rules/apex-lang-rules.mdc` | `description: Apex Language` + `globs: …` + `alwaysApply: true` |
| `.claude/skills/typescript/references/lsp-and-web-extension.md` | `.cursor/rules/ts-rules.mdc` | `description: Language server, Apex parser, and VS Code extension host notes` + `alwaysApply: false` |
| `.claude/skills/doc-maintenance/SKILL.md` | `.cursor/rules/doc-maintenance.mdc` | `description: …` + `globs: …` + `alwaysApply: false` |
| `.claude/skills/effect-best-practices/references/effect-llm.md` | `.cursor/rules/effect-llm.mdc` | `description: Provides access to Effect-TS docs` + `alwaysApply: false` |

## Recovery

If a `.cursor/` mirror drifts (e.g. someone edited it directly):

1. Make the intended change on the `.claude/` source.
2. Save — the hook will rewrite the `.cursor/` mirror from the source.

To retire the mirror entirely, delete the row from the hook's mapping table, delete the `.cursor/` file, and update this skill.
