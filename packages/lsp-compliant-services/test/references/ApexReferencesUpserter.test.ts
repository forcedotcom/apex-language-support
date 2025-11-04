/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  ApexSymbol,
  CompilerService,
  SymbolTable,
  ApexSymbolCollectorListener,
} from '@salesforce/apex-lsp-parser-ast';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { DefaultApexReferencesUpserter } from '../../src/references/ApexReferencesUpserter';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';

// Use real compiler for service-side test

describe('DefaultApexReferencesUpserter', () => {
  let mockStorage: jest.Mocked<ApexStorageInterface>;
  let _mockGlobalSymbols: ApexSymbol[];
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

    _mockGlobalSymbols = [];
    // upserter will be created per test after compiling symbols
  });

  const compileGlobalSymbols = (uri: string, text: string): ApexSymbol[] => {
    const table = new SymbolTable();
    const listener = new ApexSymbolCollectorListener(table);
    const compiler = new CompilerService();
    compiler.compile(text, uri, listener, {});
    const symbolTable = listener.getResult();
    return symbolTable.getCurrentScope().getAllSymbols();
  };

  it('should populate references for new document', async () => {
    // Arrange
    const event: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.cls',
        getText: () => 'class TestClass {}',
        version: 1,
        languageId: 'apex',
        positionAt: () => ({ line: 0, character: 0 }),
        offsetAt: () => 0,
        lineCount: 1,
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);

    // Build symbols and create upserter
    const symbols = compileGlobalSymbols(
      event.document.uri,
      event.document.getText(),
    );
    upserter = new DefaultApexReferencesUpserter(mockStorage, symbols);

    // Act
    await upserter.upsertReferences(event);

    // Assert
    expect(mockStorage.getReferences).toHaveBeenCalledWith('TestClass');
    expect(mockStorage.setReferences).toHaveBeenCalledWith(
      'TestClass',
      expect.arrayContaining([
        expect.objectContaining({
          sourceFile: event.document.uri,
          targetSymbol: 'TestClass',
          line: expect.any(Number),
          column: expect.any(Number),
          referenceType: 'type-reference',
        }),
      ]),
    );
  });

  it('should correctly store references in storage map', async () => {
    // Arrange
    const event: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.cls',
        getText: () => 'class TestClass { void testMethod() { TestClass t; } }',
        version: 1,
        languageId: 'apex',
        positionAt: () => ({ line: 0, character: 0 }),
        offsetAt: () => 0,
        lineCount: 1,
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);

    const symbols = compileGlobalSymbols(
      event.document.uri,
      event.document.getText(),
    );
    const upserter = new DefaultApexReferencesUpserter(mockStorage, symbols);
    // Act
    await upserter.upsertReferences(event);

    // Assert
    expect(mockStorage.setReferences).toHaveBeenCalledTimes(1);

    // Verify TestClass references
    expect(mockStorage.setReferences).toHaveBeenCalledWith(
      'TestClass',
      expect.arrayContaining([
        expect.objectContaining({
          sourceFile: event.document.uri,
          targetSymbol: 'TestClass',
          line: expect.any(Number),
          column: expect.any(Number),
          referenceType: 'type-reference',
        }),
      ]),
    );

    // With real compilation, only top-level symbols are included for global symbol set
  });
});
