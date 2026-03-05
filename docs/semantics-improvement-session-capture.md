# Semantics Improvement Session Capture

Captured from `~/.cursor/plans/` and related sources. These plans document previous sessions on improving semantic analysis for the apex-language-support project.

**Related status document**: [`packages/apex-parser-ast/SEMANTIC_VALIDATION_STATUS.md`](../packages/apex-parser-ast/SEMANTIC_VALIDATION_STATUS.md) — auto-generated error-code coverage report (259/347 codes implemented, 77.5% implementable coverage, 50 validators). Use it for current implementation status, missing validations, and implementation priorities.

---

## 1. Improve LHS Semantic Analysis

**Source**: `~/.cursor/plans/improve_lhs_semantic_analysis_*.plan.md`

**Overview**: Enhance LHS assignment semantic analysis by adding CHAINED_TYPE reference support (making LHS consistent with RHS) and implementing comprehensive write access validation.

### Current State
- LHS assignments (`obj.field = value`) create separate `VARIABLE_USAGE` + `FIELD_ACCESS` references
- RHS expressions create `CHAINED_TYPE` references
- Only `isFinal` modifier is checked; static context and visibility are not validated for writes

### Key Files
- `ApexReferenceCollectorListener.ts` - Main reference collection
- `FinalAssignmentValidator.ts` - Current write validation
- `VariableResolutionValidator.ts` - Variable/field resolution
- `symbolReference.ts` - Reference type definitions

### Implementation Phases

**Phase 1: Extend Chain Creation**
- Update `createExpressionNode` to accept access parameter
- Extend `ChainScope` with `lhsAccess`
- Preserve access semantics in chain finalization (apply to last field access node)

**Phase 2: CHAINED_TYPE for LHS**
- Allow chain creation for LHS dot expressions in `enterAssignExpression`
- Update suppression logic to allow `enterDotExpression` but suppress other child listeners
- Apply `lhsAccess` to field access nodes when building chains

**Phase 3: Write Access Validation**
- Create `AssignmentAccessValidator` for static context and visibility write checks
- Enhance `FinalAssignmentValidator` for CHAINED_TYPE references
- Add write visibility checks to `VariableResolutionValidator`

**Phase 4–5**: Error codes, messages, and tests

---

## 2. Semantic Validations Plan (32 Error Codes)

**Source**: `~/.cursor/plans/semantic_validations_plan_3406e26b.plan.md`

**Scope**: 32 error codes across 9 categories.

| Category                 | Error Codes | Validator(s)                                          |
|--------------------------|-------------|-------------------------------------------------------|
| Date/Time Operations     | 3           | ExpressionValidator                                   |
| Safe Navigation          | 2           | ExpressionValidator                                   |
| SObject and Database     | 9           | MethodCallValidator, SObjectMethodValidator            |
| Read-Only and Final      | 2           | ModifierValidator, MethodModifierRestrictionValidator |
| Interface Implementation | 2           | InterfaceHierarchyValidator                           |
| Deprecation              | 1           | DeprecationValidator                                  |
| Type Depth and Limits    | 3           | ParameterizedTypeValidator                             |
| Name Validation          | 5           | IdentifierValidator                                   |
| Type Requirements        | 5           | ModifierValidator                                     |

**Implementation Order**:
1. Phase 1: Date/Time, Interface Implementation
2. Phase 2: SObject addError/deepClone, Deprecation, ReadOnly/useReplica
3. Phase 3: Safe Navigation, METHOD_ONLY_LIST_CUSTOM_SETTINGS
4. Phase 4: Research/defer (Name Validation, Type Requirements)

---

## 3. Semantic Analysis Gaps Rollup

**Source**: `~/.cursor/plans/semantic_analysis_gaps_rollup_aa68ca80.plan.md`

**Status**: Phase 1 (TIER 1) largely complete.

### Completed
- UnreachableStatementValidator, ControlFlowValidator, ReturnStatementValidator, TryCatchFinallyValidator
- DuplicateFieldInitValidator, DuplicateAnnotationMethodValidator, DuplicateTypeNameValidator, DuplicateSymbolValidator
- AnnotationPropertyValidator (exceeded original scope)
- TestMethodValidator, AuraEnabledValidator
- ExpressionTypeValidator, MethodOverrideValidator, ModifierValidator
- @isTest property combination validation, API version format validation

### Remaining
- Org-specific validation (requires org metadata)
- Some annotation format enhancements

---

## 4. 2-Tier Semantic Analysis Progress Assessment

**Source**: `~/.cursor/plans/2-tier_semantic_analysis_progress_assessment_0207c271.plan.md`

**Status**: ~95% complete.

### Completed
- ValidatorRegistry, ValidationTier, ArtifactLoadingHelper
- 14 validators (10 TIER 1, 4 TIER 2)
- ValidatorInitialization, DiagnosticProcessingService integration
- ValidationResult with ValidationErrorInfo/ValidationWarningInfo
- Diagnostic ranges mapped from SymbolLocation
- Type resolution via typeReferenceId/resolvedSymbolId

### TIER 1 Validators
ParameterLimitValidator, EnumLimitValidator, EnumConstantNamingValidator, DuplicateMethodValidator, ConstructorNamingValidator, TypeSelfReferenceValidator, AbstractMethodBodyValidator, VariableShadowingValidator, ForwardReferenceValidator, FinalAssignmentValidator

### TIER 2 Validators
MethodSignatureEquivalenceValidator, InterfaceHierarchyValidator, ClassHierarchyValidator, TypeAssignmentValidator

---

## 5. Refactor Listener Semantic Validations to Validators

**Source**: `~/.cursor/plans/refactor_listener_semantic_validations_to_validators_*.plan.md`

**Goal**: Move semantic checks from `ApexSymbolCollectorListener` to dedicated validators.

### Validators to Create
- DuplicateConstructorValidator
- DuplicateEnumValueValidator
- InnerClassValidator
- MethodModifierValidator
- DuplicateVariableValidator
- OverrideMethodValidator (TIER 2)

### Checks to Remove from Listener
- Duplicate method/constructor/interface method/variable/enum value
- Method modifier conflicts (abstract+final, abstract+static)
- Class modifier conflicts (final+abstract)
- Inner class validations
- Override validation

---

## 6. Semantic Context Prerequisite Orchestration

**Source**: `~/.cursor/plans/semantic_context_prerequisite_orchestration_0d34af45.plan.md`

**Goal**: Orchestrate prerequisites for LSP requests (detail level, references, cross-file resolution, execution mode).

### Planned Components
- PrerequisiteRequirements interface
- getPrerequisitesForLspRequestType mapping
- PrerequisiteOrchestrationService
- ValidatorPrerequisites, SymbolLookupPrerequisites
- Update ValidatorRegistry, DiagnosticProcessingService, DocumentProcessingService, CompletionProcessingService

---

## File Locations

| Resource | Path |
|----------|------|
| **Current status** (error-code coverage, validators) | `packages/apex-parser-ast/SEMANTIC_VALIDATION_STATUS.md` |
| Cursor plans | `~/.cursor/plans/` |
| Prioritize validations | `.cursor/plans/prioritize-missing-validations.md` |
| Annotation validation | `.cursor/plans/annotation_validation_improvements.plan.md` |
| Error codes | `packages/apex-parser-ast/src/generated/ErrorCodes.ts` |
| Validators | `packages/apex-parser-ast/src/semantics/validation/validators/` |
| Reference collector | `packages/apex-parser-ast/src/parser/listeners/ApexReferenceCollectorListener.ts` |
| Symbol collector | `packages/apex-parser-ast/src/parser/listeners/ApexSymbolCollectorListener.ts` |
