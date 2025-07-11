/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic, DocumentSymbolParams } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-logging';

import { DiagnosticHandler } from '../../src/handlers/DiagnosticHandler';
import { IDiagnosticProcessor } from '../../src/services/DiagnosticProcessingService';

describe('DiagnosticHandler', () => {
  let mockLogger: jest.Mocked<LoggerInterface>;
  let mockDiagnosticProcessor: jest.Mocked<IDiagnosticProcessor>;
  let handler: DiagnosticHandler;

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

    handler = new DiagnosticHandler(mockLogger, mockDiagnosticProcessor);
  });

  describe('handleDiagnostic', () => {
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

      const result = await handler.handleDiagnostic(mockParams);

      expect(result).toEqual(mockDiagnostics);
      expect(mockDiagnosticProcessor.processDiagnostic).toHaveBeenCalledWith(
        mockParams,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle errors gracefully', async () => {
      const mockParams: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      const error = new Error('Test error');
      mockDiagnosticProcessor.processDiagnostic.mockRejectedValue(error);

      await expect(handler.handleDiagnostic(mockParams)).rejects.toThrow(
        'Test error',
      );

      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return empty array when no diagnostics found', async () => {
      const mockParams: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      mockDiagnosticProcessor.processDiagnostic.mockResolvedValue([]);

      const result = await handler.handleDiagnostic(mockParams);

      expect(result).toEqual([]);
      expect(mockDiagnosticProcessor.processDiagnostic).toHaveBeenCalledWith(
        mockParams,
      );
    });
  });
});
