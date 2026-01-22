/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Context, Effect, Layer } from 'effect';
import type { TypeSymbol } from '../../types/symbol';
import { SymbolKind } from '../../types/symbol';
import type { ValidationOptions } from './ValidationTier';

// Re-export ISymbolManager interface for type checking
import type { ISymbolManager as ISymbolManagerInterface } from '../../types/ISymbolManager';

/**
 * Context.Tag for ISymbolManager service
 * This allows ISymbolManager to be provided as a dependency through Effect's context system
 */
export class ISymbolManager extends Context.Tag('ISymbolManager')<
  ISymbolManager,
  ISymbolManagerInterface
>() {}

/**
 * Result of artifact loading operation
 */
export interface LoadResult {
  /**
   * Type names that were successfully loaded
   */
  loaded: string[];

  /**
   * Type names that were already available (no load needed)
   */
  alreadyLoaded: string[];

  /**
   * Type names that failed to load
   */
  failed: string[];

  /**
   * Type names that were not loaded due to limits (maxArtifacts, timeout, etc.)
   */
  skipped: string[];

  /**
   * Total time spent loading (milliseconds)
   */
  timeMs: number;
}

/**
 * Service interface for artifact loading operations
 */
export interface ArtifactLoadingHelperService {
  /**
   * Load missing artifacts for specified type names
   *
   * This method:
   * 1. Checks ApexSymbolManager for already-loaded types
   * 2. Identifies types that need loading
   * 3. Loads missing types (respecting maxArtifacts and timeout limits)
   * 4. Returns detailed results
   *
   * @param typeNames - Fully qualified or simple names of types to load
   * @param options - Validation options with artifact loading controls
   * @returns Effect resolving to LoadResult with detailed status
   */
  readonly loadMissingArtifacts: (
    typeNames: string[],
    options: ValidationOptions,
  ) => Effect.Effect<LoadResult, never>;

  /**
   * Get all loaded type symbols from the symbol manager
   *
   * Useful for getting updated type information after loading artifacts.
   *
   * @returns Array of all type symbols (classes, interfaces, enums)
   */
  readonly getAllTypeSymbols: () => TypeSymbol[];
}

/**
 * Helper for controlled artifact loading during semantic validation
 *
 * This helper provides TIER 2 validators with controlled access to cross-file
 * artifacts through ApexSymbolManager. It enforces hard-coded safety limits:
 * - maxDepth: Only immediate dependencies (never transitive)
 * - maxArtifacts: Maximum 5 artifacts per validation
 * - timeout: 5000ms global timeout for all loads
 *
 * Design Principles:
 * 1. Check ApexSymbolManager first - avoid loading what's already available
 * 2. Respect hard-coded limits to prevent runaway spidering
 * 3. Return detailed results for debugging and progress reporting
 * 4. Fail gracefully - partial success is acceptable
 *
 * @example
 * ```typescript
 * const program = Effect.gen(function* () {
 *   const helper = yield* ArtifactLoadingHelper;
 *   const result = yield* helper.loadMissingArtifacts(
 *     ['MyInterface', 'OtherInterface'],
 *     options
 *   );
 *
 *   if (result.loaded.length > 0) {
 *     // Re-validate with newly loaded types
 *   }
 * });
 *
 * // Provide the layer when running
 * const result = await Effect.runPromise(
 *   program.pipe(Effect.provide(ArtifactLoadingHelperLive))
 * );
 * ```
 */
export class ArtifactLoadingHelper extends Context.Tag('ArtifactLoadingHelper')<
  ArtifactLoadingHelper,
  ArtifactLoadingHelperService
>() {}

/**
 * Live implementation of ArtifactLoadingHelper service
 */
export const ArtifactLoadingHelperLive: Layer.Layer<
  ArtifactLoadingHelper,
  never,
  ISymbolManager
> = Layer.effect(
  ArtifactLoadingHelper,
  Effect.gen(function* () {
    const symbolManager = yield* ISymbolManager;

    /**
     * Find a type symbol by name in the symbol manager
     *
     * Searches for class or interface symbols by simple name or FQN.
     *
     * @param typeName - Simple name or FQN of the type
     * @returns Type symbol if found, undefined otherwise
     */
    const findTypeSymbol = (typeName: string): TypeSymbol | undefined => {
      // Try by name first
      const symbolsByName = symbolManager.findSymbolByName(typeName);
      const typeByName = symbolsByName.find(
        (s) =>
          s.kind === SymbolKind.Class ||
          s.kind === SymbolKind.Interface ||
          s.kind === SymbolKind.Enum,
      ) as TypeSymbol | undefined;

      if (typeByName) {
        return typeByName;
      }

      // Try by FQN
      const symbolByFQN = symbolManager.findSymbolByFQN(typeName);
      if (
        symbolByFQN &&
        (symbolByFQN.kind === SymbolKind.Class ||
          symbolByFQN.kind === SymbolKind.Interface ||
          symbolByFQN.kind === SymbolKind.Enum)
      ) {
        return symbolByFQN as TypeSymbol;
      }

      return undefined;
    };

    return {
      loadMissingArtifacts: (typeNames, options) =>
        Effect.gen(function* () {
          const startTime = Date.now();
          const alreadyLoaded: string[] = [];
          const toLoad: string[] = [];
          const failed: string[] = [];
          const loaded: string[] = [];
          const skipped: string[] = [];

          // Check if artifact loading is allowed
          if (!options.allowArtifactLoading) {
            yield* Effect.logDebug(
              'Artifact loading disabled by settings, skipping all types',
            );
            skipped.push(...typeNames);
            return {
              loaded: [],
              alreadyLoaded: [],
              failed: [],
              skipped: typeNames,
              timeMs: 0,
            };
          }

          // Check ApexSymbolManager for already-loaded types
          for (const typeName of typeNames) {
            const existing = findTypeSymbol(typeName);
            if (existing) {
              alreadyLoaded.push(typeName);
              yield* Effect.logDebug(
                `Type '${typeName}' already loaded in symbol manager`,
              );
            } else {
              toLoad.push(typeName);
            }
          }

          yield* Effect.logDebug(
            `Artifact loading check: ${alreadyLoaded.length} already loaded, ` +
              `${toLoad.length} need loading`,
          );

          // Respect maxArtifacts limit
          if (toLoad.length > options.maxArtifacts) {
            const excess = toLoad.slice(options.maxArtifacts);
            skipped.push(...excess);
            toLoad.splice(options.maxArtifacts); // Keep only first maxArtifacts
            yield* Effect.logDebug(
              `Skipping ${excess.length} types due to maxArtifacts limit (${options.maxArtifacts})`,
            );
          }

          // Load missing types (with timeout)
          if (toLoad.length > 0 && options.loadArtifactCallback) {
            yield* Effect.logDebug(
              `Attempting to load ${toLoad.length} missing types via callback`,
            );

            try {
              // Call the provided loading callback
              // This is typically provided by the LSP server layer and uses
              // MissingArtifactResolutionService to actually load files
              const loadedUris = yield* Effect.promise(() =>
                options.loadArtifactCallback!(toLoad),
              );

              yield* Effect.logDebug(
                `Callback returned ${loadedUris.length} loaded file URIs`,
              );

              // Check which types were successfully loaded
              for (const typeName of toLoad) {
                // Check timeout
                const elapsed = Date.now() - startTime;
                if (elapsed >= options.timeout) {
                  yield* Effect.logDebug(
                    `Timeout reached (${options.timeout}ms), ` +
                      'skipping remaining type checks',
                  );
                  const remaining = toLoad.filter(
                    (t) => !loaded.includes(t) && !failed.includes(t),
                  );
                  skipped.push(...remaining);
                  break;
                }

                // Verify the type is now available in symbol manager
                const nowAvailable = findTypeSymbol(typeName);
                if (nowAvailable) {
                  loaded.push(typeName);
                  yield* Effect.logDebug(
                    `Successfully loaded type '${typeName}'`,
                  );
                } else {
                  failed.push(typeName);
                  yield* Effect.logDebug(
                    `Type '${typeName}' still not available after callback`,
                  );
                }
              }
            } catch (error) {
              yield* Effect.logError(
                `Error loading artifacts via callback: ${error}`,
              );
              // Mark all remaining as failed
              failed.push(...toLoad);
            }
          } else {
            // No loading callback provided - mark all as failed
            if (toLoad.length > 0) {
              yield* Effect.logDebug(
                `No loadArtifactCallback provided, marking ${toLoad.length} types as failed`,
              );
              failed.push(...toLoad);
            }
          }

          const timeMs = Date.now() - startTime;

          yield* Effect.logDebug(
            `Artifact loading complete: ${loaded.length} loaded, ` +
              `${alreadyLoaded.length} already available, ` +
              `${failed.length} failed, ${skipped.length} skipped in ${timeMs}ms`,
          );

          return {
            loaded,
            alreadyLoaded,
            failed,
            skipped,
            timeMs,
          };
        }),

      getAllTypeSymbols: () =>
        // Note: This is a simplification. A full implementation would need
        // a method on ISymbolManager to get all symbols efficiently.
        // For now, we return empty array as a placeholder.
        [],
    };
  }),
);
