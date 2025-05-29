/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  DocumentSymbolParams,
  SymbolKind,
  DocumentSymbol,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { DefaultApexDocumentSymbolProvider } from '../../src/documentSymbol/ApexDocumentSymbolProvider';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';

describe('DefaultApexDocumentSymbolProvider', () => {
  let provider: DefaultApexDocumentSymbolProvider;
  let mockStorage: ApexStorageInterface;

  beforeEach(() => {
    mockStorage = {
      getDocument: async (uri: string) =>
        TextDocument.create(uri, 'apex', 1, ''),
    } as ApexStorageInterface;

    provider = new DefaultApexDocumentSymbolProvider(mockStorage);
  });

  describe('provideDocumentSymbols', () => {
    it('should return null when document is not found', async () => {
      mockStorage.getDocument = async () => null;
      const params: DocumentSymbolParams = {
        textDocument: { uri: 'test.apex' },
      };

      const result = await provider.provideDocumentSymbols(params);
      expect(result).toBeNull();
    });

    it('should return null when document has parsing errors', async () => {
      const invalidApex = 'invalid apex code';
      mockStorage.getDocument = async () =>
        TextDocument.create('test.apex', 'apex', 1, invalidApex);

      const params: DocumentSymbolParams = {
        textDocument: { uri: 'test.apex' },
      };

      const result = await provider.provideDocumentSymbols(params);
      expect(result).toBeNull();
    });

    it('should correctly parse a simple Apex class', async () => {
      const validApex = `
                public class TestClass {
                    public String m1() {
                        return 'test';
                    }
                }
            `;
      mockStorage.getDocument = async () =>
        TextDocument.create('test.apex', 'apex', 1, validApex);

      const params: DocumentSymbolParams = {
        textDocument: { uri: 'test.apex' },
      };

      const result = await provider.provideDocumentSymbols(params);
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result![0]).toHaveProperty('name', 'TestClass');
      expect(result![0]).toHaveProperty('kind', SymbolKind.Class);
    });
  });

  describe('mapSymbolKind', () => {
    it('should correctly map class to SymbolKind.Class', () => {
      const result = (provider as any).mapSymbolKind('class');
      expect(result).toBe(SymbolKind.Class);
    });

    it('should correctly map interface to SymbolKind.Interface', () => {
      const result = (provider as any).mapSymbolKind('interface');
      expect(result).toBe(SymbolKind.Interface);
    });

    it('should correctly map method to SymbolKind.Method', () => {
      const result = (provider as any).mapSymbolKind('method');
      expect(result).toBe(SymbolKind.Method);
    });

    it('should correctly map property to SymbolKind.Property', () => {
      const result = (provider as any).mapSymbolKind('property');
      expect(result).toBe(SymbolKind.Property);
    });

    it('should correctly map enum to SymbolKind.Enum', () => {
      const result = (provider as any).mapSymbolKind('enum');
      expect(result).toBe(SymbolKind.Enum);
    });

    it('should correctly map enumvalue to SymbolKind.EnumMember', () => {
      const result = (provider as any).mapSymbolKind('enumvalue');
      expect(result).toBe(SymbolKind.EnumMember);
    });

    it('should map unknown types to SymbolKind.Variable', () => {
      const result = (provider as any).mapSymbolKind('unknown');
      expect(result).toBe(SymbolKind.Variable);
    });
  });

  describe('collectChildren', () => {
    it('should correctly collect children for a class', async () => {
      const validApex = `
                public class TestClass {
                    private String field1;
                    public void method1() {}
                    public class InnerClass {
                        public void innerMethod() {}
                    }
                }
            `;
      mockStorage.getDocument = async () =>
        TextDocument.create('test.apex', 'apex', 1, validApex);

      const params: DocumentSymbolParams = {
        textDocument: { uri: 'test.apex' },
      };

      const result = await provider.provideDocumentSymbols(params);
      expect(result).not.toBeNull();
      const firstSymbol = result![0] as DocumentSymbol;
      expect(Array.isArray(firstSymbol.children)).toBe(true);
      expect((firstSymbol.children as DocumentSymbol[]).length).toBeGreaterThan(
        0,
      );
    });

    it('should only include methods for interfaces', async () => {
      const validApex = `
                public interface TestInterface {
                    void method1();
                    String method2();
                }
            `;
      mockStorage.getDocument = async () =>
        TextDocument.create('test.apex', 'apex', 1, validApex);

      const params: DocumentSymbolParams = {
        textDocument: { uri: 'test.apex' },
      };

      const result = await provider.provideDocumentSymbols(params);
      expect(result).not.toBeNull();
      const firstSymbol = result![0] as DocumentSymbol;
      expect(Array.isArray(firstSymbol.children)).toBe(true);
      expect(
        (firstSymbol.children as DocumentSymbol[]).every(
          (child) => child.kind === SymbolKind.Method,
        ),
      ).toBe(true);
    });
  });
});
