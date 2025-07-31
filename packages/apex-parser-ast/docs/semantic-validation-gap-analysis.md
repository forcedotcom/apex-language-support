# Apex Semantic Validation Gap Analysis

## Overview

This document provides a comprehensive analysis of the gap between the semantic validation rules implemented in the apex-jorje-semantic module and the current capabilities of the apex-parser-ast package. The analysis identifies which validation rules are present, absent, or partially implemented, and provides a roadmap for achieving parity.

## Current State Assessment

### ✅ **Present and Implemented**

#### 1. **Error Handling Infrastructure**

- **Status**: ✅ Fully Implemented
- **Location**: `src/parser/listeners/ApexErrorListener.ts`
- **Capabilities**:
  - Structured error reporting with `ApexError` interface
  - Support for syntax and semantic errors
  - Error severity levels (error, warning, info)
  - File path and location tracking
  - Integration with ANTLR error listeners

#### 2. **Annotation Validation**

- **Status**: ✅ Fully Implemented
- **Location**: `src/semantics/annotations/AnnotationValidator.ts`
- **Capabilities**:
  - Annotation target validation
  - Required parameter validation
  - Parameter type validation
  - Support for common Apex annotations (@IsTest, @TestSetup, @RestResource, etc.)
  - Error reporting integration

#### 3. **Modifier Validation**

- **Status**: ✅ Fully Implemented
- **Location**: `src/semantics/modifiers/`
- **Capabilities**:
  - Class modifier validation (`ClassModifierValidator.ts`)
  - Method modifier validation (`MethodModifierValidator.ts`)
  - Field modifier validation (`FieldModifierValidator.ts`)
  - Property modifier validation (`PropertyModifierValidator.ts`)
  - Interface body validation (`InterfaceBodyValidator.ts`)
  - Base modifier validation (`BaseModifierValidator.ts`)

#### 4. **Basic Symbol Collection**

- **Status**: ✅ Fully Implemented
- **Location**: `src/parser/listeners/ApexSymbolCollectorListener.ts`
- **Capabilities**:
  - Symbol table construction
  - Scope management
  - Basic duplicate detection
  - Namespace resolution (Phase 4)
  - Error reporting integration

### ⚠️ **Partially Implemented**

#### 1. **Identifier Validation**

- **Status**: ✅ Fully Implemented
- **Location**: `src/semantics/validation/IdentifierValidator.ts`
- **Capabilities**:
  - Reserved name validation (53 reserved names)
  - Reserved type name validation (2 reserved type names)
  - Keyword validation (10 keywords)
  - Character validation (start with letter, valid chars, no consecutive underscores)
  - Case-insensitive validation
  - Method exceptions for reserved names and keywords
  - Integration with symbol collection process
- **Missing Capabilities**:
  - Length validation (255 chars max, 40 for top-level classes)
  - Integration with ApexSymbolCollectorListener

#### 2. **Type System Validation**

- **Status**: ⚠️ Partially Implemented
- **Current Capabilities**:
  - Basic type collection and resolution
  - Namespace resolution for types
- **Missing Capabilities**:
  - Type visibility validation
  - Type casting validation
  - Collection type validation
  - SObject type validation

### ❌ **Not Implemented**

#### 1. **Expression Validation**

- **Status**: ❌ Not Implemented
- **Missing Capabilities**:
  - Binary expression validation (arithmetic, comparison, logical)
  - Boolean expression validation
  - Array store expression validation
  - Variable expression validation
  - Super expression validation
  - Java expression validation
  - Constructor expression validation
  - Type promotion rules
  - Date/Time operation validation

#### 2. **Statement Validation**

- **Status**: ❌ Not Implemented
- **Missing Capabilities**:
  - Variable declaration statement validation
  - Switch statement validation
  - Type compatibility validation

#### 3. **Built-in Method Validation**

- **Status**: ❌ Not Implemented
- **Missing Capabilities**:
  - AddError method validation
  - Decimal to Double conversion validation
  - Map PutAll validation
  - SObject collection validation
  - System comparator validation
  - Custom entity validation
  - SObject formula recalculation validation

#### 4. **Interface and Class Validation**

- **Status**: ❌ Not Implemented
- **Missing Capabilities**:
  - Interface hierarchy validation
  - Interface implementation validation
  - Exception constructor validation
  - Method collision detection

#### 5. **Variable Validation**

- **Status**: ❌ Not Implemented
- **Missing Capabilities**:
  - Variable visibility validation
  - Variable context validation
  - Static vs instance context validation
  - Final field initialization validation
  - Forward reference validation

#### 6. **Compilation Unit Validation**

- **Status**: ❌ Not Implemented
- **Missing Capabilities**:
  - Script size validation (1M chars for classes, 32K for anonymous blocks)
  - Expression length validation
  - File size limits enforcement

#### 7. **Visibility and Access Validation**

- **Status**: ❌ Not Implemented
- **Missing Capabilities**:
  - Type visibility validation
  - Method visibility validation
  - Variable visibility validation
  - Access control validation

#### 8. **Parser-Level Semantic Validation**

- **Status**: ❌ Not Implemented
- **Missing Capabilities**:
  - Lexical validation (control characters, invalid symbols)
  - Identifier validation during parsing
  - Literal validation (integer, long, double, decimal)
  - Date/Time validation
  - SOQL validation
  - Type reference validation

## Detailed Gap Analysis by Category

### 1. Identifier Validation (High Priority)

**Current State**: ✅ Fully implemented
**Completed Components**:

- `IdentifierValidator` class with comprehensive validation rules
- Reserved name lists and validation logic (53 reserved names)
- Reserved type name validation (2 reserved type names)
- Keyword validation (10 keywords)
- Character validation rules (start with letter, valid chars, no consecutive underscores)
- Case-insensitive validation
- Method exceptions for reserved names and keywords
- Comprehensive test suite (73 tests)

**Missing Components**:

- Length validation rules (255 chars max, 40 for top-level classes)
- Integration with ApexSymbolCollectorListener

**Implementation Effort**: ✅ Completed (2 weeks)

### 2. Expression Validation (High Priority)

**Current State**: Not implemented
**Missing Components**:

- Expression type inference system
- Binary expression validation
- Type promotion rules
- Date/Time operation validation
- Integration with symbol resolution

**Implementation Effort**: High (4-6 weeks)

### 3. Type System Validation (Medium Priority)

**Current State**: Basic type collection
**Missing Components**:

- Type visibility validation
- Type casting validation
- Collection type validation
- SObject type validation

**Implementation Effort**: Medium (3-4 weeks)

### 4. Built-in Method Validation (Medium Priority)

**Current State**: Not implemented
**Missing Components**:

- Method call validation system
- SObject field validation
- Built-in method rule sets
- Integration with expression validation

**Implementation Effort**: Medium (3-4 weeks)

### 5. Statement Validation (Low Priority)

**Current State**: Not implemented
**Missing Components**:

- Statement type validation
- Variable declaration validation
- Switch statement validation

**Implementation Effort**: Low (1-2 weeks)

### 6. Compilation Unit Validation (Low Priority)

**Current State**: Not implemented
**Missing Components**:

- File size validation
- Expression length validation
- Integration with compilation process

**Implementation Effort**: Low (1 week)

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2) ✅ COMPLETED

1. **Create Validation Infrastructure** ✅
   - Implement `ValidationScope` class
   - Create `ValidationSettings` for error collection behavior
   - Establish validation rule framework

2. **Implement Identifier Validation** ✅
   - Create `IdentifierValidator` class
   - Implement reserved name validation (53 names)
   - Add character validation (start with letter, valid chars, no consecutive underscores)
   - Add keyword validation (10 keywords)
   - Add reserved type name validation (2 names)
   - Add case-insensitive validation
   - Add method exceptions for reserved names and keywords
   - Create comprehensive test suite (73 tests)
   - **Remaining**: Length validation and integration with symbol collection

### Phase 2: Expression System (Weeks 3-6)

1. **Create Expression Validation Framework**
   - Implement expression type inference
   - Create binary expression validation
   - Add type promotion rules
   - Implement date/time validation

2. **Integrate with Symbol System**
   - Connect expression validation to symbol resolution
   - Add type compatibility checking
   - Implement error reporting integration

### Phase 3: Type System Enhancement (Weeks 7-10)

1. **Implement Type Validation**
   - Add type visibility validation
   - Implement type casting validation
   - Add collection type validation
   - Create SObject type validation

2. **Enhance Symbol Resolution**
   - Improve type resolution accuracy
   - Add visibility checking
   - Implement access control validation

### Phase 4: Built-in Method Validation (Weeks 11-14)

1. **Implement Method Call Validation**
   - Create method call validation system
   - Implement SObject field validation
   - Add built-in method rule sets

2. **Integration and Testing**
   - Integrate with expression validation
   - Add comprehensive test coverage
   - Performance optimization

### Phase 5: Advanced Validation (Weeks 15-16)

1. **Statement Validation**
   - Implement variable declaration validation
   - Add switch statement validation

2. **Compilation Unit Validation**
   - Add file size validation
   - Implement expression length validation

## Technical Implementation Details

### 1. Validation Framework Architecture

```typescript
// Proposed validation framework structure
interface ValidationScope {
  errors: ErrorReporter;
  settings: ValidationSettings;
  symbolTable: SymbolTable;
  currentContext: ValidationContext;
}

interface ValidationSettings {
  collectMultipleErrors: boolean;
  breakOnFirstError: boolean;
  enableWarnings: boolean;
}

interface ValidationContext {
  currentType: TypeSymbol | null;
  currentMethod: MethodSymbol | null;
  isStaticContext: boolean;
  blockDepth: number;
}
```

### 2. Expression Validation System

```typescript
// Proposed expression validation structure
interface ExpressionValidator {
  validateBinaryExpression(
    expr: BinaryExpression,
    scope: ValidationScope,
  ): TypeInfo;
  validateBooleanExpression(
    expr: BooleanExpression,
    scope: ValidationScope,
  ): TypeInfo;
  validateVariableExpression(
    expr: VariableExpression,
    scope: ValidationScope,
  ): TypeInfo;
  // ... other expression types
}

interface TypePromotionRules {
  promoteTypes(left: TypeInfo, right: TypeInfo, operation: BinaryOp): TypeInfo;
  validateCompatibility(
    left: TypeInfo,
    right: TypeInfo,
    operation: BinaryOp,
  ): boolean;
}
```

### 3. Identifier Validation System

```typescript
// Proposed identifier validation structure
class IdentifierValidator {
  private static readonly RESERVED_NAMES = new Set([
    'array',
    'activate',
    'any',
    'autonomous',
    'begin',
    'bigDecimal',
    // ... complete list from semantic rules
  ]);

  private static readonly RESERVED_TYPE_NAMES = new Set(['apexPages', 'page']);

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

  static validateIdentifier(
    name: string,
    type: SymbolKind,
    isTopLevel: boolean,
    scope: ValidationScope,
  ): ValidationResult;
}
```

## Testing Strategy

### 1. Unit Tests

- Individual validation rule tests
- Edge case testing
- Error message validation
- Performance testing

### 2. Integration Tests

- End-to-end validation testing
- Symbol table integration
- Error reporting integration
- Namespace resolution integration

### 3. Compatibility Tests

- Comparison with apex-jorje-semantic behavior
- Error message consistency
- Validation rule parity

## Performance Considerations

### 1. Memory Optimization

- Reuse validation objects where possible
- Implement lazy validation for large files
- Optimize error collection for multiple errors

### 2. Speed Optimization

- Cache validation results
- Implement early termination for critical errors
- Optimize type resolution lookups

### 3. Scalability

- Support for large codebases
- Parallel validation where possible
- Incremental validation for changed files

## Success Criteria

### 1. Functional Parity

- All semantic validation rules from apex-jorje-semantic implemented
- Error messages match reference implementation
- Validation behavior consistent with Apex compiler

### 2. Performance Requirements

- Validation time < 2x parsing time
- Memory usage < 1.5x current symbol table usage
- Support for files up to 1M characters

### 3. Quality Requirements

- 90%+ test coverage
- Zero false positives in validation
- Comprehensive error reporting

## Conclusion

The current apex-parser-ast package has a solid foundation with error handling infrastructure, annotation validation, and modifier validation. However, significant gaps exist in expression validation, type system validation, and built-in method validation.

The proposed implementation roadmap provides a structured approach to achieving full semantic validation parity with the apex-jorje-semantic module. The phased approach allows for incremental progress while maintaining system stability and performance.

**Estimated Total Effort**: 14 weeks (2 weeks completed)
**Priority Areas**: Expression validation, type system validation, identifier integration
**Risk Areas**: Expression type inference complexity, performance impact of comprehensive validation
**Completed**: Identifier validation foundation (Phase 1)
