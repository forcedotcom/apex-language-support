/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger, FindApexTestsResult } from '@salesforce/apex-lsp-shared';
import {
  ISymbolManager,
  SymbolKind,
  TypeSymbol,
  MethodSymbol,
  ScopeSymbol,
} from '@salesforce/apex-lsp-parser-ast';
import { FindApexTestsCommandHandler } from '../../../src/services/commands/FindApexTestsCommandHandler';

describe('FindApexTestsCommandHandler', () => {
  let handler: FindApexTestsCommandHandler;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let logger: any;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = getLogger();

    // Setup mock symbol manager
    mockSymbolManager = {
      getAllSymbolsForCompletion: jest.fn(),
      addSymbol: jest.fn(),
      getSymbol: jest.fn(),
      findSymbolByName: jest.fn(),
      findSymbolByFQN: jest.fn(),
      findSymbolsInFile: jest.fn(),
      findFilesForSymbol: jest.fn(),
      resolveSymbol: jest.fn(),
      getAllReferencesInFile: jest.fn(),
      findReferencesTo: jest.fn(),
      findReferencesFrom: jest.fn(),
      findRelatedSymbols: jest.fn(),
      analyzeDependencies: jest.fn(),
      detectCircularDependencies: jest.fn(),
      getStats: jest.fn(),
      clear: jest.fn(),
      removeFile: jest.fn(),
      optimizeMemory: jest.fn(),
      createResolutionContext: jest.fn(),
      constructFQN: jest.fn(),
      getContainingType: jest.fn(),
      getAncestorChain: jest.fn(),
      getReferencesAtPosition: jest.fn(),
      getSymbolAtPosition: jest.fn(),
    } as any;

    handler = new FindApexTestsCommandHandler();
  });

  describe('commandName', () => {
    it('should have correct command name', () => {
      expect(handler.commandName).toBe('apex.findApexTests');
    });
  });

  describe('execute', () => {
    it('should find test classes with test methods', async () => {
      // Arrange
      const testClass: TypeSymbol = {
        id: 'file:///test/TestClass.cls:class:TestClass',
        name: 'TestClass',
        kind: SymbolKind.Class,
        fileUri: 'file:///test/TestClass.cls',
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 20,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 13,
            endLine: 2,
            endColumn: 22,
          },
        },
        parentId: null,
        key: {
          prefix: SymbolKind.Class,
          name: 'TestClass',
          path: ['file:///test/TestClass.cls', 'TestClass'],
          unifiedId: 'file:///test/TestClass.cls:class:TestClass',
          fileUri: 'file:///test/TestClass.cls',
          kind: SymbolKind.Class,
        },
        annotations: [
          {
            name: 'isTest',
            location: {
              symbolRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 7,
              },
              identifierRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 7,
              },
            },
          },
        ],
        modifiers: {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: true,
          isWebService: false,
          isBuiltIn: false,
        },
        _isLoaded: true,
        interfaces: [],
        namespace: null,
      };

      const classBlock: ScopeSymbol = {
        id: 'file:///test/TestClass.cls:class:TestClass:block:class_1',
        name: 'class_1',
        kind: SymbolKind.Block,
        fileUri: 'file:///test/TestClass.cls',
        location: {
          symbolRange: {
            startLine: 2,
            startColumn: 22,
            endLine: 20,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 22,
            endLine: 2,
            endColumn: 22,
          },
        },
        parentId: testClass.id,
        key: {
          prefix: 'block',
          name: 'class_1',
          path: ['file:///test/TestClass.cls', 'class_1'],
          unifiedId: 'file:///test/TestClass.cls:class:TestClass:block:class_1',
          fileUri: 'file:///test/TestClass.cls',
          kind: SymbolKind.Block,
        },
        modifiers: {
          visibility: 'default' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
        scopeType: 'class',
        _isLoaded: true,
      };

      const testMethod: MethodSymbol = {
        id: 'file:///test/TestClass.cls:class:TestClass:block:class_1:method:testMethod',
        name: 'testMethod',
        kind: SymbolKind.Method,
        fileUri: 'file:///test/TestClass.cls',
        location: {
          symbolRange: {
            startLine: 3,
            startColumn: 2,
            endLine: 5,
            endColumn: 2,
          },
          identifierRange: {
            startLine: 3,
            startColumn: 18,
            endLine: 3,
            endColumn: 28,
          },
        },
        parentId: classBlock.id,
        key: {
          prefix: SymbolKind.Method,
          name: 'testMethod',
          path: [
            'file:///test/TestClass.cls',
            'TestClass',
            'class_1',
            'testMethod',
          ],
          unifiedId:
            'file:///test/TestClass.cls:class:TestClass:block:class_1:method:testMethod',
          fileUri: 'file:///test/TestClass.cls',
          kind: SymbolKind.Method,
        },
        annotations: [
          {
            name: 'isTest',
            location: {
              symbolRange: {
                startLine: 3,
                startColumn: 2,
                endLine: 3,
                endColumn: 9,
              },
              identifierRange: {
                startLine: 3,
                startColumn: 2,
                endLine: 3,
                endColumn: 9,
              },
            },
          },
        ],
        modifiers: {
          visibility: 'public' as any,
          isStatic: true,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: true,
          isWebService: false,
          isBuiltIn: false,
        },
        returnType: {
          name: 'void',
          namespace: null,
          originalTypeString: 'void',
        },
        parameters: [],
        _isLoaded: true,
      };

      const regularClass: TypeSymbol = {
        id: 'file:///test/RegularClass.cls:class:RegularClass',
        name: 'RegularClass',
        kind: SymbolKind.Class,
        fileUri: 'file:///test/RegularClass.cls',
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 13,
            endLine: 1,
            endColumn: 25,
          },
        },
        parentId: null,
        key: {
          prefix: SymbolKind.Class,
          name: 'RegularClass',
          path: ['file:///test/RegularClass.cls', 'RegularClass'],
          unifiedId: 'file:///test/RegularClass.cls:class:RegularClass',
          fileUri: 'file:///test/RegularClass.cls',
          kind: SymbolKind.Class,
        },
        annotations: [],
        modifiers: {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
        _isLoaded: true,
        interfaces: [],
        namespace: null,
      };

      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([
        testClass,
        classBlock,
        testMethod,
        regularClass,
      ]);

      // Act
      const result = await handler.execute([], mockSymbolManager, logger);

      // Assert
      expect(result).toBeDefined();
      const typedResult = result as FindApexTestsResult;
      expect(typedResult.testClasses).toHaveLength(1);
      expect(typedResult.testClasses[0].class.name).toBe('TestClass');
      expect(typedResult.testClasses[0].class.fileUri).toBe(
        'file:///test/TestClass.cls',
      );
      expect(typedResult.testClasses[0].methods).toHaveLength(1);
      expect(typedResult.testClasses[0].methods[0].name).toBe('testMethod');
      expect(mockSymbolManager.getAllSymbolsForCompletion).toHaveBeenCalled();
    });

    it('should find test classes with multiple test methods', async () => {
      // Arrange
      const testClass: TypeSymbol = {
        id: 'file:///test/TestClass.cls:class:TestClass',
        name: 'TestClass',
        kind: SymbolKind.Class,
        fileUri: 'file:///test/TestClass.cls',
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 30,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 13,
            endLine: 2,
            endColumn: 22,
          },
        },
        parentId: null,
        key: {
          prefix: SymbolKind.Class,
          name: 'TestClass',
          path: ['file:///test/TestClass.cls', 'TestClass'],
          unifiedId: 'file:///test/TestClass.cls:class:TestClass',
          fileUri: 'file:///test/TestClass.cls',
          kind: SymbolKind.Class,
        },
        annotations: [
          {
            name: 'isTest',
            location: {
              symbolRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 7,
              },
              identifierRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 7,
              },
            },
          },
        ],
        modifiers: {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: true,
          isWebService: false,
          isBuiltIn: false,
        },
        _isLoaded: true,
        interfaces: [],
        namespace: null,
      };

      const classBlock: ScopeSymbol = {
        id: 'file:///test/TestClass.cls:class:TestClass:block:class_1',
        name: 'class_1',
        kind: SymbolKind.Block,
        fileUri: 'file:///test/TestClass.cls',
        location: {
          symbolRange: {
            startLine: 2,
            startColumn: 22,
            endLine: 30,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 22,
            endLine: 2,
            endColumn: 22,
          },
        },
        parentId: testClass.id,
        key: {
          prefix: 'block',
          name: 'class_1',
          path: ['file:///test/TestClass.cls', 'class_1'],
          unifiedId: 'file:///test/TestClass.cls:class:TestClass:block:class_1',
          fileUri: 'file:///test/TestClass.cls',
          kind: SymbolKind.Block,
        },
        modifiers: {
          visibility: 'default' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
        scopeType: 'class',
        _isLoaded: true,
      };

      const testMethod1: MethodSymbol = {
        id: 'file:///test/TestClass.cls:class:TestClass:block:class_1:method:testMethod1',
        name: 'testMethod1',
        kind: SymbolKind.Method,
        fileUri: 'file:///test/TestClass.cls',
        location: {
          symbolRange: {
            startLine: 3,
            startColumn: 2,
            endLine: 5,
            endColumn: 2,
          },
          identifierRange: {
            startLine: 3,
            startColumn: 18,
            endLine: 3,
            endColumn: 30,
          },
        },
        parentId: classBlock.id,
        key: {
          prefix: SymbolKind.Method,
          name: 'testMethod1',
          path: [
            'file:///test/TestClass.cls',
            'TestClass',
            'class_1',
            'testMethod1',
          ],
          unifiedId:
            'file:///test/TestClass.cls:class:TestClass:block:class_1:method:testMethod1',
          fileUri: 'file:///test/TestClass.cls',
          kind: SymbolKind.Method,
        },
        annotations: [
          {
            name: 'isTest',
            location: {
              symbolRange: {
                startLine: 3,
                startColumn: 2,
                endLine: 3,
                endColumn: 9,
              },
              identifierRange: {
                startLine: 3,
                startColumn: 2,
                endLine: 3,
                endColumn: 9,
              },
            },
          },
        ],
        modifiers: {
          visibility: 'public' as any,
          isStatic: true,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: true,
          isWebService: false,
          isBuiltIn: false,
        },
        returnType: {
          name: 'void',
          namespace: null,
          originalTypeString: 'void',
        },
        parameters: [],
        _isLoaded: true,
      };

      const testMethod2: MethodSymbol = {
        id: 'file:///test/TestClass.cls:class:TestClass:block:class_1:method:testMethod2',
        name: 'testMethod2',
        kind: SymbolKind.Method,
        fileUri: 'file:///test/TestClass.cls',
        location: {
          symbolRange: {
            startLine: 7,
            startColumn: 2,
            endLine: 9,
            endColumn: 2,
          },
          identifierRange: {
            startLine: 7,
            startColumn: 18,
            endLine: 7,
            endColumn: 30,
          },
        },
        parentId: classBlock.id,
        key: {
          prefix: SymbolKind.Method,
          name: 'testMethod2',
          path: [
            'file:///test/TestClass.cls',
            'TestClass',
            'class_1',
            'testMethod2',
          ],
          unifiedId:
            'file:///test/TestClass.cls:class:TestClass:block:class_1:method:testMethod2',
          fileUri: 'file:///test/TestClass.cls',
          kind: SymbolKind.Method,
        },
        annotations: [],
        modifiers: {
          visibility: 'public' as any,
          isStatic: true,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: true, // Has isTestMethod modifier
          isWebService: false,
          isBuiltIn: false,
        },
        returnType: {
          name: 'void',
          namespace: null,
          originalTypeString: 'void',
        },
        parameters: [],
        _isLoaded: true,
      };

      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([
        testClass,
        classBlock,
        testMethod1,
        testMethod2,
      ]);

      // Act
      const result = await handler.execute([], mockSymbolManager, logger);

      // Assert
      expect(result).toBeDefined();
      const typedResult = result as FindApexTestsResult;
      expect(typedResult.testClasses).toHaveLength(1);
      expect(typedResult.testClasses[0].methods).toHaveLength(2);
      expect(typedResult.testClasses[0].methods[0].name).toBe('testMethod1');
      expect(typedResult.testClasses[0].methods[1].name).toBe('testMethod2');
    });

    it('should return empty array when no test classes found', async () => {
      // Arrange
      const regularClass: TypeSymbol = {
        id: 'file:///test/RegularClass.cls:class:RegularClass',
        name: 'RegularClass',
        kind: SymbolKind.Class,
        fileUri: 'file:///test/RegularClass.cls',
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 13,
            endLine: 1,
            endColumn: 25,
          },
        },
        parentId: null,
        key: {
          prefix: SymbolKind.Class,
          name: 'RegularClass',
          path: ['file:///test/RegularClass.cls', 'RegularClass'],
          unifiedId: 'file:///test/RegularClass.cls:class:RegularClass',
          fileUri: 'file:///test/RegularClass.cls',
          kind: SymbolKind.Class,
        },
        annotations: [],
        modifiers: {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
        _isLoaded: true,
        interfaces: [],
        namespace: null,
      };

      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([
        regularClass,
      ]);

      // Act
      const result = await handler.execute([], mockSymbolManager, logger);

      // Assert
      expect(result).toBeDefined();
      const typedResult = result as FindApexTestsResult;
      expect(typedResult.testClasses).toHaveLength(0);
    });

    it('should handle test class with no test methods', async () => {
      // Arrange
      const testClass: TypeSymbol = {
        id: 'file:///test/TestClass.cls:class:TestClass',
        name: 'TestClass',
        kind: SymbolKind.Class,
        fileUri: 'file:///test/TestClass.cls',
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 13,
            endLine: 2,
            endColumn: 22,
          },
        },
        parentId: null,
        key: {
          prefix: SymbolKind.Class,
          name: 'TestClass',
          path: ['file:///test/TestClass.cls', 'TestClass'],
          unifiedId: 'file:///test/TestClass.cls:class:TestClass',
          fileUri: 'file:///test/TestClass.cls',
          kind: SymbolKind.Class,
        },
        annotations: [
          {
            name: 'isTest',
            location: {
              symbolRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 7,
              },
              identifierRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 7,
              },
            },
          },
        ],
        modifiers: {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: true,
          isWebService: false,
          isBuiltIn: false,
        },
        _isLoaded: true,
        interfaces: [],
        namespace: null,
      };

      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([testClass]);

      // Act
      const result = await handler.execute([], mockSymbolManager, logger);

      // Assert
      expect(result).toBeDefined();
      const typedResult = result as FindApexTestsResult;
      expect(typedResult.testClasses).toHaveLength(1);
      expect(typedResult.testClasses[0].methods).toHaveLength(0);
    });

    it('should handle empty symbol list', async () => {
      // Arrange
      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([]);

      // Act
      const result = await handler.execute([], mockSymbolManager, logger);

      // Assert
      expect(result).toBeDefined();
      const typedResult = result as FindApexTestsResult;
      expect(typedResult.testClasses).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Symbol manager error');
      mockSymbolManager.getAllSymbolsForCompletion.mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      await expect(
        handler.execute([], mockSymbolManager, logger),
      ).rejects.toThrow('Symbol manager error');
    });

    it('should correctly convert locations to LSP format (0-based)', async () => {
      // Arrange
      const testClass: TypeSymbol = {
        id: 'file:///test/TestClass.cls:class:TestClass',
        name: 'TestClass',
        kind: SymbolKind.Class,
        fileUri: 'file:///test/TestClass.cls',
        location: {
          symbolRange: {
            startLine: 2, // 1-based in parser
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 13,
            endLine: 2,
            endColumn: 22,
          },
        },
        parentId: null,
        key: {
          prefix: SymbolKind.Class,
          name: 'TestClass',
          path: ['file:///test/TestClass.cls', 'TestClass'],
          unifiedId: 'file:///test/TestClass.cls:class:TestClass',
          fileUri: 'file:///test/TestClass.cls',
          kind: SymbolKind.Class,
        },
        annotations: [
          {
            name: 'isTest',
            location: {
              symbolRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 7,
              },
              identifierRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 7,
              },
            },
          },
        ],
        modifiers: {
          visibility: 'public' as any,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: true,
          isWebService: false,
          isBuiltIn: false,
        },
        _isLoaded: true,
        interfaces: [],
        namespace: null,
      };

      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([testClass]);

      // Act
      const result = await handler.execute([], mockSymbolManager, logger);

      // Assert
      const typedResult = result as FindApexTestsResult;
      expect(typedResult.testClasses[0].class.location.range.start.line).toBe(
        1,
      ); // Converted to 0-based (2-1)
      expect(typedResult.testClasses[0].class.location.range.end.line).toBe(9); // Converted to 0-based (10-1)
    });
  });
});
