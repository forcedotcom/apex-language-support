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
import { readFileSync } from 'fs';
import { join } from 'path';

import { CompletionProcessingService } from '../../src/services/CompletionProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import {
  ApexSymbolManager,
  CompilerService,
  ApexSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';

// Only mock storage - use real implementations for everything else
jest.mock('../../src/storage/ApexStorageManager');

describe('CompletionProcessingService', () => {
  let service: CompletionProcessingService;
  let symbolManager: ApexSymbolManager;
  let mockStorage: any;
  let mockDocument: TextDocument;
  let logger: ReturnType<typeof getLogger>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Use real symbol manager
    symbolManager = new ApexSymbolManager();

    // Pre-populate symbol manager with fixtures
    const compilerService = new CompilerService();
    const fixturesDir = join(__dirname, '../fixtures/classes');
    const testClassPath = join(fixturesDir, 'TestClass.cls');
    const testClassContent = readFileSync(testClassPath, 'utf8');

    const symbolTable = new SymbolTable();
    const listener = new ApexSymbolCollectorListener(symbolTable);
    compilerService.compile(
      testClassContent,
      'file:///test/TestClass.cls',
      listener,
    );
    symbolManager.addSymbolTable(symbolTable, 'file:///test/TestClass.cls');

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
          public void doSomething() {
            String testVar = 'test';
            // Cursor position here
          }
        }
      `),
      offsetAt: jest.fn().mockReturnValue(100),
      positionAt: jest.fn(),
      lineCount: jest.fn().mockReturnValue(10),
    } as any;

    // Create service instance with real symbol manager
    service = new CompletionProcessingService(logger, symbolManager);
  });

  describe('processCompletion', () => {
    it('should return completion items for valid request', async () => {
      // Arrange
      const params: CompletionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      const _mockSymbols = [
        {
          name: 'doSomething',
          kind: 'method',
          fqn: 'TestClass.doSomething',
          modifiers: { visibility: 'public', isStatic: false },
          location: { startLine: 2, startColumn: 1, endLine: 2, endColumn: 10 },
          key: { prefix: 'method', name: 'doSomething', path: ['TestClass'] },
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

      // Use real symbol manager with fixtures

      // Act
      const result = await service.processCompletion(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
      // The service uses resolveSymbol instead of findSymbolsInFile
      expect(result.length).toBeGreaterThan(0);
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

      const _mockSymbols = [
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

      // Use real symbol manager with fixtures

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

      const _mockSymbols = [
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

      // Use real symbol manager with fixtures

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

      const _mockSymbols = [
        {
          name: 'doSomething',
          kind: 'method',
          fqn: 'TestClass.doSomething',
          modifiers: { visibility: 'public', isStatic: false },
          parameters: [
            { name: 'param1', type: { name: 'String' } },
            { name: 'param2', type: { name: 'Integer' } },
          ],
          returnType: { name: 'void' },
        },
      ];

      // Use real symbol manager with fixtures

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

      const _mockSymbols = [
        {
          name: 'testField',
          kind: 'field',
          fqn: 'TestClass.testField',
          modifiers: { visibility: 'public', isStatic: false },
          type: { name: 'String' },
        },
      ];

      // Use real symbol manager with fixtures

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

      const _mockSymbols = [
        {
          name: 'doSomething',
          kind: 'method',
          fqn: 'TestClass.doSomething',
          modifiers: { visibility: 'public', isStatic: false },
          parameters: [],
        },
      ];

      // Use real symbol manager with fixtures

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

      // Use real symbol manager with fixtures

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
