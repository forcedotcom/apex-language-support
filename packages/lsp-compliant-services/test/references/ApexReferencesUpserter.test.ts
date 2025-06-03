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

import { DefaultApexReferencesUpserter } from '../../src/references/ApexReferencesUpserter';
import { ApexStorageInterface } from '../../src/storage/ApexStorageInterface';

jest.mock('@salesforce/apex-lsp-parser-ast');

describe('DefaultApexReferencesUpserter', () => {
  let mockStorage: jest.Mocked<ApexStorageInterface>;
  let mockGlobalSymbols: ApexSymbol[];
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
    ];

    upserter = new DefaultApexReferencesUpserter(
      mockStorage,
      mockGlobalSymbols,
    );
  });

  it('should populate references for new document', async () => {
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
    await upserter.upsertReferences(event);

    // Assert
    expect(mockStorage.getReferences).toHaveBeenCalledWith('TestClass');
    expect(mockStorage.setReferences).toHaveBeenCalledWith(
      'TestClass',
      expect.arrayContaining([
        expect.objectContaining({
          sourceFile: event.document.uri,
          targetSymbol: 'TestClass',
          line: 1,
          column: 0,
          referenceType: 'type-reference',
        }),
      ]),
    );
  });

  it('should correctly store references in storage map', async () => {
    // Arrange
    const event: TextDocumentChangeEvent<TextDocument> = {
      document: {
        uri: 'file:///test.apex',
        getText: () => 'class TestClass { void testMethod() { TestClass t; } }',
        version: 1,
        languageId: 'apex',
        positionAt: () => ({ line: 0, character: 0 }),
        offsetAt: () => 0,
        lineCount: 1,
      },
    };

    mockStorage.getDocument.mockResolvedValue(null);

    const mockGlobalSymbols = [
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

    const upserter = new DefaultApexReferencesUpserter(
      mockStorage,
      mockGlobalSymbols,
    );
    // Act
    await upserter.upsertReferences(event);

    // Assert
    expect(mockStorage.setReferences).toHaveBeenCalledTimes(2);

    // Verify TestClass references
    expect(mockStorage.setReferences).toHaveBeenCalledWith(
      'TestClass',
      expect.arrayContaining([
        expect.objectContaining({
          sourceFile: event.document.uri,
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
          sourceFile: event.document.uri,
          targetSymbol: 'testMethod',
          line: 1,
          column: 20,
          referenceType: 'type-reference',
        }),
      ]),
    );
  });
});
