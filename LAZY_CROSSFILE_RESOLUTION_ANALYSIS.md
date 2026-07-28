# Lazy Cross-File Resolution Analysis

## Problem Statement

Current architecture causes 7-minute UI freeze after 2.75s workspace load:
- Workspace load (2.75s): Files ingested and indexed quickly ✅
- Post-load resolution (7 min): `UpdateSymbolSubset` triggers expensive `resolveCrossFile` operations ❌
  - 4-9 concurrent operations each taking 243+ seconds in cross-file resolution
  - All user interactions blocked (hovers taking 5-15s instead of <100ms)

## Root Cause

`UpdateSymbolSubset` eagerly resolves **all cross-file references for all files** even though most are never accessed by the user.

## Current Resolution Triggers

### 1. Workspace Batch Load
- **Location**: `WorkspaceBatchCompile` → `writeBackCompiledSymbols` → `UpdateSymbolSubset`
- **Scope**: ALL files (648 files × 243s = 7 minutes)
- **Necessity**: ❌ NOT needed until user requests find-all-refs/rename/goto-def

### 2. File Open (didOpen)
- **Location**: `processDocumentOpenSingle` → compile → `addSymbolTable` → `resolveCrossFileReferencesForFile`
- **Current Behavior**: "Full resolution" for opened file
- **Question**: What does "full resolution" mean?
  - Resolves all unresolved references in that ONE file?
  - Or cascades to resolve all files that reference this file?

### 3. File Change (didChange)
- **Location**: Similar to didOpen
- **Current Behavior**: Re-resolves references in changed file

## LSP Operations Requiring Cross-File Data

### Find All References (`textDocument/references`)
**User clicks on**: `MyClass` (could be declaration or reference)
**Needs**:
- **Forward**: All places that reference `MyClass` (reverse index)
- **Reverse**: If user clicked on a reference, resolve to declaration first
**Resolution Scope**: 
- Resolve the clicked symbol → its declaration
- Query reverse index for all references to that declaration
- **Does NOT need to resolve OTHER files' references**

### Rename Symbol (`textDocument/rename`)
**User renames**: `myMethod` → `myNewMethod`
**Needs**: Same as find-all-references
**Resolution Scope**: Identical to references

### Go To Definition (`textDocument/definition`)
**User clicks on**: `SomeClass.someMethod()`
**Needs**: 
- **Forward only**: Resolve this ONE reference to its declaration
**Resolution Scope**: 
- Single reference → single declaration
- **Does NOT need to resolve anything else**

### Hover (`textDocument/hover`)
**User hovers on**: `SomeClass`
**Needs**:
- Type information for the symbol under cursor
- May need declaration if hovering on a reference
**Resolution Scope**:
- Single reference → single declaration (if needed)
- **Does NOT need to resolve anything else**

### Code Completion (`textDocument/completion`)
**User types**: `myObj.` and triggers completion
**Needs**:
- Type of `myObj`
- Members of that type
**Resolution Scope**:
- Resolve type of `myObj`
- Load members from that type's symbol table
- **Does NOT need to resolve references IN those members**

### Document Symbols (`textDocument/documentSymbol`)
**User opens outline view**
**Needs**:
- Symbol tree for current file only
**Resolution Scope**:
- **NONE** - purely local file data

### Diagnostics (computed on open/change)
**User opens/edits file**
**Needs**:
- Type checking (does this reference resolve to a valid symbol?)
- Inheritance validation (does this class extend/implement valid types?)
**Resolution Scope**:
- Resolve references IN THIS FILE to their declarations
- **Does NOT need to resolve WHO ELSE references this file**

## Key Insight: Directionality

Cross-file resolution has TWO directions:
1. **Forward** (reference → declaration): "What does this reference point to?"
2. **Reverse** (declaration → references): "Who references this declaration?"

Most LSP operations only need **forward** resolution:
- Hover: forward only
- Go-to-definition: forward only  
- Completion: forward only
- Diagnostics: forward only

Only find-all-references and rename need **reverse** resolution, and even then only for the ONE symbol the user asked about, not all symbols.

## Existing Infrastructure for Lazy Resolution

The system already has comprehensive indexes:
- ✅ `symbolIdIndex`: symbolID → symbol (O(1))
- ✅ `nameIndex`: name → symbolIDs[] (forward lookup)
- ✅ `reverseIndex`: symbolID → referencingSymbolIDs[] (reverse lookup)
- ✅ `forwardIndex`: fileUri → outgoingRefs[]
- ✅ `fqnIndex`: FQN → symbolIDs[]
- ✅ `fileIndex`: fileUri → symbolIDs[]
- ✅ `refStore`: full reference metadata

These indexes are populated during compilation **without** resolution - they contain unresolved references.

## Proposed Lazy Resolution Strategy

### Phase 1: Eliminate Eager Workspace-Load Resolution
**Change**: `UpdateSymbolSubset` during workspace session should:
1. ✅ Add symbols to indexes
2. ✅ Store unresolved references in refStore
3. ❌ **SKIP** `resolveCrossFileReferencesForFile`

**Result**: Workspace load finishes in 2.75s and UI is responsive immediately

### Phase 2: Add On-Demand Resolution to LSP Handlers

#### For Hover/Definition/Completion (Forward Only)
```typescript
// Pseudo-code
function handleGoToDefinition(uri: string, position: Position) {
  // 1. Find symbol at cursor (local operation)
  const symbolRef = findSymbolAtPosition(uri, position);
  
  // 2. If it's already resolved, done
  if (symbolRef.resolvedSymbolId) {
    return getSymbol(symbolRef.resolvedSymbolId);
  }
  
  // 3. Resolve THIS ONE reference on-demand
  const targetSymbol = resolveReference(symbolRef); // Uses nameIndex/fqnIndex
  
  // 4. Cache the resolution (update symbolRef.resolvedSymbolId)
  cacheResolution(symbolRef, targetSymbol);
  
  return targetSymbol;
}
```

**Resolution Scope**: ONE reference → ONE declaration (microseconds, not seconds)

#### For References/Rename (Forward + Reverse)
```typescript
// Pseudo-code
function handleFindReferences(uri: string, position: Position) {
  // 1. Find symbol at cursor
  const symbol = findSymbolAtPosition(uri, position);
  
  // 2. If cursor is on a reference, resolve to declaration first (forward)
  const declSymbol = symbol.isDeclaration 
    ? symbol 
    : resolveReference(symbol);
  
  // 3. Query reverse index for all references (O(1) lookup)
  const refIds = reverseIndex.get(declSymbol.id); // Already populated!
  
  // 4. Load reference details from refStore
  const refs = refIds.map(id => refStore.get(id));
  
  return refs;
}
```

**Resolution Scope**: ONE symbol's references (already indexed, no cascade)

### Phase 3: Handle didOpen Without Cascade

**Current**: didOpen calls `resolveCrossFileReferencesForFile(uri)`

**Question**: Does this resolve:
- (A) All references **IN** this file → their declarations? (bounded, acceptable)
- (B) All references **TO** this file from other files? (unbounded, cascading)

**If (A)**: Keep it, but optimize to resolve lazily per-reference on first access
**If (B)**: Eliminate it entirely - reverse resolution should be on-demand only

Need to investigate: What does `resolveCrossFileReferencesForFile` actually do?

## Critical Questions to Answer

1. **didOpen "full resolution" scope**: Does it cascade beyond the opened file?
2. **Cascade prevention**: When resolving one reference, does it trigger resolution of the target file's references?
3. **Index completeness**: Are the existing indexes sufficient for on-demand resolution, or do they require eager resolution to populate?
4. **Cache invalidation**: When a file changes, what resolution state must be invalidated?

## Expected Impact

**Before**:
- Workspace load: 2.75s ingest + 7 min resolution = 7+ min total freeze

**After**:
- Workspace load: 2.75s ingest, UI responsive immediately
- First hover/definition: ~1-10ms (resolve one reference)
- First find-all-refs: ~10-100ms (query reverse index + load details)
- Subsequent operations: cached, <1ms

## Next Steps

1. **Investigate `resolveCrossFileReferencesForFile` implementation** to understand:
   - What it resolves (just this file's outgoing refs? or cascade?)
   - Whether it can be decomposed into per-reference lazy resolution
   
2. **Add resolution-scope guards** to prevent cascade:
   - `resolveReference(ref)` should resolve ONLY that ref, not trigger resolution of the target file
   
3. **Add workspace-session-aware skip** to `UpdateSymbolSubset`:
   - During workspace session: skip `resolveCrossFileReferencesForFile`
   - After workspace session: still skip (rely on on-demand)
   
4. **Add on-demand resolution** to LSP handlers:
   - Hover, definition, completion: resolve forward on-demand
   - References, rename: query reverse index (already populated)

5. **Test with 648-file workspace**:
   - Measure workspace load time (should stay ~2.75s)
   - Measure first hover time (should be <50ms)
   - Measure first find-all-refs time (should be <200ms)
   - Verify UI stays responsive throughout
