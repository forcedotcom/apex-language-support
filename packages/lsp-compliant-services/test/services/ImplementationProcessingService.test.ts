/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ImplementationParams } from 'vscode-languageserver-protocol';
import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  TypeSymbol,
  MethodSymbol,
  SymbolKind,
  SymbolVisibility,
  createPrimitiveType,
} from '@salesforce/apex-lsp-parser-ast';

import { ImplementationProcessingService } from '../../src/services/ImplementationProcessingService';

describe('ImplementationProcessingService', () => {
  let service: ImplementationProcessingService;
  let logger: any;
  let mockSymbolManager: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Create mock symbol manager
    mockSymbolManager = {
      getReferencesAtPosition: jest.fn().mockReturnValue([]),
      getSymbolAtPosition: jest.fn().mockResolvedValue(null),
      findReferencesTo: jest.fn().mockReturnValue([]),
      getAllSymbolsForCompletion: jest.fn().mockReturnValue([]),
      getContainingType: jest.fn().mockReturnValue(null),
      findSymbolsInFile: jest.fn().mockReturnValue([]),
      findFilesForSymbol: jest.fn().mockReturnValue([]),
    };

    // Create service instance with mock symbol manager
    service = new ImplementationProcessingService(logger, mockSymbolManager);
  });

  describe('processImplementation', () => {
    it('should return empty array when no TypeReference at position', async () => {
      const params: ImplementationParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockSymbolManager.getReferencesAtPosition.mockReturnValue([]);

      const result = await service.processImplementation(params);

      expect(result).toEqual([]);
    });

    it('should return implementations for interface', async () => {
      const params: ImplementationParams = {
        textDocument: { uri: 'file:///test/MyInterface.cls' },
        position: { line: 1, character: 10 },
      };

      // Mock TypeReference
      const mockTypeReference = {
        name: 'MyInterface',
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 20,
          },
        },
      };
      mockSymbolManager.getReferencesAtPosition.mockReturnValue([
        mockTypeReference,
      ]);

      // Mock interface symbol
      const interfaceSymbol: TypeSymbol = {
        id: 'interface-id',
        name: 'MyInterface',
        kind: SymbolKind.Interface,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 20,
          },
        },
        fileUri: 'file:///test/MyInterface.cls',
        interfaces: [],
        key: {
          prefix: 'interface',
          name: 'MyInterface',
          path: ['file:///test/MyInterface.cls', 'MyInterface'],
          unifiedId: 'interface-id',
          fileUri: 'file:///test/MyInterface.cls',
          kind: SymbolKind.Interface,
        },
        parentId: null,
        _isLoaded: true,
        modifiers: {
          visibility: SymbolVisibility.Public,
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
      };
      mockSymbolManager.getSymbolAtPosition.mockResolvedValue(interfaceSymbol);

      // Mock implementing class
      const implementingClass: TypeSymbol = {
        id: 'class-id',
        name: 'ImplementingClass',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 25,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 25,
          },
        },
        fileUri: 'file:///test/ImplementingClass.cls',
        interfaces: ['MyInterface'],
        key: {
          prefix: 'class',
          name: 'ImplementingClass',
          path: ['file:///test/ImplementingClass.cls', 'ImplementingClass'],
          unifiedId: 'class-id',
          fileUri: 'file:///test/ImplementingClass.cls',
          kind: SymbolKind.Class,
        },
        parentId: null,
        _isLoaded: true,
        modifiers: {
          visibility: SymbolVisibility.Public,
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
      };

      // Mock findReferencesTo to return reference from implementing class
      mockSymbolManager.findReferencesTo.mockReturnValue([
        {
          symbol: implementingClass,
          symbolId: 'class-id',
          fileUri: 'file:///test/ImplementingClass.cls',
          referenceType: 'implements',
          location: implementingClass.location,
        },
      ]);

      // Mock getAllSymbolsForCompletion to include implementing class
      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([
        implementingClass,
      ]);

      const result = await service.processImplementation(params);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].uri).toBe('file:///test/ImplementingClass.cls');
    });

    it('should return implementations for abstract method', async () => {
      const params: ImplementationParams = {
        textDocument: { uri: 'file:///test/AbstractClass.cls' },
        position: { line: 5, character: 10 },
      };

      // Mock TypeReference
      const mockTypeReference = {
        name: 'abstractMethod',
        location: {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
        },
      };
      mockSymbolManager.getReferencesAtPosition.mockReturnValue([
        mockTypeReference,
      ]);

      // Mock abstract method symbol
      const abstractMethod: MethodSymbol = {
        id: 'method-id',
        name: 'abstractMethod',
        kind: SymbolKind.Method,
        location: {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
        },
        fileUri: 'file:///test/AbstractClass.cls',
        returnType: createPrimitiveType('void'),
        parameters: [],
        key: {
          prefix: 'method',
          name: 'abstractMethod',
          path: ['file:///test/AbstractClass.cls', 'abstractMethod'],
          unifiedId: 'method-id',
          fileUri: 'file:///test/AbstractClass.cls',
          kind: SymbolKind.Method,
        },
        parentId: null,
        _isLoaded: true,
        modifiers: {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: true,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      };
      mockSymbolManager.getSymbolAtPosition.mockResolvedValue(abstractMethod);

      // Mock containing abstract class
      const abstractClass: TypeSymbol = {
        id: 'abstract-class-id',
        name: 'AbstractClass',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 23,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 23,
          },
        },
        fileUri: 'file:///test/AbstractClass.cls',
        interfaces: [],
        key: {
          prefix: 'class',
          name: 'AbstractClass',
          path: ['file:///test/AbstractClass.cls', 'AbstractClass'],
          unifiedId: 'abstract-class-id',
          fileUri: 'file:///test/AbstractClass.cls',
          kind: SymbolKind.Class,
        },
        parentId: null,
        _isLoaded: true,
        modifiers: {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: true,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      };
      mockSymbolManager.getContainingType.mockReturnValue(abstractClass);

      // Mock extending class
      const extendingClass: TypeSymbol = {
        id: 'extending-class-id',
        name: 'ConcreteClass',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 23,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 23,
          },
        },
        fileUri: 'file:///test/ConcreteClass.cls',
        superClass: 'AbstractClass',
        interfaces: [],
        key: {
          prefix: 'class',
          name: 'ConcreteClass',
          path: ['file:///test/ConcreteClass.cls', 'ConcreteClass'],
          unifiedId: 'extending-class-id',
          fileUri: 'file:///test/ConcreteClass.cls',
          kind: SymbolKind.Class,
        },
        parentId: null,
        _isLoaded: true,
        modifiers: {
          visibility: SymbolVisibility.Public,
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
      };

      // Mock implementing method
      const implementingMethod: MethodSymbol = {
        id: 'implementing-method-id',
        name: 'abstractMethod',
        kind: SymbolKind.Method,
        location: {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
        },
        fileUri: 'file:///test/ConcreteClass.cls',
        returnType: createPrimitiveType('void'),
        parameters: [],
        key: {
          prefix: 'method',
          name: 'abstractMethod',
          path: ['file:///test/ConcreteClass.cls', 'abstractMethod'],
          unifiedId: 'implementing-method-id',
          fileUri: 'file:///test/ConcreteClass.cls',
          kind: SymbolKind.Method,
        },
        parentId: null,
        _isLoaded: true,
        modifiers: {
          visibility: SymbolVisibility.Public,
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
      };

      // Mock findReferencesTo to return reference from extending class
      mockSymbolManager.findReferencesTo.mockReturnValue([
        {
          symbol: extendingClass,
          symbolId: 'extending-class-id',
          fileUri: 'file:///test/ConcreteClass.cls',
          referenceType: 'extends',
          location: extendingClass.location,
        },
      ]);

      // Mock getAllSymbolsForCompletion to include extending class
      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([
        extendingClass,
      ]);

      // Mock findSymbolsInFile to return implementing method
      mockSymbolManager.findSymbolsInFile.mockReturnValue([implementingMethod]);

      const result = await service.processImplementation(params);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].uri).toBe('file:///test/ConcreteClass.cls');
    });

    it('should return empty array for non-interface, non-abstract-method symbols', async () => {
      const params: ImplementationParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      // Mock TypeReference
      const mockTypeReference = {
        name: 'regularMethod',
        location: {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
        },
      };
      mockSymbolManager.getReferencesAtPosition.mockReturnValue([
        mockTypeReference,
      ]);

      // Mock regular method symbol (not abstract)
      const regularMethod: MethodSymbol = {
        id: 'method-id',
        name: 'regularMethod',
        kind: SymbolKind.Method,
        location: {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
        },
        fileUri: 'file:///test/TestClass.cls',
        returnType: createPrimitiveType('void'),
        parameters: [],
        key: {
          prefix: 'method',
          name: 'regularMethod',
          path: ['file:///test/TestClass.cls', 'regularMethod'],
          unifiedId: 'method-id',
          fileUri: 'file:///test/TestClass.cls',
          kind: SymbolKind.Method,
        },
        parentId: null,
        _isLoaded: true,
        modifiers: {
          visibility: SymbolVisibility.Public,
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
      };
      mockSymbolManager.getSymbolAtPosition.mockResolvedValue(regularMethod);

      const result = await service.processImplementation(params);

      expect(result).toEqual([]);
    });
  });
});
