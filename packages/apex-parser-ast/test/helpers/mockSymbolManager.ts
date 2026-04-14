/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

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
    addSymbol: jest.fn(),
    getSymbol: jest.fn().mockReturnValue(null),
    findSymbolByName: jest.fn().mockReturnValue([]),
    findSymbolByFQN: jest.fn().mockReturnValue(null),
    findFQNForStandardClass: jest.fn().mockReturnValue(null),
    findSymbolsInFile: jest.fn().mockReturnValue([]),
    findFilesForSymbol: jest.fn().mockReturnValue([]),
    resolveCrossFileReferencesForFile: jest.fn().mockReturnValue(Effect.void),
    resolveSymbol: jest.fn().mockReturnValue({
      symbol: null,
      fileUri: '',
      confidence: 0,
      isAmbiguous: false,
    }),
    getAllReferencesInFile: jest.fn().mockReturnValue([]),
    getAllSymbolsForCompletion: jest.fn().mockReturnValue([]),
    findReferencesTo: jest.fn().mockReturnValue([]),
    findReferencesFrom: jest.fn().mockReturnValue([]),
    findRelatedSymbols: jest.fn().mockReturnValue([]),
    analyzeDependencies: jest.fn().mockReturnValue({
      dependencies: [],
      dependents: [],
      impactScore: 0,
      circularDependencies: [],
    }),
    detectCircularDependencies: jest.fn().mockReturnValue([]),
    getStats: jest.fn().mockReturnValue({
      totalSymbols: 0,
      totalFiles: 0,
      totalReferences: 0,
      circularDependencies: 0,
      cacheHitRate: 0,
    }),
    clear: jest.fn(),
    removeFile: jest.fn(),
    addSymbolTable: jest.fn().mockReturnValue(Effect.void),
    registerSymbolTableForFile: jest.fn().mockReturnValue(
      Effect.succeed({
        decision: 'accepted-replace',
        fileUri: '',
        canonicalTable: {} as SymbolTable,
      } satisfies SymbolTableRegistrationResult),
    ),
    getSymbolTableForFile: jest.fn().mockReturnValue(undefined),
    optimizeMemory: jest.fn(),
    createResolutionContext: jest.fn().mockReturnValue({
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
    constructFQN: jest.fn().mockReturnValue(''),
    getContainingType: jest.fn().mockReturnValue(null),
    getAncestorChain: jest.fn().mockReturnValue([]),
    setCommentAssociations: jest.fn(),
    getBlockCommentsForSymbol: jest.fn().mockReturnValue([]),
    getReferencesAtPosition: jest.fn().mockReturnValue([]),
    getSymbolAtPosition: jest.fn().mockResolvedValue(null),
    getSymbolAtPositionWithinScope: jest.fn().mockResolvedValue(null),
    createResolutionContextWithRequestType: jest.fn().mockReturnValue({
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
    getGraphData: jest.fn().mockReturnValue({ nodes: [], edges: [] }),
    getGraphDataForFile: jest.fn().mockReturnValue({ nodes: [], edges: [] }),
    getGraphDataByType: jest.fn().mockReturnValue({ nodes: [], edges: [] }),
    getDetailLevelForFile: jest.fn().mockReturnValue(null),
    enrichToLevel: jest.fn().mockReturnValue(Effect.void),
    resolveWithEnrichment: jest.fn().mockReturnValue(Effect.succeed(null)),
    isStandardLibraryType: jest.fn().mockReturnValue(false),

    // SymbolProvider methods
    find: jest.fn().mockReturnValue(null),
    findScalarKeywordType: jest.fn().mockReturnValue(null),
    findSObjectType: jest.fn().mockReturnValue(null),
    findExternalType: jest.fn().mockReturnValue(null),
    findInDefaultNamespaceOrder: jest.fn().mockReturnValue(null),
    findInImplicitFileNamespaceSlot: jest.fn().mockReturnValue(null),
    findInExplicitNamespace: jest.fn().mockReturnValue(null),
    isBuiltInNamespace: jest.fn().mockReturnValue(false),
    isSObjectContainerNamespace: jest.fn().mockReturnValue(false),

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
