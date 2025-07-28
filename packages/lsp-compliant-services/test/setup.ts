/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Global mock setup for SymbolManagerFactory
jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
  SymbolManagerFactory: {
    setTestMode: jest.fn(),
    createSymbolManager: jest.fn().mockImplementation(() => ({
      findSymbolByName: jest.fn().mockReturnValue([]),
      findSymbolsInFile: jest.fn().mockReturnValue([]),
      findRelatedSymbols: jest.fn().mockReturnValue([]),
      resolveSymbol: jest.fn().mockReturnValue(null),
      findSymbolByFQN: jest.fn().mockReturnValue(null),
      findFilesForSymbol: jest.fn().mockReturnValue([]),
      addSymbol: jest.fn(),
      removeSymbol: jest.fn(),
      removeFile: jest.fn(),
      addSymbolTable: jest.fn(),
      refresh: jest.fn(),
      findReferencesTo: jest.fn().mockReturnValue([]),
      findReferencesFrom: jest.fn().mockReturnValue([]),
      analyzeDependencies: jest.fn().mockReturnValue({
        dependencies: [],
        dependents: [],
        impactScore: 0,
        circularDependencies: [],
      }),
      detectCircularDependencies: jest.fn().mockReturnValue([]),
      getImpactAnalysis: jest.fn().mockReturnValue({
        directImpact: [],
        indirectImpact: [],
        breakingChanges: [],
        migrationPath: [],
        riskAssessment: 'low',
      }),
      getSymbolMetrics: jest.fn().mockReturnValue(new Map()),
      computeMetrics: jest.fn().mockReturnValue({
        referenceCount: 0,
        dependencyCount: 0,
        dependentCount: 0,
        cyclomaticComplexity: 1,
        depthOfInheritance: 0,
        couplingScore: 0,
        impactScore: 0,
        changeImpactRadius: 0,
        refactoringRisk: 0,
        usagePatterns: [],
        accessPatterns: [],
        lifecycleStage: 'active',
      }),
      getMostReferencedSymbols: jest.fn().mockReturnValue([]),
      addSymbolsBatch: jest.fn(),
      analyzeDependenciesBatch: jest.fn().mockResolvedValue(new Map()),
      getRelationshipStats: jest.fn().mockReturnValue({
        totalReferences: 0,
        methodCalls: 0,
        fieldAccess: 0,
        typeReferences: 0,
        constructorCalls: 0,
        staticAccess: 0,
        importReferences: 0,
        relationshipTypeCounts: new Map(),
        mostCommonRelationshipType: null,
        leastCommonRelationshipType: null,
        averageReferencesPerType: 0,
      }),
      findSymbolsByPattern: jest.fn().mockReturnValue([]),
      getPerformanceStats: jest.fn().mockReturnValue({
        totalQueries: 0,
        averageQueryTime: 0,
        cacheHitRate: 0,
        slowQueries: [],
        memoryUsage: 0,
      }),
      clearCache: jest.fn(),
      getCacheStats: jest.fn().mockReturnValue({
        totalEntries: 0,
        totalSize: 0,
        hitCount: 0,
        missCount: 0,
        evictionCount: 0,
        hitRate: 0,
        averageEntrySize: 0,
        typeDistribution: new Map(),
        lastOptimization: 0,
      }),
      getStats: jest.fn().mockReturnValue({
        totalSymbols: 0,
        totalFiles: 0,
        totalReferences: 0,
        circularDependencies: 0,
        cacheHitRate: 0,
      }),
    })),
    reset: jest.fn(),
  },
}));
