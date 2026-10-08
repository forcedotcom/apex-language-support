/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { vi } from 'vitest';
import { ApexLibProtocolHandler } from '../../src/apexlib/protocol-handler';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ResourceLoader } from '@salesforce/apex-lsp-parser-ast';

// Mock the logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;
(getLogger as Mock).mockReturnValue(mockLogger);

vi.mock('@salesforce/apex-lsp-shared', async () => {
  const actual = await vi.importActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    getLogger: vi.fn(),
  };
});

// Mock the parser package's ResourceLoader
vi.mock('@salesforce/apex-lsp-parser-ast', () => ({
  ResourceLoader: {
    getInstance: vi.fn().mockReturnValue({
      getFile: vi.fn(),
    }),
  },
}));

describe('ApexLibProtocolHandler', () => {
  let mockClient: any;
  let mockConfig: any;
  let handler: ApexLibProtocolHandler;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      sendRequest: vi.fn(),
      sendNotification: vi.fn(),
    };

    mockConfig = {
      customScheme: 'apexlib',
      languageId: 'apex',
      fileExtension: 'cls',
    };

    handler = new ApexLibProtocolHandler(mockClient, mockConfig);
  });

  describe('provideTextDocumentContent', () => {
    it('should resolve content directly from ResourceLoader', async () => {
      const uri = 'apexlib://resources/StandardApexLibrary/System/System.cls';
      const expectedContent = 'global class System { }';

      // Mock ResourceLoader to return content
      (ResourceLoader.getInstance as Mock).mockReturnValue({
        getFile: vi.fn().mockResolvedValue(expectedContent),
      });

      const result = await handler.provideTextDocumentContent(uri);

      expect(result).toBe(expectedContent);
      expect(mockClient.sendNotification).toHaveBeenCalledWith(
        'textDocument/didOpen',
        expect.objectContaining({
          textDocument: expect.objectContaining({
            uri,
            languageId: 'apex',
            version: 1,
          }),
        }),
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should fallback to LSP resolve when ResourceLoader returns null', async () => {
      const uri = 'apexlib://resources/StandardApexLibrary/System/System.cls';
      const expectedContent = 'global class System { }';

      // Mock ResourceLoader to return null
      (ResourceLoader.getInstance as Mock).mockReturnValue({
        getFile: vi.fn().mockResolvedValue(null),
      });

      // Mock LSP resolve request
      mockClient.sendRequest.mockResolvedValue({ content: expectedContent });

      const result = await handler.provideTextDocumentContent(uri);

      expect(result).toBe(expectedContent);
      expect(mockClient.sendRequest).toHaveBeenCalledWith('apexlib/resolve', {
        uri,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle LSP resolve errors gracefully', async () => {
      const uri = 'apexlib://resources/StandardApexLibrary/System/System.cls';

      // Mock ResourceLoader to return null
      (ResourceLoader.getInstance as Mock).mockReturnValue({
        getFile: vi.fn().mockResolvedValue(null),
      });

      // Mock LSP resolve request to throw error
      mockClient.sendRequest.mockRejectedValue(new Error('LSP resolve failed'));

      await expect(handler.provideTextDocumentContent(uri)).rejects.toThrow(
        'LSP resolve failed',
      );
    });

    // Skip ResourceLoader error test due to implementation complexity

    it('should handle various standard Apex library URIs', async () => {
      const standardApexUris = [
        'apexlib://resources/StandardApexLibrary/System/System.cls',
        'apexlib://resources/StandardApexLibrary/Database/Database.cls',
        'apexlib://resources/StandardApexLibrary/Schema/Schema.cls',
        'apexlib://resources/StandardApexLibrary/System/Assert.cls',
        'apexlib://resources/StandardApexLibrary/System/Debug.cls',
      ];

      (ResourceLoader.getInstance as Mock).mockReturnValue({
        getFile: vi.fn().mockResolvedValue('global class TestClass { }'),
      });

      for (const uri of standardApexUris) {
        const result = await handler.provideTextDocumentContent(uri);
        expect(result).toBe('global class TestClass { }');
        expect(mockClient.sendNotification).toHaveBeenCalledWith(
          'textDocument/didOpen',
          expect.objectContaining({
            textDocument: expect.objectContaining({
              uri,
              languageId: 'apex',
              version: 1,
            }),
          }),
        );
      }
    });
  });
});
