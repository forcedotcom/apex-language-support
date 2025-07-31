# Type Reference Capture Design

## Overview

This document outlines the design for capturing type references during parsing while maintaining lazy loading constraints. The goal is to improve hover accuracy by capturing structural information about type references without performing resolution during parsing time.

## Problem Statement

Currently, the `ApexSymbolCollectorListener` only captures **declarations** (classes, methods, variables), but not **references** (method calls, type usages, field access). This forces the hover service to:

1. Extract identifiers from text lines
2. Perform cross-file symbol lookups
3. Guess which symbol is the correct one

This approach is less precise and more error-prone than having actual AST references.

## Design Goals

- **Capture structural information** during parsing without resolution
- **Maintain lazy loading** - no cross-file lookups during parsing
- **Improve hover accuracy** with precise location information
- **Preserve performance** by avoiding resolution overhead

## Type Reference Categories

### 1. Method Call References

```apex
FileUtilities.createFile(base64Data, fileName, recordId)
```

- **Class reference**: `FileUtilities` (qualifier)
- **Method reference**: `createFile` (target)
- **Context**: method_call

### 2. Type Declaration References

```apex
Property__c property = new Property__c();
String contentDocumentLinkId;
```

- **Type reference**: `Property__c`, `String`
- **Context**: type_declaration

### 3. Field Access References

```apex
property.Id
contentVersion.Id
```

- **Object reference**: `property`, `contentVersion`
- **Field reference**: `Id`
- **Context**: field_access

### 4. Constructor References

```apex
new Property__c()
new ContentVersion()
```

- **Type reference**: `Property__c`, `ContentVersion`
- **Context**: constructor_call

## Data Structures

### TypeReference Interface

```typescript
interface TypeReference {
  name: string; // The referenced name (e.g., "createFile")
  location: Location; // Exact position in source
  context: ReferenceContext; // How it's being used
  qualifier?: string; // For "FileUtilities.createFile"
  parentContext?: string; // Parent method/class context
  isResolved: boolean; // Always false during parsing
}
```

### ReferenceContext Enum

```typescript
enum ReferenceContext {
  METHOD_CALL = 0,
  TYPE_DECLARATION = 1,
  FIELD_ACCESS = 2,
  CONSTRUCTOR_CALL = 3,
  VARIABLE_USAGE = 4,
  PARAMETER_TYPE = 5,
}
```

### Location Interface

The type reference system uses the existing `SymbolLocation` interface from `types/symbol.ts`:

```typescript
interface SymbolLocation {
  startLine: number; // 0-based line number (inclusive)
  startColumn: number; // 0-based column number (inclusive)
  endLine: number; // 0-based line number (inclusive)
  endColumn: number; // 0-based column number (exclusive)
}
```

## Implementation Status

### Phase 1: Data Structures ✅ COMPLETED

- ✅ Created `TypeReference` interface
- ✅ Created `ReferenceContext` enum with numeric values
- ✅ Integrated with existing `SymbolLocation` interface
- ✅ Created `TypeReferenceFactory` for creating references
- ✅ Added comprehensive unit tests for data structures

### Phase 2: Enhanced SymbolTable ✅ COMPLETED

- ✅ Added `addTypeReference()` method to SymbolTable
- ✅ Added `getAllReferences()` method to SymbolTable
- ✅ Added `getReferencesAtPosition()` method for position-based lookup
- ✅ Added `getReferencesByContext()` method for context-based filtering
- ✅ Added comprehensive unit tests for SymbolTable functionality

### Phase 3: Enhanced ApexSymbolCollectorListener 🔄 IN PROGRESS

- ✅ Added type reference capture methods to listener
- ✅ Implemented `enterEveryRule` approach for capturing references
- ✅ Added pattern matching for method calls, field access, constructor calls, and type declarations
- 🔄 **Current Issue**: Capturing too many references due to broad rule matching
- 🔄 **Current Issue**: Text parsing needs refinement for accurate extraction
- 🔄 **Current Issue**: Parent context not correctly set to method name

### Current Implementation Approach

The current implementation uses the `enterEveryRule` method to capture all parser rules and then applies pattern matching to identify type references:

```typescript
enterEveryRule(ctx: ParserRuleContext): void {
  try {
    this.captureTypeReferences(ctx);
  } catch (error) {
    this.logger.warn(() => `Error capturing type references: ${error}`);
  }
}

private captureTypeReferences(ctx: ParserRuleContext): void {
  const text = ctx.text || '';

  // Capture method calls (e.g., "FileUtilities.createFile(...)")
  if (this.isMethodCall(text)) {
    this.captureMethodCall(ctx, text);
  }

  // Capture field access (e.g., "property.Id")
  if (this.isFieldAccess(text)) {
    this.captureFieldAccess(ctx, text);
  }

  // Capture constructor calls (e.g., "new Property__c()")
  if (this.isConstructorCall(text)) {
    this.captureConstructorCall(ctx, text);
  }

  // Capture type declarations (e.g., "Property__c property")
  if (this.isTypeDeclaration(text)) {
    this.captureTypeDeclaration(ctx, text);
  }
}
```

### Test Results

Current test results show that the implementation is working but needs refinement:

- ✅ Method calls are being captured (but with incorrect text parsing)
- ✅ Field access is being captured (but parent context is wrong)
- ❌ Constructor calls are not being captured
- ❌ Type declarations are not being captured correctly
- ❌ Too many false positives are being captured

## Next Steps

### Phase 3.1: Refine Pattern Matching

1. **Improve regex patterns** for more accurate text extraction
2. **Add rule filtering** to only process relevant ANTLR rules
3. **Fix parent context** to correctly identify method names
4. **Add deduplication** to prevent multiple captures of the same reference

### Phase 3.2: Optimize Performance

1. **Add rule type filtering** to avoid processing irrelevant rules
2. **Implement early exit** for rules that don't contain references
3. **Add caching** for frequently accessed patterns

### Phase 4: Integration with Hover Service

1. **Update hover service** to use type references
2. **Implement lazy resolution** for captured references
3. **Add confidence scoring** for reference matches
4. **Performance testing** and optimization

## Benefits

### 1. **Precise Location Information**

- Exact line/column positions for references
- No more text-based symbol extraction
- Accurate hover positioning

### 2. **Context Awareness**

- Know the usage context (method call, type declaration, etc.)
- Better symbol resolution logic
- Improved confidence scoring

### 3. **Performance**

- No resolution during parsing
- Lazy loading maintained
- Efficient reference lookup

### 4. **Accuracy**

- Direct AST-based references
- No guessing from text patterns
- Reliable cross-file resolution

## Testing Strategy

### Unit Tests ✅ COMPLETED

```typescript
describe('TypeReference Capture', () => {
  it('should capture method call references', () => {
    const code = 'FileUtilities.createFile(data, name, id);';
    const listener = new ApexSymbolCollectorListener(symbolTable);
    // Parse and verify reference capture
  });

  it('should capture type declaration references', () => {
    const code = 'Property__c property = new Property__c();';
    // Verify type reference capture
  });
});
```

### Integration Tests 🔄 IN PROGRESS

```typescript
describe('Hover with Type References', () => {
  it('should hover on FileUtilities.createFile correctly', async () => {
    // Test cross-file method call hover
  });
});
```

## Migration Strategy

1. **Backward Compatibility**: Existing symbol lookup remains as fallback
2. **Gradual Rollout**: Enable reference capture feature flag
3. **Performance Monitoring**: Track parsing and hover performance
4. **User Feedback**: Monitor hover accuracy improvements

## Conclusion

This design provides a robust foundation for capturing type references during parsing while maintaining lazy loading constraints. The approach significantly improves hover accuracy by providing precise, context-aware reference information without compromising performance.

**Current Status**: Core infrastructure is complete, pattern matching needs refinement for production use.
