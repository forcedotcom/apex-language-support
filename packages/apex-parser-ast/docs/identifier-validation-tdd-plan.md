# TDD Implementation Plan: Identifier Validation

## Overview

This document outlines a Test-Driven Development approach to implement identifier validation rules for the Apex language in the `apex-parser-ast` package. The implementation will follow the semantic rules documented in the `apex-jorje-semantic-rules.md` file and align with Salesforce's official Apex documentation.

## Goals

- Implement comprehensive identifier validation following apex-jorje-semantic rules
- Ensure 100% test coverage with TDD approach
- Maintain performance standards (< 100ms for 10k validations)
- Provide clear error messages matching apex-jorje-semantic
- Integrate seamlessly with existing symbol collection pipeline

## Phase 1: Foundation Setup

### 1.1 Directory Structure

```
packages/apex-parser-ast/src/semantics/validation/
├── IdentifierValidator.ts
├── ValidationResult.ts
├── ValidationScope.ts
└── index.ts

packages/apex-parser-ast/test/semantics/validation/
├── IdentifierValidator.test.ts
├── ValidationResult.test.ts
├── ValidationScope.test.ts
└── fixtures/
    ├── valid-identifiers.cls
    ├── invalid-identifiers.cls
    └── edge-cases.cls
```

### 1.2 Core Types and Interfaces

**File**: `src/semantics/validation/ValidationResult.ts`

```typescript
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationScope {
  supportsLongIdentifiers: boolean;
  version: number;
  isFileBased: boolean;
}
```

## Phase 2: Core Validation Rules Implementation

### 2.1 Reserved Names Validation

**Test File**: `test/semantics/validation/IdentifierValidator.test.ts`

```typescript
describe('IdentifierValidator - Reserved Names', () => {
  const reservedNames = [
    'array',
    'activate',
    'any',
    'autonomous',
    'begin',
    'bigDecimal',
    'bulk',
    'byte',
    'case',
    'cast',
    'char',
    'collect',
    'commit',
    'const',
    'default',
    'desc',
    'end',
    'export',
    'exception',
    'exit',
    'float',
    'goto',
    'group',
    'having',
    'hint',
    'int',
    'into',
    'inner',
    'import',
    'join',
    'loop',
    'number',
    'object',
    'outer',
    'of',
    'package',
    'parallel',
    'pragma',
    'retrieve',
    'rollback',
    'sort',
    'short',
    'super',
    'switch',
    'system',
    'synchronized',
    'transaction',
    'this',
    'then',
    'when',
  ];

  it.each(reservedNames)('should reject reserved name: %s', (name) => {
    const result = IdentifierValidator.validateIdentifier(
      name,
      SymbolKind.Variable,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(`Identifier name is reserved: ${name}`);
  });

  it('should allow reserved names for methods', () => {
    const result = IdentifierValidator.validateIdentifier(
      'array',
      SymbolKind.Method,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });

  it('should be case-insensitive for reserved names', () => {
    const result = IdentifierValidator.validateIdentifier(
      'ARRAY',
      SymbolKind.Variable,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Identifier name is reserved: ARRAY');
  });
});
```

### 2.2 Reserved Type Names Validation

```typescript
describe('IdentifierValidator - Reserved Type Names', () => {
  const reservedTypeNames = ['apexPages', 'page'];

  it.each(reservedTypeNames)(
    'should reject reserved type name: %s for classes',
    (name) => {
      const result = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Class,
        true,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Identifier type is reserved: ${name}`);
    },
  );

  it.each(reservedTypeNames)(
    'should reject reserved type name: %s for interfaces',
    (name) => {
      const result = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Interface,
        true,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Identifier type is reserved: ${name}`);
    },
  );

  it('should allow reserved type names for variables', () => {
    const result = IdentifierValidator.validateIdentifier(
      'apexPages',
      SymbolKind.Variable,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });
});
```

### 2.3 Keywords Validation

```typescript
describe('IdentifierValidator - Keywords', () => {
  const keywords = [
    'trigger',
    'insert',
    'update',
    'upsert',
    'delete',
    'undelete',
    'merge',
    'new',
    'for',
    'select',
  ];

  it.each(keywords)('should reject keyword: %s', (keyword) => {
    const result = IdentifierValidator.validateIdentifier(
      keyword,
      SymbolKind.Variable,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      `Identifier cannot be a keyword: ${keyword}`,
    );
  });

  it('should allow keywords for methods', () => {
    const result = IdentifierValidator.validateIdentifier(
      'trigger',
      SymbolKind.Method,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });
});
```

### 2.4 Character Validation

```typescript
describe('IdentifierValidator - Character Validation', () => {
  it('should reject identifiers starting with non-letter', () => {
    const invalidStarters = ['123abc', '_test', '@name', '#var'];

    invalidStarters.forEach((name) => {
      const result = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Invalid character in identifier: ${name}`,
      );
    });
  });

  it('should reject identifiers with invalid characters', () => {
    const invalidChars = ['test@name', 'var#123', 'func$tion', 'class%type'];

    invalidChars.forEach((name) => {
      const result = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Invalid character in identifier: ${name}`,
      );
    });
  });

  it('should reject consecutive underscores', () => {
    const result = IdentifierValidator.validateIdentifier(
      'test__name',
      SymbolKind.Variable,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Invalid character in identifier: test__name',
    );
  });

  it('should reject identifiers ending with underscore', () => {
    const result = IdentifierValidator.validateIdentifier(
      'testName_',
      SymbolKind.Variable,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Invalid character in identifier: testName_',
    );
  });

  it('should accept valid identifiers', () => {
    const validIdentifiers = [
      'testName',
      'TestClass',
      'myVariable123',
      'user_name',
      'camelCase',
      'PascalCase',
      'snake_case',
    ];

    validIdentifiers.forEach((name) => {
      const result = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
    });
  });
});
```

### 2.5 Length Validation

```typescript
describe('IdentifierValidator - Length Validation', () => {
  it('should reject identifiers longer than 255 characters', () => {
    const longName = 'a'.repeat(256);
    const result = IdentifierValidator.validateIdentifier(
      longName,
      SymbolKind.Variable,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      `Identifier name is too long: ${longName} (max: 255)`,
    );
  });

  it('should reject top-level classes longer than 40 characters', () => {
    const longClassName = 'A'.repeat(41);
    const result = IdentifierValidator.validateIdentifier(
      longClassName,
      SymbolKind.Class,
      true,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      `Identifier name is too long: ${longClassName} (max: 40)`,
    );
  });

  it('should allow long identifiers when long identifiers are supported', () => {
    const longName = 'a'.repeat(256);
    const scope = createMockScope({ supportsLongIdentifiers: true });

    const result = IdentifierValidator.validateIdentifier(
      longName,
      SymbolKind.Variable,
      false,
      scope,
    );

    expect(result.isValid).toBe(true);
  });

  it('should allow long top-level classes when long identifiers are supported', () => {
    const longClassName = 'A'.repeat(41);
    const scope = createMockScope({ supportsLongIdentifiers: true });

    const result = IdentifierValidator.validateIdentifier(
      longClassName,
      SymbolKind.Class,
      true,
      scope,
    );

    expect(result.isValid).toBe(true);
  });
});
```

## Phase 3: Implementation

### 3.1 Core IdentifierValidator Implementation

**File**: `src/semantics/validation/IdentifierValidator.ts`

```typescript
import { SymbolKind } from '../../types/symbol';
import { ValidationResult, ValidationScope } from './ValidationResult';

export class IdentifierValidator {
  // Reserved names from apex-jorje-semantic
  private static readonly RESERVED_NAMES = new Set([
    'array',
    'activate',
    'any',
    'autonomous',
    'begin',
    'bigDecimal',
    'bulk',
    'byte',
    'case',
    'cast',
    'char',
    'collect',
    'commit',
    'const',
    'default',
    'desc',
    'end',
    'export',
    'exception',
    'exit',
    'float',
    'goto',
    'group',
    'having',
    'hint',
    'int',
    'into',
    'inner',
    'import',
    'join',
    'loop',
    'number',
    'object',
    'outer',
    'of',
    'package',
    'parallel',
    'pragma',
    'retrieve',
    'rollback',
    'sort',
    'short',
    'super',
    'switch',
    'system',
    'synchronized',
    'transaction',
    'this',
    'then',
    'when',
  ]);

  // Reserved type names
  private static readonly RESERVED_TYPE_NAMES = new Set(['apexPages', 'page']);

  // Keywords
  private static readonly KEYWORDS = new Set([
    'trigger',
    'insert',
    'update',
    'upsert',
    'delete',
    'undelete',
    'merge',
    'new',
    'for',
    'select',
  ]);

  // Constants
  private static readonly MAX_LENGTH = 255;
  private static readonly MAX_CLASS_LENGTH = 40;

  /**
   * Validate an identifier according to Apex semantic rules
   */
  static validateIdentifier(
    name: string,
    type: SymbolKind,
    isTopLevel: boolean,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Valid characters
    if (!this.hasValidCharacters(name)) {
      errors.push(`Invalid character in identifier: ${name}`);
      return { isValid: false, errors, warnings };
    }

    // Check 2: Keywords (methods can use reserved names)
    if (this.KEYWORDS.has(name.toLowerCase()) && type !== SymbolKind.Method) {
      errors.push(`Identifier cannot be a keyword: ${name}`);
      return { isValid: false, errors, warnings };
    }

    // Check 3: Reserved names (methods can use reserved names)
    if (
      type !== SymbolKind.Method &&
      this.RESERVED_NAMES.has(name.toLowerCase())
    ) {
      errors.push(`Identifier name is reserved: ${name}`);
      return { isValid: false, errors, warnings };
    }

    // Check 4: Reserved type names (only for class/interface/exception)
    if (
      (type === SymbolKind.Class ||
        type === SymbolKind.Interface ||
        type === SymbolKind.Exception) &&
      this.RESERVED_TYPE_NAMES.has(name.toLowerCase())
    ) {
      errors.push(`Identifier type is reserved: ${name}`);
      return { isValid: false, errors, warnings };
    }

    // Check 5: Length validation
    const maxLength = this.getMaxLength(type, isTopLevel, scope);
    if (name.length > maxLength) {
      errors.push(`Identifier name is too long: ${name} (max: ${maxLength})`);
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Check if identifier has valid characters
   */
  private static hasValidCharacters(name: string): boolean {
    if (!name || name.length === 0) {
      return false;
    }

    // Must start with a letter
    if (!this.isLetter(name.charAt(0))) {
      return false;
    }

    let lastChar = 'x';
    for (let i = 0; i < name.length; i++) {
      const char = name.charAt(i);

      // Only letters, digits, and underscores allowed
      if (!this.isLetter(char) && !this.isDigit(char) && char !== '_') {
        return false;
      }

      // No consecutive underscores
      if (lastChar === '_' && char === '_') {
        return false;
      }
      lastChar = char;
    }

    // Cannot end with underscore
    return lastChar !== '_';
  }

  /**
   * Get maximum length for identifier type
   */
  private static getMaxLength(
    type: SymbolKind,
    isTopLevel: boolean,
    scope: ValidationScope,
  ): number {
    switch (type) {
      case SymbolKind.Exception:
      case SymbolKind.Enum:
      case SymbolKind.Class:
      case SymbolKind.Interface:
        if (!isTopLevel || scope.supportsLongIdentifiers) {
          return this.MAX_LENGTH;
        }
        return this.MAX_CLASS_LENGTH;
      case SymbolKind.Method:
      case SymbolKind.Variable:
      case SymbolKind.Constructor:
      case SymbolKind.Trigger:
      case SymbolKind.Property:
      case SymbolKind.Parameter:
      case SymbolKind.Field:
      case SymbolKind.EnumValue:
        return this.MAX_LENGTH;
      default:
        return this.MAX_LENGTH;
    }
  }

  /**
   * Check if character is a letter
   */
  private static isLetter(char: string): boolean {
    return /[a-zA-Z]/.test(char);
  }

  /**
   * Check if character is a digit
   */
  private static isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }
}
```

## Phase 4: Integration with Symbol Collector

### 4.1 Update ApexSymbolCollectorListener

**File**: `src/parser/listeners/ApexSymbolCollectorListener.ts`

```typescript
// Add import
import { IdentifierValidator } from '../../semantics/validation/IdentifierValidator';

// Add validation to symbol creation methods
enterClassDeclaration(ctx: ClassDeclarationContext): void {
  const name = ctx.id()?.text ?? 'unknownClass';

  // Validate identifier
  const validationResult = IdentifierValidator.validateIdentifier(
    name,
    SymbolKind.Class,
    !this.currentTypeSymbol, // isTopLevel
    this.createValidationScope()
  );

  if (!validationResult.isValid) {
    validationResult.errors.forEach(error => {
      this.addError(error, ctx);
    });
    return;
  }

  // ... rest of existing implementation
}

// Similar integration for other symbol creation methods:
// - enterInterfaceDeclaration
// - enterMethodDeclaration
// - enterConstructorDeclaration
// - enterFieldDeclaration
// - enterLocalVariableDeclaration
// - enterEnumDeclaration
// - enterEnumConstants
```

### 4.2 Create Validation Scope Helper

```typescript
private createValidationScope(): ValidationScope {
  return {
    supportsLongIdentifiers: false, // Default to false
    version: 58, // Default to latest version
    isFileBased: true, // Assume file-based for now
  };
}
```

## Phase 5: Integration Tests

### 5.1 End-to-End Validation Tests

**File**: `test/integration/identifierValidation.integration.test.ts`

```typescript
describe('Identifier Validation Integration', () => {
  let compilerService: CompilerService;
  let symbolListener: ApexSymbolCollectorListener;

  beforeEach(() => {
    compilerService = new CompilerService();
    symbolListener = new ApexSymbolCollectorListener();
  });

  it('should validate class names during compilation', () => {
    const code = `
      public class array {
        public void test() {}
      }
    `;

    const result = compilerService.compile(code, 'test.cls', symbolListener);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain(
      'Identifier name is reserved: array',
    );
  });

  it('should validate method names during compilation', () => {
    const code = `
      public class TestClass {
        public void array() {} // Should be allowed
        public void trigger() {} // Should be allowed
      }
    `;

    const result = compilerService.compile(code, 'test.cls', symbolListener);

    expect(result.errors).toHaveLength(0);
  });

  it('should validate variable names during compilation', () => {
    const code = `
      public class TestClass {
        public void test() {
          String array = 'test'; // Should be rejected
        }
      }
    `;

    const result = compilerService.compile(code, 'test.cls', symbolListener);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain(
      'Identifier name is reserved: array',
    );
  });
});
```

## Phase 6: Performance and Edge Cases

### 6.1 Performance Tests

```typescript
describe('IdentifierValidator - Performance', () => {
  it('should handle large numbers of validations efficiently', () => {
    const startTime = Date.now();
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      IdentifierValidator.validateIdentifier(
        `testName${i}`,
        SymbolKind.Variable,
        false,
        createMockScope(),
      );
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within 100ms for 10k iterations
    expect(duration).toBeLessThan(100);
  });
});
```

### 6.2 Edge Case Tests

```typescript
describe('IdentifierValidator - Edge Cases', () => {
  it('should handle empty string', () => {
    const result = IdentifierValidator.validateIdentifier(
      '',
      SymbolKind.Variable,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid character in identifier: ');
  });

  it('should handle single character identifiers', () => {
    const result = IdentifierValidator.validateIdentifier(
      'a',
      SymbolKind.Variable,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(true);
  });

  it('should handle unicode characters', () => {
    const result = IdentifierValidator.validateIdentifier(
      'test\u00E9', // é character
      SymbolKind.Variable,
      false,
      createMockScope(),
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid character in identifier: testé');
  });
});
```

## Phase 7: Documentation and Examples

### 7.1 Create Documentation

**File**: `docs/identifier-validation.md`

````markdown
# Identifier Validation

This document describes the identifier validation rules implemented in the apex-parser-ast package.

## Rules

1. **Character Validation**: Identifiers must start with a letter and contain only letters, digits, and underscores
2. **Reserved Names**: Cannot use reserved names except for methods
3. **Reserved Type Names**: Cannot use reserved type names for classes/interfaces/exceptions
4. **Keywords**: Cannot use keywords except for methods
5. **Length Validation**: Maximum 255 characters for most identifiers, 40 for top-level classes

## Usage

```typescript
import { IdentifierValidator } from '@salesforce/apex-parser-ast';

const result = IdentifierValidator.validateIdentifier(
  'testName',
  SymbolKind.Variable,
  false,
  scope,
);

if (!result.isValid) {
  console.log('Validation errors:', result.errors);
}
```
````

```

## Implementation Timeline

1. **Week 1**: Foundation setup and core validation rules (Phases 1-2)
2. **Week 2**: Implementation and integration (Phases 3-4)
3. **Week 3**: Integration tests and performance optimization (Phases 5-6)
4. **Week 4**: Documentation and final testing (Phase 7)

## Success Criteria

- [ ] All unit tests pass
- [ ] Integration tests validate end-to-end functionality
- [ ] Performance meets requirements (< 100ms for 10k validations)
- [ ] Error messages match apex-jorje-semantic exactly
- [ ] Documentation is complete and accurate
- [ ] Code coverage > 95%

## Validation Rules Summary

Based on the apex-jorje-semantic rules and Salesforce documentation:

### Character Rules
- Must start with a letter (A-Z or a-z)
- Can contain only letters, digits (0-9), and underscores (_)
- Cannot contain consecutive underscores (__)
- Cannot end with underscore (_)
- Case-insensitive validation

### Reserved Names (53 total)
Cannot be used except for methods:
- `array`, `activate`, `any`, `autonomous`, `begin`, `bigDecimal`
- `bulk`, `byte`, `case`, `cast`, `char`, `collect`, `commit`
- `const`, `default`, `desc`, `end`, `export`, `exception`, `exit`
- `float`, `goto`, `group`, `having`, `hint`, `int`, `into`
- `inner`, `import`, `join`, `loop`, `number`, `object`, `outer`
- `of`, `package`, `parallel`, `pragma`, `retrieve`, `rollback`
- `sort`, `short`, `super`, `switch`, `system`, `synchronized`
- `transaction`, `this`, `then`, `when`

### Reserved Type Names (2 total)
Cannot be used for classes/interfaces/exceptions:
- `apexPages`, `page`

### Keywords (10 total)
Cannot be used except for methods:
- `trigger`, `insert`, `update`, `upsert`, `delete`, `undelete`
- `merge`, `new`, `for`, `select`

### Length Rules
- Maximum 255 characters for most identifiers
- Maximum 40 characters for top-level classes (unless long identifiers supported)
- Long identifiers support can be enabled via ValidationScope

This TDD plan provides a comprehensive approach to implementing identifier validation while ensuring code quality, performance, and maintainability.
```
