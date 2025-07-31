# Apex-Jorje Semantic Validation Rules

This document provides a comprehensive overview of all semantic validation rules implemented in the apex-jorje-semantic module, organized by category and including error messages, validation logic, and examples.

---

## Table of Contents

1. [Identifier Validation](#1-identifier-validation)
2. [Type System Validation](#2-type-system-validation)
3. [Expression Validation](#3-expression-validation)
4. [Statement Validation](#4-statement-validation)
5. [Modifier and Annotation Validation](#5-modifier-and-annotation-validation)
6. [Built-in Method Validation](#6-built-in-method-validation)
7. [Interface and Class Validation](#7-interface-and-class-validation)
8. [Variable Validation](#8-variable-validation)
9. [Compilation Unit Validation](#9-compilation-unit-validation)
10. [Visibility and Access Validation](#10-visibility-and-access-validation)
11. [Parser-Level Semantic Validation](#11-parser-level-semantic-validation)

---

## 1. Identifier Validation

### 1.1 Reserved Identifiers
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/symbol/member/IdentifierValidator.java`

**Rules**:
- **Reserved Names**: Cannot use reserved names (case-insensitive) except for methods
- **Reserved Type Names**: Cannot use reserved type names for classes/interfaces/exceptions
- **Keywords**: Identifiers cannot be keywords (but methods can use reserved names)
- **Character Validation**: Must start with letter, only letters/digits/underscores, no consecutive underscores, cannot end with underscore
- **Length Validation**: Maximum 255 characters for most identifiers, 40 for top-level classes (unless long identifiers supported)

**Error Messages**:
- `"Identifier name is reserved: {0}"` (key: `invalid.reserved.name.identifier`)
- `"Identifier type is reserved: {0}"` (key: `invalid.reserved.type.identifier`)
- `"Identifier cannot be a keyword: {0}"` (key: `invalid.keyword.identifier`)
- `"Invalid character in identifier: {0}"` (key: `invalid.character.identifier`)
- `"Identifier name is too long: {0}"` (key: `identifier.too.long`)

**Reserved Names**: `array, activate, any, autonomous, begin, bigDecimal, bulk, byte, case, cast, char, collect, commit, const, default, desc, end, export, exception, exit, float, goto, group, having, hint, int, into, inner, import, join, loop, number, object, outer, of, package, parallel, pragma, retrieve, rollback, sort, short, super, switch, system, synchronized, transaction, this, then, when`

**Reserved Type Names**: `apexPages, page`

**Keywords**: `trigger, insert, update, upsert, delete, undelete, merge, new, for, select`

### 1.2 Validation Rules Summary

- **Invalid Characters**: Must start with a letter, only letters/digits/underscores, no consecutive underscores, cannot end with underscore
- **Keywords**: Identifiers cannot be keywords (but methods can use reserved names)
- **Reserved Names**: Cannot use reserved names (except methods)
- **Reserved Types**: Cannot use reserved type names for classes/interfaces/exceptions
- **Length**: Maximum 255 characters for most identifiers, 40 for top-level classes (unless long identifiers are supported)

### 1.3 Examples from Tests

- Using a reserved name as an enum value:
  ```java
  public enum Foo { System, Package, Import }
  // Fails with: Identifier name is reserved: System
  ```
- Using a reserved name as a variable:
  ```java
  String array;
  // Fails with: Identifier name is reserved: array
  ```

### 1.4 Pseudocode

```java
Check check(TypeInfo definingType, String name, Type type, boolean isTopLevel, boolean ignoreCheck) {
    // Check 1: Valid characters (for non-file-based code)
    if (!definingType.getCodeUnitDetails().isFileBased() && !hasValidCharacters(name)) {
        return Check.INVALID_CHARACTER;
    }
    
    // Check 2: Keywords (allowed but should only be used by built-in functionality)
    if (KEY_WORD.contains(name)) {
        return Check.KEYWORD;
    }
    
    // Check 3: Reserved names (methods can use reserved names)
    if (type != METHOD && !ignoreCheck && (RESERVED.contains(name) || isReservedBasic(definingType, name))) {
        return Check.RESERVED_NAME;
    }
    
    // Check 4: Reserved type names (only for class/interface/exception)
    if ((type == CLASS || type == INTERFACE || type == EXCEPTION) && RESERVED_TYPE.contains(name)) {
        return Check.RESERVED_TYPE;
    }
    
    // Check 5: Length validation
    if (name.length() > getMaxLength(definingType, type, isTopLevel)) {
        return Check.TOO_LONG;
    }
    
    return Check.VALID;
}

// Character validation rules
boolean hasValidCharacters(String untrimmedName) {
    String name = trim(untrimmedName);
    
    // Rule 1: Must not be empty
    if (name.isEmpty()) {
        return false;
    }
    
    char lastChar = 'x';
    for (int i = 0; i < name.length(); i++) {
        char c = name.charAt(i);
        
        // Rule 2: First character must be a letter
        if (i == 0 && !isLetter(c)) {
            return false;
        }
        
        // Rule 3: Only letters, digits, and underscores allowed
        if (!isLetter(c) && !isDigit(c) && c != '_') {
            return false;
        }
        
        // Rule 4: No consecutive underscores
        if (lastChar == '_' && c == '_') {
            return false;
        }
        lastChar = c;
    }
    
    // Rule 5: Cannot end with underscore
    return lastChar != '_';
}

// Length validation
Integer getMaxLength(TypeInfo definingType, Type type, boolean isTopLevel) {
    switch (type) {
        case EXCEPTION:
        case ENUM:
        case CLASS:
        case INTERFACE:
            if (!isTopLevel || definingType.getCodeUnitDetails().supportsLongTopLevelIdentifier()) {
                return MAX_LENGTH; // 255
            }
            return MAX_CLASS_LENGTH; // 40
        case METHOD:
        case VARIABLE:
        case CONSTRUCTOR:
        case TRIGGER:
        case URL_MAPPING:
            return MAX_LENGTH; // 255
    }
}
```

---

## 2. Type System Validation

### 2.1 Type Visibility
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/compilation/ParentVisibility.java`

**Rules**:
- Parent types must be visible to the defining type
- Interface types must be visible to the implementing class

**Error Messages**:
- `"type.not.visible"`

### 2.2 Type Casting
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/expression/CastExpression.java`

**Rules**:
- Cast target type must be visible
- Cast target type must be a valid cast type
- Expression type must be compatible with cast target type

**Error Messages**:
- `"type.not.visible"`
- `"invalid.cast.type"`
- `"incompatible.cast.types"`

### 2.3 Collection Type Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/expression/CollectionExpressionUtils.java`

**Rules**:
- Collection types must be visible
- SObject collections must be valid SObject types

**Error Messages**:
- `"type.not.visible"`
- `"invalid.sobject.map"`
- `"invalid.sobject.list"`

---

## 3. Expression Validation

### 3.1 Binary Expression Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/expression/BinaryExpression.java`

**Rules**:
- Arithmetic operations require numeric operands
- Time/Date operations have specific operand requirements
- Shift operations require integer operands
- Bitwise operations require integer operands
- Void expressions cannot be used in arithmetic

**Error Messages**:
- `"invalid.void.arithmetic.expression"`
- `"invalid.numeric.arguments.expression"`
- `"invalid.time.operand.expression"`
- `"invalid.date.operand.expression"`
- `"invalid.datetime.operand.expression"`
- `"invalid.shift.operator.arguments"`
- `"invalid.bitwise.operator.arguments"`

### 3.1.1 Pseudocode

```java
TypeInfo calculateArithmeticType(ValidationScope scope) {
    TypeInfo leftType = left.getType();
    TypeInfo rightType = right.getType();
    
    // Check 1: Void expressions cannot be used in arithmetic (pre-V174)
    if ((leftType.equals(VOID) || rightType.equals(VOID)) && 
        Version.V174.isLessThanOrEqual(VersionUtil.get(this))) {
        scope.getErrors().markInvalid(this, "invalid.void.arithmetic.expression");
        return UnresolvedTypeInfoFactory.get();
    }
    
    // Check 2: String concatenation (only addition allowed)
    if (leftType.equals(STRING) || rightType.equals(STRING)) {
        if (op == BinaryOp.ADDITION) {
            return STRING;
        } else {
            scope.getErrors().markInvalid(this, "invalid.numeric.arguments.expression");
            return UnresolvedTypeInfoFactory.get();
        }
    }
    
    // Check 3: Date/Time operations
    if (leftType.equals(DATE) || leftType.equals(DATE_TIME) || leftType.equals(TIME)) {
        if (!(op == BinaryOp.ADDITION || op == BinaryOp.SUBTRACTION)) {
            scope.getErrors().markInvalid(this, "invalid.numeric.arguments.expression");
        }
        
        switch (leftType.getBasicType()) {
            case TIME:
                if (!right.getType().equals(INTEGER) && !right.getType().equals(LONG)) {
                    scope.getErrors().markInvalid(this, "invalid.time.operand.expression");
                }
                return TIME;
            case DATE:
                if (!right.getType().equals(INTEGER) && !right.getType().equals(LONG)) {
                    scope.getErrors().markInvalid(this, "invalid.date.operand.expression");
                }
                return DATE;
            case DATE_TIME:
                if (!right.getType().equals(INTEGER) && 
                    !right.getType().equals(DOUBLE) && 
                    !right.getType().equals(DECIMAL)) {
                    scope.getErrors().markInvalid(this, "invalid.datetime.operand.expression");
                }
                return DATE_TIME;
        }
    }
    
    // Check 4: Numeric operations
    if (!leftType.getBasicType().isNumber() || !rightType.getBasicType().isNumber()) {
        scope.getErrors().markInvalid(this, "invalid.numeric.arguments.expression");
        return UnresolvedTypeInfoFactory.get();
    }
    
    // Type promotion rules
    if (leftType.equals(DECIMAL) || rightType.equals(DECIMAL)) {
        return DECIMAL;
    } else if (leftType.equals(DOUBLE) || rightType.equals(DOUBLE)) {
        return DOUBLE;
    } else if (leftType.equals(LONG) || rightType.equals(LONG)) {
        return LONG;
    } else {
        return INTEGER;
    }
}

TypeInfo calculateShiftType(ValidationScope scope) {
    TypeInfo leftType = left.getType();
    TypeInfo rightType = right.getType();
    
    // Check: Both operands must be integer or long
    if (!leftType.getBasicType().isIntegerOrLong() || !rightType.getBasicType().isIntegerOrLong()) {
        scope.getErrors().markInvalid(this, "invalid.shift.operator.arguments");
        return UnresolvedTypeInfoFactory.get();
    }
    
    // Version-specific behavior (pre-V160)
    if (Version.V160.isGreaterThan(VersionUtil.get(this))) {
        if (leftType.getBasicType() == BasicType.INTEGER && 
            rightType.getBasicType() == BasicType.LONG) {
            return LONG;
        }
    }
    
    return leftType;
}

TypeInfo calculateBitwiseType(ValidationScope scope) {
    TypeInfo leftType = left.getType();
    TypeInfo rightType = right.getType();
    
    // Check: Both operands must be integer or long
    if (!leftType.getBasicType().isIntegerOrLong() || !rightType.getBasicType().isIntegerOrLong()) {
        scope.getErrors().markInvalid(this, "invalid.bitwise.operator.arguments");
        return UnresolvedTypeInfoFactory.get();
    }
    
    // Type promotion rules
    if (leftType.equals(LONG) || rightType.equals(LONG)) {
        return LONG;
    } else {
        return INTEGER;
    }
}
```

### 3.2 Boolean Expression Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/expression/BooleanExpression.java`

**Rules**:
- Comparison operands must be compatible types
- Exact equality requires compatible types
- Inequality requires compatible types
- Logical operations require boolean operands

**Error Messages**:
- `"invalid.comparison.types"`
- `"invalid.exact.equality.type"`
- `"invalid.inequality.type"`
- `"invalid.logical.type"`

### 3.3 Array Store Expression Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/expression/ArrayStoreExpression.java`

**Rules**:
- Array must be a valid list type
- Index must be integer type

**Error Messages**:
- `"invalid.list.type"`
- `"invalid.list.index.type"`

### 3.4 Variable Expression Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/expression/VariableExpression.java`

**Rules**:
- Variable must exist and be visible
- Variable must be accessible in current context

**Error Messages**:
- `"variable.does.not.exist"`

### 3.5 Super Expression Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/expression/SuperVariableExpression.java`

**Rules**:
- Cannot use `super` in static context
- Super type must exist

**Error Messages**:
- `"invalid.super.static.context"`
- `"no.super.type"`

### 3.6 Java Expression Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/expression/JavaVariableExpression.java`

**Rules**:
- Java expressions are generally not allowed
- Java class must exist if referenced
- Java field must exist if referenced

**Error Messages**:
- `"illegal.java.expression"`
- `"invalid.java.expression"`
- `"invalid.java.expression.class.not.found"`
- `"invalid.java.expression.field.not.found"`

### 3.7 Constructor Expression Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/expression/NewKeyValueObjectExpression.java`

**Rules**:
- Field names must exist in target type
- No duplicate field initialization
- Field types must be compatible with expression types
- Constructor must support name-value pair syntax

**Error Messages**:
- `"duplicate.field.init"`
- `"illegal.assignment"`
- `"invalid.name.value.pair.constructor"`
- `"field.does.not.exist"`

---

## 4. Statement Validation

### 4.1 Variable Declaration Statement Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/statement/VariableDeclarationStatements.java`

**Rules**:
- Variable type must be visible
- Variable initializer must be compatible with declared type

**Error Messages**:
- `"type.not.visible"`

### 4.2 Switch Statement Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/statement/SwitchStatement.java`

**Rules**:
- When values must be compatible with switch expression type
- When types must be compatible with switch expression type

---

## 5. Modifier and Annotation Validation

### 5.1 Annotation Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/modifier/Annotation.java`

**Rules**:
- Annotation type must be resolved
- All required annotation properties must be present
- Annotation parameters must be valid

**Error Messages**:
- `"invalid.unresolved.annotation"`
- `"annotation.property.missing"`

### 5.2 Annotation Rule Groups
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/modifier/rule/AnnotationRuleGroup.java`

**Rules**:
- No duplicate modifiers
- Hard rules must pass (stop on first failure)
- Soft rules are applied regardless of errors
- Context-specific rules are applied

**Error Messages**:
- `"duplicate.modifier"`

### 5.3 Modifier Validation Rules
Based on test files, the following modifiers have specific validation rules:

**Abstract Modifier**:
- Cannot be used on certain element types
- Requires non-private visibility for methods

**Private Modifier**:
- Cannot be used on local variables
- Abstract methods require non-private visibility

**Public Modifier**:
- Cannot be used on local variables

**Static Modifier**:
- Has specific context requirements

**Transient Modifier**:
- Cannot be used on classes, interfaces, or enums

**Global Modifier**:
- Has specific visibility and context requirements

**Test Modifiers**:
- `@IsTest` has specific requirements
- `@TestSetup` has specific requirements

**HTTP Modifiers**:
- `@RestResource` requires global visibility
- HTTP method modifiers have specific parameter and return type requirements
- Only one method per HTTP verb allowed

**Future Modifier**:
- Has specific parameter type restrictions
- Cannot be used with certain other modifiers

**WebService Modifier**:
- Has specific visibility and parameter requirements

**RemoteAction Modifier**:
- Has specific visibility and parameter requirements

**AuraEnabled Modifier**:
- Has specific parameter and return type requirements

**InvocableAction Modifier**:
- Has specific parameter and return type requirements

---

## 6. Built-in Method Validation

### 6.1 AddError Method Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/bcl/validators/AddErrorValidator.java`

**Rules**:
- Can only be called on direct SObject field references to scalar fields
- Cannot be called on SOQL expressions
- Cannot be called on non-regular SObject fields
- Cannot be called after safe navigation operator

**Error Messages**:
- `"method.invalid.add.error.not.sobject.field"`
- `"method.invalid.add.error.not.sobject.scalar.field"`
- `"safe.navigation.invalid.between.sobject.field.and.add.error"`

### 6.1.1 Pseudocode

```java
void validate(SymbolResolver symbols, ValidationScope scope, MethodCallExpression expression) {
    // Get the last variable in the method call chain
    Optional<Variable> lastVariable = expression.getReferenceContext().getVariables().isEmpty()
        ? getVariable(expression.getReferenceContext().getDottedExpression())
        : Optional.of(Iterables.getLast(expression.getReferenceContext().getVariables()));

    if (lastVariable.isPresent()) {
        String message = lastVariable.get().accept(GET_ERROR, expression);
        if (!message.isEmpty()) {
            scope.getErrors().markInvalid(expression, message);
        }
    } else {
        scope.getErrors().markInvalid(expression, "method.invalid.add.error.not.sobject.field");
    }
}

// Variable visitor for SObject field validation
String visit(SObjectFieldInfo info, MethodCallExpression expression) {
    // Check 1: Not a SOQL expression
    boolean isDottedExpressionSoql = ExpressionUtil.isSoqlExpression(
        expression.getReferenceContext().getDottedExpression()
    );
    
    // Check 2: Must be regular SObject field (not relationship, formula, etc.)
    // Check 3: Must be a column (not a calculated field)
    if (isDottedExpressionSoql || 
        info.getCategory() != SObjectFieldInfo.Category.REGULAR ||
        !info.isColumnInfo()) {
        return "method.invalid.add.error.not.sobject.scalar.field";
    }
    
    // Check 4: No safe navigation operator after the field
    if (ValidatorUtil.hasSafeNaviationAfterLastField(expression)) {
        return "safe.navigation.invalid.between.sobject.field.and.add.error";
    }
    
    return ""; // Valid
}

String _default(Variable info, MethodCallExpression expression) {
    return "method.invalid.add.error.not.sobject.field";
}
```

### 6.2 Decimal to Double Conversion Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/bcl/validators/DecimalToDoubleValidator.java`

**Rules**:
- Allows Decimal to Double conversion in List/Map operations
- Validates parameter type compatibility

### 6.3 Map PutAll Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/bcl/validators/MapPutAllValidator.java`

**Rules**:
- Map types must be compatible for putAll operation

**Error Messages**:
- `"invalid.map.putAll"`

### 6.4 SObject Collection Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/bcl/validators/SObjectCollectionValidator.java`

**Rules**:
- Validates SObject collection operations

### 6.5 System Comparator Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/bcl/validators/SystemComparatorValidator.java`

**Rules**:
- Validates System comparison operations

### 6.6 Custom Entity Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/bcl/validators/CustomEntityValidators.java`

**Rules**:
- Validates custom entity operations
- Validates visibility requirements for custom entities

### 6.7 SObject Recalculate Formulas Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/bcl/validators/SObjectRecalculateFormulasValidator.java`

**Rules**:
- Validates SObject formula recalculation operations

### 6.8 Query or Modify Tree Save Relationship Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/bcl/validators/QueryOrModifyTreeSaveRelationshipValidator.java`

**Rules**:
- Validates relationship operations in queries and modifications

---

## 7. Interface and Class Validation

### 7.1 Interface Hierarchy Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/visitor/InterfaceHierarchyValidator.java`

**Rules**:
- Interface methods must not clash with parent interface methods
- Validates method collisions across interface hierarchy

### 7.2 Interface Implementation Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/visitor/InterfaceImplementationValidator.java`

**Rules**:
- Classes must implement all visible interface methods
- Abstract classes don't need to implement all methods but need bridging
- Only visible interface methods need to be implemented

### 7.3 Exception Constructor Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/compilation/UserExceptionMethods.java`

**Rules**:
- Exception constructors must not be duplicated
- Specific constructor signatures are required

**Error Messages**:
- `"invalid.exception.constructor.already.defined"`

---

## 8. Variable Validation

### 8.1 Variable Visibility Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/symbol/member/variable/VariableValidator.java`

**Rules**:
- Variable must be visible from current context
- Variable's defining type must be visible
- Variable's type must be visible
- Context must be appropriate (static vs non-static)
- Final fields have specific initialization requirements
- Forward references are restricted

**Error Messages**:
- Various visibility and context error messages

### 8.2 Variable Context Validation
**Rules**:
- Static context validation for static vs instance access
- Final field initialization validation
- Property access validation

---

## 9. Compilation Unit Validation

### 9.1 Script Size Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/ast/compilation/ScriptTooLargeValidator.java`

**Rules**:
- Classes/Enums/Interfaces/Triggers: Maximum 1,000,000 characters
- Anonymous blocks: Maximum 32,000 characters
- Anonymous blocks under test: Maximum 3,200,000 characters

**Error Messages**:
- `"script.too.large"`

### 9.2 Expression Length Validation
**Location**: `apex-jorje-semantic/src/main/java/apex/jorje/semantic/compiler/CodeUnit.java`

**Rules**:
- Expressions must not exceed maximum length limits

**Error Messages**:
- `"expression.too.long"`

---

## 10. Visibility and Access Validation

### 10.1 Type Visibility
**Rules**:
- Types must be visible to be used
- Parent types must be visible
- Interface types must be visible to implementing classes

### 10.2 Method Visibility
**Rules**:
- Methods must be visible to be called
- Override methods must be visible
- Interface methods must be visible to implementing classes

### 10.3 Variable Visibility
**Rules**:
- Variables must be visible to be accessed
- Static vs instance context validation
- Final field access validation

---

## Error Message Sources

All error messages are defined in:
- `apex-jorje-services/src/main/resources/messages_en_US.properties`

---

## Validation Behavior

The validation system supports two behaviors:
- **COLLECT_MULTIPLE_ERRORS**: Continue validation after first error
- **BREAK_ON_FIRST_ERROR**: Stop validation on first error

This is controlled by `ValidationSettings` in the compiler.

---

## 11. Parser-Level Semantic Validation

### 11.1 Lexical Validation
**Location**: `apex-jorje-parser/src/main/antlr3/apex/jorje/parser/impl/ApexLexer.g`

**Rules**:
- **Invalid Control Characters**: ASCII control characters other than TAB, LF, and CR are not allowed
- **Invalid Symbols**: Characters `'` (backtick), `#`, `%` are not allowed in Apex
- **Invalid Identifiers**: Identifiers cannot start with non-ASCII characters (Unicode characters above \u007F)

**Error Messages**:
- `"Invalid control character: {0}"`
- `"Invalid symbol: {0}"`
- `"Invalid identifier: {0}"`

### 11.1.1 Pseudocode

```java
// Lexer rules (ANTLR3 grammar)
INVALID_CONTROL_CHAR
    : ('\u0000'..'\u0008' | '\u000B'..'\u000C' | '\u000E'..'\u001F' | '\u007F') 
    { throwInvalidControlChar(getText()); }
    ;

INVALID_SYMBOL
    : ('`' | '#' | '%') 
    { throwInvalidSymbol(getText()); }
    ;

INVALID_IDENTIFIER
    : MISC_NON_START_IDENTIFIER_CHAR (IDENTIFIER_CHAR)* 
    { throwInvalidIdentifier(getText()); }
    ;

// Lexer validation methods
void throwInvalidControlChar(String symbol) throws RecognitionException {
    if (symbol.length() == 1) {
        throwCustomRecognitionException(_InvalidControlChar(createCurrentLoc(), symbol.charAt(0)));
    } else {
        // Internal error - should not happen
        internalErrorReporter.add(InternalException.create(
            "Got an invalid control char that was not 1 character",
            "symbol was '" + symbol + "'"
        ));
        throwCustomRecognitionException(_UnrecognizedSymbol(createCurrentLoc(), symbol));
    }
}

void throwInvalidSymbol(String symbol) throws RecognitionException {
    if (symbol.length() == 1) {
        throwCustomRecognitionException(_InvalidSymbol(createCurrentLoc(), symbol.charAt(0)));
    } else {
        // Internal error - should not happen
        internalErrorReporter.add(InternalException.create(
            "Got an invalid symbol that was not 1 character",
            "symbol was '" + symbol + "'"
        ));
        throwCustomRecognitionException(_UnrecognizedSymbol(createCurrentLoc(), symbol));
    }
}

void throwInvalidIdentifier(String identifier) throws RecognitionException {
    throwCustomRecognitionException(_InvalidIdentifier(createCurrentLoc(), identifier));
}
```

### 11.2 Identifier Validation During Parsing
**Location**: `apex-jorje-parser/src/main/java/apex/jorje/parser/impl/BaseApexParser.java`

**Rules**:
- **Single Identifier Validation**: Identifiers cannot contain dots (`.`)
- **Inherited Identifier Validation**: Only "inherited" is allowed for inherited sharing modifiers
- **DML RunAs Validation**: Only "user" or "system" are allowed for DML run-as clauses

**Error Messages**:
- `"Unexpected token: '.'"` (for single identifier)
- `"Unexpected token: '{identifier}'"` (for inherited identifier)
- `"Unexpected token: '{identifier}'"` (for DML run-as)

### 11.2.1 Pseudocode

```java
// Parser grammar rules with embedded validation
inheritedSharingModifier
    : t1=IDENTIFIER t2=SHARING 
    { validateInheritedIdentifier(getIdentifier(t1)); 
      $ret = _InheritedSharingModifier(tokenLoc(t1, t2)); }
    ;

dmlStatement
    : t1=INSERT (t=AS i=IDENTIFIER { runAsMode = validateDmlRunAsIdentifier(getIdentifier(i)); })? 
      expr=expression t2=SEMICOLON 
    { $ret = _DmlInsertStmnt(tokenLoc(t1, t2), expr, runAsMode); }
    | t1=UPDATE (t=AS i=IDENTIFIER { runAsMode = validateDmlRunAsIdentifier(getIdentifier(i)); })? 
      expr=expression t2=SEMICOLON 
    { $ret = _DmlUpdateStmnt(tokenLoc(t1, t2), expr, runAsMode); }
    // ... similar for other DML operations
    ;

// Parser validation methods
Identifier validateSingleIdentifier(Identifier identifier) throws CustomRecognitionException {
    if (identifier != null && identifier.getValue() != null && 
        identifier.getValue().indexOf('.') > -1) {
        throw new CustomRecognitionException(_Syntax(_UnexpectedToken(identifier.getLoc(), ".")));
    }
    return identifier;
}

Identifier validateInheritedIdentifier(Identifier identifier) throws CustomRecognitionException {
    if (identifier != null && 
        !MoreStrings.equalsIgnoreCase(identifier.getValue(), "inherited")) {
        throw new CustomRecognitionException(_Syntax(_UnexpectedToken(identifier.getLoc(), identifier.getValue())));
    }
    return identifier;
}

Optional<Identifier> validateDmlRunAsIdentifier(Identifier identifier) throws CustomRecognitionException {
    if (identifier != null && 
        !(MoreStrings.equalsIgnoreCase(identifier.getValue(), "user") || 
          MoreStrings.equalsIgnoreCase(identifier.getValue(), "system"))) {
        throw new CustomRecognitionException(_Syntax(_UnexpectedToken(identifier.getLoc(), identifier.getValue())));
    }
    return Optional.ofNullable(identifier);
}
```

### 11.3 Literal Validation
**Location**: `apex-jorje-parser/src/main/java/apex/jorje/parser/impl/BaseApexParser.java`

**Rules**:
- **Integer Literals**: Must be valid integer values
- **Long Literals**: Must be valid long values (ending with 'L' or 'l')
- **Double Literals**: Must be valid double values (ending with 'D' or 'd')
- **Decimal Literals**: Must be valid decimal values (version-dependent behavior)

**Error Messages**:
- `"Illegal integer literal"`
- `"Illegal long literal"`
- `"Illegal double literal"`
- `"Illegal decimal literal"`

### 11.3.1 Pseudocode

```java
Integer parseInteger(Token t) throws CustomRecognitionException {
    try {
        return parseInteger(t.getText());
    } catch (NumberFormatException x) {
        throw new CustomRecognitionException(_Syntax(_IllegalIntegerLiteral(tokenLoc(t))));
    }
}

Long parseLong(Token t) throws CustomRecognitionException {
    try {
        return parseLong(t.getText());
    } catch (NumberFormatException x) {
        throw new CustomRecognitionException(_Syntax(_IllegalLongLiteral(tokenLoc(t))));
    }
}

Double parseDouble(Token t) throws CustomRecognitionException {
    try {
        return parseDouble(t.getText());
    } catch (NumberFormatException x) {
        throw new CustomRecognitionException(_Syntax(_IllegalDoubleLiteral(tokenLoc(t))));
    }
}

LiteralExpr createDecimal(Token t) throws RecognitionException {
    try {
        return createDecimal(getVersion(), tokenLoc(t), t.getText());
    } catch (NumberFormatException x) {
        throw new CustomRecognitionException(_Syntax(_IllegalDecimalLiteral(tokenLoc(t))));
    }
}

// Version-dependent decimal behavior
public static LiteralExpr createDecimal(Version version, Location location, String stringValue) 
    throws NumberFormatException {
    assert version != null;
    return version.isGreaterThanOrEqual(Version.V162)
        ? new LiteralExpr(location, LiteralType.DECIMAL, parseDecimal(stringValue))
        : new LiteralExpr(location, LiteralType.DOUBLE, Double.valueOf(stringValue));
}
```

### 11.4 Date/Time Validation
**Location**: `apex-jorje-parser/src/main/java/apex/jorje/parser/impl/DateTimeToken.java`

**Rules**:
- **Date Validation**: Must be valid ISO date format (YYYY-MM-DD)
- **Time Validation**: Must be valid ISO time format (HH:MM:SS[.SSS][Z|±HH:MM])
- **DateTime Validation**: Must be valid ISO datetime format (YYYY-MM-DDTHH:MM:SS[.SSS][Z|±HH:MM])

**Error Messages**:
- `"Invalid date: {0}"`
- `"Invalid time: {0}"`
- `"Invalid datetime: {0}"`

### 11.4.1 Pseudocode

```java
// Lexer rules for date/time tokens
TIME
@init { lexing = Lexing.TIME; }
@after { lexing = Lexing.OTHER; }
    : TIME_PART_WITHOUT_OFFSET ('z' | OFFSET) { emit(createDateTime()); }
    ;

DATE
@init { lexing = Lexing.DATE; }
@after { lexing = Lexing.OTHER; }
    : DATEPART ('t' {lexing = Lexing.DATE_TIME; } TIME_PART_WITHOUT_OFFSET ('z' | OFFSET))? 
    { emit(createDateTime()); }
    ;

// DateTime token creation with validation
public static DateTimeToken create(BaseApexLexer lexer, CharStream input, 
    RecognizerSharedState state, int tokenEndCharIndex) throws CustomRecognitionException {
    
    String tokenInput = input.substring(state.tokenStartCharIndex, tokenEndCharIndex);
    
    switch (lexer.lexing) {
        case DATE:
            try {
                return new DateTimeToken(input, ApexLexer.DATE, state, tokenEndCharIndex, tokenInput);
            } catch (DateTimeException x) {
                throw new CustomRecognitionException(_Lexical(_InvalidDate(lexer.createCurrentLoc(), tokenInput)));
            }
        case DATE_TIME:
            try {
                return new DateTimeToken(input, ApexLexer.DATETIME, state, tokenEndCharIndex, tokenInput);
            } catch (DateTimeException x) {
                throw new CustomRecognitionException(_Lexical(_InvalidDateTime(lexer.createCurrentLoc(), tokenInput)));
            }
        case TIME:
            try {
                return new DateTimeToken(input, ApexLexer.TIME, state, tokenEndCharIndex, tokenInput);
            } catch (DateTimeException x) {
                throw new CustomRecognitionException(_Lexical(_InvalidTime(lexer.createCurrentLoc(), tokenInput)));
            }
        case OTHER:
            throw new IllegalArgumentException("Invalid type.");
    }
}

// DateTime token constructor with format validation
private DateTimeToken(CharStream input, int type, RecognizerSharedState state, 
    int tokenEndCharIndex, String tokenInput) {
    // ... token setup code ...
    
    // Convert to UTC using appropriate format
    temporal = TYPE_TO_FORMAT.get(type).apply(tokenInput);
}

// Format mapping
static final Map<Integer, Function<String, Temporal>> TYPE_TO_FORMAT = ImmutableMap.<Integer, Function<String, Temporal>>builder()
    .put(ApexLexer.DATE, DateTimeFormats::fromDate)
    .put(ApexLexer.TIME, DateTimeFormats::fromTime)
    .put(ApexLexer.DATETIME, DateTimeFormats::fromDateTime)
    .build();
```

### 11.5 SOQL Validation
**Location**: `apex-jorje-parser/src/main/java/apex/jorje/parser/impl/BaseApexParser.java`

**Rules**:
- **Update Stats Option**: Only "viewstat" or "tracking" are valid options
- **Include Deleted**: Must be "all rows" exactly
- **Using Clause**: Only "scope" and "lookup" are valid ambiguous using identifiers

**Error Messages**:
- `"Unexpected token: '{option}'"` (for update stats)
- `"Unexpected token: '{identifier}'"` (for include deleted)
- Various SOQL-specific error messages

### 11.5.1 Pseudocode

```java
// Parser grammar rules with embedded validation
updateStatsClause
    : name=singleIdentifier 
    { $ret = parseUpdateStatsOption(name); }
    ;

includeDeletedClause
    : all=ALL rows=ROWS 
    { $ret = parseIncludeDeleted(getIdentifier(all), getIdentifier(rows)); }
    ;

usingClause
    : { isValidUsing(name) }? => field=identifierNoReserved 
    { $ret = _Using(name, field); }
    ;

// Parser validation methods
UpdateStatsOption parseUpdateStatsOption(Identifier name) throws CustomRecognitionException {
    if (MoreStrings.equalsIgnoreCase("viewstat", name.getValue())) {
        return UpdateStatsOption._UpdateViewStat(name.getLoc());
    } else if (MoreStrings.equalsIgnoreCase("tracking", name.getValue())) {
        return UpdateStatsOption._UpdateTracking(name.getLoc());
    } else {
        throw new CustomRecognitionException(_Syntax(_UnexpectedToken(name.getLoc(), "'" + name.getValue() + "'")));
    }
}

QueryOption parseIncludeDeleted(Identifier all, Identifier rows) throws CustomRecognitionException {
    if (MoreStrings.equalsIgnoreCase("all", all.getValue())) {
        if (MoreStrings.equalsIgnoreCase("rows", rows.getValue())) {
            return _IncludeDeleted(Locations.from(all.getLoc(), rows.getLoc()));
        } else {
            UserError error = _Syntax(_UnexpectedToken(rows.getLoc(), "'" + rows.getValue() + "'"));
            throw new CustomRecognitionException(error);
        }
    } else {
        UserError error = _Syntax(_UnexpectedToken(all.getLoc(), "'" + all.getValue() + "'"));
        throw new CustomRecognitionException(error);
    }
}

public boolean isValidUsing(Identifier identifier) {
    if (identifier == null || identifier.getValue() == null) {
        return false;
    }
    String value = identifier.getValue().toLowerCase();
    return VALID_AMBIGUOUS_USING.contains(value);
}

// Valid using identifiers
private static final Set<String> VALID_AMBIGUOUS_USING = ImmutableSet.of("scope", "lookup");
```

### 11.6 Type Reference Validation
**Location**: `apex-jorje-parser/src/main/java/apex/jorje/parser/impl/BaseApexParser.java`

**Rules**:
- **Java Type References**: Cannot have type arguments
- **Class Type References**: Can have type arguments

**Error Messages**:
- `"Unexpected token: '<'"` (for Java types with arguments)

### 11.6.1 Pseudocode

```java
// Parser grammar rules with embedded validation
type
    : (JAVA COLON) => t1=JAVA t2=COLON t=userType[true] { $ret = t; }
    | (SET | LIST | MAP) => (t1=SET | t1=LIST | t1=MAP) args=typeArguments 
      { $ret = newClassTypeRef(Collections.singletonList(getIdentifier(t1)), args); }
    | t=userType[false] { $ret = t; } (LSQUARE RSQUARE { $ret = newArrayTypeRef($ret); })*
    ;

// Parser validation methods
TypeRef parseType(List<Identifier> names, List<TypeRef> typeArguments, boolean isJavaRef) 
    throws CustomRecognitionException {
    
    if (isJavaRef) {
        if (typeArguments.isEmpty()) {
            return TypeRefs.newJavaTypeRef(names);
        } else {
            throw new CustomRecognitionException(_Syntax(_UnexpectedToken(Locations.from(names), "'<'")));
        }
    } else {
        return TypeRefs.newClassTypeRef(names, typeArguments);
    }
}
```

---

## References

- `apex-jorje-semantic/src/main/java/apex/jorje/semantic/` - Main semantic validation source
- `apex-jorje-semantic-test/src/test/java/apex/jorje/semantic/validation/` - Validation test cases
- `apex-jorje-services/src/main/resources/messages_en_US.properties` - Error message definitions
- `apex-jorje-parser/src/main/antlr3/apex/jorje/parser/impl/` - Parser-level validation rules

### Specific Files Referenced

- `apex-jorje-semantic/src/main/java/apex/jorje/semantic/symbol/member/IdentifierValidator.java` - Identifier validation logic
- `apex-jorje-semantic-test/src/test/java/apex/jorje/semantic/symbol/member/IdentifierValidatorTest.java` - Identifier validation tests
- `apex-jorje-semantic-test/src/test/java/apex/jorje/semantic/validation/compilation/EnumTest.java` - Enum validation tests 