/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * find-references on a CLASS used ONLY as a qualifier (W-23255936).
 *
 * When a class is referenced solely through dotted usages — `A.B`,
 * `new A.B()`, `A.method()`, `List<A.B>` — every reference is stored under its
 * compound name (`A.B`), which never matches the bare class symbol id. The
 * head segment `A` therefore had no reverse-index edge of its own, so
 * findReferencesTo(A) returned empty/wrong. This is the dreamhouse-lwc
 * `GeocodingService` shape: the class is named only as a qualifier, never as a
 * bare `A x` declaration or `new A()`.
 *
 * The fix attributes the head of a qualified reference to its declaring type
 * during cross-file graph construction (ApexSymbolManager.
 * addHeadQualifierReferenceEffect), adding a complementary `source → A` edge
 * alongside the existing `source → member` edge. It deliberately does NOT
 * attribute instance qualifiers (`obj.foo()` where `obj` is a variable) to a
 * like-named class.
 *
 * These tests use FullSymbolCollectorListener with
 * { collectReferences, resolveReferences } — the worker collection topology the
 * IDE runs — so a regression in the live path fails here.
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

describe('find-references on a class used only as a qualifier (W-23255936)', () => {
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

  const classSymbol = async (
    uri: string,
    name: string,
  ): Promise<ApexSymbol> => {
    const syms = await sm.findSymbolsInFile(uri);
    const cls = syms.find(
      (s) => s.name === name && s.kind === SymbolKind.Class,
    );
    if (!cls) throw new Error(`${name} class symbol not found in ${uri}`);
    return cls;
  };

  it('surfaces all qualifier shapes (dreamhouse GeocodingService)', async () => {
    // GeocodingService is referenced ONLY as a qualifier: inner-type decl,
    // `new A.Inner()`, `A.staticMethod()`, and `List<A.Inner>` type argument.
    await add(
      `public with sharing class GeocodingService {
         public static List<Coordinates> geocodeAddresses(List<GeocodingAddress> addresses) {
           return new List<Coordinates>();
         }
         public class GeocodingAddress { public String street; }
         public class Coordinates { public Decimal lat; }
       }`,
      'file:///t/GeocodingService.cls',
    );
    await add(
      `private with sharing class GeocodingServiceTest {
         static void t() {
           GeocodingService.GeocodingAddress address = new GeocodingService.GeocodingAddress();
           List<GeocodingService.Coordinates> c = GeocodingService.geocodeAddresses(
             new List<GeocodingService.GeocodingAddress>{ address });
         }
       }`,
      'file:///t/GeocodingServiceTest.cls',
    );
    await resolveCrossFile('file:///t/GeocodingService.cls');
    await resolveCrossFile('file:///t/GeocodingServiceTest.cls');

    const refs = await sm.findReferencesTo(
      await classSymbol('file:///t/GeocodingService.cls', 'GeocodingService'),
    );

    // Every reference is a qualifier usage in the test file. Before the fix
    // this was empty (compound names never matched the bare class id).
    expect(refs.length).toBeGreaterThanOrEqual(4);
    refs.forEach((r) => {
      expect(r.fileUri ?? r.symbol?.fileUri ?? '').toContain(
        'GeocodingServiceTest',
      );
    });
  });

  it('resolves a static-method qualifier (A.method()) to the class', async () => {
    await add(
      'public class Svc { public static void go() {} }',
      'file:///t/Svc.cls',
    );
    await add(
      'public class CallA { void m() { Svc.go(); } }',
      'file:///t/CallA.cls',
    );
    await resolveCrossFile('file:///t/Svc.cls');
    await resolveCrossFile('file:///t/CallA.cls');

    const refs = await sm.findReferencesTo(
      await classSymbol('file:///t/Svc.cls', 'Svc'),
    );
    expect(
      refs.some((r) =>
        (r.fileUri ?? r.symbol?.fileUri ?? '').includes('CallA'),
      ),
    ).toBe(true);
  });

  it('does NOT attribute an instance-call qualifier (obj.foo()) to a like-named class', async () => {
    await add(
      'public class Helper { public void run() {} }',
      'file:///t/Helper.cls',
    );
    // `h` is a local variable; `h.run()` is an instance call, not a reference
    // to the Helper type. Only the type decl and constructor should count.
    await add(
      'public class C { void m() { Helper h = new Helper(); h.run(); } }',
      'file:///t/C.cls',
    );
    await resolveCrossFile('file:///t/Helper.cls');
    await resolveCrossFile('file:///t/C.cls');

    const refs = await sm.findReferencesTo(
      await classSymbol('file:///t/Helper.cls', 'Helper'),
    );

    // The two type usages (`Helper h` and `new Helper()`) are found; the
    // instance call `h.run()` is not mis-attributed to Helper.
    const columns = refs
      .map((r) => r.location?.symbolRange?.startColumn)
      .sort((a, b) => (a ?? -1) - (b ?? -1));
    expect(refs.length).toBe(2);
    // `h.run()` starts at a later column than the ctor; assert it's absent by
    // confirming no ref begins at the instance-call receiver position.
    expect(columns).not.toContain(52);
  });
});
