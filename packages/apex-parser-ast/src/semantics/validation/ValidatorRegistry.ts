/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Context, Effect, Layer, Data } from 'effect';
import type { SymbolTable } from '../../types/symbol';
import type { ValidationResult } from './ValidationResult';
import type { ValidationOptions, ValidationTier } from './ValidationTier';

/**
 * Error types for validation operations
 */
export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/**
 * Base interface for validators
 * Validators return Effects for composability and error handling
 */
export interface Validator {
  /**
   * Unique identifier for this validator
   */
  readonly id: string;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Validation tier (determines when this validator runs)
   */
  readonly tier: ValidationTier;

  /**
   * Priority within tier (lower = runs first)
   */
  readonly priority: number;

  /**
   * Validate a symbol table
   * Returns an Effect that produces ValidationResult or ValidationError
   * May have requirements (e.g., ArtifactLoadingHelper) that must be satisfied by providing layers
   */
  validate(
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError, any>;
}

/**
 * Validator registration entry
 */
export interface ValidatorRegistration {
  readonly validator: Validator;
  readonly tier: ValidationTier;
  readonly priority: number;
}

/**
 * ValidatorRegistry Service interface
 * Manages the collection of validators and provides lookup by tier
 */
export interface ValidatorRegistryService {
  /**
   * Register a validator
   */
  readonly register: (
    validator: Validator,
  ) => Effect.Effect<void, ValidationError>;

  /**
   * Get validators for a specific tier, sorted by priority
   */
  readonly getValidatorsByTier: (
    tier: ValidationTier,
  ) => Effect.Effect<ReadonlyArray<Validator>, never>;

  /**
   * Get all registered validators
   */
  readonly getAllValidators: () => Effect.Effect<
    ReadonlyArray<Validator>,
    never
  >;

  /**
   * Run validators for a specific tier
   * May have requirements from validators that must be satisfied by providing layers
   */
  readonly runValidatorsForTier: (
    tier: ValidationTier,
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ) => Effect.Effect<ReadonlyArray<ValidationResult>, ValidationError, any>;
}

/**
 * ValidatorRegistry Service tag for dependency injection
 */
export class ValidatorRegistry extends Context.Tag('ValidatorRegistry')<
  ValidatorRegistry,
  ValidatorRegistryService
>() {}

/**
 * Implementation of ValidatorRegistry
 */
class ValidatorRegistryImpl implements ValidatorRegistryService {
  private validators: Map<string, ValidatorRegistration> = new Map();

  register(validator: Validator): Effect.Effect<void, ValidationError> {
    return Effect.gen(this, function* () {
      if (this.validators.has(validator.id)) {
        yield* Effect.logWarning(
          `Validator ${validator.id} already registered, replacing`,
        );
      }

      this.validators.set(validator.id, {
        validator,
        tier: validator.tier,
        priority: validator.priority,
      });

      yield* Effect.logDebug(
        `Registered validator: ${validator.name} (${validator.id}) for tier ${validator.tier}`,
      );
    });
  }

  getValidatorsByTier(
    tier: ValidationTier,
  ): Effect.Effect<ReadonlyArray<Validator>, never> {
    return Effect.sync(() => {
      const validators = Array.from(this.validators.values())
        .filter((reg) => reg.tier === tier)
        .sort((a, b) => a.priority - b.priority)
        .map((reg) => reg.validator);

      return validators;
    });
  }

  getAllValidators(): Effect.Effect<ReadonlyArray<Validator>, never> {
    return Effect.sync(() =>
      Array.from(this.validators.values())
        .sort((a, b) => {
          // Sort by tier first, then priority
          if (a.tier !== b.tier) {
            return a.tier - b.tier;
          }
          return a.priority - b.priority;
        })
        .map((reg) => reg.validator),
    );
  }

  runValidatorsForTier(
    tier: ValidationTier,
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ReadonlyArray<ValidationResult>, ValidationError, any> {
    return Effect.gen(this, function* () {
      const validators = yield* this.getValidatorsByTier(tier);

      yield* Effect.logDebug(
        `Running ${validators.length} validators for tier ${tier}`,
      );

      // Run all validators, collecting results
      // Use Effect.all to run them in sequence (could be parallel if needed)
      const results = yield* Effect.all(
        validators.map((validator) =>
          Effect.gen(function* () {
            yield* Effect.logDebug(`Running validator: ${validator.name}`);

            // Wrap validator execution with error handling
            const result = yield* validator.validate(symbolTable, options).pipe(
              Effect.catchAll((error) =>
                Effect.gen(function* () {
                  yield* Effect.logError(
                    `Validator ${validator.name} failed: ${error.message}`,
                  );
                  // Return a validation result indicating validator failure
                  return {
                    isValid: true, // Don't fail the whole validation
                    errors: [],
                    warnings: [`Internal validator error: ${validator.name}`],
                  } as ValidationResult;
                }),
              ),
            );

            return result;
          }),
        ),
        { concurrency: 'unbounded' }, // Run sequentially for now
      );

      return results;
    });
  }
}

/**
 * Layer for creating the ValidatorRegistry service
 * Use this in your Effect runtime to provide the registry
 */
export const ValidatorRegistryLive: Layer.Layer<ValidatorRegistry> =
  Layer.succeed(ValidatorRegistry, new ValidatorRegistryImpl());

/**
 * Helper to register a validator in the registry
 * Usage: registerValidator(myValidator).pipe(Effect.provide(ValidatorRegistryLive))
 */
export const registerValidator = (
  validator: Validator,
): Effect.Effect<void, ValidationError, ValidatorRegistry> =>
  Effect.gen(function* () {
    const registry = yield* ValidatorRegistry;
    yield* registry.register(validator);
  });

/**
 * Helper to get validators by tier
 */
export const getValidatorsByTier = (
  tier: ValidationTier,
): Effect.Effect<ReadonlyArray<Validator>, never, ValidatorRegistry> =>
  Effect.gen(function* () {
    const registry = yield* ValidatorRegistry;
    return yield* registry.getValidatorsByTier(tier);
  });

/**
 * Helper to run validators for a tier
 * May have requirements from validators that must be satisfied by providing layers
 */
export const runValidatorsForTier = (
  tier: ValidationTier,
  symbolTable: SymbolTable,
  options: ValidationOptions,
): Effect.Effect<
  ReadonlyArray<ValidationResult>,
  ValidationError,
  ValidatorRegistry | any
> =>
  Effect.gen(function* () {
    const registry = yield* ValidatorRegistry;
    return yield* registry.runValidatorsForTier(tier, symbolTable, options);
  });
