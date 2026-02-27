/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  ValidatorRegistryLive,
  registerValidator,
  ValidationError,
  type Validator,
} from './ValidatorRegistry';

// TIER 1 (IMMEDIATE) validators
import { SourceSizeValidator } from './validators/SourceSizeValidator';
import { ParameterLimitValidator } from './validators/ParameterLimitValidator';
import { EnumLimitValidator } from './validators/EnumLimitValidator';
import { EnumConstantNamingValidator } from './validators/EnumConstantNamingValidator';
import { DuplicateMethodValidator } from './validators/DuplicateMethodValidator';
import { ConstructorNamingValidator } from './validators/ConstructorNamingValidator';
import { TypeSelfReferenceValidator } from './validators/TypeSelfReferenceValidator';
import { AbstractMethodBodyValidator } from './validators/AbstractMethodBodyValidator';
import { VariableShadowingValidator } from './validators/VariableShadowingValidator';
import { ForwardReferenceValidator } from './validators/ForwardReferenceValidator';
import { AssignmentAccessValidator } from './validators/AssignmentAccessValidator';
import { FinalAssignmentValidator } from './validators/FinalAssignmentValidator';
import { DuplicateSymbolValidator } from './validators/DuplicateSymbolValidator';
import { DuplicateTypeNameValidator } from './validators/DuplicateTypeNameValidator';
import { UnreachableStatementValidator } from './validators/UnreachableStatementValidator';
import { ControlFlowValidator } from './validators/ControlFlowValidator';
import { TryCatchFinallyValidator } from './validators/TryCatchFinallyValidator';
import { ReturnStatementValidator } from './validators/ReturnStatementValidator';
import { DuplicateAnnotationMethodValidator } from './validators/DuplicateAnnotationMethodValidator';
import { UnknownAnnotationValidator } from './validators/UnknownAnnotationValidator';
import { AnnotationPropertyValidator } from './validators/AnnotationPropertyValidator';
import { TestMethodValidator } from './validators/TestMethodValidator';
import { AuraEnabledValidator } from './validators/AuraEnabledValidator';
import { ExpressionTypeValidator } from './validators/ExpressionTypeValidator';
import { MethodOverrideValidator } from './validators/MethodOverrideValidator';
import { ModifierValidator } from './validators/ModifierValidator';
import { ConstructorValidator } from './validators/ConstructorValidator';
import { ExceptionValidator } from './validators/ExceptionValidator';
import { SwitchStatementValidator } from './validators/SwitchStatementValidator';
import { CollectionValidator } from './validators/CollectionValidator';
import { ExpressionValidator } from './validators/ExpressionValidator';
import { DeprecationValidator } from './validators/DeprecationValidator';
import { DmlStatementValidator } from './validators/DmlStatementValidator';
import { DmlLoopQueryValidator } from './validators/DmlLoopQueryValidator';
import { RunAsStatementValidator } from './validators/RunAsStatementValidator';
import { DuplicateFieldInitValidator } from './validators/DuplicateFieldInitValidator';
import { MethodCallValidator } from './validators/MethodCallValidator';
import { AbstractMethodImplementationValidator } from './validators/AbstractMethodImplementationValidator';
import { MethodModifierRestrictionValidator } from './validators/MethodModifierRestrictionValidator';

// TIER 2 (THOROUGH) validators
import { MethodSignatureEquivalenceValidator } from './validators/MethodSignatureEquivalenceValidator';
import { InterfaceHierarchyValidator } from './validators/InterfaceHierarchyValidator';
import { ClassHierarchyValidator } from './validators/ClassHierarchyValidator';
import { TypeAssignmentValidator } from './validators/TypeAssignmentValidator';
import { MethodResolutionValidator } from './validators/MethodResolutionValidator';
import { VariableResolutionValidator } from './validators/VariableResolutionValidator';
import { TypeVisibilityValidator } from './validators/TypeVisibilityValidator';
import { TypeResolutionValidator } from './validators/TypeResolutionValidator';
import { StaticContextValidator } from './validators/StaticContextValidator';
import { InnerTypeValidator } from './validators/InnerTypeValidator';
import { NewExpressionValidator } from './validators/NewExpressionValidator';
import { ParameterizedTypeValidator } from './validators/ParameterizedTypeValidator';
import { InstanceofValidator } from './validators/InstanceofValidator';
import { LiteralValidator } from './validators/LiteralValidator';
import { PropertyAccessorValidator } from './validators/PropertyAccessorValidator';
import { MethodTypeClashValidator } from './validators/MethodTypeClashValidator';

/**
 * All validators that should be registered
 */
const ALL_VALIDATORS: readonly Validator[] = [
  // TIER 1 (IMMEDIATE) validators
  SourceSizeValidator, // Highest priority (runs first)
  UnreachableStatementValidator,
  ControlFlowValidator,
  TryCatchFinallyValidator,
  ReturnStatementValidator,
  ParameterLimitValidator,
  EnumLimitValidator,
  EnumConstantNamingValidator,
  DuplicateMethodValidator,
  ConstructorNamingValidator,
  TypeSelfReferenceValidator,
  AbstractMethodBodyValidator,
  VariableShadowingValidator,
  ForwardReferenceValidator,
  FinalAssignmentValidator,
  DuplicateSymbolValidator,
  DuplicateTypeNameValidator,
  DuplicateAnnotationMethodValidator,
  UnknownAnnotationValidator,
  AnnotationPropertyValidator,
  LiteralValidator,
  TestMethodValidator,
  AuraEnabledValidator,
  ExpressionTypeValidator,
  MethodOverrideValidator,
  ModifierValidator,
  ConstructorValidator,
  ExceptionValidator,
  SwitchStatementValidator,
  CollectionValidator,
  ExpressionValidator,
  InnerTypeValidator,
  DeprecationValidator,
  DmlStatementValidator,
  DmlLoopQueryValidator,
  RunAsStatementValidator,
  DuplicateFieldInitValidator,
  MethodCallValidator,
  AbstractMethodImplementationValidator,
  MethodModifierRestrictionValidator,
  ParameterizedTypeValidator,
  PropertyAccessorValidator,
  MethodTypeClashValidator,

  // TIER 2 (THOROUGH) validators
  MethodSignatureEquivalenceValidator,
  InterfaceHierarchyValidator,
  ClassHierarchyValidator,
  TypeAssignmentValidator,
  TypeResolutionValidator,
  MethodResolutionValidator,
  VariableResolutionValidator,
  AssignmentAccessValidator,
  TypeVisibilityValidator,
  StaticContextValidator,
  NewExpressionValidator,
  InstanceofValidator,
] as const;

/**
 * Initialize and register all validators in the ValidatorRegistry
 *
 * This function registers all validators (TIER 1 and TIER 2) with the
 * ValidatorRegistry. It should be called once during server initialization.
 *
 * @returns Effect that completes when all validators are registered
 *
 * @example
 * ```typescript
 * await Effect.runPromise(
 *   initializeValidators().pipe(Effect.provide(ValidatorRegistryLive))
 * );
 * ```
 */
export function initializeValidators(): Effect.Effect<
  void,
  ValidationError,
  never
> {
  return Effect.gen(function* () {
    yield* Effect.logDebug(
      `Initializing ${ALL_VALIDATORS.length} validators...`,
    );

    // Register all validators
    for (const validator of ALL_VALIDATORS) {
      yield* registerValidator(validator);
    }

    yield* Effect.logDebug(
      `Successfully initialized ${ALL_VALIDATORS.length} validators`,
    );
  }).pipe(Effect.provide(ValidatorRegistryLive));
}

/**
 * Get the count of validators by tier
 */
export function getValidatorCounts(): {
  tier1: number;
  tier2: number;
  total: number;
} {
  const tier1 = ALL_VALIDATORS.filter((v) => v.tier === 1).length;
  const tier2 = ALL_VALIDATORS.filter((v) => v.tier === 2).length;
  return {
    tier1,
    tier2,
    total: ALL_VALIDATORS.length,
  };
}
