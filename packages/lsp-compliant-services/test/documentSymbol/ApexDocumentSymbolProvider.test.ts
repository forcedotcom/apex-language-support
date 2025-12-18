/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

jest.mock('@salesforce/apex-lsp-parser-ast', () => {
  const originalModule = jest.requireActual('@salesforce/apex-lsp-parser-ast');
  return {
    ...originalModule,
    getLogger: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  };
});

jest.mock('@salesforce/apex-lsp-shared', () => ({
  ...jest.requireActual('@salesforce/apex-lsp-shared'),
  ApexSettingsManager: {
    getInstance: jest.fn(() => ({
      getCompilationOptions: jest.fn(() => ({})),
    })),
  },
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

import { DocumentSymbolParams } from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger, LoggerInterface } from '@salesforce/apex-lsp-shared';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';
import {
  ApexDocumentSymbolProvider,
  DefaultApexDocumentSymbolProvider,
} from '@salesforce/apex-lsp-compliant-services';

const mockedGetLogger = getLogger as jest.Mock;

describe('DefaultApexDocumentSymbolProvider - Unit Tests', () => {
  let symbolProvider: ApexDocumentSymbolProvider;
  let mockStorage: jest.Mocked<ApexStorageInterface>;
  let mockLogger: jest.Mocked<LoggerInterface>;

  beforeEach(() => {
    mockStorage = {
      getDocument: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    };
    mockedGetLogger.mockReturnValue(mockLogger);

    symbolProvider = new DefaultApexDocumentSymbolProvider(mockStorage);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('provideDocumentSymbols', () => {
    it('should return null when document is not found', async () => {
      mockStorage.getDocument.mockResolvedValue(null);
      const params: DocumentSymbolParams = {
        textDocument: { uri: 'test.apex' },
      };

      const result = await symbolProvider.provideDocumentSymbols(params);
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should handle documents with syntax errors gracefully', async () => {
      const docUri = 'file:///error.cls';
      const docContent = 'public class ErrorClass {';
      const textDocument = TextDocument.create(docUri, 'apex', 1, docContent);
      mockStorage.getDocument.mockResolvedValue(textDocument);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      // The parser is resilient and can still parse partial content
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0].name).toBe('ErrorClass');
    });

    it('should return null if the document is not found in storage', async () => {
      const docUri = 'file:///nonexistent.cls';
      mockStorage.getDocument.mockResolvedValue(null);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toBeNull();
    });
  });

  describe('mapSymbolKind', () => {
    it('should map various apex symbol kinds to LSP SymbolKind', () => {
      const provider = symbolProvider as any;
      expect(provider.mapSymbolKind('class')).toBe(5);
      expect(provider.mapSymbolKind('interface')).toBe(11);
      expect(provider.mapSymbolKind('method')).toBe(6);
      expect(provider.mapSymbolKind('property')).toBe(7);
      expect(provider.mapSymbolKind('field')).toBe(8);
      expect(provider.mapSymbolKind('variable')).toBe(13);
      expect(provider.mapSymbolKind('enum')).toBe(10);
      expect(provider.mapSymbolKind('enumvalue')).toBe(22);
      expect(provider.mapSymbolKind('parameter')).toBe(13);
      expect(provider.mapSymbolKind('trigger')).toBe(5);
      expect(provider.mapSymbolKind('unknown')).toBe(13);
    });

    it('should handle case-insensitive symbol kinds', () => {
      const provider = symbolProvider as any;
      expect(provider.mapSymbolKind('CLASS')).toBe(5);
      expect(provider.mapSymbolKind('Method')).toBe(6);
      expect(provider.mapSymbolKind('INTERFACE')).toBe(11);
    });
  });

  describe('formatSymbolName', () => {
    it('should format method names with parameters and return type', () => {
      const provider = symbolProvider as any;
      const methodSymbol = {
        name: 'doSomething',
        kind: 'method',
        parameters: [
          { type: { originalTypeString: 'String' } },
          { type: { originalTypeString: 'Integer' } },
        ],
        returnType: { originalTypeString: 'Boolean' },
      };

      const result = provider.formatSymbolName(methodSymbol);
      expect(result).toBe('doSomething(String, Integer) : Boolean');
    });

    it('should handle methods without parameters', () => {
      const provider = symbolProvider as any;
      const methodSymbol = {
        name: 'doSomething',
        kind: 'method',
        parameters: [],
        returnType: { originalTypeString: 'void' },
      };

      const result = provider.formatSymbolName(methodSymbol);
      expect(result).toBe('doSomething() : void');
    });

    it('should handle non-method symbols', () => {
      const provider = symbolProvider as any;
      const classSymbol = {
        name: 'TestClass',
        kind: 'class',
      };

      const result = provider.formatSymbolName(classSymbol);
      expect(result).toBe('TestClass');
    });

    it('should handle method symbols with missing type information', () => {
      const provider = symbolProvider as any;
      const methodSymbol = {
        name: 'doSomething',
        kind: 'method',
        parameters: [{ type: null }],
        returnType: null,
      };

      const result = provider.formatSymbolName(methodSymbol);
      expect(result).toBe('doSomething(unknown) : void');
    });

    it('should format field symbols with type information', () => {
      const provider = symbolProvider as any;
      const fieldSymbol = {
        name: 'testField',
        kind: 'field',
        type: { originalTypeString: 'String' },
      };

      const result = provider.formatSymbolName(fieldSymbol);
      expect(result).toBe('testField : String');
    });

    it('should format property symbols with type information', () => {
      const provider = symbolProvider as any;
      const propertySymbol = {
        name: 'testProperty',
        kind: 'property',
        type: { originalTypeString: 'Integer' },
      };

      const result = provider.formatSymbolName(propertySymbol);
      expect(result).toBe('testProperty : Integer');
    });

    it('should format property symbols with complex type information', () => {
      const provider = symbolProvider as any;
      const propertySymbol = {
        name: 'opps',
        kind: 'property',
        type: { originalTypeString: 'Opportunity[]' },
      };

      const result = provider.formatSymbolName(propertySymbol);
      expect(result).toBe('opps : Opportunity[]');
    });

    it('should handle field and property symbols with missing type information', () => {
      const provider = symbolProvider as any;
      const fieldSymbol = {
        name: 'testField',
        kind: 'field',
        type: null,
      };
      const propertySymbol = {
        name: 'testProperty',
        kind: 'property',
        type: null,
      };

      const fieldResult = provider.formatSymbolName(fieldSymbol);
      const propertyResult = provider.formatSymbolName(propertySymbol);

      expect(fieldResult).toBe('testField : unknown');
      expect(propertyResult).toBe('testProperty : unknown');
    });

    it('should format customer bug scenario properties correctly', () => {
      const provider = symbolProvider as any;
      // These represent the properties from the customer's bug report
      const valueProperty = {
        name: 'value',
        kind: 'property',
        type: { originalTypeString: 'String' },
      };
      const oppsProperty = {
        name: 'opps',
        kind: 'property',
        type: { originalTypeString: 'Opportunity[]' },
      };
      const targetAccountProperty = {
        name: 'targetAccount',
        kind: 'property',
        type: { originalTypeString: 'Account' },
      };

      const valueResult = provider.formatSymbolName(valueProperty);
      const oppsResult = provider.formatSymbolName(oppsProperty);
      const targetAccountResult = provider.formatSymbolName(
        targetAccountProperty,
      );

      expect(valueResult).toBe('value : String');
      expect(oppsResult).toBe('opps : Opportunity[]');
      expect(targetAccountResult).toBe('targetAccount : Account');
    });
  });
});
