/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { VisibilitySymbolListener } from '../../src/parser/listeners/VisibilitySymbolListener';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolTable, SymbolKind } from '../../src/types/symbol';
import { isBlockSymbol } from '../../src/utils/symbolNarrowing';

/**
 * Tests that VisibilitySymbolListener and ApexSymbolCollectorListener produce
 * identical symbol IDs for inner types (e.g., inner class FooB inside Foo).
 * This ensures registerSymbolTable merge produces a single node, not duplicates.
 *
 * Also tests that top-level classes get the same ID from both listeners
 * (fileUri:class:Foo, not fileUri:class:Foo:class:Foo), preventing duplicate
 * class symbols when both listeners process the same file.
 */
describe('Inner Type ID Consistency', () => {
  const compilerService = new CompilerService();
  const fileUri = 'file:///test/Foo.cls';

  const apexWithInnerClass = `
public class Foo {
  public class FooB {
    public void m() {}
  }
}
`;

  it('VisibilitySymbolListener should produce inner class ID with root prefix (class:Foo:block:Foo:class:FooB)', () => {
    const table = new SymbolTable();
    const listener = new VisibilitySymbolListener('public-api', table);
    listener.setCurrentFileUri(fileUri);

    const result = compilerService.compile(
      apexWithInnerClass,
      fileUri,
      listener,
    );
    expect(result.errors.length).toBe(0);
    expect(result.result).toBeDefined();

    const symbolTable = result.result as SymbolTable;
    const typeSymbols = symbolTable
      .getAllSymbols()
      .filter((s) => !isBlockSymbol(s) && s.kind === SymbolKind.Class);

    const fooSymbol = typeSymbols.find((s) => s.name === 'Foo');
    const fooBSymbol = typeSymbols.find((s) => s.name === 'FooB');

    expect(fooSymbol).toBeDefined();
    expect(fooBSymbol).toBeDefined();

    // Inner class FooB must have ID format: fileUri:class:Foo:block:Foo:class:FooB
    // (root prefix ensures consistency with ApexSymbolCollectorListener)
    expect(fooBSymbol!.id).toContain('class:Foo');
    expect(fooBSymbol!.id).toContain('block:Foo');
    expect(fooBSymbol!.id).toContain('class:FooB');
    expect(fooBSymbol!.id).toMatch(/class:Foo:block:Foo:class:FooB$/);
  });

  it('ApexSymbolCollectorListener should produce same inner class ID format', () => {
    const table = new SymbolTable();
    const listener = new ApexSymbolCollectorListener(table, 'full');
    listener.setCurrentFileUri(fileUri);

    const result = compilerService.compile(
      apexWithInnerClass,
      fileUri,
      listener,
    );
    expect(result.errors.length).toBe(0);
    expect(result.result).toBeDefined();

    const symbolTable = result.result as SymbolTable;
    const typeSymbols = symbolTable
      .getAllSymbols()
      .filter((s) => !isBlockSymbol(s) && s.kind === SymbolKind.Class);

    const fooBSymbol = typeSymbols.find((s) => s.name === 'FooB');
    expect(fooBSymbol).toBeDefined();

    expect(fooBSymbol!.id).toContain('class:Foo');
    expect(fooBSymbol!.id).toContain('block:Foo');
    expect(fooBSymbol!.id).toContain('class:FooB');
  });

  it('both listeners should produce identical FooB symbol IDs for same file', () => {
    const table1 = new SymbolTable();
    const listener1 = new VisibilitySymbolListener('public-api', table1);
    listener1.setCurrentFileUri(fileUri);

    const table2 = new SymbolTable();
    const listener2 = new ApexSymbolCollectorListener(table2, 'full');
    listener2.setCurrentFileUri(fileUri);

    const result1 = compilerService.compile(
      apexWithInnerClass,
      fileUri,
      listener1,
    );
    const result2 = compilerService.compile(
      apexWithInnerClass,
      fileUri,
      listener2,
    );

    const symbols1 = (result1.result as SymbolTable).getAllSymbols();
    const symbols2 = (result2.result as SymbolTable).getAllSymbols();

    const fooB1 = symbols1.find(
      (s) =>
        !isBlockSymbol(s) && s.kind === SymbolKind.Class && s.name === 'FooB',
    );
    const fooB2 = symbols2.find(
      (s) =>
        !isBlockSymbol(s) && s.kind === SymbolKind.Class && s.name === 'FooB',
    );

    expect(fooB1).toBeDefined();
    expect(fooB2).toBeDefined();
    expect(fooB1!.id).toBe(fooB2!.id);
  });

  it('registerSymbolTable merge (full then public-api) should produce single FooB in merged table', () => {
    const { ApexSymbolGraph } = require('../../src/symbols/ApexSymbolGraph');

    const graph = new ApexSymbolGraph();

    // First: compile with full (ApexSymbolCollectorListener)
    const table1 = new SymbolTable();
    const listener1 = new ApexSymbolCollectorListener(table1, 'full');
    listener1.setCurrentFileUri(fileUri);
    const result1 = compilerService.compile(
      apexWithInnerClass,
      fileUri,
      listener1,
    );
    const fullTable = result1.result as SymbolTable;

    // Second: compile with public-api (VisibilitySymbolListener)
    const table2 = new SymbolTable();
    const listener2 = new VisibilitySymbolListener('public-api', table2);
    listener2.setCurrentFileUri(fileUri);
    const result2 = compilerService.compile(
      apexWithInnerClass,
      fileUri,
      listener2,
    );
    const publicApiTable = result2.result as SymbolTable;

    // Register full table first
    graph.registerSymbolTable(fullTable, fileUri);

    // Register public-api table (replaces, triggers merge)
    graph.registerSymbolTable(publicApiTable, fileUri);

    const mergedTable = graph.getSymbolTableForFile(fileUri);
    expect(mergedTable).toBeDefined();

    const fooBSymbols = mergedTable!
      .getAllSymbols()
      .filter(
        (s) =>
          !isBlockSymbol(s) && s.kind === SymbolKind.Class && s.name === 'FooB',
      );

    expect(fooBSymbols.length).toBe(1);
  });

  describe('Top-level class ID consistency (no duplicate Foo class symbols)', () => {
    const apexTopLevelOnly = `
public class Foo {
  public void m() {}
}
`;
    const apexTopLevelOnlyUri = 'file:///test/Foo.cls';

    it('VisibilitySymbolListener should produce top-level class ID format class:Foo (not class:Foo:class:Foo)', () => {
      const table = new SymbolTable();
      const listener = new VisibilitySymbolListener('public-api', table);
      listener.setCurrentFileUri(apexTopLevelOnlyUri);

      const result = compilerService.compile(
        apexTopLevelOnly,
        apexTopLevelOnlyUri,
        listener,
      );
      expect(result.errors.length).toBe(0);

      const symbolTable = result.result as SymbolTable;
      const fooSymbols = symbolTable
        .getAllSymbols()
        .filter(
          (s) =>
            !isBlockSymbol(s) &&
            s.kind === SymbolKind.Class &&
            s.name === 'Foo',
        );

      expect(fooSymbols.length).toBe(1);
      // Top-level class must have ID format: fileUri:class:Foo (NOT fileUri:class:Foo:class:Foo)
      expect(fooSymbols[0].id).toMatch(/class:Foo$/);
      expect(fooSymbols[0].id).not.toMatch(/class:Foo:class:Foo/);
    });

    it('ApexSymbolCollectorListener should produce same top-level class ID format', () => {
      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table, 'full');
      listener.setCurrentFileUri(apexTopLevelOnlyUri);

      const result = compilerService.compile(
        apexTopLevelOnly,
        apexTopLevelOnlyUri,
        listener,
      );
      expect(result.errors.length).toBe(0);

      const symbolTable = result.result as SymbolTable;
      const fooSymbols = symbolTable
        .getAllSymbols()
        .filter(
          (s) =>
            !isBlockSymbol(s) &&
            s.kind === SymbolKind.Class &&
            s.name === 'Foo',
        );

      expect(fooSymbols.length).toBe(1);
      expect(fooSymbols[0].id).toMatch(/class:Foo$/);
      expect(fooSymbols[0].id).not.toMatch(/class:Foo:class:Foo/);
    });

    it('both listeners should produce identical top-level Foo class IDs', () => {
      const table1 = new SymbolTable();
      const listener1 = new VisibilitySymbolListener('public-api', table1);
      listener1.setCurrentFileUri(apexTopLevelOnlyUri);

      const table2 = new SymbolTable();
      const listener2 = new ApexSymbolCollectorListener(table2, 'full');
      listener2.setCurrentFileUri(apexTopLevelOnlyUri);

      const result1 = compilerService.compile(
        apexTopLevelOnly,
        apexTopLevelOnlyUri,
        listener1,
      );
      const result2 = compilerService.compile(
        apexTopLevelOnly,
        apexTopLevelOnlyUri,
        listener2,
      );

      const foo1 = (result1.result as SymbolTable)
        .getAllSymbols()
        .find(
          (s) =>
            !isBlockSymbol(s) &&
            s.kind === SymbolKind.Class &&
            s.name === 'Foo',
        );
      const foo2 = (result2.result as SymbolTable)
        .getAllSymbols()
        .find(
          (s) =>
            !isBlockSymbol(s) &&
            s.kind === SymbolKind.Class &&
            s.name === 'Foo',
        );

      expect(foo1).toBeDefined();
      expect(foo2).toBeDefined();
      expect(foo1!.id).toBe(foo2!.id);
    });

    it('registerSymbolTable merge should produce single Foo class symbol (no duplicates)', () => {
      const { ApexSymbolGraph } = require('../../src/symbols/ApexSymbolGraph');

      const graph = new ApexSymbolGraph();

      const table1 = new SymbolTable();
      const listener1 = new ApexSymbolCollectorListener(table1, 'full');
      listener1.setCurrentFileUri(apexTopLevelOnlyUri);
      const result1 = compilerService.compile(
        apexTopLevelOnly,
        apexTopLevelOnlyUri,
        listener1,
      );
      const fullTable = result1.result as SymbolTable;

      const table2 = new SymbolTable();
      const listener2 = new VisibilitySymbolListener('public-api', table2);
      listener2.setCurrentFileUri(apexTopLevelOnlyUri);
      const result2 = compilerService.compile(
        apexTopLevelOnly,
        apexTopLevelOnlyUri,
        listener2,
      );
      const publicApiTable = result2.result as SymbolTable;

      graph.registerSymbolTable(fullTable, apexTopLevelOnlyUri);
      graph.registerSymbolTable(publicApiTable, apexTopLevelOnlyUri);

      const mergedTable = graph.getSymbolTableForFile(apexTopLevelOnlyUri);
      expect(mergedTable).toBeDefined();

      const fooSymbols = mergedTable!
        .getAllSymbols()
        .filter(
          (s) =>
            !isBlockSymbol(s) &&
            s.kind === SymbolKind.Class &&
            s.name === 'Foo',
        );

      expect(fooSymbols.length).toBe(1);
    });
  });
});
