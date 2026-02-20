# Contextual Keyword as Identifier

Fixtures that demonstrate contextual keywords (offset, limit, select, count, etc.) used as variable names - which is VALID in Apex.

## ContextualKeywordAsVariable.cls

Uses offset, limit, count, select as variable names with SOQL using OFFSET :offset and LIMIT :limit. Should NOT produce invalid.keyword.identifier diagnostics.
