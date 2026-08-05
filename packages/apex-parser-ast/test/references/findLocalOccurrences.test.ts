/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService } from '../../src/parser/compilerService';
import { FullSymbolCollectorListener } from '../../src/parser/listeners/FullSymbolCollectorListener';
import { SymbolTable } from '../../src/types/symbol';
import { findLocalOccurrences } from '../../src/symbols/ops/findLocalOccurrences';

/** Parse Apex source into its own full-detail SymbolTable (no shared graph). */
const parse = (code: string, uri: string): SymbolTable => {
  const table = new SymbolTable();
  new CompilerService().compile(
    code,
    uri,
    new FullSymbolCollectorListener(table),
    { collectReferences: true, resolveReferences: true },
  );
  return table;
};

/** Compact "line:col" list of returned identifier ranges, for readable asserts. */
const starts = (
  ranges: { startLine: number; startColumn: number }[],
): string[] =>
  ranges
    .map((r) => `${r.startLine}:${r.startColumn}`)
    .sort((a, b) => a.localeCompare(b));

describe('findLocalOccurrences (scope-aware renameLocal binding, W-23631077)', () => {
  it('binds a local from a usage cursor: declaration + every usage, one file', () => {
    const uri = 'file:///t/Local.cls';
    // `total` declared line 3, used lines 4 and 5.
    const code = [
      'public class Local {', //                                    line 1
      '  void go() {', //                                           line 2
      '    Integer total = 0;', //          decl ident col 12       line 3
      '    total = total + 1;', //          usages col 4 and col 12 line 4
      '    System.debug(total);', //        usage col 17            line 5
      '  }', //                                                     line 6
      '}', //                                                       line 7
    ].join('\n');

    // Cursor on the `total` usage in `System.debug(total)` (line 5, 1-based; col 17).
    const result = findLocalOccurrences(parse(code, uri), uri, {
      line: 5,
      character: 17,
    });

    expect(result).not.toBeNull();
    expect(result!.declaration.name).toBe('total');
    // Declaration (3:12) + three usage tokens (4:4, 4:12, 5:17).
    expect(starts(result!.identifierRanges)).toEqual([
      '3:12',
      '4:12',
      '4:4',
      '5:17',
    ]);
    // Declaration is always first.
    expect(result!.identifierRanges[0]).toMatchObject({
      startLine: 3,
      startColumn: 12,
    });
  });

  it('binds from the declaration cursor itself', () => {
    const uri = 'file:///t/DeclCursor.cls';
    const code = [
      'public class DeclCursor {',
      '  void go() {',
      '    Integer count = 0;', //   decl ident at line 3, col 12
      '    count++;', //            usage at line 4, col 4
      '  }',
      '}',
    ].join('\n');

    // Cursor ON the declaration identifier `count` (line 3, col 12).
    const result = findLocalOccurrences(parse(code, uri), uri, {
      line: 3,
      character: 14,
    });

    expect(result).not.toBeNull();
    expect(result!.declaration.name).toBe('count');
    expect(starts(result!.identifierRanges)).toEqual(['3:12', '4:4']);
  });

  it('does NOT rename a same-named local in a sibling block (shadowing safety)', () => {
    const uri = 'file:///t/Sibling.cls';
    // Two independent `x` locals in sibling methods. Renaming the one in a()
    // must not touch the one in b().
    const code = [
      'public class Sibling {', //                    line 1
      '  void a() {', //                              line 2
      '    Integer x = 1;', //   a.x decl  line 3, col 12
      '    x = x + 1;', //       a.x usage line 4
      '  }', //                                       line 5
      '  void b() {', //                              line 6
      '    Integer x = 2;', //   b.x decl  line 7
      '    x = x + 2;', //       b.x usage line 8
      '  }', //                                       line 9
      '}', //                                         line 10
    ].join('\n');

    // Cursor on a()'s `x` (line 4).
    const result = findLocalOccurrences(parse(code, uri), uri, {
      line: 4,
      character: 4,
    });

    expect(result).not.toBeNull();
    // Only a()'s three tokens (3:12, 4:4, 4:8) — none of b()'s (lines 7-8).
    const lines = result!.identifierRanges.map((r) => r.startLine).sort();
    expect(lines.every((l) => l <= 5)).toBe(true);
    expect(result!.identifierRanges.some((r) => r.startLine >= 7)).toBe(false);
  });

  it('binds the INNER local when an inner block shadows an outer one', () => {
    const uri = 'file:///t/Shadow.cls';
    // Outer `v` at line 3; inner block redeclares `v` at line 5 and uses it at 6.
    const code = [
      'public class Shadow {', //                 line 1
      '  void go() {', //                         line 2
      '    Integer v = 1;', //   outer v line 3
      '    if (true) {', //                       line 4
      '      Integer v = 2;', // inner v line 5, col 14
      '      v = v + 1;', //     inner usage line 6
      '    }', //                                 line 7
      '  }', //                                   line 8
      '}', //                                     line 9
    ].join('\n');

    // Cursor on the inner `v` usage (line 6, col 6).
    const result = findLocalOccurrences(parse(code, uri), uri, {
      line: 6,
      character: 6,
    });

    expect(result).not.toBeNull();
    // Inner declaration (5:14) + its two usages on line 6 — NOT the outer decl (3:12).
    expect(result!.identifierRanges.some((r) => r.startLine === 3)).toBe(false);
    expect(result!.identifierRanges.some((r) => r.startLine === 5)).toBe(true);
    expect(
      result!.identifierRanges.filter((r) => r.startLine === 6).length,
    ).toBe(2);
  });

  it('binds a method parameter across its body', () => {
    const uri = 'file:///t/Param.cls';
    const code = [
      'public class Param {', //                     line 1
      '  void go(Integer amount) {', // param `amount` line 2
      '    Integer y = amount * 2;', // usage line 3
      '    System.debug(amount);', //   usage line 4
      '  }',
      '}',
    ].join('\n');

    // Cursor on `amount` usage line 3.
    const result = findLocalOccurrences(parse(code, uri), uri, {
      line: 3,
      character: 16,
    });

    expect(result).not.toBeNull();
    expect(result!.declaration.name).toBe('amount');
    // param decl + two usages (lines 2, 3, 4).
    const declLines = result!.identifierRanges.map((r) => r.startLine).sort();
    expect(declLines).toContain(2);
    expect(declLines).toContain(3);
    expect(declLines).toContain(4);
  });

  it('returns null when the cursor is on a field, not a local', () => {
    const uri = 'file:///t/FieldCursor.cls';
    const code = [
      'public class FieldCursor {',
      '  Integer count;', //     field decl line 2
      '  void go() {',
      '    count = 1;', //       field usage line 4
      '  }',
      '}',
    ].join('\n');

    // Cursor on the field usage `count` (line 4) — a field is class-scoped and
    // belongs to renameField, not renameLocal.
    const result = findLocalOccurrences(parse(code, uri), uri, {
      line: 4,
      character: 4,
    });

    expect(result).toBeNull();
  });

  it('returns null when the cursor resolves to no local (empty / whitespace)', () => {
    const uri = 'file:///t/Empty.cls';
    const code = ['public class Empty {', '  void go() {}', '}'].join('\n');

    const result = findLocalOccurrences(parse(code, uri), uri, {
      line: 2,
      character: 0,
    });

    expect(result).toBeNull();
  });
});
