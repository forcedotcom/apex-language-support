/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { NamespaceResolutionService } from '../../src/namespace/NamespaceResolutionService';
import { SymbolTable } from '../../src/types/symbol';
import { SymbolKind, SymbolLocation } from '../../src/types/symbol';
import { SymbolFactory } from '../../src/types/symbol';
import {
  CompilationContext,
  SymbolProvider,
} from '../../src/namespace/NamespaceUtils';
import { Namespaces } from '../../src/namespace/NamespaceUtils';

// Mock data for testing
const mockLocation: SymbolLocation = {
  startLine: 1,
  startColumn: 1,
  endLine: 1,
  endColumn: 10,
};

const mockModifiers = {
  visibility: 'public' as const,
  isStatic: false,
  isFinal: false,
  isAbstract: false,
  isTransient: false,
  isGlobal: false,
  isTest: false,
  isDeprecated: false,
  isOverride: false,
  isVirtual: false,
};

const createMockSymbolTableWithTypeReferences = (): SymbolTable => {
  const symbolTable = new SymbolTable();

  // Add a class symbol
  const classSymbol = SymbolFactory.createFullSymbol(
    'TestClass',
    SymbolKind.Class,
    mockLocation,
    'test.cls',
    mockModifiers,
  );
  symbolTable.addSymbol(classSymbol);

  // Add a variable symbol with a type reference that needs resolution
  const variableSymbol = SymbolFactory.createFullSymbol(
    'testVar',
    SymbolKind.Variable,
    mockLocation,
    'test.cls',
    mockModifiers,
    classSymbol.id,
    {
      type: {
        name: 'System.List<String>',
        isArray: false,
        isGeneric: true,
        genericTypes: ['String'],
      },
    },
  );
  symbolTable.addSymbol(variableSymbol);

  return symbolTable;
};

const createMockCompilationContext = (): CompilationContext => ({
  namespace: Namespaces.create('TestNamespace'),
  version: 58,
  isTrusted: true,
  sourceType: 'FILE',
  referencingType: SymbolFactory.createFullSymbol(
    'TestClass',
    SymbolKind.Class,
    mockLocation,
    'test.cls',
    mockModifiers,
  ),
  enclosingTypes: [],
  parentTypes: [],
  isStaticContext: false,
});

const createMockSymbolProvider = (): jest.Mocked<SymbolProvider> => ({
  find: jest.fn(),
  findBuiltInType: jest.fn(),
  findSObjectType: jest.fn(),
  findUserType: jest.fn(),
  findExternalType: jest.fn(),
});

describe('NamespaceResolutionService', () => {
  let service: NamespaceResolutionService;
  let mockSymbolProvider: jest.Mocked<SymbolProvider>;

  beforeEach(() => {
    service = new NamespaceResolutionService();
    mockSymbolProvider = createMockSymbolProvider();
  });

  describe('resolveDeferredReferences', () => {
    it('should resolve type references in variable declarations', () => {
      const symbolTable = createMockSymbolTableWithTypeReferences();
      const compilationContext = createMockCompilationContext();

      // Mock a resolved symbol for System.List
      const mockResolvedSymbol = SymbolFactory.createFullSymbol(
        'List',
        SymbolKind.Class,
        mockLocation,
        'System.cls',
        mockModifiers,
      );
      mockSymbolProvider.findBuiltInType.mockReturnValue(mockResolvedSymbol);

      service.resolveDeferredReferences(
        symbolTable,
        compilationContext,
        mockSymbolProvider,
      );

      // Verify that type references were resolved
      const symbols = symbolTable.getAllSymbols();
      const variableSymbol = symbols.find((s) => s.name === 'testVar');
      expect(variableSymbol?._typeData?.type?.resolvedSymbol).toBeDefined();
      expect(variableSymbol?._typeData?.type?.resolvedSymbol).toBe(
        mockResolvedSymbol,
      );
    });

    it('should handle unresolved references gracefully', () => {
      const symbolTable = createMockSymbolTableWithTypeReferences();
      const compilationContext = createMockCompilationContext();

      // Mock no resolution found
      mockSymbolProvider.findBuiltInType.mockReturnValue(null);

      service.resolveDeferredReferences(
        symbolTable,
        compilationContext,
        mockSymbolProvider,
      );

      // Verify that unresolved references are handled without errors
      const symbols = symbolTable.getAllSymbols();
      const variableSymbol = symbols.find((s) => s.name === 'testVar');
      expect(variableSymbol?._typeData?.type?.resolvedSymbol).toBeUndefined();
    });

    it('should handle symbols without type data', () => {
      const symbolTable = new SymbolTable();

      // Add a symbol without type data
      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        mockLocation,
        'test.cls',
        mockModifiers,
      );
      symbolTable.addSymbol(classSymbol);

      const compilationContext = createMockCompilationContext();

      // Should not throw an error
      expect(() => {
        service.resolveDeferredReferences(
          symbolTable,
          compilationContext,
          mockSymbolProvider,
        );
      }).not.toThrow();
    });

    it('should handle empty symbol table', () => {
      const symbolTable = new SymbolTable();
      const compilationContext = createMockCompilationContext();

      // Should not throw an error
      expect(() => {
        service.resolveDeferredReferences(
          symbolTable,
          compilationContext,
          mockSymbolProvider,
        );
      }).not.toThrow();
    });

    it('should handle qualified type names with multiple parts', () => {
      const symbolTable = new SymbolTable();

      // Add a variable with a qualified type name
      const variableSymbol = SymbolFactory.createFullSymbol(
        'qualifiedVar',
        SymbolKind.Variable,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        {
          type: {
            name: 'MyNamespace.MyClass',
            isArray: false,
            isGeneric: false,
          },
        },
      );
      symbolTable.addSymbol(variableSymbol);

      const compilationContext = createMockCompilationContext();
      const mockResolvedSymbol = SymbolFactory.createFullSymbol(
        'MyClass',
        SymbolKind.Class,
        mockLocation,
        'MyNamespace.cls',
        mockModifiers,
      );
      mockSymbolProvider.find.mockReturnValue(mockResolvedSymbol);

      service.resolveDeferredReferences(
        symbolTable,
        compilationContext,
        mockSymbolProvider,
      );

      const symbols = symbolTable.getAllSymbols();
      const resolvedVariable = symbols.find((s) => s.name === 'qualifiedVar');
      expect(resolvedVariable?._typeData?.type?.resolvedSymbol).toBe(
        mockResolvedSymbol,
      );
    });

    it('should handle type names without dots (simple types)', () => {
      const symbolTable = new SymbolTable();

      // Add a variable with a simple type name
      const variableSymbol = SymbolFactory.createFullSymbol(
        'simpleVar',
        SymbolKind.Variable,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        {
          type: {
            name: 'String',
            isArray: false,
            isGeneric: false,
          },
        },
      );
      symbolTable.addSymbol(variableSymbol);

      const compilationContext = createMockCompilationContext();
      const mockResolvedSymbol = SymbolFactory.createFullSymbol(
        'String',
        SymbolKind.Class,
        mockLocation,
        'System.cls',
        mockModifiers,
      );
      mockSymbolProvider.findBuiltInType.mockReturnValue(mockResolvedSymbol);

      service.resolveDeferredReferences(
        symbolTable,
        compilationContext,
        mockSymbolProvider,
      );

      const symbols = symbolTable.getAllSymbols();
      const resolvedVariable = symbols.find((s) => s.name === 'simpleVar');
      expect(resolvedVariable?._typeData?.type?.resolvedSymbol).toBe(
        mockResolvedSymbol,
      );
    });
  });

  describe('error handling', () => {
    it('should handle null compilation context gracefully', () => {
      const symbolTable = createMockSymbolTableWithTypeReferences();

      // Should not throw an error even with null context
      expect(() => {
        service.resolveDeferredReferences(
          symbolTable,
          null as any,
          mockSymbolProvider,
        );
      }).not.toThrow();
    });

    it('should handle null symbol provider gracefully', () => {
      const symbolTable = createMockSymbolTableWithTypeReferences();
      const compilationContext = createMockCompilationContext();

      // Should not throw an error even with null provider
      expect(() => {
        service.resolveDeferredReferences(
          symbolTable,
          compilationContext,
          null as any,
        );
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle type names with empty parts', () => {
      const symbolTable = new SymbolTable();

      // Add a variable with a type name that has empty parts
      const variableSymbol = SymbolFactory.createFullSymbol(
        'emptyVar',
        SymbolKind.Variable,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        {
          type: {
            name: 'System..List', // Double dot creates empty part
            isArray: false,
            isGeneric: false,
          },
        },
      );
      symbolTable.addSymbol(variableSymbol);

      const compilationContext = createMockCompilationContext();

      // Should not throw an error
      expect(() => {
        service.resolveDeferredReferences(
          symbolTable,
          compilationContext,
          mockSymbolProvider,
        );
      }).not.toThrow();
    });

    it('should handle type names with only dots', () => {
      const symbolTable = new SymbolTable();

      // Add a variable with a type name that has only dots
      const variableSymbol = SymbolFactory.createFullSymbol(
        'dotVar',
        SymbolKind.Variable,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        {
          type: {
            name: '...', // Only dots
            isArray: false,
            isGeneric: false,
          },
        },
      );
      symbolTable.addSymbol(variableSymbol);

      const compilationContext = createMockCompilationContext();

      // Should not throw an error
      expect(() => {
        service.resolveDeferredReferences(
          symbolTable,
          compilationContext,
          mockSymbolProvider,
        );
      }).not.toThrow();
    });

    it('should handle type names with special characters', () => {
      const symbolTable = new SymbolTable();

      // Add a variable with a type name that has special characters
      const variableSymbol = SymbolFactory.createFullSymbol(
        'specialVar',
        SymbolKind.Variable,
        mockLocation,
        'test.cls',
        mockModifiers,
        null,
        {
          type: {
            name: 'System.List<String>', // Generic type
            isArray: false,
            isGeneric: true,
            genericTypes: ['String'],
          },
        },
      );
      symbolTable.addSymbol(variableSymbol);

      const compilationContext = createMockCompilationContext();
      const mockResolvedSymbol = SymbolFactory.createFullSymbol(
        'List',
        SymbolKind.Class,
        mockLocation,
        'System.cls',
        mockModifiers,
      );
      mockSymbolProvider.findBuiltInType.mockReturnValue(mockResolvedSymbol);

      service.resolveDeferredReferences(
        symbolTable,
        compilationContext,
        mockSymbolProvider,
      );

      const symbols = symbolTable.getAllSymbols();
      const resolvedVariable = symbols.find((s) => s.name === 'specialVar');
      expect(resolvedVariable?._typeData?.type?.resolvedSymbol).toBe(
        mockResolvedSymbol,
      );
    });
  });

  describe('performance', () => {
    it('should handle large symbol tables efficiently', () => {
      const symbolTable = new SymbolTable();

      // Create a large number of symbols
      for (let i = 0; i < 1000; i++) {
        const variableSymbol = SymbolFactory.createFullSymbol(
          `var${i}`,
          SymbolKind.Variable,
          mockLocation,
          'test.cls',
          mockModifiers,
          null,
          {
            type: {
              name: 'String',
              isArray: false,
              isGeneric: false,
            },
          },
        );
        symbolTable.addSymbol(variableSymbol);
      }

      const compilationContext = createMockCompilationContext();
      const mockResolvedSymbol = SymbolFactory.createFullSymbol(
        'String',
        SymbolKind.Class,
        mockLocation,
        'System.cls',
        mockModifiers,
      );
      mockSymbolProvider.findBuiltInType.mockReturnValue(mockResolvedSymbol);

      const startTime = performance.now();

      service.resolveDeferredReferences(
        symbolTable,
        compilationContext,
        mockSymbolProvider,
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(executionTime).toBeLessThan(1000);

      // Verify that all symbols were processed
      const symbols = symbolTable.getAllSymbols();
      expect(symbols.length).toBe(1000);
    });
  });
});
