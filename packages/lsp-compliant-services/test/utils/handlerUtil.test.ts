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
  shouldSuppressDiagnostics,
} from '../../src/utils/handlerUtil';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { DiagnosticSeverity } from 'vscode-languageserver';
import {
  ApexError,
  ErrorType,
  ErrorSeverity,
} from '@salesforce/apex-lsp-parser-ast';

jest.mock('@salesforce/apex-lsp-shared');

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
          fileUri: 'file:///test.cls',
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

    it('should handle empty errors array', () => {
      const diagnostics = getDiagnosticsFromErrors([]);

      expect(diagnostics).toEqual([]);
    });

    it('should always use Error severity for all diagnostics', () => {
      const errors: ApexError[] = [
        createMockError({ severity: ErrorSeverity.Error }),
        createMockError({ severity: ErrorSeverity.Warning }),
        createMockError({ severity: ErrorSeverity.Info }),
      ];

      const diagnostics = getDiagnosticsFromErrors(errors);

      expect(diagnostics).toHaveLength(3);
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
      expect(diagnostics[1].severity).toBe(DiagnosticSeverity.Error);
      expect(diagnostics[2].severity).toBe(DiagnosticSeverity.Error);
    });
  });

  describe('shouldSuppressDiagnostics', () => {
    it('should return true for standard Apex library URIs', () => {
      const standardApexUris = [
        'apexlib://resources/StandardApexLibrary/System/System.cls',
        'apexlib://resources/StandardApexLibrary/Database/Database.cls',
        'apexlib://resources/StandardApexLibrary/Schema/Schema.cls',
        'apexlib://resources/StandardApexLibrary/System/Assert.cls',
        'apexlib://resources/StandardApexLibrary/System/Debug.cls',
      ];

      standardApexUris.forEach((uri) => {
        expect(shouldSuppressDiagnostics(uri)).toBe(true);
      });
    });

    it('should return false for user code URIs', () => {
      const userCodeUris = [
        'file:///Users/test/MyClass.cls',
        'file:///workspace/TestClass.cls',
        'file:///project/src/classes/MyClass.cls',
        'vscode-test-web://file/Users/test/MyClass.cls',
        'vscode-vfs://file/Users/test/MyClass.cls',
      ];

      userCodeUris.forEach((uri) => {
        expect(shouldSuppressDiagnostics(uri)).toBe(false);
      });
    });

    it('should return false for non-apexlib URIs', () => {
      const nonApexlibUris = [
        'https://example.com/file.cls',
        'ftp://server/file.cls',
        'data:text/plain,content',
        'urn:example:file',
        'custom://scheme/file.cls',
      ];

      nonApexlibUris.forEach((uri) => {
        expect(shouldSuppressDiagnostics(uri)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      const edgeCases = [
        '', // empty string - should return false
        'apexlib://', // incomplete URI - should return true
        'apexlib://resources/', // incomplete path - should return true
        'apexlib://resources/StandardApexLibrary/', // incomplete class path - should return true
        'apexlib://resources/StandardApexLibrary/System/', // incomplete class name - should return true
      ];

      edgeCases.forEach((uri, index) => {
        if (index === 0) {
          // Empty string should return false
          expect(shouldSuppressDiagnostics(uri)).toBe(false);
        } else {
          // All other cases should return true because they start with apexlib://
          expect(shouldSuppressDiagnostics(uri)).toBe(true);
        }
      });
    });

    it('should be case sensitive for URI scheme', () => {
      const caseVariations = [
        'APEXLIB://resources/StandardApexLibrary/System/System.cls', // uppercase scheme
        'ApexLib://resources/StandardApexLibrary/System/System.cls', // mixed case scheme
        'apexlib://RESOURCES/StandardApexLibrary/System/System.cls', // uppercase path
      ];

      caseVariations.forEach((uri) => {
        // Only the first two should return false (case sensitive scheme)
        // The third one should return true (lowercase scheme, uppercase path is OK)
        if (uri.startsWith('APEXLIB://') || uri.startsWith('ApexLib://')) {
          expect(shouldSuppressDiagnostics(uri)).toBe(false);
        } else {
          expect(shouldSuppressDiagnostics(uri)).toBe(true);
        }
      });
    });
  });
});
