/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Context, Effect, Layer } from 'effect';
import type {
  ApexSymbol,
  SymbolTable,
  Position,
  SymbolResolutionStrategy,
} from '../../types/symbol';
import type {
  SymbolResolutionContext,
  SymbolResolutionResult,
} from '../../types/ISymbolManager';
import type { EnumValue } from '@salesforce/apex-lsp-shared';
import type {
  ReferenceResult,
  ReferenceType,
  DependencyAnalysis,
  SymbolTableRegistrationResult,
} from '../ApexSymbolRefManager';
import type { SymbolReference } from '../../types/symbolReference';
import type {
  ApexComment,
  CommentAssociation,
} from '../../parser/listeners/ApexCommentCollectorListener';
import type {
  GraphData,
  FileGraphData,
  TypeGraphData,
} from '../../types/graph';
import type { DetailLevel } from '../../parser/listeners/LayeredSymbolListenerBase';
import type { FQNOptions } from '../../utils/FQNUtils';
import { SymbolIndexStore as SymbolIndexStoreTag } from './symbolIndexStore';
import type { SymbolIndexStore } from './symbolIndexStore';
import { ReferenceStore as ReferenceStoreTag } from './referenceStore';
import type { ReferenceStore } from './referenceStore';
import type { CacheStore } from './cacheStore';
import type { FileStateStore } from './fileStateStore';
import type { ConcurrencyGuards } from './concurrencyGuards';

import {
  getSymbol,
  findByName,
  findByFQN,
  findInFile,
  findFilesForSymbol,
  getAllSymbolsForCompletion,
  getSymbolTableForFile,
  findFQNForStandardClass,
  isStandardLibraryType,
  getBlockCommentsForSymbol,
} from '../ops/symbolLookup';
import {
  getContainingType,
  getAncestorChain,
  constructFQN,
} from '../ops/typeHierarchy';
import {
  findReferencesTo,
  findReferencesFrom,
  findRelatedSymbols,
  getReferencesAtPosition,
  getAllReferencesInFile,
} from '../ops/referenceOps';
import {
  analyzeDependencies,
  detectCircularDependencies,
  getGraphData,
  getGraphDataForFile,
  getGraphDataByType,
} from '../ops/graphAnalysis';
import {
  find,
  findScalarKeywordType,
  findSObjectType,
  findExternalType,
  findInDefaultNamespaceOrder,
  findInImplicitFileNamespaceSlot,
  findInExplicitNamespace,
  isBuiltInNamespace,
  isSObjectContainerNamespace,
} from '../ops/symbolProvider';
import {
  removeFile,
  clear,
  optimizeMemory,
  setCommentAssociations,
} from '../ops/symbolMutation';
import {
  resolveSymbol,
  createResolutionContext,
  createResolutionContextWithRequestType,
  getDetailLevelForFile,
} from '../ops/symbolResolution';

/**
 * Effect-based ISymbolManager interface.
 * All methods return Effect — the target API for the decomposed architecture.
 * Extends SymbolProvider methods (also Effect-returning).
 */
export interface IEffectSymbolManagerShape {
  // SymbolProvider methods
  readonly find: (
    referencingType: ApexSymbol,
    fullName: string,
  ) => Effect.Effect<ApexSymbol | null>;
  readonly findScalarKeywordType: (
    name: string,
  ) => Effect.Effect<ApexSymbol | null>;
  readonly findSObjectType: (name: string) => Effect.Effect<ApexSymbol | null>;
  readonly findExternalType: (
    name: string,
    packageName: string,
  ) => Effect.Effect<ApexSymbol | null>;
  readonly findInDefaultNamespaceOrder: (
    name: string,
    referencingType: ApexSymbol,
  ) => Effect.Effect<ApexSymbol | null>;
  readonly findInImplicitFileNamespaceSlot: (
    name: string,
    slot: number,
    referencingType: ApexSymbol,
  ) => Effect.Effect<ApexSymbol | null>;
  readonly findInExplicitNamespace: (
    namespaceName: string,
    typeName: string,
    referencingType: ApexSymbol,
  ) => Effect.Effect<ApexSymbol | null>;
  readonly isBuiltInNamespace: (
    namespaceName: string,
  ) => Effect.Effect<boolean>;
  readonly isSObjectContainerNamespace: (
    namespaceName: string,
  ) => Effect.Effect<boolean>;

  // ISymbolManager methods
  readonly addSymbol: (
    symbol: ApexSymbol,
    fileUri: string,
  ) => Effect.Effect<void>;
  readonly getSymbol: (symbolId: string) => Effect.Effect<ApexSymbol | null>;
  readonly findSymbolByName: (name: string) => Effect.Effect<ApexSymbol[]>;
  readonly findSymbolByFQN: (fqn: string) => Effect.Effect<ApexSymbol | null>;
  readonly findFQNForStandardClass: (
    className: string,
  ) => Effect.Effect<string | null>;
  readonly findSymbolsInFile: (fileUri: string) => Effect.Effect<ApexSymbol[]>;
  readonly findFilesForSymbol: (name: string) => Effect.Effect<string[]>;
  readonly resolveCrossFileReferencesForFile: (
    fileUri: string,
  ) => Effect.Effect<void>;
  readonly resolveSymbol: (
    name: string,
    context: SymbolResolutionContext,
  ) => Effect.Effect<SymbolResolutionResult>;
  readonly getAllReferencesInFile: (
    fileUri: string,
  ) => Effect.Effect<SymbolReference[]>;
  readonly getAllSymbolsForCompletion: () => Effect.Effect<ApexSymbol[]>;
  readonly findReferencesTo: (
    symbol: ApexSymbol,
  ) => Effect.Effect<ReferenceResult[]>;
  readonly findReferencesFrom: (
    symbol: ApexSymbol,
  ) => Effect.Effect<ReferenceResult[]>;
  readonly findRelatedSymbols: (
    symbol: ApexSymbol,
    relationshipType: EnumValue<typeof ReferenceType>,
  ) => Effect.Effect<ApexSymbol[]>;
  readonly analyzeDependencies: (
    symbol: ApexSymbol,
  ) => Effect.Effect<DependencyAnalysis>;
  readonly detectCircularDependencies: () => Effect.Effect<string[][]>;
  readonly getStats: () => Effect.Effect<{
    totalSymbols: number;
    totalFiles: number;
    totalReferences: number;
    circularDependencies: number;
    cacheHitRate: number;
  }>;
  readonly clear: () => Effect.Effect<void>;
  readonly removeFile: (fileUri: string) => Effect.Effect<void>;
  readonly addSymbolTable: (
    symbolTable: SymbolTable,
    fileUri: string,
    documentVersion?: number,
    hasErrors?: boolean,
  ) => Effect.Effect<void>;
  readonly registerSymbolTableForFile: (
    symbolTable: SymbolTable,
    fileUri: string,
    options?: { mergeReferences?: boolean; hasErrors?: boolean },
  ) => Effect.Effect<SymbolTableRegistrationResult>;
  readonly getSymbolTableForFile: (
    fileUri: string,
  ) => Effect.Effect<SymbolTable | undefined>;
  readonly optimizeMemory: () => Effect.Effect<void>;
  readonly createResolutionContext: (
    documentText: string,
    position: Position,
    sourceFile: string,
  ) => Effect.Effect<SymbolResolutionContext>;
  readonly constructFQN: (
    symbol: ApexSymbol,
    options?: FQNOptions,
  ) => Effect.Effect<string>;
  readonly getContainingType: (
    symbol: ApexSymbol,
  ) => Effect.Effect<ApexSymbol | null>;
  readonly getAncestorChain: (
    symbol: ApexSymbol,
  ) => Effect.Effect<ApexSymbol[]>;
  readonly setCommentAssociations: (
    fileUri: string,
    associations: CommentAssociation[],
  ) => Effect.Effect<void>;
  readonly getBlockCommentsForSymbol: (
    symbol: ApexSymbol,
  ) => Effect.Effect<ApexComment[]>;
  readonly getReferencesAtPosition: (
    fileUri: string,
    position: { line: number; character: number },
  ) => Effect.Effect<SymbolReference[]>;
  readonly getSymbolAtPosition: (
    fileUri: string,
    position: { line: number; character: number },
    strategy?: SymbolResolutionStrategy,
  ) => Effect.Effect<ApexSymbol | null>;
  readonly getSymbolAtPositionWithinScope: (
    fileUri: string,
    position: { line: number; character: number },
  ) => Effect.Effect<ApexSymbol | null>;
  readonly createResolutionContextWithRequestType: (
    documentText: string,
    position: { line: number; character: number },
    sourceFile: string,
    requestType?: string,
  ) => Effect.Effect<
    SymbolResolutionContext & {
      requestType?: string;
      position?: { line: number; character: number };
    }
  >;
  readonly getGraphData: () => Effect.Effect<GraphData>;
  readonly getGraphDataForFile: (
    fileUri: string,
  ) => Effect.Effect<FileGraphData>;
  readonly getGraphDataByType: (
    symbolType: string,
  ) => Effect.Effect<TypeGraphData>;
  readonly getDetailLevelForFile: (
    fileUri: string,
  ) => Effect.Effect<DetailLevel | null>;
  readonly enrichToLevel: (
    fileUri: string,
    targetLevel: DetailLevel,
    documentText: string,
  ) => Effect.Effect<void>;
  readonly resolveWithEnrichment: <T>(
    fileUri: string,
    documentText: string,
    resolver: () => T | null,
  ) => Effect.Effect<T | null>;
  readonly isStandardLibraryType: (name: string) => Effect.Effect<boolean>;
}

/** Effect Tag for the new Effect-based ISymbolManager */
export class IEffectSymbolManager extends Context.Tag('IEffectSymbolManager')<
  IEffectSymbolManager,
  IEffectSymbolManagerShape
>() {}

/**
 * All data services required by the facade
 */
type FacadeDeps =
  | SymbolIndexStore
  | ReferenceStore
  | CacheStore
  | FileStateStore
  | ConcurrencyGuards;

/**
 * Live implementation of IEffectSymbolManager.
 * Thin facade: captures service context once, each method delegates
 * to standalone functions with context provided.
 *
 * For methods not yet extracted to standalone functions (addSymbol,
 * addSymbolTable, getSymbolAtPosition, etc.), the facade delegates
 * to the existing ApexSymbolManager instance passed at construction time.
 */
export const iEffectSymbolManagerFromLegacy = (
  legacyManager: import('../../types/ISymbolManager').ISymbolManager &
    import('../../namespace/NamespaceUtils').SymbolProvider,
): Layer.Layer<IEffectSymbolManager, never, FacadeDeps> =>
  Layer.effect(
    IEffectSymbolManager,
    Effect.gen(function* () {
      const ctx = yield* Effect.context<FacadeDeps>();
      const provide = <A, E>(
        eff: Effect.Effect<A, E, FacadeDeps>,
      ): Effect.Effect<A, E> => Effect.provide(eff, ctx);

      return {
        // SymbolProvider (standalone functions)
        find: (ref, name) => provide(find(ref, name)),
        findScalarKeywordType: (name) => findScalarKeywordType(name),
        findSObjectType: (name) => provide(findSObjectType(name)),
        findExternalType: (name, pkg) => provide(findExternalType(name, pkg)),
        findInDefaultNamespaceOrder: (name, ref) =>
          provide(findInDefaultNamespaceOrder(name, ref)),
        findInImplicitFileNamespaceSlot: (name, slot, ref) =>
          provide(findInImplicitFileNamespaceSlot(name, slot, ref)),
        findInExplicitNamespace: (ns, type, ref) =>
          provide(findInExplicitNamespace(ns, type, ref)),
        isBuiltInNamespace: (name) => isBuiltInNamespace(name),
        isSObjectContainerNamespace: (name) =>
          isSObjectContainerNamespace(name),

        // Lookups (standalone functions)
        getSymbol: (id) => provide(getSymbol(id)),
        findSymbolByName: (name) => provide(findByName(name)),
        findSymbolByFQN: (fqn) => provide(findByFQN(fqn)),
        findFQNForStandardClass: (cls) => findFQNForStandardClass(cls),
        findSymbolsInFile: (uri) => provide(findInFile(uri)),
        findFilesForSymbol: (name) => provide(findFilesForSymbol(name)),
        getAllSymbolsForCompletion: () => provide(getAllSymbolsForCompletion()),
        getSymbolTableForFile: (uri) => provide(getSymbolTableForFile(uri)),
        isStandardLibraryType: (name) => isStandardLibraryType(name),
        getBlockCommentsForSymbol: (sym) =>
          provide(getBlockCommentsForSymbol(sym)),

        // References (standalone functions)
        findReferencesTo: (sym) => provide(findReferencesTo(sym)),
        findReferencesFrom: (sym) => provide(findReferencesFrom(sym)),
        findRelatedSymbols: (sym, type) =>
          provide(findRelatedSymbols(sym, type)),
        getReferencesAtPosition: (uri, pos) =>
          provide(getReferencesAtPosition(uri, pos)),
        getAllReferencesInFile: (uri) => provide(getAllReferencesInFile(uri)),

        // Type hierarchy (standalone functions)
        getContainingType: (sym) => provide(getContainingType(sym)),
        getAncestorChain: (sym) => getAncestorChain(sym),
        constructFQN: (sym, opts) => provide(constructFQN(sym, opts)),

        // Analysis (standalone functions)
        analyzeDependencies: (sym) => provide(analyzeDependencies(sym)),
        detectCircularDependencies: () => provide(detectCircularDependencies()),
        getGraphData: () => provide(getGraphData()),
        getGraphDataForFile: (uri) => provide(getGraphDataForFile(uri)),
        getGraphDataByType: (type) => provide(getGraphDataByType(type)),

        // Resolution (standalone functions)
        resolveSymbol: (name, ctx) => provide(resolveSymbol(name, ctx)),
        createResolutionContext: (text, pos, file) =>
          provide(createResolutionContext(text, pos, file)),
        createResolutionContextWithRequestType: (text, pos, file, type) =>
          provide(
            createResolutionContextWithRequestType(text, pos, file, type),
          ),
        getDetailLevelForFile: (uri) =>
          provide(getDetailLevelForFile(uri)).pipe(
            Effect.map((level) => level ?? null),
          ),

        // Mutations (standalone functions)
        removeFile: (uri) => provide(removeFile(uri)),
        clear: () => provide(clear()),
        optimizeMemory: () => provide(optimizeMemory()),
        setCommentAssociations: (uri, assoc) =>
          provide(setCommentAssociations(uri, assoc)),

        // Stats (composed from services)
        getStats: () =>
          provide(
            Effect.gen(function* () {
              const idx = yield* SymbolIndexStoreTag;
              const idxStats = yield* idx.getStats();
              const refs = yield* ReferenceStoreTag;
              const refStats = yield* refs.getStats();
              return {
                totalSymbols: idxStats.totalSymbols,
                totalFiles: idxStats.totalFiles,
                totalReferences: refStats.totalReferences,
                circularDependencies: 0,
                cacheHitRate: 0,
              };
            }),
          ),

        // Legacy bridge — delegate to existing ApexSymbolManager
        addSymbol: (sym, uri) =>
          Effect.sync(() => legacyManager.addSymbol(sym, uri)),
        addSymbolTable: (st, uri, ver, err) =>
          legacyManager.addSymbolTable(st, uri, ver, err),
        registerSymbolTableForFile: (st, uri, opts) =>
          legacyManager.registerSymbolTableForFile(st, uri, opts),
        resolveCrossFileReferencesForFile: (uri) =>
          legacyManager.resolveCrossFileReferencesForFile(uri),
        getSymbolAtPosition: (uri, pos, strategy) =>
          Effect.promise(() =>
            legacyManager.getSymbolAtPosition(uri, pos, strategy),
          ),
        getSymbolAtPositionWithinScope: (uri, pos) =>
          Effect.promise(() =>
            legacyManager.getSymbolAtPositionWithinScope(uri, pos),
          ),
        enrichToLevel: (uri, level, text) =>
          legacyManager.enrichToLevel(uri, level, text),
        resolveWithEnrichment: (uri, text, resolver) =>
          legacyManager.resolveWithEnrichment(uri, text, resolver),
      };
    }),
  );
