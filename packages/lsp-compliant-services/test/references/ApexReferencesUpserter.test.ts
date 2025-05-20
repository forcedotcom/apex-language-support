/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { DidOpenTextDocumentParams } from 'vscode-languageserver-protocol';
import {
  CompilerService,
  ApexSymbolCollectorListener,
  SymbolTable,
  SymbolScope,
  ErrorSeverity,
  ErrorType,
} from '@salesforce/apex-lsp-parser-ast';

import { DefaultApexReferencesUpserter } from '../../src/references/ApexReferencesUpserter';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';

jest.mock('@salesforce/apex-lsp-parser-ast');

// Mock TextDocuments
const mockDocuments = {
  listen: jest.fn(),
  get: jest.fn().mockImplementation((uri: string) => {
    if (uri === 'file:///test.apex') {
      return {
        getText: () => 'class TestClass {}',
        content: 'class TestClass {}',
      };
    }
    return null;
  }),
  set: jest.fn(),
  delete: jest.fn(),
  all: jest.fn(),
  onDidChangeContent: jest.fn(),
  onDidClose: jest.fn(),
  onDidOpen: jest.fn(),
  onDidSave: jest.fn(),
};

describe('DefaultApexReferencesPopulator', () => {
  let mockStorage: jest.Mocked<ApexStorageInterface>;
  let mockCompilerService: jest.Mocked<CompilerService>;
  let mockSymbolTable: jest.Mocked<SymbolTable>;
  let mockListener: jest.Mocked<ApexSymbolCollectorListener>;
  let upserter: DefaultApexReferencesUpserter;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock storage
    mockStorage = {
      getDocument: jest.fn(),
      getReferences: jest.fn().mockResolvedValue([]),
      setReferences: jest.fn(),
    } as unknown as jest.Mocked<ApexStorageInterface>;

    // Setup mock compiler service
    mockCompilerService = {
      compile: jest.fn(),
    } as unknown as jest.Mocked<CompilerService>;

    // Setup mock symbol table
    mockSymbolTable = {
      getCurrentScope: jest.fn().mockReturnValue({
        getAllSymbols: jest.fn().mockReturnValue([
          {
            name: 'TestClass',
            location: { startLine: 1, startColumn: 0 },
          },
        ]),
      }),
    } as unknown as jest.Mocked<SymbolTable>;

    // Setup mock listener
    mockListener = {
      getResult: jest.fn().mockReturnValue(mockSymbolTable),
    } as unknown as jest.Mocked<ApexSymbolCollectorListener>;

    // Mock constructor
    (CompilerService as jest.Mock).mockImplementation(
      () => mockCompilerService,
    );
    (ApexSymbolCollectorListener as jest.Mock).mockImplementation(
      () => mockListener,
    );

    upserter = new DefaultApexReferencesUpserter(mockStorage);
  });

  it('should populate references for new document', async () => {
    // Arrange
    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri: 'file:///test.apex',
        text: 'class TestClass {}',
        version: 1,
        languageId: 'apex',
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);
    mockCompilerService.compile.mockReturnValue({
      errors: [],
      fileName: params.textDocument.uri,
      result: null,
      warnings: [],
    });

    // Act
    await upserter.upsertReferences(params, mockDocuments as any);

    // Assert
    expect(mockDocuments.get).toHaveBeenCalledWith(params.textDocument.uri);
    expect(mockCompilerService.compile).toHaveBeenCalledWith(
      params.textDocument.text,
      params.textDocument.uri,
      mockListener,
    );
    expect(mockStorage.getReferences).toHaveBeenCalledWith('TestClass');
    expect(mockStorage.setReferences).toHaveBeenCalledWith(
      'TestClass',
      expect.arrayContaining([
        expect.objectContaining({
          sourceFile: params.textDocument.uri,
          targetSymbol: 'TestClass',
          line: 1,
          column: 0,
          referenceType: 'type-reference',
        }),
      ]),
    );
  });

  it('should handle compilation errors', async () => {
    // Arrange
    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri: 'file:///test.apex',
        text: 'invalid code',
        version: 1,
        languageId: 'apex',
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);
    mockCompilerService.compile.mockReturnValue({
      errors: [
        {
          message: 'Compilation error',
          line: 1,
          column: 0,
          type: ErrorType.Semantic,
          severity: ErrorSeverity.Error,
        },
      ],
      fileName: params.textDocument.uri,
      result: null,
      warnings: [],
    });

    // Act
    await upserter.upsertReferences(params, mockDocuments as any);

    // Assert
    expect(mockDocuments.get).toHaveBeenCalledWith(params.textDocument.uri);
    expect(mockCompilerService.compile).toHaveBeenCalled();
    expect(mockStorage.getReferences).not.toHaveBeenCalled();
    expect(mockStorage.setReferences).not.toHaveBeenCalled();
  });

  it('should correctly store references in storage map', async () => {
    // Arrange
    const params: DidOpenTextDocumentParams = {
      textDocument: {
        uri: 'file:///test.apex',
        text: 'class TestClass { void testMethod() { TestClass t; } }',
        version: 1,
        languageId: 'apex',
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);
    mockCompilerService.compile.mockReturnValue({
      errors: [],
      fileName: params.textDocument.uri,
      result: null,
      warnings: [],
    });

    // Mock symbol table to return both class and method references
    mockSymbolTable.getCurrentScope.mockReturnValue({
      getAllSymbols: jest.fn().mockReturnValue([
        {
          name: 'TestClass',
          location: { startLine: 1, startColumn: 0 },
        },
        {
          name: 'testMethod',
          location: { startLine: 1, startColumn: 20 },
        },
      ]),
      name: 'global',
      parent: null,
      getSymbol: jest.fn(),
      addSymbol: jest.fn(),
      getChildren: jest.fn().mockReturnValue([]),
    } as unknown as SymbolScope);

    // Act
    await upserter.upsertReferences(params, mockDocuments as any);

    // Assert
    expect(mockStorage.setReferences).toHaveBeenCalledTimes(2);

    // Verify TestClass references
    expect(mockStorage.setReferences).toHaveBeenCalledWith(
      'TestClass',
      expect.arrayContaining([
        expect.objectContaining({
          sourceFile: params.textDocument.uri,
          targetSymbol: 'TestClass',
          line: 1,
          column: 0,
          referenceType: 'type-reference',
        }),
      ]),
    );

    // Verify testMethod references
    expect(mockStorage.setReferences).toHaveBeenCalledWith(
      'testMethod',
      expect.arrayContaining([
        expect.objectContaining({
          sourceFile: params.textDocument.uri,
          targetSymbol: 'testMethod',
          line: 1,
          column: 20,
          referenceType: 'type-reference',
        }),
      ]),
    );
  });
});
