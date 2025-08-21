# SymbolLocation Migration Plan

## Overview

The `SymbolLocation` interface in the `@salesforce/apex-lsp-parser-ast` package has been refactored from a flat structure to a nested structure with two `Range` objects. This migration plan addresses the compilation errors and provides guidance on choosing the appropriate range for different LSP service contexts.

## Current State

### Old SymbolLocation Structure (Deprecated)

```typescript
export interface SymbolLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}
```

### New SymbolLocation Structure (Current)

```typescript
export interface SymbolLocation {
  symbolRange: Range;
  identifierRange: Range;
}

export type Range = {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
};
```

## Migration Strategy

### 1. Range Selection Guidelines

#### Use `symbolRange` when:

- **Full symbol coverage** is needed (e.g., entire method, class, field)
- **Document symbols** for outline views
- **Folding ranges** for code folding
- **Error highlighting** across the entire symbol
- **Range-based operations** that need complete symbol boundaries

#### Use `identifierRange` when:

- **Precise positioning** is needed (e.g., cursor position, selection)
- **Hover information** at exact symbol location
- **Go to definition** for the symbol name
- **Find references** for the specific identifier
- **Code completion** and **signature help**

### 2. Context-Specific Migration Patterns

#### Document Symbol Provider

```typescript
// Before
line: location.startLine,
character: location.startColumn,

// After - Use symbolRange for full symbol coverage
line: location.symbolRange.startLine,
character: location.symbolRange.startColumn,
```

#### Hover Service

```typescript
// Before
line: location.startLine,
character: location.startColumn,

// After - Use identifierRange for precise positioning
line: location.identifierRange.startLine,
character: location.identifierRange.startColumn,
```

#### Definition/References Service

```typescript
// Before
line: location.startLine,
character: location.startColumn,

// After - Use identifierRange for precise positioning
line: location.identifierRange.startLine,
character: location.identifierRange.startColumn,
```

#### Folding Range Provider

```typescript
// Before
startLine: comment.startLine,
endLine: comment.endLine,

// After - Use symbolRange for full range coverage
startLine: comment.location.symbolRange.startLine,
endLine: comment.location.symbolRange.endLine,
```

## Files Requiring Migration

### 1. High Priority (Compilation Errors)

- `src/definition/ApexDefinitionUpserter.ts` - Lines 58-59
- `src/documentSymbol/ApexDocumentSymbolProvider.ts` - Lines 405-437
- `src/foldingRange/ApexFoldingRangeProvider.ts` - Lines 140-153
- `src/references/ApexReferencesUpserter.ts` - Lines 57-58

### 2. Medium Priority (Potential Issues)

- `src/services/DefinitionProcessingService.ts` - Lines 218-225
- `src/services/ReferencesProcessingService.ts` - Lines 191-218
- Any other services using `symbol.location` properties directly

### 3. Low Priority (Type Safety)

- Interface definitions and type declarations
- Test files and mocks
- Documentation and comments

## Migration Steps

### Phase 1: Fix Compilation Errors

1. **Update direct property access** to use appropriate range
2. **Choose correct range** based on service context
3. **Verify compilation** succeeds

### Phase 2: Optimize Range Usage

1. **Review range selection** for each service context
2. **Optimize for performance** where appropriate
3. **Add range selection utilities** for common patterns

### Phase 3: Testing and Validation

1. **Run existing tests** to ensure functionality preserved
2. **Add new tests** for range selection logic
3. **Validate LSP behavior** in real scenarios

## Detailed Migration Examples

### Example 1: Definition Upserter

```typescript
// Before
const reference: ApexReference = {
  sourceFile: documentUri,
  targetSymbol: symbol.name,
  line: symbol.location.startLine, // ❌ Deprecated
  column: symbol.location.startColumn, // ❌ Deprecated
  referenceType: 'type-reference',
};

// After - Use identifierRange for precise positioning
const reference: ApexReference = {
  sourceFile: documentUri,
  targetSymbol: symbol.name,
  line: symbol.location.identifierRange.startLine, // ✅ Precise positioning
  column: symbol.location.identifierRange.startColumn, // ✅ Precise positioning
  referenceType: 'type-reference',
};
```

### Example 2: Document Symbol Provider

```typescript
// Before
const endPosition = transformParserToLspPosition({
  line: location.endLine, // ❌ Deprecated
  character: location.endColumn, // ❌ Deprecated
});

// After - Use symbolRange for full symbol coverage
const endPosition = transformParserToLspPosition({
  line: location.symbolRange.endLine, // ✅ Full symbol range
  character: location.symbolRange.endColumn, // ✅ Full symbol range
});
```

### Example 3: Folding Range Provider

```typescript
// Before
if (comment.endLine > comment.startLine) {
  // ❌ Deprecated
  blockCommentRanges.push({
    startLine: comment.startLine, // ❌ Deprecated
    endLine: comment.endLine, // ❌ Deprecated
  });
}

// After - Use location.symbolRange for comment ranges
if (
  comment.location.symbolRange.endLine > comment.location.symbolRange.startLine
) {
  blockCommentRanges.push({
    startLine: comment.location.symbolRange.startLine, // ✅ Full comment range
    endLine: comment.location.symbolRange.endLine, // ✅ Full comment range
  });
}
```

## Utility Functions

### Range Selection Helper

```typescript
/**
 * Get the appropriate range for a given LSP service context
 */
export function getRangeForContext(
  location: SymbolLocation,
  context: 'symbol' | 'identifier' | 'auto',
): Range {
  switch (context) {
    case 'symbol':
      return location.symbolRange;
    case 'identifier':
      return location.identifierRange;
    case 'auto':
      // Auto-select based on service type
      return location.identifierRange; // Default to precise positioning
    default:
      return location.identifierRange;
  }
}
```

### Migration Helper

```typescript
/**
 * Migrate old location access to new structure
 */
export function migrateLocationAccess(
  oldAccess: string,
  context: 'symbol' | 'identifier',
): string {
  const range = context === 'symbol' ? 'symbolRange' : 'identifierRange';

  return oldAccess
    .replace(/\.startLine/g, `.${range}.startLine`)
    .replace(/\.endLine/g, `.${range}.endLine`)
    .replace(/\.startColumn/g, `.${range}.startColumn`)
    .replace(/\.endColumn/g, `.${range}.endColumn`);
}
```

## Testing Strategy

### 1. Unit Tests

- **Range selection logic** for different contexts
- **Migration helper functions**
- **Edge cases** (missing ranges, invalid data)

### 2. Integration Tests

- **LSP service behavior** with new ranges
- **Cross-service consistency** in range usage
- **Performance impact** of range selection

### 3. End-to-End Tests

- **Real LSP scenarios** (hover, definition, references)
- **Editor integration** (VS Code, Neovim, etc.)
- **User experience** validation

## Rollback Plan

### 1. Immediate Rollback

- **Revert to previous commit** if critical issues arise
- **Maintain backward compatibility** during transition
- **Feature flags** for range selection logic

### 2. Gradual Rollback

- **Service-by-service** rollback if needed
- **Hybrid approach** supporting both structures
- **Deprecation warnings** for old usage

## Success Criteria

### 1. Technical

- ✅ **Compilation succeeds** without errors
- ✅ **All tests pass** with new structure
- ✅ **Performance maintained** or improved
- ✅ **Type safety** improved

### 2. Functional

- ✅ **LSP services work** as expected
- ✅ **Range selection** appropriate for context
- ✅ **User experience** maintained or improved
- ✅ **No regressions** in existing functionality

### 3. Maintainability

- ✅ **Code clarity** improved
- ✅ **Range selection** logic centralized
- ✅ **Documentation** updated
- ✅ **Future changes** easier to implement

## Timeline

### Week 1: Analysis and Planning

- [ ] Complete impact analysis
- [ ] Finalize migration strategy
- [ ] Create utility functions
- [ ] Set up testing framework

### Week 2: Core Migration

- [ ] Fix compilation errors
- [ ] Update high-priority files
- [ ] Implement range selection logic
- [ ] Basic testing

### Week 3: Optimization and Testing

- [ ] Optimize range usage
- [ ] Comprehensive testing
- [ ] Performance validation
- [ ] Documentation updates

### Week 4: Validation and Deployment

- [ ] End-to-end testing
- [ ] User acceptance testing
- [ ] Performance monitoring
- [ ] Rollout planning

## Risk Assessment

### High Risk

- **Breaking changes** in LSP behavior
- **Performance degradation** from range selection
- **User experience** regression

### Medium Risk

- **Test coverage** gaps
- **Edge case** handling
- **Integration issues** with other packages

### Low Risk

- **Code compilation** errors
- **Type safety** improvements
- **Maintainability** enhancements

## Mitigation Strategies

### 1. Breaking Changes

- **Comprehensive testing** before deployment
- **Gradual rollout** with monitoring
- **User feedback** collection

### 2. Performance Issues

- **Benchmarking** before and after
- **Performance testing** in CI/CD
- **Monitoring** in production

### 3. Integration Issues

- **Cross-package testing** in monorepo
- **Compatibility matrix** documentation
- **Version coordination** with dependent packages

## Conclusion

This migration represents a significant improvement in the type safety and clarity of the `SymbolLocation` interface. By providing separate ranges for symbol boundaries and identifier positions, LSP services can make more informed decisions about which range to use for different contexts.

The migration should be approached systematically, with careful attention to the context in which each range is used. The benefits include:

1. **Better type safety** with explicit range selection
2. **Improved performance** through appropriate range usage
3. **Enhanced user experience** with precise positioning
4. **Easier maintenance** with clear range semantics

Success depends on thorough testing, careful range selection, and maintaining backward compatibility during the transition period.
