# Semantic Validation Status

**Last Updated**: 2026-02-10  
**Generated From**: Error code coverage analysis (`scripts/check-error-code-coverage.mjs`)

## Overview

This document tracks the implementation status of semantic validations in the Apex Language Server. Status is determined by analyzing actual error code usage in validator implementations.

### Current Statistics

- **Total Error Codes Defined**: 347
- **Error Codes Implemented**: 259 (74.6%)
- **Error Codes Unimplemented**: 88 (25.4%); 75 implementable (excl. org-only)
- **Outside of Org** (not implementable in LSP): 13 — excluded from implementable coverage
- **Implementable Total** (excluding org-only): 334
- **Implementable Coverage**: 259 / 334 = **77.5%**
- **Total Validators**: 50
  - **TIER 1 (IMMEDIATE)**: 45 validators
  - **TIER 2 (THOROUGH)**: 5 validators

## Progress Tracking

### Implementation Progress

| Category | Implemented | Total | Coverage |
|----------|------------|-------|----------|
| **Total Error Codes** | 259 | 347 | 74.6% |
| **Implementable** (excl. org-only) | 259 | 334 | 77.5% |
| **Outside of Org** (not implementable) | — | 13 | — |
| **TIER 1 Validators** | 45 | 45 | 100% |
| **TIER 2 Validators** | 5 | 5 | 100% |

## Implemented Validators

### TIER 1 (IMMEDIATE) Validators

| Validator | Error Codes | Status |
|-----------|-------------|--------|
| `SourceSizeValidator` | `SOURCE_FILE_TOO_LARGE` | ✅ Complete |
| `UnreachableStatementValidator` | `UNREACHABLE_STATEMENT` | ✅ Complete |
| `ControlFlowValidator` | `INVALID_BREAK`, `INVALID_CONTINUE`, `INVALID_RETURN_FROM_NON_METHOD` | ✅ Complete |
| `TryCatchFinallyValidator` | `INVALID_TRY_NEEDS_CATCH_OR_FINALLY` | ✅ Complete |
| `ReturnStatementValidator` | `INVALID_RETURN_VOID`, `INVALID_RETURN_NON_VOID`, `INVALID_CONSTRUCTOR_RETURN`, `INVALID_TRIGGER_RETURN` | ✅ Complete |
| `ParameterLimitValidator` | `INVALID_NUMBER_PARAMETERS` | ✅ Complete |
| `EnumLimitValidator` | `MAX_ENUMS_EXCEEDED` | ✅ Complete |
| `EnumConstantNamingValidator` | `INVALID_ENUM_CONSTANT_NAME` | ✅ Complete |
| `DuplicateMethodValidator` | `METHOD_ALREADY_EXISTS` | ✅ Complete |
| `ConstructorNamingValidator` | `INVALID_CONSTRUCTOR_NAME` | ✅ Complete |
| `TypeSelfReferenceValidator` | `CIRCULAR_DEFINITION` | ✅ Complete |
| `AbstractMethodBodyValidator` | `ABSTRACT_METHODS_CANNOT_HAVE_BODY`, `FINAL_METHODS_CANNOT_BE_ABSTRACT` | ✅ Complete |
| `VariableShadowingValidator` | `VARIABLE_SHADOWING` | ✅ Complete |
| `ForwardReferenceValidator` | `ILLEGAL_FORWARD_REFERENCE` | ✅ Complete |
| `FinalAssignmentValidator` | `INVALID_FINAL_FIELD_ASSIGNMENT`, `INVALID_FINAL_VARIABLE_ASSIGNMENT` | ✅ Complete |
| `DuplicateSymbolValidator` | `DUPLICATE_FIELD`, `DUPLICATE_VARIABLE`, `DUPLICATE_MODIFIER` | ✅ Complete |
| `DuplicateTypeNameValidator` | `DUPLICATE_TYPE_NAME` | ✅ Complete |
| `DuplicateAnnotationMethodValidator` | `DUPLICATE_REMOTE_ACTION_METHODS`, `DUPLICATE_WEB_SERVICE_METHODS`, `INVALID_PUBLIC_REMOTE_ACTION` | ✅ Complete |
| `DuplicateFieldInitValidator` | `DUPLICATE_FIELD_INIT`, `INVALID_NAME_VALUE_PAIR_CONSTRUCTOR` | ✅ Complete |
| `UnknownAnnotationValidator` | `ANNOTATION_UNKNOWN`, `INVALID_UNRESOLVED_ANNOTATION` | ✅ Complete |
| `AnnotationPropertyValidator` | 32+ error codes including `ANNOTATION_PROPERTY_INVALID_API_VERSION`, `ANNOTATION_PROPERTY_INVALID_TYPE`, `ANNOTATION_PROPERTY_VALUE_IS_NOT_ALLOWED`, `REST_RESOURCE_URL_INVALID_URL` (see detailed list below) | ✅ Complete |
| `LiteralValidator` | `ILLEGAL_INTEGER_LITERAL`, `ILLEGAL_LONG_LITERAL`, `ILLEGAL_DECIMAL_LITERAL`, `ILLEGAL_DOUBLE_LITERAL`, `INVALID_STRING_LITERAL_*`, `INVALID_CONTROL_CHARACTER` | ✅ Complete |
| `TestMethodValidator` | `TEST_METHOD_CANNOT_HAVE_PARAMS`, `TEST_SETUP_CANNOT_HAVE_PARAMS`, `TEST_SETUP_MUST_RETURN_VOID`, `TEST_CLASS_MUST_NOT_BE_EXCEPTION` | ✅ Complete |
| `AuraEnabledValidator` | `AURA_DUPLICATE_METHOD_FIELD`, `AURA_OVERLOADED_METHOD`, `NON_STATIC_AURA_METHOD_CANNOT_HAVE_PARAMS`, `NON_STATIC_AURA_METHOD_MUST_BEGIN_WITH_GET` | ✅ Complete |
| `ExpressionTypeValidator` | `INVALID_VOID_VARIABLE`, `INVALID_VOID_PROPERTY`, `INVALID_VOID_PARAMETER`, `INVALID_EXPRESSION_STATEMENT`, `INVALID_EXPRESSION_ASSIGNMENT` | ✅ Complete |
| `MethodOverrideValidator` | `METHODS_MUST_OVERRIDE`, `METHOD_DOES_NOT_OVERRIDE`, `CANNOT_REDUCE_METHOD_VISIBILITY_OVERRIDE`, `NON_VIRTUAL_METHODS_CANNOT_OVERRIDE`, `CANNOT_OVERRIDE_STATIC_METHOD` | ✅ Complete |
| `ModifierValidator` | `MODIFIER_IS_NOT_ALLOWED`, `MODIFIER_NOT_ON_TOP_LEVEL_TYPE`, `MODIFIER_CANNOT_BE`, `MODIFIER_REQUIRES`, `MODIFIER_IS_BY_DEFAULT`, `MODIFIER_REQUIRE_AT_LEAST`, `MODIFIER_ILLEGAL_DEFINING_TYPE`, `MODIFIER_ILLEGAL_DEFINING_TYPE_FOR`, `MODIFIER_MIN_VERSION`, `TOPLEVEL_MUST_BE_PUBLIC_OR_GLOBAL`, `TYPE_MUST_BE_TOP_LEVEL`, `ENCLOSING_TYPE_FOR`, `DEFINING_TYPE_REQUIRES`, `INVALID_READ_ONLY`, `USEREPLICA_PREFERRED_MUST_BE_STATIC` | ✅ Complete |
| `ConstructorValidator` | `INVALID_SUPER_CALL`, `INVALID_THIS_CALL`, `ILLEGAL_INSTANCE_METHOD_REFERENCE_IN_CONSTRUCTOR`, `INVALID_CONSTRUCTOR`, `INVALID_DEFAULT_CONSTRUCTOR`, `INVALID_NORMAL_CONSTRUCTOR` | ✅ Complete |
| `ExceptionValidator` | `INVALID_EXCEPTION_MUST_END_WITH_EXCEPTION`, `INVALID_EXCEPTION_MUST_EXTEND_EXCEPTION`, `INVALID_EXCEPTION_CONSTRUCTOR_ALREADY_DEFINED`, `INVALID_THROW_EXCEPTION`, `INVALID_CATCH_EXCEPTION`, `INVALID_CATCH_DUPLICATE_EXCEPTION` | ✅ Complete |
| `SwitchStatementValidator` | `ILLEGAL_SWITCH_EXPRESSION_TYPE`, `ILLEGAL_NO_WHEN_BLOCKS`, `WHEN_ELSE_NOT_LAST`, `INVALID_SWITCH_ENUM`, `INVALID_FULLY_QUALIFIED_ENUM`, `NOT_UNIQUE_WHEN_VALUE_OR_TYPE`, `ILLEGAL_NON_WHEN_TYPE`, `ILLEGAL_WHEN_TYPE`, `INVALID_WHEN_EXPRESSION_TYPE`, `INVALID_WHEN_FIELD_CONSTANT`, `INVALID_WHEN_FIELD_LITERAL`, `INVALID_WHEN_LITERAL_EXPRESSION`, `WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT`, `INVALID_ALREADY_MATCH_TYPE` | ✅ Complete |
| `CollectionValidator` | `INVALID_LIST_INITIALIZER`, `INVALID_SET_INITIALIZER`, `INVALID_MAP_INITIALIZER` | ✅ Complete |
| `ExpressionValidator` | `INVALID_CONDITION_TYPE`, `INVALID_VOID_ARITHMETIC_EXPRESSION`, `INVALID_COMPARISON_TYPES`, `INVALID_NUMERIC_ARGUMENTS_EXPRESSION`, `INVALID_BITWISE_OPERATOR_ARGUMENTS`, `INVALID_TYPE_BITWISE_NEGATE`, `INCOMPATIBLE_TERNARY_EXPRESSION_TYPES`, `INVALID_DATE_OPERAND_EXPRESSION`, `INVALID_TIME_OPERAND_EXPRESSION`, `INVALID_DATETIME_OPERAND_EXPRESSION` | ✅ Complete |
| `DeprecationValidator` | `GLOBAL_DEPRECATE_IF_PARAMETER_DEPRECATED`, `GLOBAL_DEPRECATE_IF_RETURN_DEPRECATED`, `GLOBAL_DEPRECATE_IF_TYPE_DEPRECATED`, `WEBSERVICE_DEPRECATE_IF_TYPE_DEPRECATED` | ✅ Complete |
| `DmlStatementValidator` | `DML_OPERATION_NOT_ALLOWED` | ✅ Complete |
| `RunAsStatementValidator` | `INVALID_RUNAS` | ✅ Complete |
| `MethodCallValidator` | `INVALID_NEW_ABSTRACT`, `INVALID_ABSTRACT_METHOD_CALL`, `INVALID_NEW_PROTECTED_METHOD`, `TYPE_NOT_CONSTRUCTABLE`, `SOBJECT_NOT_CONSTRUCTABLE` | ✅ Complete |
| `AbstractMethodImplementationValidator` | `CLASS_MUST_IMPLEMENT_ABSTRACT_METHOD` | ✅ Complete |
| `MethodModifierRestrictionValidator` | `INVALID_NEW_PROTECTED_METHOD`, `INVALID_MULTIPLE_METHODS_WITH_MODIFIER` | ✅ Complete |
| `ParameterizedTypeValidator` | `INVALID_PARAMETERIZED_TYPE_COUNT`, `TYPE_ARGUMENTS_FOR_NON_PARAMETERIZED_TYPE`, `NO_TYPE_ARGUMENTS_FOR_PARAMETERIZED_TYPE`, `PARAMETERIZED_TYPE_TOO_DEEP`, `MAXIMUM_TYPE_DEPTH_EXCEEDED` | ✅ Complete |
| `MethodTypeClashValidator` | `METHOD_TYPES_CLASH` | ✅ Complete |
| `PropertyAccessorValidator` | `ILLEGAL_ACCESSOR_ON_PROPERTY` | ✅ Complete |

### TIER 2 (THOROUGH) Validators

| Validator | Error Codes | Status |
|-----------|-------------|--------|
| `MethodSignatureEquivalenceValidator` | `METHOD_SIGNATURE_MISMATCH` | ✅ Complete |
| `InterfaceHierarchyValidator` | `INVALID_INTERFACE`, `INTERFACE_ALREADY_IMPLEMENTED`, `INTERFACE_IMPLEMENTATION_MISSING_METHOD`, `GENERIC_INTERFACE_ALREADY_IMPLEMENTED` | ✅ Complete |
| `ClassHierarchyValidator` | `INVALID_FINAL_SUPER_TYPE`, `INVALID_SUPER_TYPE` | ✅ Complete |
| `TypeAssignmentValidator` | `TYPE_ASSIGNMENT_MISMATCH` | ✅ Complete |
| `MethodResolutionValidator` | `METHOD_NOT_VISIBLE`, `METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE`, `METHOD_DOES_NOT_SUPPORT_RETURN_TYPE`, `AMBIGUOUS_METHOD_SIGNATURE`, `INVALID_METHOD_NOT_FOUND` | ✅ Complete |
| `VariableResolutionValidator` | `VARIABLE_DOES_NOT_EXIST`, `VARIABLE_NOT_VISIBLE`, `FIELD_DOES_NOT_EXIST`, `INVALID_FIELD_TYPE_LOAD`, `INVALID_FIELD_TYPE_STORE` | ✅ Complete |
| `AssignmentAccessValidator` | `ASSIGNMENT_ACCESS_ERROR` | ✅ Complete |
| `TypeVisibilityValidator` | `TYPE_NOT_VISIBLE`, `METHOD_RETURN_TYPE_NOT_VISIBLE`, `METHOD_PARAMETER_TYPE_NOT_VISIBLE`, `NOT_VISIBLE_MIN_VERSION`, `NOT_VISIBLE_MAX_VERSION` | ✅ Complete |
| `TypeResolutionValidator` | `INVALID_UNRESOLVED_TYPE`, `INVALID_CLASS` | ✅ Complete |
| `StaticContextValidator` | `INVALID_STATIC_METHOD_CONTEXT`, `INVALID_STATIC_VARIABLE_CONTEXT`, `INVALID_NON_STATIC_METHOD_CONTEXT`, `INVALID_NON_STATIC_VARIABLE_CONTEXT`, `INVALID_SUPER_STATIC_CONTEXT`, `INVALID_THIS_STATIC_CONTEXT` | ✅ Complete |
| `InnerTypeValidator` | `INVALID_INNER_TYPE_NO_INNER_TYPES`, `INVALID_INNER_TYPE_NO_STATIC_BLOCKS` | ✅ Complete |
| `NewExpressionValidator` | `NEW_INNER_TYPE_NAME_CONFLICT_INTERFACE`, `NEW_INNER_TYPE_NAME_CONFLICT_OUTER`, `NEW_INNER_TYPE_NAME_CONFLICT_SUPER_TYPE`, `NEW_NAME_CONFLICT_INNER`, `NEW_NAME_CONFLICT_LOCAL`, `NEW_NAME_MEMBER_CONFLICT`, `NEW_NAME_INVALID_EXCEPTION`, `NEW_NAME_CANNOT_END_EXCEPTION` | ✅ Complete |
| `InstanceofValidator` | `INVALID_INSTANCEOF_INVALID_TYPE`, `INVALID_INSTANCEOF_ALWAYS_FALSE`, `INVALID_INSTANCEOF_ALWAYS_TRUE` | ✅ Complete |

### AnnotationPropertyValidator Error Codes (32 total)

- `ANNOTATION_PROPERTY_MISSING`
- `ANNOTATION_PROPERTY_NOT_SUPPORTED`
- `ANNOTATION_PROPERTY_CANNOT_BE_EMPTY`
- `ANNOTATION_PROPERTY_INVALID_MULTIPLE_PARAMETER`
- `ANNOTATION_PROPERTY_TYPE_MISMATCH`
- `ANNOTATION_PROPERTY_INVALID_VALUE`
- `ANNOTATION_PROPERTY_ENUM_VALUE`
- `ANNOTATION_PROPERTY_INTEGER_RANGE`
- `ANNOTATION_PROPERTY_MIN_VERSION`
- `ANNOTATION_PROPERTY_MAX_VERSION`
- `ANNOTATION_PROPERTY_INVALID_FORMAT`
- `ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME`
- `ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME`
- `ANNOTATION_PROPERTY_GREATER_THAN_OR_EQUAL`
- `ANNOTATION_PROPERTY_LESS_THAN_OR_EQUAL`
- `ANNOTATION_PROPERTY_BAD_STRING_VALUE`
- `ANNOTATION_PROPERTY_SIBLING_INVALID_VALUE`
- `ANNOTATION_PROPERTY_IS_NOT_ALLOWED`
- `ANNOTATION_PROPERTY_NOT_SUPPORTED_FOR_TYPE`
- `ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX`
- `ANNOTATION_PROPERTY_TESTFOR_EMPTY_SUFFIX`
- `ANNOTATION_PROPERTY_VALUE_NOT_FOUND`
- `ANNOTATION_JSONACCESS_MUST_SPECIFY_CONTROL_PARAMETER`
- `REST_RESOURCE_URL_EMPTY`
- `REST_RESOURCE_URL_TOO_LONG`
- `REST_RESOURCE_URL_NO_SLASH`
- `REST_RESOURCE_URL_ILLEGAL_WILDCARD_PREDECESSOR`
- `REST_RESOURCE_URL_ILLEGAL_WILDCARD_SUCCESSOR`
- `INVOCABLE_METHOD_SINGLE_PARAM`
- `INVOCABLE_METHOD_NON_LIST_PARAMETER`
- `INVOCABLE_METHOD_CAN_ONLY_HAVE_DEPRECATED`
- `PARALLEL_TEST_METHOD_CANNOT_HAVE_SEE_ALL_DATA`
- `TEST_SETUP_CANNOT_HAVE_SEE_ALL_DATA`
- `TEST_SETUP_CANNOT_HAVE_DEFINING_TYPE_SEE_ALL_DATA`

### Validator Descriptions (24 Error Codes Plan)

#### TypeResolutionValidator (TIER 2)

Validates type references in declarations, parameters, return types, constructor calls, casts, instanceof, and generic type arguments:

- **INVALID_UNRESOLVED_TYPE**: Type reference cannot be resolved (unknown type, not in same file or symbol manager). Includes generic type arguments (e.g., `List<NonExistentType>`).
- **INVALID_CLASS**: Type resolves to interface or enum where a class is required (e.g., `new MyInterface()`)

Contexts checked: TYPE_DECLARATION, PARAMETER_TYPE, RETURN_TYPE, CONSTRUCTOR_CALL, CAST_TYPE_REFERENCE, INSTANCEOF_TYPE_REFERENCE, GENERIC_PARAMETER_TYPE.

#### StaticContextValidator (TIER 2)

Validates static vs non-static context for method/field access and super/this:

- **INVALID_STATIC_METHOD_CONTEXT**: Static method called via instance receiver (e.g., `this.staticMethod()` or chained `this.staticA().staticB()`)
- **INVALID_STATIC_VARIABLE_CONTEXT**: Static field accessed via instance receiver
- **INVALID_NON_STATIC_METHOD_CONTEXT**: Instance method called from static context without receiver
- **INVALID_NON_STATIC_VARIABLE_CONTEXT**: Instance field accessed from static context
- **INVALID_SUPER_STATIC_CONTEXT**: `super` used in static method or static block
- **INVALID_THIS_STATIC_CONTEXT**: `this` used in static method or static block

#### InnerTypeValidator (TIER 1)

Validates inner type rules:

- **INVALID_INNER_TYPE_NO_INNER_TYPES**: Inner types cannot declare inner types (no nested inner classes)
- **INVALID_INNER_TYPE_NO_STATIC_BLOCKS**: Inner types cannot have static blocks

#### NewExpressionValidator (TIER 2)

Validates `new TypeName()` name conflicts for inner types:

- **NEW_INNER_TYPE_NAME_CONFLICT_INTERFACE**: Inner type name cannot match interface implemented by outer
- **NEW_INNER_TYPE_NAME_CONFLICT_OUTER**: Inner type name cannot match outer type name
- **NEW_INNER_TYPE_NAME_CONFLICT_SUPER_TYPE**: Inner type name cannot match super type of outer
- **NEW_NAME_CONFLICT_INNER**: Inner type name cannot match another inner type
- **NEW_NAME_CONFLICT_LOCAL**: Inner type name cannot match local variable or parameter in scope
- **NEW_NAME_MEMBER_CONFLICT**: Inner type name cannot match field, property, or method of the type

#### Extended Validators (24 Error Codes Plan)

- **UnknownAnnotationValidator**: INVALID_UNRESOLVED_ANNOTATION (custom annotation not found at THOROUGH tier)
- **MethodCallValidator**: TYPE_NOT_CONSTRUCTABLE (enum, interface, primitive), SOBJECT_NOT_CONSTRUCTABLE (generic SObject)
- **VariableResolutionValidator**: INVALID_FIELD_TYPE_LOAD, INVALID_FIELD_TYPE_STORE (void type fields)
- **TypeVisibilityValidator**: NOT_VISIBLE_MAX_VERSION (wired: uses `@Deprecated(removed=X)` on type; reports when apiVersion >= removed). NOT_VISIBLE_MIN_VERSION (requires package metadata for "added since" - not available from @Deprecated)

## Missing Validations

### Validation Categories by Org Involvement

Validations are categorized based on their requirements for org connection and metadata:

1. **⛔ Outside of Org (Runtime Org Connection Required)**: These require an active org connection and runtime checks that cannot be statically determined. They depend on org-specific metadata that changes per org (e.g., `isTrusted()` permission checks, namespace visibility, custom metadata/settings existence). Cannot be implemented in a typical LSP context without org connection.

2. **⚠️ Requires Schema/Metadata (Potentially Implementable)**: These could potentially be implemented if schema/metadata is available via Tooling API or metadata files. They may require SObject schema, platform metadata, or package metadata that could be obtained statically or via org connection. Currently stubbed or unimplemented due to missing metadata infrastructure.

3. **❌ Unimplemented (No Org Requirement)**: These can be implemented using only AST and symbol table information without org connection or metadata.

### High Priority - Common Language Features

#### Expression and Type Validation (1 error code)
- `ILLEGAL_CONVERSION` - ⚠️ Partially implemented (basic validation in place, may need enhancement)

#### DML and Database Operations (5 error codes)
- `MERGE_NOT_SUPPORTED` - ⚠️ Requires Schema/Metadata
  - **Metadata Type**: SObject-level (`DescribeSObjectResult.isMergeable()`)
  - **Available From**: SObject stub classes (if `isMergeable` property added) or Tooling API
- `UPSERT_INVALID_FIELD` - ⚠️ Requires Schema/Metadata
  - **Metadata Type**: Field-level (`DescribeFieldResult.isExternalId()`)
  - **Available From**: Field stubs in SObject classes (if `isExternalId` property added) or Tooling API
- `INVALID_ROW_LOCK` - ⚠️ Requires Schema/Metadata
  - **Metadata Type**: Syntax validation (may not require metadata, just syntax parsing)
  - **Available From**: Parser-level validation
- `QUERY_TOO_LARGE` - ❌ Unimplemented (no org requirement)
- `LOOP_VARIABLE_MISMATCH_CONCRETE_SOBJECT_TYPE` - ⚠️ Partial in `ExpressionValidator`
  - **Metadata Type**: SObject type resolution (concrete vs generic)
  - **Available From**: SObject stub classes (already available)

#### Trigger Validation (5 error codes)
- `INVALID_DUPLICATE_TRIGGER_USAGE` - ❌ Unimplemented (can check trigger file metadata)
- `INVALID_TRIGGER_BEFORE_UNDELETE` - ❌ Unimplemented (syntax-based validation)
- `INVALID_TRIGGER_OBJECT` - ⚠️ Requires Schema/Metadata
  - **Metadata Type**: SObject existence (SObject type name validation)
  - **Available From**: SObject stub classes (already available)
- `INVALID_TRIGGER_PLATFORM_EVENT` - ⚠️ Requires Schema/Metadata
  - **Metadata Type**: Platform Event type identification
  - **Available From**: SObject stub classes (if Platform Event types are marked) or metadata files
- `TRIGGER_NOT_SUPPORTED` - ⚠️ Requires Schema/Metadata
  - **Metadata Type**: Platform capabilities (whether triggers are supported for SObject type)
  - **Available From**: Platform metadata or static definitions

### Medium Priority - Type System and Visibility

#### Type Resolution and Visibility (2 error codes)
- `FIELD_DOES_NOT_SUPPORT_TYPE` - ⚠️ Requires Schema/Metadata
  - **Metadata Type**: Field-level (`DescribeFieldResult.type` / `getType()`)
  - **Available From**: Field stubs in SObject classes (if field types are represented) or Tooling API
- `NOT_VISIBLE_MIN_VERSION` - ⚠️ Requires Schema/Metadata
  - **Metadata Type**: Package metadata ("added since" version)
  - **Available From**: `package.xml` or metadata files (not available from `@Deprecated` annotation)

#### Parameterized Types and Generics (1 error code)
- `INVALID_PARAMETERIZED_TYPE` - ❌ Deferred (covered by TypeResolutionValidator for unresolved generic args)

### Lower Priority - Advanced Features

#### Annotation Enhancements (2 error codes)
- `ANNOTATION_NOT_SUPPORTED` - ⛔ Outside of Org (requires org metadata to determine if annotation is supported/enabled in org)
- `ANNOTATION_PROPERTY_INVALID_PERM_VALUE` - ⛔ Outside of Org (requires org metadata to validate permission names exist)

#### Modifier Enhancements (1 error code)
- `MODIFIER_IS_INTERNAL` - ⛔ Outside of Org (requires org `isTrusted()` check to determine if internal modifier is allowed)

#### String and Literal Validation (7 error codes)
- `INVALID_UNIT` - ⛔ Deferred / Out of Scope (placeholder for invalid compilation; not literal validation)

#### Java Integration (6 error codes)

> **Note**: Cannot be implemented outside of the org—requires org metadata (`isTrusted()` check) and Java class resolution at runtime.

- `ILLEGAL_JAVA_EXPRESSION` - ⛔ Outside of Org (requires org `isTrusted()` check)
- `INVALID_JAVA_EXPRESSION` - ⛔ Outside of Org (requires org `isTrusted()` check)
- `INVALID_JAVA_EXPRESSION_CLASS_NOT_FOUND` - ⛔ Outside of Org (requires org `isTrusted()` check + Java class resolution)
- `INVALID_JAVA_EXPRESSION_FIELD_NOT_FOUND` - ⛔ Outside of Org (requires org `isTrusted()` check + Java class resolution)
- `INVALID_JAVA_EXPRESSION_METHOD_NOT_FOUND` - ⛔ Outside of Org (requires org `isTrusted()` check + Java class resolution)
- `INVALID_JAVA_EXPRESSION_METHOD_NOT_STATIC` - ⛔ Outside of Org (requires org `isTrusted()` check + Java class resolution)

#### Namespace and Package Features (6 error codes)
- `CUSTOM_METADATA_TYPE_NAMESPACE_NOT_VISIBLE` - ⛔ Outside of Org (requires org metadata to determine namespace visibility)
- `CUSTOM_SETTINGS_NAMESPACE_NOT_VISIBLE` - ⛔ Outside of Org (requires org metadata to determine namespace visibility)
- `PACKAGE_VERSION_FORBIDDEN` - ❌ Unimplemented (can validate against package.xml metadata)
- `PACKAGE_VERSION_INVALID` - ❌ Unimplemented (can validate version format)
- `PACKAGE_VERSION_REQUIRES_NAMESPACE` - ❌ Unimplemented (can validate against package.xml metadata)
- `EXPLICIT_UNMANAGED` - ❌ Unimplemented (can validate against package.xml metadata)

#### SObject and Database Features (7 error codes)
- `METHOD_INVALID_ADD_ERROR_NOT_SOBJECT_SCALAR_FIELD` - ⚠️ Requires Schema/Metadata
  - **Metadata Type**: Field-level (field existence + scalar check)
  - **Available From**: Field stubs in SObject classes (field existence) + field type metadata (scalar vs collection)
- `METHOD_INVALID_ON_SOBJECT_FIELD` - ❌ Unimplemented (requires receiver type resolution - no org requirement)
- `METHOD_INVALID_SOBJECT_LIST` - ❌ Unimplemented (requires receiver type resolution - no org requirement)
- `METHOD_INVALID_SOBJECT_MAP` - ❌ Unimplemented (requires receiver type resolution - no org requirement)
- `METHOD_ONLY_LIST_CUSTOM_SETTINGS` - ⚠️ Requires Schema/Metadata
  - **Metadata Type**: SObject-level (`DescribeSObjectResult.isCustomSetting()`) + custom settings type (`customSettingsType` = "List")
  - **Available From**: SObject stub classes (if `isCustomSetting` property added) + metadata XML files (`customSettingsType` field)
- `ILLEGAL_NON_FOREIGN_KEY_REFERENCE` - ⛔ Outside of Org (requires org schema to validate foreign key relationships)
- `ARRAY_REF_NOT_ALLOWED` - ❌ Unimplemented (no org requirement)

#### Type Depth and Limits (2 error codes)
- `EXPRESSION_TOO_LONG` - ❌ Unimplemented (possibly parser/compiler-phase)
- `INVALID_METADATA_TOO_LARGE` - ❌ Unimplemented (metadata/deployment level)

#### Type Requirements (1 error code - remaining)
- `ENCLOSING_TYPE` - ⏳ Deferred (Apex does not support anonymous inner classes; rule applies to virtual redundant in anonymous enclosing type, which cannot occur)

#### Other Features (7 error codes)
- `EXPORT_DATA_CATEGORY` - ⚠️ Requires Schema/Metadata
  - **Metadata Type**: Data category metadata (`Schema.describeDataCategoryGroupStructures()`)
  - **Available From**: Tooling API or metadata files
- `EXTERNAL_STRING_DOES_NOT_EXIST` - ⛔ Outside of Org (requires org metadata to validate external string exists)
- `PAGE_DOES_NOT_EXIST` - ⛔ Outside of Org (requires org metadata to validate Visualforce page exists)
- `DEPENDENT_CLASS_INVALID` - ❌ Deferred (requires cross-file dependency analysis - no org requirement)
- `DEPENDENT_CLASS_INVALIDCHAIN` - ❌ Deferred (requires cross-file dependency analysis - no org requirement)
- `REAL_LOC` - ⚠️ Location formatting (not validation error)
- `SYNTHETIC_LOC` - ⚠️ Location formatting (not validation error)

### LSP Operation Validations (5 error codes)

These error codes correspond to LSP operations (code actions, refactoring, rename)—not AST validation diagnostics:

- `CANNOT_RENAME` - LSP rename operation (not AST validation)
- `DECLARE_MISSING_METHOD` - LSP code action (not validation error)
- `DECLARE_MISSING_METHOD_AVAILABLE` - LSP code action (not validation error)
- `EXTRACT_CONSTANT` - LSP refactoring action (not validation error)
- `EXTRACT_VARIABLE` - LSP refactoring action (not validation error)

#### Plural Forms (12 error codes - Likely Not Needed)
- `ANNOTATION_PLURAL`
- `ANONYMOUS_PLURAL`
- `CLASS_PLURAL`
- `CONSTRUCTOR_PLURAL`
- `ENUM_PLURAL`
- `FIELD_PLURAL`
- `INTERFACE_PLURAL`
- `LOCAL_PLURAL`
- `METHOD_PLURAL`
- `PARAMETER_PLURAL`
- `PROPERTY_PLURAL`
- `TRIGGER_PLURAL`

#### Test-Specific (1 error code)
- `PARALLEL_TEST_CLASS_CANNOT_HAVE_SEE_ALL_DATA` (Note: Similar to implemented `PARALLEL_TEST_METHOD_CANNOT_HAVE_SEE_ALL_DATA`)

## Non-Validator Error Codes

These error codes are handled outside of semantic validators:

### Syntax Errors (13 error codes) - ✅ Reportable

These error codes are handled by the ANTLR parser/lexer via `ApexErrorListener`, not by semantic validators:

- `MISMATCHED_SYNTAX` - ✅ Mapped in `ApexErrorListener` (ANTLR parser)
- `MISSING_CLOSING_MARK` - ✅ Mapped in `ApexErrorListener` (ANTLR lexer)
- `MISSING_CLOSING_QUOTE` - ✅ Mapped in `ApexErrorListener` (ANTLR lexer)
- `MISSING_SYNTAX` - ✅ Mapped in `ApexErrorListener` (ANTLR parser)
- `UNEXPECTED_EOF` - ✅ Mapped in `ApexErrorListener` (ANTLR parser)
- `UNEXPECTED_ERROR` - ✅ Mapped in `ApexErrorListener` (ANTLR parser)
- `UNEXPECTED_SYMBOL_EXPECTED_FOUND` - ✅ Mapped in `ApexErrorListener` (ANTLR parser)
- `UNEXPECTED_SYMBOL_NOT_SET` - ✅ Mapped in `ApexErrorListener` (ANTLR parser)
- `UNEXPECTED_SYMBOL_RANGE` - ✅ Mapped in `ApexErrorListener` (ANTLR parser)
- `UNEXPECTED_SYMBOL_SET` - ✅ Mapped in `ApexErrorListener` (ANTLR parser)
- `UNEXPECTED_SYNTAX_ERROR` - ✅ Mapped in `ApexErrorListener` (fallback)
- `UNEXPECTED_TOKEN` - ✅ Mapped in `ApexErrorListener` (ANTLR parser)
- `UNMATCHED_SYNTAX` - ✅ Mapped in `ApexErrorListener` (ANTLR parser)

## Error Code Implementation Table

**Status legend**: 
- ✅ Implemented: Fully implemented validator
- ✅ Reportable (syntax): Syntax errors handled by parser
- ⛔ Outside of Org: Requires runtime org connection and org-specific metadata (cannot implement in LSP without org)
- ⚠️ Requires Schema/Metadata: Could be implementable with schema/metadata access but currently stubbed
- ⚠️ LSP Feature/Stub/Formatting: LSP operation, stub implementation, or formatting concern
- ❌ Unimplemented: Not yet implemented (no org requirement)
- ❌ Deferred: Intentionally deferred

| Error Code | Status | Validator | Priority | Notes |
|------------|--------|-----------|----------|-------|
| `ABSTRACT_METHODS_CANNOT_HAVE_BODY` | ✅ Implemented | `AbstractMethodBodyValidator` | High | |
| `AMBIGUOUS_METHOD_SIGNATURE` | ✅ Implemented | `MethodResolutionValidator` | High | |
| `ANNOTATION_JSONACCESS_MUST_SPECIFY_CONTROL_PARAMETER` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_NOT_SUPPORTED` | ⛔ Outside of Org | - | Medium | Requires org metadata |
| `ANNOTATION_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `ANNOTATION_PROPERTY_BAD_STRING_VALUE` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_CANNOT_BE_EMPTY` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_GREATER_THAN_OR_EQUAL` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_INVALID_API_VERSION` | ✅ Implemented | `AnnotationPropertyValidator` | Medium | |
| `ANNOTATION_PROPERTY_INVALID_FORMAT` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_INVALID_MULTIPLE_PARAMETER` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_INVALID_PERM_VALUE` | ⛔ Outside of Org | - | Low | Requires org metadata |
| `ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_INVALID_TYPE` | ✅ Implemented | `AnnotationPropertyValidator` | Medium | |
| `ANNOTATION_PROPERTY_INVALID_VALUE` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_IS_NOT_ALLOWED` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_LESS_THAN_OR_EQUAL` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_MAX_VERSION` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_MIN_VERSION` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_MISSING` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_NOT_SUPPORTED` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_NOT_SUPPORTED_FOR_TYPE` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_SIBLING_INVALID_VALUE` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_TESTFOR_EMPTY_SUFFIX` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_TYPE_MISMATCH` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_PROPERTY_VALUE_IS_NOT_ALLOWED` | ✅ Implemented | `AnnotationPropertyValidator` | Medium | |
| `ANNOTATION_PROPERTY_VALUE_NOT_FOUND` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `ANNOTATION_UNKNOWN` | ✅ Implemented | `UnknownAnnotationValidator` | High | |
| `ANONYMOUS_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `ARRAY_REF_NOT_ALLOWED` | ❌ Unimplemented | - | Medium | |
| `ASSIGNMENT_ACCESS_ERROR` | ✅ Implemented | `AssignmentAccessValidator` | High | |
| `AURA_DUPLICATE_METHOD_FIELD` | ✅ Implemented | `AuraEnabledValidator` | High | |
| `AURA_OVERLOADED_METHOD` | ✅ Implemented | `AuraEnabledValidator` | High | |
| `CANNOT_OVERRIDE_STATIC_METHOD` | ✅ Implemented | `MethodOverrideValidator` | High | |
| `CANNOT_REDUCE_METHOD_VISIBILITY_OVERRIDE` | ✅ Implemented | `MethodOverrideValidator` | High | |
| `CANNOT_RENAME` | ⚠️ LSP Feature | - | Low | LSP rename operation, not AST validation |
| `CIRCULAR_DEFINITION` | ✅ Implemented | `TypeSelfReferenceValidator` | High | |
| `CLASS_MUST_IMPLEMENT_ABSTRACT_METHOD` | ✅ Implemented | `AbstractMethodImplementationValidator` | High | |
| `CLASS_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `CONSTRUCTOR_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `CUSTOM_METADATA_TYPE_NAMESPACE_NOT_VISIBLE` | ⛔ Outside of Org | - | Low | Requires org metadata |
| `CUSTOM_SETTINGS_NAMESPACE_NOT_VISIBLE` | ⛔ Outside of Org | - | Low | Requires org metadata |
| `DATE_STRING` | ❌ Unimplemented | - | Low | |
| `DECLARATIONS_SINGLE_SCOPE` | ✅ Handled | `DuplicateSymbolValidator` | Low | Handled by DUPLICATE_MODIFIER |
| `DECLARE_MISSING_METHOD` | ⚠️ LSP Feature | - | Low | LSP code action, not validation error |
| `DECLARE_MISSING_METHOD_AVAILABLE` | ⚠️ LSP Feature | - | Low | LSP code action, not validation error |
| `DEFINING_TYPE_REQUIRES` | ✅ Implemented | `ModifierValidator` | Medium | Abstract method in global class must be global (API 14+) |
| `DEPENDENT_CLASS_INVALID` | ❌ Deferred | - | Low | Requires cross-file dependency analysis |
| `DEPENDENT_CLASS_INVALIDCHAIN` | ❌ Deferred | - | Low | Requires cross-file dependency analysis |
| `DEPRECATE_SOBJECT_RECALCULATEFORMULAS` | ✅ Implemented | `MethodCallValidator` | Low | |
| `DML_OPERATION_NOT_ALLOWED` | ✅ Implemented | `DmlStatementValidator` | High | |
| `DUPLICATE_FIELD` | ✅ Implemented | `DuplicateSymbolValidator` | High | |
| `DUPLICATE_FIELD_INIT` | ✅ Implemented | `DuplicateFieldInitValidator` | High | |
| `DUPLICATE_MODIFIER` | ✅ Implemented | `DuplicateSymbolValidator` | High | |
| `DUPLICATE_REMOTE_ACTION_METHODS` | ✅ Implemented | `DuplicateAnnotationMethodValidator` | High | |
| `DUPLICATE_TYPE_NAME` | ✅ Implemented | `DuplicateTypeNameValidator` | High | |
| `DUPLICATE_TYPE_PARAMETER` | ❌ Unimplemented | - | Medium | |
| `DUPLICATE_VARIABLE` | ✅ Implemented | `DuplicateSymbolValidator` | High | |
| `DUPLICATE_WEB_SERVICE_METHODS` | ✅ Implemented | `DuplicateAnnotationMethodValidator` | High | |
| `ENCLOSING_TYPE` | ❌ Deferred | - | Low | Apex lacks anonymous inner classes; virtual-redundant-in-anonymous cannot occur |
| `ENCLOSING_TYPE_FOR` | ✅ Implemented | `ModifierValidator` | Medium | Inner type with global requires enclosing global |
| `ENUM_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `EXPLICIT_UNMANAGED` | ❌ Unimplemented | - | Low | |
| `EXPORT_DATA_CATEGORY` | ⚠️ Requires Schema/Metadata | - | Low | Requires metadata analysis to validate data category |
| `EXPRESSION_TOO_LONG` | ❌ Unimplemented | - | Medium | |
| `EXTERNAL_STRING_DOES_NOT_EXIST` | ⛔ Outside of Org | - | Low | Requires org metadata |
| `EXTRACT_CONSTANT` | ⚠️ LSP Feature | - | Low | LSP refactoring action, not validation error |
| `EXTRACT_VARIABLE` | ⚠️ LSP Feature | - | Low | LSP refactoring action, not validation error |
| `FIELD_DOES_NOT_EXIST` | ✅ Implemented | `VariableResolutionValidator` | High | |
| `FIELD_DOES_NOT_SUPPORT_TYPE` | ⚠️ Requires Schema/Metadata | - | Medium | Requires SObject schema to validate field type compatibility |
| `FIELD_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `FINAL_METHODS_CANNOT_BE_ABSTRACT` | ✅ Implemented | `AbstractMethodBodyValidator` | High | |
| `GENERIC_INTERFACE_ALREADY_IMPLEMENTED` | ✅ Implemented | `InterfaceHierarchyValidator` | High | |
| `GLOBAL_DEPRECATE_IF_PARAMETER_DEPRECATED` | ✅ Implemented | `DeprecationValidator` | Medium | |
| `GLOBAL_DEPRECATE_IF_RETURN_DEPRECATED` | ✅ Implemented | `DeprecationValidator` | Medium | |
| `GLOBAL_DEPRECATE_IF_TYPE_DEPRECATED` | ✅ Implemented | `DeprecationValidator` | Medium | |
| `IDENTIFIER_TOO_LONG` | ✅ Implemented | - | High | |
| `ILLEGAL_ACCESSOR_ON_PROPERTY` | ✅ Implemented | `PropertyAccessorValidator` | Medium | |
| `ILLEGAL_ALL_CALL` | ❌ Unimplemented | - | High | |
| `ILLEGAL_ASSIGNMENT` | ❌ Unimplemented | - | High | |
| `ILLEGAL_COMPARATOR_FOR_SORT` | ❌ Unimplemented | - | High | |
| `ILLEGAL_CONVERSION` | ❌ Unimplemented | - | High | |
| `ILLEGAL_DECIMAL_LITERAL` | ✅ Implemented | `LiteralValidator` | Low | |
| `ILLEGAL_DOUBLE_LITERAL` | ✅ Implemented | `LiteralValidator`, `ApexErrorListener` | Low | Parser mapping + semantic fallback |
| `ILLEGAL_FORWARD_REFERENCE` | ✅ Implemented | `ForwardReferenceValidator` | High | |
| `ILLEGAL_INSTANCE_METHOD_REFERENCE_IN_CONSTRUCTOR` | ✅ Implemented | `ConstructorValidator` | High | |
| `ILLEGAL_INTEGER_LITERAL` | ✅ Implemented | `LiteralValidator` | Low | |
| `ILLEGAL_JAVA_EXPRESSION` | ⛔ Outside of Org | - | Low | Requires org + Java class resolution |
| `ILLEGAL_LONG_LITERAL` | ✅ Implemented | `LiteralValidator` | Low | |
| `ILLEGAL_NO_WHEN_BLOCKS` | ✅ Implemented | `SwitchStatementValidator` | High | |
| `ILLEGAL_NON_FOREIGN_KEY_REFERENCE` | ⛔ Outside of Org | - | Medium | Requires org schema |
| `ILLEGAL_NON_WHEN_TYPE` | ✅ Implemented | `SwitchStatementValidator` | High | |
| `ILLEGAL_STRING_LITERAL` | ✅ Implemented | `ApexErrorListener` | Low | Parser error mapping |
| `ILLEGAL_SWITCH_EXPRESSION_TYPE` | ✅ Implemented | `SwitchStatementValidator` | High | |
| `ILLEGAL_WHEN_TYPE` | ✅ Implemented | `SwitchStatementValidator` | High | |
| `INCOMPATIBLE_CAST_TYPES` | ❌ Unimplemented | - | High | |
| `INCOMPATIBLE_NULLCOALESCING_EXPRESSION_TYPES` | ❌ Unimplemented | - | High | |
| `INCOMPATIBLE_TERNARY_EXPRESSION_TYPES` | ✅ Implemented | `ExpressionValidator` | High | |
| `INTERFACE_ALREADY_IMPLEMENTED` | ✅ Implemented | `InterfaceHierarchyValidator` | High | |
| `INTERFACE_IMPLEMENTATION_METHOD_DEPRECATED` | ✅ Implemented | `InterfaceHierarchyValidator` | Medium | |
| `INTERFACE_IMPLEMENTATION_METHOD_NOT_VISIBLE` | ✅ Implemented | `InterfaceHierarchyValidator` | Medium | |
| `INTERFACE_IMPLEMENTATION_MISSING_METHOD` | ✅ Implemented | `InterfaceHierarchyValidator` | High | |
| `INTERFACE_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `INVALID_ABSTRACT_METHOD_CALL` | ✅ Implemented | `MethodCallValidator` | High | |
| `INVALID_ALREADY_MATCH_TYPE` | ✅ Implemented | `SwitchStatementValidator` | Medium | |
| `INVALID_APEX_IDENTIFIER` | ✅ Implemented | `ApexErrorListener` | Medium | Lexer error mapping |
| `INVALID_APEX_SYMBOL` | ✅ Implemented | `ApexErrorListener` | Medium | Lexer error mapping |
| `INVALID_BITWISE_OPERATOR_ARGUMENTS` | ✅ Implemented | `ExpressionValidator` | High | |
| `INVALID_BOOLEAN_PREFIX_OPERAND` | ❌ Unimplemented | - | High | |
| `INVALID_BREAK` | ✅ Implemented | `ControlFlowValidator` | High | |
| `INVALID_CAST_TYPE` | ❌ Unimplemented | - | High | |
| `INVALID_CATCH_DUPLICATE_EXCEPTION` | ✅ Implemented | `ExceptionValidator` | High | |
| `INVALID_CATCH_EXCEPTION` | ✅ Implemented | `ExceptionValidator` | High | |
| `INVALID_CHARACTER_IDENTIFIER` | ✅ Implemented | - | High | |
| `INVALID_CLASS` | ✅ Implemented | `TypeResolutionValidator` | Medium | |
| `INVALID_COMPARISON_TYPES` | ✅ Implemented | `ExpressionValidator` | High | |
| `INVALID_CONDITION_TYPE` | ✅ Implemented | `ExpressionValidator` | High | |
| `INVALID_CONSTRUCTOR` | ✅ Implemented | `ConstructorValidator` | High | |
| `INVALID_CONSTRUCTOR_NAME` | ✅ Implemented | `ConstructorNamingValidator` | High | |
| `INVALID_CONSTRUCTOR_RETURN` | ✅ Implemented | `ReturnStatementValidator` | High | |
| `INVALID_CONTINUE` | ✅ Implemented | `ControlFlowValidator` | High | |
| `INVALID_CONTROL_CHARACTER` | ✅ Implemented | `LiteralValidator` | Low | |
| `INVALID_DATE` | ✅ Implemented | `ApexErrorListener` | Low | Lexer error mapping |
| `INVALID_DATE_OPERAND_EXPRESSION` | ✅ Implemented | `ExpressionValidator` | Low | |
| `INVALID_DATE_TIME` | ✅ Implemented | `ApexErrorListener` | Low | Lexer error mapping |
| `INVALID_DATETIME_OPERAND_EXPRESSION` | ✅ Implemented | `ExpressionValidator` | Low | |
| `INVALID_DEFAULT_CONSTRUCTOR` | ✅ Implemented | `ConstructorValidator` | High | |
| `INVALID_DML_TYPE` | ✅ Implemented | `DmlStatementValidator` | High | |
| `INVALID_DUPLICATE_TRIGGER_USAGE` | ❌ Unimplemented | - | Medium | |
| `INVALID_EXACT_EQUALITY_TYPE` | ❌ Unimplemented | - | High | |
| `INVALID_EXCEPTION_CONSTRUCTOR_ALREADY_DEFINED` | ✅ Implemented | `ExceptionValidator` | High | |
| `INVALID_EXCEPTION_MUST_END_WITH_EXCEPTION` | ✅ Implemented | `ExceptionValidator` | High | |
| `INVALID_EXCEPTION_MUST_EXTEND_EXCEPTION` | ✅ Implemented | `ExceptionValidator` | High | |
| `INVALID_EXPRESSION_ASSIGNMENT` | ✅ Implemented | `ExpressionTypeValidator` | High | |
| `INVALID_EXPRESSION_STATEMENT` | ✅ Implemented | `ExpressionTypeValidator` | High | |
| `INVALID_FIELD_TYPE_LOAD` | ✅ Implemented | `VariableResolutionValidator` | Medium | |
| `INVALID_FIELD_TYPE_STORE` | ✅ Implemented | `VariableResolutionValidator` | Medium | |
| `INVALID_FINAL_FIELD_ASSIGNMENT` | ✅ Implemented | `FinalAssignmentValidator` | High | |
| `INVALID_FINAL_SUPER_TYPE` | ✅ Implemented | `ClassHierarchyValidator` | High | |
| `INVALID_FINAL_VARIABLE_ASSIGNMENT` | ✅ Implemented | `FinalAssignmentValidator` | High | |
| `INVALID_FULLY_QUALIFIED_ENUM` | ✅ Implemented | `SwitchStatementValidator` | Medium | Enum switch when must be unqualified |
| `INVALID_INEQUALITY_TYPE` | ❌ Unimplemented | - | High | |
| `INVALID_INITIAL_KEY_TYPE` | ❌ Unimplemented | - | High | |
| `INVALID_INITIAL_VALUE_TYPE` | ❌ Unimplemented | - | High | |
| `INVALID_INNER_TYPE_NO_INNER_TYPES` | ✅ Implemented | `InnerTypeValidator` | Medium | |
| `INVALID_INNER_TYPE_NO_STATIC_BLOCKS` | ✅ Implemented | `InnerTypeValidator` | Medium | |
| `INVALID_INSTANCEOF_ALWAYS_FALSE` | ❌ Unimplemented | - | Medium | |
| `INVALID_INSTANCEOF_ALWAYS_TRUE` | ❌ Unimplemented | - | Medium | |
| `INVALID_INSTANCEOF_INVALID_TYPE` | ❌ Unimplemented | - | Medium | |
| `INVALID_INTERFACE` | ✅ Implemented | `InterfaceHierarchyValidator` | High | |
| `INVALID_JAVA_EXPRESSION` | ⛔ Outside of Org | - | Low | Requires org + Java class resolution |
| `INVALID_JAVA_EXPRESSION_CLASS_NOT_FOUND` | ⛔ Outside of Org | - | Low | Requires org + Java class resolution |
| `INVALID_JAVA_EXPRESSION_FIELD_NOT_FOUND` | ⛔ Outside of Org | - | Low | Requires org + Java class resolution |
| `INVALID_JAVA_EXPRESSION_METHOD_NOT_FOUND` | ⛔ Outside of Org | - | Low | Requires org + Java class resolution |
| `INVALID_JAVA_EXPRESSION_METHOD_NOT_STATIC` | ⛔ Outside of Org | - | Low | Requires org + Java class resolution |
| `INVALID_KEYWORD_IDENTIFIER` | ✅ Implemented | - | High | |
| `INVALID_LIST_INDEX_TYPE` | ✅ Implemented | - | High | |
| `INVALID_LIST_INITIAL_EXPRESSION_TYPE` | ❌ Unimplemented | - | High | |
| `INVALID_LIST_INITIALIZER` | ✅ Implemented | `CollectionValidator` | High | |
| `INVALID_LIST_TYPE` | ❌ Unimplemented | - | High | |
| `INVALID_LOGICAL_TYPE` | ❌ Unimplemented | - | High | |
| `INVALID_LOOP_TYPE` | ❌ Unimplemented | - | High | |
| `INVALID_MAP_INITIALIZER` | ✅ Implemented | `CollectionValidator` | High | |
| `INVALID_MAP_PUTALL` | ❌ Unimplemented | - | High | |
| `INVALID_MERGE_DUPLICATE_RECORDS` | ✅ Implemented | `DmlStatementValidator` | High | |
| `INVALID_METADATA_TOO_LARGE` | ❌ Unimplemented | - | Medium | |
| `INVALID_METHOD_NOT_FOUND` | ✅ Implemented | `MethodResolutionValidator` | High | |
| `INVALID_METHOD_WITH_PARAMETERS` | ✅ Implemented | `MethodModifierRestrictionValidator` | High | |
| `INVALID_MULTIPLE_METHODS_WITH_MODIFIER` | ✅ Implemented | `MethodModifierRestrictionValidator` | High | |
| `INVALID_NAME_VALUE_PAIR_CONSTRUCTOR` | ✅ Implemented | `DuplicateFieldInitValidator` | Medium | Name-value pairs only for SObjects |
| `INVALID_NEGATE_PREFIX_OPERAND` | ❌ Unimplemented | - | High | |
| `INVALID_NEW_ABSTRACT` | ✅ Implemented | `MethodCallValidator` | High | |
| `INVALID_NEW_PROTECTED_METHOD` | ✅ Implemented | `MethodCallValidator`, `MethodModifierRestrictionValidator` | High | |
| `INVALID_NON_STATIC_METHOD_CONTEXT` | ✅ Implemented | `StaticContextValidator` | Medium | |
| `INVALID_NON_STATIC_VARIABLE_CONTEXT` | ✅ Implemented | `StaticContextValidator` | Medium | |
| `INVALID_NORMAL_CONSTRUCTOR` | ✅ Implemented | `ConstructorValidator` | High | |
| `INVALID_NUMBER_PARAMETERS` | ✅ Implemented | `ParameterLimitValidator` | High | |
| `INVALID_NUMERIC_ARGUMENTS_EXPRESSION` | ✅ Implemented | `ExpressionValidator` | High | |
| `INVALID_NUMERIC_POSTFIX_OPERAND` | ❌ Unimplemented | - | High | |
| `INVALID_NUMERIC_PREFIX_DECREMENT` | ❌ Unimplemented | - | High | |
| `INVALID_NUMERIC_PREFIX_INCREMENT` | ❌ Unimplemented | - | High | |
| `INVALID_PARAMETERIZED_TYPE` | ❌ Unimplemented | - | Medium | |
| `INVALID_PARAMETERIZED_TYPE_COUNT` | ❌ Unimplemented | - | Medium | |
| `INVALID_PUBLIC_REMOTE_ACTION` | ✅ Implemented | `DuplicateAnnotationMethodValidator` | High | |
| `INVALID_READ_ONLY` | ✅ Implemented | `ModifierValidator` | Medium | |
| `INVALID_RESERVED_NAME_IDENTIFIER` | ✅ Implemented | - | High | |
| `INVALID_RESERVED_TYPE_IDENTIFIER` | ✅ Implemented | - | High | |
| `INVALID_RETURN_FROM_NON_METHOD` | ✅ Implemented | `ControlFlowValidator` | High | |
| `INVALID_RETURN_NON_VOID` | ✅ Implemented | `ReturnStatementValidator` | High | |
| `INVALID_RETURN_VOID` | ✅ Implemented | `ReturnStatementValidator` | High | |
| `INVALID_ROW_LOCK` | ⚠️ Requires Schema/Metadata | - | High | Requires schema to validate row lock syntax |
| `INVALID_RUNAS` | ✅ Implemented | `RunAsStatementValidator` | High | |
| `INVALID_SET_INITIAL_EXPRESSION_TYPE` | ❌ Unimplemented | - | High | |
| `INVALID_SET_INITIALIZER` | ✅ Implemented | `CollectionValidator` | High | |
| `INVALID_SHIFT_OPERATOR_ARGUMENTS` | ❌ Unimplemented | - | High | |
| `INVALID_SOBJECT_LIST` | ❌ Unimplemented | - | High | |
| `INVALID_SOBJECT_MAP` | ❌ Unimplemented | - | High | |
| `INVALID_STATIC_METHOD_CONTEXT` | ✅ Implemented | `StaticContextValidator` | Medium | |
| `INVALID_STATIC_VARIABLE_CONTEXT` | ✅ Implemented | `StaticContextValidator` | Medium | |
| `INVALID_STRING_LITERAL_ILLEGAL_CHARACTER_SEQUENCE` | ✅ Implemented | `LiteralValidator` | Low | |
| `INVALID_STRING_LITERAL_ILLEGAL_LAST_CHARACTER` | ✅ Implemented | `LiteralValidator` | Low | |
| `INVALID_STRING_LITERAL_ILLEGAL_LINEBREAKS` | ✅ Implemented | `LiteralValidator` | Low | |
| `INVALID_STRING_LITERAL_ILLEGAL_UNICODE` | ✅ Implemented | `LiteralValidator` | Low | |
| `INVALID_STRING_LITERAL_ILLEGAL_UNICODE_SEQUENCE` | ✅ Implemented | `LiteralValidator` | Low | |
| `INVALID_SUPER_CALL` | ✅ Implemented | `ConstructorValidator` | High | |
| `INVALID_SUPER_STATIC_CONTEXT` | ✅ Implemented | `StaticContextValidator` | Medium | |
| `INVALID_SUPER_TYPE` | ✅ Implemented | `ClassHierarchyValidator` | High | |
| `INVALID_SWITCH_ENUM` | ✅ Implemented | `SwitchStatementValidator` | High | |
| `INVALID_THIS_CALL` | ✅ Implemented | `ConstructorValidator` | High | |
| `INVALID_THIS_STATIC_CONTEXT` | ✅ Implemented | `StaticContextValidator` | Medium | |
| `INVALID_THROW_EXCEPTION` | ✅ Implemented | `ExceptionValidator` | High | |
| `INVALID_TIME` | ✅ Implemented | `ApexErrorListener` | Low | Lexer error mapping |
| `INVALID_TIME_OPERAND_EXPRESSION` | ✅ Implemented | `ExpressionValidator` | Low | |
| `INVALID_TRIGGER_BEFORE_UNDELETE` | ❌ Unimplemented | - | Medium | |
| `INVALID_TRIGGER_OBJECT` | ❌ Unimplemented | - | Medium | |
| `INVALID_TRIGGER_PLATFORM_EVENT` | ❌ Unimplemented | - | Medium | |
| `INVALID_TRIGGER_RETURN` | ✅ Implemented | `ReturnStatementValidator` | High | |
| `INVALID_TRY_NEEDS_CATCH_OR_FINALLY` | ✅ Implemented | `TryCatchFinallyValidator` | High | |
| `INVALID_TYPE_BITWISE_NEGATE` | ✅ Implemented | `ExpressionValidator` | Medium | |
| `INVALID_UNIT` | ⛔ Deferred | - | Low | Out of scope: placeholder for invalid compilation |
| `INVALID_UNRESOLVED_ANNOTATION` | ✅ Implemented | `UnknownAnnotationValidator` | Medium | |
| `INVALID_UNRESOLVED_TYPE` | ✅ Implemented | `TypeResolutionValidator` | Medium | |
| `INVALID_VOID_ARITHMETIC_EXPRESSION` | ✅ Implemented | `ExpressionValidator` | High | |
| `INVALID_VOID_PARAMETER` | ✅ Implemented | `ExpressionTypeValidator` | High | |
| `INVALID_VOID_PROPERTY` | ✅ Implemented | `ExpressionTypeValidator` | High | |
| `INVALID_VOID_VARIABLE` | ✅ Implemented | `ExpressionTypeValidator` | High | |
| `INVALID_WHEN_EXPRESSION_TYPE` | ✅ Implemented | `SwitchStatementValidator` | High | |
| `INVALID_WHEN_FIELD_CONSTANT` | ✅ Implemented | `SwitchStatementValidator` | High | |
| `INVALID_WHEN_FIELD_LITERAL` | ✅ Implemented | `SwitchStatementValidator` | High | |
| `INVALID_WHEN_LITERAL_EXPRESSION` | ✅ Implemented | `SwitchStatementValidator` | High | |
| `INVOCABLE_METHOD_CAN_ONLY_HAVE_DEPRECATED` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `INVOCABLE_METHOD_NON_LIST_PARAMETER` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `INVOCABLE_METHOD_SINGLE_PARAM` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `LOCAL_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `LOOP_MUST_ITERATE_OVER_COLLECTION` | ✅ Implemented | - | High | |
| `LOOP_VARIABLE_MISMATCH_CONCRETE_SOBJECT_TYPE` | ⚠️ Implemented | `ExpressionValidator` | High | Partial |
| `LOOP_VARIABLE_MISMATCH_SOBJECT_TYPE` | ✅ Implemented | `ExpressionValidator` | High | |
| `LOOP_WITH_QUERY_REQUIRES_STATEMENT` | ✅ Implemented | `DmlLoopQueryValidator` | High | |
| `MAX_ENUMS_EXCEEDED` | ✅ Implemented | `EnumLimitValidator` | High | |
| `MAXIMUM_TYPE_DEPTH_EXCEEDED` | ✅ Implemented | `ParameterizedTypeValidator` | Medium | |
| `MERGE_NOT_SUPPORTED` | ⚠️ Requires Schema/Metadata | - | High | Requires platform metadata to determine if merge is supported for SObject type |
| `MERGE_REQUIRES_CONCRETE_TYPE` | ✅ Implemented | `DmlStatementValidator` | High | |
| `METHOD_ALREADY_EXISTS` | ✅ Implemented | `DuplicateMethodValidator` | High | |
| `METHOD_DOES_NOT_OVERRIDE` | ✅ Implemented | `MethodOverrideValidator` | High | |
| `METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE` | ✅ Implemented | `MethodResolutionValidator` | High | |
| `METHOD_DOES_NOT_SUPPORT_RETURN_TYPE` | ✅ Implemented | `MethodResolutionValidator` | High | |
| `METHOD_INVALID_ADD_ERROR_NOT_SOBJECT_FIELD` | ✅ Implemented | `MethodCallValidator` | Medium | |
| `METHOD_INVALID_ADD_ERROR_NOT_SOBJECT_SCALAR_FIELD` | ⚠️ Requires Schema/Metadata | - | Medium | Requires SObject schema to validate field exists and is scalar |
| `METHOD_INVALID_ON_SOBJECT_FIELD` | ❌ Unimplemented | - | Medium | |
| `METHOD_INVALID_SOBJECT_LIST` | ❌ Unimplemented | - | Medium | |
| `METHOD_INVALID_SOBJECT_MAP` | ❌ Unimplemented | - | Medium | |
| `METHOD_MUST_HAVE_BODY` | ✅ Implemented | - | High | |
| `METHOD_NOT_VISIBLE` | ✅ Implemented | `MethodResolutionValidator` | High | |
| `METHOD_ONLY_LIST_CUSTOM_SETTINGS` | ⚠️ Requires Schema/Metadata | - | Medium | Requires custom settings metadata to determine if type is List custom settings |
| `METHOD_PARAMETER_TYPE_NOT_VISIBLE` | ✅ Implemented | `TypeVisibilityValidator` | High | |
| `METHOD_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `METHOD_RETURN_TYPE_NOT_VISIBLE` | ✅ Implemented | `TypeVisibilityValidator` | High | |
| `METHOD_SIGNATURE_MISMATCH` | ✅ Implemented | `MethodSignatureEquivalenceValidator` | High | |
| `METHOD_TYPES_CLASH` | ✅ Implemented | `MethodTypeClashValidator` | Medium | |
| `METHODS_MUST_OVERRIDE` | ✅ Implemented | `MethodOverrideValidator` | High | |
| `MISMATCHED_SYNTAX` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR parser |
| `MISSING_CLOSING_MARK` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR lexer |
| `MISSING_CLOSING_QUOTE` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR lexer |
| `MISSING_SYNTAX` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR parser |
| `MODIFIER_CANNOT_BE` | ✅ Implemented | `ModifierValidator` | High | |
| `MODIFIER_ILLEGAL_DEFINING_TYPE` | ✅ Implemented | `ModifierValidator` | Medium | |
| `MODIFIER_ILLEGAL_DEFINING_TYPE_FOR` | ✅ Implemented | `ModifierValidator` | Medium | |
| `MODIFIER_IS_BY_DEFAULT` | ✅ Implemented | `ModifierValidator` | Medium | |
| `MODIFIER_IS_INTERNAL` | ⛔ Deferred | - | Medium | Requires org isTrusted |
| `MODIFIER_IS_NOT_ALLOWED` | ✅ Implemented | `ModifierValidator` | High | |
| `MODIFIER_MIN_VERSION` | ✅ Implemented | `ModifierValidator` | Medium | |
| `MODIFIER_NOT_IN_TOP_LEVEL_TYPE` | ✅ Implemented | `ModifierValidator` | High | |
| `MODIFIER_NOT_ON_TOP_LEVEL_TYPE` | ✅ Implemented | `ModifierValidator` | Medium | |
| `MODIFIER_REQUIRE_AT_LEAST` | ✅ Implemented | `ModifierValidator` | Medium | |
| `MODIFIER_REQUIRES` | ✅ Implemented | `ModifierValidator` | High | |
| `NEW_INNER_TYPE_NAME_CONFLICT_INTERFACE` | ✅ Implemented | `NewExpressionValidator` | Medium | |
| `NEW_INNER_TYPE_NAME_CONFLICT_OUTER` | ✅ Implemented | `NewExpressionValidator` | Medium | |
| `NEW_INNER_TYPE_NAME_CONFLICT_SUPER_TYPE` | ✅ Implemented | `NewExpressionValidator` | Medium | |
| `NEW_NAME_CANNOT_END_EXCEPTION` | ✅ Implemented | `NewExpressionValidator` | Low | |
| `NEW_NAME_CONFLICT_INNER` | ✅ Implemented | `NewExpressionValidator` | Medium | |
| `NEW_NAME_CONFLICT_LOCAL` | ✅ Implemented | `NewExpressionValidator` | Medium | |
| `NEW_NAME_INVALID_EXCEPTION` | ✅ Implemented | `NewExpressionValidator` | Low | |
| `NEW_NAME_MEMBER_CONFLICT` | ✅ Implemented | `NewExpressionValidator` | Medium | |
| `NO_SUPER_TYPE` | ✅ Implemented | - | High | |
| `NO_TYPE_ARGUMENTS_FOR_PARAMETERIZED_TYPE` | ❌ Unimplemented | - | Medium | |
| `NON_STATIC_AURA_METHOD_CANNOT_HAVE_PARAMS` | ✅ Implemented | `AuraEnabledValidator` | High | |
| `NON_STATIC_AURA_METHOD_MUST_BEGIN_WITH_GET` | ✅ Implemented | `AuraEnabledValidator` | High | |
| `NON_VIRTUAL_METHODS_CANNOT_OVERRIDE` | ✅ Implemented | `MethodOverrideValidator` | High | |
| `NOT_UNIQUE_WHEN_VALUE_OR_TYPE` | ✅ Implemented | `SwitchStatementValidator` | High | |
| `NOT_VISIBLE_MAX_VERSION` | ✅ Implemented | `TypeVisibilityValidator` | Medium | |
| `NOT_VISIBLE_MIN_VERSION` | ✅ Implemented | `TypeVisibilityValidator` | Medium | |
| `PACKAGE_VERSION_FORBIDDEN` | ❌ Unimplemented | - | Low | |
| `PACKAGE_VERSION_INVALID` | ❌ Unimplemented | - | Low | |
| `PACKAGE_VERSION_REQUIRES_NAMESPACE` | ❌ Unimplemented | - | Low | |
| `PAGE_DOES_NOT_EXIST` | ⛔ Outside of Org | - | Low | Requires org metadata |
| `PARALLEL_TEST_CLASS_CANNOT_HAVE_SEE_ALL_DATA` | ❌ Unimplemented | - | Medium | Similar to implemented PARALLEL_TEST_METHOD_CANNOT_HAVE_SEE_ALL_DATA |
| `PARALLEL_TEST_METHOD_CANNOT_HAVE_SEE_ALL_DATA` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `PARAMETER_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `PARAMETERIZED_TYPE_TOO_DEEP` | ❌ Unimplemented | - | Medium | |
| `PROPERTY_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `QUERY_TOO_LARGE` | ❌ Deferred | - | High | |
| `REAL_LOC` | ⚠️ Formatting | - | Low | Location formatting, not validation error |
| `REST_RESOURCE_URL_EMPTY` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `REST_RESOURCE_URL_ILLEGAL_WILDCARD_PREDECESSOR` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `REST_RESOURCE_URL_ILLEGAL_WILDCARD_SUCCESSOR` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `REST_RESOURCE_URL_INVALID_URL` | ✅ Implemented | `AnnotationPropertyValidator` | Medium | |
| `REST_RESOURCE_URL_NO_SLASH` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `REST_RESOURCE_URL_TOO_LONG` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `SAFE_NAVIGATION_INVALID_BETWEEN_SOBJECT_FIELD_AND_ADD_ERROR` | ✅ Implemented | `MethodCallValidator` | Medium | |
| `SAFE_NAVIGATION_INVALID_BETWEEN_SOBJECT_FIELD_AND_METHOD` | ✅ Implemented | `MethodCallValidator` | Medium | |
| `SCRIPT_TOO_LARGE` | ✅ Implemented | `SourceSizeValidator` | High | |
| `SOBJECT_NOT_CONSTRUCTABLE` | ✅ Implemented | `MethodCallValidator` | Medium | |
| `SOURCE_FILE_TOO_LARGE` | ✅ Implemented | `SourceSizeValidator` | High | |
| `SYNTHETIC_LOC` | ⚠️ Formatting | - | Low | Location formatting, not validation error |
| `TEST_CLASS_MUST_NOT_BE_EXCEPTION` | ✅ Implemented | `TestMethodValidator` | High | |
| `TEST_METHOD_CANNOT_HAVE_PARAMS` | ✅ Implemented | `TestMethodValidator` | High | |
| `TEST_SETUP_CANNOT_HAVE_DEFINING_TYPE_SEE_ALL_DATA` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `TEST_SETUP_CANNOT_HAVE_PARAMS` | ✅ Implemented | `TestMethodValidator` | High | |
| `TEST_SETUP_CANNOT_HAVE_SEE_ALL_DATA` | ✅ Implemented | `AnnotationPropertyValidator` | High | |
| `TEST_SETUP_MUST_RETURN_VOID` | ✅ Implemented | `TestMethodValidator` | High | |
| `TIME_STRING` | ❌ Unimplemented | - | Low | |
| `TOPLEVEL_MUST_BE_PUBLIC_OR_GLOBAL` | ✅ Implemented | `ModifierValidator` | Medium | Top-level types need public/global/@isTest |
| `TRIGGER_NOT_SUPPORTED` | ❌ Unimplemented | - | Medium | |
| `TRIGGER_PLURAL` | ❌ Unimplemented | - | Low | Plural form, likely not needed |
| `TYPE_ARGUMENTS_FOR_NON_PARAMETERIZED_TYPE` | ❌ Unimplemented | - | Medium | |
| `TYPE_ASSIGNMENT_MISMATCH` | ✅ Implemented | `TypeAssignmentValidator` | High | |
| `TYPE_MUST_BE_TOP_LEVEL` | ✅ Implemented | `ModifierValidator` | Medium | Inner class cannot implement Batchable/InboundEmailHandler |
| `TYPE_NOT_CONSTRUCTABLE` | ✅ Implemented | `MethodCallValidator` | Medium | |
| `TYPE_NOT_VISIBLE` | ✅ Implemented | `TypeVisibilityValidator` | High | |
| `TYPE_PARAMETERS_NOT_SUPPORTED` | ❌ Unimplemented | - | Medium | |
| `UNEXPECTED_EOF` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR parser |
| `UNEXPECTED_ERROR` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR parser |
| `UNEXPECTED_SYMBOL_EXPECTED_FOUND` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR parser |
| `UNEXPECTED_SYMBOL_NOT_SET` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR parser |
| `UNEXPECTED_SYMBOL_RANGE` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR parser |
| `UNEXPECTED_SYMBOL_SET` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR parser |
| `UNEXPECTED_SYNTAX_ERROR` | ✅ Reportable | `ApexErrorListener` | Low | Fallback for unmapped ANTLR errors |
| `UNEXPECTED_TOKEN` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR parser |
| `UNKNOWN_CONSTRUCTOR` | ✅ Implemented | - | High | |
| `UNMATCHED_SYNTAX` | ✅ Reportable | `ApexErrorListener` | Low | Mapped from ANTLR parser |
| `UNREACHABLE_STATEMENT` | ✅ Implemented | `UnreachableStatementValidator` | High | |
| `UNRECOGNIZED_SYMBOL_NOT_VALID_APEX_IDENTIFIER` | ✅ Implemented | `ApexErrorListener` | Medium | Lexer error mapping |
| `UPSERT_INVALID_FIELD` | ⚠️ Requires Schema/Metadata | - | High | Requires SObject schema to validate External Id field exists and is marked as External Id |
| `UPSERT_REQUIRES_CONCRETE_TYPE` | ✅ Implemented | `DmlStatementValidator` | High | |
| `USEREPLICA_PREFERRED_MUST_BE_STATIC` | ✅ Implemented | `ModifierValidator` | Medium | |
| `VARIABLE_DOES_NOT_EXIST` | ✅ Implemented | `VariableResolutionValidator` | High | |
| `VARIABLE_NOT_VISIBLE` | ✅ Implemented | `VariableResolutionValidator` | High | |
| `VARIABLE_SHADOWING` | ✅ Implemented | `VariableShadowingValidator` | High | |
| `WEBSERVICE_DEPRECATE_IF_TYPE_DEPRECATED` | ✅ Implemented | `DeprecationValidator` | Medium | |
| `WHEN_CLAUSE_LITERAL_OR_VALID_CONSTANT` | ✅ Implemented | `SwitchStatementValidator` | High | |
| `WHEN_ELSE_NOT_LAST` | ✅ Implemented | `SwitchStatementValidator` | High | |

## Implementation Priorities

### High Priority (Common Language Features)
1. **Expression Type Validation** - Many expression type errors are unimplemented (20 error codes)
2. **Collection Operations** - List/Set/Map type checking and operations (5 error codes)
3. **DML Operations** - Enhanced DML validation beyond basic checks (9 error codes)
4. **Method Resolution** - Additional method visibility and parameter validation (1 error code)
5. **Constructor Validation** - Enhanced constructor validation (3 error codes)
6. ~~**Switch Statement Enhancements** - Additional when clause validation (8 error codes)~~ - Complete
7. ~~**Bitwise Operations** - Bitwise negate operator validation (1 error code)~~ - Complete
8. ~~**Method Types and Clashes** - Method signature clash detection (2 error codes)~~ - Complete
9. ~~**Property Accessors** - Final property accessor validation (1 error code)~~ - Complete

### Medium Priority (Type System)
1. ~~**Type Resolution** - Unresolved type detection (2 error codes)~~ - Complete (TypeResolutionValidator)
2. ~~**Static Context** - Static/non-static context validation (6 error codes)~~ - Complete (StaticContextValidator)
3. ~~**Inner Types** - Inner class validation (8 error codes)~~ - Complete (InnerTypeValidator, NewExpressionValidator)
4. **Parameterized Types** - Generic type validation (7 error codes)

### Lower Priority (Advanced Features)
1. **Annotation Enhancements** - Org-specific and permission validation (6 error codes)
2. **Java Integration** - Java expression validation (6 error codes); cannot be done outside of the org
3. **Namespace Features** - Custom metadata and settings visibility (6 error codes)
4. **String Literals** - Enhanced string literal validation (15 error codes)

## Notes

- **Coverage Calculation**: Based on actual `ErrorCodes.` usage in validator source files
- **Lint (2026-02-10)**: Resolved unused variables/imports in CollectionValidator, ConstructorValidator, DmlLoopQueryValidator, InterfaceHierarchyValidator, MethodModifierRestrictionValidator
- **Syntax Errors**: Many error codes are for syntax errors handled by the parser, not semantic validators
- **Plural Forms**: 12 error codes are plural forms likely not needed for validation logic

### Org Involvement Categories

Validations are categorized based on their requirements for org connection and metadata:

1. **⛔ Outside of Org (13 codes)**: Require runtime org connection and org-specific metadata that cannot be statically determined:
   - **Java Integration (6)**: Require `isTrusted()` org permission check (via `CodeUnitDetails.isTrusted()`) + Java class resolution at runtime
   - **Annotation/perm (2)**: Require org metadata to validate annotation support/enablement and permission names exist
   - **Namespace visibility (2)**: Require org metadata to determine custom metadata/settings namespace visibility
   - **External resources (2)**: Require org metadata to validate external strings/pages exist
   - **Foreign key (1)**: Require org schema to validate foreign key relationships
   
   These cannot be implemented in a typical LSP context without an active org connection.

2. **⚠️ Requires Schema/Metadata (10+ codes)**: Could potentially be implemented if schema/metadata is available, but currently stubbed due to missing metadata infrastructure:
   
   **SObject-Level Metadata** (from `Schema.DescribeSObjectResult` or SObject stub classes):
   - `isMergeable()` - Whether SObject supports merge operation
     - **Available From**: Not in stub classes; requires Tooling API or metadata files
   - `isCustomSetting()` - Whether SObject is a custom setting
     - **Available From**: Not in stub classes; requires Tooling API or metadata files (check `customSettingsType` field in `.object-meta.xml`)
   - `customSettingsType` - "Hierarchy" vs "List" for custom settings
     - **Available From**: Metadata XML files (`.object-meta.xml` has `<customSettingsType>Hierarchy</customSettingsType>` or `<customSettingsType>List</customSettingsType>`)
   - SObject type existence - Validate SObject exists
     - **Available From**: ✅ SObject stub classes (`.sfdx/tools/sobjects/standardObjects/*.cls` files)
   - Platform Event identification - Determine if SObject is a Platform Event type
     - **Available From**: ✅ SObject stub classes (Platform Events end with `ChangeEvent` suffix, e.g., `WorkTypeChangeEvent.cls`)
   
   **Field-Level Metadata** (from `Schema.DescribeFieldResult` or field stubs in SObject classes):
   - `isExternalId()` - Whether field is marked as External Id
     - **Available From**: Not in stub classes; requires Tooling API or metadata files (`.field-meta.xml` has `<externalId>true</externalId>`)
   - `type` / `getType()` - Field data type (`Schema.DisplayType`)
     - **Available From**: ✅ Partially available from stub classes (field declarations show types like `String`, `Id`, `Integer`, `Decimal`, `Boolean`, `Date`, `Datetime`, but not full `Schema.DisplayType` enum)
   - Field existence - Validate field exists on SObject
     - **Available From**: ✅ SObject stub classes (field declarations in stub classes, e.g., `global String Name;`, `global Id AccountId;`)
   - Field category - Regular, Relationship, Formula, Rollup Summary, Variable
     - **Available From**: Partially inferrable from stub classes (relationship fields have relationship type, but Formula/Rollup Summary not visible)
   - Scalar vs collection - Whether field is scalar (not a collection)
     - **Available From**: ✅ SObject stub classes (scalar fields: `global String Name;`, collection fields: `global List<Account> ChildAccounts;`)
   
   **Platform Metadata**:
   - Platform capabilities - What operations are supported (merge, triggers, etc.)
   - Data category metadata - For `EXPORT_DATA_CATEGORY` validation
   
   **Package Metadata** (from `package.xml` or metadata files):
   - Package version information - For version-specific visibility checks
   - "Added since" version - When type/field was introduced (not available from `@Deprecated`)
   
   **Note**: SObject stub classes (generated in `.sfdx/tools/sobjects/standardObjects/*.cls`) provide:
   - ✅ SObject type existence (class name = SObject type)
   - ✅ Field existence (field declarations in stub classes)
   - ✅ Field types (basic Apex types: `String`, `Id`, `Integer`, `Decimal`, `Boolean`, `Date`, `Datetime`, etc.)
   - ✅ Scalar vs collection fields (scalar: `global String Name;`, collection: `global List<Account> ChildAccounts;`)
   - ✅ Platform Event identification (classes ending with `ChangeEvent` suffix)
   - ✅ Relationship fields (fields with relationship type, e.g., `global Account Account;`)
   
   **Missing from stub classes** (requires Tooling API or metadata files):
   - ❌ `isMergeable()` - Not in stub classes
   - ❌ `isCustomSetting()` / `customSettingsType` - Not in stub classes (available in `.object-meta.xml`)
   - ❌ `isExternalId()` - Not in stub classes (available in `.field-meta.xml`)
   - ❌ Full `Schema.DisplayType` enum - Stub classes only show Apex types, not full schema types
   - ❌ Field category details (Formula, Rollup Summary) - Not visible in stub classes
   
   These differ from "Outside of Org" because they *could* work with static metadata files or Tooling API access, but are not currently implemented due to missing infrastructure.

3. **❌ Unimplemented**: Can be implemented using only AST and symbol table information without org connection or metadata.

- **Regeneration**: Run `node scripts/check-error-code-coverage.mjs` to regenerate coverage analysis
- **Pending Discovery (⏳)**: Error codes marked as pending discovery require additional research before implementation—e.g., unclear validation rules, missing infrastructure (org/package metadata), undefined scope, or grammar/semantics that need clarification. These are not simply unimplemented; they await discovery of how to handle the validation correctly.

## How to Update This Document

1. Run the error code coverage script: `node scripts/check-error-code-coverage.mjs`
2. Update statistics in the Overview section
3. Update the Error Code Implementation Table based on new validator implementations
4. Update the Missing Validations section as new validations are implemented
5. Update the Progress Tracking section with recent achievements
