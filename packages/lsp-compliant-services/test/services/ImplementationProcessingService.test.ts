/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ImplementationParams } from 'vscode-languageserver-protocol';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import {
  TypeSymbol,
  MethodSymbol,
  SymbolKind,
  SymbolVisibility,
  createPrimitiveType,
} from '@salesforce/apex-lsp-parser-ast';

import { ImplementationProcessingService } from '../../src/services/ImplementationProcessingService';

// Mock scheduler/queue utilities so queueWorkspaceLoadIfNeeded does not start a real scheduler
jest.mock('@salesforce/apex-lsp-parser-ast', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-parser-ast');
  return {
    ...actual,
    offer: jest.fn(() => Effect.succeed({ fiber: Effect.void } as any)),
    createQueuedItem: jest.fn((eff: any) =>
      Effect.succeed({ id: 'mock', eff, fiberDeferred: {} } as any),
    ),
    SchedulerInitializationService: {
      ...actual.SchedulerInitializationService,
      getInstance: jest.fn(() => ({
        ensureInitialized: jest.fn(() => Promise.resolve()),
        isInitialized: jest.fn(() => false),
        resetInstance: jest.fn(),
      })),
      resetInstance: jest.fn(),
    },
  };
});

const mockEnsureWorkspaceLoaded = jest.fn();
const mockIsWorkspaceLoaded = jest.fn();
const mockIsWorkspaceLoading = jest.fn();
jest.mock('../../src/services/WorkspaceLoadCoordinator', () => ({
  ensureWorkspaceLoaded: jest.fn((...args: any[]) =>
    mockEnsureWorkspaceLoaded(...args),
  ),
  isWorkspaceLoaded: jest.fn(() => mockIsWorkspaceLoaded()),
  isWorkspaceLoading: jest.fn(() => mockIsWorkspaceLoading()),
}));

jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    LSPConfigurationManager: {
      getInstance: jest.fn(),
    },
  };
});

describe('ImplementationProcessingService', () => {
  let service: ImplementationProcessingService;
  let logger: any;
  let mockSymbolManager: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Default workspace state: not loaded, not loading; ensureWorkspaceLoaded returns an Effect
    mockEnsureWorkspaceLoaded.mockReturnValue(Effect.void);
    mockIsWorkspaceLoaded.mockReturnValue(false);
    mockIsWorkspaceLoading.mockReturnValue(false);

    // Default: no LSP connection available (workspace-load trigger is a no-op).
    // Individual tests override getConnection to assert the trigger fires.
    const { LSPConfigurationManager } = require('@salesforce/apex-lsp-shared');
    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue({
      getConnection: jest.fn().mockReturnValue(undefined),
    });

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

    it('should return implementations for virtual method', async () => {
      const params: ImplementationParams = {
        textDocument: { uri: 'file:///test/AbstractBase.cls' },
        position: { line: 3, character: 10 },
      };

      const mockTypeReference = {
        name: 'doVirtualWork',
        location: {
          symbolRange: {
            startLine: 3,
            startColumn: 10,
            endLine: 3,
            endColumn: 24,
          },
          identifierRange: {
            startLine: 3,
            startColumn: 10,
            endLine: 3,
            endColumn: 24,
          },
        },
      };
      mockSymbolManager.getReferencesAtPosition.mockReturnValue([
        mockTypeReference,
      ]);

      const virtualMethod: MethodSymbol = {
        id: 'virtual-method-id',
        name: 'doVirtualWork',
        kind: SymbolKind.Method,
        location: {
          symbolRange: {
            startLine: 3,
            startColumn: 10,
            endLine: 3,
            endColumn: 24,
          },
          identifierRange: {
            startLine: 3,
            startColumn: 10,
            endLine: 3,
            endColumn: 24,
          },
        },
        fileUri: 'file:///test/AbstractBase.cls',
        returnType: createPrimitiveType('void'),
        parameters: [],
        key: {
          prefix: 'method',
          name: 'doVirtualWork',
          path: ['file:///test/AbstractBase.cls', 'doVirtualWork'],
          unifiedId: 'virtual-method-id',
          fileUri: 'file:///test/AbstractBase.cls',
          kind: SymbolKind.Method,
        },
        parentId: null,
        _isLoaded: true,
        modifiers: {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: true,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      };
      mockSymbolManager.getSymbolAtPosition.mockResolvedValue(virtualMethod);

      const containingClass: TypeSymbol = {
        id: 'abstract-class-id',
        name: 'AbstractBase',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 13,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 13,
          },
        },
        fileUri: 'file:///test/AbstractBase.cls',
        interfaces: [],
        key: {
          prefix: 'class',
          name: 'AbstractBase',
          path: ['file:///test/AbstractBase.cls', 'AbstractBase'],
          unifiedId: 'abstract-class-id',
          fileUri: 'file:///test/AbstractBase.cls',
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
      mockSymbolManager.getContainingType.mockReturnValue(containingClass);

      const concreteClass: TypeSymbol = {
        id: 'concrete-class-id',
        name: 'ConcreteChild',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 13,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 13,
          },
        },
        fileUri: 'file:///test/ConcreteChild.cls',
        superClass: 'AbstractBase',
        interfaces: [],
        key: {
          prefix: 'class',
          name: 'ConcreteChild',
          path: ['file:///test/ConcreteChild.cls', 'ConcreteChild'],
          unifiedId: 'concrete-class-id',
          fileUri: 'file:///test/ConcreteChild.cls',
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

      const overridingMethod: MethodSymbol = {
        id: 'overriding-method-id',
        name: 'doVirtualWork',
        kind: SymbolKind.Method,
        location: {
          symbolRange: {
            startLine: 3,
            startColumn: 10,
            endLine: 3,
            endColumn: 24,
          },
          identifierRange: {
            startLine: 3,
            startColumn: 10,
            endLine: 3,
            endColumn: 24,
          },
        },
        fileUri: 'file:///test/ConcreteChild.cls',
        returnType: createPrimitiveType('void'),
        parameters: [],
        key: {
          prefix: 'method',
          name: 'doVirtualWork',
          path: ['file:///test/ConcreteChild.cls', 'doVirtualWork'],
          unifiedId: 'overriding-method-id',
          fileUri: 'file:///test/ConcreteChild.cls',
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
          isOverride: true,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      };

      mockSymbolManager.findReferencesTo.mockReturnValue([
        {
          symbol: concreteClass,
          symbolId: 'concrete-class-id',
          fileUri: 'file:///test/ConcreteChild.cls',
          referenceType: 'extends',
          location: concreteClass.location,
        },
      ]);
      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([
        concreteClass,
      ]);
      mockSymbolManager.findSymbolsInFile.mockReturnValue([overridingMethod]);

      const result = await service.processImplementation(params);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].uri).toBe('file:///test/ConcreteChild.cls');
    });

    it('should find grandchild class implementations for abstract method', async () => {
      const params: ImplementationParams = {
        textDocument: { uri: 'file:///test/AbstractBase.cls' },
        position: { line: 2, character: 10 },
      };

      const mockTypeReference = {
        name: 'doWork',
        location: {
          symbolRange: {
            startLine: 2,
            startColumn: 10,
            endLine: 2,
            endColumn: 16,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 10,
            endLine: 2,
            endColumn: 16,
          },
        },
      };
      mockSymbolManager.getReferencesAtPosition.mockReturnValue([
        mockTypeReference,
      ]);

      const abstractMethod: MethodSymbol = {
        id: 'abstract-method-id',
        name: 'doWork',
        kind: SymbolKind.Method,
        location: {
          symbolRange: {
            startLine: 2,
            startColumn: 10,
            endLine: 2,
            endColumn: 16,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 10,
            endLine: 2,
            endColumn: 16,
          },
        },
        fileUri: 'file:///test/AbstractBase.cls',
        returnType: createPrimitiveType('void'),
        parameters: [],
        key: {
          prefix: 'method',
          name: 'doWork',
          path: ['file:///test/AbstractBase.cls', 'doWork'],
          unifiedId: 'abstract-method-id',
          fileUri: 'file:///test/AbstractBase.cls',
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

      const abstractClass: TypeSymbol = {
        id: 'abstract-class-id',
        name: 'AbstractBase',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 13,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 13,
          },
        },
        fileUri: 'file:///test/AbstractBase.cls',
        interfaces: [],
        key: {
          prefix: 'class',
          name: 'AbstractBase',
          path: ['file:///test/AbstractBase.cls', 'AbstractBase'],
          unifiedId: 'abstract-class-id',
          fileUri: 'file:///test/AbstractBase.cls',
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

      const concreteClass: TypeSymbol = {
        id: 'concrete-class-id',
        name: 'ConcreteChild',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 13,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 13,
          },
        },
        fileUri: 'file:///test/ConcreteChild.cls',
        superClass: 'AbstractBase',
        interfaces: [],
        key: {
          prefix: 'class',
          name: 'ConcreteChild',
          path: ['file:///test/ConcreteChild.cls', 'ConcreteChild'],
          unifiedId: 'concrete-class-id',
          fileUri: 'file:///test/ConcreteChild.cls',
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

      const grandchildClass: TypeSymbol = {
        id: 'grandchild-class-id',
        name: 'GrandChild',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 10,
          },
        },
        fileUri: 'file:///test/GrandChild.cls',
        superClass: 'ConcreteChild',
        interfaces: [],
        key: {
          prefix: 'class',
          name: 'GrandChild',
          path: ['file:///test/GrandChild.cls', 'GrandChild'],
          unifiedId: 'grandchild-class-id',
          fileUri: 'file:///test/GrandChild.cls',
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

      const grandchildMethod: MethodSymbol = {
        id: 'grandchild-method-id',
        name: 'doWork',
        kind: SymbolKind.Method,
        location: {
          symbolRange: {
            startLine: 2,
            startColumn: 10,
            endLine: 2,
            endColumn: 16,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 10,
            endLine: 2,
            endColumn: 16,
          },
        },
        fileUri: 'file:///test/GrandChild.cls',
        returnType: createPrimitiveType('void'),
        parameters: [],
        key: {
          prefix: 'method',
          name: 'doWork',
          path: ['file:///test/GrandChild.cls', 'doWork'],
          unifiedId: 'grandchild-method-id',
          fileUri: 'file:///test/GrandChild.cls',
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
          isOverride: true,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: false,
        },
      };

      // findReferencesTo: AbstractBase → ConcreteChild; ConcreteChild → GrandChild
      mockSymbolManager.findReferencesTo
        .mockResolvedValueOnce([
          {
            symbol: concreteClass,
            symbolId: 'concrete-class-id',
            fileUri: 'file:///test/ConcreteChild.cls',
            referenceType: 'extends',
            location: concreteClass.location,
          },
        ])
        .mockResolvedValueOnce([
          {
            symbol: grandchildClass,
            symbolId: 'grandchild-class-id',
            fileUri: 'file:///test/GrandChild.cls',
            referenceType: 'extends',
            location: grandchildClass.location,
          },
        ])
        .mockResolvedValue([]);

      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([
        concreteClass,
        grandchildClass,
      ]);

      // GrandChild has the override; ConcreteChild does not
      mockSymbolManager.findSymbolsInFile.mockImplementation((uri: string) => {
        if (uri === 'file:///test/GrandChild.cls') return [grandchildMethod];
        return [];
      });

      const result = await service.processImplementation(params);

      expect(result.length).toBeGreaterThan(0);
      const uris = result.map((r) => r.uri);
      expect(uris).toContain('file:///test/GrandChild.cls');
    });

    it('should find implementing classes for sub-interface hierarchy', async () => {
      const params: ImplementationParams = {
        textDocument: { uri: 'file:///test/IAnimal.cls' },
        position: { line: 1, character: 10 },
      };

      const mockTypeReference = {
        name: 'IAnimal',
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 17,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 17,
          },
        },
      };
      mockSymbolManager.getReferencesAtPosition.mockReturnValue([
        mockTypeReference,
      ]);

      const parentInterface: TypeSymbol = {
        id: 'parent-interface-id',
        name: 'IAnimal',
        kind: SymbolKind.Interface,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 17,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 17,
          },
        },
        fileUri: 'file:///test/IAnimal.cls',
        interfaces: [],
        key: {
          prefix: 'interface',
          name: 'IAnimal',
          path: ['file:///test/IAnimal.cls', 'IAnimal'],
          unifiedId: 'parent-interface-id',
          fileUri: 'file:///test/IAnimal.cls',
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
      mockSymbolManager.getSymbolAtPosition.mockResolvedValue(parentInterface);

      const subInterface: TypeSymbol = {
        id: 'sub-interface-id',
        name: 'ISpecialAnimal',
        kind: SymbolKind.Interface,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 24,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 10,
            endLine: 1,
            endColumn: 24,
          },
        },
        fileUri: 'file:///test/ISpecialAnimal.cls',
        interfaces: ['IAnimal'],
        key: {
          prefix: 'interface',
          name: 'ISpecialAnimal',
          path: ['file:///test/ISpecialAnimal.cls', 'ISpecialAnimal'],
          unifiedId: 'sub-interface-id',
          fileUri: 'file:///test/ISpecialAnimal.cls',
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

      const catClass: TypeSymbol = {
        id: 'cat-class-id',
        name: 'Cat',
        kind: SymbolKind.Class,
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 3,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 3,
          },
        },
        fileUri: 'file:///test/Cat.cls',
        interfaces: ['ISpecialAnimal'],
        key: {
          prefix: 'class',
          name: 'Cat',
          path: ['file:///test/Cat.cls', 'Cat'],
          unifiedId: 'cat-class-id',
          fileUri: 'file:///test/Cat.cls',
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

      // findReferencesTo: IAnimal → nothing (Cat implements ISpecialAnimal, not IAnimal directly)
      mockSymbolManager.findReferencesTo.mockResolvedValue([]);

      // getAllSymbolsForCompletion returns both the sub-interface and Cat
      mockSymbolManager.getAllSymbolsForCompletion.mockReturnValue([
        subInterface,
        catClass,
      ]);

      const result = await service.processImplementation(params);

      expect(result.length).toBeGreaterThan(0);
      const uris = result.map((r) => r.uri);
      expect(uris).toContain('file:///test/Cat.cls');
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

  describe('workspace load triggering', () => {
    const params: ImplementationParams = {
      textDocument: { uri: 'file:///test/TestClass.cls' },
      position: { line: 5, character: 10 },
    };

    it('triggers a workspace load when the workspace is not loaded', async () => {
      mockIsWorkspaceLoaded.mockReturnValue(false);
      mockIsWorkspaceLoading.mockReturnValue(false);
      const {
        LSPConfigurationManager,
      } = require('@salesforce/apex-lsp-shared');
      (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue({
        getConnection: jest
          .fn()
          .mockReturnValue({ sendNotification: jest.fn() }),
      });

      await service.processImplementation(params);

      expect(mockEnsureWorkspaceLoaded).toHaveBeenCalledTimes(1);
    });

    it('does not trigger a workspace load when already loaded', async () => {
      mockIsWorkspaceLoaded.mockReturnValue(true);
      const {
        LSPConfigurationManager,
      } = require('@salesforce/apex-lsp-shared');
      (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue({
        getConnection: jest
          .fn()
          .mockReturnValue({ sendNotification: jest.fn() }),
      });

      await service.processImplementation(params);

      expect(mockEnsureWorkspaceLoaded).not.toHaveBeenCalled();
    });

    it('does not trigger a workspace load when a load is already in progress', async () => {
      mockIsWorkspaceLoaded.mockReturnValue(false);
      mockIsWorkspaceLoading.mockReturnValue(true);
      const {
        LSPConfigurationManager,
      } = require('@salesforce/apex-lsp-shared');
      (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue({
        getConnection: jest
          .fn()
          .mockReturnValue({ sendNotification: jest.fn() }),
      });

      await service.processImplementation(params);

      expect(mockEnsureWorkspaceLoaded).not.toHaveBeenCalled();
    });

    it('does not throw when no LSP connection is available', async () => {
      mockIsWorkspaceLoaded.mockReturnValue(false);
      mockIsWorkspaceLoading.mockReturnValue(false);
      // beforeEach already mocks getConnection to return undefined

      await expect(service.processImplementation(params)).resolves.toEqual([]);
      expect(mockEnsureWorkspaceLoaded).not.toHaveBeenCalled();
    });
  });
});
