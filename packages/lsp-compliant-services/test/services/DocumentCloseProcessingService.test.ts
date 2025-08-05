/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DocumentCloseProcessingService,
  IDocumentCloseProcessor,
} from '../../src/services/DocumentCloseProcessingService';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { getLogger } from '@salesforce/apex-lsp-shared';

// Mock the logger
jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

// Mock the symbol manager factory
jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
  SymbolManagerFactory: {
    createSymbolManager: jest.fn(() => ({
      addSymbol: jest.fn(),
      getSymbol: jest.fn(),
      findSymbolByName: jest.fn(),
      findSymbolByFQN: jest.fn(),
      findSymbolsInFile: jest.fn(),
      findFilesForSymbol: jest.fn(),
      resolveSymbol: jest.fn(),
      getAllSymbolsForCompletion: jest.fn(),
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
    })),
  },
  ISymbolManager: jest.fn(),
}));

// Mock the storage manager
jest.mock('../../src/storage/ApexStorageManager', () => ({
  ApexStorageManager: {
    getInstance: jest.fn(() => ({
      getStorage: jest.fn(() => ({
        setDocument: jest.fn(),
        getDocument: jest.fn(),
        deleteDocument: jest.fn(),
        getAllDocuments: jest.fn(),
      })),
    })),
  },
}));

describe('DocumentCloseProcessingService', () => {
  let service: DocumentCloseProcessingService;
  let mockLogger: any;
  let mockSymbolManager: jest.Mocked<ISymbolManager>;
  let mockStorage: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);

    mockSymbolManager = {
      addSymbol: jest.fn(),
      getSymbol: jest.fn(),
      findSymbolByName: jest.fn(),
      findSymbolByFQN: jest.fn(),
      findSymbolsInFile: jest.fn(),
      findFilesForSymbol: jest.fn(),
      resolveSymbol: jest.fn(),
      getAllSymbolsForCompletion: jest.fn(),
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
    };

    mockStorage = {
      setDocument: jest.fn(),
      getDocument: jest.fn(),
      deleteDocument: jest.fn(),
      getAllDocuments: jest.fn(),
    };

    const {
      ApexStorageManager,
    } = require('../../src/storage/ApexStorageManager');
    ApexStorageManager.getInstance.mockReturnValue({
      getStorage: jest.fn(() => mockStorage),
    });

    service = new DocumentCloseProcessingService(mockLogger, mockSymbolManager);
  });

  describe('constructor', () => {
    it('should create service with provided logger and symbol manager', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DocumentCloseProcessingService);
    });

    it('should create service with default symbol manager when not provided', () => {
      const {
        SymbolManagerFactory,
      } = require('@salesforce/apex-lsp-parser-ast');

      new DocumentCloseProcessingService(mockLogger);

      expect(SymbolManagerFactory.createSymbolManager).toHaveBeenCalled();
    });
  });

  describe('processDocumentClose', () => {
    it('should process document close event successfully', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      await service.processDocumentClose(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalledWith(
        event.document.uri,
      );
      expect(mockSymbolManager.removeFile).toHaveBeenCalledWith(
        event.document.uri,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle processing errors gracefully', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      mockStorage.deleteDocument.mockRejectedValue(new Error('Storage error'));

      await service.processDocumentClose(event);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle symbol manager errors gracefully', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      mockSymbolManager.removeFile.mockImplementation(() => {
        throw new Error('Symbol manager error');
      });

      await service.processDocumentClose(event);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should log document close processing completion', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      await service.processDocumentClose(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle empty document content', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///empty.cls',
          languageId: 'apex',
          version: 1,
          getText: () => '',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 0,
        },
        contentChanges: [],
      };

      await service.processDocumentClose(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalledWith(
        event.document.uri,
      );
      expect(mockSymbolManager.removeFile).toHaveBeenCalledWith(
        event.document.uri,
      );
    });

    it('should handle large document close', async () => {
      const largeContent = 'public class LargeClass {\n'.repeat(1000) + '}';
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///large.cls',
          languageId: 'apex',
          version: 1,
          getText: () => largeContent,
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1001,
        },
        contentChanges: [],
      };

      await service.processDocumentClose(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalledWith(
        event.document.uri,
      );
      expect(mockSymbolManager.removeFile).toHaveBeenCalledWith(
        event.document.uri,
      );
    });
  });

  describe('interface compliance', () => {
    it('should implement IDocumentCloseProcessor interface', () => {
      expect(service).toHaveProperty('processDocumentClose');
      expect(typeof service.processDocumentClose).toBe('function');
    });

    it('should have correct method signature', () => {
      const processor: IDocumentCloseProcessor = service;
      expect(processor.processDocumentClose).toBeDefined();
    });
  });

  describe('cleanup operations', () => {
    it('should remove document from storage', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      await service.processDocumentClose(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalledWith(
        'file:///test.cls',
      );
    });

    it('should remove file from symbol manager', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      await service.processDocumentClose(event);

      expect(mockSymbolManager.removeFile).toHaveBeenCalledWith(
        'file:///test.cls',
      );
    });

    it('should perform cleanup operations in correct order', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      await service.processDocumentClose(event);

      // Verify order of operations
      const deleteCallIndex =
        mockStorage.deleteDocument.mock.invocationCallOrder[0];
      const removeFileCallIndex =
        mockSymbolManager.removeFile.mock.invocationCallOrder[0];

      expect(deleteCallIndex).toBeLessThan(removeFileCallIndex);
    });
  });

  describe('error scenarios', () => {
    it('should handle storage manager errors', async () => {
      const {
        ApexStorageManager,
      } = require('../../src/storage/ApexStorageManager');
      ApexStorageManager.getInstance.mockImplementation(() => {
        throw new Error('Storage manager not available');
      });

      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      await service.processDocumentClose(event);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle invalid document URIs', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: '', // Invalid URI
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      await service.processDocumentClose(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalledWith('');
      expect(mockSymbolManager.removeFile).toHaveBeenCalledWith('');
    });

    it('should continue processing even if storage deletion fails', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      mockStorage.deleteDocument.mockRejectedValue(new Error('Storage error'));

      await service.processDocumentClose(event);

      // Should still attempt to remove from symbol manager
      expect(mockSymbolManager.removeFile).toHaveBeenCalledWith(
        event.document.uri,
      );
    });

    it('should continue processing even if symbol manager removal fails', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      mockSymbolManager.removeFile.mockImplementation(() => {
        throw new Error('Symbol manager error');
      });

      await service.processDocumentClose(event);

      // Should still attempt to delete from storage
      expect(mockStorage.deleteDocument).toHaveBeenCalledWith(
        event.document.uri,
      );
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid successive closes', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class TestClass {}',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      };

      // Process multiple closes rapidly
      const promises = Array.from({ length: 10 }, (_, index) =>
        service.processDocumentClose({
          ...event,
          document: {
            ...event.document,
            uri: `file:///test${index}.cls`,
          },
        }),
      );

      await Promise.all(promises);

      expect(mockStorage.deleteDocument).toHaveBeenCalledTimes(10);
      expect(mockSymbolManager.removeFile).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent document closes', async () => {
      const events = Array.from({ length: 5 }, (_, index) => ({
        document: {
          uri: `file:///test${index}.cls`,
          languageId: 'apex',
          version: 1,
          getText: () => `public class TestClass${index} {}`,
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 1,
        },
        contentChanges: [],
      }));

      const promises = events.map((event) =>
        service.processDocumentClose(event),
      );
      await Promise.all(promises);

      expect(mockStorage.deleteDocument).toHaveBeenCalledTimes(5);
      expect(mockSymbolManager.removeFile).toHaveBeenCalledTimes(5);
    });
  });
});
