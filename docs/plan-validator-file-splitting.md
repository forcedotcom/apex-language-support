# Plan: Split Large Validator Files

**GUS Work Item:** [a07EE00002V8Z2aYAF](https://gus.lightning.force.com/lightning/r/ADM_Work__c/a07EE00002V8Z2aYAF/view)

## Problem

Several validator files exceed 1,000 lines, making them difficult to review, test, and maintain. The largest files contain significant internal duplication that can be extracted.

## Files to Split

| File | Lines | Priority |
|------|-------|----------|
| `ExpressionValidator.ts` | ~2,850 | High |
| `AnnotationPropertyValidator.ts` | ~2,460 | High |
| `MethodResolutionValidator.ts` | ~1,993 | Medium |
| `VariableResolutionValidator.ts` | ~1,451 | Medium |
| `SwitchStatementValidator.ts` | ~1,062 | Low |
| `ModifierValidator.ts` | ~1,010 | Low |

All files are in `packages/apex-parser-ast/src/semantics/validation/validators/`.

## Approach

### 1. AnnotationPropertyValidator.ts (highest ROI)

The file has ~1,500 lines of near-identical validation logic repeated three times:
- Class annotations (lines ~950-1430)
- Method annotations (lines ~1440-1920)
- Field/property annotations (lines ~1995-2445)

Each section performs the same checks: duplicate parameters, missing required properties, invalid values, unsupported properties.

**Action**: Extract a shared `validateAnnotationProperties(annotations, location, context)` function that accepts the annotation array and context type (class/method/field). The per-context entry points become thin wrappers that filter symbols and call the shared function.

**Target**: One file ~1,200 lines or split into:
- `AnnotationPropertyValidator.ts` — orchestrator + shared logic
- `annotationPropertyRules.ts` — annotation registry and format validators (already partially exists in `annotationModifierRules.ts`)

### 2. ExpressionValidator.ts

Contains:
- Tier 1 expression type resolution
- Tier 2 expression type resolution (partially duplicated)
- Parse tree walker for expression analysis
- 400+ line `resolveExpressionTypeRecursive` function

**Action**: Split into:
- `ExpressionValidator.ts` — main validator entry point, parse tree walker
- `expressionTypeResolution.ts` — `resolveExpressionTypeRecursive` and type resolution helpers
- `expressionTypeUtils.ts` — exported utility functions (`isNumericType`, `isStringType`, etc.) already partially exported

### 3. MethodResolutionValidator.ts

Contains:
- Method visibility checking
- Parameter type matching
- Receiver type resolution (~250 lines)
- Cross-file method resolution

**Action**: Split into:
- `MethodResolutionValidator.ts` — main validator
- `receiverTypeResolution.ts` — receiver type resolution logic
- `methodMatchingUtils.ts` — parameter matching, signature comparison

### 4. VariableResolutionValidator.ts

Contains:
- Field access validation
- Chain target type resolution
- Write access validation
- Visibility checking

**Action**: Split into:
- `VariableResolutionValidator.ts` — main validator
- `chainTypeResolution.ts` — chain target type resolution
- `fieldAccessValidation.ts` — field access and write validation

### 5. SwitchStatementValidator.ts & ModifierValidator.ts

These are closer to the threshold and less urgent. Consider splitting only if they grow further.

## Constraints

- Each split must maintain the existing test coverage
- Validators must still register the same way via `ValidatorInitialization.ts`
- Exported types (`ExpressionTypeInfo`, etc.) must remain accessible from the barrel export

## Order of Execution

1. `AnnotationPropertyValidator.ts` — highest duplication, clearest extraction
2. `ExpressionValidator.ts` — largest file, clear separation boundaries
3. `MethodResolutionValidator.ts` — medium priority
4. `VariableResolutionValidator.ts` — medium priority
