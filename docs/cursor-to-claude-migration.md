# Cursor → Claude migration plan

Non-destructive migration of `.cursor/` content into `.claude/`. `.cursor/` stays intact so existing Cursor users are not broken; `.claude/` becomes the source of truth and a skill + hook keeps the `.cursor/` mirrors in sync.

## Guiding principles

- **Do not delete or modify `.cursor/` structure.** Cursor users rely on it.
- **`.claude/` is the source of truth going forward.** All edits happen there.
- **Sync is one-way**: `.claude/` → `.cursor/`. The hook enforces it; the skill documents it.
- **Accept duplication as a temporary cost.** We can retire `.cursor/` when the team is fully on Claude Code.

## File mapping

| # | `.claude/` source (edit here) | `.cursor/` mirror (auto-synced) | Notes |
|---|---|---|---|
| 1 | `.claude/agents/apex-language-rules.md` | `.cursor/agents/apex-language-rules.md` | Copy body; rewrite "First read" link inside the file to point at `.claude/skills/apex-language/references/language-rules.md` |
| 2 | `.claude/agents/verifier.md` | `.cursor/agents/verifier.md` | Copy verbatim |
| 3 | `.claude/skills/apex-language/references/language-rules.md` | `.cursor/rules/apex-lang-rules.mdc` | Mirror re-adds Cursor `.mdc` frontmatter |
| 4 | `.claude/skills/typescript/references/lsp-and-web-extension.md` | `.cursor/rules/ts-rules.mdc` | Mirror re-adds Cursor `.mdc` frontmatter |
| 5 | `.claude/skills/playwright-e2e/SKILL.md` (relevant sections) | `.cursor/rules/playwright-rules.mdc` | Mirror re-adds Cursor `.mdc` frontmatter |
| 6 | `.claude/skills/doc-maintenance/SKILL.md` (new) | `.cursor/rules/doc-maintenance.mdc` | Mirror re-adds Cursor `.mdc` frontmatter |
| 7 | `.claude/skills/effect-best-practices/references/effect-llm.md` | `.cursor/rules/effect-llm.mdc` | Full 1.6 MB duplicate; mirror re-adds Cursor `.mdc` frontmatter |

Not mirrored (already thin pointers or deprecated):

- `.cursor/rules/verification.mdc` — points at the verification skill; leave as-is.
- `.cursor/rules/wireit.mdc` — points at the wireit skill; leave as-is.
- `.cursor/rules/compilation-lint-checks.mdc` — marked deprecated; leave as-is.
- `.cursor/plans/*` — historical session plans; leave untouched.
- `.cursor/hooks.json` — Cursor's hook config; leave untouched (it already invokes `.claude/hooks/*.sh`).

## Execution steps

### Step 1 — Port agents into `.claude/agents/`

- Copy `.cursor/agents/apex-language-rules.md` → `.claude/agents/apex-language-rules.md`.
  - Edit the "First read" line to reference `.claude/skills/apex-language/references/language-rules.md`.
- Copy `.cursor/agents/verifier.md` → `.claude/agents/verifier.md` verbatim.

### Step 2 — Create `.claude/settings.json` with Claude hook schema

New file `.claude/settings.json`. Wires up the three existing scripts in `.claude/hooks/`:

- `PreToolUse` on `Bash` with matcher `git.*--no-verify` → `.claude/hooks/block-git-hook-bypass.sh`.
- `PostToolUse` on `Edit|Write` → `.claude/hooks/mark-edit.sh`.
- `Stop` → `.claude/hooks/verify-stop.sh`.

No edits to the shell scripts — they already read `CLAUDE_PROJECT_DIR`.

### Step 3 — Port rules into skills

- **Apex language rules**: create `.claude/skills/apex-language/references/language-rules.md` from the body of `.cursor/rules/apex-lang-rules.mdc` (strip Cursor frontmatter). Link from the `apex-language` SKILL.md if not already linked.
- **TypeScript LSP + web-extension rules**: create `.claude/skills/typescript/references/lsp-and-web-extension.md` from the body of `.cursor/rules/ts-rules.mdc`. Add one line to `.claude/skills/typescript/SKILL.md` pointing readers at it for LSP indexing / web-extension constraints.
- **Playwright**: diff `.cursor/rules/playwright-rules.mdc` against `.claude/skills/playwright-e2e/SKILL.md`; fold any missing guidance into the SKILL (confirmed unique items: `Control` not `ControlOrMeta`, avoid `networkidle`, avoid `waitForTimeout`, `getByRole` over CSS, `test.step` organization).
- **Doc maintenance**: create `.claude/skills/doc-maintenance/SKILL.md` with an "Activate on" list mirroring the current globs (`**/*.ts`, `**/*.tsx`, `**/package.json`, `**/esbuild.config.*`, `scripts/**`, `**/.vscodeignore`, `**/.vscode/**`, `**/tsconfig*.json`, `.esbuild-web-extra-settings.json`, `.github/**`). The skill delegates to the existing `.claude/agents/doc-maintenance.md` agent.
- **Effect LLM docs**: copy the body of `.cursor/rules/effect-llm.mdc` (strip Cursor frontmatter) into `.claude/skills/effect-best-practices/references/effect-llm.md`. Link from the `effect-best-practices` SKILL.

### Step 4 — Add the cursor-mirror skill

New file `.claude/skills/cursor-mirror/SKILL.md`. Purpose and scope:

- Describes the mapping table above as the authoritative sync contract.
- Tells the agent: when editing any file in column 1, also update the file in column 2.
- Explains why: `.cursor/` is not the source of truth, but Cursor users still consume it.
- Notes that the `PostToolUse` hook (step 5) enforces this automatically; the skill exists so the agent understands the constraint and so humans reading the repo know why files mirror.

### Step 5 — Add the sync hook

New file `.claude/hooks/sync-cursor-mirrors.sh`. Behavior:

- `PostToolUse` on `Edit|Write`.
- Reads the edited file path from the hook's stdin payload.
- Checks it against the mapping table (encoded in the script).
- For Claude `.md` → Cursor `.mdc` mirrors: copies the body and prepends the appropriate `.mdc` frontmatter (the frontmatter for each target is fixed and stored in the script).
- For Claude `.md` → Cursor `.md` mirrors (the two agent files): copies verbatim.
- Never reads or writes anywhere except the specific `.cursor/` target for the given source; silent no-op when the edited file is not a mapped source.
- Emits a short `[sync-cursor]` line to stderr on each action (for the Hooks output channel).

Add a line to `.claude/settings.json` registering this script under `PostToolUse` alongside `mark-edit.sh`.

### Step 6 — Verify

- Run `npm run compile && npm run lint && npm run test && npm run bundle` (the stop hook will run these anyway).
- Manually trigger each hook:
  - Edit a `.claude/skills/apex-language/references/language-rules.md` → confirm `.cursor/rules/apex-lang-rules.mdc` rewrites and frontmatter is preserved.
  - `git commit --no-verify` → confirm the bypass-block hook denies.
  - Stop the agent with edits in the session → confirm `verify-stop.sh` runs.
- `git status` should show only the intended new and copied files.
- `.cursor/` directory contents should be functionally equivalent to before (body text may be reformatted on first sync; subsequent edits flow from `.claude/`).

## Rollback

All changes are additive; rollback = `git restore` the new files. `.cursor/` remains usable on its own throughout the migration.

## When to retire `.cursor/`

Prerequisites before deleting `.cursor/`:

1. No team members actively using Cursor on this repo for >30 days.
2. `.cursor/hooks.json` no longer referenced by any Cursor config.
3. The sync hook and cursor-mirror skill can be removed in the same PR as the deletion.

Delete in one PR:

- `rm -rf .cursor/`.
- Remove `.claude/hooks/sync-cursor-mirrors.sh` and its registration in `.claude/settings.json`.
- Remove `.claude/skills/cursor-mirror/`.
- Drop `.cursor/rules/` from the "In scope" lists in `.claude/agents/doc-maintenance.md` and the description in `.claude/skills/concise/SKILL.md`.

## Trade-offs acknowledged

- **Duplication**: the 1.6 MB `effect-llm` file will be duplicated on disk. Accepted as negligible.
- **Hook drift risk**: the sync hook's mapping table is a second place to update when files are added to the mirror set. Worth it for enforcement; the skill doc reduces the surprise factor.
- **First sync may reformat**: the initial copy normalizes whitespace and frontmatter; expect a one-time diff in `.cursor/` files.

## Open items (not blocking)

- Confirm Playwright SKILL.md already covers all items from `playwright-rules.mdc` before step 3; if yes, no changes beyond ensuring the mirror sync regenerates the `.mdc`.
- Decide whether the cursor-mirror skill should also document manual-edit recovery steps (i.e., what to do if someone edits the `.cursor/` side directly).
