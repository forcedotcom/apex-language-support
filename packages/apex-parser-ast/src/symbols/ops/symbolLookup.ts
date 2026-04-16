/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { ApexSymbol, SymbolTable } from '../../types/symbol';
import { SymbolIndexStore } from '../services/symbolIndexStore';
import { CacheStore } from '../services/cacheStore';
import { FileStateStore } from '../services/fileStateStore';
import { createFileUri, extractFilePath } from '../../types/ProtocolHandler';
import { extractFilePathFromUri } from '../../types/UriBasedIdGenerator';
import { isApexKeyword, BUILTIN_TYPE_NAMES } from '../../utils/ApexKeywords';
import type { ApexComment } from '../../parser/listeners/ApexCommentCollectorListener';
import { ResourceLoaderService } from '../services/ResourceLoaderService';
import { BuiltInTypeTablesImpl } from '../../utils/BuiltInTypeTables';
import { CommentAssociator } from '../../utils/CommentAssociator';

/** Look up a symbol by ID, with cache layer */
export const getSymbol = (
  symbolId: string,
): Effect.Effect<ApexSymbol | null, never, SymbolIndexStore | CacheStore> =>
  Effect.gen(function* () {
    const cache = yield* CacheStore;
    const cached = yield* cache.get<ApexSymbol>(symbolId);
    if (cached) return cached;

    const index = yield* SymbolIndexStore;
    const symbol = yield* index.getSymbol(symbolId);
    if (symbol) {
      yield* cache.set(symbolId, symbol, 'symbol_lookup');
    }
    return symbol;
  });

/** Find all symbols with a given name, with keyword guard and cache */
export const findByName = (
  name: string,
): Effect.Effect<
  ApexSymbol[],
  never,
  SymbolIndexStore | CacheStore | ResourceLoaderService
> =>
  Effect.gen(function* () {
    const loader = yield* ResourceLoaderService;
    const isStandardNamespace = loader.isStdApexNamespace(name);
    const isStdlibPrimitiveTypeName = BUILTIN_TYPE_NAMES.has(
      name.toLowerCase(),
    );

    if (
      isApexKeyword(name) &&
      !isStandardNamespace &&
      !isStdlibPrimitiveTypeName
    ) {
      return [];
    }

    const cache = yield* CacheStore;
    const cacheKey = `symbol_name_${name.toLowerCase()}`;
    const cached = yield* cache.get<ApexSymbol[]>(cacheKey);
    if (cached) return cached;

    const index = yield* SymbolIndexStore;
    const symbols = yield* index.findByName(name);
    yield* cache.set(cacheKey, symbols, 'symbol_lookup');
    return symbols;
  });

/** Find a symbol by its fully qualified name, with cache */
export const findByFQN = (
  fqn: string,
): Effect.Effect<ApexSymbol | null, never, SymbolIndexStore | CacheStore> =>
  Effect.gen(function* () {
    const cache = yield* CacheStore;
    const cacheKey = `symbol_fqn_${fqn}`;
    const cached = yield* cache.get<ApexSymbol>(cacheKey);
    if (cached) return cached;

    const index = yield* SymbolIndexStore;
    const symbol = yield* index.findByFQN(fqn);
    if (symbol) {
      yield* cache.set(cacheKey, symbol, 'fqn_lookup');
    }
    return symbol ?? null;
  });

/** Find all symbols matching a given FQN */
export const findSymbolsByFQN = (
  fqn: string,
): Effect.Effect<ApexSymbol[], never, SymbolIndexStore> =>
  Effect.gen(function* () {
    const index = yield* SymbolIndexStore;
    return yield* index.findSymbolsByFQN(fqn);
  });

/** Find all symbols in a specific file, with cache and URI normalization */
export const findInFile = (
  fileUri: string,
): Effect.Effect<ApexSymbol[], never, SymbolIndexStore | CacheStore> =>
  Effect.gen(function* () {
    const cache = yield* CacheStore;
    const cacheKey = `file_symbols_${fileUri}`;
    const cached = yield* cache.get<ApexSymbol[]>(cacheKey);
    if (cached) return cached;

    const properUri = createFileUri(fileUri);
    const normalizedUri = extractFilePathFromUri(properUri);
    const index = yield* SymbolIndexStore;
    const symbols = yield* index.getSymbolsInFile(normalizedUri);
    yield* cache.set(cacheKey, symbols, 'file_lookup');
    return symbols;
  });

/** Find files containing a symbol with the given name */
export const findFilesForSymbol = (
  name: string,
): Effect.Effect<string[], never, SymbolIndexStore> =>
  Effect.gen(function* () {
    const index = yield* SymbolIndexStore;
    const fileUris = yield* index.getFilesForSymbol(name);
    return fileUris.map((fileUri) =>
      fileUri.startsWith('file://') ? extractFilePath(fileUri) : fileUri,
    );
  });

/** Get all symbols across all files for completion purposes */
export const getAllSymbolsForCompletion = (): Effect.Effect<
  ApexSymbol[],
  never,
  SymbolIndexStore | CacheStore | FileStateStore
> =>
  Effect.gen(function* () {
    const fileState = yield* FileStateStore;
    const allMeta = yield* fileState.getAllFileMetadata();
    const symbols: ApexSymbol[] = [];
    for (const fileUri of allMeta.keys()) {
      const fileSymbols = yield* findInFile(fileUri);
      symbols.push(...fileSymbols);
    }
    return symbols;
  });

/** Get SymbolTable for a file */
export const getSymbolTableForFile = (
  fileUri: string,
): Effect.Effect<SymbolTable | undefined, never, SymbolIndexStore> =>
  Effect.gen(function* () {
    const index = yield* SymbolIndexStore;
    return yield* index.getSymbolTableForFile(fileUri);
  });

/** Get the FQN for a standard Apex class */
export const findFQNForStandardClass = (
  className: string,
): Effect.Effect<string | null, never, ResourceLoaderService> =>
  Effect.gen(function* () {
    const loader = yield* ResourceLoaderService;
    try {
      return yield* Effect.promise(() => loader.resolveClassFqn(className));
    } catch {
      return null;
    }
  });

/** Check if a type name represents a standard library type */
export const isStandardLibraryType = (
  name: string,
): Effect.Effect<boolean, never, ResourceLoaderService> =>
  Effect.gen(function* () {
    try {
      const builtIn = BuiltInTypeTablesImpl.getInstance();
      if (builtIn.findType(name.toLowerCase())) return true;
    } catch {
      // BuiltInTypeTables not initialized
    }

    const loader = yield* ResourceLoaderService;
    const parts = name.split('.');
    if (parts.length === 2) {
      const [namespace, cls] = parts;
      if (!loader.isStdApexNamespace(namespace)) return false;
      return loader.hasClass(`${namespace}.${cls}.cls`);
    }
    if (parts.length === 1) {
      return loader.findNamespaceForClass(parts[0]).size > 0;
    }
    return false;
  });

/** Get documentation block comments associated with a symbol */
export const getBlockCommentsForSymbol = (
  symbol: ApexSymbol,
): Effect.Effect<ApexComment[], never, FileStateStore> =>
  Effect.gen(function* () {
    const fileUri = symbol.fileUri || '';
    if (!fileUri) return [];
    const fileState = yield* FileStateStore;
    const associations = yield* fileState.getCommentAssociations(fileUri);
    if (!associations || associations.length === 0) return [];
    const key =
      symbol.key?.unifiedId ||
      `${symbol.kind}:${symbol.name}:${symbol.fileUri}`;
    const associator = new CommentAssociator();
    return associator.getDocumentationForSymbol(key, associations);
  });
