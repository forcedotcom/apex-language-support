/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompletionParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { CompletionProcessingService } from '../../src/services/CompletionProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';

// Mock is now handled globally in test/setup.ts

// Mock ApexStorageManager
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

describe('CompletionProcessingService', () => {
  let service: CompletionProcessingService;
  let mockSymbolManager: any;
  let mockStorage: any;
  let mockDocument: TextDocument;
  let logger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Setup mock symbol manager
    mockSymbolManager = {
      findSymbolByName: jest.fn(),
      findSymbolsInFile: jest.fn(),
      findRelatedSymbols: jest.fn(),
      resolveSymbol: jest.fn(),
      findSymbolByFQN: jest.fn(),
      findFilesForSymbol: jest.fn(),
      addSymbol: jest.fn(),
      removeSymbol: jest.fn(),
      removeFile: jest.fn(),
      addSymbolTable: jest.fn(),
      refresh: jest.fn(),
      findReferencesTo: jest.fn(),
      findReferencesFrom: jest.fn(),
      analyzeDependencies: jest.fn(),
      detectCircularDependencies: jest.fn(),
      getImpactAnalysis: jest.fn(),
      getSymbolMetrics: jest.fn(),
      computeMetrics: jest.fn(),
      getMostReferencedSymbols: jest.fn(),
      addSymbolsBatch: jest.fn(),
      analyzeDependenciesBatch: jest.fn(),
      getRelationshipStats: jest.fn(),
      findSymbolsByPattern: jest.fn(),
      getPerformanceStats: jest.fn(),
      clearCache: jest.fn(),
      getCacheStats: jest.fn(),
    } as any;

    // The mock is now handled in the jest.mock above

    // Setup mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Setup mock document
    mockDocument = {
      uri: 'file:///test/TestClass.cls',
      getText: jest.fn().mockReturnValue(`
        public class TestClass {
          public void testMethod() {
            String testVar = 'test';
            // Cursor position here
          }
        }
      `),
      offsetAt: jest.fn().mockReturnValue(100),
      positionAt: jest.fn(),
      lineCount: jest.fn().mockReturnValue(10),
    } as any;

    // Create service instance
    service = new CompletionProcessingService(logger);
  });

  describe('processCompletion', () => {
    it('should return completion items for valid request', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const mockSymbols = [
        {
          name: 'testMethod',
          kind: 'method',
          fqn: 'TestClass.testMethod',
          modifiers: { visibility: 'public', isStatic: false },
          location: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 10 },
          key: { prefix: 'method', name: 'testMethod', path: ['TestClass'] },
          parentKey: { prefix: 'class', name: 'TestClass', path: [] },
        },
        {
          name: 'testField',
          kind: 'field',
          fqn: 'TestClass.testField',
          modifiers: { visibility: 'public', isStatic: false },
          location: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 10 },
          key: { prefix: 'field', name: 'testField', path: ['TestClass'] },
          parentKey: { prefix: 'class', name: 'TestClass', path: [] },
        },
      ];

      // Mock resolveSymbol to return symbols
      mockSymbolManager.resolveSymbol.mockReturnValue({
        symbol: mockSymbols[0],
        confidence: 0.8,
        resolutionContext: 'test context',
        filePath: 'file:///test/TestClass.cls',
        isAmbiguous: false,
      } as any);

      // Act
      const result = await service.processCompletion(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
      expect(mockSymbolManager.findSymbolsInFile).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
    });

    it('should handle document not found', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/NonexistentClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(null);

      // Act
      const result = await service.processCompletion(params);

      // Assert
      expect(result).toEqual([]);
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockRejectedValue(new Error('Storage error'));

      // Act
      const result = await service.processCompletion(params);

      // Assert
      expect(result).toEqual([]);
    });

    it('should filter completion items by context', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const mockSymbols = [
        {
          name: 'publicMethod',
          kind: 'method',
          fqn: 'TestClass.publicMethod',
          modifiers: { visibility: 'public', isStatic: false },
        },
        {
          name: 'privateMethod',
          kind: 'method',
          fqn: 'TestClass.privateMethod',
          modifiers: { visibility: 'private', isStatic: false },
        },
      ];

      mockSymbolManager.findSymbolsInFile.mockReturnValue(mockSymbols);

      // Act
      const result = await service.processCompletion(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Should include both public and private methods
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should include static methods when in static context', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const mockSymbols = [
        {
          name: 'staticMethod',
          kind: 'method',
          fqn: 'TestClass.staticMethod',
          modifiers: { visibility: 'public', isStatic: true },
        },
        {
          name: 'instanceMethod',
          kind: 'method',
          fqn: 'TestClass.instanceMethod',
          modifiers: { visibility: 'public', isStatic: false },
        },
      ];

      mockSymbolManager.findSymbolsInFile.mockReturnValue(mockSymbols);

      // Act
      const result = await service.processCompletion(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('context analysis', () => {
    it('should extract current scope correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          public void method1() {
            // Inside method1
          }
          public void method2() {
            // Inside method2
          }
        }
      `;

      // Act
      const scope = (service as any).extractCurrentScope(text, 50);

      // Assert
      expect(scope).toBeDefined();
    });

    it('should extract import statements correctly', () => {
      // Arrange
      const text = `
        import System.Debug;
        import System.String;
        
        public class TestClass {
          // Class content
        }
      `;

      // Act
      const imports = (service as any).extractImportStatements(text);

      // Assert
      expect(imports).toContain('import System.Debug;');
      expect(imports).toContain('import System.String;');
    });

    it('should extract namespace context correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          // Class content
        }
      `;

      // Act
      const namespace = (service as any).extractNamespaceContext(text);

      // Assert
      expect(namespace).toBeDefined();
    });

    it('should detect static context correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          public static void staticMethod() {
            // Static context
          }
        }
      `;

      // Act
      const isStatic = (service as any).isInStaticContext(text, 50);

      // Assert
      expect(typeof isStatic).toBe('boolean');
    });

    it('should extract access modifier context correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          private String privateField;
          public String publicField;
        }
      `;

      // Act
      const modifier = (service as any).getAccessModifierContext(text, 50);

      // Assert
      expect(['public', 'private', 'protected', 'global']).toContain(modifier);
    });

    it('should extract expected type correctly', () => {
      // Arrange
      const text = `
        public class TestClass {
          public void method() {
            String variable = // cursor here
          }
        }
      `;

      // Act
      const expectedType = (service as any).extractExpectedType(text, 80);

      // Assert
      expect(expectedType).toBeDefined();
    });
  });

  describe('completion item creation', () => {
    it('should create completion items with correct properties', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const mockSymbols = [
        {
          name: 'testMethod',
          kind: 'method',
          fqn: 'TestClass.testMethod',
          modifiers: { visibility: 'public', isStatic: false },
          parameters: [
            { name: 'param1', type: { name: 'String' } },
            { name: 'param2', type: { name: 'Integer' } },
          ],
          returnType: { name: 'void' },
        },
      ];

      mockSymbolManager.findSymbolsInFile.mockReturnValue(mockSymbols);

      // Act
      const result = await service.processCompletion(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const completionItem = result[0];
      expect(completionItem.label).toBeDefined();
      expect(completionItem.kind).toBeDefined();
      expect(completionItem.detail).toBeDefined();
      expect(completionItem.documentation).toBeDefined();
    });

    it('should handle symbols without parameters', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const mockSymbols = [
        {
          name: 'testField',
          kind: 'field',
          fqn: 'TestClass.testField',
          modifiers: { visibility: 'public', isStatic: false },
          type: { name: 'String' },
        },
      ];

      mockSymbolManager.findSymbolsInFile.mockReturnValue(mockSymbols);

      // Act
      const result = await service.processCompletion(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle symbols without return type', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const mockSymbols = [
        {
          name: 'testMethod',
          kind: 'method',
          fqn: 'TestClass.testMethod',
          modifiers: { visibility: 'public', isStatic: false },
          parameters: [],
        },
      ];

      mockSymbolManager.findSymbolsInFile.mockReturnValue(mockSymbols);

      // Act
      const result = await service.processCompletion(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should handle large number of symbols efficiently', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Create many mock symbols
      const mockSymbols = Array.from({ length: 1000 }, (_, i) => ({
        name: `method${i}`,
        kind: 'method',
        fqn: `TestClass.method${i}`,
        modifiers: { visibility: 'public', isStatic: false },
        parameters: [],
      }));

      mockSymbolManager.findSymbolsInFile.mockReturnValue(mockSymbols);

      const startTime = Date.now();

      // Act
      const result = await service.processCompletion(params);

      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
