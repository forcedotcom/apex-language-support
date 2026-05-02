/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Context, Effect, Layer } from 'effect';
import type { ApexSymbol, SymbolLocation } from '../../types/symbol';
import type { EnumValue } from '@salesforce/apex-lsp-shared';
import type {
  ReferenceType,
  ReferenceResult,
  DependencyAnalysis,
  ApexSymbolRefManager,
} from '../ApexSymbolRefManager';
import type {
  GraphData,
  FileGraphData,
  TypeGraphData,
} from '../../types/graph';

/**
 * Data service for the reference graph (reference triad).
 * Wraps reverseIndex, forwardIndex, and refStore from ApexSymbolRefManager.
 */
export interface ReferenceStoreShape {
  readonly addReference: (
    sourceSymbol: ApexSymbol,
    targetSymbol: ApexSymbol,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
    },
  ) => Effect.Effect<void>;
  readonly findReferencesTo: (
    symbol: ApexSymbol,
  ) => Effect.Effect<ReferenceResult[]>;
  readonly findReferencesFrom: (
    symbol: ApexSymbol,
  ) => Effect.Effect<ReferenceResult[]>;
  readonly clearReferenceStateForFile: (fileUri: string) => Effect.Effect<void>;
  readonly clear: () => Effect.Effect<void>;

  readonly analyzeDependencies: (
    symbol: ApexSymbol,
  ) => Effect.Effect<DependencyAnalysis>;
  readonly detectCircularDependencies: () => Effect.Effect<string[][]>;

  readonly getGraphData: () => Effect.Effect<GraphData>;
  readonly getGraphDataForFile: (
    fileUri: string,
  ) => Effect.Effect<FileGraphData>;
  readonly getGraphDataByType: (
    symbolType: string,
  ) => Effect.Effect<TypeGraphData>;

  readonly getStats: () => Effect.Effect<{ totalReferences: number }>;
}

export class ReferenceStore extends Context.Tag('ReferenceStore')<
  ReferenceStore,
  ReferenceStoreShape
>() {}

/** Shim Layer that delegates to an existing ApexSymbolRefManager instance */
export const referenceStoreShim = (
  manager: ApexSymbolRefManager,
): Layer.Layer<ReferenceStore> =>
  Layer.succeed(ReferenceStore, {
    addReference: (
      sourceSymbol,
      targetSymbol,
      referenceType,
      location,
      context,
    ) =>
      Effect.sync(() =>
        manager.addReference(
          sourceSymbol,
          targetSymbol,
          referenceType,
          location,
          context,
        ),
      ),
    findReferencesTo: (symbol) =>
      Effect.sync(() => manager.findReferencesTo(symbol)),
    findReferencesFrom: (symbol) =>
      Effect.sync(() => manager.findReferencesFrom(symbol)),
    clearReferenceStateForFile: (fileUri) =>
      Effect.sync(() => manager.clearReferenceStateForFile(fileUri)),
    clear: () => Effect.sync(() => manager.clear()),

    analyzeDependencies: (symbol) =>
      Effect.sync(() => manager.analyzeDependencies(symbol)),
    detectCircularDependencies: () =>
      Effect.sync(() => manager.detectCircularDependencies()),

    getGraphData: () => Effect.sync(() => manager.getGraphData()),
    getGraphDataForFile: (fileUri) =>
      Effect.sync(() => manager.getGraphDataForFile(fileUri)),
    getGraphDataByType: (symbolType) =>
      Effect.sync(() => manager.getGraphDataByType(symbolType)),

    getStats: () =>
      Effect.sync(() => ({
        totalReferences: manager.getStats().totalEdges,
      })),
  });
