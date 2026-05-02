/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Layer, Ref } from 'effect';
import { HashMap } from 'data-structure-typed';
import type { ApexSymbol, SymbolTable } from '../../types/symbol';
import { extractFilePathFromUri } from '../../types/UriBasedIdGenerator';
import { CaseInsensitiveHashMap } from '../../utils/CaseInsensitiveMap';
import type { SymbolTableRegistrationResult } from '../ApexSymbolRefManager';
import { SymbolIndexStore } from './symbolIndexStore';

/**
 * Ref-based state for the SymbolIndexStore.
 * Each field is an Effect Ref holding the actual data.
 */
interface SymbolIndexState {
  readonly nameIndex: Ref.Ref<CaseInsensitiveHashMap<string[]>>;
  readonly fileIndex: Ref.Ref<CaseInsensitiveHashMap<string[]>>;
  readonly fqnIndex: Ref.Ref<CaseInsensitiveHashMap<string[]>>;
  readonly symbolIdIndex: Ref.Ref<HashMap<string, ApexSymbol>>;
  readonly symbolFileMap: Ref.Ref<CaseInsensitiveHashMap<string>>;
  readonly fileToSymbolTable: Ref.Ref<CaseInsensitiveHashMap<SymbolTable>>;
  readonly symbolToFiles: Ref.Ref<CaseInsensitiveHashMap<string[]>>;
}

/**
 * Real Effect-managed SymbolIndexStore implementation.
 * Data is owned by Refs — Layer memoization replaces singleton lifecycle.
 */
export const SymbolIndexStoreLive: Layer.Layer<SymbolIndexStore> = Layer.effect(
  SymbolIndexStore,
  Effect.gen(function* () {
    const state: SymbolIndexState = {
      nameIndex: yield* Ref.make(new CaseInsensitiveHashMap<string[]>()),
      fileIndex: yield* Ref.make(new CaseInsensitiveHashMap<string[]>()),
      fqnIndex: yield* Ref.make(new CaseInsensitiveHashMap<string[]>()),
      symbolIdIndex: yield* Ref.make(new HashMap<string, ApexSymbol>()),
      symbolFileMap: yield* Ref.make(new CaseInsensitiveHashMap<string>()),
      fileToSymbolTable: yield* Ref.make(
        new CaseInsensitiveHashMap<SymbolTable>(),
      ),
      symbolToFiles: yield* Ref.make(new CaseInsensitiveHashMap<string[]>()),
    };

    const getSymbolIdIndex = () => Ref.get(state.symbolIdIndex);

    return {
      getSymbol: (symbolId) =>
        Effect.gen(function* () {
          const idx = yield* getSymbolIdIndex();
          return idx.get(symbolId) ?? null;
        }),

      findByName: (name) =>
        Effect.gen(function* () {
          const nameIdx = yield* Ref.get(state.nameIndex);
          const ids = nameIdx.get(name) ?? [];
          const symIdx = yield* getSymbolIdIndex();
          return ids
            .map((id) => symIdx.get(id))
            .filter((s): s is ApexSymbol => s !== undefined);
        }),

      findByFQN: (fqn) =>
        Effect.gen(function* () {
          const fqnIdx = yield* Ref.get(state.fqnIndex);
          const ids = fqnIdx.get(fqn);
          if (!ids || ids.length === 0) return null;
          const symIdx = yield* getSymbolIdIndex();
          return symIdx.get(ids[0]) ?? null;
        }),

      findSymbolsByFQN: (fqn) =>
        Effect.gen(function* () {
          const fqnIdx = yield* Ref.get(state.fqnIndex);
          const ids = fqnIdx.get(fqn) ?? [];
          const symIdx = yield* getSymbolIdIndex();
          return ids
            .map((id) => symIdx.get(id))
            .filter((s): s is ApexSymbol => s !== undefined);
        }),

      getSymbolsInFile: (fileUri) =>
        Effect.gen(function* () {
          const normalizedUri = extractFilePathFromUri(fileUri);
          const fileIdx = yield* Ref.get(state.fileIndex);
          const ids = fileIdx.get(normalizedUri) ?? [];
          const symIdx = yield* getSymbolIdIndex();
          return ids
            .map((id) => symIdx.get(id))
            .filter((s): s is ApexSymbol => s !== undefined);
        }),

      getFilesForSymbol: (name) =>
        Effect.gen(function* () {
          const s2f = yield* Ref.get(state.symbolToFiles);
          return s2f.get(name) ?? [];
        }),

      getSymbolTableForFile: (fileUri) =>
        Effect.gen(function* () {
          const normalizedUri = extractFilePathFromUri(fileUri);
          const f2st = yield* Ref.get(state.fileToSymbolTable);
          return f2st.get(normalizedUri);
        }),

      getParent: (symbol) =>
        Effect.gen(function* () {
          if (!symbol.parentId) return null;
          const symIdx = yield* getSymbolIdIndex();
          return symIdx.get(symbol.parentId) ?? null;
        }),

      getSymbolIds: () =>
        Effect.gen(function* () {
          const symIdx = yield* getSymbolIdIndex();
          return new Set(symIdx.keys());
        }),

      getFileToSymbolTable: () =>
        Effect.gen(function* () {
          return yield* Ref.get(state.fileToSymbolTable);
        }),

      addSymbol: (symbol, fileUri, symbolTable) =>
        Effect.gen(function* () {
          const normalizedUri = extractFilePathFromUri(fileUri);
          const symbolId = symbol.key?.unifiedId || symbol.id;

          yield* Ref.update(state.symbolIdIndex, (idx) => {
            idx.set(symbolId, symbol);
            return idx;
          });

          yield* Ref.update(state.nameIndex, (idx) => {
            const existing = idx.get(symbol.name) ?? [];
            if (!existing.includes(symbolId)) existing.push(symbolId);
            idx.set(symbol.name, existing);
            return idx;
          });

          yield* Ref.update(state.fileIndex, (idx) => {
            const existing = idx.get(normalizedUri) ?? [];
            if (!existing.includes(symbolId)) existing.push(symbolId);
            idx.set(normalizedUri, existing);
            return idx;
          });

          yield* Ref.update(state.symbolFileMap, (m) => {
            m.set(symbolId, normalizedUri);
            return m;
          });

          if (symbol.fqn) {
            yield* Ref.update(state.fqnIndex, (idx) => {
              const existing = idx.get(symbol.fqn!) ?? [];
              if (!existing.includes(symbolId)) existing.push(symbolId);
              idx.set(symbol.fqn!, existing);
              return idx;
            });
          }

          if (symbolTable) {
            yield* Ref.update(state.fileToSymbolTable, (m) => {
              m.set(normalizedUri, symbolTable);
              return m;
            });
          }
        }),

      registerSymbolTable: (symbolTable, fileUri, _options) =>
        Effect.gen(function* () {
          const normalizedUri = extractFilePathFromUri(fileUri);
          const f2st = yield* Ref.get(state.fileToSymbolTable);
          const existing = f2st.get(normalizedUri);
          if (existing === symbolTable) {
            const meta = existing.getMetadata();
            return {
              decision: 'noop-same-instance' as const,
              fileUri: normalizedUri,
              canonicalTable: existing,
              incomingVersion: meta.documentVersion,
              storedVersion: meta.documentVersion,
            };
          }

          yield* Ref.update(state.fileToSymbolTable, (m) => {
            m.set(normalizedUri, symbolTable);
            return m;
          });

          const meta = symbolTable.getMetadata();
          return {
            decision: 'accepted-replace' as const,
            fileUri: normalizedUri,
            canonicalTable: symbolTable,
            incomingVersion: meta.documentVersion,
            storedVersion: existing?.getMetadata().documentVersion,
          } satisfies SymbolTableRegistrationResult;
        }),

      removeFile: (fileUri) =>
        Effect.gen(function* () {
          const normalizedUri = extractFilePathFromUri(fileUri);
          const fileIdx = yield* Ref.get(state.fileIndex);
          const symbolIds = fileIdx.get(normalizedUri) ?? [];

          for (const symbolId of symbolIds) {
            yield* Ref.update(state.symbolIdIndex, (m) => {
              m.delete(symbolId);
              return m;
            });
            yield* Ref.update(state.symbolFileMap, (m) => {
              m.delete(symbolId);
              return m;
            });
          }

          yield* Ref.update(state.fileIndex, (idx) => {
            idx.delete(normalizedUri);
            return idx;
          });
          yield* Ref.update(state.fileToSymbolTable, (m) => {
            m.delete(normalizedUri);
            return m;
          });
        }),

      clear: () =>
        Effect.gen(function* () {
          yield* Ref.set(
            state.nameIndex,
            new CaseInsensitiveHashMap<string[]>(),
          );
          yield* Ref.set(
            state.fileIndex,
            new CaseInsensitiveHashMap<string[]>(),
          );
          yield* Ref.set(
            state.fqnIndex,
            new CaseInsensitiveHashMap<string[]>(),
          );
          yield* Ref.set(
            state.symbolIdIndex,
            new HashMap<string, ApexSymbol>(),
          );
          yield* Ref.set(
            state.symbolFileMap,
            new CaseInsensitiveHashMap<string>(),
          );
          yield* Ref.set(
            state.fileToSymbolTable,
            new CaseInsensitiveHashMap<SymbolTable>(),
          );
          yield* Ref.set(
            state.symbolToFiles,
            new CaseInsensitiveHashMap<string[]>(),
          );
        }),

      getStats: () =>
        Effect.gen(function* () {
          const symIdx = yield* getSymbolIdIndex();
          const fileIdx = yield* Ref.get(state.fileIndex);
          return {
            totalSymbols: symIdx.size,
            totalFiles: fileIdx.size,
          };
        }),
    };
  }),
);
