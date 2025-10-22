/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DefinitionParams } from 'vscode-languageserver-protocol';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { DefinitionProcessingService } from '../../src/services/DefinitionProcessingService';
import { ApexSymbol } from '@salesforce/apex-lsp-parser-ast';

describe('DefinitionProcessingService', () => {
  let service: DefinitionProcessingService;
  let logger: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Create service instance
    service = new DefinitionProcessingService(logger);
  });

  describe('processDefinition', () => {
    it('should return definition location for valid request', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      // Mock symbol manager to return a symbol
      const mockSymbol = {
        id: 'test-method-id',
        name: 'testMethod',
        kind: 'method',
        location: {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
        fileUri: 'file:///test/TestClass.cls',
        parentId: null,
        key: {
          prefix: 'method',
          name: 'testMethod',
          path: ['file:///test/TestClass.cls', 'testMethod'],
          unifiedId: 'test-method-id',
          fileUri: 'file:///test/TestClass.cls',
          kind: 'method',
        },
        parentKey: null,
        _modifierFlags: 0,
        _isLoaded: true,
        modifiers: {
          isPublic: true,
          isPrivate: false,
          isProtected: false,
          isGlobal: false,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTest: false,
        },
        parent: null,
      };
      jest
        .spyOn(service['symbolManager'], 'getSymbolAtPosition')
        .mockReturnValue(mockSymbol as unknown as ApexSymbol);

      // Act
      const result = await service.processDefinition(params);

      // Assert
      expect(result).toBeDefined();
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uri: 'file:///test/TestClass.cls',
            range: expect.any(Object),
          }),
        ]),
      );
    });

    it('should handle no symbol found gracefully', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      // Mock symbol manager to return no symbol
      jest
        .spyOn(service['symbolManager'], 'getSymbolAtPosition')
        .mockReturnValue(null);

      // Mock missing artifact utils to return not-found
      jest
        .spyOn(
          service['missingArtifactUtils'],
          'tryResolveMissingArtifactBlocking',
        )
        .mockResolvedValue('not-found');

      // Act
      const result = await service.processDefinition(params);

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      // Mock symbol manager to throw an error
      jest
        .spyOn(service['symbolManager'], 'getSymbolAtPosition')
        .mockImplementation(() => {
          throw new Error('Symbol manager error');
        });

      // Act
      const result = await service.processDefinition(params);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('performance', () => {
    it('should handle requests efficiently', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      // Mock symbol manager to return a symbol quickly
      const mockSymbol = {
        id: 'test-method-id',
        name: 'testMethod',
        kind: 'method',
        location: {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
        fileUri: 'file:///test/TestClass.cls',
        parentId: null,
        key: {
          prefix: 'method',
          name: 'testMethod',
          path: ['file:///test/TestClass.cls', 'testMethod'],
          unifiedId: 'test-method-id',
          fileUri: 'file:///test/TestClass.cls',
          kind: 'method',
        },
        parentKey: null,
        _modifierFlags: 0,
        _isLoaded: true,
        modifiers: {
          isPublic: true,
          isPrivate: false,
          isProtected: false,
          isGlobal: false,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTest: false,
        },
        parent: null,
      };
      jest
        .spyOn(service['symbolManager'], 'getSymbolAtPosition')
        .mockReturnValue(mockSymbol as unknown as ApexSymbol);

      const startTime = Date.now();

      // Act
      const result = await service.processDefinition(params);

      const endTime = Date.now();

      // Assert
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
