/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  ApexSymbol,
  SymbolVisibility,
  SymbolKind,
} from '@salesforce/apex-lsp-parser-ast';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { DefaultApexDefinitionUpserter } from '../../src/definition/ApexDefinitionUpserter';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';

jest.mock('@salesforce/apex-lsp-parser-ast');

describe('DefaultApexDefinitionPopulator', () => {
  let mockStorage: jest.Mocked<ApexStorageInterface>;
  let populator: DefaultApexDefinitionUpserter;
  let mockGlobalSymbols: ApexSymbol[];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock storage
    mockStorage = {
      getDocument: jest.fn(),
      setDefinition: jest.fn(),
    } as unknown as jest.Mocked<ApexStorageInterface>;

    // Setup mock symbol table
    mockGlobalSymbols = [
      {
        name: 'TestClass',
        location: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 10 },
        kind: SymbolKind.Class,
        key: { prefix: 'class', name: 'TestClass', path: ['TestClass'] },
        parentKey: null,
        modifiers: {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isOverride: false,
          isVirtual: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        parent: null,
      },
      {
        name: 'testMethod',
        location: { startLine: 1, startColumn: 20, endLine: 1, endColumn: 29 },
        kind: SymbolKind.Method,
        key: {
          prefix: 'method',
          name: 'testMethod',
          path: ['TestClass', 'testMethod'],
        },
        parentKey: { prefix: 'class', name: 'TestClass', path: ['TestClass'] },
        modifiers: {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isOverride: false,
          isVirtual: false,
          isTransient: false,
          isTestMethod: true,
          isWebService: false,
        },
        parent: null,
      },
    ];

    populator = new DefaultApexDefinitionUpserter(
      mockStorage,
      mockGlobalSymbols,
    );
  });

  it('should populate definitions for new document', async () => {
    // Arrange
    const event: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.apex',
        getText: () => 'class TestClass {}',
        version: 1,
        languageId: 'apex',
        positionAt: () => ({ line: 0, character: 0 }),
        offsetAt: () => 0,
        lineCount: 1,
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);

    // Act
    await populator.upsertDefinition(event);

    // Assert
    expect(mockStorage.setDefinition).toHaveBeenCalledWith(
      'TestClass',
      expect.objectContaining({
        sourceFile: event.document.uri,
        targetSymbol: 'TestClass',
        line: 1,
        column: 0,
        referenceType: 'type-reference',
      }),
    );
  });

  it('should correctly store definitions in storage map', async () => {
    // Arrange
    const event: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.apex',
        getText: () => 'class TestClass { void testMethod() { } }',
        version: 1,
        languageId: 'apex',
        positionAt: () => ({ line: 0, character: 0 }),
        offsetAt: () => 0,
        lineCount: 1,
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);

    // Act
    await populator.upsertDefinition(event);

    // Assert
    expect(mockStorage.setDefinition).toHaveBeenCalledTimes(2);

    // Verify TestClass definition
    expect(mockStorage.setDefinition).toHaveBeenCalledWith(
      'TestClass',
      expect.objectContaining({
        sourceFile: event.document.uri,
        targetSymbol: 'TestClass',
        line: 1,
        column: 0,
        referenceType: 'type-reference',
      }),
    );

    // Verify testMethod definition
    expect(mockStorage.setDefinition).toHaveBeenCalledWith(
      'testMethod',
      expect.objectContaining({
        sourceFile: event.document.uri,
        targetSymbol: 'testMethod',
        line: 1,
        column: 20,
        referenceType: 'type-reference',
      }),
    );
  });

  it('should handle document edits and update definitions', async () => {
    // Arrange
    const event: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.apex',
        getText: () => 'class UpdatedClass {}',
        version: 2,
        languageId: 'apex',
        positionAt: () => ({ line: 0, character: 0 }),
        offsetAt: () => 0,
        lineCount: 1,
      },
    };

    const updatedSymbols = [
      {
        name: 'UpdatedClass',
        location: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 12 },
        kind: SymbolKind.Class,
        key: { prefix: 'class', name: 'UpdatedClass', path: ['UpdatedClass'] },
        parentKey: null,
        modifiers: {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isOverride: false,
          isVirtual: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        parent: null,
      },
    ];

    const populator = new DefaultApexDefinitionUpserter(
      mockStorage,
      updatedSymbols,
    );
    // Act
    await populator.upsertDefinition(event);

    // Assert
    expect(mockStorage.setDefinition).toHaveBeenCalledWith(
      'UpdatedClass',
      expect.objectContaining({
        sourceFile: event.document.uri,
        targetSymbol: 'UpdatedClass',
        line: 1,
        column: 0,
        referenceType: 'type-reference',
      }),
    );
  });

  it('should handle multiple edits in sequence', async () => {
    // Arrange
    const events = [
      {
        document: {
          uri: 'file:///test.apex',
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
          uri: 'file:///test.apex',
          getText: () => 'class SecondClass {}',
          version: 2,
          languageId: 'apex',
          positionAt: () => ({ line: 0, character: 0 }),
          offsetAt: () => 0,
          lineCount: 1,
        },
      },
    ];

    const firstSymbols = [
      {
        name: 'FirstClass',
        location: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 11 },
        kind: SymbolKind.Class,
        key: { prefix: 'class', name: 'FirstClass', path: ['FirstClass'] },
        parentKey: null,
        modifiers: {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isOverride: false,
          isVirtual: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        parent: null,
      },
    ];

    const secondSymbols = [
      {
        name: 'SecondClass',
        location: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 12 },
        kind: SymbolKind.Class,
        key: { prefix: 'class', name: 'SecondClass', path: ['SecondClass'] },
        parentKey: null,
        modifiers: {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isOverride: false,
          isVirtual: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
        },
        parent: null,
      },
    ];

    // Act & Assert for first edit
    const populator = new DefaultApexDefinitionUpserter(
      mockStorage,
      firstSymbols,
    );
    await populator.upsertDefinition(
      events[0] as TextDocumentChangeEvent<TextDocument>,
    );

    // Act & Assert for second edit
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
        line: 1,
        column: 0,
        referenceType: 'type-reference',
      }),
    );
  });
});
