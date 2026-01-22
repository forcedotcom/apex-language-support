/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { ISymbolManager } from '../../types/ISymbolManager';
import type { TypeSymbol } from '../../types/symbol';
import { SymbolKind } from '../../types/symbol';
import type { ValidationOptions } from './ValidationTier';

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
 * const helper = new ArtifactLoadingHelper(symbolManager);
 * const result = await Effect.runPromise(
 *   helper.loadMissingArtifacts(['MyInterface', 'OtherInterface'], options)
 * );
 *
 * if (result.loaded.length > 0) {
 *   // Re-validate with newly loaded types
 * }
 * ```
 */
export class ArtifactLoadingHelper {
  constructor(private readonly symbolManager: ISymbolManager) {}

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
  loadMissingArtifacts(
    typeNames: string[],
    options: ValidationOptions,
  ): Effect.Effect<LoadResult, never> {
    const self = this;
    return Effect.gen(function* () {
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
        const existing = self.findTypeSymbol(typeName);
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
      // Note: Actual artifact loading implementation would go here
      // For now, this is a placeholder that marks all as failed
      // Real implementation would integrate with workspace symbol loading
      for (const typeName of toLoad) {
        // Check timeout
        const elapsed = Date.now() - startTime;
        if (elapsed >= options.timeout) {
          yield* Effect.logDebug(
            `Timeout reached (${options.timeout}ms), ` +
              `skipping remaining ${toLoad.length - loaded.length - failed.length} types`,
          );
          skipped.push(...toLoad.slice(loaded.length + failed.length));
          break;
        }

        // TODO: Implement actual artifact loading
        // This would involve:
        // 1. Resolving type name to file URI
        // 2. Loading and parsing the file if not already in workspace
        // 3. Adding SymbolTable to ApexSymbolManager
        //
        // For now, mark as failed to maintain safe behavior
        yield* Effect.logDebug(
          `Artifact loading not yet implemented for '${typeName}'`,
        );
        failed.push(typeName);
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
    });
  }

  /**
   * Find a type symbol by name in the symbol manager
   *
   * Searches for class or interface symbols by simple name or FQN.
   *
   * @param typeName - Simple name or FQN of the type
   * @returns Type symbol if found, undefined otherwise
   */
  private findTypeSymbol(typeName: string): TypeSymbol | undefined {
    // Try by name first
    const symbolsByName = this.symbolManager.findSymbolByName(typeName);
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
    const symbolByFQN = this.symbolManager.findSymbolByFQN(typeName);
    if (
      symbolByFQN &&
      (symbolByFQN.kind === SymbolKind.Class ||
        symbolByFQN.kind === SymbolKind.Interface ||
        symbolByFQN.kind === SymbolKind.Enum)
    ) {
      return symbolByFQN as TypeSymbol;
    }

    return undefined;
  }

  /**
   * Get all loaded type symbols from the symbol manager
   *
   * Useful for getting updated type information after loading artifacts.
   *
   * @returns Array of all type symbols (classes, interfaces, enums)
   */
  getAllTypeSymbols(): TypeSymbol[] {
    // Note: This is a simplification. A full implementation would need
    // a method on ISymbolManager to get all symbols efficiently.
    // For now, we return empty array as a placeholder.
    return [];
  }
}
