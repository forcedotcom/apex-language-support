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
import { DocumentProcessingService } from '../../src/services/DocumentProcessingService';
import { DocumentSymbolResultStore } from '../../src/services/DocumentSymbolResultStore';

// Only mock storage - use real implementations for everything else
jest.mock('../../src/storage/ApexStorageManager');

describe('DocumentChangeProcessingService', () => {
  let service: DocumentChangeProcessingService;
  let logger: ReturnType<typeof getLogger>;
  let mockDocumentProcessingService: jest.Mocked<
    Pick<DocumentProcessingService, 'processDocumentOpenInternal'>
  >;
  let mockDocumentSymbolCache: { invalidate: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    logger = getLogger();

    mockDocumentProcessingService = {
      processDocumentOpenInternal: jest.fn().mockResolvedValue([]),
    };
    mockDocumentSymbolCache = {
      invalidate: jest.fn(),
    };
    jest
      .spyOn(DocumentSymbolResultStore, 'getInstance')
      .mockReturnValue(mockDocumentSymbolCache as any);

    service = new DocumentChangeProcessingService(
      logger,
      mockDocumentProcessingService as unknown as DocumentProcessingService,
    );
  });

  describe('constructor', () => {
    it('should create service with provided logger and document processing service', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DocumentChangeProcessingService);
    });

    it('should create service with default document processing service when not provided', () => {
      const serviceWithDefault = new DocumentChangeProcessingService(logger);
      expect(serviceWithDefault).toBeDefined();
      expect(serviceWithDefault).toBeInstanceOf(
        DocumentChangeProcessingService,
      );
    });
  });

  describe('processDocumentChange', () => {
    it('should delegate to shared tier-1 pipeline', async () => {
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

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalledWith(event);
      expect(mockDocumentSymbolCache.invalidate).toHaveBeenCalledWith(
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

      mockDocumentProcessingService.processDocumentOpenInternal.mockRejectedValue(
        new Error('Processing error'),
      );

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Error should be handled gracefully (service uses fire-and-forget pattern)
      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalled();
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
      };

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalledWith(event);
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
      };

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalledWith(event);
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
    it('should handle pipeline errors gracefully', async () => {
      mockDocumentProcessingService.processDocumentOpenInternal.mockRejectedValue(
        new Error('Pipeline not available'),
      );

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

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Error should be handled gracefully (service uses fire-and-forget pattern)
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

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalledWith(event);
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
      };

      // Process multiple changes rapidly (fire-and-forget)
      for (let i = 0; i < 10; i++) {
        service.processDocumentChange(event);
      }

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalledTimes(10);
    });

    it('should process standard Apex library URIs', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'apexlib://resources/StandardApexLibrary/System/System.cls',
          getText: () => 'global class System { }',
        } as TextDocument,
      };

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalled();
    });

    it('should process user code URIs', async () => {
      const event: TextDocumentChangeEvent<TextDocument> = {
        document: {
          uri: 'file:///Users/test/MyClass.cls',
          getText: () => 'public class MyClass { }',
        } as TextDocument,
      };

      service.processDocumentChange(event);

      // Wait for async operations to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(
        mockDocumentProcessingService.processDocumentOpenInternal,
      ).toHaveBeenCalledWith(event);
    });
  });
});
