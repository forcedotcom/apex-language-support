/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { Position } from '../../types/symbol';
import type {
  SymbolResolutionContext,
  SymbolResolutionResult,
} from '../../types/ISymbolManager';
import { SymbolIndexStore } from '../services/symbolIndexStore';
import { CacheStore } from '../services/cacheStore';
import { FileStateStore } from '../services/fileStateStore';
import { ResourceLoaderService } from '../services/ResourceLoaderService';
import { findByName, getSymbolTableForFile } from './symbolLookup';
import { createResolutionContextFromSymbolTable } from './resolutionContext';

type ResolutionDeps =
  SymbolIndexStore | CacheStore | FileStateStore | ResourceLoaderService;

/** Resolve a symbol by name with context */
export const resolveSymbol = (
  name: string,
  context: SymbolResolutionContext,
): Effect.Effect<SymbolResolutionResult, never, ResolutionDeps> =>
  Effect.gen(function* () {
    const candidates = yield* findByName(name);

    if (candidates.length === 0) {
      return {
        symbol: null,
        fileUri: context.sourceFile,
        confidence: 0,
        isAmbiguous: false,
        resolutionContext: 'No symbols found with this name',
      };
    }

    if (candidates.length === 1) {
      return {
        symbol: candidates[0],
        fileUri: candidates[0].key.path[0] || context.sourceFile,
        confidence: 0.9,
        isAmbiguous: false,
        resolutionContext: 'Single symbol found',
      };
    }

    return {
      symbol: candidates[0],
      fileUri: candidates[0].key.path[0] || context.sourceFile,
      confidence: 0.5,
      isAmbiguous: true,
      candidates,
      resolutionContext: 'Multiple candidates found',
    };
  });

/** Create comprehensive resolution context for symbol lookup */
export const createResolutionContext = (
  _documentText: string,
  position: Position,
  fileUri: string,
): Effect.Effect<SymbolResolutionContext, never, ResolutionDeps> =>
  Effect.gen(function* () {
    const symbolTable = yield* getSymbolTableForFile(fileUri);
    return createResolutionContextFromSymbolTable(
      symbolTable,
      position,
      fileUri,
    );
  });

/** Create enhanced resolution context with request type information */
export const createResolutionContextWithRequestType = (
  documentText: string,
  position: Position,
  sourceFile: string,
  requestType?: string,
): Effect.Effect<
  SymbolResolutionContext & { requestType?: string; position?: Position },
  never,
  ResolutionDeps
> =>
  Effect.gen(function* () {
    const baseContext = yield* createResolutionContext(
      documentText,
      position,
      sourceFile,
    );
    return { ...baseContext, requestType, position };
  });

/** Get the current detail level for a file */
export const getDetailLevelForFile = (
  fileUri: string,
): Effect.Effect<
  | import('../../parser/listeners/LayeredSymbolListenerBase').DetailLevel
  | undefined,
  never,
  FileStateStore
> =>
  Effect.gen(function* () {
    const fileState = yield* FileStateStore;
    return yield* fileState.getDetailLevel(fileUri);
  });
