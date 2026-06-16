---
name: Annotation Validation Improvements
overview: Improve annotation property validation coverage by implementing missing format and validation checks
todos:
  - id: testfor-format-validation
    content: 'Implement testFor format validation (invalid prefix, empty suffix) - TIER 1, high value, easy'
    status: completed
  - id: format-validation
    content: 'Implement format validation for URLs, static resources, LWC names - TIER 1, medium value, medium'
    status: completed
  - id: numeric-comparisons
    content: 'Implement numeric comparison validations (greater/less than or equal) - TIER 1, medium value, easy'
    status: completed
  - id: string-value-validation
    content: 'Implement bad string value validation - TIER 1, medium value, easy'
    status: completed
  - id: sibling-target-validation
    content: 'Implement sibling property and target-specific validation - TIER 1, medium value, medium'
    status: completed
isProject: false
---

# Annotation Validation Improvements Plan

## Overview

This plan tracks improvements to annotation property validation beyond the basic validations already implemented. Focus is on TIER 1 (same-file) validations that provide immediate value.

## Current Status

### ✅ Implemented
- Basic property validation (missing, unsupported, empty, duplicates)
- Type and value validation (type mismatch, enum/range validation)
- Version-specific validation (min/max API version)
- Cross-file type resolution for testFor (TIER 2)
- REST resource URL validation
- @JsonAccess validation

### ✅ Completed
- testFor format validation (invalid prefix, empty suffix)
- Format validation for LWC names (configurationEditor) and static resource names (iconName)
- Numeric comparison validations (>= and <= operators)
- String value validation (invalid string value blacklist)
- Sibling and target-specific validation (invalid property combinations and target restrictions)

## Implementation Details

### Phase 1: testFor Format Validation (In Progress)

**Error Codes:**
- `ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX` - Invalid prefix (not "ApexClass:" or "ApexTrigger:")
- `ANNOTATION_PROPERTY_TESTFOR_EMPTY_SUFFIX` - Empty type name after colon

**Implementation:**
- Enhance `parseTestForValue()` to return validation errors
- Add TIER 1 validation before TIER 2 type resolution
- Validate format: "ApexClass:ClassName" or "ApexTrigger:TriggerName"

**Examples:**
- `@isTest(testFor='InvalidPrefix:MyClass')` → ANNOTATION_PROPERTY_TESTFOR_INVALID_PREFIX
- `@isTest(testFor='ApexClass:')` → ANNOTATION_PROPERTY_TESTFOR_EMPTY_SUFFIX
- `@isTest(testFor='ApexClass:MyClass')` → Valid format

### Phase 2: Format Validation (Completed)

**Error Codes:**
- `ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME` - Invalid LWC name format
- `ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME` - Invalid static resource name format
- `ANNOTATION_PROPERTY_INVALID_FORMAT` - Generic invalid format for property value

**Implementation:**
- Added `propertyFormatValidators` map to `AnnotationPropertyInfo` interface
- Implemented `validateLWCName()` - validates camelCase format (starts with lowercase, alphanumeric only)
- Implemented `validateStaticResourceName()` - validates alphanumeric + underscore format (starts with letter/underscore)
- Integrated format validation into all three validation loops (classes, methods, fields/properties)
- Format validation runs after type validation but before version checks

**Examples:**
- `@InvocableMethod(configurationEditor='MyComponent')` → ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME (starts with uppercase)
- `@InvocableMethod(configurationEditor='my-component')` → ANNOTATION_PROPERTY_INVALID_LIGHTNING_WEB_COMPONENT_NAME (contains hyphen)
- `@InvocableMethod(iconName='my-icon')` → ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME (contains hyphen)
- `@InvocableMethod(iconName='123resource')` → ANNOTATION_PROPERTY_INVALID_STATIC_RESOURCE_NAME (starts with number)
- `@InvocableMethod(configurationEditor='myComponent')` → Valid
- `@InvocableMethod(iconName='MyResource')` → Valid

### Phase 3: Numeric Comparisons (Completed)

**Error Codes:**
- `ANNOTATION_PROPERTY_GREATER_THAN_OR_EQUAL` - Numeric >= comparison
- `ANNOTATION_PROPERTY_LESS_THAN_OR_EQUAL` - Numeric <= comparison

**Implementation:**
- Added `NumericComparison` interface with `operator` ('>=' | '<=') and `value`
- Added `propertyNumericComparisons` map to `AnnotationPropertyInfo` interface
- Integrated numeric comparison validation into all three validation loops
- Validation runs after format validation but before version checks
- Supports standalone >= or <= checks (complements `propertyIntegerRanges`)

**Examples:**
- `propertyNumericComparisons: new CaseInsensitiveHashMap<NumericComparison>([['delay', { operator: '>=', value: 0 }]])`
- Validates numeric properties against comparison constraints

### Phase 4: String Value Validation (Completed)

**Error Code:**
- `ANNOTATION_PROPERTY_BAD_STRING_VALUE` - Unknown/invalid string value

**Implementation:**
- Added `propertyInvalidStringValues` map to `AnnotationPropertyInfo` interface
- Blacklist of invalid string values (case-insensitive comparison)
- Integrated into all three validation loops
- Runs before format validation to catch explicitly invalid values early

**Examples:**
- `propertyInvalidStringValues: new CaseInsensitiveHashMap<string[]>([['category', ['invalid1', 'invalid2']]])`
- Rejects specific string values that are known to be invalid

### Phase 5: Sibling and Target Validation (Completed)

**Error Codes:**
- `ANNOTATION_PROPERTY_SIBLING_INVALID_VALUE` - Invalid combination of properties
- `ANNOTATION_PROPERTY_IS_NOT_ALLOWED` - Property not allowed on target
- `ANNOTATION_PROPERTY_NOT_SUPPORTED_FOR_TYPE` - Property not supported for type

**Implementation:**
- Added `propertySiblingRestrictions` - Array of [property1, property2] pairs that cannot be used together
- Added `propertyAllowedTargets` - Map of properties to allowed SymbolKind values
- Integrated sibling and target validation into all three validation loops (classes, methods, fields/properties)
- Sibling validation checks for invalid property combinations
- Target validation checks if properties are allowed on the current symbol kind (Class, Method, Field, Property)

**Examples:**
- `propertySiblingRestrictions: [['property1', 'property2']]` - Cannot use both together
- `propertyAllowedTargets: new CaseInsensitiveHashMap<SymbolKind[]>([['someProperty', [SymbolKind.Method]]])` - Only allowed on methods
