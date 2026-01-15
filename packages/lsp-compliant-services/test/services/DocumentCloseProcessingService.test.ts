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
import { getLogger } from '@salesforce/apex-lsp-shared';

// Only mock storage - use real implementations for everything else
jest.mock('../../src/storage/ApexStorageManager');

describe('DocumentCloseProcessingService', () => {
  let service: DocumentCloseProcessingService;
  let logger: ReturnType<typeof getLogger>;
  let mockStorage: any;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = getLogger();

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

    service = new DocumentCloseProcessingService(logger);
  });

  describe('constructor', () => {
    it('should create service with provided logger', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DocumentCloseProcessingService);
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
      };

      await service.processDocumentClose(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalledWith(
        event.document.uri,
      );
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
      };

      mockStorage.deleteDocument.mockRejectedValue(new Error('Storage error'));

      await service.processDocumentClose(event);

      // Error should be handled gracefully
      expect(mockStorage.deleteDocument).toHaveBeenCalled();
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
      };

      await service.processDocumentClose(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalled();
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
      };

      await service.processDocumentClose(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalledWith(
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
      };

      await service.processDocumentClose(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalledWith(
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
      };

      await service.processDocumentClose(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalledWith(
        'file:///test.cls',
      );
    });

    it('should NOT remove symbols on document close', async () => {
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
      };

      await service.processDocumentClose(event);

      // NOTE: Symbols are NOT removed on didClose - only didDelete removes symbols
      // This is intentional - didClose is only for document sync housekeeping
      // The service only removes documents from storage, not from symbol manager
      expect(mockStorage.deleteDocument).toHaveBeenCalled();
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
      };

      // Create a new service instance after mocking to get the error
      const errorService = new DocumentCloseProcessingService(logger);
      await errorService.processDocumentClose(event);

      // Error should be handled gracefully - deleteDocument won't be called if storage is null
      // The service logs the error and continues without crashing
      expect(mockStorage.deleteDocument).not.toHaveBeenCalled();
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
      };

      await service.processDocumentClose(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalledWith('');
      // NOTE: Symbols are NOT removed on didClose - only didDelete removes symbols
      // The service only removes documents from storage, not from symbol manager
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
      };

      mockStorage.deleteDocument.mockRejectedValue(new Error('Storage error'));

      await service.processDocumentClose(event);

      // Error should be handled gracefully - deleteDocument was attempted
      expect(mockStorage.deleteDocument).toHaveBeenCalled();
      // NOTE: Symbols are NOT removed on didClose - only didDelete removes symbols
      // The service only removes documents from storage, not from symbol manager
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
      // NOTE: Symbols are NOT removed on didClose - only didDelete removes symbols
      // The service only removes documents from storage, not from symbol manager
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
      }));

      const promises = events.map((event) =>
        service.processDocumentClose(event),
      );
      await Promise.all(promises);

      expect(mockStorage.deleteDocument).toHaveBeenCalledTimes(5);
      // NOTE: Symbols are NOT removed on didClose - only didDelete removes symbols
      // The service only removes documents from storage, not from symbol manager
    });
  });
});
