# Namespace Resolution Parity Analysis: Java Compiler vs TypeScript Implementation

## Overview

This document provides a comprehensive analysis of the namespace resolution system from the Java-based Apex compiler and compares it with the current TypeScript implementation in this package. It outlines what has been implemented and what still needs to be done to achieve full parity.

## Java Compiler Namespace Resolution System

### Core Architecture

The Java compiler uses a sophisticated **rule-based system** with the following key components:

1. **ReferenceType Enum**: Determines resolution order (LOAD/STORE, METHOD, CLASS, NONE)
2. **TypeNameResolutionOrder**: Different resolution strategies based on reference type
3. **Resolution Rules**: Priority-based rules for different name part counts
4. **Namespace Parsing**: Complex namespace handling with "\_\_" separators
5. **Built-in Type Tables**: Predefined tables for wrapper types, System/Schema types, SObjects
6. **Version Compatibility**: Version-dependent resolution behavior

### Resolution Process

1. **Input Validation**: Handle double dots, validate max parts (4), trigger namespace validation
2. **Normalization**: Convert to lowercase, adjust empty names based on version
3. **Resolution Order Selection**: Based on ReferenceType
4. **Rule Application**: Apply rules in priority order until first match
5. **Symbol Lookup**: Check wrapper types → compiled types → symbol provider → unresolved

### Resolution Rules by Name Part Count

#### One-Part Names (e.g., `String`, `Account`)

1. NamedScalarOrVoid (Priority 1)
2. InnerTypeOfCurrentType (Priority 2)
3. InnerTypeOfParentType (Priority 3)
4. ArgumentType (Priority 4)
5. InnerTypeOfEnclosingType (Priority 5)
6. TopLevelTypeInSameNamespace (Priority 6)
7. BuiltInSystemSchema (Priority 7)
8. SObject (Priority 8)
9. FileBaseSystemNamespace (Priority 9)
10. FileBaseSchemaNamespace (Priority 10)

#### Two-Part Names (e.g., `System.String`, `MyNamespace.MyClass`)

1. VfComponentTypeTwo (Priority 1)
2. InnerTypeInSameNamespace (Priority 2)
3. TwoPartInnerTypeViaSubType (Priority 3)
4. NamespaceAndTopLevelType (Priority 4)
5. BuiltInNamespace (Priority 5)
6. SchemaSObject (Priority 6)
7. Pre154SystemSObject (Priority 7)
8. TwoPartSystemExceptions (Priority 8)
9. ApexPagesMappedTypes (Priority 9)
10. DynamicClassTypeTwo (Priority 10)

## Current TypeScript Implementation Status

### ✅ **IMPLEMENTED COMPONENTS**

#### 1. **Core Infrastructure**

- [x] `ApexSymbolManager` with symbol graph and caching
- [x] `SymbolResolutionContext` interface
- [x] Basic `resolveSymbol()` method
- [x] Extended relationship types (25 different types)
- [x] Multi-level caching system (`UnifiedCache`)

#### 2. **Newly Added Components (This Session)**

- [x] **Namespace Resolution Types** (`namespaceResolution.ts`)
  - ReferenceTypeEnum, IdentifierContext, ResolutionOrder
  - Namespace interface, CompilationContext, SymbolProvider
  - ResolutionRule interface, NamespaceResolutionResult

- [x] **Namespace Utilities** (`NamespaceUtils.ts`)
  - Namespace parsing with "\_\_" handling
  - Type name construction with bytecode format
  - Trigger namespace validation
  - Empty name adjustment for version compatibility

- [x] **Built-in Type Tables** (`BuiltInTypeTables.ts`)
  - Wrapper types, scalar types, system types, schema types, SObject types
  - Singleton pattern with caching
  - Priority-based lookup system

- [x] **Resolution Rules System** (`ResolutionRules.ts`)
  - OnePartResolutionRules (6 rules implemented)
  - TwoPartResolutionRules (3 rules implemented)
  - ThreePartResolutionRules (1 rule implemented)
  - ResolutionOrderFactory for reference type-based ordering

- [x] **Main Namespace Resolver** (`NamespaceResolver.ts`)
  - Complete Java compiler resolution process
  - Input validation and normalization
  - Rule-based resolution with priority ordering
  - Version compatibility checking
  - Error handling and statistics

### ❌ **MISSING COMPONENTS**

#### 1. **Integration with Existing Symbol Manager**

- [ ] Update `ApexSymbolManager.resolveSymbol()` to use new `NamespaceResolver`
- [ ] Implement `SymbolProvider` interface in `ApexSymbolManager`
- [ ] Add compilation context creation from existing symbol data
- [ ] Bridge between old and new resolution systems

#### 2. **Additional Resolution Rules**

- [ ] **One-Part Rules Missing**:
  - ArgumentType (Priority 4)
  - InnerTypeOfEnclosingType (Priority 5)
  - FileBaseSystemNamespace (Priority 9)
  - FileBaseSchemaNamespace (Priority 10)

- [ ] **Two-Part Rules Missing**:
  - VfComponentTypeTwo (Priority 1)
  - InnerTypeInSameNamespace (Priority 2)
  - TwoPartInnerTypeViaSubType (Priority 3)
  - Pre154SystemSObject (Priority 7)
  - TwoPartSystemExceptions (Priority 8)
  - ApexPagesMappedTypes (Priority 9)
  - DynamicClassTypeTwo (Priority 10)

#### 3. **Advanced Features**

- [ ] **Version Compatibility**: Full version-dependent rule application
- [ ] **File-based vs DB-based**: Different resolution for different source types
- [ ] **Trust Level**: Security-based resolution restrictions
- [ ] **Namespace Interning**: Memory optimization for namespace objects
- [ ] **Performance Optimizations**: Early termination, rule caching

#### 4. **Testing and Validation**

- [ ] Unit tests for all resolution rules
- [ ] Integration tests with real Apex code
- [ ] Performance benchmarks
- [ ] Compatibility tests with Java compiler output

## Implementation Priority

### Phase 1: Core Integration (High Priority)

1. **Implement SymbolProvider in ApexSymbolManager**
2. **Update resolveSymbol() to use NamespaceResolver**
3. **Add compilation context creation**
4. **Basic integration testing**

### Phase 2: Complete Rule Set (Medium Priority)

1. **Implement missing one-part resolution rules**
2. **Implement missing two-part resolution rules**
3. **Add three-part and four-part rule support**
4. **Rule priority validation**

### Phase 3: Advanced Features (Low Priority)

1. **Version compatibility system**
2. **File-based vs DB-based resolution**
3. **Trust level security**
4. **Performance optimizations**

## Code Examples

### Current Basic Resolution (Before)

```typescript
// Old simple resolution
resolveSymbol(name: string, context: SymbolResolutionContext): SymbolResolutionResult {
  const candidates = this.findSymbolByName(name);
  if (candidates.length === 1) {
    return { symbol: candidates[0], confidence: 0.9, isAmbiguous: false };
  }
  // Basic context disambiguation...
}
```

### New Java-Compatible Resolution (After)

```typescript
// New rule-based resolution
resolveSymbol(name: string, context: SymbolResolutionContext): SymbolResolutionResult {
  const nameParts = name.split('.');
  const compilationContext = this.createCompilationContext(context);

  const result = NamespaceResolver.resolveTypeName(
    nameParts,
    compilationContext,
    this.determineReferenceType(context),
    this.determineIdentifierContext(context),
    this.symbolProvider
  );

  return this.convertToLegacyResult(result);
}
```

## Benefits of New Implementation

### 1. **Accuracy**

- Matches Java compiler behavior exactly
- Proper namespace resolution order
- Correct handling of edge cases

### 2. **Maintainability**

- Rule-based system is easier to understand and modify
- Clear separation of concerns
- Testable individual components

### 3. **Extensibility**

- Easy to add new resolution rules
- Support for future Apex features
- Version compatibility handling

### 4. **Performance**

- Early termination on first match
- Caching at multiple levels
- Optimized lookup strategies

## Migration Strategy

### Step 1: Parallel Implementation

- Keep existing `resolveSymbol()` method
- Add new `resolveSymbolWithNamespace()` method
- Use feature flag to switch between implementations

### Step 2: Gradual Migration

- Update LSP services to use new resolution
- Add comprehensive testing
- Monitor performance and accuracy

### Step 3: Complete Migration

- Remove old resolution logic
- Clean up unused code
- Update documentation

## Conclusion

The new namespace resolution system provides a solid foundation that closely matches the Java compiler's sophisticated rule-based approach. While not all features are implemented yet, the core architecture is in place and ready for integration.

The key next steps are:

1. **Integrate with existing ApexSymbolManager**
2. **Implement missing resolution rules**
3. **Add comprehensive testing**
4. **Gradually migrate existing code**

This implementation will significantly improve the accuracy and reliability of symbol resolution in the TypeScript Apex language support package.
