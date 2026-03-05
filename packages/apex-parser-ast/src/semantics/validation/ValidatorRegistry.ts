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
import { deduplicateValidationResult } from './ValidationResult';
import type { ValidationOptions, ValidationTier } from './ValidationTier';
import type { ValidatorPrerequisites } from '../../prerequisites/OperationPrerequisites';
import { DetailLevel } from '../../parser/listeners/LayeredSymbolListenerBase';
import { isStandardApexUri } from '../../types/ProtocolHandler';
import {
  SymbolTableEnrichmentService,
  type ValidationEnrichmentData,
} from './enrichment/SymbolTableEnrichmentService';

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
   * Prerequisites this validator requires (parser-ast concern, not LSP)
   * Validators declare what they need to run successfully
   */
  readonly prerequisites: ValidatorPrerequisites;

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
 * Check if a symbol table is for a standard Apex library file
 * These files are controlled stubs and don't need validation
 *
 * Note: Built-in classes (String, Integer, List, etc.) are stored in builtins/ folder
 * but are merged into StandardApexLibrary/System/ during ZIP creation, so they
 * get apexlib:// URIs when parsed, not built-in:// URIs.
 * The built-in://apex URIs are only used for synthetic symbols (void, null, sObjects)
 * from BuiltInTypeTables, which are not in symbol tables.
 */
function isStandardLibrary(symbolTable: SymbolTable): boolean {
  const fileUri = symbolTable.getFileUri();
  return isStandardApexUri(fileUri);
}

/**
 * Helper function to check if validator prerequisites are met
 */
function checkValidatorPrerequisites(
  prerequisites: ValidatorPrerequisites,
  symbolTable: SymbolTable,
  options: ValidationOptions,
): boolean {
  // Check detail level requirement
  if (prerequisites.requiredDetailLevel !== null) {
    const currentDetailLevel = symbolTable.getDetailLevel();

    // If no detail level is set, allow validators that only need 'public-api'
    // (the minimum level) to run, as they can work with basic symbol tables
    if (!currentDetailLevel) {
      if (prerequisites.requiredDetailLevel === 'public-api') {
        return true; // Allow 'public-api' validators to run even without detail level
      }
      return false; // Higher detail levels require explicit detail level
    }

    const levelOrder: Record<DetailLevel, number> = {
      'public-api': 1,
      protected: 2,
      private: 3,
      full: 4,
    };

    const currentOrder = levelOrder[currentDetailLevel] || 0;
    const requiredOrder = levelOrder[prerequisites.requiredDetailLevel] || 0;

    if (currentOrder < requiredOrder) {
      return false; // Current level is lower than required
    }
  }

  // Check references requirement
  if (prerequisites.requiresReferences && !symbolTable.hasReferences()) {
    return false; // References required but not present
  }

  // Check cross-file resolution requirement
  if (prerequisites.requiresCrossFileResolution) {
    // Check if symbolManager is available (needed for cross-file resolution)
    if (!options.symbolManager) {
      return false; // Cross-file resolution requires symbolManager
    }

    // Note: We don't require all references to be resolved here.
    // Validators with requiresCrossFileResolution need to run even when
    // some references are unresolved, so they can trigger artifact loading
    // for missing types via loadArtifactCallback.
    // The validator itself will handle cases where types are missing.
  }

  return true; // All prerequisites met
}

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
      // Short-circuit: Skip validation for standard library files
      // Built-in classes (String, Integer, etc.) are merged into StandardApexLibrary
      // and get apexlib:// URIs, so they're covered by isStandardApexUri()
      if (isStandardLibrary(symbolTable)) {
        yield* Effect.logDebug(
          `Skipping validation for standard library file: ${symbolTable.getFileUri()}`,
        );
        return [];
      }

      const validators = yield* this.getValidatorsByTier(tier);

      yield* Effect.logDebug(
        `Running ${validators.length} validators for tier ${tier}`,
      );

      // Determine maximum prerequisites needed across all validators
      // This helps optimize prerequisite fulfillment
      let maxRequiredDetailLevel: DetailLevel | null = null;
      let maxDetailOrder = 0;
      const levelOrder: Record<DetailLevel, number> = {
        'public-api': 1,
        protected: 2,
        private: 3,
        full: 4,
      };

      for (const validator of validators) {
        if (validator.prerequisites.requiredDetailLevel) {
          const order =
            levelOrder[validator.prerequisites.requiredDetailLevel] || 0;
          if (order > maxDetailOrder) {
            maxDetailOrder = order;
            maxRequiredDetailLevel =
              validator.prerequisites.requiredDetailLevel;
          }
        }
      }

      if (maxRequiredDetailLevel) {
        yield* Effect.logDebug(
          `Maximum detail level required for tier ${tier}: ${maxRequiredDetailLevel}`,
        );
      }

      // Run all validators, collecting results
      // Use Effect.all to run them in sequence (could be parallel if needed)
      const results = yield* Effect.all(
        validators.map((validator) =>
          Effect.gen(function* () {
            // Check if prerequisites are met
            const prerequisitesMet = checkValidatorPrerequisites(
              validator.prerequisites,
              symbolTable,
              options,
            );

            if (!prerequisitesMet) {
              yield* Effect.logWarning(
                `Skipping validator ${validator.name} - prerequisites not met ` +
                  `(requiredDetailLevel: ${validator.prerequisites.requiredDetailLevel}, ` +
                  `requiresReferences: ${validator.prerequisites.requiresReferences}, ` +
                  `requiresCrossFileResolution: ${validator.prerequisites.requiresCrossFileResolution})`,
              );
              // Return empty result when prerequisites not met
              return {
                isValid: true,
                errors: [],
                warnings: [],
              } as ValidationResult;
            }

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

            // Deduplicate errors and warnings before returning
            // This prevents duplicate diagnostics when duplicate symbols exist
            return deduplicateValidationResult(result);
          }),
        ),
        { concurrency: 'unbounded' },
      );

      // Apply enrichment from validation results
      // Merge enrichment data from all validators and enrich symbol table
      let mergedEnrichmentData: ValidationEnrichmentData | undefined =
        undefined;

      for (const result of results) {
        if (result.enrichmentData) {
          // Initialize merged data if needed
          if (!mergedEnrichmentData) {
            mergedEnrichmentData = {
              expressionLiteralTypes: new Map(),
              resolvedExpressionTypes: new Map(),
            };
          }

          // Merge expression literal types
          const exprLiteralTypes = result.enrichmentData.expressionLiteralTypes;
          if (exprLiteralTypes && mergedEnrichmentData.expressionLiteralTypes) {
            for (const [expr, type] of exprLiteralTypes.entries()) {
              mergedEnrichmentData.expressionLiteralTypes.set(expr, type);
            }
          }

          // Merge resolved expression types
          const resolvedTypes = result.enrichmentData.resolvedExpressionTypes;
          if (resolvedTypes && mergedEnrichmentData.resolvedExpressionTypes) {
            for (const [expr, type] of resolvedTypes.entries()) {
              mergedEnrichmentData.resolvedExpressionTypes.set(expr, type);
            }
          }
        }
      }

      // Apply enrichment if we have any enrichment data
      if (mergedEnrichmentData) {
        SymbolTableEnrichmentService.enrich(symbolTable, mergedEnrichmentData);
        yield* Effect.logDebug(
          'Applied enrichment data from validation results',
        );
      }

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
