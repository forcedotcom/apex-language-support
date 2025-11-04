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

import { DefaultApexDefinitionUpserter } from '../../src/definition/ApexDefinitionUpserter';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';

// Use real compiler from parser-ast for service-side tests

describe('DefaultApexDefinitionPopulator', () => {
  let mockStorage: jest.Mocked<ApexStorageInterface>;
  let populator: DefaultApexDefinitionUpserter;
  let _mockGlobalSymbols: ApexSymbol[];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock storage
    mockStorage = {
      getDocument: jest.fn(),
      setDefinition: jest.fn(),
    } as unknown as jest.Mocked<ApexStorageInterface>;

    // Build per-test via compiler
    _mockGlobalSymbols = [];
  });

  const compileGlobalSymbols = (uri: string, text: string): ApexSymbol[] => {
    const table = new SymbolTable();
    const listener = new ApexSymbolCollectorListener(table);
    const compiler = new CompilerService();
    compiler.compile(text, uri, listener, {});
    const symbolTable = listener.getResult();
    return symbolTable.getCurrentScope().getAllSymbols();
  };

  it('should populate definitions for new document', async () => {
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
    populator = new DefaultApexDefinitionUpserter(mockStorage, symbols);

    // Act
    await populator.upsertDefinition(event);

    // Assert
    expect(mockStorage.setDefinition).toHaveBeenCalledWith(
      'TestClass',
      expect.objectContaining({
        sourceFile: event.document.uri,
        targetSymbol: 'TestClass',
        line: expect.any(Number),
        column: expect.any(Number),
        referenceType: 'type-reference',
      }),
    );
  });

  it('should correctly store definitions in storage map', async () => {
    // Arrange
    const event: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.cls',
        getText: () => 'class TestClass { void testMethod() { } }',
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
    populator = new DefaultApexDefinitionUpserter(mockStorage, symbols);

    // Act
    await populator.upsertDefinition(event);

    // Assert
    expect(mockStorage.setDefinition).toHaveBeenCalledTimes(1);

    // Verify TestClass definition
    expect(mockStorage.setDefinition).toHaveBeenCalledWith(
      'TestClass',
      expect.objectContaining({
        sourceFile: event.document.uri,
        targetSymbol: 'TestClass',
        line: expect.any(Number),
        column: expect.any(Number),
        referenceType: 'type-reference',
      }),
    );

    // With real compilation, only top-level symbols (e.g., classes) are included
  });

  it('should handle document edits and update definitions', async () => {
    // Arrange
    const event: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.cls',
        getText: () => 'class UpdatedClass {}',
        version: 2,
        languageId: 'apex',
        positionAt: () => ({ line: 0, character: 0 }),
        offsetAt: () => 0,
        lineCount: 1,
      },
    };

    const symbols = compileGlobalSymbols(
      event.document.uri,
      event.document.getText(),
    );
    const populator = new DefaultApexDefinitionUpserter(mockStorage, symbols);
    // Act
    await populator.upsertDefinition(event);

    // Assert
    expect(mockStorage.setDefinition).toHaveBeenCalledWith(
      'UpdatedClass',
      expect.objectContaining({
        sourceFile: event.document.uri,
        targetSymbol: 'UpdatedClass',
        line: expect.any(Number),
        column: expect.any(Number),
        referenceType: 'type-reference',
      }),
    );
  });

  it('should handle multiple edits in sequence', async () => {
    // Arrange
    const events = [
      {
        document: {
          uri: 'file:///test.cls',
          getText: () => 'class FirstClass {}',
          version: 1,
          languageId: 'apex',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      },
      {
        document: {
          uri: 'file:///test.cls',
          getText: () => 'class SecondClass {}',
          version: 2,
          languageId: 'apex',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      },
    ];

    // Act & Assert for first edit (compile real symbols)
    const firstSymbols = compileGlobalSymbols(
      events[0].document.uri,
      events[0].document.getText(),
    );
    const populator = new DefaultApexDefinitionUpserter(
      mockStorage,
      firstSymbols,
    );
    await populator.upsertDefinition(
      events[0] as TextDocumentChangeEvent<TextDocument>,
    );

    // Act & Assert for second edit (compile real symbols)
    const secondSymbols = compileGlobalSymbols(
      events[1].document.uri,
      events[1].document.getText(),
    );
    const populator2 = new DefaultApexDefinitionUpserter(
      mockStorage,
      secondSymbols,
    );
    await populator2.upsertDefinition(
      events[1] as TextDocumentChangeEvent<TextDocument>,
    );

    // Final assertions
    expect(mockStorage.setDefinition).toHaveBeenCalledTimes(2);
    expect(mockStorage.setDefinition).toHaveBeenLastCalledWith(
      'SecondClass',
      expect.objectContaining({
        sourceFile: events[1].document.uri,
        targetSymbol: 'SecondClass',
        line: expect.any(Number),
        column: expect.any(Number),
        referenceType: 'type-reference',
      }),
    );
  });
});
