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
import { FinalAssignmentValidator } from './validators/FinalAssignmentValidator';
import { DuplicateFieldValidator } from './validators/DuplicateFieldValidator';

// TIER 2 (THOROUGH) validators
import { MethodSignatureEquivalenceValidator } from './validators/MethodSignatureEquivalenceValidator';
import { InterfaceHierarchyValidator } from './validators/InterfaceHierarchyValidator';
import { ClassHierarchyValidator } from './validators/ClassHierarchyValidator';
import { TypeAssignmentValidator } from './validators/TypeAssignmentValidator';

/**
 * All validators that should be registered
 */
const ALL_VALIDATORS: readonly Validator[] = [
  // TIER 1 (IMMEDIATE) validators
  SourceSizeValidator, // Highest priority (runs first)
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
  DuplicateFieldValidator,

  // TIER 2 (THOROUGH) validators
  MethodSignatureEquivalenceValidator,
  InterfaceHierarchyValidator,
  ClassHierarchyValidator,
  TypeAssignmentValidator,
] as const;

/**
 * Initialize and register all validators in the ValidatorRegistry
 *
 * This function registers all 16 validators (12 TIER 1, 4 TIER 2) with the
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
