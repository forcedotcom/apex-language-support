/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  dispatch,
  getDiagnosticsFromErrors,
} from '../../src/utils/handlerUtil';
import { getLogger } from '@salesforce/apex-lsp-logging';
import { DiagnosticSeverity } from 'vscode-languageserver';
import {
  ApexError,
  ErrorType,
  ErrorSeverity,
} from '@salesforce/apex-lsp-parser-ast';

jest.mock('@salesforce/apex-lsp-logging');

describe('handlerUtil', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('dispatch', () => {
    it('should return successful operation result', async () => {
      const result = 'test result';
      const operation = Promise.resolve(result);
      const errorMessage = 'Test error message';

      const dispatchResult = await dispatch(operation, errorMessage);

      expect(dispatchResult).toBe(result);
      expect(mockLogger.log).not.toHaveBeenCalled();
    });

    it('should log error and rethrow when operation fails', async () => {
      const error = new Error('fail');
      const operation = Promise.reject(error);
      const errorMessage = 'Failed operation';

      await expect(dispatch(operation, errorMessage)).rejects.toThrow(error);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Error in dispatch'),
      );
    });

    it('should handle non-Error objects in catch', async () => {
      const error = 'fail';
      const operation = Promise.reject(error);
      const errorMessage = 'Failed operation';

      await expect(dispatch(operation, errorMessage)).rejects.toBe(error);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Error in dispatch'),
      );
    });

    it('should handle complex return types', async () => {
      const result = { data: 'test', count: 42 };
      const operation = Promise.resolve(result);
      const errorMessage = 'Test error message';

      const dispatchResult = await dispatch(operation, errorMessage);

      expect(dispatchResult).toEqual(result);
      expect(mockLogger.log).not.toHaveBeenCalled();
    });
  });

  describe('getDiagnosticsFromErrors', () => {
    const createMockError = (
      overrides: Partial<ApexError> = {},
    ): ApexError => ({
      type: ErrorType.Syntax,
      severity: ErrorSeverity.Error,
      message: 'Test error',
      line: 1,
      column: 1,
      ...overrides,
    });

    it('should convert basic errors to diagnostics', () => {
      const errors: ApexError[] = [
        createMockError({
          message: 'Syntax error',
          line: 5,
          column: 10,
        }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0]).toEqual({
        range: {
          start: { line: 4, character: 9 },
          end: { line: 4, character: 10 },
        },
        message: 'Syntax error',
        severity: DiagnosticSeverity.Error,
        source: 'apex-parser',
        code: 'SYNTAX_ERROR',
      });
    });

    it('should handle warnings when includeWarnings is true', () => {
      const errors: ApexError[] = [
        createMockError({
          severity: ErrorSeverity.Warning,
          message: 'Warning message',
          line: 3,
          column: 5,
        }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors, {
        includeWarnings: true,
      });

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Warning);
      expect(diagnostics[0].code).toBe('SYNTAX_WARNING');
    });

    it('should exclude warnings when includeWarnings is false', () => {
      const errors: ApexError[] = [
        createMockError({ severity: ErrorSeverity.Error }),
        createMockError({ severity: ErrorSeverity.Warning }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors, {
        includeWarnings: false,
      });

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
    });

    it('should handle info messages when includeInfo is true', () => {
      const errors: ApexError[] = [
        createMockError({
          severity: ErrorSeverity.Info,
          message: 'Info message',
        }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors, {
        includeInfo: true,
      });

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Information);
      expect(diagnostics[0].code).toBe('SYNTAX_INFO');
    });

    it('should exclude info messages when includeInfo is false', () => {
      const errors: ApexError[] = [
        createMockError({ severity: ErrorSeverity.Error }),
        createMockError({ severity: ErrorSeverity.Info }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors, {
        includeInfo: false,
      });

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
    });

    it('should handle semantic errors', () => {
      const errors: ApexError[] = [
        createMockError({
          type: ErrorType.Semantic,
          message: 'Semantic error',
        }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors);

      expect(diagnostics[0].code).toBe('SEMANTIC_ERROR');
    });

    it('should use endLine and endColumn when available', () => {
      const errors: ApexError[] = [
        createMockError({
          line: 2,
          column: 3,
          endLine: 2,
          endColumn: 8,
        }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors);

      expect(diagnostics[0].range).toEqual({
        start: { line: 1, character: 2 },
        end: { line: 1, character: 7 },
      });
    });

    it('should estimate range from source text when end positions not available', () => {
      const errors: ApexError[] = [
        createMockError({
          line: 1,
          column: 1,
          source: 'public class Test',
        }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors);

      expect(diagnostics[0].range).toEqual({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 17 },
      });
      expect(diagnostics[0].source).toBe('apex-parser');
    });

    it('should handle multi-line source text', () => {
      const errors: ApexError[] = [
        createMockError({
          line: 1,
          column: 1,
          source: 'public class Test\n{\n}',
        }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors);

      expect(diagnostics[0].range).toEqual({
        start: { line: 0, character: 0 },
        end: { line: 2, character: 1 },
      });
    });

    it('should include file path in related information when available', () => {
      const errors: ApexError[] = [
        createMockError({
          filePath: 'file:///test.cls',
        }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors);

      expect(diagnostics[0].relatedInformation).toEqual([
        {
          location: {
            uri: 'file:///test.cls',
            range: diagnostics[0].range,
          },
          message: 'Test error',
        },
      ]);
    });

    it('should limit diagnostics when maxDiagnostics is set', () => {
      const errors: ApexError[] = Array.from({ length: 5 }, (_, i) =>
        createMockError({
          message: `Error ${i}`,
          line: i + 1,
        }),
      );

      const diagnostics = getDiagnosticsFromErrors(errors, {
        maxDiagnostics: 3,
      });

      expect(diagnostics).toHaveLength(3);
      expect(diagnostics[0].message).toBe('Error 0');
      expect(diagnostics[1].message).toBe('Error 1');
      expect(diagnostics[2].message).toBe('Error 2');
    });

    it('should exclude diagnostic codes when includeCodes is false', () => {
      const errors: ApexError[] = [createMockError()];

      const diagnostics = getDiagnosticsFromErrors(errors, {
        includeCodes: false,
      });

      expect(diagnostics[0].code).toBeUndefined();
    });

    it('should handle bounds checking for negative line/column values', () => {
      const errors: ApexError[] = [
        createMockError({
          line: 0,
          column: 0,
        }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors);

      expect(diagnostics[0].range).toEqual({
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      });
    });

    it('should handle unknown severity gracefully', () => {
      const errors: ApexError[] = [
        createMockError({
          severity: 'unknown' as ErrorSeverity,
        }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors);

      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
    });

    it('should handle empty errors array', () => {
      const diagnostics = getDiagnosticsFromErrors([]);

      expect(diagnostics).toEqual([]);
    });

    it('should handle mixed severity types correctly', () => {
      const errors: ApexError[] = [
        createMockError({ severity: ErrorSeverity.Error }),
        createMockError({ severity: ErrorSeverity.Warning }),
        createMockError({ severity: ErrorSeverity.Info }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors, {
        includeWarnings: true,
        includeInfo: true,
      });

      expect(diagnostics).toHaveLength(3);
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
      expect(diagnostics[1].severity).toBe(DiagnosticSeverity.Warning);
      expect(diagnostics[2].severity).toBe(DiagnosticSeverity.Information);
    });
  });
});
