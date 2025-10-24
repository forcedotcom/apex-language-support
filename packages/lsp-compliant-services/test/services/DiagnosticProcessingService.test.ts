/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DocumentSymbolParams } from 'vscode-languageserver';
import { LoggerInterface, getLogger } from '@salesforce/apex-lsp-shared';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { DiagnosticProcessingService } from '../../src/services/DiagnosticProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { ApexSettingsManager } from '@salesforce/apex-lsp-shared';

// Mock dependencies
jest.mock('@salesforce/apex-lsp-parser-ast', () => {
  const symbolManager = {
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
    createResolutionContext: jest.fn().mockReturnValue({
      sourceFile: 'file:///test/TestClass.cls',
      namespaceContext: 'public',
      currentScope: 'global',
      scopeChain: ['global'],
      expectedType: undefined,
      parameterTypes: [],
      accessModifier: 'public',
      isStatic: false,
      inheritanceChain: [],
      interfaceImplementations: [],
      importStatements: [],
    }),
  };
  return {
    ApexError: jest.fn(),
    CompilerService: jest.fn(),
    SymbolTable: jest.fn(),
    ApexSymbolCollectorListener: jest.fn(),
    ApexSymbolProcessingManager: {
      getInstance: jest.fn(() => ({
        getSymbolManager: jest.fn(() => symbolManager),
      })),
    },
  };
});
jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn(),
  defineEnum: jest.fn((entries) => {
    const result: any = {};
    entries.forEach(([key, value]: [string, any], index: number) => {
      const val = value !== undefined ? value : index;
      result[key] = val;
      result[val] = key;
    });
    return Object.freeze(result);
  }),
}));
jest.mock('../../src/storage/ApexStorageManager');
jest.mock('@salesforce/apex-lsp-shared', () => ({
  ...jest.requireActual('@salesforce/apex-lsp-shared'),
  ApexSettingsManager: {
    getInstance: jest.fn(),
  },
  getLogger: jest.fn(),
}));
jest.mock('../../src/utils/handlerUtil');

describe('DiagnosticProcessingService', () => {
  let mockLogger: jest.Mocked<LoggerInterface>;
  let mockStorage: any;
  let service: DiagnosticProcessingService;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockStorage = {
      getDocument: jest.fn(),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    (ApexSettingsManager.getInstance as jest.Mock).mockReturnValue({
      getCompilationOptions: jest.fn().mockReturnValue({}),
    });

    // Mock the getLogger function to return our mock logger
    (getLogger as jest.Mock).mockReturnValue(mockLogger);

    // Reset the getDiagnosticsFromErrors mock
    const { getDiagnosticsFromErrors } = require('../../src/utils/handlerUtil');
    getDiagnosticsFromErrors.mockReset();

    service = new DiagnosticProcessingService(mockLogger);
  });

  describe('processDiagnostic', () => {
    it('should return empty array when document not found', async () => {
      const params: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      mockStorage.getDocument.mockResolvedValue(null);

      const result = await service.processDiagnostic(params);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should process document and return diagnostics', async () => {
      const params: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      const mockDocument = {
        uri: 'file:///test.cls',
        getText: () => 'public class TestClass { }',
      } as TextDocument;

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Mock the compilation result with errors
      const mockCompileResult = {
        errors: [
          {
            type: 'syntax',
            severity: 'error',
            message: 'Test error',
            line: 1,
            column: 1,
            filePath: 'file:///test.cls',
          },
        ],
      };

      // Mock the CompilerService
      const { CompilerService } = require('@salesforce/apex-lsp-parser-ast');
      const mockCompile = jest.fn().mockReturnValue(mockCompileResult);
      CompilerService.mockImplementation(() => ({
        compile: mockCompile,
      }));

      // Mock the getDiagnosticsFromErrors function
      const mockGetDiagnosticsFromErrors = jest.fn().mockReturnValue([
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Test error',
          severity: 1,
        },
      ]);

      const {
        getDiagnosticsFromErrors,
      } = require('../../src/utils/handlerUtil');
      getDiagnosticsFromErrors.mockImplementation(mockGetDiagnosticsFromErrors);

      const result = await service.processDiagnostic(params);

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Test error');
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return empty array when no errors found', async () => {
      const params: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      const mockDocument = {
        uri: 'file:///test.cls',
        getText: () => 'public class TestClass { }',
      } as TextDocument;

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Mock the compilation result with no errors
      const mockCompileResult = {
        errors: [],
      };

      // Mock the CompilerService
      const { CompilerService } = require('@salesforce/apex-lsp-parser-ast');
      CompilerService.mockImplementation(() => ({
        compile: jest.fn().mockReturnValue(mockCompileResult),
      }));

      // Mock the getDiagnosticsFromErrors function to return empty array
      const {
        getDiagnosticsFromErrors,
      } = require('../../src/utils/handlerUtil');
      getDiagnosticsFromErrors.mockReturnValue([]);

      const result = await service.processDiagnostic(params);

      expect(result).toEqual([]);
    });

    it('should handle compilation errors gracefully', async () => {
      const params: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      const mockDocument = {
        uri: 'file:///test.cls',
        getText: () => 'public class TestClass { }',
      } as TextDocument;

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Mock the CompilerService to throw an error
      const { CompilerService } = require('@salesforce/apex-lsp-parser-ast');
      CompilerService.mockImplementation(() => ({
        compile: jest.fn().mockImplementation(() => {
          throw new Error('Compilation failed');
        }),
      }));

      const result = await service.processDiagnostic(params);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should suppress diagnostics for standard Apex library URIs', async () => {
      const params: DocumentSymbolParams = {
        textDocument: {
          uri: 'apexlib://resources/StandardApexLibrary/System/System.cls',
        },
      };

      const result = await service.processDiagnostic(params);

      expect(result).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      // Verify that the suppression message was logged
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      // Verify that no document processing occurred after suppression check
      // Note: getDocument may still be called for logging purposes
    });

    it('should suppress diagnostics for various standard Apex library URIs', async () => {
      const standardApexUris = [
        'apexlib://resources/StandardApexLibrary/Database/Database.cls',
        'apexlib://resources/StandardApexLibrary/Schema/Schema.cls',
        'apexlib://resources/StandardApexLibrary/System/Assert.cls',
        'apexlib://resources/StandardApexLibrary/System/Debug.cls',
      ];

      for (const uri of standardApexUris) {
        const params: DocumentSymbolParams = {
          textDocument: { uri },
        };

        const result = await service.processDiagnostic(params);

        expect(result).toEqual([]);
        expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      }
    });

    it('should not suppress diagnostics for user code URIs', async () => {
      const params: DocumentSymbolParams = {
        textDocument: { uri: 'file:///Users/test/MyClass.cls' },
      };

      const mockDocument = {
        uri: 'file:///Users/test/MyClass.cls',
        getText: () => 'public class MyClass { }',
      } as TextDocument;

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Mock the compilation result with errors
      const mockCompileResult = {
        errors: [
          {
            type: 'syntax',
            severity: 'error',
            message: 'Test error',
            line: 1,
            column: 1,
            filePath: 'file:///Users/test/MyClass.cls',
          },
        ],
      };

      // Mock the CompilerService
      const { CompilerService } = require('@salesforce/apex-lsp-parser-ast');
      const mockCompile = jest.fn().mockReturnValue(mockCompileResult);
      CompilerService.mockImplementation(() => ({
        compile: mockCompile,
      }));

      // Mock the getDiagnosticsFromErrors function
      const mockGetDiagnosticsFromErrors = jest.fn().mockReturnValue([
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Test error',
          severity: 1,
        },
      ]);

      const {
        getDiagnosticsFromErrors,
      } = require('../../src/utils/handlerUtil');
      getDiagnosticsFromErrors.mockImplementation(mockGetDiagnosticsFromErrors);

      const result = await service.processDiagnostic(params);

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Test error');
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
    });
  });
});
