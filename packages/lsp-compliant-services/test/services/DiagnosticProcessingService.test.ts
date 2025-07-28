/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DocumentSymbolParams } from 'vscode-languageserver';
import { LoggerInterface, getLogger } from '@salesforce/apex-lsp-shared';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { DiagnosticProcessingService } from '../../src/services/DiagnosticProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import { ApexSettingsManager } from '../../src/settings/ApexSettingsManager';

// Mock dependencies
jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
  ApexSymbolManager: jest.fn(),
  ApexError: jest.fn(),
  CompilerService: jest.fn(),
  SymbolTable: jest.fn(),
  ApexSymbolCollectorListener: jest.fn(),
}));
jest.mock('@salesforce/apex-lsp-shared', () => ({
  getLogger: jest.fn(),
  defineEnum: jest.fn((entries) => {
    const result: any = {};
    entries.forEach(([key, value]: [string, any], index: number) => {
      const val = value !== undefined ? value : index;
      result[key] = val;
      result[val] = key;
    });
    return Object.freeze(result);
  }),
}));
jest.mock('../../src/storage/ApexStorageManager');
jest.mock('../../src/settings/ApexSettingsManager');
jest.mock('../../src/utils/handlerUtil');

describe('DiagnosticProcessingService', () => {
  let mockLogger: jest.Mocked<LoggerInterface>;
  let mockStorage: any;
  let service: DiagnosticProcessingService;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockStorage = {
      getDocument: jest.fn(),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    (ApexSettingsManager.getInstance as jest.Mock).mockReturnValue({
      getCompilationOptions: jest.fn().mockReturnValue({}),
    });

    // Mock the getLogger function to return our mock logger
    (getLogger as jest.Mock).mockReturnValue(mockLogger);

    // Reset the getDiagnosticsFromErrors mock
    const { getDiagnosticsFromErrors } = require('../../src/utils/handlerUtil');
    getDiagnosticsFromErrors.mockReset();

    service = new DiagnosticProcessingService();
  });

  describe('processDiagnostic', () => {
    it('should return empty array when document not found', async () => {
      const params: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      mockStorage.getDocument.mockResolvedValue(null);

      const result = await service.processDiagnostic(params);

      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should process document and return diagnostics', async () => {
      const params: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      const mockDocument = {
        uri: 'file:///test.cls',
        getText: () => 'public class TestClass { }',
      } as TextDocument;

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Mock the compilation result with errors
      const mockCompileResult = {
        errors: [
          {
            type: 'syntax',
            severity: 'error',
            message: 'Test error',
            line: 1,
            column: 1,
            filePath: 'file:///test.cls',
          },
        ],
      };

      // Mock the CompilerService
      const { CompilerService } = require('@salesforce/apex-lsp-parser-ast');
      const mockCompile = jest.fn().mockReturnValue(mockCompileResult);
      CompilerService.mockImplementation(() => ({
        compile: mockCompile,
      }));

      // Mock the getDiagnosticsFromErrors function
      const mockGetDiagnosticsFromErrors = jest.fn().mockReturnValue([
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Test error',
          severity: 1,
        },
      ]);

      const {
        getDiagnosticsFromErrors,
      } = require('../../src/utils/handlerUtil');
      getDiagnosticsFromErrors.mockImplementation(mockGetDiagnosticsFromErrors);

      const result = await service.processDiagnostic(params);

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe('Test error');
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return empty array when no errors found', async () => {
      const params: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      const mockDocument = {
        uri: 'file:///test.cls',
        getText: () => 'public class TestClass { }',
      } as TextDocument;

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Mock the compilation result with no errors
      const mockCompileResult = {
        errors: [],
      };

      // Mock the CompilerService
      const { CompilerService } = require('@salesforce/apex-lsp-parser-ast');
      CompilerService.mockImplementation(() => ({
        compile: jest.fn().mockReturnValue(mockCompileResult),
      }));

      // Mock the getDiagnosticsFromErrors function to return empty array
      const {
        getDiagnosticsFromErrors,
      } = require('../../src/utils/handlerUtil');
      getDiagnosticsFromErrors.mockReturnValue([]);

      const result = await service.processDiagnostic(params);

      expect(result).toEqual([]);
    });

    it('should handle compilation errors gracefully', async () => {
      const params: DocumentSymbolParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      const mockDocument = {
        uri: 'file:///test.cls',
        getText: () => 'public class TestClass { }',
      } as TextDocument;

      mockStorage.getDocument.mockResolvedValue(mockDocument);

      // Mock the CompilerService to throw an error
      const { CompilerService } = require('@salesforce/apex-lsp-parser-ast');
      CompilerService.mockImplementation(() => ({
        compile: jest.fn().mockImplementation(() => {
          throw new Error('Compilation failed');
        }),
      }));

      const result = await service.processDiagnostic(params);

      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
