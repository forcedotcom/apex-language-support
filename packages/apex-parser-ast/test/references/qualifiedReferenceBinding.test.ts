/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Cross-file binding for QUALIFIED type references (e.g. `Outer.Inner`).
 *
 * A qualified reference is stored under its full dotted name (`Outer.Inner`).
 * The cross-file binding pass (resolveCrossFileReferencesForFile →
 * processSymbolReferenceToGraphEffect) previously resolved a target only via
 * findSymbolByName, which is keyed on the LEAF segment and so never matched the
 * dotted name. The reference stayed unbound: no resolvedSymbolId, and — fatally
 * for find-references — no reverse-index edge, so findReferencesTo(Inner)
 * missed the qualified caller entirely.
 *
 * The fix resolves dotted names through the FQN index (which DOES key on the
 * dotted name) and binds the edge to the actual leaf symbol (Inner), not its
 * qualifier (Outer). These tests lock that in: they would fail with a 0-count /
 * unbound reference before the fix.
 *
 * This binding correctness is also what lets find-references' precise
 * position→symbol resolution succeed on a qualified usage WITHOUT a by-name
 * fallback (the resolvedSymbolId is now set), so the worker path no longer
 * needs to guess by name.
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { FullSymbolCollectorListener } from '../../src/parser/listeners/FullSymbolCollectorListener';
import {
  SymbolKind,
  SymbolTable,
  type ApexSymbol,
} from '../../src/types/symbol';
import { Effect } from 'effect';

describe('qualified cross-file reference binding', () => {
  let sm: ApexSymbolManager;

  beforeEach(() => {
    sm = new ApexSymbolManager();
  });

  const add = async (code: string, uri: string): Promise<void> => {
    const table = new SymbolTable();
    new CompilerService().compile(
      code,
      uri,
      new FullSymbolCollectorListener(table),
      {
        collectReferences: true,
        resolveReferences: true,
      },
    );
    await Effect.runPromise(sm.addSymbolTable(table, uri));
  };

  const resolveCrossFile = async (uri: string): Promise<void> => {
    await Effect.runPromise(
      (
        sm as unknown as {
          resolveCrossFileReferencesForFile: (
            u: string,
          ) => Effect.Effect<void, never, never>;
        }
      ).resolveCrossFileReferencesForFile(uri),
    );
  };

  const innerClassSymbol = async (): Promise<ApexSymbol> => {
    const syms = await sm.findSymbolsInFile('file:///t/Outer.cls');
    const inner = syms.find(
      (s) => s.name === 'Inner' && s.kind === SymbolKind.Class,
    );
    if (!inner) throw new Error('Inner class symbol not found');
    return inner;
  };

  it('findReferencesTo(Inner) surfaces a cross-file `Outer.Inner` caller', async () => {
    await add(
      'public class Outer { public class Inner { public Inner() {} } }',
      'file:///t/Outer.cls',
    );
    await add(
      'public class CallerD { void m() { Outer.Inner x = new Outer.Inner(); } }',
      'file:///t/CallerD.cls',
    );
    await resolveCrossFile('file:///t/Outer.cls');
    await resolveCrossFile('file:///t/CallerD.cls');

    const refs = await sm.findReferencesTo(await innerClassSymbol());

    expect(refs.length).toBeGreaterThanOrEqual(1);
    const callerHit = refs.find((r) =>
      (r.fileUri ?? r.symbol?.fileUri ?? '').includes('CallerD'),
    );
    expect(callerHit).toBeDefined();
  });

  it('precise position resolution lands on Inner for a qualified usage', async () => {
    await add(
      'public class Outer { public class Inner { public static void go() {} } }',
      'file:///t/Outer.cls',
    );
    await add(
      'public class CallerC { void m() { Outer.Inner x = new Outer.Inner(); } }',
      'file:///t/CallerC.cls',
    );
    await resolveCrossFile('file:///t/Outer.cls');
    await resolveCrossFile('file:///t/CallerC.cls');

    // Cursor on the `Inner` segment of `Outer.Inner` (1-based parser line).
    const symbol = await sm.getSymbolAtPosition(
      'file:///t/CallerC.cls',
      { line: 1, character: 41 },
      'precise',
    );

    expect(symbol).not.toBeNull();
    expect((symbol as ApexSymbol).name).toBe('Inner');
    expect((symbol as ApexSymbol).fileUri).toContain('Outer.cls');
  });
});
