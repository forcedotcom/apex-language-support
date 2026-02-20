# Method Call Reference & Symbol Matching Improvements Plan

## Context

When a METHOD_CALL reference exists at a position, `getSymbolAtPosition` can incorrectly return a variable/field (from the fallback) instead of the method or null. This affects hover, go-to-definition, and references.

**Grammar reference:** `methodCall` (unqualified: `id LPAREN ...`) and `dotMethodCall` (qualified: `anyId LPAREN ...`) in BaseApexParser.g4.

### Tier 1 Resolution is Deterministic

Tier 1 (same-file) symbol resolution in `ApexReferenceResolver.resolveSameFileReference` is deterministic: same inputs (ref, scope hierarchy, symbol table) always produce the same output. There is no async, randomness, or external state.

When `resolveSymbolReferenceToSymbol` returns null for a same-file METHOD_CALL, it means the method is not resolvable in that file (e.g., `System.debug` where System is cross-file, or the method does not exist). The fallback in `getSymbolAtPositionPrecise` assumes non-determinism—that "resolution failed" implies "return any symbol at position." That assumption is incorrect. When resolution fails for METHOD_CALL, we should return null (method not found), not a variable/field.

### Dotted/Chained Refs Already Handled

Qualified calls like `FileUtilities.createFile` are already handled via `chainNodes`:

- Each chain node has its own `location` (see `symbolReference.ts`, `createChainedExpressionReference`)
- `SymbolTable.getReferencesAtPosition` (symbol.ts ~1804–1868) checks position against each chain node and creates synthetic refs for METHOD_CALL/FIELD_ACCESS members at the position
- `ApexSymbolManager.findChainMemberAtPosition` picks the correct chain member (qualifier vs method) for resolution

`HierarchicalReference` (hierarchicalReference.ts) has `qualifierLocation`/`memberLocation`, and `getReferencesAtPosition` already checks them when present. The primary mechanism is `chainNodes` with per-node locations. The original plan's qualifier/member and consolidation phases were redundant with this existing infrastructure.

---

## Phase 1: Fix Fallback in ApexSymbolManager (High Priority)

**Goal:** When METHOD_CALL reference exists at position, never return non-method symbols from the fallback.

**Rationale:** Same-file resolution is deterministic; the fallback should not assume otherwise. When resolution fails for METHOD_CALL, return null rather than any symbol at position.

**File:** `packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts`

**Changes:**
1. In `getSymbolAtPositionPrecise`, before returning from the fallback (around line 6959):
   - Check if any `typeReferences` at the position have `context === ReferenceContext.METHOD_CALL` and position within their `identifierRange`
   - If yes, filter `exactMatchSymbols` to only `kind === 'method'` or `kind === 'constructor'`
   - If filtered result is empty, return `null` instead of a variable/field

**Test:** `packages/apex-parser-ast/test/symbols/ApexSymbolManager.getSymbolAtPosition.test.ts` – "METHOD_CALL reference at position - must not return non-method symbol"

**Cleanup:** Remove bug-injection block from ApexSymbolManager if present.

---

## Phase 2: Add receiverHint for Unqualified Method Calls (Optional)

**Goal:** Improve resolution of unqualified calls (`helper()`) by hinting that the receiver is `this`, `super`, or implicit static.

**Files:**
- `packages/apex-parser-ast/src/types/symbolReference.ts` – add optional `receiverHint`
- Listeners – set `receiverHint` in `enterMethodCall` based on `MethodCallContext` (id vs THIS vs SUPER)

**Changes:**
1. For `id LPAREN ...` → `receiverHint: 'implicit'` (resolve as instance or static on current type)
2. For `THIS LPAREN ...` → `receiverHint: 'this'`
3. For `SUPER LPAREN ...` → `receiverHint: 'super'`
4. Resolution logic can use this to prioritize lookup order

**Test:** Resolution tests for unqualified calls.

---

## Execution Order

| Phase | Priority | Dependencies |
|-------|----------|--------------|
| 1     | High     | None – fixes immediate bug |
| 2     | Low      | None – optional |

---

## Verification

- [ ] `npm run compile` passes
- [ ] `npm run lint` passes
- [ ] `ApexSymbolManager.getSymbolAtPosition` test passes
- [ ] Hover on `System.debug`, `EncodingUtil.urlEncode`, `helper()` returns method
- [ ] Hover on qualifier (`System`, `EncodingUtil`) returns class/type
- [ ] No regression in definition/references for method calls
