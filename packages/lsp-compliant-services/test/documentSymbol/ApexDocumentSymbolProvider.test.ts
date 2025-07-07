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
  Range,
  Position,
} from 'vscode-languageserver-protocol';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CompilerService,
  ApexSymbolCollectorListener,
  ErrorSeverity,
  ErrorType,
} from '@salesforce/apex-lsp-parser-ast';
import { getLogger, LoggerInterface } from '@salesforce/apex-lsp-logging';

import {
  DefaultApexDocumentSymbolProvider,
  ApexDocumentSymbolProvider,
} from '../../src/documentSymbol/ApexDocumentSymbolProvider';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';

jest.mock('@salesforce/apex-lsp-parser-ast', () => {
  const originalModule = jest.requireActual('@salesforce/apex-lsp-parser-ast');
  return {
    ...originalModule,
    CompilerService: jest.fn(),
    ApexSymbolCollectorListener: jest.fn(),
  };
});
jest.mock('@salesforce/apex-lsp-logging');

const mockedGetLogger = getLogger as jest.Mock;

describe('DefaultApexDocumentSymbolProvider', () => {
  let symbolProvider: ApexDocumentSymbolProvider;
  let mockStorage: jest.Mocked<ApexStorageInterface>;
  let mockCompilerService: jest.Mocked<CompilerService>;
  let mockListener: jest.Mocked<ApexSymbolCollectorListener>;
  let mockLogger: jest.Mocked<LoggerInterface>;

  beforeEach(() => {
    mockStorage = {
      getDocument: jest.fn(),
    } as any;

    mockCompilerService = {
      compile: jest.fn(),
    } as any;
    (CompilerService as jest.Mock).mockImplementation(
      () => mockCompilerService,
    );

    mockListener = {
      getResult: jest.fn(),
    } as any;
    (ApexSymbolCollectorListener as jest.Mock).mockImplementation(
      () => mockListener,
    );

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

    it('should return null when document has parsing errors', async () => {
      const invalidApex = 'invalid apex code';
      mockStorage.getDocument.mockResolvedValue(
        TextDocument.create('test.apex', 'apex', 1, invalidApex),
      );

      mockCompilerService.compile.mockReturnValue({
        errors: [
          {
            message: 'Syntax error',
            type: ErrorType.Syntax,
            severity: ErrorSeverity.Error,
            line: 1,
            column: 1,
          },
        ],
        fileName: 'test.apex',
        result: {} as any,
        warnings: [],
      });

      const params: DocumentSymbolParams = {
        textDocument: { uri: 'test.apex' },
      };

      const result = await symbolProvider.provideDocumentSymbols(params);
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Errors parsing document:',
        expect.any(Array),
      );
    });

    it('should correctly parse a simple Apex class', async () => {
      const validApex = `
                public class TestClass {
                    public String m1() {
                        return 'test';
                    }
                }
            `;
      mockStorage.getDocument.mockResolvedValue(
        TextDocument.create('test.apex', 'apex', 1, validApex),
      );

      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: 'test.apex',
        result: {} as any,
        warnings: [],
      });

      const mockSymbolTable = {
        getCurrentScope: () => ({
          getAllSymbols: () => [
            {
              name: 'TestClass',
              kind: 'class',
              location: {
                startLine: 2,
                startColumn: 17,
                endLine: 6,
                endColumn: 17,
              },
            },
          ],
          getChildren: () => [],
        }),
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      const params: DocumentSymbolParams = {
        textDocument: { uri: 'test.apex' },
      };

      const result = await symbolProvider.provideDocumentSymbols(params);
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result![0]).toHaveProperty('name', 'TestClass');
      expect(result![0]).toHaveProperty('kind', SymbolKind.Class);
    });

    it('should return a symbol for a simple class', async () => {
      const docUri = 'file:///simple.cls';
      const docContent = 'public class SimpleClass {}';
      const textDocument = TextDocument.create(docUri, 'apex', 1, docContent);
      mockStorage.getDocument.mockResolvedValue(textDocument);

      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: docUri,
        result: {} as any,
        warnings: [],
      });

      const mockSymbolTable = {
        getCurrentScope: () => ({
          getAllSymbols: () => [
            {
              name: 'SimpleClass',
              kind: 'class',
              location: {
                startLine: 1,
                startColumn: 1,
                endLine: 1,
                endColumn: 27,
              },
            },
          ],
          getChildren: () => [],
        }),
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toHaveLength(1);
      const symbol = result![0] as any;
      expect(symbol.name).toBe('SimpleClass');
      expect(symbol.kind).toBe(5); // SymbolKind.Class
    });

    it('should return a hierarchical symbol for a class with methods and properties', async () => {
      const docUri = 'file:///complex.cls';
      const docContent = `
        public class ComplexClass {
          public String myProp { get; set; }
          public void myMethod() {}
        }
      `;
      const textDocument = TextDocument.create(docUri, 'apex', 1, docContent);
      mockStorage.getDocument.mockResolvedValue(textDocument);
      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: docUri,
        result: {} as any,
        warnings: [],
      });

      const methodSymbol = {
        name: 'myMethod',
        kind: 'method',
        location: { startLine: 4, startColumn: 9, endLine: 4, endColumn: 30 },
      };
      const fieldSymbol = {
        name: 'myField',
        kind: 'field',
        location: { startLine: 3, startColumn: 9, endLine: 3, endColumn: 40 },
      };
      const classScope = {
        name: 'ComplexClass',
        getAllSymbols: () => [fieldSymbol, methodSymbol],
        getChildren: () => [],
      };
      const globalScope = {
        getAllSymbols: () => [
          {
            name: 'ComplexClass',
            kind: 'class',
            location: {
              startLine: 2,
              startColumn: 7,
              endLine: 5,
              endColumn: 7,
            },
          },
        ],
        getChildren: () => [classScope],
      };
      const mockSymbolTable = {
        getCurrentScope: () => globalScope,
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toHaveLength(1);
      const classSymbol = result![0] as any;
      expect(classSymbol.name).toBe('ComplexClass');
      expect(classSymbol.children).toHaveLength(2);
      expect(classSymbol.children[0].name).toBe('myField');
      expect(classSymbol.children[0].kind).toBe(8); // SymbolKind.Field
      expect(classSymbol.children[1].name).toBe('myMethod() : void');
      expect(classSymbol.children[1].kind).toBe(6); // SymbolKind.Method
    });

    it('should correctly map interface to SymbolKind.Interface', () => {
      const result = (symbolProvider as any).mapSymbolKind('interface');
      expect(result).toBe(SymbolKind.Interface);
    });

    it('should correctly map method to SymbolKind.Method', () => {
      const result = (symbolProvider as any).mapSymbolKind('method');
      expect(result).toBe(SymbolKind.Method);
    });

    it('should correctly map property to SymbolKind.Property', () => {
      const result = (symbolProvider as any).mapSymbolKind('property');
      expect(result).toBe(SymbolKind.Property);
    });

    it('should correctly map field to SymbolKind.Field', () => {
      const result = (symbolProvider as any).mapSymbolKind('field');
      expect(result).toBe(SymbolKind.Field);
    });

    it('should correctly map enum to SymbolKind.Enum', () => {
      const result = (symbolProvider as any).mapSymbolKind('enum');
      expect(result).toBe(SymbolKind.Enum);
    });

    it('should correctly map enumvalue to SymbolKind.EnumMember', () => {
      const result = (symbolProvider as any).mapSymbolKind('enumvalue');
      expect(result).toBe(SymbolKind.EnumMember);
    });

    it('should map unknown types to SymbolKind.Variable', () => {
      const result = (symbolProvider as any).mapSymbolKind('unknown');
      expect(result).toBe(SymbolKind.Variable);
    });

    it('should return null when the document has syntax errors', async () => {
      const docUri = 'file:///error.cls';
      const docContent = 'public class ErrorClass {';
      const textDocument = TextDocument.create(docUri, 'apex', 1, docContent);
      mockStorage.getDocument.mockResolvedValue(textDocument);

      mockCompilerService.compile.mockReturnValue({
        errors: [
          {
            message: 'Syntax error',
            type: ErrorType.Syntax,
            severity: ErrorSeverity.Error,
            line: 1,
            column: 1,
          },
        ],
        fileName: docUri,
        result: {} as any,
        warnings: [],
      });

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toBeNull();
    });

    it('should return null if the document is not found in storage', async () => {
      const docUri = 'file:///nonexistent.cls';
      mockStorage.getDocument.mockResolvedValue(null);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toBeNull();
    });

    it('should handle method symbols with parameters and return types', async () => {
      const docUri = 'file:///method.cls';
      const docContent = `
        public class MethodClass {
          public String getValue(Integer id, String name) {
            return 'test';
          }
        }
      `;
      const textDocument = TextDocument.create(docUri, 'apex', 1, docContent);
      mockStorage.getDocument.mockResolvedValue(textDocument);
      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: docUri,
        result: {} as any,
        warnings: [],
      });

      const methodSymbol = {
        name: 'getValue',
        kind: 'method',
        location: { startLine: 3, startColumn: 9, endLine: 5, endColumn: 9 },
        parameters: [
          {
            name: 'id',
            type: { name: 'Integer', originalTypeString: 'Integer' },
          },
          {
            name: 'name',
            type: { name: 'String', originalTypeString: 'String' },
          },
        ],
        returnType: { name: 'String', originalTypeString: 'String' },
      };
      const classScope = {
        name: 'MethodClass',
        getAllSymbols: () => [methodSymbol],
        getChildren: () => [],
      };
      const globalScope = {
        getAllSymbols: () => [
          {
            name: 'MethodClass',
            kind: 'class',
            location: {
              startLine: 2,
              startColumn: 7,
              endLine: 6,
              endColumn: 7,
            },
          },
        ],
        getChildren: () => [classScope],
      };
      const mockSymbolTable = {
        getCurrentScope: () => globalScope,
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toHaveLength(1);
      const classSymbol = result![0] as any;
      expect(classSymbol.children).toHaveLength(1);
      expect(classSymbol.children[0].name).toBe(
        'getValue(Integer, String) : String',
      );
    });

    it('should handle symbols with identifier location for precise ranges', async () => {
      const docUri = 'file:///precise.cls';
      const docContent = 'public class PreciseClass {}';
      const textDocument = TextDocument.create(docUri, 'apex', 1, docContent);
      mockStorage.getDocument.mockResolvedValue(textDocument);
      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: docUri,
        result: {} as any,
        warnings: [],
      });

      const mockSymbolTable = {
        getCurrentScope: () => ({
          getAllSymbols: () => [
            {
              name: 'PreciseClass',
              kind: 'class',
              location: {
                startLine: 1,
                startColumn: 1,
                endLine: 1,
                endColumn: 27,
              },
              identifierLocation: {
                startLine: 1,
                startColumn: 14, // Start of class name
                endLine: 1,
                endColumn: 25, // End of class name
              },
            },
          ],
          getChildren: () => [],
        }),
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toHaveLength(1);
      const symbol = result![0] as DocumentSymbol;
      expect(symbol.range).toEqual(
        Range.create(Position.create(0, 14), Position.create(0, 26)),
      );
      expect(symbol.selectionRange).toEqual(
        Range.create(Position.create(0, 14), Position.create(0, 25)),
      );
    });

    it('should handle nested classes with children', async () => {
      const docUri = 'file:///nested.cls';
      const docContent = `
        public class OuterClass {
          public class InnerClass {
            public void innerMethod() {}
          }
        }
      `;
      const textDocument = TextDocument.create(docUri, 'apex', 1, docContent);
      mockStorage.getDocument.mockResolvedValue(textDocument);
      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: docUri,
        result: {} as any,
        warnings: [],
      });

      const innerMethodSymbol = {
        name: 'innerMethod',
        kind: 'method',
        location: { startLine: 4, startColumn: 13, endLine: 4, endColumn: 29 },
      };
      const innerClassScope = {
        name: 'InnerClass',
        getAllSymbols: () => [innerMethodSymbol],
        getChildren: () => [],
      };
      const innerClassSymbol = {
        name: 'InnerClass',
        kind: 'class',
        location: { startLine: 3, startColumn: 11, endLine: 5, endColumn: 11 },
      };
      const outerClassScope = {
        name: 'OuterClass',
        getAllSymbols: () => [innerClassSymbol],
        getChildren: () => [innerClassScope],
      };
      const globalScope = {
        getAllSymbols: () => [
          {
            name: 'OuterClass',
            kind: 'class',
            location: {
              startLine: 2,
              startColumn: 7,
              endLine: 6,
              endColumn: 7,
            },
          },
        ],
        getChildren: () => [outerClassScope],
      };
      const mockSymbolTable = {
        getCurrentScope: () => globalScope,
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toHaveLength(1);
      const outerSymbol = result![0] as DocumentSymbol;
      expect(outerSymbol.children).toHaveLength(1);
      expect(outerSymbol.children![0].name).toBe('InnerClass');
      expect(outerSymbol.children![0].children).toHaveLength(1);
      expect(outerSymbol.children![0].children![0].name).toBe(
        'innerMethod() : void',
      );
    });

    it('should handle interface with only methods', async () => {
      const docUri = 'file:///interface.cls';
      const docContent = `
        public interface TestInterface {
          void method1();
          String method2();
        }
      `;
      const textDocument = TextDocument.create(docUri, 'apex', 1, docContent);
      mockStorage.getDocument.mockResolvedValue(textDocument);
      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: docUri,
        result: {} as any,
        warnings: [],
      });

      const method1Symbol = {
        name: 'method1',
        kind: 'method',
        location: { startLine: 3, startColumn: 11, endLine: 3, endColumn: 20 },
      };
      const method2Symbol = {
        name: 'method2',
        kind: 'method',
        location: { startLine: 4, startColumn: 11, endLine: 4, endColumn: 22 },
        returnType: { name: 'String', originalTypeString: 'String' },
      };
      const variableSymbol = {
        name: 'someVariable',
        kind: 'variable',
        location: { startLine: 5, startColumn: 11, endLine: 5, endColumn: 24 },
      };
      const interfaceScope = {
        name: 'TestInterface',
        getAllSymbols: () => [method1Symbol, method2Symbol, variableSymbol],
        getChildren: () => [],
      };
      const globalScope = {
        getAllSymbols: () => [
          {
            name: 'TestInterface',
            kind: 'interface',
            location: {
              startLine: 2,
              startColumn: 7,
              endLine: 6,
              endColumn: 7,
            },
          },
        ],
        getChildren: () => [interfaceScope],
      };
      const mockSymbolTable = {
        getCurrentScope: () => globalScope,
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toHaveLength(1);
      const interfaceSymbol = result![0] as DocumentSymbol;
      // Should only include methods, not variables
      expect(interfaceSymbol.children).toHaveLength(2);
      expect(interfaceSymbol.children![0].name).toBe('method1() : void');
      expect(interfaceSymbol.children![1].name).toBe('method2() : String');
    });

    it('should handle enum with enum values', async () => {
      const docUri = 'file:///enum.cls';
      const docContent = `
        public enum TestEnum {
          VALUE1,
          VALUE2
        }
      `;
      const textDocument = TextDocument.create(docUri, 'apex', 1, docContent);
      mockStorage.getDocument.mockResolvedValue(textDocument);
      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: docUri,
        result: {} as any,
        warnings: [],
      });

      const value1Symbol = {
        name: 'VALUE1',
        kind: 'enumvalue',
        location: { startLine: 3, startColumn: 11, endLine: 3, endColumn: 17 },
      };
      const value2Symbol = {
        name: 'VALUE2',
        kind: 'enumvalue',
        location: { startLine: 4, startColumn: 11, endLine: 4, endColumn: 17 },
      };
      const enumScope = {
        name: 'TestEnum',
        getAllSymbols: () => [value1Symbol, value2Symbol],
        getChildren: () => [],
      };
      const globalScope = {
        getAllSymbols: () => [
          {
            name: 'TestEnum',
            kind: 'enum',
            location: {
              startLine: 2,
              startColumn: 7,
              endLine: 5,
              endColumn: 7,
            },
          },
        ],
        getChildren: () => [enumScope],
      };
      const mockSymbolTable = {
        getCurrentScope: () => globalScope,
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toHaveLength(1);
      const enumSymbol = result![0] as DocumentSymbol;
      expect(enumSymbol.kind).toBe(SymbolKind.Enum);
      expect(enumSymbol.children).toHaveLength(2);
      expect(enumSymbol.children![0].name).toBe('VALUE1');
      expect(enumSymbol.children![0].kind).toBe(SymbolKind.EnumMember);
      expect(enumSymbol.children![1].name).toBe('VALUE2');
      expect(enumSymbol.children![1].kind).toBe(SymbolKind.EnumMember);
    });

    it('should handle trigger symbols', async () => {
      const docUri = 'file:///trigger.cls';
      const docContent = `
        trigger TestTrigger on Account (before insert, after update) {
          // trigger logic
        }
      `;
      const textDocument = TextDocument.create(docUri, 'apex', 1, docContent);
      mockStorage.getDocument.mockResolvedValue(textDocument);
      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: docUri,
        result: {} as any,
        warnings: [],
      });

      const mockSymbolTable = {
        getCurrentScope: () => ({
          getAllSymbols: () => [
            {
              name: 'TestTrigger',
              kind: 'trigger',
              location: {
                startLine: 2,
                startColumn: 9,
                endLine: 4,
                endColumn: 9,
              },
            },
          ],
          getChildren: () => [],
        }),
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toHaveLength(1);
      const triggerSymbol = result![0] as DocumentSymbol;
      expect(triggerSymbol.name).toBe('TestTrigger');
      expect(triggerSymbol.kind).toBe(SymbolKind.Class); // Triggers are mapped to Class
    });

    it('should handle error during symbol processing', async () => {
      const docUri = 'file:///error.cls';
      const docContent = 'public class ErrorClass {}';
      const textDocument = TextDocument.create(docUri, 'apex', 1, docContent);
      mockStorage.getDocument.mockResolvedValue(textDocument);
      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: docUri,
        result: {} as any,
        warnings: [],
      });

      const mockSymbolTable = {
        getCurrentScope: () => ({
          getAllSymbols: () => [
            {
              name: 'ErrorClass',
              kind: 'class',
              location: {
                startLine: 1,
                startColumn: 1,
                endLine: 1,
                endColumn: 27,
              },
            },
          ],
          getChildren: () => [],
        }),
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      // Mock an error during processing
      jest
        .spyOn(symbolProvider as any, 'createDocumentSymbol')
        .mockImplementation(() => {
          throw new Error('Processing error');
        });

      const result = await symbolProvider.provideDocumentSymbols({
        textDocument: { uri: docUri },
      });

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error providing document symbols:',
        expect.any(Error),
      );
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
      mockStorage.getDocument.mockResolvedValue(
        TextDocument.create('test.apex', 'apex', 1, validApex),
      );

      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: 'test.apex',
        result: {} as any,
        warnings: [],
      });

      const innerMethodSymbol = {
        name: 'innerMethod',
        kind: 'method',
        location: { startLine: 6, startColumn: 25, endLine: 6, endColumn: 41 },
      };
      const innerClassScope = {
        name: 'InnerClass',
        getAllSymbols: () => [innerMethodSymbol],
        getChildren: () => [],
      };
      const fieldSymbol = {
        name: 'field1',
        kind: 'variable',
        location: { startLine: 3, startColumn: 21, endLine: 3, endColumn: 36 },
      };
      const methodSymbol = {
        name: 'method1',
        kind: 'method',
        location: { startLine: 4, startColumn: 21, endLine: 4, endColumn: 32 },
      };
      const innerClassSymbol = {
        name: 'InnerClass',
        kind: 'class',
        location: { startLine: 5, startColumn: 21, endLine: 7, endColumn: 21 },
      };
      const classScope = {
        name: 'TestClass',
        getAllSymbols: () => [fieldSymbol, methodSymbol, innerClassSymbol],
        getChildren: () => [innerClassScope],
      };
      const mockSymbolTable = {
        getCurrentScope: () => ({
          getAllSymbols: () => [
            {
              name: 'TestClass',
              kind: 'class',
              location: {
                startLine: 2,
                startColumn: 17,
                endLine: 8,
                endColumn: 17,
              },
            },
          ],
          getChildren: () => [classScope],
        }),
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      const params: DocumentSymbolParams = {
        textDocument: { uri: 'test.apex' },
      };

      const result = await symbolProvider.provideDocumentSymbols(params);
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
      mockStorage.getDocument.mockResolvedValue(
        TextDocument.create('test.apex', 'apex', 1, validApex),
      );

      mockCompilerService.compile.mockReturnValue({
        errors: [],
        fileName: 'test.apex',
        result: {} as any,
        warnings: [],
      });

      const mockSymbolTable = {
        getCurrentScope: () => ({
          getAllSymbols: () => [
            {
              name: 'TestInterface',
              kind: 'interface',
              location: {
                startLine: 2,
                startColumn: 17,
                endLine: 5,
                endColumn: 17,
              },
            },
          ],
          getChildren: () => [],
        }),
      };
      (mockListener.getResult as jest.Mock).mockReturnValue(mockSymbolTable);

      const params: DocumentSymbolParams = {
        textDocument: { uri: 'test.apex' },
      };

      const result = await symbolProvider.provideDocumentSymbols(params);
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
        name: 'testMethod',
        kind: 'method',
        parameters: [
          { type: { originalTypeString: 'String' } },
          { type: { originalTypeString: 'Integer' } },
        ],
        returnType: { originalTypeString: 'Boolean' },
      };

      const result = provider.formatSymbolName(methodSymbol);
      expect(result).toBe('testMethod(String, Integer) : Boolean');
    });

    it('should handle methods without parameters', () => {
      const provider = symbolProvider as any;
      const methodSymbol = {
        name: 'testMethod',
        kind: 'method',
        parameters: [],
        returnType: { originalTypeString: 'void' },
      };

      const result = provider.formatSymbolName(methodSymbol);
      expect(result).toBe('testMethod() : void');
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
        name: 'testMethod',
        kind: 'method',
        parameters: [{ type: null }],
        returnType: null,
      };

      const result = provider.formatSymbolName(methodSymbol);
      expect(result).toBe('testMethod(unknown) : void');
    });
  });
});
