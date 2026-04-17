/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexSymbol,
  SymbolResolutionStrategy,
  SymbolTable,
} from '../types/symbol';
import {
  ReferenceResult,
  DependencyAnalysis,
  ReferenceType,
  SymbolTableRegistrationResult,
} from '../symbols/ApexSymbolRefManager';
import { type EnumValue } from '@salesforce/apex-lsp-shared';
import { FQNOptions } from '../utils/FQNUtils';
import { SymbolReference } from '../types/symbolReference';
import type {
  ApexComment,
  CommentAssociation,
} from '../parser/listeners/ApexCommentCollectorListener';
import type { GraphData, FileGraphData, TypeGraphData } from '../types/graph';
import { Effect } from 'effect';
import type { DetailLevel } from '../parser/listeners/LayeredSymbolListenerBase';
import type { SymbolProvider } from '../namespace/NamespaceUtils';

/**
 * Context for symbol resolution
 */
export interface SymbolResolutionContext {
  sourceFile: string;
  sourceSymbol?: ApexSymbol;
  importStatements: string[];
  namespaceContext: string;
  currentScope: string;
  scopeChain: string[];
  expectedType?: string;
  parameterTypes: string[];
  returnType?: string;
  accessModifier: 'public' | 'private' | 'protected' | 'global';
  isStatic: boolean;
  relationshipType?: EnumValue<typeof ReferenceType>;
  inheritanceChain: string[];
  interfaceImplementations: string[];
}

/**
 * Result of symbol resolution
 */
export interface SymbolResolutionResult {
  symbol: ApexSymbol | null;
  fileUri: string;
  confidence: number;
  isAmbiguous: boolean;
  candidates?: ApexSymbol[];
  resolutionContext?: string;
}

/**
 * Interface defining the contract for symbol managers
 * This allows for both production and test implementations
 */
export interface ISymbolManager extends SymbolProvider {
  addSymbol(symbol: ApexSymbol, fileUri: string): Promise<void>;

  getSymbol(symbolId: string): Promise<ApexSymbol | null>;

  findSymbolByName(name: string): Promise<ApexSymbol[]>;

  findSymbolByFQN(fqn: string): Promise<ApexSymbol | null>;

  findFQNForStandardClass(className: string): Promise<string | null>;

  findSymbolsInFile(fileUri: string): Promise<ApexSymbol[]>;

  findFilesForSymbol(name: string): Promise<string[]>;

  resolveCrossFileReferencesForFile(
    fileUri: string,
  ): Effect.Effect<void, never, never>;

  resolveSymbol(
    name: string,
    context: SymbolResolutionContext,
  ): Promise<SymbolResolutionResult>;

  getAllReferencesInFile(fileUri: string): Promise<SymbolReference[]>;

  getAllSymbolsForCompletion(): Promise<ApexSymbol[]>;

  findReferencesTo(symbol: ApexSymbol): Promise<ReferenceResult[]>;

  findReferencesFrom(symbol: ApexSymbol): Promise<ReferenceResult[]>;

  findRelatedSymbols(
    symbol: ApexSymbol,
    relationshipType: EnumValue<typeof ReferenceType>,
  ): Promise<ApexSymbol[]>;

  analyzeDependencies(symbol: ApexSymbol): Promise<DependencyAnalysis>;

  detectCircularDependencies(): Promise<string[][]>;

  getStats(): Promise<{
    totalSymbols: number;
    totalFiles: number;
    totalReferences: number;
    circularDependencies: number;
    cacheHitRate: number;
  }>;

  clear(): Promise<void>;

  removeFile(fileUri: string): Promise<void>;

  addSymbolTable(
    symbolTable: SymbolTable,
    fileUri: string,
    documentVersion?: number,
    hasErrors?: boolean,
  ): Effect.Effect<void, never, never>;

  registerSymbolTableForFile(
    symbolTable: SymbolTable,
    fileUri: string,
    options?: {
      mergeReferences?: boolean;
      hasErrors?: boolean;
    },
  ): Effect.Effect<SymbolTableRegistrationResult, never, never>;

  getSymbolTableForFile(fileUri: string): Promise<SymbolTable | undefined>;

  optimizeMemory(): Promise<void>;

  createResolutionContext(
    documentText: string,
    position: any,
    sourceFile: string,
  ): Promise<SymbolResolutionContext>;

  constructFQN(symbol: ApexSymbol, options?: FQNOptions): Promise<string>;

  getContainingType(symbol: ApexSymbol): Promise<ApexSymbol | null>;

  getAncestorChain(symbol: ApexSymbol): Promise<ApexSymbol[]>;

  setCommentAssociations(
    fileUri: string,
    associations: CommentAssociation[],
  ): Promise<void>;

  getBlockCommentsForSymbol(symbol: ApexSymbol): Promise<ApexComment[]>;

  getReferencesAtPosition(
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<SymbolReference[]>;

  getSymbolAtPosition(
    fileUri: string,
    position: { line: number; character: number },
    strategy?: SymbolResolutionStrategy,
  ): Promise<ApexSymbol | null>;

  getSymbolAtPositionWithinScope(
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<ApexSymbol | null>;

  createResolutionContextWithRequestType(
    documentText: string,
    position: { line: number; character: number },
    sourceFile: string,
    requestType?: string,
  ): Promise<
    SymbolResolutionContext & {
      requestType?: string;
      position?: { line: number; character: number };
    }
  >;

  getGraphData(): Promise<GraphData>;

  getGraphDataForFile(fileUri: string): Promise<FileGraphData>;

  getGraphDataByType(symbolType: string): Promise<TypeGraphData>;

  getDetailLevelForFile(fileUri: string): Promise<DetailLevel | null>;

  enrichToLevel(
    fileUri: string,
    targetLevel: DetailLevel,
    documentText: string,
  ): Effect.Effect<void, never, never>;

  resolveWithEnrichment<T>(
    fileUri: string,
    documentText: string,
    resolver: () => T | null,
  ): Effect.Effect<T | null, never, never>;

  isStandardLibraryType(name: string): Promise<boolean>;
}
