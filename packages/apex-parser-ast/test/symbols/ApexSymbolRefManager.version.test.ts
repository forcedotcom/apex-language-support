/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolRefManager } from '../../src/symbols/ApexSymbolRefManager';
import {
  SymbolTable,
  SymbolKind,
  SymbolLocation,
  SymbolFactory,
} from '../../src/types/symbol';

describe('ApexSymbolRefManager Version-Aware Replace Semantics', () => {
  let symbolRefManager: ApexSymbolRefManager;
  const testFileUri = 'file:///test/TestClass.cls';

  beforeEach(() => {
    symbolRefManager = new ApexSymbolRefManager();
    ApexSymbolRefManager.setInstance(symbolRefManager);
  });

  afterEach(() => {
    symbolRefManager.clear();
  });

  const createLocation = (
    startLine: number,
    startColumn: number = 0,
    endLine: number = startLine,
    endColumn: number = 100,
  ): SymbolLocation => ({
    symbolRange: { startLine, startColumn, endLine, endColumn },
    identifierRange: { startLine, startColumn, endLine, endColumn },
  });

  function createSymbol(name: string, kind: SymbolKind, line: number) {
    return SymbolFactory.createFullSymbol(
      name,
      kind,
      createLocation(line),
      testFileUri,
      { visibility: 'public' },
      null,
    );
  }

  function createTableWithSymbols(
    ...symbols: Array<{ name: string; kind: SymbolKind; line: number }>
  ): SymbolTable {
    const table = new SymbolTable();
    table.setFileUri(testFileUri);
    for (const s of symbols) {
      table.addSymbol(createSymbol(s.name, s.kind, s.line));
    }
    return table;
  }

  describe('Newer version replaces', () => {
    it('should discard old symbols when a newer version is registered', () => {
      const tableV1 = createTableWithSymbols(
        { name: 'SymbolA', kind: SymbolKind.Class, line: 1 },
        { name: 'SymbolB', kind: SymbolKind.Class, line: 10 },
      );
      symbolRefManager.registerSymbolTable(tableV1, testFileUri, {
        documentVersion: 1,
      });

      const tableV2 = createTableWithSymbols({
        name: 'SymbolC',
        kind: SymbolKind.Class,
        line: 1,
      });
      symbolRefManager.registerSymbolTable(tableV2, testFileUri, {
        documentVersion: 2,
      });

      const registered = symbolRefManager.getSymbolTableForFile(testFileUri);
      expect(registered).toBe(tableV2);

      const allSymbols = registered!.getAllSymbols();
      const names = allSymbols.map((s) => s.name);
      expect(names).toContain('SymbolC');
      expect(names).not.toContain('SymbolA');
      expect(names).not.toContain('SymbolB');
    });
  });

  describe('Same/unknown version merges', () => {
    it('should merge symbols when same version is registered', () => {
      const tableV1a = createTableWithSymbols(
        { name: 'SymbolA', kind: SymbolKind.Class, line: 1 },
        { name: 'SymbolB', kind: SymbolKind.Class, line: 10 },
      );
      symbolRefManager.registerSymbolTable(tableV1a, testFileUri, {
        documentVersion: 1,
      });

      const tableV1b = createTableWithSymbols({
        name: 'SymbolC',
        kind: SymbolKind.Class,
        line: 20,
      });
      symbolRefManager.registerSymbolTable(tableV1b, testFileUri, {
        documentVersion: 1,
      });

      const registered = symbolRefManager.getSymbolTableForFile(testFileUri);
      const allSymbols = registered!.getAllSymbols();
      const names = allSymbols.map((s) => s.name);
      // Merge preserves old symbols not in new table
      expect(names).toContain('SymbolA');
      expect(names).toContain('SymbolB');
      expect(names).toContain('SymbolC');
    });

    it('should merge symbols when no version is provided', () => {
      const table1 = createTableWithSymbols(
        { name: 'SymbolA', kind: SymbolKind.Class, line: 1 },
        { name: 'SymbolB', kind: SymbolKind.Class, line: 10 },
      );
      symbolRefManager.registerSymbolTable(table1, testFileUri);

      const table2 = createTableWithSymbols({
        name: 'SymbolC',
        kind: SymbolKind.Class,
        line: 20,
      });
      symbolRefManager.registerSymbolTable(table2, testFileUri);

      const registered = symbolRefManager.getSymbolTableForFile(testFileUri);
      const allSymbols = registered!.getAllSymbols();
      const names = allSymbols.map((s) => s.name);
      expect(names).toContain('SymbolA');
      expect(names).toContain('SymbolB');
      expect(names).toContain('SymbolC');
    });
  });

  describe('Incomplete parse falls back to merge', () => {
    it('should preserve existing symbols when new parse produces zero symbols', () => {
      const tableV1 = createTableWithSymbols(
        { name: 'SymbolA', kind: SymbolKind.Class, line: 1 },
        { name: 'SymbolB', kind: SymbolKind.Class, line: 10 },
      );
      symbolRefManager.registerSymbolTable(tableV1, testFileUri, {
        documentVersion: 1,
      });

      // Newer version with zero symbols (failed parse)
      const emptyTable = new SymbolTable();
      emptyTable.setFileUri(testFileUri);
      symbolRefManager.registerSymbolTable(emptyTable, testFileUri, {
        documentVersion: 2,
      });

      const registered = symbolRefManager.getSymbolTableForFile(testFileUri);
      const allSymbols = registered!.getAllSymbols();
      const names = allSymbols.map((s) => s.name);
      // Symbols preserved via merge fallback
      expect(names).toContain('SymbolA');
      expect(names).toContain('SymbolB');
    });

    it('should preserve existing symbols when new parse has errors and fewer symbols', () => {
      const tableV1 = createTableWithSymbols(
        { name: 'SymbolA', kind: SymbolKind.Class, line: 1 },
        { name: 'SymbolB', kind: SymbolKind.Method, line: 5 },
        { name: 'SymbolC', kind: SymbolKind.Method, line: 10 },
      );
      symbolRefManager.registerSymbolTable(tableV1, testFileUri, {
        documentVersion: 1,
      });

      // Newer version with errors and fewer symbols (mid-file syntax error)
      const partialTable = createTableWithSymbols({
        name: 'SymbolA',
        kind: SymbolKind.Class,
        line: 1,
      });
      symbolRefManager.registerSymbolTable(partialTable, testFileUri, {
        documentVersion: 2,
        hasErrors: true,
      });

      const registered = symbolRefManager.getSymbolTableForFile(testFileUri);
      const allSymbols = registered!.getAllSymbols();
      const names = allSymbols.map((s) => s.name);
      // All symbols preserved via merge fallback (error + fewer symbols)
      expect(names).toContain('SymbolA');
      expect(names).toContain('SymbolB');
      expect(names).toContain('SymbolC');
    });

    it('should replace when hasErrors is true but symbol count is not fewer', () => {
      const tableV1 = createTableWithSymbols({
        name: 'SymbolA',
        kind: SymbolKind.Class,
        line: 1,
      });
      symbolRefManager.registerSymbolTable(tableV1, testFileUri, {
        documentVersion: 1,
      });

      // Newer version with errors but same/more symbols — replace is safe
      const tableV2 = createTableWithSymbols(
        { name: 'SymbolB', kind: SymbolKind.Class, line: 1 },
        { name: 'SymbolC', kind: SymbolKind.Method, line: 5 },
      );
      symbolRefManager.registerSymbolTable(tableV2, testFileUri, {
        documentVersion: 2,
        hasErrors: true,
      });

      const registered = symbolRefManager.getSymbolTableForFile(testFileUri);
      const allSymbols = registered!.getAllSymbols();
      const names = allSymbols.map((s) => s.name);
      expect(names).toContain('SymbolB');
      expect(names).toContain('SymbolC');
      expect(names).not.toContain('SymbolA');
    });
  });

  describe('Version tracking', () => {
    it('should treat out-of-order version as merge (not newer than stored)', () => {
      const tableV1 = createTableWithSymbols({
        name: 'SymbolA',
        kind: SymbolKind.Class,
        line: 1,
      });
      symbolRefManager.registerSymbolTable(tableV1, testFileUri, {
        documentVersion: 1,
      });

      // Jump to v3
      const tableV3 = createTableWithSymbols({
        name: 'SymbolB',
        kind: SymbolKind.Class,
        line: 1,
      });
      symbolRefManager.registerSymbolTable(tableV3, testFileUri, {
        documentVersion: 3,
      });

      // v2 arrives late — not newer than stored v3, so merge
      const tableV2 = createTableWithSymbols({
        name: 'SymbolC',
        kind: SymbolKind.Class,
        line: 10,
      });
      symbolRefManager.registerSymbolTable(tableV2, testFileUri, {
        documentVersion: 2,
      });

      const registered = symbolRefManager.getSymbolTableForFile(testFileUri);
      const allSymbols = registered!.getAllSymbols();
      const names = allSymbols.map((s) => s.name);
      // v2 merged (not newer than stored v3), so SymbolB from v3 preserved
      expect(names).toContain('SymbolB');
      expect(names).toContain('SymbolC');
    });
  });
});
