/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * find-references on a member reached through a qualifier (`A.b()`, `A.B`) must
 * attribute the reference to the LEAF token only, not the whole `A.b` span.
 *
 * Background: a chained reference carries `location` spanning the entire dotted
 * expression, but the graph edge it produces targets the leaf member. Before the
 * fix that edge was stored with the full-span location, so find-references on the
 * member returned TWO hits per call site — one covering just the member and one
 * covering `Qualifier.member` — and the qualifier text was wrongly highlighted as
 * a reference to the member. The member edge is now pinned to the leaf chain
 * node's location (mirroring how the head qualifier gets its own type edge), so a
 * single call site yields exactly one member reference.
 *
 * Uses the dreamhouse GeocodingService.geocodeAddresses shape: three call sites
 * in the test class, each written `GeocodingService.geocodeAddresses(...)`.
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

const SVC = `public with sharing class GeocodingService {
    public static List<Coordinates> geocodeAddresses(List<GeocodingAddress> addresses) {
        return new List<Coordinates>();
    }
    public class GeocodingAddress { public String street; }
    public class Coordinates { public Decimal lat; }
}`;

const TEST = `@isTest
private with sharing class GeocodingServiceTest {
    @isTest
    static void a() {
        List<GeocodingService.Coordinates> c = GeocodingService.geocodeAddresses(
            new List<GeocodingService.GeocodingAddress>{});
    }
    @isTest
    static void b() {
        List<GeocodingService.Coordinates> c = GeocodingService.geocodeAddresses(
            new List<GeocodingService.GeocodingAddress>{});
    }
    @isTest
    static void d() {
        List<GeocodingService.Coordinates> c = GeocodingService.geocodeAddresses(
            new List<GeocodingService.GeocodingAddress>{});
    }
}`;

const svcUri = 'file:///t/GeocodingService.cls';
const testUri = 'file:///t/GeocodingServiceTest.cls';

describe('qualified call leaf attribution (A.member() -> member)', () => {
  let sm: ApexSymbolManager;

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
    if (!m) throw new Error(`${name} not found in ${uri}`);
    return m;
  };

  beforeEach(async () => {
    sm = new ApexSymbolManager();
    await add(SVC, svcUri);
    await add(TEST, testUri);
    await resolveCrossFile(svcUri);
    await resolveCrossFile(testUri);
  });

  it('returns exactly one reference per call site (leaf only)', async () => {
    const method = await methodSymbol(svcUri, 'geocodeAddresses');
    const refs = await sm.findReferencesTo(method);

    // Three call sites, one reference each — not six (qualifier + leaf).
    expect(refs.length).toBe(3);

    // Every reference must be the METHOD name token, never the qualifier or the
    // whole `GeocodingService.geocodeAddresses` span. The leaf token width is
    // exactly the method name length; the full-span (qualifier + '.' + method)
    // would be much wider.
    for (const ref of refs) {
      const ir = ref.location?.identifierRange;
      expect(ir).toBeDefined();
      const width = ir!.endColumn - ir!.startColumn;
      expect(width).toBe('geocodeAddresses'.length);
    }
  });

  it('does not attribute the qualifier type token to the method', async () => {
    const method = await methodSymbol(svcUri, 'geocodeAddresses');
    const refs = await sm.findReferencesTo(method);

    // No reference span may cover the 16-char `GeocodingService` qualifier: the
    // leaf `geocodeAddresses` token width is what each reference should have.
    for (const ref of refs) {
      const ir = ref.location!.identifierRange!;
      const width = ir.endColumn - ir.startColumn;
      expect(width).toBe('geocodeAddresses'.length);
    }
  });
});
