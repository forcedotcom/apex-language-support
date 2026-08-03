# Engineering working agreements

## Semantic analysis is parser-owned

- Never scan raw Apex source text with regular expressions or other text
  heuristics to infer semantic facts or to recover from missing semantic state.
  This prohibition includes synthesizing symbols, declarations, types,
  references, scopes, member ownership, completion candidates, definition
  targets, and dependency or missing-artifact names.
- Semantic language features must rely on the Apex lexer/parser, parse-tree
  walkers, symbol tables, resolved references/xref data, and stable semantic
  snapshots produced by those systems.
- Raw document text may be supplied to the parser and used for document
  transport or position/range mechanics, but it must not be independently
  interpreted as a semantic fallback.
- When parser or symbol state is unavailable, incomplete, or stale, preserve
  that uncertainty: wait, retry, return an incomplete result, or use a prior
  stable semantic snapshot. Never invent semantic state from source text.
