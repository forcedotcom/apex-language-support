/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  DocumentChangeProcessingService,
  IDocumentChangeProcessor,
} from '../../src/services/DocumentChangeProcessingService';
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
      removeFile: jest.fn(),
      addSymbolTable: jest.fn(),
      getSymbolAtPosition: jest.fn(),
      getAllReferencesInFile: jest.fn(),
      resolveSymbol: jest.fn(),
      getAllSymbolsForCompletion: jest.fn(),
      getStats: jest.fn(),
      clear: jest.fn(),
      optimizeMemory: jest.fn(),
      createResolutionContext: jest.fn(),
      constructFQN: jest.fn(),
      getContainingType: jest.fn(),
      getAncestorChain: jest.fn(),
      find: jest.fn(),
      findBuiltInType: jest.fn(),
      findSObjectType: jest.fn(),
      findUserType: jest.fn(),
      findExternalType: jest.fn(),
      isStandardApexClass: jest.fn(),
      getAvailableStandardClasses: jest.fn(),
      resolveStandardApexClass: jest.fn(),
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

describe('DocumentChangeProcessingService', () => {
  let service: DocumentChangeProcessingService;
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
      removeFile: jest.fn(),
      addSymbolTable: jest.fn(),
      getSymbolAtPosition: jest.fn(),
      getAllReferencesInFile: jest.fn(),
      resolveSymbol: jest.fn(),
      getAllSymbolsForCompletion: jest.fn(),
      getStats: jest.fn(),
      clear: jest.fn(),
      optimizeMemory: jest.fn(),
      createResolutionContext: jest.fn(),
      constructFQN: jest.fn(),
      getContainingType: jest.fn(),
      getAncestorChain: jest.fn(),
      find: jest.fn(),
      findBuiltInType: jest.fn(),
      findSObjectType: jest.fn(),
      findUserType: jest.fn(),
      findExternalType: jest.fn(),
      isStandardApexClass: jest.fn(),
      getAvailableStandardClasses: jest.fn(),
      resolveStandardApexClass: jest.fn(),
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

    service = new DocumentChangeProcessingService(
      mockLogger,
      mockSymbolManager,
    );
  });

  describe('constructor', () => {
    it('should create service with provided logger and symbol manager', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DocumentChangeProcessingService);
    });

    it('should create service with default symbol manager when not provided', () => {
      const {
        SymbolManagerFactory,
      } = require('@salesforce/apex-lsp-parser-ast');

      new DocumentChangeProcessingService(mockLogger);

      expect(SymbolManagerFactory.createSymbolManager).toHaveBeenCalled();
    });
  });

  describe('processDocumentChange', () => {
    it('should process document change event successfully', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      const result = await service.processDocumentChange(event);

      expect(mockStorage.setDocument).toHaveBeenCalledWith(
        event.document.uri,
        event.document,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toEqual([]);
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      mockStorage.setDocument.mockRejectedValue(new Error('Storage error'));

      const result = await service.processDocumentChange(event);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toEqual([]);
    });

    it('should log document processing completion', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      await service.processDocumentChange(event);

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle empty content changes', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => '',
          positionAt: jest.fn(),
          offsetAt: jest.fn(),
          lineCount: 0,
        },
        contentChanges: [],
      };

      const result = await service.processDocumentChange(event);

      expect(mockStorage.setDocument).toHaveBeenCalledWith(
        event.document.uri,
        event.document,
      );
      expect(result).toEqual([]);
    });

    it('should handle large document changes', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: largeContent,
          },
        ],
      };

      const result = await service.processDocumentChange(event);

      expect(mockStorage.setDocument).toHaveBeenCalledWith(
        event.document.uri,
        event.document,
      );
      expect(result).toEqual([]);
    });
  });

  describe('interface compliance', () => {
    it('should implement IDocumentChangeProcessor interface', () => {
      expect(service).toHaveProperty('processDocumentChange');
      expect(typeof service.processDocumentChange).toBe('function');
    });

    it('should have correct method signature', () => {
      const processor: IDocumentChangeProcessor = service;
      expect(processor.processDocumentChange).toBeDefined();
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      const result = await service.processDocumentChange(event);

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
      expect(result).toEqual([]);
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      const result = await service.processDocumentChange(event);

      expect(mockStorage.setDocument).toHaveBeenCalledWith('', event.document);
      expect(result).toEqual([]);
    });
  });

  describe('performance considerations', () => {
    it('should handle rapid successive changes', async () => {
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
        contentChanges: [
          {
            range: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 0 },
            },
            rangeLength: 0,
            text: 'public class TestClass {}',
          },
        ],
      };

      // Process multiple changes rapidly
      const promises = Array.from({ length: 10 }, () =>
        service.processDocumentChange(event),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockStorage.setDocument).toHaveBeenCalledTimes(10);
      results.forEach((result) => expect(result).toEqual([]));
    });
  });
});
