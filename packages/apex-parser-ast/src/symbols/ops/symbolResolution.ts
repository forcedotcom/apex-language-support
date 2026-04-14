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
import { findByName, findInFile } from './symbolLookup';

type ResolutionDeps = SymbolIndexStore | CacheStore | FileStateStore;

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
  documentText: string,
  position: Position,
  fileUri: string,
): Effect.Effect<SymbolResolutionContext, never, ResolutionDeps> =>
  Effect.gen(function* () {
    yield* findInFile(fileUri);

    const namespaceContext = extractNamespaceFromUri(fileUri);
    const currentScope = extractCurrentScope(documentText, position);
    const importStatements = extractImportStatements(documentText);
    const accessModifier = extractAccessModifier(documentText, position);

    return {
      sourceFile: fileUri,
      importStatements,
      namespaceContext,
      currentScope,
      scopeChain: [currentScope],
      parameterTypes: [],
      accessModifier,
      isStatic: false,
      inheritanceChain: [],
      interfaceImplementations: [],
    };
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

function extractNamespaceFromUri(fileUri: string): string {
  if (fileUri.includes('test')) return 'public';
  const match = fileUri.match(/\/([^\/]+)\.cls$/);
  return match ? match[1] : 'public';
}

function extractCurrentScope(documentText: string, position: Position): string {
  const lines = documentText.split('\n');
  const currentLine = lines[position.line] || '';
  if (currentLine.includes('public class')) return 'class';
  if (currentLine.includes('public static')) return 'static';
  if (currentLine.includes('public')) return 'instance';
  return 'global';
}

function extractAccessModifier(
  documentText: string,
  position: Position,
): 'public' | 'private' | 'protected' | 'global' {
  const lines = documentText.split('\n');
  const currentLine = lines[position.line] || '';
  if (currentLine.includes('private')) return 'private';
  if (currentLine.includes('protected')) return 'protected';
  if (currentLine.includes('global')) return 'global';
  return 'public';
}

function extractImportStatements(documentText: string): string[] {
  return documentText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('import '));
}
