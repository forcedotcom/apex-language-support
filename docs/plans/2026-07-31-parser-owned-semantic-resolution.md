# Parser-Owned Semantic Resolution Plan

## Summary

Replace all raw-text semantic inference with parser-owned state. The immediate
steel thread is:

```apex
Property__c property = new Property__c();
insert property;
property.
```

DML context, local-variable type, incomplete member access, completion, hover,
definition, and artifact loading must all resolve through parse-tree contexts,
symbol tables, and cross-reference data.

Use current-version semantic state only. If required state is unavailable,
return an incomplete result and retry. Never consult raw text or issue an
artifact request without semantic evidence.

## Semantic Model and Active Editing

- Add an orthogonal `semanticContext` to `SymbolReference`. For DML operands it
  records the operation, operand role, statement range, operand range, and
  whether the reference is the operand root. Preserve the existing reference
  context such as `VARIABLE_USAGE`, `METHOD_CALL`, or chained access.
- Populate DML context from `InsertStatementContext`,
  `UpdateStatementContext`, `DeleteStatementContext`,
  `UndeleteStatementContext`, `UpsertStatementContext`, and
  `MergeStatementContext`. Cover merge roles and upsert field specifications
  without parsing `ctx.getText()`.
- Serialize the new metadata through symbol tables, worker transport,
  replacement/write-back, and graph export. Update DML validation to consume
  resolved operand references and types instead of `expressionText`
  heuristics.
- Ensure an incomplete trailing member expression produces parser-owned
  receiver/chain state. Preserve unaffected declarations and references when a
  later edit is incomplete; fix parser collection or table replacement if
  `property` disappears.
- Add symbol-manager APIs for visible symbols and cursor
  expression/receiver resolution so completion strategies do not parse
  documents themselves.

## Completion and Artifact Resolution

- Remove `recoverDeclaredTypeFromSource`, general declaration-prefix scanning,
  member declaration scanning, line-based member-expression parsing, and their
  keyword-filter workaround.
- Resolve bare `prop` completion from visible symbols at the parser-reported
  scope. Resolve `property.` from the cursor receiver reference and the
  declared `Property__c` type.
- Require every missing-artifact identifier to carry symbol/reference
  provenance: source URI, table version, reference range, and symbol/reference
  identity. Reject requests without that evidence.
- Return `isIncomplete: true` when current-version semantic state is
  insufficient. Do not search for guessed class or SObject names.
- Retain the incremental integration scenario, but make it prove that the
  first newly typed `.` returns all `Property__c` members without a prior hover
  or Ctrl+Space.
- Carry incomplete member-access and override-completion references into the
  shared completion context once per request. Trigger context variables and
  inherited override candidates must activate from those records, never from
  a line regex. Do not restore top-level trigger-keyword synthesis until the
  parser exposes an explicit compilation-unit completion context.

## Call-Site and Signature Semantics

- Replace `argumentExpressions` raw strings with parser-classified positional
  argument facts: literal type, identifier name, or unresolved expression.
  Resolve identifier types through the lexical symbol scope and preserve
  uncertainty for all other expression roots.
- Record invocation, argument, and separator ranges on method and constructor
  references in both parser listener paths. Expose the innermost invocation at
  an LSP cursor through the symbol manager.
- Build signature-help method name, argument types, and active parameter solely
  from that invocation record. If no current parser-owned invocation exists,
  return no signature help rather than scanning backward through document text.

## Repository-Wide Raw-Text Remediation

- Audit parser, services, and language-server code for semantic use of
  `TextDocument.getText()`, composite `ctx.getText()`, regular expressions, and
  `*FromText` helpers. Classify transport/range/display uses as allowed and
  semantic inference as forbidden.
- Migrate known violations in resolution-context construction,
  member/general/trigger/override completion, signature help, hover name
  recovery, document-symbol regex recovery, method resolution,
  DML/run-as/switch/collection validators, argument-type resolution, and code
  actions.
- Replace text-based validator logic with grammar accessors, expression
  references, resolved types, and semantic-context annotations. Fix
  parser/listener gaps rather than preserving workarounds.
- Classify modifiers and invalid `void` declaration recovery through grammar
  token identity, including parser error nodes, rather than composite context
  text.
- Remove raw argument-expression strings from semantic resolution once
  equivalent parser-derived argument facts are retained on call references.

## Guardrails and Tests

- Add a local ESLint rule for semantic directories that rejects regex/string
  interpretation of document text and composite parse-context text. Permit
  source only at parser ingestion, document transport, display-only rendering,
  and position/range mapping.
- Add a provenance assertion: completion candidates, definition targets, and
  artifact identifiers must originate from a symbol, reference, or
  parser-owned semantic record.
- Cover all DML operations with variables, collections, constructors, calls,
  chains, merge roles, and upsert fields; verify serialization and worker
  round-trips.
- Add active-edit tests for open, incremental changes, concurrent
  change/request execution, syntax errors after unaffected declarations, and
  repeated requests. Assert stable symbol identities, resolved DML operands,
  correct SObject members, and zero searches for keywords such as `insert`.
- Add adversarial tests proving comments, strings, unrelated scopes, DML
  statements, and malformed text cannot create symbols, types, completions, or
  artifact requests.
- Run parser, services, worker, and integration suites plus typecheck, lint,
  and duplicate-code checks. Record semantic provenance, document version,
  table version, and parse completeness in spans.

## Assumptions

- The remediation is repository-wide but implemented in phases, with the
  Property/DML completion path as the first end-to-end milestone.
- DML semantics are attached to references rather than represented as
  declaration symbols or a separate statement graph.
- Prior snapshots are not used for semantic answers in this iteration;
  insufficient current state produces an incomplete result and retry.
- Grammar-derived token access is allowed, but reparsing composite
  `ctx.getText()` or document text to infer semantics is not.
- No feature gate or compatibility path retains raw-text semantic fallbacks.

## Implementation Progress

- DML operand roles and ranges are parser-owned semantic context on references;
  DML validation consumes those references and resolved types instead of
  reparsing statement text.
- Incomplete member access, invocation arguments/separators, override
  completion, and modifier/invalid-`void` recovery are represented by parser
  contexts or lexer token identity. Completion and signature help consume
  those records.
- Type-reference construction now walks qualified, generic, collection, and
  array grammar nodes. It no longer parses a composite type string.
- Development-mode preparation and resolution spans now record the live
  document version alongside the symbol table's metadata version and parse
  completeness. Cursor provenance is selected only from the narrowest
  parser-owned reference (including chain nodes) or declaration symbol and
  includes its source URI, identity, and range; absent semantic evidence is
  reported explicitly as `none`.
- Variable initializer inference retains parser-classified literals and
  range-correlated references. It no longer stores an arbitrary initializer
  expression string or uses one to recover a type/reference.
- Expression identifier extraction now returns uncertainty for parser shapes
  it does not explicitly support. Child/composite text is not an identifier
  fallback.
- Annotation identity is now the qualified name emitted by the annotation
  grammar node. Parameters are stored separately; the annotation name no
  longer embeds a reconstruction of the entire annotation source.
- Annotation parameter values are retained only when represented by a literal
  grammar node. Qualified standalone-call owners and secondary block-listener
  references now use explicit expression/identifier nodes and preserve
  uncertainty for unsupported parser shapes.
- Code-action context now comes from precise symbol-manager lookup rather than
  placeholder semantic facts. Extracted-variable name collision checks use the
  parse context's symbol table rather than a document-wide regular expression.
- Parser listeners no longer publish `unknownClass`, `unknownMethod`,
  `unknownVariable`, or equivalent placeholder declarations/references.
  Unresolved type declarations retain an anonymous structural scope; missing
  method, constructor, parameter, property, and variable identifiers produce
  no semantic symbol. Declaration exits only pop scopes that were actually
  established, keeping later symbols stable after malformed edits.
- Initializer-to-reference linking now uses the parser-assigned reference
  context at the initializer range. It no longer splits or trims
  `TypeInfo.originalTypeString` to guess a method, field, or collection name;
  chain roots without a parser-owned receiver produce no chained reference.
- Return validation no longer invents `unknownMethod` or scans formal-parameter
  text when parser recovery omits a method identifier. It retains structural
  nesting but preserves the unresolved method identity.
- Method receiver validation no longer reconstructs a missing qualifier by
  scanning a source line. Receiver resolution now requires reference-chain and
  symbol-table evidence; missing chain state remains unresolved.
- A tested local ESLint rule now rejects semantic placeholder names,
  source-text recovery helpers, composite-context string interpretation, and
  raw-source string interpretation, including values passed through lexical
  aliases. Enforcement covers parser listeners and each validator after its
  migration.
- Expression-type validation now classifies assignment targets and
  increment/decrement statements by parser context. Invalid `void`
  recovery follows the parser-owned shape: field/property spellings recovered
  as methods retain `void` return types, while malformed parameter/local forms
  without declaration identifiers do not synthesize symbols. The collector
  regression asserts both facts.
- Exception catch types are assembled from qualified-name identifier nodes;
  inner static blocks use `ClassBodyDeclarationContext.STATIC()`; and
  `instanceof` cast/RHS types use parser-built `TypeInfo` rather than composite
  type text. These validators are now under the guardrail.
- Static-context validation identifies `this` and `super` from primary-context
  variants and no longer scans source to recover a receiver for an incomplete
  field reference. Missing chain evidence remains unresolved.
- Reference collection now retains explicit `this` as the first `CHAIN_STEP`
  for `this.member`, with its parser range and read access. This gives variable,
  hover, definition, and completion resolution a real receiver instead of
  requiring a source or containing-class fallback.
- Method parameter validation now consumes parser-classified argument facts and
  resolves identifier arguments through the lexical scope chain. The source
  line argument parser and its literal/constructor regex inference are removed.
  Invocation records now retain parser-owned result targets for declared-local
  initializers and simple assignments. Return compatibility consumes the
  declared type or resolves the target identifier lexically; it preserves
  uncertainty for unsupported target shapes instead of scanning a source line.
  Flattened method references are correlated back to their exact parser chain
  prefix before receiver resolution, and return compatibility compares
  recursive `TypeInfo`, so qualified nested generics are not reduced to scalar
  dotted strings.
- Variable and field resolution no longer inspects source lines to suppress
  string-literal references, recover qualified receivers, or infer indexed
  collection access. String literals are covered by a parser regression;
  qualified field resolution now selects the exact parser-owned chain by source
  location and deduplicates overlapping direct/chain references, so repeated
  member names cannot borrow another expression's receiver. Indexed chain
  bases now carry parser-owned receiver/index/access ranges; List, Map, and
  array receivers promote to structured element/value `TypeInfo` for fields,
  methods, completion, hover, and definition. The now-unused raw receiver
  extraction helper has been removed.
- Modifier validation now trusts parser-normalized symbol modifiers and does
  not reconstruct discarded modifiers from declaration lines. Duplicate field
  initializer validation uses created-name, assignment, and identifier-primary
  parser contexts instead of composite expression strings. Both preserve
  uncertainty when the parser did not retain a rejected construct.
- Document symbols are emitted only from parser/symbol-table state. The outline
  provider no longer scans document text to synthesize top-level classes, with
  regression coverage for declaration-shaped text in comments and strings.
- Constructor validation now gets arity and literal/identifier argument facts
  from grammar nodes and lexical symbols. Constructor chaining placement uses
  statement identity, and value-return detection uses return-statement parser
  events; neither source lines nor composite expressions are reparsed. Unknown
  argument shapes remain unknown rather than being assigned a guessed type.
- Resolution context now comes from the symbol table for both direct and chain
  resolution. Scope, access, static state, inheritance, and namespace are no
  longer inferred from document lines, modifier-shaped text, or file names.
  Empty or unplaceable snapshots return an explicit incomplete semantic state
  with no invented scope chain.
- Completion, hover, and definition now consume that semantic-state marker.
  Incomplete completion is returned as retryable with no candidates; hover and
  definition stop before reference or missing-artifact fallback rather than
  producing a guess from neutral state.
- Missing-artifact selection is cursor/range/context based and order
  independent. Resolved identity breaks ties only after selecting the precise
  parser candidate, and instance chains such as `property.Beds__c` are no
  longer misclassified as class-qualified artifact requests.
- Missing-artifact identifiers now retain their semantic lifecycle provenance
  across worker/client boundaries: source URI, snapshot document version when
  known, exact parser reference range, stable reference/resolved identity, and
  parse completeness. Dedupe keys include snapshot/reference identity, and
  name-only validator or queued requests are rejected rather than upgraded
  into semantic requests without parser evidence.
- Hover enrichment no longer falls back to the first global method or the first
  same-named variable/member in a file. It requires resolved identity or a
  precise symbol at the cursor. Definition chain fallback likewise requires an
  exact resolved owner/FQN and owned member; unresolved members return no
  definition instead of opening the qualifier or result type, and file URIs
  come from the selected symbol rather than a name-to-file search.
  The unresolved “Searching” label also comes from the narrowest parser-owned
  cursor reference, or a neutral `Unknown Symbol`; display text is no longer
  scanned from the document and never feeds artifact or symbol resolution.
- Worker cursor helpers for references and declarations now share exact
  identifier-range selection, prefer resolved IDs/FQNs, and narrow members by
  chain-owner identity. Overlap order and duplicate unqualified names no longer
  determine the result; ambiguous targets remain unresolved.
  Cursor dependency loading likewise traverses structured `TypeInfo`, resolved
  IDs/FQNs, namespaces, and hierarchy edges. Exact identifier/member-access
  ranges replace regex identifier extraction and nearby-column guesses.
- Member completion resolves receiver types through structured `TypeInfo`,
  resolved IDs, FQNs, namespaces, and current-table identity. It no longer
  regex-parses generic/array type strings or selects the first global simple
  name; ambiguous receivers return no candidates, while indexed receivers
  complete against their element/value type.
- Refined incomplete access such as `this.may` is correlated structurally with
  the immediately adjacent parser-owned field range when the parser records
  `this.` and `may` separately. Cursor containment therefore remains semantic
  and completion works without a raw prefix or name fallback.
- General and System-namespace completion derive partial identifiers and the
  optional qualifier from Apex lexer tokens at the cursor. Comments, strings,
  punctuation, and lexical uncertainty do not become semantic query text; raw
  document content is only lexer input.
- Collection validation now retains parser-built `TypeInfo` and argument
  expression contexts for collection constructors and index operations.
  Literal, identifier, and nested-constructor compatibility is resolved from
  parser classifications and lexical symbols; unsupported expressions remain
  unknown rather than being reconstructed from expression text.
  `putAll` and `sort` now also consume recursive structured `TypeInfo`, including
  nested generic maps and comparator inheritance; they no longer regex flattened
  type strings, and unresolved custom comparator ancestry remains unknown.
- Binary and ternary expression validation now reports parser-resolved operand
  types rather than retaining composite operand text. Primary identifiers are
  accepted only through the identifier-primary grammar path and then resolved
  through symbols/xrefs. Enhanced-for and cast types now use parser-built
  `TypeInfo`; SOQL loop validation traverses grammar query/FROM nodes; collection
  elements use structured type parameters. Remaining `getText` calls are
  terminal operator-token reads.
- Variable-expression validation now resolves at the reference position in the
  lexical scope hierarchy, distinguishes missing from not-visible declarations,
  and selects the innermost shadow. A full semantic table without a usable
  position returns unknown rather than treating every located variable as
  visible. The expression facade now carries the full symbol table and
  parser-owned reference position, with edit regressions for shadowing and
  declarations moved into sibling methods.
- Constructor-expression validation no longer invents `String` field types or
  relies on hardcoded standard/custom-object field maps. A resolved constructor
  context supplies target and member symbols; field existence and assignment
  compatibility use those symbols and shared assignability, while unresolved
  members remain unknown. Coverage includes `Property__c.Beds__c` as a resolved
  Decimal field.
- Code-action method lookup now carries a parser-correlated receiver name,
  range, kind, and declared type instead of reconstructing receiver/argument
  expression strings. Qualified calls require an exact method-chain node;
  receiver types follow declaration IDs or lexical position, eliminating the
  previous file-wide first-name match under shadowing.
  Receiver type lookup now prefers resolved `TypeInfo` identity or exact FQN,
  accepts simple names only when unique, and converts LSP positions to the
  symbol manager's coordinate convention. Implicit `this` selects the innermost
  containing class, while imports and relationships retain the exact selected
  symbol rather than expanding every global same-name result.
- Switch validation now builds types, qualified names, literals, and duplicate
  keys from grammar nodes and resolved symbols. It no longer uses expression
  substrings, regex enum recovery, hardcoded SObject names, or raw initializer
  text. Unqualified constants resolve lexically at the `when` position and
  qualified constants require exact FQN lookup; unknown object/constant facts
  stay unresolved until symbol hydration.
- Literal validation now consumes parser-owned numeric values and string
  `literalValue` metadata. It no longer slices source ranges to reconstruct
  spelling, escapes, or control characters; spelling-dependent malformed-number
  checks preserve uncertainty when token metadata is unavailable.
- Source-size validation uses raw text only for transport-level length
  accounting. Test-unit classification comes from symbol annotations, and
  diagnostic previews no longer expose or interpret source prefixes.
- `runAs` validation consumes parser-classified argument facts and resolves
  identifiers at their lexical position; complex unresolved expressions remain
  unknown. DML-loop query validation recognizes SOQL and
  `Database.getQueryLocator` from their grammar shapes, so query-shaped strings
  and local lookalike calls cannot satisfy the rule.
- Parameterized-type validation builds recursive `TypeInfo` trees from grammar
  type arguments, retaining malformed extra arguments for accurate arity
  diagnostics. Qualified and nested generics no longer depend on composite type
  strings; source is only parser input when no cached parse tree exists.
- Cast compatibility now uses resolved class/interface hierarchy and shared
  assignability instead of hardcoded parent/child names. Generic SObject and
  concrete SObject casts are distinguished from unrelated concrete SObject
  siblings; absent hierarchy facts preserve uncertainty.
- The parser-owned-semantics guardrail now tracks composite expression,
  type-reference, and creator contexts through aliases and comparisons while
  allowing terminal tokens, semantic values named `sourceType`, and CharStream
  reads used strictly for range/indentation mechanics. A forced audit across the
  parser source currently reports zero violations.
- Parser-package Jest now transforms only TypeScript/TSX. Compiled JavaScript
  loaded by the global teardown is no longer retransformed through `ts-jest`,
  reducing focused suites from roughly 513 transformed files and 4 GB OOMs to
  about 185 files and 238-252 MB. The suites now expose ordinary semantic test
  failures, which remain enabled and are tracked as implementation work.
  Generated `dist` and `.wireit` trees are ignored by haste discovery, removing
  package-name collisions. Teardown timers are cleared, and the parser package
  opts out of the ineffective cross-environment global teardown; its suites now
  exit naturally with `forceExit: false` and expose real open handles.
- Compliant-services Jest uses the same TypeScript-only transform boundary;
  focused hover and semantic-state suites now run under 2 GB. Apex LS already
  had the correct transform and its cursor-identity suite runs normally. The
  full enrichment round-trip now completes at roughly 159 MB, exposing an
  ordinary refined-`this` completion regression rather than an OOM.
  The package also opts out of the ineffective cross-environment global
  teardown and exits naturally with `forceExit: false`; strategy, identity, and
  real queue-lifecycle suites report no open handles.
- The identified raw-source validator, resolution-context, document-symbol,
  and code-action dependencies have been migrated. The forced guardrail audit
  over `packages/apex-parser-ast/src` is clean; transport-level source length
  and range/indentation reads are the documented non-semantic boundaries.
- The audited service-layer first-match and raw-query paths are migrated:
  hover, definition, missing artifacts, member/general/System completion,
  code actions, and worker cursor/dependency resolution now retain exact parser
  or symbol identity and preserve ambiguity. The repaired focused suites are
  green.
- Multi-stage chain resolution resumes from the nearest resolved parser-owned
  prefix and follows field types and method return types for later selections.
  Regression coverage includes every selected member of
  `String s = a.b.c().d` and the existing chained-service hover scenario.
- Current-version layered enrichment retains parser-owned incomplete member
  access during active edits. The v1 declaration to v2 `property.` regression
  proves the first dot returns all visible `Property__c` members without a
  preceding hover or forced completion request.
- Missing-artifact lifecycle coverage now keeps one semantic chain across the
  unresolved, load, cross-file re-resolution, and retry stages. The initial
  `Property__c` request carries URI, document version, exact range, stable
  reference identity, and parse completeness; after simulated loading resolves
  `property.Beds__c`, retrying the same table issues no second request.

## Remaining and Deferred Work

- Recombine this semantic worktree with the separately retained SObject
  discovery work before performing the final Extension Development Host check
  of `property`, `property.`, `property.Beds__c`, hover, and definition. The
  semantic worktree alone intentionally does not contain the org/workspace
  SObject hydration implementation required for that manual scenario.
- Top-level trigger-keyword completion remains deferred until the parser emits
  an explicit compilation-unit completion context. No text synthesis fallback
  will be added in the interim.
- Retaining a prior stable semantic snapshot remains an optional latency
  enhancement. Current incomplete state deliberately returns retryable or empty
  results rather than inventing facts.
- Apex-LS and shared-package Jest still use force-exit in their existing test
  configurations. That teardown cleanup is operationally useful but is not a
  semantic-resolution blocker.

## Verification Results

- Parser package: 228 suites passed, 3,030 tests passed, 463 intentionally
  skipped. The full run completes without the former transform-time heap
  exhaustion.
- Compliant services: 71 suites passed, 814 tests passed, 10 intentionally
  skipped.
- Shared settings, compilation-worker wire, and missing-artifact wire coverage:
  98 tests passed.
- Semantic flight recorder: 5 tests passed.
- Parser-owned-semantics guardrail: 13 tests passed.
- Parser, compliant-services, shared, and Apex-LS package typechecks pass.
