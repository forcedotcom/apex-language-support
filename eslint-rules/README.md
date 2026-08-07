# Custom ESLint Rules

This directory contains custom ESLint rules specific to this project.

## `local/parser-owned-semantics`

Enforced in parser listeners and each semantic validator as it is migrated. The
rule prevents:

- semantic placeholder names such as `unknownMethod` and `unknownVariable`;
- interpreting composite `getText()` output with string operations;
- interpreting identifiers such as `sourceContent` with string operations; and
- semantic recovery helpers named `getTextFromContext`, `*FromSource`, or
  `*FromText`.

Terminal-token text such as `ctx.id().getText()` remains valid. The rule treats
`ctx.getText()` as composite parser-context text and rejects subsequent string
interpretation. Document text used only for parser input, transport, display,
or range mechanics is outside this rule's current scope.
