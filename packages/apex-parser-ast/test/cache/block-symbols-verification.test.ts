/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ResourceLoader } from '../../src/utils/resourceLoader';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { SymbolKind } from '../../src/types/symbol';
import { isBlockSymbol } from '../../src/utils/symbolNarrowing';
import { Effect } from 'effect';

describe('Block Symbols Verification', () => {
  let resourceLoader: ResourceLoader;
  let symbolManager: ApexSymbolManager;

  beforeAll(async () => {
    resourceLoader = new ResourceLoader();
    await resourceLoader.initialize();

    symbolManager = new ApexSymbolManager({
      resourceLoader,
      enableBackgroundProcessing: false,
    });
  });

  it('should load block symbols from protobuf cache', async () => {
    const encodingUtilUri = 'System/EncodingUtil.cls';
    const symbolTable = await resourceLoader.getSymbolTable(encodingUtilUri);

    expect(symbolTable).not.toBeNull();

    const allSymbols = symbolTable!.getAllSymbols();
    const blocks = allSymbols.filter((s) => s.kind === SymbolKind.Block);

    expect(blocks.length).toBeGreaterThan(0);

    // Should have at least a class block
    const classBlock = blocks.find(
      (b) => isBlockSymbol(b) && b.scopeType === 'class',
    );
    expect(classBlock).toBeDefined();
  });

  it('should have complete parent hierarchy for methods', async () => {
    const encodingUtilUri = 'System/EncodingUtil.cls';
    const symbolTable = await resourceLoader.getSymbolTable(encodingUtilUri);

    expect(symbolTable).not.toBeNull();

    const allSymbols = symbolTable!.getAllSymbols();
    const urlEncodeMethod = allSymbols.find(
      (s) => s.name === 'urlEncode' && s.kind === SymbolKind.Method,
    );

    expect(urlEncodeMethod).toBeDefined();
    expect(urlEncodeMethod!.parentId).toBeTruthy();

    // The parent should exist (should be a block)
    const parent = allSymbols.find((s) => s.id === urlEncodeMethod!.parentId);
    expect(parent).toBeDefined();
    expect(parent!.kind).toBe(SymbolKind.Block);
  });

  it('should resolve containing type via getContainingType', async () => {
    const encodingUtilUri = 'System/EncodingUtil.cls';
    const symbolTable = await resourceLoader.getSymbolTable(encodingUtilUri);

    expect(symbolTable).not.toBeNull();

    const allSymbols = symbolTable!.getAllSymbols();
    const urlEncodeMethod = allSymbols.find(
      (s) => s.name === 'urlEncode' && s.kind === SymbolKind.Method,
    );

    expect(urlEncodeMethod).toBeDefined();

    // Add the symbol table to the manager so getContainingType can work
    // Use the fileUri from the symbol table
    const fileUri = symbolTable!.getFileUri();
    await Effect.runPromise(
      symbolManager.addSymbolTable(symbolTable!, fileUri),
    );

    const containingType = symbolManager.getContainingType(urlEncodeMethod!);
    expect(containingType).not.toBeNull();
    expect(containingType!.name).toBe('EncodingUtil');
    expect(containingType!.kind).toBe(SymbolKind.Class);
  });

  it('should resolve containing type for Assert.isNotNull method', async () => {
    const assertUri = 'System/Assert.cls';
    const symbolTable = await resourceLoader.getSymbolTable(assertUri);

    expect(symbolTable).not.toBeNull();

    const allSymbols = symbolTable!.getAllSymbols();
    const isNotNullMethod = allSymbols.find(
      (s) => s.name === 'isNotNull' && s.kind === SymbolKind.Method,
    );

    expect(isNotNullMethod).toBeDefined();

    await Effect.runPromise(
      symbolManager.addSymbolTable(symbolTable!, symbolTable!.getFileUri()),
    );

    const containingType = symbolManager.getContainingType(isNotNullMethod!);
    expect(containingType).not.toBeNull();
    expect(containingType!.name).toBe('Assert');
    expect(containingType!.kind).toBe(SymbolKind.Class);
  });
});
