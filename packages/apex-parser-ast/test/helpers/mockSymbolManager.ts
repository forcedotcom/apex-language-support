/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { vi } from 'vitest';
import { Effect, Layer } from 'effect';
import type { SymbolTable } from '../../src/types/symbol';
import type { ISymbolManager as ISymbolManagerInterface } from '../../src/types/ISymbolManager';
import type { IEffectSymbolManagerShape } from '../../src/symbols/services/symbolManagerFacade';
import { IEffectSymbolManager } from '../../src/symbols/services/symbolManagerFacade';
import { ISymbolManager } from '../../src/semantics/validation/ArtifactLoadingHelper';
import type { SymbolTableRegistrationResult } from '../../src/symbols/ApexSymbolRefManager';

/** Partial overrides for mock symbol manager */
export type MockSymbolManagerOverrides = Partial<ISymbolManagerInterface>;

/**
 * Create a mock ISymbolManager for tests. All methods return sensible defaults.
 * Pass overrides to customize specific methods.
 */
export function createMockSymbolManager(
  overrides: MockSymbolManagerOverrides = {},
): ISymbolManagerInterface {
  return {
    addSymbol: vi.fn().mockResolvedValue(undefined),
    getSymbol: vi.fn().mockResolvedValue(null),
    findSymbolByName: vi.fn().mockResolvedValue([]),
    findSymbolByFQN: vi.fn().mockResolvedValue(null),
    findFQNForStandardClass: vi.fn().mockResolvedValue(null),
    findSymbolsInFile: vi.fn().mockResolvedValue([]),
    findFilesForSymbol: vi.fn().mockResolvedValue([]),
    resolveCrossFileReferencesForFile: vi.fn().mockReturnValue(Effect.void),
    resolveSymbol: vi.fn().mockResolvedValue({
      symbol: null,
      fileUri: '',
      confidence: 0,
      isAmbiguous: false,
    }),
    getAllReferencesInFile: vi.fn().mockResolvedValue([]),
    getAllSymbolsForCompletion: vi.fn().mockResolvedValue([]),
    getVisibleSymbolsAtPosition: vi.fn().mockResolvedValue([]),
    findReferencesTo: vi.fn().mockResolvedValue([]),
    findReferencesFrom: vi.fn().mockResolvedValue([]),
    findRelatedSymbols: vi.fn().mockResolvedValue([]),
    analyzeDependencies: vi.fn().mockResolvedValue({
      dependencies: [],
      dependents: [],
      impactScore: 0,
      circularDependencies: [],
    }),
    detectCircularDependencies: vi.fn().mockResolvedValue([]),
    getStats: vi.fn().mockResolvedValue({
      totalSymbols: 0,
      totalFiles: 0,
      totalReferences: 0,
      circularDependencies: 0,
      cacheHitRate: 0,
    }),
    clear: vi.fn().mockResolvedValue(undefined),
    removeFile: vi.fn().mockResolvedValue(undefined),
    addSymbolTable: vi.fn().mockReturnValue(Effect.void),
    registerSymbolTableForFile: vi.fn().mockReturnValue(
      Effect.succeed({
        decision: 'accepted-replace',
        fileUri: '',
        canonicalTable: {} as SymbolTable,
      } satisfies SymbolTableRegistrationResult),
    ),
    getSymbolTableForFile: vi.fn().mockResolvedValue(undefined),
    optimizeMemory: vi.fn().mockResolvedValue(undefined),
    createResolutionContext: vi.fn().mockResolvedValue({
      sourceFile: '',
      importStatements: [],
      namespaceContext: '',
      currentScope: '',
      scopeChain: [],
      parameterTypes: [],
      accessModifier: 'public' as const,
      isStatic: false,
      inheritanceChain: [],
      interfaceImplementations: [],
    }),
    constructFQN: vi.fn().mockResolvedValue(''),
    getContainingType: vi.fn().mockResolvedValue(null),
    getAncestorChain: vi.fn().mockResolvedValue([]),
    setCommentAssociations: vi.fn().mockResolvedValue(undefined),
    getBlockCommentsForSymbol: vi.fn().mockResolvedValue([]),
    getReferencesAtPosition: vi.fn().mockResolvedValue([]),
    getIncompleteMemberAccessAtPosition: vi.fn().mockResolvedValue(null),
    getSymbolAtPosition: vi.fn().mockResolvedValue(null),
    getSymbolAtPositionWithinScope: vi.fn().mockResolvedValue(null),
    createResolutionContextWithRequestType: vi.fn().mockResolvedValue({
      sourceFile: '',
      importStatements: [],
      namespaceContext: '',
      currentScope: '',
      scopeChain: [],
      parameterTypes: [],
      accessModifier: 'public' as const,
      isStatic: false,
      inheritanceChain: [],
      interfaceImplementations: [],
    }),
    getGraphData: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
    getGraphDataForFile: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
    getGraphDataByType: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
    getDetailLevelForFile: vi.fn().mockResolvedValue(null),
    enrichToLevel: vi.fn().mockReturnValue(Effect.void),
    resolveWithEnrichment: vi.fn().mockReturnValue(Effect.succeed(null)),
    isStandardLibraryType: vi.fn().mockResolvedValue(false),

    // SymbolProvider methods
    find: vi.fn().mockResolvedValue(null),
    findScalarKeywordType: vi.fn().mockResolvedValue(null),
    findSObjectType: vi.fn().mockResolvedValue(null),
    findExternalType: vi.fn().mockResolvedValue(null),
    findInDefaultNamespaceOrder: vi.fn().mockResolvedValue(null),
    findInImplicitFileNamespaceSlot: vi.fn().mockResolvedValue(null),
    findInExplicitNamespace: vi.fn().mockResolvedValue(null),
    isBuiltInNamespace: vi.fn().mockResolvedValue(false),
    isSObjectContainerNamespace: vi.fn().mockResolvedValue(false),

    ...overrides,
  };
}

/**
 * Create a Layer that provides a mock ISymbolManager via the Effect Tag
 * used by validators in ArtifactLoadingHelper.
 */
export function createMockSymbolManagerLayer(
  overrides: MockSymbolManagerOverrides = {},
): Layer.Layer<typeof ISymbolManager> {
  return Layer.succeed(ISymbolManager, createMockSymbolManager(overrides));
}

/**
 * Create a mock IEffectSymbolManager Layer for testing the new facade.
 * All methods return Effect-wrapped default values.
 */
export function createMockEffectSymbolManagerLayer(
  overrides: Partial<IEffectSymbolManagerShape> = {},
): Layer.Layer<IEffectSymbolManager> {
  const defaults: IEffectSymbolManagerShape = {
    find: () => Effect.succeed(null),
    findScalarKeywordType: () => Effect.succeed(null),
    findSObjectType: () => Effect.succeed(null),
    findExternalType: () => Effect.succeed(null),
    findInDefaultNamespaceOrder: () => Effect.succeed(null),
    findInImplicitFileNamespaceSlot: () => Effect.succeed(null),
    findInExplicitNamespace: () => Effect.succeed(null),
    isBuiltInNamespace: () => Effect.succeed(false),
    isSObjectContainerNamespace: () => Effect.succeed(false),

    addSymbol: () => Effect.void,
    getSymbol: () => Effect.succeed(null),
    findSymbolByName: () => Effect.succeed([]),
    findSymbolByFQN: () => Effect.succeed(null),
    findFQNForStandardClass: () => Effect.succeed(null),
    findSymbolsInFile: () => Effect.succeed([]),
    findFilesForSymbol: () => Effect.succeed([]),
    resolveCrossFileReferencesForFile: () => Effect.void,
    resolveSymbol: () =>
      Effect.succeed({
        symbol: null,
        fileUri: '',
        confidence: 0,
        isAmbiguous: false,
      }),
    getAllReferencesInFile: () => Effect.succeed([]),
    getAllSymbolsForCompletion: () => Effect.succeed([]),
    findReferencesTo: () => Effect.succeed([]),
    findReferencesFrom: () => Effect.succeed([]),
    findRelatedSymbols: () => Effect.succeed([]),
    analyzeDependencies: () =>
      Effect.succeed({
        dependencies: [],
        dependents: [],
        impactScore: 0,
        circularDependencies: [],
      }),
    detectCircularDependencies: () => Effect.succeed([]),
    getStats: () =>
      Effect.succeed({
        totalSymbols: 0,
        totalFiles: 0,
        totalReferences: 0,
        circularDependencies: 0,
        cacheHitRate: 0,
      }),
    clear: () => Effect.void,
    removeFile: () => Effect.void,
    addSymbolTable: () => Effect.void,
    registerSymbolTableForFile: () =>
      Effect.succeed({
        decision: 'accepted-replace',
        fileUri: '',
        canonicalTable: {} as SymbolTable,
      } as SymbolTableRegistrationResult),
    getSymbolTableForFile: () => Effect.succeed(undefined),
    optimizeMemory: () => Effect.void,
    createResolutionContext: () =>
      Effect.succeed({
        sourceFile: '',
        importStatements: [],
        namespaceContext: '',
        currentScope: '',
        scopeChain: [],
        parameterTypes: [],
        accessModifier: 'public' as const,
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      }),
    constructFQN: () => Effect.succeed(''),
    getContainingType: () => Effect.succeed(null),
    getAncestorChain: () => Effect.succeed([]),
    setCommentAssociations: () => Effect.void,
    getBlockCommentsForSymbol: () => Effect.succeed([]),
    getReferencesAtPosition: () => Effect.succeed([]),
    getSymbolAtPosition: () => Effect.succeed(null),
    getSymbolAtPositionWithinScope: () => Effect.succeed(null),
    createResolutionContextWithRequestType: () =>
      Effect.succeed({
        sourceFile: '',
        importStatements: [],
        namespaceContext: '',
        currentScope: '',
        scopeChain: [],
        parameterTypes: [],
        accessModifier: 'public' as const,
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      }),
    getGraphData: () => Effect.succeed({ nodes: [], edges: [] } as any),
    getGraphDataForFile: () => Effect.succeed({ nodes: [], edges: [] } as any),
    getGraphDataByType: () => Effect.succeed({ nodes: [], edges: [] } as any),
    getDetailLevelForFile: () => Effect.succeed(null),
    enrichToLevel: () => Effect.void,
    resolveWithEnrichment: () => Effect.succeed(null),
    isStandardLibraryType: () => Effect.succeed(false),
  };

  return Layer.succeed(IEffectSymbolManager, { ...defaults, ...overrides });
}
