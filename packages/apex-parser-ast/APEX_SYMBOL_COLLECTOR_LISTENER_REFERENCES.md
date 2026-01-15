# ApexSymbolCollectorListener References

This document tracks all references to the deprecated `ApexSymbolCollectorListener` class across the codebase.

## Status

`ApexSymbolCollectorListener` is **deprecated** and should be replaced with `FullSymbolCollectorListener` or `VisibilitySymbolListener` depending on use case.

## Production Source Files

### 1. `packages/apex-parser-ast/src/index.ts`
- **Line 15**: Exports `ApexSymbolCollectorListener`
- **Action**: Keep export for backward compatibility, but mark as deprecated

### 2. `packages/apex-parser-ast/src/parser/compilerService.ts`
- **Line 44**: Imports `ApexSymbolCollectorListener`
- **Line 183**: `instanceof` check for `ApexSymbolCollectorListener`
- **Line 224**: `instanceof` check for `ApexSymbolCollectorListener`
- **Action**: These checks are used to set `enableReferenceCorrection` flag. Both `ApexSymbolCollectorListener` and `FullSymbolCollectorListener` support this, so the checks are valid for backward compatibility.

### 3. `packages/apex-parser-ast/src/parser/listeners/VisibilitySymbolListener.ts`
- **Line 709**: Comment referencing `ApexSymbolCollectorListener` pattern
- **Line 901**: Comment referencing `ApexSymbolCollectorListener` pattern
- **Line 1247**: Comment referencing `ApexSymbolCollectorListener` pattern
- **Action**: Comments only - no code changes needed

### 4. `packages/apex-parser-ast/src/parser/listeners/ApexReferenceCollectorListener.ts`
- **Line 1611**: Comment referencing `ApexSymbolCollectorListener`
- **Action**: Comment only - no code changes needed

### 5. `packages/lsp-compliant-services/src/services/DocumentStateCache.ts`
- **Line 31**: Comment referencing `ApexSymbolCollectorListener` results
- **Line 39**: Comment referencing `ApexSymbolCollectorListener` results
- **Action**: Comments only - no code changes needed

## Test Files

### High Priority (Core Functionality Tests)
- `packages/apex-parser-ast/test/parser/constructor-validation.test.ts` - Tests constructor validation
- `packages/apex-parser-ast/test/parser/classSymbolCollector.test.ts` - Tests class symbol collection
- `packages/apex-parser-ast/test/parser/ApexSymbolCollectorListener.scopeHierarchy.test.ts` - Tests scope hierarchy
- `packages/apex-parser-ast/test/parser/ApexSymbolCollectorListener.namespace.test.ts` - Tests namespace handling

### Medium Priority (Symbol Manager Tests)
- `packages/apex-parser-ast/test/symbols/ApexSymbolManager.*.test.ts` - Multiple files testing symbol manager functionality
- `packages/apex-parser-ast/test/utils/ApexSymbolManager.test.ts` - Utility tests

### Lower Priority (Integration Tests)
- `packages/lsp-compliant-services/test/documentSymbol/ApexDocumentSymbolProvider.integration.test.ts` - Document symbol provider tests
- `packages/lsp-compliant-services/test/integration/HoverProcessingService.integration.test.ts` - Hover service tests
- `packages/lsp-compliant-services/test/services/ReferencesProcessingService.test.ts` - References service tests
- `packages/lsp-compliant-services/test/services/CompletionProcessingService.test.ts` - Completion service tests

## Migration Strategy

1. **Production Code**: Keep `ApexSymbolCollectorListener` exported and `instanceof` checks for backward compatibility
2. **New Tests**: Use `FullSymbolCollectorListener` (see `constructor-parentId.test.ts` as example)
3. **Existing Tests**: Migrate gradually, starting with core functionality tests
4. **Documentation**: Update comments to reference `FullSymbolCollectorListener` where appropriate

## Notes

- `FullSymbolCollectorListener` wraps `VisibilitySymbolListener` instances and provides feature parity
- For public API only use cases, consider `PublicAPISymbolListener` for better performance
- The `instanceof` checks in `compilerService.ts` are necessary for backward compatibility
