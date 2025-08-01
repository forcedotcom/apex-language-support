# HoverProcessingService Refactor Tracking Document

## Overview

This document tracks the refactoring of `HoverProcessingService` to eliminate duplication and reuse functionality already present in the `@salesforce/apex-lsp-parser-ast` package.

## Goals

1. **Eliminate Code Duplication**: Remove ~800 lines of duplicated logic
2. **Improve Maintainability**: Single source of truth for symbol resolution
3. **Enhance Accuracy**: Use AST-based TypeReference data instead of text parsing
4. **Boost Performance**: Leverage pre-computed relationships and caching
5. **Ensure Consistency**: Unified behavior across all LSP services

## Phases Overview

| Phase | Description                           | Impact | Risk   | Est. Time | Status         |
| ----- | ------------------------------------- | ------ | ------ | --------- | -------------- |
| 1     | Replace Context Analysis Methods      | High   | Low    | 2-3h      | ✅ Completed   |
| 2     | Replace Position-Based Symbol Finding | High   | Low    | 2-3h      | ✅ Completed   |
| 3     | Replace FQN Construction Logic        | Medium | Medium | 2-3h      | ✅ Completed   |
| 4     | Replace Cross-File Symbol Resolution  | Medium | Medium | 2-3h      | 🔄 In Progress |
| 5     | Replace Symbol Resolution Logic       | Medium | Medium | 1-2h      | ⏳ Pending     |
| 6     | Replace Text Extraction Logic         | Low    | Low    | 1-2h      | ⏳ Pending     |

## Detailed Phase Breakdown

### Phase 1: Replace Context Analysis Methods

**Target Methods to Remove:**

- `createResolutionContext()` (lines 1519-1533)
- `determineCurrentScope()` (lines 1803-1851)
- `buildScopeChain()` (lines 1852-1883)
- `inferExpectedType()` (lines 1884-1934)
- `extractParameterTypes()` (lines 1935-1961)
- `determineAccessModifier()` (lines 1962-1985)
- `determineIsStatic()` (lines 1986-2003)
- `extractInheritanceChain()` (lines 2004-2022)
- `extractInterfaceImplementations()` (lines 2023-2041)
- `extractImportStatements()` (lines 1761-1802)
- `extractNamespaceContext()` (lines 2042-2059)

**Replacement:**

```typescript
private createResolutionContext(document: TextDocument, params: HoverParams) {
  return this.symbolManager.createResolutionContext(
    document.getText(),
    params.position,
    document.uri
  );
}
```

**Parser Package Methods to Use:**

- `ApexSymbolManager.createResolutionContext()`
- All private context analysis methods in ApexSymbolManager

**Status:** ✅ Completed
**Started:** 2025-01-27
**Completed:** 2025-01-27

### Phase 2: Replace Position-Based Symbol Finding

**Target Methods to Remove:**

- `findSymbolsAtPosition()` (lines 200-350)
- `convertTypeReferencesToSymbols()` (lines 350-400)

**Replacement:**

```typescript
private findSymbolsAtPosition(document: TextDocument, position: any): any[] | null {
  const typeReferences = this.symbolManager.getReferencesAtPosition(
    document.uri,
    position
  );

  if (typeReferences.length === 0) {
    return null;
  }

  return this.convertTypeReferencesToSymbols(typeReferences, document.uri);
}
```

**Parser Package Methods to Use:**

- `ApexSymbolManager.getReferencesAtPosition()`

**Status:** ✅ Completed
**Started:** 2025-01-27
**Completed:** 2025-01-27

### Phase 3: Replace FQN Construction Logic

**Target Methods to Remove:**

- Complex FQN construction logic in `createHoverInformation()` (lines 1600-1650)

**Replacement:**

```typescript
// Use symbol manager's hierarchical FQN construction
let fqn = this.symbolManager.constructFQN(symbol);
```

**Parser Package Methods to Use:**

- `ApexSymbolManager.constructFQN()`
- `FQNUtils.calculateFQN()`

**Status:** ✅ Completed
**Started:** 2025-01-27
**Completed:** 2025-01-27

### Phase 4: Replace Cross-File Symbol Resolution

**Target Methods to Remove:**

- `findCrossFileSymbols()` (lines 400-500)
- `resolveCrossFileSymbolsFromReferences()` (lines 500-550)
- `resolveSymbolsUsingRelationships()` (lines 550-600)
- `findRelatedSymbolsUsingContext()` (lines 600-650)

**Replacement:**

```typescript
private findCrossFileSymbols(document: TextDocument, position: any, context: any): any[] | null {
  const typeReferences = this.symbolManager.getReferencesAtPosition(
    document.uri,
    position
  );

  if (typeReferences.length === 0) {
    return null;
  }

  return this.resolveCrossFileSymbolsUsingSymbolManager(typeReferences, context);
}
```

**Parser Package Methods to Use:**

- `ApexSymbolManager.findRelatedSymbols()`
- `ApexSymbolManager.findReferencesTo()`
- `ApexSymbolManager.findReferencesFrom()`

**Status:** ⏳ Pending
**Started:** TBD
**Completed:** TBD

### Phase 5: Replace Symbol Resolution Logic

**Target Methods to Remove:**

- `resolveBestSymbol()` (lines 650-800)
- `analyzeApexContext()` (lines 800-900)
- `analyzeStaticInstanceContext()` (lines 900-950)
- `analyzeTypeContext()` (lines 950-1000)
- `analyzeInheritanceContext()` (lines 1000-1050)
- `analyzeAccessModifierContext()` (lines 1050-1100)

**Replacement:**

```typescript
private resolveBestSymbol(symbols: any[], context: any): { symbol: any; confidence: number } | null {
  const resolutionResult = this.symbolManager.resolveSymbol(
    symbols[0].name,
    context
  );

  return {
    symbol: resolutionResult.symbol,
    confidence: resolutionResult.confidence
  };
}
```

**Parser Package Methods to Use:**

- `ApexSymbolManager.resolveSymbol()`

**Status:** ⏳ Pending
**Started:** TBD
**Completed:** TBD

### Phase 6: Replace Text Extraction Logic

**Target Methods to Remove:**

- `extractSymbolNamesFromLine()` (lines 1100-1200)

**Replacement:**

```typescript
private extractSymbolNamesFromTypeReferences(typeReferences: TypeReference[]): string[] {
  return typeReferences.map(ref => ref.name);
}
```

**Parser Package Methods to Use:**

- TypeReference data from `getReferencesAtPosition()`

**Status:** ⏳ Pending
**Started:** TBD
**Completed:** TBD

## Testing Strategy

### Unit Tests

- [ ] Verify each phase maintains existing functionality
- [ ] Test edge cases and error conditions
- [ ] Ensure performance is maintained or improved

### Integration Tests

- [ ] Run existing hover integration tests
- [ ] Verify cross-file symbol resolution still works
- [ ] Test FQN construction accuracy

### Manual Testing

- [ ] Test hover functionality in VS Code extension
- [ ] Verify hover information accuracy
- [ ] Test with various Apex code patterns

## Risk Mitigation

### High Risk Areas

- **Phase 4 (Cross-File Resolution)**: Complex logic, potential for breaking changes
- **Phase 5 (Symbol Resolution)**: Core functionality, affects all hover operations

### Mitigation Strategies

1. **Incremental Implementation**: Complete each phase before moving to next
2. **Comprehensive Testing**: Test after each phase completion
3. **Fallback Logic**: Keep original methods as fallbacks during transition
4. **Interface Compatibility**: Maintain existing public API during refactor

## Success Criteria

### Code Quality

- [ ] Remove ~800 lines of duplicated code
- [ ] Maintain or improve test coverage
- [ ] No new linting errors introduced

### Functionality

- [ ] All existing hover tests pass
- [ ] No regression in hover accuracy
- [ ] Performance maintained or improved

### Maintainability

- [ ] Single source of truth for symbol resolution
- [ ] Clear separation of concerns
- [ ] Improved code readability

## Progress Tracking

### Completed Work

- [x] Analysis and planning
- [x] Tracking document creation
- [x] Phase 1 - createResolutionContext replacement
- [x] Phase 1 - Remove duplicated context analysis methods
- [x] Phase 2 - Replace position-based symbol finding
- [x] Phase 3 - Replace FQN construction logic
- [ ] Phase 4 implementation
- [ ] Phase 5 implementation
- [ ] Phase 6 implementation
- [ ] Final testing and validation

### Current Status

**Phase:** 4 - Replace Cross-File Symbol Resolution
**Status:** 🔄 In Progress
**Next Steps:** Replace findCrossFileSymbols and related methods with parser package functionality

## Notes and Decisions

### Key Decisions Made

1. **Incremental Approach**: Implement phases sequentially to minimize risk
2. **Interface Preservation**: Maintain existing public API during refactor
3. **Testing Priority**: Comprehensive testing after each phase

### Technical Notes

- Using `ApexSymbolManager` as the primary source for symbol operations
- Leveraging `TypeReference` data for precise position-based resolution
- Maintaining backward compatibility during transition

### Future Considerations

- Consider extracting common LSP service patterns after refactor
- Evaluate potential for similar refactors in other services
- Document lessons learned for future refactoring efforts

---

**Last Updated:** 2025-01-27
**Next Review:** After Phase 4 completion
