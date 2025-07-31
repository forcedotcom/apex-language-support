# Type Validation TDD Plan

## Overview

This document outlines the Test-Driven Development (TDD) approach for implementing type validation in the apex-parser-ast package. Type validation is a critical component for ensuring semantic correctness of Apex code, covering type visibility, type casting, collection type validation, and SObject type validation.

## Directory Structure

```
packages/apex-parser-ast/
├── src/semantics/validation/
│   ├── TypeValidator.ts              # Main type validation logic
│   ├── TypeVisibilityValidator.ts    # Type visibility validation
│   ├── TypeCastingValidator.ts       # Type casting validation
│   ├── CollectionTypeValidator.ts    # Collection type validation
│   └── SObjectTypeValidator.ts       # SObject type validation
├── test/semantics/validation/
│   ├── TypeValidator.test.ts         # Main type validation tests
│   ├── TypeVisibilityValidator.test.ts
│   ├── TypeCastingValidator.test.ts
│   ├── CollectionTypeValidator.test.ts
│   └── SObjectTypeValidator.test.ts
└── docs/
    └── type-validation-tdd-plan.md   # This document
```

## Core Types

### TypeInfo Interface

```typescript
interface TypeInfo {
  name: string;
  namespace?: string;
  visibility: SymbolVisibility;
  isPrimitive: boolean;
  isSObject: boolean;
  isCollection: boolean;
  elementType?: TypeInfo; // For collections
  keyType?: TypeInfo; // For maps
  valueType?: TypeInfo; // For maps
}
```

### TypeValidationResult Interface

```typescript
interface TypeValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  type?: TypeInfo;
}
```

### TypeValidationContext Interface

```typescript
interface TypeValidationContext {
  currentType: TypeSymbol | null;
  currentMethod: MethodSymbol | null;
  currentNamespace: string | null;
  isStaticContext: boolean;
  compilationContext: CompilationContext;
}
```

## Test Cases by Category

### 1. Type Visibility Validation

#### 1.1 Basic Visibility Tests

```typescript
describe('Type Visibility Validation', () => {
  it('should allow access to public types from any namespace', () => {
    const targetType = createMockType(
      'TestClass',
      SymbolVisibility.Public,
      'otherNamespace',
    );
    const context = createMockContext('currentNamespace');

    const result = TypeVisibilityValidator.validateTypeVisibility(
      targetType,
      context,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });

  it('should allow access to types in same namespace', () => {
    const targetType = createMockType(
      'TestClass',
      SymbolVisibility.Private,
      'currentNamespace',
    );
    const context = createMockContext('currentNamespace');

    const result = TypeVisibilityValidator.validateTypeVisibility(
      targetType,
      context,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });

  it('should reject access to private types from different namespace', () => {
    const targetType = createMockType(
      'TestClass',
      SymbolVisibility.Private,
      'otherNamespace',
    );
    const context = createMockContext('currentNamespace');

    const result = TypeVisibilityValidator.validateTypeVisibility(
      targetType,
      context,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('type.not.visible');
  });

  it('should reject access to protected types from different namespace', () => {
    const targetType = createMockType(
      'TestClass',
      SymbolVisibility.Protected,
      'otherNamespace',
    );
    const context = createMockContext('currentNamespace');

    const result = TypeVisibilityValidator.validateTypeVisibility(
      targetType,
      context,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('type.not.visible');
  });
});
```

#### 1.2 Global Type Tests

```typescript
describe('Global Type Visibility', () => {
  it('should allow access to global types from any namespace', () => {
    const targetType = createMockType(
      'TestClass',
      SymbolVisibility.Global,
      'otherNamespace',
    );
    const context = createMockContext('currentNamespace');

    const result = TypeVisibilityValidator.validateTypeVisibility(
      targetType,
      context,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });
});
```

### 2. Type Casting Validation

#### 2.1 Valid Cast Tests

```typescript
describe('Type Casting Validation', () => {
  it('should allow casting between compatible numeric types', () => {
    const sourceType = createMockTypeInfo('Integer');
    const targetType = createMockTypeInfo('Long');

    const result = TypeCastingValidator.validateCast(
      sourceType,
      targetType,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });

  it('should allow casting from Object to specific type', () => {
    const sourceType = createMockTypeInfo('Object');
    const targetType = createMockTypeInfo('String');

    const result = TypeCastingValidator.validateCast(
      sourceType,
      targetType,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });

  it('should allow casting from parent to child class', () => {
    const sourceType = createMockTypeInfo('ParentClass');
    const targetType = createMockTypeInfo('ChildClass');

    const result = TypeCastingValidator.validateCast(
      sourceType,
      targetType,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });
});
```

#### 2.2 Invalid Cast Tests

```typescript
describe('Invalid Type Casting', () => {
  it('should reject casting between incompatible primitive types', () => {
    const sourceType = createMockTypeInfo('String');
    const targetType = createMockTypeInfo('Integer');

    const result = TypeCastingValidator.validateCast(
      sourceType,
      targetType,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('incompatible.cast.types');
  });

  it('should reject casting from child to parent class', () => {
    const sourceType = createMockTypeInfo('ChildClass');
    const targetType = createMockTypeInfo('ParentClass');

    const result = TypeCastingValidator.validateCast(
      sourceType,
      targetType,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('incompatible.cast.types');
  });

  it('should reject casting to void type', () => {
    const sourceType = createMockTypeInfo('String');
    const targetType = createMockTypeInfo('void');

    const result = TypeCastingValidator.validateCast(
      sourceType,
      targetType,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('invalid.cast.type');
  });
});
```

### 3. Collection Type Validation

#### 3.1 List Type Tests

```typescript
describe('Collection Type Validation', () => {
  it('should validate List with valid element type', () => {
    const listType = createMockCollectionType(
      'List',
      createMockTypeInfo('String'),
    );

    const result = CollectionTypeValidator.validateCollectionType(
      listType,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });

  it('should validate Set with valid element type', () => {
    const setType = createMockCollectionType(
      'Set',
      createMockTypeInfo('Integer'),
    );

    const result = CollectionTypeValidator.validateCollectionType(
      setType,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });

  it('should validate Map with valid key and value types', () => {
    const mapType = createMockMapType(
      createMockTypeInfo('String'),
      createMockTypeInfo('Integer'),
    );

    const result = CollectionTypeValidator.validateCollectionType(
      mapType,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });
});
```

#### 3.2 Invalid Collection Tests

```typescript
describe('Invalid Collection Types', () => {
  it('should reject List with void element type', () => {
    const listType = createMockCollectionType(
      'List',
      createMockTypeInfo('void'),
    );

    const result = CollectionTypeValidator.validateCollectionType(
      listType,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('invalid.collection.element.type');
  });

  it('should reject Map with void key type', () => {
    const mapType = createMockMapType(
      createMockTypeInfo('void'),
      createMockTypeInfo('String'),
    );

    const result = CollectionTypeValidator.validateCollectionType(
      mapType,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('invalid.map.key.type');
  });
});
```

### 4. SObject Type Validation

#### 4.1 Valid SObject Tests

```typescript
describe('SObject Type Validation', () => {
  it('should validate standard SObject types', () => {
    const sobjectType = createMockSObjectType('Account');

    const result = SObjectTypeValidator.validateSObjectType(
      sobjectType,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });

  it('should validate custom SObject types', () => {
    const sobjectType = createMockSObjectType('CustomObject__c');

    const result = SObjectTypeValidator.validateSObjectType(
      sobjectType,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });

  it('should validate SObject collections', () => {
    const sobjectListType = createMockCollectionType(
      'List',
      createMockSObjectType('Contact'),
    );

    const result = SObjectTypeValidator.validateSObjectType(
      sobjectListType,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });
});
```

#### 4.2 Invalid SObject Tests

```typescript
describe('Invalid SObject Types', () => {
  it('should reject invalid SObject type names', () => {
    const invalidType = createMockSObjectType('InvalidObject');

    const result = SObjectTypeValidator.validateSObjectType(
      invalidType,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('invalid.sobject.type');
  });

  it('should reject SObject Map with non-SObject key', () => {
    const invalidMapType = createMockMapType(
      createMockTypeInfo('String'),
      createMockSObjectType('Account'),
    );

    const result = SObjectTypeValidator.validateSObjectType(
      invalidMapType,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('invalid.sobject.map');
  });
});
```

## Implementation Strategy

### Phase 1: Core Type Validation (Week 1)

1. **Create TypeValidator class**
   - Implement basic type validation framework
   - Add type compatibility checking
   - Create type promotion rules

2. **Create TypeVisibilityValidator class**
   - Implement visibility checking logic
   - Add namespace-based access control
   - Handle global type access

### Phase 2: Type Casting (Week 2)

1. **Create TypeCastingValidator class**
   - Implement cast compatibility rules
   - Add primitive type casting validation
   - Handle object type casting

2. **Create CollectionTypeValidator class**
   - Implement collection type validation
   - Add element type checking
   - Handle map key/value type validation

### Phase 3: SObject Validation (Week 3)

1. **Create SObjectTypeValidator class**
   - Implement SObject type validation
   - Add standard SObject type checking
   - Handle custom SObject validation

2. **Integration with Symbol System**
   - Connect type validation to symbol resolution
   - Add type validation to expression validation
   - Integrate with error reporting

## Integration Steps

### 1. Update Symbol Collector

```typescript
// In ApexSymbolCollectorListener.ts
private validateType(typeInfo: TypeInfo, context: ParserRuleContext): boolean {
  const validationResult = TypeValidator.validateType(typeInfo, this.createValidationContext());

  if (!validationResult.isValid) {
    validationResult.errors.forEach(error => {
      this.addError(error, context);
    });
    return false;
  }

  return true;
}
```

### 2. Update Expression Validator

```typescript
// In ApexExpressionValidatorListener.ts
enterCastExpression(ctx: CastExpressionContext): void {
  const sourceType = this.getExpressionType(ctx.expression());
  const targetType = this.getTypeFromContext(ctx.type());

  const result = TypeCastingValidator.validateCast(sourceType, targetType, this.scope);

  if (!result.isValid) {
    result.errors.forEach(error => {
      this.addError(error, ctx);
    });
  }
}
```

## Performance Considerations

### 1. Type Caching

- Cache type validation results for frequently used types
- Implement type resolution caching
- Optimize visibility checking for common cases

### 2. Early Termination

- Stop validation on first critical error
- Implement fast-path for primitive types
- Optimize collection type validation

### 3. Memory Management

- Reuse type objects where possible
- Implement lazy type resolution
- Optimize type info storage

## Success Criteria

### 1. Functional Requirements

- All type visibility rules implemented
- All type casting rules implemented
- All collection type validation implemented
- All SObject type validation implemented
- Error messages match apex-jorje-semantic

### 2. Performance Requirements

- Type validation completes within 100ms for typical files
- Memory usage remains under 1.5x current symbol table usage
- Support for large type hierarchies

### 3. Quality Requirements

- 90%+ test coverage
- Zero false positives in type validation
- Comprehensive error reporting with accurate locations

## Next Steps

1. **Create test files** with initial failing tests
2. **Implement TypeValidator** with minimal functionality
3. **Add TypeVisibilityValidator** with basic visibility checking
4. **Implement TypeCastingValidator** with primitive type support
5. **Add CollectionTypeValidator** with List/Set/Map support
6. **Create SObjectTypeValidator** with standard SObject support
7. **Integrate with symbol collection** process
8. **Add performance testing** and optimization

## References

- [Apex-Jorje Semantic Rules - Type System Validation](./apex-jorje-semantic-rules.md#2-type-system-validation)
- [Apex-Jorje Semantic Rules - Expression Validation](./apex-jorje-semantic-rules.md#3-expression-validation)
- [Identifier Validation Implementation](./identifier-validation-implementation-summary.md)
