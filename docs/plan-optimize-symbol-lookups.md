# Plan: Optimize O(n) Symbol Lookups to O(1)

**GUS Work Item:** [a07EE00002V8M6EYAV](https://gus.lightning.force.com/lightning/r/ADM_Work__c/a07EE00002V8M6EYAV/view)

## Problem

There are 150+ occurrences of `getAllSymbols().find()` across parser listeners and validators. These are O(n) linear scans over all symbols in a file. When called during parse tree walking (which visits every node), overall complexity approaches O(n²) for large files.

## Impact

For a file with 1,000 symbols:
- Each `getAllSymbols().find()` is ~1,000 comparisons
- `BlockContentListener` alone has 19 such calls in hot parse-time paths
- A single parse pass could trigger thousands of O(n) lookups

## Optimization Categories

### Category 1: Direct ID Lookups — Replace with `getSymbolById()` (~45 occurrences)

These are straightforward `allSymbols.find((s) => s.id === someId)` patterns where `getSymbolById()` provides O(1) lookup.

**Pattern:**
```typescript
// Before — O(n)
const parent = allSymbols.find((s) => s.id === current.parentId);

// After — O(1)
const parent = symbolTable.getSymbolById(current.parentId);
```

**Files and locations:**

| File | Lines | Count |
|------|-------|-------|
| `VariableShadowingValidator.ts` | 103, 168, 205, 317, 341 | 5 |
| `DuplicateSymbolValidator.ts` | 105, 196, 263 | 3 |
| `VariableResolutionValidator.ts` | 965, 1377 | 2 |
| `MethodResolutionValidator.ts` | 1108, 1260, 1291 | 3 |
| `MethodOverrideValidator.ts` | 80, 251, 261 | 3 |
| `MethodModifierRestrictionValidator.ts` | 54, 60 | 2 |
| `MethodTypeClashValidator.ts` | 83 | 1 |
| `ConstructorValidator.ts` | 1156, 1162, 1196 | 3 |
| `InnerTypeValidator.ts` | 132 | 1 |
| `NewExpressionValidator.ts` | 179 | 1 |
| `FinalAssignmentValidator.ts` | 116, 167 | 2 |
| `ForwardReferenceValidator.ts` | 88 | 1 |
| `DuplicateAnnotationMethodValidator.ts` | 119 | 1 |
| `DuplicateMethodValidator.ts` | 85 | 1 |
| `AuraEnabledValidator.ts` | 123 | 1 |
| `SwitchStatementValidator.ts` | 332 | 1 |
| `StaticContextValidator.ts` | 614 | 1 |
| `AbstractMethodBodyValidator.ts` | 93, 98, 103, 105 | 4 |
| `AbstractMethodImplementationValidator.ts` | 52, 65 | 2 |
| `MethodSignatureEquivalenceValidator.ts` | 103 | 1 |
| `VisibilitySymbolListener.ts` | 1170 | 1 |
| `ApexSymbolCollectorListener.ts` | 707, 6113 | 2 |

### Category 2: ID Lookup + Property Filter (~35 occurrences)

These search by `parentId` but also filter by `scopeType`, `kind`, or other properties. Optimize by using `getSymbolById()` followed by a property check.

**Pattern:**
```typescript
// Before — O(n)
const classBlock = allSymbols.find(
  (s) => s.parentId === typeSymbol.id && (s as any).scopeType === 'class'
);

// After — O(1) lookup + O(1) property check
const candidate = symbolTable.getSymbolById(typeSymbol.id);
// Then iterate children if needed, or use a children index
```

**Note:** Some of these search for a child with a specific parentId, which is the inverse of `getSymbolById()`. These require a `getChildrenById(parentId)` index. See Category 4.

**Files and locations:**

| File | Lines | Pattern |
|------|-------|---------|
| `BlockContentListener.ts` | 1291, 1323, 1482, 1526, 1710, 1756, 1780, 2009 | parentId + scopeType |
| `ApexSymbolCollectorListener.ts` | 7628, 7657, 7818, 7862 | parentId + kind |
| `MethodResolutionValidator.ts` | 100, 156, 295, 753, 761, 1302 | parentId + scopeType |
| `MethodOverrideValidator.ts` | 111, 255 | parentId + scopeType |
| `StaticContextValidator.ts` | 218, 223, 535, 577 | parentId + kind/scopeType |
| `NewExpressionValidator.ts` | 123, 198, 257, 263 | parentId + scopeType |
| `AbstractMethodImplementationValidator.ts` | 58, 95, 233 | parentId + scopeType |
| `AbstractMethodBodyValidator.ts` | 83 | parentId + scopeType |
| `InnerTypeValidator.ts` | 144 | parentId + scopeType |
| `VariableResolutionValidator.ts` | 247, 1119, 1208 | parentId + kind |
| `VisibilitySymbolListener.ts` | 1194 | parentId + scopeType |

### Category 3: Name-Based Lookups (~70 occurrences)

These search by name, kind, or complex predicates and genuinely require iteration over a subset of symbols.

**Optimization approach:** Add a `getSymbolsByName(name: string)` index to `SymbolTable` (similar to how `GlobalTypeRegistry` provides `resolveType()` for cross-file types). This would convert O(n) full-table scans to O(1) hash lookups + O(k) where k is the number of symbols with that name (typically 1-3).

**Files and locations (representative):**

| File | Lines | Pattern |
|------|-------|---------|
| `BlockContentListener.ts` | 1300, 1312, 1491, 1503, 1515, 1720, 1732, 1745, 2019, 2032 | name + kind |
| `ApexSymbolCollectorListener.ts` | 7618, 7636, 7667, 7677, 7883, 7896, 7915 | name + kind |
| `MethodResolutionValidator.ts` | 287, 900, 1511, 1855 | name + kind (Variable) |
| `ConstructorValidator.ts` | 791 | name + kind (Variable) |
| `TypeAssignmentValidator.ts` | 513, 517, 592, 595, 608, 611, 686 | kind filter on name results |
| `SwitchStatementValidator.ts` | 379 | name + kind (EnumValue) |
| `NewExpressionValidator.ts` | 135, 147, 185 | name + kind (Class/Interface) |

### Category 4: New Index — `getChildrenByParentId(parentId)`

Many Category 2 lookups search for a child of a known parent. A `Map<string, ApexSymbol[]>` indexed by `parentId` would convert these from O(n) to O(k) where k is the number of children (typically < 10).

**Implementation:**
```typescript
class SymbolTable {
  private childrenIndex: Map<string, ApexSymbol[]> = new Map();

  addSymbol(symbol: ApexSymbol): void {
    // ... existing logic ...
    if (symbol.parentId) {
      const children = this.childrenIndex.get(symbol.parentId) ?? [];
      children.push(symbol);
      this.childrenIndex.set(symbol.parentId, children);
    }
  }

  getChildrenByParentId(parentId: string): ApexSymbol[] {
    return this.childrenIndex.get(parentId) ?? [];
  }
}
```

## Execution Strategy

### Phase 1: Direct ID Lookups (Low risk, high impact)
1. Replace all ~45 `allSymbols.find((s) => s.id === X)` with `getSymbolById(X)`
2. Compile and lint after each file
3. Run tests to verify no regressions

### Phase 2: Add `getChildrenByParentId` Index
1. Add `childrenIndex` to `SymbolTable`
2. Populate during `addSymbol()` and clear during `removeSymbol()`
3. Replace ~35 parentId + filter lookups
4. Verify with existing tests

### Phase 3: Add `getSymbolsByName` Index
1. Add `nameIndex` to `SymbolTable`
2. Populate during `addSymbol()`
3. Replace ~70 name-based lookups
4. Verify with existing tests

### Phase 4: Verify Performance
1. Run existing performance benchmarks
2. Measure parse time for large files (1000+ symbols)
3. Document improvements

## Expected Impact

- **Phase 1**: ~45 lookups go from O(n) to O(1) — immediate improvement for parent traversals
- **Phase 2**: ~35 additional lookups optimized — significant improvement for block/scope resolution
- **Phase 3**: ~70 name lookups optimized — major improvement for name resolution during validation
- **Overall**: Parse-time complexity for large files drops from O(n²) toward O(n)
