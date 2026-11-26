/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompilerService,
  FullSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import {
  buildTypeRenameEdit,
  declaresShadowingSymbol,
  fileRenamesForType,
  typeDeclarationRangesFromParse,
} from '../../../src/services/rename/typeRename';

const parse = (content: string, uri = 'file:///src/Foo.cls'): SymbolTable => {
  const table = new SymbolTable();
  const compiled = new CompilerService().compile(
    content,
    uri,
    new FullSymbolCollectorListener(table),
    { collectReferences: true, resolveReferences: true },
  );
  return compiled.result as SymbolTable;
};

describe('typeRename (W-23631144)', () => {
  describe('fileRenamesForType', () => {
    it('emits the .cls and .cls-meta.xml pair', () => {
      expect(fileRenamesForType('file:///ws/classes/Foo.cls', 'Bar')).toEqual([
        {
          oldUri: 'file:///ws/classes/Foo.cls',
          newUri: 'file:///ws/classes/Bar.cls',
        },
        {
          oldUri: 'file:///ws/classes/Foo.cls-meta.xml',
          newUri: 'file:///ws/classes/Bar.cls-meta.xml',
        },
      ]);
    });

    it('returns null for non-.cls documents', () => {
      expect(fileRenamesForType('file:///ws/anon.apex', 'Bar')).toBeNull();
    });
  });

  describe('buildTypeRenameEdit', () => {
    const edits = new Map([
      [
        'file:///a/Foo.cls',
        [
          {
            range: {
              start: { line: 0, character: 13 },
              end: { line: 0, character: 16 },
            },
            newText: 'Bar',
          },
        ],
      ],
    ]);
    const renames = fileRenamesForType('file:///a/Foo.cls', 'Bar');

    it('uses documentChanges with text edits before RenameFile ops', () => {
      const result = buildTypeRenameEdit(edits, renames, true);
      expect(result.changes).toBeUndefined();
      expect(result.documentChanges).toHaveLength(3);
      expect(result.documentChanges?.[0]).toMatchObject({
        textDocument: { uri: 'file:///a/Foo.cls', version: null },
      });
      expect(result.documentChanges?.slice(1)).toEqual([
        {
          kind: 'rename',
          oldUri: 'file:///a/Foo.cls',
          newUri: 'file:///a/Bar.cls',
        },
        {
          kind: 'rename',
          oldUri: 'file:///a/Foo.cls-meta.xml',
          newUri: 'file:///a/Bar.cls-meta.xml',
        },
      ]);
    });

    it('falls back to the plain changes map without file rename support', () => {
      const result = buildTypeRenameEdit(edits, renames, false);
      expect(result.documentChanges).toBeUndefined();
      expect(Object.keys(result.changes ?? {})).toEqual(['file:///a/Foo.cls']);
    });
  });

  describe('typeDeclarationRangesFromParse', () => {
    it('returns the type identifier and each constructor identifier', () => {
      const table = parse(
        'public class Foo {\n  public Foo() {}\n  public Foo(Integer i) {}\n  public void m() {}\n}',
      );
      const ranges = typeDeclarationRangesFromParse(table as never, 'Foo');
      expect(ranges).not.toBeNull();
      expect(ranges).toHaveLength(3);
      expect(ranges?.[0]).toMatchObject({ startLine: 1, startColumn: 13 });
    });

    it('returns null when the type is not declared', () => {
      const table = parse('public class Foo {}');
      expect(typeDeclarationRangesFromParse(table as never, 'Nope')).toBeNull();
    });
  });

  describe('declaresShadowingSymbol', () => {
    it('is false for the target type and its constructors alone', () => {
      const table = parse('public class Foo {\n  public Foo() {}\n}');
      expect(declaresShadowingSymbol(table as never, 'Foo', true)).toBe(false);
    });

    it('is true for a nested type with the same name', () => {
      const table = parse(
        'public class Other {\n  public class Foo {}\n}',
        'file:///src/Other.cls',
      );
      expect(declaresShadowingSymbol(table as never, 'Foo', false)).toBe(true);
    });

    it('is true for a same-named field in another file', () => {
      const table = parse(
        'public class Other {\n  public Integer foo;\n}',
        'file:///src/Other.cls',
      );
      expect(declaresShadowingSymbol(table as never, 'Foo', false)).toBe(true);
    });

    it('is false for a file that declares nothing with that name', () => {
      const table = parse(
        'public class Other {\n  public Foo f;\n}',
        'file:///src/Other.cls',
      );
      expect(declaresShadowingSymbol(table as never, 'Foo', false)).toBe(false);
    });
  });
});
