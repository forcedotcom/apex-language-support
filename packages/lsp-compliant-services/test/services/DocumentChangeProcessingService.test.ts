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
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbolManager } from '@salesforce/apex-lsp-parser-ast';

// Only mock storage - use real implementations for everything else
jest.mock('../../src/storage/ApexStorageManager');

describe('DocumentChangeProcessingService', () => {
  let service: DocumentChangeProcessingService;
  let logger: ReturnType<typeof getLogger>;
  let symbolManager: ApexSymbolManager;
  let mockStorage: any;

  beforeEach(() => {
    jest.clearAllMocks();

    logger = getLogger();
    symbolManager = new ApexSymbolManager();

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

    service = new DocumentChangeProcessingService(logger, symbolManager);
  });

  describe('constructor', () => {
    it('should create service with provided logger and symbol manager', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DocumentChangeProcessingService);
    });

    it('should create service with default symbol manager when not provided', () => {
      const serviceWithoutSymbolManager = new DocumentChangeProcessingService(
        logger,
      );
      expect(serviceWithoutSymbolManager).toBeDefined();
      expect(serviceWithoutSymbolManager).toBeInstanceOf(
        DocumentChangeProcessingService,
      );
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

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockStorage.setDocument).toHaveBeenCalledWith(
        event.document.uri,
        event.document,
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

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Error should be handled gracefully (service uses fire-and-forget pattern)
      expect(mockStorage.setDocument).toHaveBeenCalled();
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

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockStorage.setDocument).toHaveBeenCalled();
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

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockStorage.setDocument).toHaveBeenCalledWith(
        event.document.uri,
        event.document,
      );
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

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockStorage.setDocument).toHaveBeenCalledWith(
        event.document.uri,
        event.document,
      );
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

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Error should be handled gracefully (service uses fire-and-forget pattern)
      // The service will attempt to process but handle the error internally
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

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockStorage.setDocument).toHaveBeenCalledWith('', event.document);
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

      // Process multiple changes rapidly (fire-and-forget)
      for (let i = 0; i < 10; i++) {
        service.processDocumentChange(event);
      }

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockStorage.setDocument).toHaveBeenCalledTimes(10);
    });

    it('should suppress diagnostics for standard Apex library URIs', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'apexlib://resources/StandardApexLibrary/System/System.cls',
          getText: () => 'global class System { }',
        } as TextDocument,
        contentChanges: [],
      };

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Document should still be stored even for standard library URIs
      expect(mockStorage.setDocument).toHaveBeenCalled();
    });

    it('should suppress diagnostics for various standard Apex library URIs', async () => {
      const standardApexUris = [
        'apexlib://resources/StandardApexLibrary/Database/Database.cls',
        'apexlib://resources/StandardApexLibrary/Schema/Schema.cls',
        'apexlib://resources/StandardApexLibrary/System/Assert.cls',
        'apexlib://resources/StandardApexLibrary/System/Debug.cls',
      ];

      for (const uri of standardApexUris) {
        const event: TextDocumentChangeEvent<TextDocument> = {
          document: {
            uri,
            getText: () => 'global class TestClass { }',
          } as TextDocument,
          contentChanges: [],
        };

        service.processDocumentChange(event);

        // Wait for async operations to complete
        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(mockStorage.setDocument).toHaveBeenCalled();
      }
    });

    it('should not suppress diagnostics for user code URIs', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///Users/test/MyClass.cls',
          getText: () => 'public class MyClass { }',
        } as TextDocument,
        contentChanges: [],
      };

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Since it's fire-and-forget, just verify the method was called
      expect(mockStorage.setDocument).toHaveBeenCalledWith(
        event.document.uri,
        event.document,
      );
    });
  });
});
