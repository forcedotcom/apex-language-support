#!/usr/bin/env bash
# PostToolUse hook: mirror .claude/ source files into .cursor/ counterparts
# so Cursor users stay in sync while .claude/ is the source of truth.
# Silent no-op for edits outside the mapping. Writes to stderr on action.
set -e

INPUT=$(cat)
# Extract edited file path from hook payload. Try common fields; fall back empty.
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || true)
[ -z "$FILE" ] && exit 0

ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
# Normalize to path relative to repo root
case "$FILE" in
  "$ROOT"/*) REL="${FILE#$ROOT/}" ;;
  /*) exit 0 ;;
  *) REL="$FILE" ;;
esac

# Only sync edits under .claude/
case "$REL" in
  .claude/*) ;;
  *) exit 0 ;;
esac

write_verbatim() {
  local src="$1" dst="$2"
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  echo "[sync-cursor] mirrored $src -> $dst" >&2
}

# Prepend frontmatter to body of src and write to dst. Strips any existing
# leading `---...---` frontmatter block from src so the mirror has only the
# Cursor-specific frontmatter.
write_with_frontmatter() {
  local src="$1" dst="$2" fm="$3"
  mkdir -p "$(dirname "$dst")"
  {
    printf '%s' "$fm"
    awk '
      NR==1 && /^---$/ { in_fm=1; next }
      in_fm && /^---$/ { in_fm=0; next }
      in_fm { next }
      { print }
    ' "$src"
  } > "$dst"
  echo "[sync-cursor] mirrored $src -> $dst (with .mdc frontmatter)" >&2
}

case "$REL" in
  .claude/agents/apex-language-rules.md)
    write_verbatim "$ROOT/$REL" "$ROOT/.cursor/agents/apex-language-rules.md"
    ;;
  .claude/agents/verifier.md)
    write_verbatim "$ROOT/$REL" "$ROOT/.cursor/agents/verifier.md"
    ;;
  .claude/skills/apex-language/references/language-rules.md)
    FM='---
description: Apex Language
globs: packages/apex-parser-ast/**/*.ts, packages/lsp-compliant-services/**/*.ts, packages/apex-parser-ast/**/*.md, packages/lsp-compliant-services/**/*.md
alwaysApply: true
---

'
    write_with_frontmatter "$ROOT/$REL" "$ROOT/.cursor/rules/apex-lang-rules.mdc" "$FM"
    ;;
  .claude/skills/typescript/references/lsp-and-web-extension.md)
    FM='---
description: Language server, Apex parser, and VS Code extension host notes; general TS via skills
alwaysApply: false
---

'
    write_with_frontmatter "$ROOT/$REL" "$ROOT/.cursor/rules/ts-rules.mdc" "$FM"
    ;;
  .claude/skills/doc-maintenance/SKILL.md)
    FM='---
description: Delegate to doc-maintenance subagent when code/config/scripts change; catches code→doc drift
globs:
  - '\''**/*.ts'\''
  - '\''**/*.tsx'\''
  - '\''**/package.json'\''
  - '\''**/esbuild.config.*'\''
  - '\''scripts/**'\''
  - '\''**/.vscodeignore'\''
  - '\''**/.vscode/**'\''
  - '\''**/tsconfig*.json'\''
  - '\''.esbuild-web-extra-settings.json'\''
  - '\''.github/**'\''
alwaysApply: false
---

'
    write_with_frontmatter "$ROOT/$REL" "$ROOT/.cursor/rules/doc-maintenance.mdc" "$FM"
    ;;
  .claude/skills/effect-best-practices/references/effect-llm.md)
    FM='---
description: Provides access to Effect-TS docs
alwaysApply: false
---
'
    write_with_frontmatter "$ROOT/$REL" "$ROOT/.cursor/rules/effect-llm.mdc" "$FM"
    ;;
  *)
    # Not a mapped file — no-op.
    exit 0
    ;;
esac

exit 0
