/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Re-adding a file's SymbolTable (the layered-enrichment write-back) must not
 * permanently drop the file's already-resolved cross-file references.
 *
 * Background: addSymbolTable calls clearReferenceStateForFile, which removes the
 * file's outgoing cross-file edges, then rebuilds only SAME-file edges. A
 * fire-and-forget documentOpen enrichment re-adds the table a few seconds after
 * open, so a file whose cross-file refs were resolved on the first hover/
 * find-references request would be silently downgraded to unresolved — hover and
 * find-references work for a few seconds and then return null/empty until the
 * next edit. addSymbolTable now re-resolves the file's cross-file references
 * after any clearing re-add (not just supertype edges), so the resolved state
 * survives the write-back. This test reproduces the dreamhouse
 * GeocodingService.geocodeAddresses shape and asserts references survive a
 * re-add WITHOUT an explicit resolveCrossFileReferencesForFile call afterward.
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

describe('re-add preserves cross-file resolution (enrichment write-back)', () => {
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
      { collectReferences: true, resolveReferences: true },
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

  const methodSymbol = async (
    uri: string,
    name: string,
  ): Promise<ApexSymbol> => {
    const syms = await sm.findSymbolsInFile(uri);
    const m = syms.find((s) => s.name === name && s.kind === SymbolKind.Method);
    if (!m) throw new Error(`${name} method symbol not found in ${uri}`);
    return m;
  };

  const svcSrc = `public with sharing class GeocodingService {
       public static List<Coordinates> geocodeAddresses(List<GeocodingAddress> addresses) {
         return new List<Coordinates>();
       }
       public class GeocodingAddress { public String street; }
       public class Coordinates { public Decimal lat; }
     }`;
  const testSrc = `private with sharing class GeocodingServiceTest {
       static void t() {
         List<GeocodingService.Coordinates> c = GeocodingService.geocodeAddresses(
           new List<GeocodingService.GeocodingAddress>{});
       }
     }`;
  const svcUri = 'file:///t/GeocodingService.cls';
  const testUri = 'file:///t/GeocodingServiceTest.cls';

  it('keeps method references after the source file is re-added', async () => {
    await add(svcSrc, svcUri);
    await add(testSrc, testUri);
    // First request path: cross-file resolution runs and edges are built.
    await resolveCrossFile(svcUri);
    await resolveCrossFile(testUri);

    const before = await sm.findReferencesTo(
      await methodSymbol(svcUri, 'geocodeAddresses'),
    );
    expect(before.length).toBeGreaterThanOrEqual(1);

    // Enrichment write-back: re-add the TEST file's table (the file that holds
    // the call site). This clears its outgoing cross-file edges. Before the fix
    // those edges were rebuilt as same-file-only and never re-resolved, so the
    // method below lost its references. The fix re-resolves after the clear.
    await add(testSrc, testUri);

    // No explicit resolveCrossFile here — the data layer must self-heal.
    const after = await sm.findReferencesTo(
      await methodSymbol(svcUri, 'geocodeAddresses'),
    );
    expect(after.length).toBe(before.length);
  });
});
