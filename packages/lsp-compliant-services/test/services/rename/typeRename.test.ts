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
  checkExceptionNamingRule,
  checkTypeNameConflict,
  declaresShadowingSymbol,
  fileRenamesForType,
  typeDeclarationRangesFromParse,
} from '../../../src/services/rename/typeRename';
import { canBeRenamed } from '../../../src/services/rename/renameTypes';

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

describe('typeRename validation (W-23631147)', () => {
  const topLevelClass = (table: SymbolTable, name: string) =>
    table
      .getAllSymbols()
      .find((s) => s.name === name && s.kind === 'class' && !s.parentId)!;

  const svcFor = (tables: SymbolTable[]) =>
    ({
      symbolManager: {
        findSymbolByName: async (n: string) =>
          tables
            .flatMap((t) => t.getAllSymbols())
            .filter((s) => s.name.toLowerCase() === n.toLowerCase()),
      },
    }) as never;

  describe('checkExceptionNamingRule', () => {
    const exc = parse(
      'public class MyException extends Exception {}',
      'file:///src/MyException.cls',
    );
    const plain = parse('public class Plain {}', 'file:///src/Plain.cls');

    it('rejects renaming an Exception subclass to a non-Exception name', async () => {
      const r = await checkExceptionNamingRule(
        svcFor([exc]),
        topLevelClass(exc, 'MyException'),
        'Oops',
      );
      expect(r?.error.code).toBe(-32602);
      expect(r?.error.message).toContain("must end in 'Exception'");
    });

    it('allows renaming an Exception subclass to another *Exception name', async () => {
      const r = await checkExceptionNamingRule(
        svcFor([exc]),
        topLevelClass(exc, 'MyException'),
        'OtherEXCEPTION',
      );
      expect(r).toBeNull();
    });

    it('rejects renaming a non-Exception class to an *Exception name', async () => {
      const r = await checkExceptionNamingRule(
        svcFor([plain]),
        topLevelClass(plain, 'Plain'),
        'PlainException',
      );
      expect(r?.error.code).toBe(-32602);
      expect(r?.error.message).toContain("cannot end in 'Exception'");
    });

    it('allows renaming a non-Exception class to an ordinary name', async () => {
      const r = await checkExceptionNamingRule(
        svcFor([plain]),
        topLevelClass(plain, 'Plain'),
        'Other',
      );
      expect(r).toBeNull();
    });

    it('follows the superclass chain transitively', async () => {
      const base = parse(
        'public virtual class BaseException extends Exception {}',
        'file:///src/BaseException.cls',
      );
      const child = parse(
        'public class ChildException extends BaseException {}',
        'file:///src/ChildException.cls',
      );
      const svc = svcFor([base, child]);
      const sym = topLevelClass(child, 'ChildException');
      expect(
        (await checkExceptionNamingRule(svc, sym, 'Child'))?.error.code,
      ).toBe(-32602);
      expect(
        await checkExceptionNamingRule(svc, sym, 'KidException'),
      ).toBeNull();
    });

    it('declines when the superclass cannot be resolved', async () => {
      const orphan = parse(
        'public class Orphan extends Missing {}',
        'file:///src/Orphan.cls',
      );
      const r = await checkExceptionNamingRule(
        svcFor([orphan]),
        topLevelClass(orphan, 'Orphan'),
        'Renamed',
      );
      expect(r?.error.code).toBe(-32600);
    });

    it('does not apply to interfaces or enums', async () => {
      const e = parse('public enum Color { RED }', 'file:///src/Color.cls');
      const sym = e.getAllSymbols().find((s) => s.name === 'Color')!;
      expect(
        await checkExceptionNamingRule(svcFor([e]), sym, 'ColorException'),
      ).toBeNull();
    });
  });

  describe('checkTypeNameConflict', () => {
    const portReturning = (response: unknown) =>
      ({ transport: vi.fn().mockResolvedValue(response) }) as never;
    const other = parse('public class Other {}', 'file:///src/Other.cls');
    const symbols = other.getAllSymbols();

    it('rejects a name held by another top-level type, case-insensitively', async () => {
      const r = await checkTypeNameConflict(
        portReturning({
          matches: [
            { name: 'Other', fileUri: 'file:///src/Other.cls', kind: 'class' },
          ],
          entries: { 'file:///src/Other.cls': { symbols } },
        }),
        'Foo',
        'file:///src/Foo.cls',
        'OTHER',
      );
      expect(r?.error.code).toBe(-32600);
      expect(r?.error.message).toContain('already exists');
    });

    it('ignores the declaring file (case-only rename)', async () => {
      const r = await checkTypeNameConflict(
        portReturning({
          matches: [
            { name: 'Foo', fileUri: 'file:///src/Foo.cls', kind: 'class' },
          ],
          entries: {},
        }),
        'Foo',
        'file:///src/Foo.cls',
        'foo',
      );
      expect(r).toBeNull();
    });

    it('ignores a nested type or non-type symbol with the same name', async () => {
      const holder = parse(
        'public class Holder {\n  public class Inner {}\n  public Integer val;\n}',
        'file:///src/Holder.cls',
      );
      const hs = holder.getAllSymbols();
      for (const [name, kind] of [
        ['Inner', 'class'],
        ['val', 'field'],
      ]) {
        const r = await checkTypeNameConflict(
          portReturning({
            matches: [{ name, fileUri: 'file:///src/Holder.cls', kind }],
            entries: { 'file:///src/Holder.cls': { symbols: hs } },
          }),
          'Foo',
          'file:///src/Foo.cls',
          name,
        );
        expect(r).toBeNull();
      }
    });

    it('allows a free name', async () => {
      const r = await checkTypeNameConflict(
        portReturning({ matches: [], entries: {} }),
        'Foo',
        'file:///src/Foo.cls',
        'Free',
      );
      expect(r).toBeNull();
    });

    it('declines when the data-owner query fails', async () => {
      const r = await checkTypeNameConflict(
        { transport: vi.fn().mockRejectedValue(new Error('down')) } as never,
        'Foo',
        'file:///src/Foo.cls',
        'Free',
      );
      expect(r?.error.code).toBe(-32600);
    });
  });

  describe('canBeRenamed', () => {
    it('rejects stdlib and generated-SObject declarations', () => {
      expect(canBeRenamed({ fileUri: 'apexlib://x/String.cls' } as never)).toBe(
        false,
      );
      expect(
        canBeRenamed({ fileUri: 'apex-sobject://x/Account.cls' } as never),
      ).toBe(false);
    });

    it('accepts user-owned and URI-less (local) declarations', () => {
      expect(canBeRenamed({ fileUri: 'file:///src/Foo.cls' } as never)).toBe(
        true,
      );
      expect(canBeRenamed({} as never)).toBe(true);
    });
  });
});
