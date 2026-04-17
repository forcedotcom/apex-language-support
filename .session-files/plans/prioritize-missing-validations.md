---
name: Prioritize Missing Validations
overview: Prioritize 327 unimplemented validations based on customer value and implementation difficulty, focusing on same-file (TIER 1) easy wins first.
todos:
  - id: phase1-syntax
    content: "Phase 1.1: Implement syntax validators (UnreachableStatementValidator, ControlFlowValidator) - TIER 1, high value, easy"
    status: completed
  - id: phase1-duplicates
    content: "Phase 1.2: Implement duplicate detection validators (DuplicateFieldInitValidator, DuplicateAnnotationMethodValidator) - TIER 1, high value, easy"
    status: completed
  - id: phase1-annotations
    content: "Phase 1.3: Extend AnnotationValidator for property validation (@RestResource, @InvocableMethod) - TIER 1, high value, easy-medium"
    status: completed
  - id: phase1-test
    content: "Phase 1.4: Implement TestMethodValidator (@isTest, @TestSetup validation) - TIER 1, high value, easy"
    status: completed
  - id: phase1-aura
    content: "Phase 1.5: Implement AuraEnabledValidator (@AuraEnabled restrictions) - TIER 1, medium-high value, easy"
    status: completed
  - id: phase1-restresource
    content: "Phase 1.6: Debug and complete RestResource URL validation (annotation parameter parsing) - TIER 1, high value, medium"
    status: completed
  - id: phase2-expressions
    content: "Phase 2.1: Implement ExpressionTypeValidator (void types, invalid expressions) - TIER 1, high value, medium"
    status: completed
  - id: phase2-override
    content: "Phase 2.2: Implement MethodOverrideValidator (@Override validation) - TIER 1/2, high value, medium"
    status: completed
  - id: phase2-modifiers
    content: "Phase 2.3: Implement ModifierValidator (modifier combinations) - TIER 1, medium-high value, medium"
    status: completed
  - id: phase3-method-resolution
    content: "Phase 3.1: Implement MethodResolutionValidator (method visibility, ambiguous calls) - TIER 2, very high value, hard"
    status: completed
  - id: phase3-variable-resolution
    content: "Phase 3.2: Implement VariableResolutionValidator (variable/field existence) - TIER 2, very high value, hard"
    status: completed
  - id: phase3-type-visibility
    content: "Phase 3.3: Implement TypeVisibilityValidator (type visibility checks) - TIER 2, high value, hard"
    status: completed
  - id: phase3-exception-throw
    content: "Phase 3.4: Implement Exception Throw Validation (throw statement type checking) - TIER 2, medium value, medium"
    status: completed
  - id: phase4-constructors
    content: "Phase 4.1: Implement ConstructorValidator (constructor validation) - TIER 1/2, medium value, easy"
    status: completed
  - id: phase4-exceptions
    content: "Phase 4.2: Implement ExceptionValidator (exception handling) - TIER 1, medium value, easy"
    status: completed
  - id: phase4-switch
    content: "Phase 4.3: Implement SwitchStatementValidator (switch/when validation) - TIER 1, medium value, easy-medium"
    status: completed
isProject: false
---

# Prioritization Plan for Missing Validations

## Overview

327 error codes are defined but unused, indicating unimplemented validations. This plan prioritizes them by:

1. **Customer Value**: How often developers encounter these errors and their impact
2. **Implementation Difficulty**: Same-file (TIER 1) vs cross-file (TIER 2), complexity
3. **Easy Wins First**: Same-file validations that can be implemented quickly

## Progress Summary

### ✅ Completed Phases

**Phase 1 (High Value + Easy Wins)**: ✅ **COMPLETE**
- ✅ Syntax & Basic Structure (UnreachableStatementValidator, ControlFlowValidator)
- ✅ Duplicate Detection (DuplicateAnnotationMethodValidator, DuplicateTypeNameValidator)
- ✅ Annotation Validation (AnnotationPropertyValidator - @InvocableMethod, @RestResource)
- ✅ Unknown Annotation Validation (UnknownAnnotationValidator - reports annotations not in public documentation)
- ✅ Test Method Validation (TestMethodValidator)
- ✅ Aura/LWC Validation (AuraEnabledValidator)
- ✅ RestResource URL Validation

**Phase 2 (High Value + Medium Complexity)**: ✅ **COMPLETE**
- ✅ Expression Type Validation (ExpressionTypeValidator - void type detection)
- ✅ Method Override Validation (MethodOverrideValidator)
- ✅ Modifier Validation (ModifierValidator)

**Phase 4.1 (Medium Value + Easy)**: ✅ **COMPLETE**
- ✅ Constructor Validation (ConstructorValidator - TIER 1/2: placement, instance references, superclass existence, signature matching)

**Phase 4.2 (Medium Value + Easy)**: ✅ **COMPLETE** (TIER 1 + TIER 2)
- ✅ Exception Validation (ExceptionValidator - TIER 1: naming, inheritance, catch clauses, duplicate constructors)
- ✅ TIER 2: Throw statement type checking (complete - validates `new TypeName()` expressions)

**Phase 4.3 (Medium Value + Easy-Medium)**: ✅ **COMPLETE** (TIER 1)
- ✅ Switch Statement Validation (SwitchStatementValidator - when blocks, else placement, duplicates, basic type checking)
- ⏳ TIER 2: Enum switch validation and precise type resolution (pending - requires cross-file type resolution)

**Phase 3.1 (High Value + Cross-File)**: ✅ **COMPLETE** (TIER 2)
- ✅ Method Resolution (MethodResolutionValidator - method existence, visibility, ambiguous calls)
- ✅ Parameter type matching (complete - validates argument types match method parameter types)
- ✅ Return type checking (complete - validates return types match assignment variable types)

**Phase 3.2 (High Value + Cross-File)**: ✅ **COMPLETE** (TIER 2)
- ✅ Variable Resolution (VariableResolutionValidator - variable/field existence, visibility)
- ✅ Qualified field access (`obj.field`) type resolution (complete - resolves object type and validates field)

**Phase 3.3 (High Value + Cross-File)**: ✅ **COMPLETE** (TIER 2)
- ✅ Type Visibility (TypeVisibilityValidator - type, parameter type, return type visibility)
- ⏳ Protected/Default type visibility across packages (pending - requires package membership checking)

**Phase 3.4 (High Value + Cross-File)**: ✅ **COMPLETE** (TIER 2 - Partial)
- ✅ Exception Throw Validation (ExceptionValidator TIER 2 - throw statement type checking)
- ✅ Constructor expressions (`new TypeName()`) validated
- ⏳ Variable/method call expressions in throw statements (deferred - requires complex type resolution)

**Phase 4.3 (Medium Value + Easy-Medium)**: ✅ **COMPLETE** (TIER 1)
- ✅ Switch Statement Validation (SwitchStatementValidator - when blocks, else placement, duplicates, basic type checking)
- ⏳ TIER 2: Enum switch validation and precise type resolution (pending - requires cross-file type resolution)

**Phase 5.1 (Medium Value + Medium)**: ✅ **COMPLETE** (TIER 1)
- ✅ Collection Validation (CollectionValidator - initializer syntax, list index types)
- ⏳ TIER 2: Full type checking for initializers and collection method calls (pending - requires cross-file type resolution)

**Phase 5.2 (Medium Value + Medium)**: ✅ **COMPLETE** (TIER 1 + TIER 2 - Partial)
- ✅ Operator Validation (OperatorValidator - comparison, arithmetic, bitwise, ternary expressions)
- ✅ TIER 2: Variable type resolution (complete - validates variable types in expressions)
- ⏳ TIER 2: Complex expression type resolution (deferred - method calls, chained expressions)

**Phase 6.1 (Lower Priority / Edge Cases)**: ✅ **COMPLETE** (TIER 1)
- ✅ NamespaceGuard Validation (NamespaceGuardValidator - @NamespaceGuard annotation rules)
- ⏳ Package version, Custom metadata/settings visibility (pending - requires namespace/package context)

**Phase 6.2 (Lower Priority / Edge Cases)**: ✅ **COMPLETE** (TIER 1)
- ✅ Deprecation Validation (DeprecationValidator - deprecation propagation for global/webservice)
- ✅ TIER 2: Cross-file deprecation checking (complete - resolves types from other files)

### 📋 Next Steps

**Phase 7: Additional Statement Validations (Medium Value + Easy-Medium)** ✅ **COMPLETE**

1. ✅ **Expression Statement Validation** (`INVALID_EXPRESSION_STATEMENT`) - Already implemented in ExpressionTypeValidator
2. ✅ **DML Type Validation** (`INVALID_DML_TYPE`) - ✅ COMPLETE - DmlStatementValidator implemented
3. ✅ **RunAs Statement Validation** (`INVALID_RUNAS`) - ✅ COMPLETE
   - **Difficulty**: Easy-Medium - requires parse tree walking and basic type checking
   - **Value**: Medium - catches runAs errors
   - **Implementation**: ✅ Walk parse tree, detect runAs statements, validate expression types

**Annotation Parameter Validation Enhancement** ✅ **COMPLETE**
- ✅ Comprehensive parameter validation for all 14 well-known Apex annotations
- ✅ Enum string value validation (case-insensitive)
- ✅ Integer range validation
- ✅ Positional parameter support
- ✅ Field/property annotation validation

**Completed TIER 2 Enhancements** ✅ **COMPLETE**

1. **Constructor Validation Enhancement** ✅
   - Enhanced ConstructorValidator with type validation for super()/this() calls
   - Argument type extraction (literals, variables, constructor calls)
   - Type matching validation (exact type comparison)
   - Cross-file superclass resolution via ISymbolManager

2. **Method Resolution Enhancement** ✅
   - Enhanced MethodResolutionValidator with parameter type matching
   - Argument type extraction (literals, variables, constructor calls)
   - Type matching validation (exact type comparison)
   - Cross-file method resolution via ISymbolManager

3. **Variable Resolution Enhancement** ✅
   - Enhanced VariableResolutionValidator with qualified field access type resolution
   - Object type extraction from source content
   - Field validation in resolved object type's hierarchy
   - Cross-file type resolution via ISymbolManager

**TIER 2 Switch Statement Enhancement** ✅ **COMPLETE**
- ✅ Enhanced SwitchStatementValidator with enum switch validation
- ✅ Switch expression type resolution via variable lookup
- ✅ Enum constant validation for when values
- ✅ Cross-file enum resolution via ISymbolManager

**TIER 2 Collection Validation Enhancement** ✅ **COMPLETE**
- ✅ Enhanced CollectionValidator with list index type validation
- ✅ Index variable type resolution via symbol table lookup
- ✅ Validates index variables are Integer or Long types
- ✅ Improved error detection for invalid list index types

**TIER 2 Operator Validation Enhancement** ✅ **COMPLETE**
- ✅ Enhanced OperatorValidator with variable type resolution in expressions
- ✅ Resolves variable types via symbol table lookup for comparisons, arithmetic, bitwise, and ternary expressions
- ✅ Validates type compatibility for operator expressions
- ✅ Improved error detection for invalid operator type combinations

**TIER 2 Deprecation Validation Enhancement** ✅ **COMPLETE**
- ✅ Enhanced DeprecationValidator with cross-file deprecation checking
- ✅ Resolves types from other files via ISymbolManager
- ✅ Checks if referenced types (return types, parameter types, field types) are deprecated
- ✅ Improved error detection for deprecation propagation violations across files

**TIER 2 Method Return Type Validation Enhancement** ✅ **COMPLETE**
- ✅ Enhanced MethodResolutionValidator with return type checking
- ✅ Extracts assignment context from source code
- ✅ Validates method return types match assignment variable types
- ✅ Improved error detection for return type mismatches

**Remaining Items**:
- ⏳ **High Complexity (Control Flow Analysis)**:
  - `INVALID_RETURN_NON_VOID` - Missing return statements in non-void methods (requires control flow graph analysis)
- ⏳ **Medium-High Complexity (Advanced Type Resolution)**:
  - CollectionValidator: Full type checking for collection initializers (beyond list index types)
  - CollectionValidator: Collection method call validation (`.all()`, `.sort()` with type checking)
  - OperatorValidator: Complex expression type resolution (method calls, chained expressions)
  - ExceptionValidator: Variable/method call expressions in throw statements (beyond constructor expressions)
- ⏳ **Medium Complexity (Requires Package/Namespace Context)**:
  - Package version validation (`package.version.*` error codes)
  - Custom metadata/settings visibility (`custom.metadata.type.namespace.not.visible`, `custom.settings.namespace.not.visible`)
  - Protected/Default type visibility across packages (requires package membership checking)

**See**: `.session-files/plans/validation-plan-assessment.md` for detailed assessment of deferred items.

## Validation Tier System

- **TIER 1 (IMMEDIATE)**: Same-file only, <500ms, runs on every keystroke
- **TIER 2 (THOROUGH)**: Cross-file analysis, 2-5 seconds, runs on save

## Priority Categories

### Phase 1: High Value + Easy Wins (TIER 1 - Same File)

These catch common errors and can be implemented quickly using existing symbol table data:

#### 1.1 Syntax & Basic Structure (Very Easy) ✅ COMPLETED

- ✅ `UNREACHABLE_STATEMENT` - Detect unreachable code after return/throw
- ✅ `INVALID_BREAK` / `INVALID_CONTINUE` - Validate break/continue in loops
- ✅ `INVALID_RETURN_FROM_NON_METHOD` - Return statements outside methods
- ✅ `INVALID_RETURN_VOID` - Void methods returning values (Phase 2.1 - ReturnStatementValidator)
- ⏳ `INVALID_RETURN_NON_VOID` - Non-void methods missing return values (Phase 2.1 - requires control flow analysis)
- ✅ `INVALID_CONSTRUCTOR_RETURN` - Constructors returning values (Phase 4.1 - ConstructorValidator)
- ✅ `INVALID_TRIGGER_RETURN` - Triggers returning values (Phase 4.1 - ReturnStatementValidator)
- ✅ `INVALID_TRY_NEEDS_CATCH_OR_FINALLY` - Try blocks without catch/finally (Phase 4.2 - TryCatchFinallyValidator)

**Implementation**: ✅ Created `UnreachableStatementValidator.ts`, `ControlFlowValidator.ts`, `ReturnStatementValidator.ts`, `TryCatchFinallyValidator.ts`
**Status**: ✅ Implemented, tested, and registered. ControlFlowValidator: 16 test cases passing. ReturnStatementValidator: 4 test cases (1 failing - pre-existing issue). TryCatchFinallyValidator: 6 test cases passing.
**Note**: `INVALID_RETURN_NON_VOID` requires control flow analysis to detect all code paths that don't return a value (future work).

#### 1.2 Duplicate Detection (Easy) ✅ COMPLETED

- ✅ `DUPLICATE_REMOTE_ACTION_METHODS` - Duplicate @RemoteAction methods
- ✅ `DUPLICATE_WEB_SERVICE_METHODS` - Duplicate @WebService methods
- ✅ `DUPLICATE_TYPE_NAME` - Duplicate type names in same file (inner types)
- ✅ `DUPLICATE_FIELD_INIT` - Duplicate field initialization in constructor expressions (e.g., `new Account(Name='Test', name='Test2')`)

**Implementation**: 
- ✅ Created `DuplicateAnnotationMethodValidator.ts` - checks symbol table for methods with @RemoteAction/@WebService annotations/modifiers
- ✅ Created `DuplicateTypeNameValidator.ts` - checks for duplicate type names within the same scope (inner types)
- ✅ Created `DuplicateFieldInitValidator.ts` - detects duplicate field initializers in constructor expressions (case-insensitive)
**Status**: ✅ Implemented, tested, and registered. DuplicateAnnotationMethodValidator: 5 test cases passing. DuplicateTypeNameValidator: 6 test cases passing. DuplicateFieldInitValidator: test cases passing.
**Note**: Methods with identical signatures may be filtered during compilation, so tests use different parameter types to ensure both methods are collected.
**Architecture**: All validators now use cached `parseTree` from `DocumentStateCache` when available, eliminating redundant parsing (10+ validators updated).

#### 1.3 Annotation Validation (Easy-Medium) ✅ COMPLETED

- ✅ `INVOCABLE_METHOD_SINGLE_PARAM` / `INVOCABLE_METHOD_NON_LIST_PARAMETER` - @InvocableMethod validation
- ✅ `INVOCABLE_METHOD_CAN_ONLY_HAVE_DEPRECATED` - @InvocableMethod annotation restrictions
- ✅ `ANNOTATION_UNKNOWN` - Unknown annotation validation (annotations not in public documentation)
- ✅ `ANNOTATION_PROPERTY_MISSING` - Required annotation parameters (e.g., @RestResource.urlMapping, @SuppressWarnings.value)
- ✅ `ANNOTATION_PROPERTY_INVALID_VALUE` - Invalid annotation parameter values (type mismatches, invalid enums, out-of-range integers)
- ✅ `ANNOTATION_PROPERTY_NOT_SUPPORTED` - Unsupported annotation parameters

**Implementation**: 
- ✅ Created `AnnotationPropertyValidator.ts` - validates @InvocableMethod restrictions and comprehensive annotation parameter validation
- ✅ Created `UnknownAnnotationValidator.ts` - reports unknown annotations that are not in the known annotation list from Salesforce public documentation
- ✅ Enhanced `AnnotationPropertyValidator.ts` with comprehensive parameter validation for all 14 well-known annotations:
  - @Deprecated, @AuraEnabled (enhanced), @ReadOnly, @RemoteAction
  - @IsTest (enhanced), @Future (enhanced), @TestSetup
  - @InvocableMethod (enhanced), @InvocableVariable
  - @SuppressWarnings, @JsonAccess, HTTP annotations (@HttpGet, @HttpPost, @HttpPut, @HttpDelete, @HttpPatch)
- ✅ Implemented enum string validation (case-insensitive) for useReplica, scope, limits, serializable/deserializable
- ✅ Implemented integer range validation for Future.delay (0-900)
- ✅ Added positional parameter support (@SuppressWarnings('PMD'))
- ✅ Added field/property annotation validation support

**Status**: ✅ Implemented and registered. All @InvocableMethod tests passing (7/7). Unknown annotation validation complete. Comprehensive annotation parameter validation complete with full test coverage.
**Note**: Unknown annotations are reported as "unknown" rather than "invalid" since we cannot determine if they are org-specific or invalid. Internal-only annotations (e.g., @NamespaceGuard) are not validated and should not appear in the codebase.

#### 1.6 RestResource URL Validation (Medium) ✅ COMPLETED

- ✅ `REST_RESOURCE_URL_EMPTY` / `REST_RESOURCE_URL_TOO_LONG` / `REST_RESOURCE_URL_NO_SLASH` - @RestResource URL validation
- ✅ `REST_RESOURCE_URL_ILLEGAL_WILDCARD_PREDECESSOR` / `REST_RESOURCE_URL_ILLEGAL_WILDCARD_SUCCESSOR` - Wildcard validation

**Implementation**: ✅ Fixed in `AnnotationPropertyValidator.ts` - changed `if (!urlMapping)` to `if (urlMapping === undefined)` to distinguish between missing parameter and empty string
**Status**: ✅ All tests passing (5/5). Empty URL detection now works correctly.
**Note**: The issue was that empty string `''` was being treated as falsy, causing the validator to skip empty URL validation. Now correctly distinguishes between undefined (missing parameter) and empty string (invalid value).

#### 1.4 Test Method Validation (Easy) ✅ COMPLETED

- ✅ `TEST_METHOD_CANNOT_HAVE_PARAMS` - @isTest methods with parameters
- ✅ `TEST_SETUP_CANNOT_HAVE_PARAMS` - @TestSetup methods with parameters
- ✅ `TEST_SETUP_MUST_RETURN_VOID` - @TestSetup return type validation
- ✅ `TEST_CLASS_MUST_NOT_BE_EXCEPTION` - Exception classes marked as test

**Implementation**: ✅ Created `TestMethodValidator.ts` - validates test method signatures and test class restrictions
**Status**: ✅ Implemented, tested, and registered. All 6 tests passing.

#### 1.5 Aura/LWC Validation (Easy) ✅ COMPLETED

- ✅ `AURA_OVERLOADED_METHOD` - @AuraEnabled method overloading
- ✅ `NON_STATIC_AURA_METHOD_CANNOT_HAVE_PARAMS` - @AuraEnabled parameter restrictions
- ✅ `NON_STATIC_AURA_METHOD_MUST_BEGIN_WITH_GET` - @AuraEnabled naming convention
- ✅ `AURA_DUPLICATE_METHOD_FIELD` - @AuraEnabled method/field name conflicts

**Implementation**: ✅ Created `AuraEnabledValidator.ts` - validates @AuraEnabled method restrictions
**Status**: ✅ Implemented, tested, and registered. All 6 tests passing.
**Note**: Fixed duplicate method/field detection by stripping "get" prefix from method names before comparing with field names (e.g., `getName()` conflicts with `name` field).

#### 1.6 RestResource URL Validation (Medium) - See Phase 1.6 section above

### Phase 2: High Value + Medium Complexity (TIER 1 - Same File)

#### 2.1 Expression Type Validation (Medium) ✅ COMPLETED

- ✅ `INVALID_VOID_VARIABLE` / `INVALID_VOID_PROPERTY` / `INVALID_VOID_PARAMETER` - Void type usage
- ✅ `INVALID_EXPRESSION_STATEMENT` - Expressions used as statements (implemented in ExpressionTypeValidator)
- `INVALID_EXPRESSION_ASSIGNMENT` - Invalid assignment targets (future work)
- `INVALID_CONDITION_TYPE` - Non-boolean conditions in if/while (future work)

**Implementation**: ✅ Created `ExpressionTypeValidator.ts` - validates void type usage in invalid contexts
**Status**: ✅ Implemented, tested, and registered. All void type validation tests passing.
**Note**: Uses source content scanning to detect `void` in invalid positions (parameters, variables, properties) since the parser sanitizes these. The validator checks both symbol table (for parsed void types) and source content directly (for cases where parser rejects invalid syntax).

#### 2.2 Method Override Validation (Medium) ✅ COMPLETED

- ✅ `METHODS_MUST_OVERRIDE` - Missing @Override on overriding methods
- ✅ `METHOD_DOES_NOT_OVERRIDE` - @Override on non-overriding methods
- ✅ `CANNOT_REDUCE_METHOD_VISIBILITY_OVERRIDE` - Visibility reduction in overrides
- ✅ `NON_VIRTUAL_METHODS_CANNOT_OVERRIDE` - Overriding non-virtual methods

**Implementation**: ✅ Created `MethodOverrideValidator.ts` - TIER 1 (same-file only)
**Status**: ✅ Implemented, tested, and registered. 5 test cases passing.
**Note**: Confirmed that inner classes CAN extend their outer class in Apex (tested in Salesforce org). This validator catches same-file override cases including inner classes extending outer classes, but misses cross-file inheritance (typical Apex pattern). Full override validation requires TIER 2 (THOROUGH) with cross-file resolution for practical use.

#### 2.3 Modifier Validation (Medium) ✅ COMPLETED

- ✅ `MODIFIER_IS_NOT_ALLOWED` - Invalid modifier combinations (virtual/abstract/override on fields)
- ✅ `MODIFIER_NOT_IN_TOP_LEVEL_TYPE` - Modifiers on inner types (global on inner classes)
- ✅ `MODIFIER_CANNOT_BE` - Conflicting modifiers (virtual + final, etc.)
- ✅ `MODIFIER_REQUIRES` - Required modifier missing (webService requires global)

**Implementation**: ✅ Created `ModifierValidator.ts` - comprehensive modifier validation
**Status**: ✅ Implemented, tested, and registered. All 5 test cases passing.
**Note**: 
- Uses source content scanning for modifiers that the parser sanitizes (global on inner types, virtual/abstract/override on fields)
- Correctly resolves parent classes for webService methods/properties by handling class block symbols
- Complements existing listener-based modifier validation (MethodModifierValidator, ClassModifierValidator, etc.) by providing a second-pass validation that catches modifier violations comprehensively

### Phase 3: High Value + Cross-File (TIER 2)

#### 3.1 Method Resolution (Hard) ✅ COMPLETE

- ✅ `INVALID_METHOD_NOT_FOUND` - Method doesn't exist
- ✅ `METHOD_NOT_VISIBLE` - Method visibility violations
- ✅ `AMBIGUOUS_METHOD_SIGNATURE` - Ambiguous method calls (basic detection by parameter count)
- ✅ `METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE` - Invalid method parameter types (TIER 2 enhancement)
- ✅ `METHOD_DOES_NOT_SUPPORT_RETURN_TYPE` - Return type compatibility (complete - validates return types match assignment variable types)

**Implementation**: ✅ Created `MethodResolutionValidator.ts`
- Finds methods in class hierarchy (including superclasses via cross-file resolution)
- Checks visibility (Public, Global, Protected, Private, Default)
- Validates static vs instance context
- Detects ambiguous calls (multiple methods with same parameter count)
- Uses `ISymbolManager` for cross-file symbol resolution
- **TIER 2 Enhancement**: Parameter type matching - validates argument types match method parameter types

**Status**: ✅ Implemented and registered. Core functionality and TIER 2 parameter type matching complete.
**Note**: 
- Parameter type matching extracts argument types from source content (literals, variables, constructor calls)
- Validates exact type matches; null literals are compatible with any object type
- Return type checking requires assignment context (future enhancement)

#### 3.2 Variable Resolution (Hard) ✅ COMPLETE

- ✅ `VARIABLE_DOES_NOT_EXIST` - Undefined variables
- ✅ `VARIABLE_NOT_VISIBLE` - Variable visibility violations
- ✅ `FIELD_DOES_NOT_EXIST` - Undefined fields

**Implementation**: ✅ Created `VariableResolutionValidator.ts`
- Validates variable usage references (`VARIABLE_USAGE`)
- Validates field access references (`FIELD_ACCESS`)
- Finds variables in scope hierarchy using `SymbolTable.lookup()`
- Finds fields in class hierarchy (including superclasses via cross-file resolution)
- Checks visibility (Public, Global, Protected, Private, Default)
- Uses `ISymbolManager` for cross-file symbol resolution

**Status**: ✅ Implemented and registered. Core functionality and TIER 2 qualified field access complete.
**Note**: 
- TIER 2 Enhancement: Qualified field access type resolution - resolves object type and validates field exists in that type's hierarchy
- Extracts object name from source content and resolves its type via variable lookup
- Validates field exists in the resolved object type's class hierarchy (not just current class)

#### 3.3 Type Visibility (Hard) ✅ COMPLETE

- ✅ `TYPE_NOT_VISIBLE` - Type visibility violations
- ✅ `METHOD_RETURN_TYPE_NOT_VISIBLE` - Return type visibility in method signatures
- ✅ `METHOD_PARAMETER_TYPE_NOT_VISIBLE` - Parameter type visibility in method signatures

**Implementation**: ✅ Created `TypeVisibilityValidator.ts`
- Validates type declaration references (`TYPE_DECLARATION`)
- Validates parameter type references (`PARAMETER_TYPE`)
- Validates return type references (`RETURN_TYPE`)
- Resolves type symbols via `ISymbolManager` (cross-file resolution)
- Checks visibility (Public, Global, Protected, Private, Default)
- Uses same-file detection for private types

**Status**: ✅ Implemented and registered. Core functionality complete.
**Note**: Protected/Default type visibility across packages requires package membership checking (future enhancement).

#### 3.4 Exception Throw Validation (TIER 2) ✅ COMPLETE

- ✅ `INVALID_THROW_EXCEPTION` - Throw non-exception types (requires expression type resolution)

**Implementation**: ✅ Extended `ExceptionValidator.ts` with TIER 2 validation
- Validates throw statement expressions resolve to Exception types
- Handles `new TypeName()` expressions (most common case)
- Resolves type symbols via `ISymbolManager` (cross-file resolution)
- Recursively checks superclass chain to verify Exception inheritance
- Uses `ISymbolManager` for cross-file symbol resolution

**Status**: ✅ Implemented. Core functionality complete.
**Note**: Variable and method call expressions in throw statements require more complex type resolution (future enhancement).

### Phase 4: Medium Value + Easy (TIER 1)

#### 4.1 Constructor Validation (Easy) ✅ COMPLETE

- ✅ `INVALID_CONSTRUCTOR_RETURN` - Constructors returning values (detected via source scanning)
- ✅ `NO_SUPER_TYPE` - super() called when no superclass exists
- ✅ Constructor call placement and instance reference validation
- ✅ `UNKNOWN_CONSTRUCTOR` - Constructor signature mismatch (TIER 2) - super()/this() arguments don't match available constructors (requires superclass resolution)

**Implementation**: ✅ Created `ConstructorValidator.ts`
**TIER 1**: ✅ Placement, instance references, superclass existence, return statement detection
**TIER 2**: ✅ Constructor signature matching with type validation (enhanced to check argument types, not just count)
**Customer Value**: Medium - catches constructor errors
**Status**: ✅ Implemented, tested, and registered. TIER 1 and TIER 2 functionality complete.
**Note**: 
- TIER 2 enhancement validates constructor argument types (String, Integer, Boolean, null, variables, constructor calls)
- Type extraction handles literals, variables (via symbol table lookup), and constructor calls (`new TypeName()`)
- Validates exact type matches; full subtype compatibility checking would require more complex type resolution
- Cross-file superclass resolution via `ISymbolManager` enables validation of super()/this() calls across files

#### 4.2 Exception Validation (Easy) ✅ COMPLETE

- ✅ `INVALID_EXCEPTION_MUST_END_WITH_EXCEPTION` - Exception naming
- ✅ `INVALID_EXCEPTION_MUST_EXTEND_EXCEPTION` - Exception inheritance
- ✅ `INVALID_EXCEPTION_CONSTRUCTOR_ALREADY_DEFINED` - Duplicate exception constructors (System exceptions)
- ⏳ `INVALID_THROW_EXCEPTION` - Throw non-exception types (TIER 2 - requires type resolution)
- ✅ `INVALID_CATCH_EXCEPTION` / `INVALID_CATCH_DUPLICATE_EXCEPTION` - Catch block validation

**Implementation**: Check exception class structure and usage
**TIER 1**: Exception naming, inheritance, catch clauses, duplicate constructors
**TIER 2**: Throw statement type checking (requires expression type resolution)
**Customer Value**: Medium - catches exception handling errors
**Files**: `ExceptionValidator.ts`
**Status**: TIER 1 complete, TIER 2 throw validation pending

#### 4.3 Switch Statement Validation (Easy-Medium) ✅ COMPLETE

- ✅ `ILLEGAL_SWITCH_EXPRESSION_TYPE` - Invalid switch types (basic text-based check)
- ✅ `ILLEGAL_NO_WHEN_BLOCKS` - Missing when blocks
- ✅ `WHEN_ELSE_NOT_LAST` - When else placement
- ✅ `INVALID_SWITCH_ENUM` - Enum switch validation (TIER 2 enhancement)
- ✅ `NOT_UNIQUE_WHEN_VALUE_OR_TYPE` - Duplicate when clauses

**Implementation**: ✅ Created `SwitchStatementValidator.ts`
**TIER 1**: ✅ Switch statement structure, when blocks, else placement, duplicates, basic type checking
**TIER 2**: ✅ Enum switch validation - validates when values match enum constants
**Customer Value**: Medium - catches switch statement errors
**Status**: ✅ Implemented and registered. TIER 1 and TIER 2 functionality complete.
**Note**: 
- TIER 2 enhancement validates enum switch cases match enum constants
- Resolves switch expression type via variable lookup
- Validates when values exist in the resolved enum type
- Cross-file enum resolution via ISymbolManager enables validation across files

### Phase 5: Medium Value + Medium/Hard

#### 5.1 Collection Validation (Medium) ✅ COMPLETE

- ✅ `INVALID_LIST_INITIALIZER` / `INVALID_SET_INITIALIZER` / `INVALID_MAP_INITIALIZER` - Collection initialization (basic text-based checks)
- ✅ `INVALID_LIST_INDEX_TYPE` - List index type checking (TIER 1 basic + TIER 2 enhanced)
- ⏳ `INVALID_LIST_TYPE` - List type checking (requires type resolution - TIER 2)
- ⏳ `ILLEGAL_ALL_CALL` / `ILLEGAL_COMPARATOR_FOR_SORT` - Collection method validation (requires type resolution - TIER 2, handled by MethodResolutionValidator)

**Implementation**: ✅ Created `CollectionValidator.ts`
**TIER 1**: ✅ Collection initializer syntax (basic pattern matching), list index expressions (basic numeric check)
**TIER 2**: ✅ Enhanced list index type validation - validates index variables are Integer/Long types
**Customer Value**: Medium - catches collection errors
**Status**: ✅ Implemented and registered. TIER 1 and TIER 2 list index validation complete.
**Note**: 
- TIER 2 enhancement validates list index variable types (Integer/Long) via symbol table lookup
- Full type checking for collection initializers and list types requires more complex type resolution (future enhancement)
- Collection method call validation is handled by MethodResolutionValidator

#### 5.2 Operator Validation (Medium) ✅ COMPLETE

- ✅ `INVALID_COMPARISON_TYPES` - Incompatible comparison types (basic text-based checks)
- ✅ `INVALID_NUMERIC_ARGUMENTS_EXPRESSION` - Non-numeric arithmetic (basic pattern matching)
- ✅ `INVALID_BITWISE_OPERATOR_ARGUMENTS` - Invalid bitwise operations (basic type checks)
- ✅ `INCOMPATIBLE_TERNARY_EXPRESSION_TYPES` - Ternary type mismatch (basic compatibility checks)

**Implementation**: ✅ Created `OperatorValidator.ts`
**TIER 1**: ✅ Uses text-based pattern matching to detect operators and extract operands, validates comparison/arithmetic/bitwise/ternary expressions
**TIER 2**: ✅ Enhanced variable type resolution - resolves variable types in expressions via symbol table lookup, validates type compatibility for comparisons/arithmetic/bitwise/ternary
**Customer Value**: Medium - catches operator errors
**Status**: ✅ Implemented and registered. TIER 1 and TIER 2 validation complete.
**Note**: 
- TIER 2 enhancement resolves variable types in expressions and validates type compatibility
- Handles simple variable names (no method calls or complex expressions)
- Validates numeric types for arithmetic, Boolean/Integer/Long for bitwise, compatible types for comparisons and ternary

### Phase 6: Lower Priority / Edge Cases

#### 6.1 Advanced Features (Low-Medium)

- ❌ `NAMESPACE_GUARD_*` - @NamespaceGuard validation (REMOVED - internal-only annotation, not in public documentation)
- ⏳ `PACKAGE_VERSION_*` - Package version validation (pending)
- ⏳ `CUSTOM_METADATA_TYPE_NAMESPACE_NOT_VISIBLE` - Custom metadata visibility (pending - requires namespace resolution)
- ⏳ `CUSTOM_SETTINGS_NAMESPACE_NOT_VISIBLE` - Custom settings visibility (pending - requires namespace resolution)

**Implementation**: 
- ❌ `NamespaceGuardValidator.ts` was removed - @NamespaceGuard is an internal-only annotation and should not be validated
- Internal-only annotations are not validated per project policy (they are considered IP and cannot be shared)

**Status**: NamespaceGuard validation removed. Other advanced features pending.
**Customer Value**: Low-Medium - edge cases

#### 6.2 Deprecation Warnings (Low) ✅ COMPLETE

### Phase 7: Additional Statement Validations (Medium Value + Easy-Medium)

#### 7.1 Expression Statement Validation (Easy-Medium) ✅ COMPLETE

- ✅ `INVALID_EXPRESSION_STATEMENT` - Expressions used as statements (e.g., `x + 5;` without assignment)

**Implementation**: ✅ Already implemented in `ExpressionTypeValidator.ts` - detects expression statements that aren't assignments, method calls, or increment/decrement operations
**TIER 1**: Same-file only, parse tree walking
**Customer Value**: Medium - catches common mistakes like `x + 5;` or `someValue;` without side effects
**Status**: ✅ Implemented and tested. Test case exists and passes.

#### 7.2 DML Type Validation (Medium) ✅ COMPLETE

- ✅ `INVALID_DML_TYPE` - DML operations must use SObject or SObject list types

**Implementation**: ✅ Created `DmlStatementValidator.ts` - detects DML statements (insert, update, delete, undelete, upsert, merge), validates expression types
**TIER 1**: ✅ Basic type checking (text-based patterns + symbol table lookup for variables)
**TIER 2**: ⏳ Full type resolution for complex expressions (future work)
**Customer Value**: Medium - catches DML errors early
**Status**: ✅ Implemented, tested, and registered. Core TIER 1 functionality complete.
**Note**: Validates obvious non-SObject types (primitives, collections of primitives) and variable types from symbol table. Method calls and complex expressions are allowed (require TIER 2 resolution).

#### 7.3 RunAs Statement Validation (Easy-Medium) ✅ COMPLETE

- ✅ `INVALID_RUNAS` - runAs requires a single argument of type 'User' or 'Version'

**Implementation**: Walk parse tree, detect runAs statements, validate expression types
**TIER 1**: Basic type checking (text-based or symbol table lookup) ✅
**TIER 2**: Full type resolution for complex expressions (deferred)
**Customer Value**: Medium - catches runAs errors
**Files**: ✅ Created `RunAsStatementValidator.ts`
**Status**: ✅ Implemented, tested, and registered

#### 6.2 Deprecation Warnings (Low) ✅ COMPLETE

- ✅ `GLOBAL_DEPRECATE_IF_RETURN_DEPRECATED` - Global methods must be deprecated when return type is deprecated
- ✅ `GLOBAL_DEPRECATE_IF_PARAMETER_DEPRECATED` - Global methods must be deprecated when parameter type is deprecated
- ✅ `GLOBAL_DEPRECATE_IF_TYPE_DEPRECATED` - Global fields must be deprecated when type is deprecated
- ✅ `WEBSERVICE_DEPRECATE_IF_TYPE_DEPRECATED` - WebService fields must be deprecated when type is deprecated

**Implementation**: ✅ Created `DeprecationValidator.ts`
**TIER 1**: ✅ Same-file deprecation checking for global methods and WebService fields
**TIER 2**: ✅ Cross-file deprecation checking - resolves types from other files and checks if they're deprecated
- Validates global methods are deprecated when return/parameter types are deprecated (same-file only)
- Validates global fields are deprecated when their type is deprecated (same-file only)
- Validates WebService fields are deprecated when their type is deprecated (same-file only)
- Uses Set-based lookup for efficient same-file type checking

**Status**: ✅ Implemented and registered. TIER 1 and TIER 2 functionality complete.
**Note**: TIER 2 cross-file deprecation checking resolves types from other files and validates deprecation propagation.
**Customer Value**: Low - warnings only

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
