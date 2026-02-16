/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DocumentDiagnosticParams } from 'vscode-languageserver';
import {
  LoggerInterface,
  getLogger,
  enableConsoleLogging,
  setLogLevel,
} from '@salesforce/apex-lsp-shared';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { readFileSync } from 'fs';
import { join } from 'path';

import { DiagnosticProcessingService } from '../../src/services/DiagnosticProcessingService';
import { ApexStorageManager } from '../../src/storage/ApexStorageManager';
import {
  ApexSymbolManager,
  CompilerService,
  ErrorCodes,
  FullSymbolCollectorListener,
  ResourceLoader,
  STANDARD_APEX_LIBRARY_URI,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';

// Only mock storage - use real implementations for everything else
jest.mock('../../src/storage/ApexStorageManager');

describe('DiagnosticProcessingService', () => {
  let logger: LoggerInterface;
  let mockStorage: any;
  let symbolManager: ApexSymbolManager;
  let service: DiagnosticProcessingService;

  beforeAll(async () => {
    enableConsoleLogging();
    setLogLevel('error');
    (ResourceLoader as any).instance = null;
    const loader = ResourceLoader.getInstance();
    await loader.initialize();
  });

  beforeEach(async () => {
    logger = getLogger();

    mockStorage = {
      getDocument: jest.fn(),
    };

    (ApexStorageManager.getInstance as jest.Mock).mockReturnValue({
      getStorage: jest.fn().mockReturnValue(mockStorage),
    });

    // Use real symbol manager
    symbolManager = new ApexSymbolManager();

    // Pre-compile all artifacts so findMissingArtifact is not needed during validation.
    const resourceLoader = ResourceLoader.getInstance();
    const stdlibClasses = ['System/Integer.cls', 'System/String.cls'];
    for (const cls of stdlibClasses) {
      const table = await resourceLoader.getSymbolTable(cls);
      if (table) {
        const uri = `${STANDARD_APEX_LIBRARY_URI}/${cls}`;
        await Effect.runPromise(symbolManager.addSymbolTable(table, uri));
      }
    }
    const compilerService = new CompilerService();
    const fixturesDir = join(__dirname, '../fixtures/classes');
    const testClassContent = readFileSync(
      join(fixturesDir, 'TestClass.cls'),
      'utf8',
    );
    const testClassTable = new SymbolTable();
    const listener = new FullSymbolCollectorListener(testClassTable);
    compilerService.compile(
      testClassContent,
      'file:///TestClass.cls',
      listener,
    );
    await Effect.runPromise(
      symbolManager.addSymbolTable(testClassTable, 'file:///TestClass.cls'),
    );

    // Clear the document state cache to avoid test interference
    const {
      getDocumentStateCache,
    } = require('../../src/services/DocumentStateCache');
    const cache = getDocumentStateCache();
    cache.clear();

    service = new DiagnosticProcessingService(logger, symbolManager);
  });

  describe('processDiagnostic', () => {
    it('should return empty array when document not found', async () => {
      const params: DocumentDiagnosticParams = {
        textDocument: { uri: 'file:///test.cls' },
      };

      mockStorage.getDocument.mockResolvedValue(null);

      const result = await service.processDiagnostic(params);

      expect(result).toEqual([]);
    });

    it('should process document and return diagnostics', async () => {
      // Use real fixture with syntax errors
      const fixturesDir = join(__dirname, '../fixtures/classes');
      const syntaxErrorPath = join(fixturesDir, 'SyntaxErrorClass.cls');
      const syntaxErrorContent = readFileSync(syntaxErrorPath, 'utf8');

      const params: DocumentDiagnosticParams = {
        textDocument: { uri: 'file:///SyntaxErrorClass.cls' },
      };

      const document = TextDocument.create(
        'file:///SyntaxErrorClass.cls',
        'apex',
        1,
        syntaxErrorContent,
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Wait for validators to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await service.processDiagnostic(params);

      // Should have at least one diagnostic (syntax error)
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].message).toBeDefined();
    });

    it('should report syntax errors with ErrorCode (not generic SYNTAX_ERROR)', async () => {
      const fixturesDir = join(__dirname, '../fixtures/classes');
      const syntaxErrorPath = join(fixturesDir, 'SyntaxErrorClass.cls');
      const syntaxErrorContent = readFileSync(syntaxErrorPath, 'utf8');

      const params: DocumentDiagnosticParams = {
        textDocument: { uri: 'file:///SyntaxErrorClass.cls' },
      };

      const document = TextDocument.create(
        'file:///SyntaxErrorClass.cls',
        'apex',
        1,
        syntaxErrorContent,
      );

      mockStorage.getDocument.mockResolvedValue(document);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await service.processDiagnostic(params);

      expect(result.length).toBeGreaterThan(0);
      // Code should be a dot-separated ErrorCode (e.g. missing.syntax, unexpected.syntax.error)
      // not the generic SYNTAX_ERROR
      const syntaxDiagnostics = result.filter(
        (d) =>
          d.code &&
          d.code !== 'SYNTAX_ERROR' &&
          (d.code as string).includes('.'),
      );
      expect(syntaxDiagnostics.length).toBeGreaterThan(0);
      expect([
        ErrorCodes.MISSING_SYNTAX,
        ErrorCodes.UNEXPECTED_SYNTAX_ERROR,
      ]).toContain(syntaxDiagnostics[0].code);
    });

    it('should return empty array when no errors found', async () => {
      // Use real fixture with valid code
      const fixturesDir = join(__dirname, '../fixtures/classes');
      const testClassPath = join(fixturesDir, 'TestClass.cls');
      const testClassContent = readFileSync(testClassPath, 'utf8');

      const params: DocumentDiagnosticParams = {
        textDocument: { uri: 'file:///TestClass.cls' },
      };

      const document = TextDocument.create(
        'file:///TestClass.cls',
        'apex',
        1,
        testClassContent,
      );

      mockStorage.getDocument.mockResolvedValue(document);

      const result = await service.processDiagnostic(params);

      // Valid code should have no errors (or only warnings)
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // May have warnings but should not have errors
      const errors = result.filter((d) => d.severity === 1);
      expect(errors.length).toBe(0);
    });

    it('should handle compilation errors gracefully', async () => {
      // Use real fixture with syntax errors
      const fixturesDir = join(__dirname, '../fixtures/classes');
      const syntaxErrorPath = join(fixturesDir, 'SyntaxErrorClass.cls');
      const syntaxErrorContent = readFileSync(syntaxErrorPath, 'utf8');

      const params: DocumentDiagnosticParams = {
        textDocument: { uri: 'file:///SyntaxErrorClass.cls' },
      };

      const document = TextDocument.create(
        'file:///SyntaxErrorClass.cls',
        'apex',
        1,
        syntaxErrorContent,
      );

      mockStorage.getDocument.mockResolvedValue(document);

      const result = await service.processDiagnostic(params);

      // Should return diagnostics array even with errors
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should suppress diagnostics for standard Apex library URIs', async () => {
      const params: DocumentDiagnosticParams = {
        textDocument: {
          uri: 'apexlib://resources/StandardApexLibrary/System/System.cls',
        },
      };

      const document = TextDocument.create(
        'apexlib://resources/StandardApexLibrary/System/System.cls',
        'apex',
        1,
        'public class System { }',
      );

      mockStorage.getDocument.mockResolvedValue(document);

      const result = await service.processDiagnostic(params);

      expect(result).toEqual([]);
    });

    it('should not suppress diagnostics for user code URIs', async () => {
      // Use real fixture with syntax errors
      const fixturesDir = join(__dirname, '../fixtures/classes');
      const syntaxErrorPath = join(fixturesDir, 'SyntaxErrorClass.cls');
      const syntaxErrorContent = readFileSync(syntaxErrorPath, 'utf8');

      const params: DocumentDiagnosticParams = {
        textDocument: { uri: 'file:///Users/test/SyntaxErrorClass.cls' },
      };

      const document = TextDocument.create(
        'file:///Users/test/SyntaxErrorClass.cls',
        'apex',
        1,
        syntaxErrorContent,
      );

      mockStorage.getDocument.mockResolvedValue(document);

      // Wait for validators to initialize
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await service.processDiagnostic(params);

      // Should have at least one diagnostic (syntax error)
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].message).toBeDefined();
      expect(mockStorage.getDocument).toHaveBeenCalledWith(
        params.textDocument.uri,
      );
    });
  });
});
