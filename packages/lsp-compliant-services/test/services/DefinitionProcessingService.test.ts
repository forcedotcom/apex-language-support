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
import * as WorkspaceLoadCoordinator from '../../src/services/WorkspaceLoadCoordinator';

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

      // Mock TypeReference at position
      const mockTypeReference = {
        name: 'doSomething',
        location: {
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
      };
      jest
        .spyOn(service['symbolManager'], 'getReferencesAtPosition')
        .mockReturnValue([mockTypeReference] as any);

      // Mock symbol manager to return a symbol
      const mockSymbol = {
        id: 'do-something-id',
        name: 'doSomething',
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
          name: 'doSomething',
          path: ['file:///test/TestClass.cls', 'doSomething'],
          unifiedId: 'do-something-id',
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
        .mockResolvedValue(mockSymbol as unknown as ApexSymbol);

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

      // Mock TypeReference at position
      const mockTypeReference = {
        name: 'unresolvedSymbol',
        location: {
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 25,
          },
        },
      };
      jest
        .spyOn(service['symbolManager'], 'getReferencesAtPosition')
        .mockReturnValue([mockTypeReference] as any);

      // Mock symbol manager to return no symbol
      jest
        .spyOn(service['symbolManager'], 'getSymbolAtPosition')
        .mockResolvedValue(null);

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

      // Mock TypeReference at position
      const mockTypeReference = {
        name: 'doSomething',
        location: {
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
      };
      jest
        .spyOn(service['symbolManager'], 'getReferencesAtPosition')
        .mockReturnValue([mockTypeReference] as any);

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

    it('should return empty array when position is on keyword', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 2, character: 4 }, // Position on "if" keyword
      };

      // Mock isWorkspaceLoaded to return true so missing artifact resolution is not triggered
      jest
        .spyOn(WorkspaceLoadCoordinator, 'isWorkspaceLoaded')
        .mockReturnValue(true);

      // Keywords don't have TypeReferences - getReferencesAtPosition returns empty array
      jest
        .spyOn(service['symbolManager'], 'getReferencesAtPosition')
        .mockReturnValue([]);

      // Spy on getSymbolAtPosition to verify it's not called
      jest
        .spyOn(service['symbolManager'], 'getSymbolAtPosition')
        .mockResolvedValue(null);

      // Spy on tryResolveMissingArtifactBlocking to verify it's not called
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
      // Verify getSymbolAtPosition was NOT called (short-circuited when no TypeReference)
      expect(
        service['symbolManager'].getSymbolAtPosition,
      ).not.toHaveBeenCalled();
      // Verify missing artifact resolution was NOT triggered
      expect(
        service['missingArtifactUtils'].tryResolveMissingArtifactBlocking,
      ).not.toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    it('should handle requests efficiently', async () => {
      // Arrange
      const params: DefinitionParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      // Mock TypeReference at position
      const mockTypeReference = {
        name: 'doSomething',
        location: {
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
      };
      jest
        .spyOn(service['symbolManager'], 'getReferencesAtPosition')
        .mockReturnValue([mockTypeReference] as any);

      // Mock symbol manager to return a symbol quickly
      const mockSymbol = {
        id: 'do-something-id',
        name: 'doSomething',
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
          name: 'doSomething',
          path: ['file:///test/TestClass.cls', 'doSomething'],
          unifiedId: 'do-something-id',
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
        .mockResolvedValue(mockSymbol as unknown as ApexSymbol);

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
