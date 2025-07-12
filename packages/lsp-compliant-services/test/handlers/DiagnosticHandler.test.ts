/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic, DocumentSymbolParams } from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-logging';

import { processOnDiagnostic } from '../../src/handlers/DiagnosticHandler';

// Mock the logging module
jest.mock('@salesforce/apex-lsp-logging', () => ({
  getLogger: jest.fn(),
}));

// Mock the DiagnosticProcessingService
jest.mock('../../src/services/DiagnosticProcessingService', () => ({
  DiagnosticProcessingService: jest.fn(),
}));

// Mock the ApexSettingsManager
jest.mock('../../src/settings/ApexSettingsManager', () => ({
  ApexSettingsManager: {
    getInstance: jest.fn(),
  },
}));

describe('processOnDiagnostic', () => {
  let mockLogger: jest.Mocked<ReturnType<typeof getLogger>>;
  let mockDiagnosticProcessor: any;
  let mockSettingsManager: any;

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

    mockSettingsManager = {
      getSettings: jest.fn(),
    };

    (getLogger as jest.Mock).mockReturnValue(mockLogger);
    const {
      DiagnosticProcessingService,
    } = require('../../src/services/DiagnosticProcessingService');
    DiagnosticProcessingService.mockImplementation(
      () => mockDiagnosticProcessor,
    );

    const {
      ApexSettingsManager,
    } = require('../../src/settings/ApexSettingsManager');
    ApexSettingsManager.getInstance.mockReturnValue(mockSettingsManager);
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

      // Mock settings with pull diagnostics enabled
      mockSettingsManager.getSettings.mockReturnValue({
        diagnostics: {
          enablePullDiagnostics: true,
          enablePushDiagnostics: true,
        },
      });

      mockDiagnosticProcessor.processDiagnostic.mockResolvedValue(
        mockDiagnostics,
      );

      const result = await processOnDiagnostic(mockParams);

      expect(result).toEqual(mockDiagnostics);
      expect(mockDiagnosticProcessor.processDiagnostic).toHaveBeenCalledWith(
        mockParams,
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle errors gracefully and return empty array', async () => {
      const mockParams: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      // Mock settings with pull diagnostics enabled
      mockSettingsManager.getSettings.mockReturnValue({
        diagnostics: {
          enablePullDiagnostics: true,
          enablePushDiagnostics: true,
        },
      });

      const error = new Error('Test error');
      mockDiagnosticProcessor.processDiagnostic.mockRejectedValue(error);

      const result = await processOnDiagnostic(mockParams);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return empty array when no diagnostics found', async () => {
      const mockParams: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      // Mock settings with pull diagnostics enabled
      mockSettingsManager.getSettings.mockReturnValue({
        diagnostics: {
          enablePullDiagnostics: true,
          enablePushDiagnostics: true,
        },
      });

      mockDiagnosticProcessor.processDiagnostic.mockResolvedValue([]);

      const result = await processOnDiagnostic(mockParams);

      expect(result).toEqual([]);
      expect(mockDiagnosticProcessor.processDiagnostic).toHaveBeenCalledWith(
        mockParams,
      );
    });

    it('should short-circuit when enablePullDiagnostics is disabled', async () => {
      const mockParams: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      // Mock settings with pull diagnostics disabled
      mockSettingsManager.getSettings.mockReturnValue({
        diagnostics: {
          enablePullDiagnostics: false,
          enablePushDiagnostics: true,
        },
      });

      const result = await processOnDiagnostic(mockParams);

      expect(result).toEqual([]);
      expect(mockDiagnosticProcessor.processDiagnostic).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should process diagnostics when enablePullDiagnostics is enabled', async () => {
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

      // Mock settings with pull diagnostics enabled
      mockSettingsManager.getSettings.mockReturnValue({
        diagnostics: {
          enablePullDiagnostics: true,
          enablePushDiagnostics: true,
        },
      });

      mockDiagnosticProcessor.processDiagnostic.mockResolvedValue(
        mockDiagnostics,
      );

      const result = await processOnDiagnostic(mockParams);

      expect(result).toEqual(mockDiagnostics);
      expect(mockDiagnosticProcessor.processDiagnostic).toHaveBeenCalledWith(
        mockParams,
      );
    });
  });
});
