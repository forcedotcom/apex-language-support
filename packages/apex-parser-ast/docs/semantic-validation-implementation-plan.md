# Apex Semantic Validation Implementation Plan

## Overview

This document provides a detailed implementation plan for achieving semantic validation parity with the apex-jorje-semantic module. The plan includes specific technical details, code examples, and step-by-step instructions for implementing each missing validation capability.

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Create Validation Infrastructure

#### Step 1.1.1: Create Validation Framework Classes

**File**: `src/semantics/validation/ValidationFramework.ts`

```typescript
/**
 * Core validation framework for Apex semantic validation
 */
export interface ValidationScope {
  errors: ErrorReporter;
  settings: ValidationSettings;
  symbolTable: SymbolTable;
  currentContext: ValidationContext;
  compilationContext: CompilationContext;
}

export interface ValidationSettings {
  collectMultipleErrors: boolean;
  breakOnFirstError: boolean;
  enableWarnings: boolean;
  maxErrors: number;
  version: number; // Apex API version
}

export interface ValidationContext {
  currentType: TypeSymbol | null;
  currentMethod: MethodSymbol | null;
  isStaticContext: boolean;
  blockDepth: number;
  currentNamespace: string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  type?: TypeInfo;
}

export class ValidationFramework {
  private scope: ValidationScope;

  constructor(scope: ValidationScope) {
    this.scope = scope;
  }

  /**
   * Validate and continue or break based on settings
   */
  validate(validationFn: () => ValidationResult): boolean {
    const result = validationFn();

    if (!result.isValid) {
      result.errors.forEach((error) => {
        this.scope.errors.addError(error, this.getCurrentContext());
      });

      if (this.scope.settings.breakOnFirstError) {
        return false;
      }
    }

    return true;
  }

  private getCurrentContext(): ParserRuleContext {
    // Implementation to get current parser context
    return {} as ParserRuleContext;
  }
}
```

#### Step 1.1.2: Create Validation Settings Manager

**File**: `src/semantics/validation/ValidationSettingsManager.ts`

```typescript
/**
 * Manages validation settings and configuration
 */
export class ValidationSettingsManager {
  private static readonly DEFAULT_SETTINGS: ValidationSettings = {
    collectMultipleErrors: true,
    breakOnFirstError: false,
    enableWarnings: true,
    maxErrors: 100,
    version: 58, // Latest Apex API version
  };

  static createDefaultSettings(): ValidationSettings {
    return { ...this.DEFAULT_SETTINGS };
  }

  static createSettings(
    overrides: Partial<ValidationSettings>,
  ): ValidationSettings {
    return { ...this.DEFAULT_SETTINGS, ...overrides };
  }

  static createStrictSettings(): ValidationSettings {
    return {
      ...this.DEFAULT_SETTINGS,
      breakOnFirstError: true,
      maxErrors: 1,
    };
  }
}
```

### 1.2 Implement Identifier Validation

#### Step 1.2.1: Create Identifier Validator

**File**: `src/semantics/validation/IdentifierValidator.ts`

```typescript
/**
 * Validates Apex identifiers according to semantic rules
 */
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

    let lastChar = 'x';
    for (let i = 0; i < name.length; i++) {
      const c = name.charAt(i);

      // First character must be a letter
      if (i === 0 && !this.isLetter(c)) {
        return false;
      }

      // Only letters, digits, and underscores allowed
      if (!this.isLetter(c) && !this.isDigit(c) && c !== '_') {
        return false;
      }

      // No consecutive underscores
      if (lastChar === '_' && c === '_') {
        return false;
      }
      lastChar = c;
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
        // Check if long identifiers are supported
        if (!isTopLevel || scope.compilationContext.version >= 58) {
          return this.MAX_LENGTH;
        }
        return this.MAX_CLASS_LENGTH;
      case SymbolKind.Method:
      case SymbolKind.Variable:
      case SymbolKind.Constructor:
      case SymbolKind.Trigger:
      case SymbolKind.Property:
      case SymbolKind.Field:
      case SymbolKind.Parameter:
      case SymbolKind.EnumValue:
        return this.MAX_LENGTH;
      default:
        return this.MAX_LENGTH;
    }
  }

  private static isLetter(c: string): boolean {
    return /[a-zA-Z]/.test(c);
  }

  private static isDigit(c: string): boolean {
    return /[0-9]/.test(c);
  }
}
```

#### Step 1.2.2: Integrate Identifier Validation with Symbol Collection

**File**: `src/parser/listeners/ApexSymbolCollectorListener.ts`

Add to the existing `ApexSymbolCollectorListener` class:

```typescript
// Add import
import { IdentifierValidator } from '../../semantics/validation/IdentifierValidator';

// Add to class methods
private validateIdentifier(
  name: string,
  type: SymbolKind,
  isTopLevel: boolean,
  ctx: ParserRuleContext
): boolean {
  const scope = this.createValidationScope();
  const result = IdentifierValidator.validateIdentifier(name, type, isTopLevel, scope);

  if (!result.isValid) {
    result.errors.forEach(error => {
      this.addError(error, ctx);
    });
    return false;
  }

  return true;
}

private createValidationScope(): ValidationScope {
  return {
    errors: this,
    settings: {
      collectMultipleErrors: true,
      breakOnFirstError: false,
      enableWarnings: true,
      maxErrors: 100,
      version: 58,
    },
    symbolTable: this.symbolTable,
    currentContext: {
      currentType: this.currentTypeSymbol,
      currentMethod: this.currentMethodSymbol,
      isStaticContext: false, // TODO: track static context
      blockDepth: this.blockDepth,
      currentNamespace: this.currentNamespace?.name || null,
    },
    compilationContext: {
      namespace: this.projectNamespace,
      version: 58,
      isTrusted: true,
      sourceType: 'FILE',
      referencingType: null,
      enclosingTypes: [],
      parentTypes: [],
      isStaticContext: false,
    },
  };
}

// Modify existing methods to include validation
enterClassDeclaration(ctx: ClassDeclarationContext): void {
  const name = ctx.id()?.text ?? 'unknownClass';

  // Validate identifier before creating symbol
  if (!this.validateIdentifier(name, SymbolKind.Class, !this.currentTypeSymbol, ctx)) {
    return; // Skip symbol creation if validation fails
  }

  // ... rest of existing implementation
}

// Similar modifications for other symbol creation methods
```

## Phase 2: Expression System (Weeks 3-6)

### 2.1 Create Expression Validation Framework

#### Step 2.1.1: Create Expression Type System

**File**: `src/semantics/validation/ExpressionTypeSystem.ts`

```typescript
/**
 * Type system for expression validation
 */
export interface ExpressionType {
  kind: 'primitive' | 'object' | 'collection' | 'void' | 'unresolved';
  name: string;
  isNullable: boolean;
  isArray: boolean;
  elementType?: ExpressionType;
  keyType?: ExpressionType; // For maps
  valueType?: ExpressionType; // For maps
}

export class ExpressionTypeSystem {
  // Primitive types
  static readonly VOID: ExpressionType = {
    kind: 'primitive',
    name: 'void',
    isNullable: false,
    isArray: false,
  };
  static readonly BOOLEAN: ExpressionType = {
    kind: 'primitive',
    name: 'boolean',
    isNullable: false,
    isArray: false,
  };
  static readonly INTEGER: ExpressionType = {
    kind: 'primitive',
    name: 'integer',
    isNullable: false,
    isArray: false,
  };
  static readonly LONG: ExpressionType = {
    kind: 'primitive',
    name: 'long',
    isNullable: false,
    isArray: false,
  };
  static readonly DOUBLE: ExpressionType = {
    kind: 'primitive',
    name: 'double',
    isNullable: false,
    isArray: false,
  };
  static readonly DECIMAL: ExpressionType = {
    kind: 'primitive',
    name: 'decimal',
    isNullable: false,
    isArray: false,
  };
  static readonly STRING: ExpressionType = {
    kind: 'primitive',
    name: 'string',
    isNullable: false,
    isArray: false,
  };
  static readonly DATE: ExpressionType = {
    kind: 'primitive',
    name: 'date',
    isNullable: false,
    isArray: false,
  };
  static readonly DATETIME: ExpressionType = {
    kind: 'primitive',
    name: 'datetime',
    isNullable: false,
    isArray: false,
  };
  static readonly TIME: ExpressionType = {
    kind: 'primitive',
    name: 'time',
    isNullable: false,
    isArray: false,
  };

  /**
   * Check if type is numeric
   */
  static isNumeric(type: ExpressionType): boolean {
    return (
      type === this.INTEGER ||
      type === this.LONG ||
      type === this.DOUBLE ||
      type === this.DECIMAL
    );
  }

  /**
   * Check if type is integer or long
   */
  static isIntegerOrLong(type: ExpressionType): boolean {
    return type === this.INTEGER || type === this.LONG;
  }

  /**
   * Check if type is date/time
   */
  static isDateTime(type: ExpressionType): boolean {
    return type === this.DATE || type === this.DATETIME || type === this.TIME;
  }

  /**
   * Promote types for arithmetic operations
   */
  static promoteTypes(
    left: ExpressionType,
    right: ExpressionType,
  ): ExpressionType {
    // String concatenation
    if (left === this.STRING || right === this.STRING) {
      return this.STRING;
    }

    // Date/Time operations
    if (this.isDateTime(left)) {
      return left;
    }

    // Numeric promotion
    if (left === this.DECIMAL || right === this.DECIMAL) {
      return this.DECIMAL;
    }
    if (left === this.DOUBLE || right === this.DOUBLE) {
      return this.DOUBLE;
    }
    if (left === this.LONG || right === this.LONG) {
      return this.LONG;
    }

    return this.INTEGER;
  }
}
```

#### Step 2.1.2: Create Binary Expression Validator

**File**: `src/semantics/validation/BinaryExpressionValidator.ts`

```typescript
/**
 * Validates binary expressions according to Apex semantic rules
 */
export class BinaryExpressionValidator {
  /**
   * Validate arithmetic operations
   */
  static validateArithmetic(
    left: ExpressionType,
    right: ExpressionType,
    operation: string,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Void expressions cannot be used in arithmetic (pre-V174)
    if (
      (left === ExpressionTypeSystem.VOID ||
        right === ExpressionTypeSystem.VOID) &&
      scope.compilationContext.version < 174
    ) {
      errors.push('invalid.void.arithmetic.expression');
      return { isValid: false, errors, warnings };
    }

    // Check 2: String concatenation (only addition allowed)
    if (
      left === ExpressionTypeSystem.STRING ||
      right === ExpressionTypeSystem.STRING
    ) {
      if (operation !== '+') {
        errors.push('invalid.numeric.arguments.expression');
        return { isValid: false, errors, warnings };
      }
      return {
        isValid: true,
        errors,
        warnings,
        type: ExpressionTypeSystem.STRING,
      };
    }

    // Check 3: Date/Time operations
    if (ExpressionTypeSystem.isDateTime(left)) {
      if (operation !== '+' && operation !== '-') {
        errors.push('invalid.numeric.arguments.expression');
        return { isValid: false, errors, warnings };
      }

      // Validate operand types for date/time operations
      switch (left.name) {
        case 'time':
          if (!ExpressionTypeSystem.isIntegerOrLong(right)) {
            errors.push('invalid.time.operand.expression');
            return { isValid: false, errors, warnings };
          }
          break;
        case 'date':
          if (!ExpressionTypeSystem.isIntegerOrLong(right)) {
            errors.push('invalid.date.operand.expression');
            return { isValid: false, errors, warnings };
          }
          break;
        case 'datetime':
          if (!ExpressionTypeSystem.isNumeric(right)) {
            errors.push('invalid.datetime.operand.expression');
            return { isValid: false, errors, warnings };
          }
          break;
      }
      return { isValid: true, errors, warnings, type: left };
    }

    // Check 4: Numeric operations
    if (
      !ExpressionTypeSystem.isNumeric(left) ||
      !ExpressionTypeSystem.isNumeric(right)
    ) {
      errors.push('invalid.numeric.arguments.expression');
      return { isValid: false, errors, warnings };
    }

    const resultType = ExpressionTypeSystem.promoteTypes(left, right);
    return { isValid: true, errors, warnings, type: resultType };
  }

  /**
   * Validate shift operations
   */
  static validateShift(
    left: ExpressionType,
    right: ExpressionType,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Both operands must be integer or long
    if (
      !ExpressionTypeSystem.isIntegerOrLong(left) ||
      !ExpressionTypeSystem.isIntegerOrLong(right)
    ) {
      errors.push('invalid.shift.operator.arguments');
      return { isValid: false, errors, warnings };
    }

    // Version-specific behavior (pre-V160)
    if (scope.compilationContext.version < 160) {
      if (
        left === ExpressionTypeSystem.INTEGER &&
        right === ExpressionTypeSystem.LONG
      ) {
        return {
          isValid: true,
          errors,
          warnings,
          type: ExpressionTypeSystem.LONG,
        };
      }
    }

    return { isValid: true, errors, warnings, type: left };
  }

  /**
   * Validate bitwise operations
   */
  static validateBitwise(
    left: ExpressionType,
    right: ExpressionType,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Both operands must be integer or long
    if (
      !ExpressionTypeSystem.isIntegerOrLong(left) ||
      !ExpressionTypeSystem.isIntegerOrLong(right)
    ) {
      errors.push('invalid.bitwise.operator.arguments');
      return { isValid: false, errors, warnings };
    }

    // Type promotion rules
    if (
      left === ExpressionTypeSystem.LONG ||
      right === ExpressionTypeSystem.LONG
    ) {
      return {
        isValid: true,
        errors,
        warnings,
        type: ExpressionTypeSystem.LONG,
      };
    }

    return {
      isValid: true,
      errors,
      warnings,
      type: ExpressionTypeSystem.INTEGER,
    };
  }
}
```

### 2.2 Create Expression Listener

#### Step 2.2.1: Create Expression Validation Listener

**File**: `src/parser/listeners/ApexExpressionValidatorListener.ts`

```typescript
/**
 * Listener that validates expressions during parsing
 */
export class ApexExpressionValidatorListener extends BaseApexParserListener<void> {
  private readonly expressionValidator: ExpressionValidator;
  private readonly scope: ValidationScope;

  constructor(scope: ValidationScope) {
    super();
    this.scope = scope;
    this.expressionValidator = new ExpressionValidator(scope);
  }

  /**
   * Validate binary expressions
   */
  enterBinaryExpression(ctx: BinaryExpressionContext): void {
    try {
      const leftType = this.getExpressionType(ctx.left);
      const rightType = this.getExpressionType(ctx.right);
      const operation = ctx.operator?.text || '';

      let result: ValidationResult;

      switch (operation) {
        case '+':
        case '-':
        case '*':
        case '/':
        case '%':
          result = BinaryExpressionValidator.validateArithmetic(
            leftType,
            rightType,
            operation,
            this.scope,
          );
          break;
        case '<<':
        case '>>':
        case '>>>':
          result = BinaryExpressionValidator.validateShift(
            leftType,
            rightType,
            this.scope,
          );
          break;
        case '&':
        case '|':
        case '^':
          result = BinaryExpressionValidator.validateBitwise(
            leftType,
            rightType,
            this.scope,
          );
          break;
        default:
          // Other binary operations handled separately
          return;
      }

      if (!result.isValid) {
        result.errors.forEach((error) => {
          this.addError(error, ctx);
        });
      }
    } catch (error) {
      this.addError(`Error validating binary expression: ${error}`, ctx);
    }
  }

  /**
   * Get expression type (simplified implementation)
   */
  private getExpressionType(ctx: ParserRuleContext): ExpressionType {
    // This is a simplified implementation
    // In practice, this would need to resolve types from the symbol table
    return ExpressionTypeSystem.INTEGER;
  }

  getResult(): void {
    // This listener doesn't produce a result
  }

  createNewInstance(): BaseApexParserListener<void> {
    return new ApexExpressionValidatorListener(this.scope);
  }
}
```

## Phase 3: Type System Enhancement (Weeks 7-10)

### 3.1 Implement Type Visibility Validation

#### Step 3.1.1: Create Type Visibility Validator

**File**: `src/semantics/validation/TypeVisibilityValidator.ts`

```typescript
/**
 * Validates type visibility and accessibility
 */
export class TypeVisibilityValidator {
  /**
   * Validate that a type is visible from the current context
   */
  static validateTypeVisibility(
    targetType: TypeSymbol,
    currentContext: ValidationContext,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if type is in the same namespace
    if (targetType.namespace && currentContext.currentNamespace) {
      if (targetType.namespace.name !== currentContext.currentNamespace) {
        // Check if type is public/global
        if (
          targetType.modifiers.visibility !== SymbolVisibility.Public &&
          targetType.modifiers.visibility !== SymbolVisibility.Global
        ) {
          errors.push('type.not.visible');
          return { isValid: false, errors, warnings };
        }
      }
    }

    // Check if type is accessible from current context
    if (!this.isAccessible(targetType, currentContext)) {
      errors.push('type.not.visible');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Check if a type is accessible from the current context
   */
  private static isAccessible(
    targetType: TypeSymbol,
    currentContext: ValidationContext,
  ): boolean {
    // Implementation depends on visibility rules
    // This is a simplified version
    return true;
  }
}
```

### 3.2 Implement Type Casting Validation

#### Step 3.2.1: Create Type Casting Validator

**File**: `src/semantics/validation/TypeCastingValidator.ts`

```typescript
/**
 * Validates type casting operations
 */
export class TypeCastingValidator {
  /**
   * Validate a cast operation
   */
  static validateCast(
    sourceType: ExpressionType,
    targetType: ExpressionType,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if target type is valid for casting
    if (!this.isValidCastTarget(targetType)) {
      errors.push('invalid.cast.type');
      return { isValid: false, errors, warnings };
    }

    // Check if types are compatible for casting
    if (!this.isCompatibleForCast(sourceType, targetType)) {
      errors.push('incompatible.cast.types');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Check if a type is a valid cast target
   */
  private static isValidCastTarget(type: ExpressionType): boolean {
    // Implementation of valid cast target rules
    return true;
  }

  /**
   * Check if types are compatible for casting
   */
  private static isCompatibleForCast(
    source: ExpressionType,
    target: ExpressionType,
  ): boolean {
    // Implementation of cast compatibility rules
    return true;
  }
}
```

## Phase 4: Built-in Method Validation (Weeks 11-14)

### 4.1 Create Method Call Validation Framework

#### Step 4.1.1: Create Method Call Validator

**File**: `src/semantics/validation/MethodCallValidator.ts`

```typescript
/**
 * Validates method calls according to Apex semantic rules
 */
export class MethodCallValidator {
  /**
   * Validate AddError method calls
   */
  static validateAddError(
    methodCall: MethodCallExpression,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get the last variable in the method call chain
    const lastVariable = this.getLastVariable(methodCall);

    if (!lastVariable) {
      errors.push('method.invalid.add.error.not.sobject.field');
      return { isValid: false, errors, warnings };
    }

    // Validate SObject field reference
    const validationResult = this.validateSObjectField(
      lastVariable,
      methodCall,
      scope,
    );
    if (!validationResult.isValid) {
      errors.push(...validationResult.errors);
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate SObject field for AddError
   */
  private static validateSObjectField(
    variable: VariableSymbol,
    methodCall: MethodCallExpression,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if it's a SOQL expression
    if (this.isSoqlExpression(methodCall)) {
      errors.push('method.invalid.add.error.not.sobject.scalar.field');
      return { isValid: false, errors, warnings };
    }

    // Check if it's a regular SObject field
    if (
      variable.kind !== SymbolKind.Field ||
      !this.isRegularSObjectField(variable)
    ) {
      errors.push('method.invalid.add.error.not.sobject.scalar.field');
      return { isValid: false, errors, warnings };
    }

    // Check for safe navigation operator
    if (this.hasSafeNavigationAfterField(methodCall)) {
      errors.push(
        'safe.navigation.invalid.between.sobject.field.and.add.error',
      );
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  private static getLastVariable(
    methodCall: MethodCallExpression,
  ): VariableSymbol | null {
    // Implementation to get the last variable in the call chain
    return null;
  }

  private static isSoqlExpression(methodCall: MethodCallExpression): boolean {
    // Implementation to check if expression is SOQL
    return false;
  }

  private static isRegularSObjectField(variable: VariableSymbol): boolean {
    // Implementation to check if field is regular SObject field
    return false;
  }

  private static hasSafeNavigationAfterField(
    methodCall: MethodCallExpression,
  ): boolean {
    // Implementation to check for safe navigation operator
    return false;
  }
}
```

## Phase 5: Advanced Validation (Weeks 15-16)

### 5.1 Implement Statement Validation

#### Step 5.1.1: Create Statement Validator

**File**: `src/semantics/validation/StatementValidator.ts`

```typescript
/**
 * Validates Apex statements
 */
export class StatementValidator {
  /**
   * Validate variable declaration statements
   */
  static validateVariableDeclaration(
    type: ExpressionType,
    initializer: ExpressionType | null,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if variable type is visible
    if (
      !TypeVisibilityValidator.validateTypeVisibility(
        type,
        scope.currentContext,
        scope,
      ).isValid
    ) {
      errors.push('type.not.visible');
      return { isValid: false, errors, warnings };
    }

    // Check if initializer is compatible with declared type
    if (initializer && !this.isCompatibleType(type, initializer)) {
      errors.push('incompatible.types');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate switch statements
   */
  static validateSwitchStatement(
    expressionType: ExpressionType,
    whenTypes: ExpressionType[],
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if when values are compatible with switch expression type
    for (const whenType of whenTypes) {
      if (!this.isCompatibleType(expressionType, whenType)) {
        errors.push('incompatible.switch.types');
        return { isValid: false, errors, warnings };
      }
    }

    return { isValid: true, errors, warnings };
  }

  private static isCompatibleType(
    source: ExpressionType,
    target: ExpressionType,
  ): boolean {
    // Implementation of type compatibility rules
    return true;
  }
}
```

### 5.2 Implement Compilation Unit Validation

#### Step 5.2.1: Create Compilation Unit Validator

**File**: `src/semantics/validation/CompilationUnitValidator.ts`

```typescript
/**
 * Validates compilation units (files)
 */
export class CompilationUnitValidator {
  private static readonly MAX_CLASS_SIZE = 1000000; // 1M characters
  private static readonly MAX_ANONYMOUS_BLOCK_SIZE = 32000; // 32K characters
  private static readonly MAX_ANONYMOUS_BLOCK_TEST_SIZE = 3200000; // 3.2M characters

  /**
   * Validate script size
   */
  static validateScriptSize(
    content: string,
    fileName: string,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const maxSize = this.getMaxSize(fileName, scope);

    if (content.length > maxSize) {
      errors.push('script.too.large');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Get maximum size for file type
   */
  private static getMaxSize(fileName: string, scope: ValidationScope): number {
    if (fileName.endsWith('.trigger')) {
      return this.MAX_CLASS_SIZE;
    }

    // Check if it's an anonymous block under test
    if (this.isAnonymousBlockUnderTest(fileName, scope)) {
      return this.MAX_ANONYMOUS_BLOCK_TEST_SIZE;
    }

    return this.MAX_ANONYMOUS_BLOCK_SIZE;
  }

  private static isAnonymousBlockUnderTest(
    fileName: string,
    scope: ValidationScope,
  ): boolean {
    // Implementation to check if anonymous block is under test
    return false;
  }
}
```

## Integration Strategy

### 1. Update Compiler Service

**File**: `src/parser/compilerService.ts`

Add validation integration to the existing `CompilerService`:

```typescript
// Add imports
import { ValidationFramework } from '../semantics/validation/ValidationFramework';
import { ValidationSettingsManager } from '../semantics/validation/ValidationSettingsManager';
import { ApexExpressionValidatorListener } from './listeners/ApexExpressionValidatorListener';

// Add to CompilerService class
private createValidationScope(
  fileName: string,
  options: CompilationOptions
): ValidationScope {
  return {
    errors: new ApexErrorListener(fileName),
    settings: ValidationSettingsManager.createDefaultSettings(),
    symbolTable: new SymbolTable(),
    currentContext: {
      currentType: null,
      currentMethod: null,
      isStaticContext: false,
      blockDepth: 0,
      currentNamespace: options.projectNamespace || this.projectNamespace,
    },
    compilationContext: this.createCompilationContext(
      options.projectNamespace || this.projectNamespace,
      fileName
    ),
  };
}

// Modify compile method to include validation
public compile<T>(
  fileContent: string,
  fileName: string = 'unknown.cls',
  listener: BaseApexParserListener<T>,
  options: CompilationOptions = {},
): CompilationResult<T> | CompilationResultWithComments<T> | CompilationResultWithAssociations<T> {

  // Create validation scope
  const validationScope = this.createValidationScope(fileName, options);

  // Create parse tree
  const { parseTree, errorListener, tokenStream } = this.createParseTree(fileContent, fileName);

  // Set up main listener
  listener.setErrorListener(errorListener);

  // Create expression validator listener
  const expressionValidator = new ApexExpressionValidatorListener(validationScope);
  expressionValidator.setErrorListener(errorListener);

  // Walk tree with main listener
  const walker = new ParseTreeWalker();
  walker.walk(listener, parseTree);

  // Walk tree with expression validator
  walker.walk(expressionValidator, parseTree);

  // ... rest of existing implementation
}
```

### 2. Update Symbol Collector

**File**: `src/parser/listeners/ApexSymbolCollectorListener.ts`

Integrate identifier validation into symbol collection:

```typescript
// Add to existing methods
enterClassDeclaration(ctx: ClassDeclarationContext): void {
  const name = ctx.id()?.text ?? 'unknownClass';

  // Validate identifier
  const validationResult = IdentifierValidator.validateIdentifier(
    name,
    SymbolKind.Class,
    !this.currentTypeSymbol,
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

// Similar integration for other symbol creation methods
```

## Testing Strategy

### 1. Unit Tests

Create comprehensive unit tests for each validator:

**File**: `test/semantics/validation/IdentifierValidator.test.ts`

```typescript
describe('IdentifierValidator', () => {
  describe('validateIdentifier', () => {
    it('should reject reserved names', () => {
      const result = IdentifierValidator.validateIdentifier(
        'array',
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Identifier name is reserved: array');
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

    it('should reject invalid characters', () => {
      const result = IdentifierValidator.validateIdentifier(
        'test@name',
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Invalid character in identifier: test@name',
      );
    });
  });
});
```

### 2. Integration Tests

Create integration tests for the complete validation pipeline:

**File**: `test/integration/semanticValidation.integration.test.ts`

```typescript
describe('Semantic Validation Integration', () => {
  it('should validate complete Apex file', async () => {
    const content = `
      public class TestClass {
        private String array; // Should fail - reserved name
        
        public void testMethod() {
          Integer result = 5 + "string"; // Should fail - incompatible types
        }
      }
    `;

    const result = await compilerService.compile(
      content,
      'TestClass.cls',
      new ApexSymbolCollectorListener(),
      { includeComments: false },
    );

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.message.includes('reserved'))).toBe(
      true,
    );
    expect(result.errors.some((e) => e.message.includes('incompatible'))).toBe(
      true,
    );
  });
});
```

## Performance Optimization

### 1. Caching Strategy

Implement caching for validation results:

```typescript
class ValidationCache {
  private cache = new Map<string, ValidationResult>();

  get(key: string): ValidationResult | undefined {
    return this.cache.get(key);
  }

  set(key: string, result: ValidationResult): void {
    this.cache.set(key, result);
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### 2. Early Termination

Implement early termination for critical errors:

```typescript
class ValidationFramework {
  validate(validationFn: () => ValidationResult): boolean {
    const result = validationFn();

    if (!result.isValid) {
      result.errors.forEach((error) => {
        this.scope.errors.addError(error, this.getCurrentContext());
      });

      if (this.scope.settings.breakOnFirstError) {
        return false; // Early termination
      }
    }

    return true;
  }
}
```

## Conclusion

This implementation plan provides a comprehensive roadmap for achieving semantic validation parity with the apex-jorje-semantic module. The phased approach ensures incremental progress while maintaining system stability and performance.

**Key Success Factors**:

1. **Incremental Implementation**: Each phase builds on the previous one
2. **Comprehensive Testing**: Unit and integration tests for each component
3. **Performance Monitoring**: Regular performance testing and optimization
4. **Compatibility Verification**: Continuous comparison with reference implementation

**Next Steps**:

1. Begin Phase 1 implementation
2. Set up testing infrastructure
3. Establish performance baselines
4. Create validation rule documentation
