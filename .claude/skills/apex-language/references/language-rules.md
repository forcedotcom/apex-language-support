# Apex language rules — document index

Use this as the starting index when answering grammar/parser/semantic questions or when creating/modifying validators. Pulled from the previous `.cursor/rules/apex-lang-rules.mdc`.

## Core language rules

Apex has no import statements—never generate or expect them. The compiler resolves types by searching the current namespace, then the global namespace, then other installed namespaces. Fully qualified names (`<namespace>.<TypeName>`) are used only when a name conflict exists; otherwise, use the unqualified name. A namespace and a type in that namespace can share the same name (e.g., `Acme.Acme`) and this is valid. Namespace is determined by org/package metadata, not declared in code, and all Apex types and sObjects in the org are known to the compiler without imports.

## Document index (grammar & module docs)

**Grammar (external):** [BaseApexParser.g4](https://raw.githubusercontent.com/apex-dev-tools/apex-parser/main/antlr/BaseApexParser.g4), [BaseApexLexer.g4](https://raw.githubusercontent.com/apex-dev-tools/apex-parser/main/antlr/BaseApexLexer.g4)

**Module docs:** `.claude/skills/apex-language/SKILL.md` (listeners, validation patterns), `packages/apex-parser-ast/README.md` (architecture, SymbolTable), `docs/chained-syntax-capture-gaps.md` (chained expressions), `packages/apex-parser-ast/src/resources/messages/messages_en_US.properties` (error codes)

**Reference implementations:** `packages/apex-parser-ast/src/parser/listeners/`, `packages/apex-parser-ast/src/semantics/validation/validators/`
