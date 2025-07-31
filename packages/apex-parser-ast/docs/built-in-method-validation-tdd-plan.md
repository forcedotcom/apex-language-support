# Built-in Method Validation TDD Plan (Phase 4)

## Overview

This document outlines the Test-Driven Development (TDD) plan for implementing built-in method validation in the apex-parser-ast package. This phase focuses on validating method calls to built-in Apex methods and SObject operations, following the rules defined in the apex-jorje-semantic module.

## Phase 4 Objectives

### Primary Goals

- Implement validation for built-in method calls
- Validate SObject field operations and restrictions
- Ensure type compatibility for method parameters
- Provide comprehensive error reporting for invalid method usage

### Success Criteria

- All built-in method validation rules from apex-jorje-semantic implemented
- Comprehensive test coverage (90%+)
- Integration with existing validation infrastructure
- Performance within acceptable limits (< 50ms per method call)

## Implementation Plan

### Step 1: AddError Method Validation ✅

**Objective**: Implement validation for the `addError()` method on SObject fields

**Rules to Implement**:

- Can only be called on direct SObject field references to scalar fields
- Cannot be called on SOQL expressions
- Cannot be called on non-regular SObject fields
- Cannot be called after safe navigation operator

**Error Messages**:

- `"method.invalid.add.error.not.sobject.field"`
- `"method.invalid.add.error.not.sobject.scalar.field"`
- `"safe.navigation.invalid.between.sobject.field.and.add.error"`

**Test Cases**:

1. Valid addError calls on SObject scalar fields
2. Invalid addError calls on SOQL expressions
3. Invalid addError calls on relationship fields
4. Invalid addError calls on formula fields
5. Invalid addError calls after safe navigation operator
6. Invalid addError calls on non-SObject fields

**Files to Create**:

- `src/semantics/validation/AddErrorMethodValidator.ts`
- `test/semantics/validation/AddErrorMethodValidator.test.ts`

### Step 2: Decimal to Double Conversion Validation ✅

**Objective**: Implement validation for Decimal to Double conversions in List/Map operations

**Rules to Implement**:

- Allows Decimal to Double conversion in List/Map operations
- Validates parameter type compatibility

**Test Cases**:

1. Valid Decimal to Double conversions in List operations
2. Valid Decimal to Double conversions in Map operations
3. Invalid conversions in other contexts
4. Type compatibility validation

**Files to Create**:

- `src/semantics/validation/DecimalToDoubleValidator.ts`
- `test/semantics/validation/DecimalToDoubleValidator.test.ts`

### Step 3: Map PutAll Validation ✅

**Objective**: Implement validation for Map putAll operations

**Rules to Implement**:

- Map types must be compatible for putAll operation

**Error Messages**:

- `"invalid.map.putAll"`

**Test Cases**:

1. Valid putAll operations with compatible map types
2. Invalid putAll operations with incompatible map types
3. Type compatibility validation for different key/value types

**Files to Create**:

- `src/semantics/validation/MapPutAllValidator.ts`
- `test/semantics/validation/MapPutAllValidator.test.ts`

### Step 4: SObject Collection Validation ✅

**Objective**: Implement validation for SObject collection operations

**Rules to Implement**:

- Validates SObject collection operations
- Ensures proper type handling for SObject collections

**Test Cases**:

1. Valid SObject collection operations
2. Invalid operations on SObject collections
3. Type validation for SObject collection methods

**Files to Create**:

- `src/semantics/validation/SObjectCollectionValidator.ts`
- `test/semantics/validation/SObjectCollectionValidator.test.ts`

### Step 5: System Comparator Validation ✅

**Objective**: Implement validation for System comparison operations

**Rules to Implement**:

- Validates System comparison operations
- Ensures proper usage of System comparator methods

**Test Cases**:

1. Valid System comparison operations
2. Invalid System comparison usage
3. Parameter validation for System comparator methods

**Files to Create**:

- `src/semantics/validation/SystemComparatorValidator.ts`
- `test/semantics/validation/SystemComparatorValidator.test.ts`

### Step 6: Custom Entity Validation ✅ COMPLETED

**Objective**: Implement validation for custom entity operations

**Rules to Implement**:

- Validates custom entity operations
- Validates visibility requirements for custom entities

**Test Cases**:

1. Valid custom entity operations
2. Invalid custom entity usage
3. Visibility validation for custom entities

**Files Created**:

- ✅ `src/semantics/validation/CustomEntityValidator.ts`
- ✅ `test/semantics/validation/CustomEntityValidator.test.ts`

**Implementation Summary**:

- ✅ Custom entity type validation (naming conventions, visibility, custom type checking)
- ✅ Custom entity field validation (naming conventions, visibility, custom field checking)
- ✅ Custom entity operation validation (DML and SOQL operations)
- ✅ Custom entity visibility validation (namespace access, visibility requirements)
- ✅ 29 comprehensive test cases covering all validation scenarios
- ✅ Integration with existing validation infrastructure

### Step 7: SObject Recalculate Formulas Validation ✅ COMPLETED

**Objective**: Implement validation for SObject formula recalculation operations

**Rules to Implement**:

- Validates SObject formula recalculation operations
- Ensures proper usage of recalculation methods

**Test Cases**:

1. Valid formula recalculation operations
2. Invalid recalculation usage
3. Parameter validation for recalculation methods

**Files Created**:

- ✅ `src/semantics/validation/SObjectRecalculateFormulasValidator.ts`
- ✅ `test/semantics/validation/SObjectRecalculateFormulasValidator.test.ts`

**Implementation Summary**:

- ✅ Method call validation (method name, class name, static requirement, parameter count and type)
- ✅ Parameter validation (SObject list types, null checks, type compatibility)
- ✅ Return type validation (FormulaRecalcResult type checking, null validation)
- ✅ Error type validation (FormulaRecalcFieldError type checking, null validation)
- ✅ Complete operation validation (combined method call and return type validation)
- ✅ 29 comprehensive test cases covering all validation scenarios
- ✅ Integration with existing validation infrastructure

### Step 8: Main Method Validator Integration ✅

**Objective**: Create unified method validation interface

**Implementation**:

- Create main method validator that orchestrates all method validations
- Integrate with existing validation infrastructure
- Provide unified error reporting

**Files to Create**:

- `src/semantics/validation/MethodValidator.ts`
- `test/semantics/validation/MethodValidator.test.ts`

## Test Structure

### Test Organization

Each validator will have its own test file with the following structure:

```typescript
describe('ValidatorName', () => {
  describe('valid cases', () => {
    // Test valid method calls
  });

  describe('invalid cases', () => {
    // Test invalid method calls
  });

  describe('edge cases', () => {
    // Test boundary conditions
  });

  describe('error messages', () => {
    // Test specific error message generation
  });
});
```

### Test Data

- Use realistic Apex code examples
- Include both positive and negative test cases
- Test edge cases and boundary conditions
- Ensure comprehensive coverage of all validation rules

## Integration Points

### Existing Infrastructure

- Integrate with `ValidationResult` and `ValidationScope` types
- Use existing error reporting patterns
- Follow established naming conventions
- Maintain consistency with other validators

### Parser Integration

- Integrate with method call expression parsing
- Connect with symbol resolution system
- Use existing type information infrastructure

## Performance Considerations

### Optimization Targets

- Method validation: < 10ms per method call
- SObject field validation: < 5ms per field
- Collection validation: < 15ms per collection operation
- Overall method validation: < 50ms for typical method calls

### Memory Usage

- Minimize object creation during validation
- Reuse validation contexts where possible
- Efficient error message storage

## Error Handling

### Error Message Consistency

- Use exact error message keys from apex-jorje-semantic
- Maintain consistent error message format
- Provide meaningful error descriptions

### Error Reporting

- Include method call location information
- Provide context about the validation failure
- Support for multiple errors per method call

## Documentation Requirements

### Code Documentation

- Comprehensive JSDoc for all public methods
- TypeDoc compatible documentation
- Clear parameter and return type documentation

### User Documentation

- Update validation progress documentation
- Document new validation capabilities
- Provide usage examples

## Success Metrics

### Functional Metrics

- All built-in method validation rules implemented
- 90%+ test coverage achieved
- Zero false positives in validation
- Accurate error message generation

### Performance Metrics

- Method validation performance within targets
- Memory usage within acceptable limits
- Integration performance maintained

### Quality Metrics

- Code follows TypeScript best practices
- Comprehensive error handling
- Clear and maintainable code structure

## Implementation Timeline

### Week 1: Foundation

- Step 1: AddError Method Validation
- Step 2: Decimal to Double Conversion Validation
- Basic infrastructure setup

### Week 2: Core Validators

- Step 3: Map PutAll Validation
- Step 4: SObject Collection Validation
- Integration testing

### Week 3: Advanced Validators

- Step 5: System Comparator Validation
- Step 6: Custom Entity Validation
- Performance optimization

### Week 4: Integration and Polish

- Step 7: SObject Recalculate Formulas Validation
- Step 8: Main Method Validator Integration
- Documentation and final testing

## Risk Assessment

### Low Risk

- AddError method validation (well-defined rules)
- Map PutAll validation (straightforward type checking)

### Medium Risk

- SObject collection validation (complex type handling)
- Performance optimization (large codebases)

### High Risk

- Integration complexity (multiple systems)
- Error message consistency (exact matching required)

## Dependencies

### Internal Dependencies

- Existing validation infrastructure
- Symbol resolution system
- Type information system
- Error reporting system

### External Dependencies

- Apex API version information
- SObject metadata
- Method signature information

## Next Steps

1. **Begin with Step 1**: AddError Method Validation
   - Create test file with comprehensive test cases
   - Implement validator following TDD approach
   - Ensure all test cases pass

2. **Continue with Step 2**: Decimal to Double Conversion Validation
   - Follow same TDD pattern
   - Integrate with existing type system

3. **Progress through remaining steps**: Follow established patterns and maintain consistency

## References

- [Apex-Jorje Semantic Rules](./apex-jorje-semantic-rules.md)
- [Semantic Validation Progress](./semantic-validation-progress.md)
- [Expression Validation Implementation Summary](./expression-validation-implementation-summary.md)
- [Validation Infrastructure](./ValidationResult.ts)
