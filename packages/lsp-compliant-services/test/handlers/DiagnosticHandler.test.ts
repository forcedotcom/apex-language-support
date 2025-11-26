/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic, DocumentSymbolParams } from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { processOnDiagnostic } from '../../src/handlers/DiagnosticHandler';

// Mock the logging module
jest.mock('@salesforce/apex-lsp-shared', () => ({
  ...jest.requireActual('@salesforce/apex-lsp-shared'),
  getLogger: jest.fn(),
}));

// Mock the DiagnosticProcessingService
jest.mock('../../src/services/DiagnosticProcessingService', () => ({
  DiagnosticProcessingService: jest.fn(),
}));

describe('processOnDiagnostic', () => {
  let mockLogger: jest.Mocked<ReturnType<typeof getLogger>>;
  let mockDiagnosticProcessor: any;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockDiagnosticProcessor = {
      processDiagnostic: jest.fn(),
    };

    (getLogger as jest.Mock).mockReturnValue(mockLogger);
    const {
      DiagnosticProcessingService,
    } = require('../../src/services/DiagnosticProcessingService');
    DiagnosticProcessingService.mockImplementation(
      () => mockDiagnosticProcessor,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processOnDiagnostic', () => {
    it('should process diagnostic request successfully', async () => {
      const mockParams: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      const mockDiagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Test error',
          severity: 1,
        },
      ];

      mockDiagnosticProcessor.processDiagnostic.mockResolvedValue(
        mockDiagnostics,
      );

      const result = await processOnDiagnostic(mockParams);

      expect(result).toEqual({ items: mockDiagnostics, kind: 'full' });
      expect(mockDiagnosticProcessor.processDiagnostic).toHaveBeenCalledWith(
        mockParams,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle errors gracefully and return empty array', async () => {
      const mockParams: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      const error = new Error('Test error');
      mockDiagnosticProcessor.processDiagnostic.mockRejectedValue(error);

      const result = await processOnDiagnostic(mockParams);

      expect(result).toEqual({ items: [], kind: 'full' });
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return empty array when no diagnostics found', async () => {
      const mockParams: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      mockDiagnosticProcessor.processDiagnostic.mockResolvedValue([]);

      const result = await processOnDiagnostic(mockParams);

      expect(result).toEqual({ items: [], kind: 'full' });
      expect(mockDiagnosticProcessor.processDiagnostic).toHaveBeenCalledWith(
        mockParams,
      );
    });
  });
});
