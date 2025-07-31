# Advanced Validation TDD Plan (Phase 5)

## Overview

This document provides a Test-Driven Development (TDD) plan for implementing Phase 5 Advanced Validation in the apex-parser-ast package. Phase 5 focuses on statement validation, compilation unit validation, and visibility/access validation.

## Phase 5 Components

### 1. Statement Validation

- Variable declaration validation
- Switch statement validation
- Assignment statement validation
- Return statement validation

### 2. Compilation Unit Validation

- File size validation (1M chars for classes, 32K for anonymous blocks)
- Expression length validation
- Character validation (control characters, invalid symbols)

### 3. Visibility and Access Validation

- Type visibility validation
- Method visibility validation
- Variable visibility validation
- Static vs instance context validation

## Implementation Strategy

### Step 1: Statement Validation (Week 1)

#### 1.1 Variable Declaration Validation

**Test File**: `test/semantics/validation/StatementValidator.test.ts`

**Test Cases**:

```typescript
describe('StatementValidator - Variable Declaration', () => {
  describe('validateVariableDeclaration', () => {
    it('should validate simple variable declaration', () => {
      // Test: String name = 'test';
      const result = StatementValidator.validateVariableDeclaration(
        { name: 'String', isPrimitive: true },
        { name: 'String', isPrimitive: true },
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate variable declaration with compatible initializer', () => {
      // Test: Object obj = new MyClass();
      const result = StatementValidator.validateVariableDeclaration(
        { name: 'Object', isPrimitive: false },
        { name: 'MyClass', isPrimitive: false },
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject variable declaration with incompatible initializer', () => {
      // Test: String name = 123;
      const result = StatementValidator.validateVariableDeclaration(
        { name: 'String', isPrimitive: true },
        { name: 'Integer', isPrimitive: true },
        mockValidationScope(),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('incompatible.types');
    });

    it('should validate final field initialization', () => {
      // Test: final String name = 'test';
      const result = StatementValidator.validateFinalFieldDeclaration(
        { name: 'String', isPrimitive: true },
        { name: 'String', isPrimitive: true },
        true, // isFinal
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject final field without initializer', () => {
      // Test: final String name;
      const result = StatementValidator.validateFinalFieldDeclaration(
        { name: 'String', isPrimitive: true },
        null, // no initializer
        true, // isFinal
        mockValidationScope(),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('final.field.requires.initializer');
    });
  });
});
```

**Implementation File**: `src/semantics/validation/StatementValidator.ts`

#### 1.2 Switch Statement Validation

**Test Cases**:

```typescript
describe('StatementValidator - Switch Statement', () => {
  describe('validateSwitchStatement', () => {
    it('should validate switch with compatible when values', () => {
      // Test: switch on String with String when values
      const result = StatementValidator.validateSwitchStatement(
        { name: 'String', isPrimitive: true },
        [
          { name: 'String', isPrimitive: true },
          { name: 'String', isPrimitive: true },
        ],
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject switch with incompatible when values', () => {
      // Test: switch on String with Integer when values
      const result = StatementValidator.validateSwitchStatement(
        { name: 'String', isPrimitive: true },
        [
          { name: 'Integer', isPrimitive: true },
          { name: 'String', isPrimitive: true },
        ],
        mockValidationScope(),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('incompatible.switch.types');
    });

    it('should validate enum switch statement', () => {
      // Test: switch on enum with enum values
      const result = StatementValidator.validateSwitchStatement(
        { name: 'MyEnum', isPrimitive: false, isEnum: true },
        [
          { name: 'MyEnum', isPrimitive: false, isEnum: true },
          { name: 'MyEnum', isPrimitive: false, isEnum: true },
        ],
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });
  });
});
```

#### 1.3 Assignment Statement Validation

**Test Cases**:

```typescript
describe('StatementValidator - Assignment', () => {
  describe('validateAssignmentStatement', () => {
    it('should validate compatible assignment', () => {
      // Test: String name = 'test';
      const result = StatementValidator.validateAssignmentStatement(
        { name: 'String', isPrimitive: true },
        { name: 'String', isPrimitive: true },
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate widening conversion', () => {
      // Test: Object obj = 'test'; (String to Object)
      const result = StatementValidator.validateAssignmentStatement(
        { name: 'Object', isPrimitive: false },
        { name: 'String', isPrimitive: true },
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject narrowing conversion', () => {
      // Test: String name = obj; (Object to String)
      const result = StatementValidator.validateAssignmentStatement(
        { name: 'String', isPrimitive: true },
        { name: 'Object', isPrimitive: false },
        mockValidationScope(),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('incompatible.assignment');
    });
  });
});
```

### Step 2: Compilation Unit Validation (Week 1-2)

#### 2.1 File Size Validation

**Test File**: `test/semantics/validation/CompilationUnitValidator.test.ts`

**Test Cases**:

```typescript
describe('CompilationUnitValidator - File Size', () => {
  describe('validateFileSize', () => {
    it('should accept class within size limit', () => {
      const result = CompilationUnitValidator.validateFileSize(
        'class TestClass { }',
        'class',
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject class exceeding size limit', () => {
      const largeClass = 'class TestClass { ' + 'a'.repeat(1000000) + ' }';
      const result = CompilationUnitValidator.validateFileSize(
        largeClass,
        'class',
        mockValidationScope(),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('script.too.large');
    });

    it('should accept anonymous block within size limit', () => {
      const result = CompilationUnitValidator.validateFileSize(
        'System.debug("test");',
        'anonymous',
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject anonymous block exceeding size limit', () => {
      const largeBlock = 'System.debug("' + 'a'.repeat(32000) + '");';
      const result = CompilationUnitValidator.validateFileSize(
        largeBlock,
        'anonymous',
        mockValidationScope(),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('script.too.large');
    });

    it('should accept test anonymous block within size limit', () => {
      const result = CompilationUnitValidator.validateFileSize(
        '@isTest\nSystem.debug("test");',
        'anonymous',
        { ...mockValidationScope(), isTestContext: true },
      );
      expect(result.isValid).toBe(true);
    });
  });
});
```

**Implementation File**: `src/semantics/validation/CompilationUnitValidator.ts`

#### 2.2 Expression Length Validation

**Test Cases**:

```typescript
describe('CompilationUnitValidator - Expression Length', () => {
  describe('validateExpressionLength', () => {
    it('should accept expression within length limit', () => {
      const result = CompilationUnitValidator.validateExpressionLength(
        'a + b + c',
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject expression exceeding length limit', () => {
      const longExpression = 'a'.repeat(10000) + ' + b';
      const result = CompilationUnitValidator.validateExpressionLength(
        longExpression,
        mockValidationScope(),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('expression.too.long');
    });
  });
});
```

#### 2.3 Character Validation

**Test Cases**:

```typescript
describe('CompilationUnitValidator - Character Validation', () => {
  describe('validateCharacters', () => {
    it('should accept valid characters', () => {
      const result = CompilationUnitValidator.validateCharacters(
        'String name = "test";',
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid control characters', () => {
      const result = CompilationUnitValidator.validateCharacters(
        'String name = "test\u0000";',
        mockValidationScope(),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid control character');
    });

    it('should reject invalid symbols', () => {
      const result = CompilationUnitValidator.validateCharacters(
        'String name = "test`";',
        mockValidationScope(),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid symbol');
    });

    it('should reject invalid identifiers', () => {
      const result = CompilationUnitValidator.validateCharacters(
        'String \u0080name = "test";',
        mockValidationScope(),
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid identifier');
    });
  });
});
```

### Step 3: Visibility and Access Validation (Week 2)

#### 3.1 Type Visibility Validation

**Test File**: `test/semantics/validation/VisibilityValidator.test.ts`

**Test Cases**:

```typescript
describe('VisibilityValidator - Type Visibility', () => {
  describe('validateTypeVisibility', () => {
    it('should validate public type access', () => {
      const result = VisibilityValidator.validateTypeVisibility(
        { name: 'MyClass', visibility: 'public' },
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate private type access within same class', () => {
      const result = VisibilityValidator.validateTypeVisibility(
        { name: 'MyClass', visibility: 'private' },
        { ...mockValidationScope(), currentType: { name: 'MyClass' } },
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject private type access from different class', () => {
      const result = VisibilityValidator.validateTypeVisibility(
        { name: 'MyClass', visibility: 'private' },
        { ...mockValidationScope(), currentType: { name: 'OtherClass' } },
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('type.not.visible');
    });

    it('should validate protected type access from subclass', () => {
      const result = VisibilityValidator.validateTypeVisibility(
        { name: 'ParentClass', visibility: 'protected' },
        {
          ...mockValidationScope(),
          currentType: { name: 'ChildClass', parentType: 'ParentClass' },
        },
      );
      expect(result.isValid).toBe(true);
    });
  });
});
```

**Implementation File**: `src/semantics/validation/VisibilityValidator.ts`

#### 3.2 Method Visibility Validation

**Test Cases**:

```typescript
describe('VisibilityValidator - Method Visibility', () => {
  describe('validateMethodVisibility', () => {
    it('should validate public method access', () => {
      const result = VisibilityValidator.validateMethodVisibility(
        { name: 'myMethod', visibility: 'public' },
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate private method access within same class', () => {
      const result = VisibilityValidator.validateMethodVisibility(
        { name: 'myMethod', visibility: 'private' },
        { ...mockValidationScope(), currentType: { name: 'MyClass' } },
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject private method access from different class', () => {
      const result = VisibilityValidator.validateMethodVisibility(
        { name: 'myMethod', visibility: 'private' },
        { ...mockValidationScope(), currentType: { name: 'OtherClass' } },
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('method.not.visible');
    });

    it('should validate static method access in static context', () => {
      const result = VisibilityValidator.validateMethodVisibility(
        { name: 'myMethod', visibility: 'public', isStatic: true },
        { ...mockValidationScope(), isStaticContext: true },
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject static method access in instance context', () => {
      const result = VisibilityValidator.validateMethodVisibility(
        { name: 'myMethod', visibility: 'public', isStatic: true },
        { ...mockValidationScope(), isStaticContext: false },
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('static.method.in.instance.context');
    });
  });
});
```

#### 3.3 Variable Visibility Validation

**Test Cases**:

```typescript
describe('VisibilityValidator - Variable Visibility', () => {
  describe('validateVariableVisibility', () => {
    it('should validate public variable access', () => {
      const result = VisibilityValidator.validateVariableVisibility(
        { name: 'myVar', visibility: 'public' },
        mockValidationScope(),
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate private variable access within same class', () => {
      const result = VisibilityValidator.validateVariableVisibility(
        { name: 'myVar', visibility: 'private' },
        { ...mockValidationScope(), currentType: { name: 'MyClass' } },
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject private variable access from different class', () => {
      const result = VisibilityValidator.validateVariableVisibility(
        { name: 'myVar', visibility: 'private' },
        { ...mockValidationScope(), currentType: { name: 'OtherClass' } },
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('variable.not.visible');
    });

    it('should validate static variable access in static context', () => {
      const result = VisibilityValidator.validateVariableVisibility(
        { name: 'myVar', visibility: 'public', isStatic: true },
        { ...mockValidationScope(), isStaticContext: true },
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject static variable access in instance context', () => {
      const result = VisibilityValidator.validateVariableVisibility(
        { name: 'myVar', visibility: 'public', isStatic: true },
        { ...mockValidationScope(), isStaticContext: false },
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('static.variable.in.instance.context');
    });
  });
});
```

## Integration Tests

### Step 4: Integration Testing (Week 2)

**Test File**: `test/semantics/validation/AdvancedValidation.integration.test.ts`

**Test Cases**:

```typescript
describe('Advanced Validation Integration', () => {
  describe('Complete Validation Flow', () => {
    it('should validate complete class with all rules', () => {
      const apexCode = `
        public class TestClass {
          private String name;
          public static Integer count = 0;
          
          public TestClass(String name) {
            this.name = name;
          }
          
          public void testMethod() {
            String localVar = 'test';
            switch on localVar {
              when 'test' {
                System.debug('test');
              }
            }
          }
        }
      `;

      const result = AdvancedValidator.validateCompilationUnit(
        apexCode,
        mockValidationScope(),
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect multiple validation errors', () => {
      const apexCode = `
        public class TestClass {
          private String name;
          
          public void testMethod() {
            String localVar = 123; // Type mismatch
            switch on localVar {
              when 456 { // Incompatible switch type
                System.debug('test');
              }
            }
          }
        }
      `;

      const result = AdvancedValidator.validateCompilationUnit(
        apexCode,
        mockValidationScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('incompatible.types');
      expect(result.errors).toContain('incompatible.switch.types');
    });
  });
});
```

## Implementation Files

### Core Files to Create:

1. **`src/semantics/validation/StatementValidator.ts`**
   - Variable declaration validation
   - Switch statement validation
   - Assignment statement validation
   - Return statement validation

2. **`src/semantics/validation/CompilationUnitValidator.ts`**
   - File size validation
   - Expression length validation
   - Character validation

3. **`src/semantics/validation/VisibilityValidator.ts`**
   - Type visibility validation
   - Method visibility validation
   - Variable visibility validation

4. **`src/semantics/validation/AdvancedValidator.ts`**
   - Main integration point for all advanced validation
   - Orchestrates validation flow

### Test Files to Create:

1. **`test/semantics/validation/StatementValidator.test.ts`**
2. **`test/semantics/validation/CompilationUnitValidator.test.ts`**
3. **`test/semantics/validation/VisibilityValidator.test.ts`**
4. **`test/semantics/validation/AdvancedValidation.integration.test.ts`**

## Error Messages

### Statement Validation Errors:

- `'incompatible.types'`
- `'final.field.requires.initializer'`
- `'incompatible.switch.types'`
- `'incompatible.assignment'`

### Compilation Unit Errors:

- `'script.too.large'`
- `'expression.too.long'`
- `'Invalid control character: {0}'`
- `'Invalid symbol: {0}'`
- `'Invalid identifier: {0}'`

### Visibility Errors:

- `'type.not.visible'`
- `'method.not.visible'`
- `'variable.not.visible'`
- `'static.method.in.instance.context'`
- `'static.variable.in.instance.context'`

## Success Criteria

### Functional Requirements:

- ✅ All statement validation rules implemented
- ✅ All compilation unit validation rules implemented
- ✅ All visibility validation rules implemented
- ✅ Integration with existing validation system
- ✅ Comprehensive error reporting

### Performance Requirements:

- ✅ Statement validation: < 5ms per statement
- ✅ Compilation unit validation: < 10ms per file
- ✅ Visibility validation: < 2ms per access
- ✅ Overall validation: < 100ms for typical files

### Quality Requirements:

- ✅ 90%+ test coverage
- ✅ Zero false positives
- ✅ Comprehensive error messages
- ✅ Integration with symbol resolution

## Timeline

### Week 1:

- Day 1-2: Statement validation implementation
- Day 3-4: Compilation unit validation implementation
- Day 5: Integration testing

### Week 2:

- Day 1-2: Visibility validation implementation
- Day 3-4: Advanced validator integration
- Day 5: Final testing and documentation

## Dependencies

### Internal Dependencies:

- Type validation system (completed)
- Expression validation system (completed)
- Symbol resolution system (available)
- Error reporting system (available)

### External Dependencies:

- Apex API version information (needed for version-specific rules)
- SObject metadata (needed for SObject validation)

## Risk Assessment

### Low Risk:

- Statement validation (following established patterns)
- Compilation unit validation (simple size checks)

### Medium Risk:

- Visibility validation (complex inheritance rules)
- Integration complexity (multiple systems)

### Mitigation Strategies:

- Comprehensive test coverage
- Incremental implementation
- Regular integration testing
- Performance monitoring
