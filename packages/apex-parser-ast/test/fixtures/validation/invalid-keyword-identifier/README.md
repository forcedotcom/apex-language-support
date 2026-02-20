# Invalid Keyword Identifier

Fixtures that demonstrate `invalid.keyword.identifier` - using reserved keywords as variable/class/field names.

## InvalidKeywordAsVariable.cls

Uses `if` (non-contextual keyword) as variable name. Should produce error.

## Contextual keywords (valid as identifiers)

See `contextual-keyword-identifier/ContextualKeywordAsVariable.cls` for the opposite case - contextual keywords (offset, limit, select, count) used as variable names, which is valid.
