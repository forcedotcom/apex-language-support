---
name: Prioritize Missing Validations
overview: Prioritize 327 unimplemented validations based on customer value and implementation difficulty, focusing on same-file (TIER 1) easy wins first.
todos:
  - id: phase1-syntax
    content: 'Phase 1.1: Implement syntax validators (UnreachableStatementValidator, ControlFlowValidator) - TIER 1, high value, easy'
    status: pending
  - id: phase1-duplicates
    content: 'Phase 1.2: Implement duplicate detection validators (DuplicateFieldInitValidator, DuplicateAnnotationMethodValidator) - TIER 1, high value, easy'
    status: pending
  - id: phase1-annotations
    content: 'Phase 1.3: Extend AnnotationValidator for property validation (@RestResource, @InvocableMethod) - TIER 1, high value, easy-medium'
    status: pending
  - id: phase1-test
    content: 'Phase 1.4: Implement TestMethodValidator (@isTest, @TestSetup validation) - TIER 1, high value, easy'
    status: pending
  - id: phase1-aura
    content: 'Phase 1.5: Implement AuraEnabledValidator (@AuraEnabled restrictions) - TIER 1, medium-high value, easy'
    status: pending
  - id: phase2-expressions
    content: 'Phase 2.1: Implement ExpressionTypeValidator (void types, invalid expressions) - TIER 1, high value, medium'
    status: pending
  - id: phase2-override
    content: 'Phase 2.2: Implement MethodOverrideValidator (@Override validation) - TIER 1/2, high value, medium'
    status: pending
  - id: phase2-modifiers
    content: 'Phase 2.3: Implement ModifierValidator (modifier combinations) - TIER 1, medium-high value, medium'
    status: pending
  - id: phase3-method-resolution
    content: 'Phase 3.1: Implement MethodResolutionValidator (method visibility, ambiguous calls) - TIER 2, very high value, hard'
    status: pending
  - id: phase3-variable-resolution
    content: 'Phase 3.2: Implement VariableResolutionValidator (variable/field existence) - TIER 2, very high value, hard'
    status: pending
  - id: phase3-type-visibility
    content: 'Phase 3.3: Implement TypeVisibilityValidator (type visibility checks) - TIER 2, high value, hard'
    status: pending
  - id: phase4-constructors
    content: 'Phase 4.1: Implement ConstructorValidator (constructor validation) - TIER 1, medium value, easy'
    status: pending
  - id: phase4-exceptions
    content: 'Phase 4.2: Implement ExceptionValidator (exception handling) - TIER 1, medium value, easy'
    status: pending
  - id: phase4-switch
    content: 'Phase 4.3: Implement SwitchStatementValidator (switch/when validation) - TIER 1, medium value, easy-medium'
    status: pending
isProject: false
---

# Prioritization Plan for Missing Validations

## Overview

327 error codes are defined but unused, indicating unimplemented validations. This plan prioritizes them by:

1. **Customer Value**: How often developers encounter these errors and their impact
2. **Implementation Difficulty**: Same-file (TIER 1) vs cross-file (TIER 2), complexity
3. **Easy Wins First**: Same-file validations that can be implemented quickly

## Validation Tier System

- **TIER 1 (IMMEDIATE)**: Same-file only, <500ms, runs on every keystroke
- **TIER 2 (THOROUGH)**: Cross-file analysis, 2-5 seconds, runs on save

## Priority Categories

### Phase 1: High Value + Easy Wins (TIER 1 - Same File)

These catch common errors and can be implemented quickly using existing symbol table data:

#### 1.1 Syntax & Basic Structure (Very Easy)

- `UNREACHABLE_STATEMENT` - Detect unreachable code after return/throw
- `INVALID_BREAK` / `INVALID_CONTINUE` - Validate break/continue in loops
- `INVALID_RETURN_FROM_NON_METHOD` - Return statements outside methods
- `INVALID_RETURN_VOID` / `INVALID_RETURN_NON_VOID` - Return type mismatches
- `INVALID_CONSTRUCTOR_RETURN` - Constructors returning values
- `INVALID_TRIGGER_RETURN` - Triggers returning values
- `INVALID_TRY_NEEDS_CATCH_OR_FINALLY` - Try blocks without catch/finally

**Implementation**: Check AST structure, no type resolution needed
**Customer Value**: High - catches common mistakes immediately
**Files**: Create `UnreachableStatementValidator.ts`, `ControlFlowValidator.ts`

#### 1.2 Duplicate Detection (Easy)

- `DUPLICATE_FIELD_INIT` - Duplicate field initialization in constructors
- `DUPLICATE_REMOTE_ACTION_METHODS` - Duplicate @RemoteAction methods
- `DUPLICATE_WEB_SERVICE_METHODS` - Duplicate @WebService methods
- `DUPLICATE_TYPE_NAME` - Duplicate type names in same file (inner types)

**Implementation**: Similar to `DuplicateMethodValidator`, check symbol table
**Customer Value**: High - prevents deployment failures
**Files**: Extend `DuplicateSymbolValidator.ts` or create `DuplicateAnnotationMethodValidator.ts`

#### 1.3 Annotation Validation (Easy-Medium)

- `ANNOTATION_PROPERTY_MISSING` - Required annotation properties missing
- `ANNOTATION_PROPERTY_INVALID_VALUE` - Invalid annotation property values
- `ANNOTATION_PROPERTY_NOT_SUPPORTED` - Unrecognized annotation properties
- `REST_RESOURCE_URL_EMPTY` / `REST_RESOURCE_URL_TOO_LONG` / `REST_RESOURCE_URL_NO_SLASH` - @RestResource URL validation
- `INVOCABLE_METHOD_SINGLE_PARAM` / `INVOCABLE_METHOD_NON_LIST_PARAMETER` - @InvocableMethod validation
- `INVOCABLE_METHOD_CAN_ONLY_HAVE_DEPRECATED` - @InvocableMethod annotation restrictions

**Implementation**: Extend `AnnotationValidator.ts` (already exists), check annotation properties
**Customer Value**: High - catches annotation misuse early
**Files**: Enhance `packages/apex-parser-ast/src/semantics/annotations/AnnotationValidator.ts`

#### 1.4 Test Method Validation (Easy)

- `TEST_METHOD_CANNOT_HAVE_PARAMS` - @isTest methods with parameters
- `TEST_SETUP_CANNOT_HAVE_PARAMS` - @TestSetup methods with parameters
- `TEST_SETUP_MUST_RETURN_VOID` - @TestSetup return type validation
- `TEST_CLASS_MUST_NOT_BE_EXCEPTION` - Exception classes marked as test

**Implementation**: Check method signatures and annotations in symbol table
**Customer Value**: High - prevents test failures
**Files**: Create `TestMethodValidator.ts`

#### 1.5 Aura/LWC Validation (Easy)

- `AURA_DUPLICATE_METHOD_FIELD` - @AuraEnabled method/field name conflicts
- `AURA_OVERLOADED_METHOD` - @AuraEnabled method overloading
- `NON_STATIC_AURA_METHOD_CANNOT_HAVE_PARAMS` - @AuraEnabled parameter restrictions
- `NON_STATIC_AURA_METHOD_MUST_BEGIN_WITH_GET` - @AuraEnabled naming convention

**Implementation**: Check annotations and method signatures
**Customer Value**: Medium-High - prevents runtime errors in Lightning
**Files**: Create `AuraEnabledValidator.ts`

### Phase 2: High Value + Medium Complexity (TIER 1 - Same File)

#### 2.1 Expression Type Validation (Medium)

- `INVALID_VOID_VARIABLE` / `INVALID_VOID_PROPERTY` / `INVALID_VOID_PARAMETER` - Void type usage
- `INVALID_EXPRESSION_STATEMENT` - Expressions used as statements
- `INVALID_EXPRESSION_ASSIGNMENT` - Invalid assignment targets
- `INVALID_CONDITION_TYPE` - Non-boolean conditions in if/while

**Implementation**: Requires type checking on expressions, but same-file only
**Customer Value**: High - catches type errors
**Files**: Create `ExpressionTypeValidator.ts` (may need type resolution utilities)

#### 2.2 Method Override Validation (Medium)

- `METHODS_MUST_OVERRIDE` - Missing @Override on overriding methods
- `METHOD_DOES_NOT_OVERRIDE` - @Override on non-overriding methods
- `CANNOT_REDUCE_METHOD_VISIBILITY_OVERRIDE` - Visibility reduction in overrides
- `NON_VIRTUAL_METHODS_CANNOT_OVERRIDE` - Overriding non-virtual methods

**Implementation**: Requires checking parent class hierarchy (same-file parents only for TIER 1)
**Customer Value**: High - prevents inheritance bugs
**Files**: Create `MethodOverrideValidator.ts` (TIER 1: same-file only, TIER 2: cross-file)

#### 2.3 Modifier Validation (Medium)

- `MODIFIER_IS_NOT_ALLOWED` - Invalid modifier combinations
- `MODIFIER_NOT_IN_TOP_LEVEL_TYPE` - Modifiers on inner types
- `MODIFIER_CANNOT_BE` - Conflicting modifiers
- `MODIFIER_REQUIRES` - Required modifier missing

**Implementation**: Check modifier combinations against rules
**Customer Value**: Medium-High - catches modifier misuse
**Files**: Create `ModifierValidator.ts` (extend existing modifier checks)

### Phase 3: High Value + Cross-File (TIER 2)

#### 3.1 Method Resolution (Hard)

- `METHOD_NOT_VISIBLE` - Method visibility violations
- `METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE` / `METHOD_DOES_NOT_SUPPORT_RETURN_TYPE` - Invalid method signatures
- `AMBIGUOUS_METHOD_SIGNATURE` - Ambiguous method calls
- `INVALID_METHOD_NOT_FOUND` - Method doesn't exist

**Implementation**: Requires cross-file type resolution, method lookup
**Customer Value**: Very High - core language feature
**Files**: Extend `TypeAssignmentValidator.ts` or create `MethodResolutionValidator.ts`

#### 3.2 Variable Resolution (Hard)

- `VARIABLE_DOES_NOT_EXIST` - Undefined variables
- `VARIABLE_NOT_VISIBLE` - Variable visibility violations
- `FIELD_DOES_NOT_EXIST` - Undefined fields

**Implementation**: Requires symbol resolution across files
**Customer Value**: Very High - core language feature
**Files**: May be handled by existing resolution, create `VariableResolutionValidator.ts` if needed

#### 3.3 Type Visibility (Hard)

- `TYPE_NOT_VISIBLE` - Type visibility violations
- `METHOD_RETURN_TYPE_NOT_VISIBLE` / `METHOD_PARAMETER_TYPE_NOT_VISIBLE` - Type visibility in signatures

**Implementation**: Cross-file visibility checking
**Customer Value**: High - prevents access violations
**Files**: Create `TypeVisibilityValidator.ts`

### Phase 4: Medium Value + Easy (TIER 1)

#### 4.1 Constructor Validation (Easy)

- `INVALID_CONSTRUCTOR` - Constructor not found
- `INVALID_DEFAULT_CONSTRUCTOR` - Missing default constructor
- `INVALID_SUPER_CALL` / `INVALID_THIS_CALL` - Constructor call placement
- `ILLEGAL_INSTANCE_METHOD_REFERENCE_IN_CONSTRUCTOR` - Instance access in constructor calls

**Implementation**: Check constructor calls and structure
**Customer Value**: Medium - catches constructor errors
**Files**: Create `ConstructorValidator.ts`

#### 4.2 Exception Validation (Easy)

- `INVALID_EXCEPTION_MUST_END_WITH_EXCEPTION` - Exception naming
- `INVALID_EXCEPTION_MUST_EXTEND_EXCEPTION` - Exception inheritance
- `INVALID_EXCEPTION_CONSTRUCTOR_ALREADY_DEFINED` - Duplicate exception constructors
- `INVALID_THROW_EXCEPTION` - Throw non-exception types
- `INVALID_CATCH_EXCEPTION` / `INVALID_CATCH_DUPLICATE_EXCEPTION` - Catch block validation

**Implementation**: Check exception class structure and usage
**Customer Value**: Medium - catches exception handling errors
**Files**: Create `ExceptionValidator.ts`

#### 4.3 Switch Statement Validation (Easy-Medium)

- `ILLEGAL_SWITCH_EXPRESSION_TYPE` - Invalid switch types
- `ILLEGAL_NO_WHEN_BLOCKS` - Missing when blocks
- `WHEN_ELSE_NOT_LAST` - When else placement
- `INVALID_SWITCH_ENUM` - Enum switch validation
- `NOT_UNIQUE_WHEN_VALUE_OR_TYPE` - Duplicate when clauses

**Implementation**: Check switch statement structure
**Customer Value**: Medium - catches switch errors
**Files**: Create `SwitchStatementValidator.ts`

### Phase 5: Medium Value + Medium/Hard

#### 5.1 Collection Validation (Medium)

- `INVALID_LIST_INITIALIZER` / `INVALID_SET_INITIALIZER` / `INVALID_MAP_INITIALIZER` - Collection initialization
- `INVALID_LIST_TYPE` / `INVALID_LIST_INDEX_TYPE` - List type checking
- `ILLEGAL_ALL_CALL` / `ILLEGAL_COMPARATOR_FOR_SORT` - Collection method validation

**Implementation**: Type checking on collections
**Customer Value**: Medium - catches collection errors
**Files**: Create `CollectionValidator.ts`

#### 5.2 Operator Validation (Medium)

- `INVALID_COMPARISON_TYPES` - Incompatible comparison types
- `INVALID_NUMERIC_ARGUMENTS_EXPRESSION` - Non-numeric arithmetic
- `INVALID_BITWISE_OPERATOR_ARGUMENTS` - Invalid bitwise operations
- `INCOMPATIBLE_TERNARY_EXPRESSION_TYPES` - Ternary type mismatch

**Implementation**: Expression type checking
**Customer Value**: Medium - catches operator errors
**Files**: Create `OperatorValidator.ts`

### Phase 6: Lower Priority / Edge Cases

#### 6.1 Advanced Features (Low-Medium)

- `NAMESPACE_GUARD_*` - @NamespaceGuard validation
- `PACKAGE_VERSION_*` - Package version validation
- `CUSTOM_METADATA_TYPE_NAMESPACE_NOT_VISIBLE` - Custom metadata visibility
- `CUSTOM_SETTINGS_NAMESPACE_NOT_VISIBLE` - Custom settings visibility

**Implementation**: Specialized validation for advanced features
**Customer Value**: Low-Medium - edge cases
**Files**: Create specialized validators as needed

#### 6.2 Deprecation Warnings (Low)

- `GLOBAL_DEPRECATE_IF_*` - Deprecation propagation
- `WEBSERVICE_DEPRECATE_IF_TYPE_DEPRECATED` - WebService deprecation

**Implementation**: Check deprecation annotations
**Customer Value**: Low - warnings only
**Files**: Create `DeprecationValidator.ts`

## Implementation Strategy

### Step 1: Create Validator Template

Create a standard validator template following existing patterns:

- Use `Effect` for async operations
- Return `ValidationResult` with `ValidationErrorInfo[]`
- Use `localizeTyped` for error messages
- Register in `ValidatorInitialization.ts`

### Step 2: Start with Phase 1

Implement Phase 1 validations first (high value, easy wins):

1. `UnreachableStatementValidator.ts`
2. `ControlFlowValidator.ts` (break/continue/return)
3. `AnnotationPropertyValidator.ts` (extend existing)
4. `TestMethodValidator.ts`
5. `AuraEnabledValidator.ts`

### Step 3: Testing

For each validator:

- Create test file: `test/semantics/validation/validators/[ValidatorName].test.ts`
- Test positive cases (valid code)
- Test negative cases (invalid code)
- Verify error codes match `ErrorCodes.ts`

### Step 4: Documentation

Update:

- `packages/apex-parser-ast/README.md` - Add validator to list
- Validator registry documentation

## File Locations

- Validators: `packages/apex-parser-ast/src/semantics/validation/validators/`
- Tests: `packages/apex-parser-ast/test/semantics/validation/validators/`
- Error Codes: `packages/apex-parser-ast/src/generated/ErrorCodes.ts`
- Messages: `packages/apex-parser-ast/src/resources/messages/messages_en_US.properties`
- Registration: `packages/apex-parser-ast/src/semantics/validation/ValidatorInitialization.ts`

## Success Metrics

- Number of error codes implemented
- Reduction in false positives (code that compiles but has errors)
- Customer feedback on validation quality
- Performance impact (TIER 1 must stay <500ms)
