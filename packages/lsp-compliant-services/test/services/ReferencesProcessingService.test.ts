/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ReferenceParams, Location, Position } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { ReferencesProcessingService } from '../../src/services/ReferencesProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { ApexSymbolProcessingManager } from '@salesforce/apex-lsp-parser-ast';

// Mock dependencies
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(),
  },
}));

jest.mock('@salesforce/apex-lsp-parser-ast', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-parser-ast');
  return {
    ...actual,
    ApexSymbolProcessingManager: {
      getInstance: jest.fn(),
    },
  };
});

jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    LSPConfigurationManager: {
      getInstance: jest.fn(),
    },
  };
});

jest.mock('../../src/services/WorkspaceLoadCoordinator', () => ({
  ensureWorkspaceLoaded: jest.fn(),
}));

describe('ReferencesProcessingService', () => {
  let service: ReferencesProcessingService;
  let logger: any;
  let mockStorage: any;
  let mockSymbolManager: any;
  let mockConfigManager: any;
  let mockConnection: any;
  let mockCoordinator: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup logger
    logger = getLogger();

    // Setup mock storage
    mockStorage = {
      getDocument: jest.fn(),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Setup mock symbol manager
    mockSymbolManager = {
      resolveSymbol: jest.fn(),
      createResolutionContext: jest.fn().mockReturnValue({
        sourceFile: 'file:///test/TestClass.cls',
        namespaceContext: 'public',
        currentScope: 'global',
        scopeChain: ['global'],
      }),
      findReferencesTo: jest.fn(),
      findReferencesFrom: jest.fn(),
    };

    (ApexSymbolProcessingManager.getInstance as jest.Mock).mockReturnValue({
      getSymbolManager: jest.fn().mockReturnValue(mockSymbolManager),
    });

    // Setup mock connection
    mockConnection = {
      sendRequest: jest.fn(),
    };

    // Setup mock config manager
    mockConfigManager = {
      getConnection: jest.fn().mockReturnValue(mockConnection),
    };

    const { LSPConfigurationManager } = require('@salesforce/apex-lsp-shared');
    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
      mockConfigManager,
    );

    // Setup mock coordinator
    mockCoordinator = {
      ensureWorkspaceLoaded: jest.fn(),
    };

    const { WorkspaceLoadCoordinator } = require('../../src/services/WorkspaceLoadCoordinator');
    (WorkspaceLoadCoordinator.getInstance as jest.Mock).mockReturnValue(
      mockCoordinator,
    );

    // Create service instance
    service = new ReferencesProcessingService(logger);
  });

  describe('processReferences', () => {
    it('should return empty array when no references found', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void testMethod() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Mock all the internal methods to return empty results
      jest.spyOn(service as any, 'findReferences').mockResolvedValue([]);

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should trigger workspace load when no references found', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void testMethod() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Mock findReferences to return empty array (no references found)
      jest.spyOn(service as any, 'findReferences').mockResolvedValue([]);

      // Mock workspace coordinator to indicate workspace loaded
      mockCoordinator.ensureWorkspaceLoaded.mockResolvedValue({
        status: 'loaded',
      });

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toBeDefined();
      expect(mockCoordinator.ensureWorkspaceLoaded).toHaveBeenCalledWith(
        mockConnection,
        params.workDoneToken,
      );
    });

    it('should not trigger workspace load when connection is unavailable', async () => {
      // Arrange
      mockConfigManager.getConnection.mockReturnValue(undefined);

      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void testMethod() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      mockSymbolManager.resolveSymbol.mockReturnValue({
        symbol: {
          id: 'test-method-id',
          name: 'testMethod',
        },
      });

      mockSymbolManager.findReferencesTo.mockReturnValue([]);

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toEqual([]);
      expect(mockCoordinator.ensureWorkspaceLoaded).not.toHaveBeenCalled();
    });

    it('should handle missing document gracefully', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      mockStorage.getDocument.mockResolvedValue(null);

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toEqual([]);
      expect(mockSymbolManager.resolveSymbol).not.toHaveBeenCalled();
    });

    it('should handle missing symbol gracefully', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void testMethod() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      mockSymbolManager.resolveSymbol.mockReturnValue({
        symbol: null,
      });

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toEqual([]);
      expect(mockSymbolManager.findReferencesTo).not.toHaveBeenCalled();
    });

    it('should handle includeDeclaration parameter', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
        context: {
          includeDeclaration: true,
        },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void testMethod() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Mock findReferences to return empty array
      jest.spyOn(service as any, 'findReferences').mockResolvedValue([]);

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle workspace load errors gracefully', async () => {
      // Arrange
      const params: ReferenceParams = {
        textDocument: { uri: 'file:///test/TestClass.cls' },
        position: { line: 5, character: 10 },
      };

      const document = TextDocument.create(
        params.textDocument.uri,
        'apex',
        1,
        'public class TestClass {\n  public void testMethod() {\n  }\n}',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      mockSymbolManager.resolveSymbol.mockReturnValue({
        symbol: {
          id: 'test-method-id',
          name: 'testMethod',
        },
      });

      mockSymbolManager.findReferencesTo.mockReturnValue([]);
      mockCoordinator.ensureWorkspaceLoaded.mockRejectedValue(
        new Error('Workspace load failed'),
      );

      // Act
      const result = await service.processReferences(params);

      // Assert
      expect(result).toEqual([]);
      expect(mockCoordinator.ensureWorkspaceLoaded).toHaveBeenCalled();
    });
  });
});

