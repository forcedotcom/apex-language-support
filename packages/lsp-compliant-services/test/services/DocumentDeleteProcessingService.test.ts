/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DeleteFilesParams } from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  DocumentDeleteProcessingService,
  IDocumentDeleteProcessor,
} from '../../src/services/DocumentDeleteProcessingService';

// Mock storage
jest.mock('../../src/storage/ApexStorageManager');

describe('DocumentDeleteProcessingService', () => {
  let service: DocumentDeleteProcessingService;
  let logger: ReturnType<typeof getLogger>;
  let mockStorage: any;
  let mockSymbolManager: any;

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

    mockSymbolManager = {
      removeFile: jest.fn(),
      findSymbolsInFile: jest.fn().mockReturnValue([]),
      addSymbolTable: jest.fn(),
    };

    service = new DocumentDeleteProcessingService(logger, mockSymbolManager);
  });

  describe('processDocumentDelete', () => {
    it('should remove symbols via removeFile on delete', async () => {
      const event: DeleteFilesParams = {
        files: [{ uri: 'file:///deleted.cls' }],
      };

      await service.processDocumentDelete(event);

      expect(mockSymbolManager.removeFile).toHaveBeenCalledWith(
        'file:///deleted.cls',
      );
    });

    it('should invalidate document state cache on delete', async () => {
      const {
        getDocumentStateCache,
      } = require('../../src/services/DocumentStateCache');
      const cache = getDocumentStateCache();
      const testUri = 'file:///deletecache.cls';

      // Populate the cache first
      cache.merge(testUri, {
        diagnostics: [],
        documentVersion: 1,
        documentLength: 100,
        symbolsIndexed: false,
      });

      expect(cache.get(testUri, 1)).not.toBeNull();

      const event: DeleteFilesParams = {
        files: [{ uri: testUri }],
      };

      await service.processDocumentDelete(event);

      // Cache should be invalidated after delete
      expect(cache.get(testUri, 1)).toBeNull();
    });

    it('should remove document from storage on delete', async () => {
      const event: DeleteFilesParams = {
        files: [{ uri: 'file:///deleted.cls' }],
      };

      await service.processDocumentDelete(event);

      expect(mockStorage.deleteDocument).toHaveBeenCalledWith(
        'file:///deleted.cls',
      );
    });

    it('should process multiple deleted files', async () => {
      const event: DeleteFilesParams = {
        files: [
          { uri: 'file:///a.cls' },
          { uri: 'file:///b.cls' },
          { uri: 'file:///c.cls' },
        ],
      };

      await service.processDocumentDelete(event);

      expect(mockSymbolManager.removeFile).toHaveBeenCalledTimes(3);
      expect(mockStorage.deleteDocument).toHaveBeenCalledTimes(3);
    });

    it('should handle errors in removeFile gracefully', async () => {
      mockSymbolManager.removeFile.mockImplementation(() => {
        throw new Error('removeFile failed');
      });

      const event: DeleteFilesParams = {
        files: [{ uri: 'file:///error.cls' }],
      };

      // Should not throw
      await service.processDocumentDelete(event);

      expect(mockSymbolManager.removeFile).toHaveBeenCalled();
    });
  });

  describe('interface compliance', () => {
    it('should implement IDocumentDeleteProcessor interface', () => {
      const processor: IDocumentDeleteProcessor = service;
      expect(processor.processDocumentDelete).toBeDefined();
    });
  });
});
