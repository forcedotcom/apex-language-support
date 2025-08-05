/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompilerService,
  CompilationResult,
} from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  SymbolTable,
  SymbolKind,
  ApexSymbol,
  MethodSymbol,
  VariableSymbol,
} from '../../src/types/symbol';
import { TestLogger } from '../utils/testLogger';
import * as fs from 'fs';
import * as path from 'path';

// Import the LSP document symbol provider
import { DefaultApexDocumentSymbolProvider } from '../../../lsp-compliant-services/src/documentSymbol/ApexDocumentSymbolProvider';
import { DocumentSymbol } from 'vscode-languageserver-protocol';

// Mock storage for testing
class MockStorage {
  private documents = new Map<string, { getText: () => string }>();

  async getDocument(uri: string) {
    return this.documents.get(uri);
  }

  setDocument(uri: string, content: string) {
    this.documents.set(uri, { getText: () => content });
  }
}

describe('LSP Document Symbol Integration Tests', () => {
  let compilerService: CompilerService;
  let listener: ApexSymbolCollectorListener;
  let logger: TestLogger;
  let applicationClsContent: string;
  let mockStorage: MockStorage;
  let documentSymbolProvider: DefaultApexDocumentSymbolProvider;

  beforeAll(() => {
    // Read the Application.cls file
    const fixturePath = path.join(
      __dirname,
      '../fixtures/bugs/Application.cls',
    );
    applicationClsContent = fs.readFileSync(fixturePath, 'utf-8');
  });

  beforeEach(() => {
    logger = TestLogger.getInstance();
    logger.debug('Setting up test environment');
    compilerService = new CompilerService();
    listener = new ApexSymbolCollectorListener();
    mockStorage = new MockStorage();
    documentSymbolProvider = new DefaultApexDocumentSymbolProvider(
      mockStorage as any,
    );
  });

  describe('LSP Document Symbol Formatting', () => {
    it('should format constructor name correctly in LSP document symbols', async () => {
      logger.debug('Testing LSP constructor name formatting');

      // Set up the document in mock storage
      const documentUri = 'file:///test/Application.cls';
      mockStorage.setDocument(documentUri, applicationClsContent);

      // Get document symbols from the LSP provider
      const documentSymbols =
        await documentSymbolProvider.provideDocumentSymbols({
          textDocument: { uri: documentUri },
        });

      expect(documentSymbols).toBeDefined();
      expect(Array.isArray(documentSymbols)).toBe(true);

      const symbols = documentSymbols as DocumentSymbol[];

      // Debug: Log all symbols to see what's available
      logger.debug('All symbols:');
      symbols.forEach((s) => {
        logger.debug(`  ${s.name} (kind: ${s.kind})`);
        s.children?.forEach((c) => {
          logger.debug(`    ${c.name} (kind: ${c.kind})`);
          c.children?.forEach((gc) => {
            logger.debug(`      ${gc.name} (kind: ${gc.kind})`);
          });
        });
      });

      // Find the Application class
      const applicationClass = symbols.find((s) => s.name === 'Application');
      expect(applicationClass).toBeDefined();

      // Find the SelectorFactory inner class (public class)
      const selectorFactoryClass = applicationClass?.children?.find(
        (s) => s.name === 'SelectorFactory',
      );
      expect(selectorFactoryClass).toBeDefined();

      // Find the constructor in SelectorFactory
      const constructorSymbol = selectorFactoryClass?.children?.find(
        (s) => s.kind === 9 && s.name.includes('SelectorFactory'), // SymbolKind.Constructor = 9
      );

      expect(constructorSymbol).toBeDefined();

      // The constructor should have the correct name format
      // Expected format: "SelectorFactory(Map<SObjectType,Type>) : void"
      expect(constructorSymbol?.name).toBe(
        'SelectorFactory(Map<SObjectType,Type>) : void',
      );
    });

    it('should format field name with type information in LSP document symbols', async () => {
      logger.debug('Testing LSP field name formatting');

      // Set up the document in mock storage
      const documentUri = 'file:///test/Application.cls';
      mockStorage.setDocument(documentUri, applicationClsContent);

      // Get document symbols from the LSP provider
      const documentSymbols =
        await documentSymbolProvider.provideDocumentSymbols({
          textDocument: { uri: documentUri },
        });

      expect(documentSymbols).toBeDefined();
      expect(Array.isArray(documentSymbols)).toBe(true);

      const symbols = documentSymbols as DocumentSymbol[];

      // Find the Application class
      const applicationClass = symbols.find((s) => s.name === 'Application');
      expect(applicationClass).toBeDefined();

      // Find the Selector field
      const selectorField = applicationClass?.children?.find(
        (s) => s.kind === 8 && s.name.includes('Selector'), // SymbolKind.Field = 8
      );

      expect(selectorField).toBeDefined();

      // The field should have type information in the name
      // Expected format: "Selector : fflib_Application.SelectorFactory"
      expect(selectorField?.name).toBe(
        'Selector : fflib_Application.SelectorFactory',
      );
    });

    it('should format Service field with type information in LSP document symbols', async () => {
      logger.debug('Testing LSP Service field name formatting');

      // Set up the document in mock storage
      const documentUri = 'file:///test/Application.cls';
      mockStorage.setDocument(documentUri, applicationClsContent);

      // Get document symbols from the LSP provider
      const documentSymbols =
        await documentSymbolProvider.provideDocumentSymbols({
          textDocument: { uri: documentUri },
        });

      expect(documentSymbols).toBeDefined();
      expect(Array.isArray(documentSymbols)).toBe(true);

      const symbols = documentSymbols as DocumentSymbol[];

      // Find the Application class
      const applicationClass = symbols.find((s) => s.name === 'Application');
      expect(applicationClass).toBeDefined();

      // Find the Service field
      const serviceField = applicationClass?.children?.find(
        (s) => s.kind === 8 && s.name.includes('Service'), // SymbolKind.Field = 8
      );

      expect(serviceField).toBeDefined();

      // The field should have type information in the name
      // Expected format: "Service : fflib_Application.ServiceFactory"
      expect(serviceField?.name).toBe(
        'Service : fflib_Application.ServiceFactory',
      );
    });
  });
});

// Helper function to check if symbol is a method symbol
function isMethodSymbol(symbol: ApexSymbol): symbol is MethodSymbol {
  return (
    symbol.kind === SymbolKind.Method || symbol.kind === SymbolKind.Constructor
  );
}
