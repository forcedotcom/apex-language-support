/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Context, Effect, Layer } from 'effect';
import type { ApexSymbol, SymbolTable } from '../../types/symbol';
import type {
  SymbolTableRegistrationResult,
  ApexSymbolRefManager,
} from '../ApexSymbolRefManager';

/**
 * Data service for symbol storage and index-based lookups.
 * Wraps the 7 symbol indexes from ApexSymbolRefManager:
 * nameIndex, fileIndex, fqnIndex, symbolIdIndex,
 * symbolQualifiedIndex, symbolFileMap, fileToSymbolTable.
 */
export interface SymbolIndexStoreShape {
  readonly getSymbol: (symbolId: string) => Effect.Effect<ApexSymbol | null>;
  readonly findByName: (name: string) => Effect.Effect<ApexSymbol[]>;
  readonly findByFQN: (fqn: string) => Effect.Effect<ApexSymbol | null>;
  readonly findSymbolsByFQN: (fqn: string) => Effect.Effect<ApexSymbol[]>;
  readonly getSymbolsInFile: (fileUri: string) => Effect.Effect<ApexSymbol[]>;
  readonly getFilesForSymbol: (name: string) => Effect.Effect<string[]>;
  readonly getSymbolTableForFile: (
    fileUri: string,
  ) => Effect.Effect<SymbolTable | undefined>;
  readonly getParent: (symbol: ApexSymbol) => Effect.Effect<ApexSymbol | null>;
  readonly getSymbolIds: () => Effect.Effect<Set<string>>;
  readonly getFileToSymbolTable: () => Effect.Effect<
    Iterable<[string, SymbolTable | undefined]>
  >;

  readonly addSymbol: (
    symbol: ApexSymbol,
    fileUri: string,
    symbolTable?: SymbolTable,
  ) => Effect.Effect<void>;
  readonly registerSymbolTable: (
    symbolTable: SymbolTable,
    fileUri: string,
    options?: {
      mergeReferences?: boolean;
      hasErrors?: boolean;
      hasHardIncompleteParse?: boolean;
    },
  ) => Effect.Effect<SymbolTableRegistrationResult>;
  readonly removeFile: (fileUri: string) => Effect.Effect<void>;
  readonly clear: () => Effect.Effect<void>;

  readonly getStats: () => Effect.Effect<{
    totalSymbols: number;
    totalFiles: number;
  }>;
}

export class SymbolIndexStore extends Context.Tag('SymbolIndexStore')<
  SymbolIndexStore,
  SymbolIndexStoreShape
>() {}

/** Shim Layer that delegates to an existing ApexSymbolRefManager instance */
export const symbolIndexStoreShim = (
  manager: ApexSymbolRefManager,
): Layer.Layer<SymbolIndexStore> =>
  Layer.succeed(SymbolIndexStore, {
    getSymbol: (symbolId) => Effect.sync(() => manager.getSymbol(symbolId)),
    findByName: (name) => Effect.sync(() => manager.findSymbolByName(name)),
    findByFQN: (fqn) => Effect.sync(() => manager.findSymbolByFQN(fqn)),
    findSymbolsByFQN: (fqn) => Effect.sync(() => manager.findSymbolsByFQN(fqn)),
    getSymbolsInFile: (fileUri) =>
      Effect.sync(() => manager.getSymbolsInFile(fileUri)),
    getFilesForSymbol: (name) =>
      Effect.sync(() => manager.getFilesForSymbol(name)),
    getSymbolTableForFile: (fileUri) =>
      Effect.sync(() => manager.getSymbolTableForFile(fileUri)),
    getParent: (symbol) => Effect.sync(() => manager.getParent(symbol)),
    getSymbolIds: () => Effect.sync(() => manager.getSymbolIds()),
    getFileToSymbolTable: () =>
      Effect.sync(() => manager.getFileToSymbolTable()),

    addSymbol: (symbol, fileUri, symbolTable) =>
      Effect.sync(() => manager.addSymbol(symbol, fileUri, symbolTable)),
    registerSymbolTable: (symbolTable, fileUri, options) =>
      Effect.sync(() =>
        manager.registerSymbolTable(symbolTable, fileUri, options),
      ),
    removeFile: (fileUri) => Effect.sync(() => manager.removeFile(fileUri)),
    clear: () => Effect.sync(() => manager.clear()),

    getStats: () =>
      Effect.sync(() => {
        const stats = manager.getStats();
        return {
          totalSymbols: stats.totalSymbols,
          totalFiles: stats.totalFiles,
        };
      }),
  });
