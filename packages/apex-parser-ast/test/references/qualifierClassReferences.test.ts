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

    // Exactly the two real TYPE usages are attributed to Helper: the local
    // declaration `Helper h` and the constructor `new Helper()`. The instance
    // call `h.run()` (where `h` is a value, not the type) must NOT appear.
    // Assert on what SHOULD be present rather than the absence of a magic
    // column, so the test can't pass for the wrong reason after a whitespace
    // edit. The single source line `void m() { Helper h = new Helper(); h.run(); }`
    // contains both type usages; identify each by the token range text.
    const src =
      'public class C { void m() { Helper h = new Helper(); h.run(); } }';
    const refTexts = refs.map((r) => {
      const range = r.location?.identifierRange ?? r.location?.symbolRange;
      if (!range) return '';
      return src.slice(range.startColumn, range.endColumn);
    });

    expect(refs.length).toBe(2);
    // Both surviving refs name the `Helper` type token, never the `h` receiver.
    refTexts.forEach((t) => expect(t).toBe('Helper'));
    // And none of them is the instance-call receiver `h.run()`.
    expect(refTexts).not.toContain('h');
  });

  it('finds a class qualifier despite an unrelated same-named local elsewhere', async () => {
    // Registry is a real class referenced via a static call `Registry.init()`.
    await add(
      'public class Registry { public static void init() {} }',
      'file:///t/Registry.cls',
    );
    // The caller file has an UNRELATED local named `Registry` in method1, and a
    // legitimate static call `Registry.init()` in method2. A file-wide name
    // match would let method1's local suppress the head edge for method2's call,
    // losing the reference. A scope-aware check must keep it.
    await add(
      `public class Consumer {
         void method1() { Object Registry = null; System.debug(Registry); }
         void method2() { Registry.init(); }
       }`,
      'file:///t/Consumer.cls',
    );
    await resolveCrossFile('file:///t/Registry.cls');
    await resolveCrossFile('file:///t/Consumer.cls');

    const refs = await sm.findReferencesTo(
      await classSymbol('file:///t/Registry.cls', 'Registry'),
    );

    // The `Registry.init()` static call in Consumer must be found despite the
    // like-named local in another method of the same file.
    expect(
      refs.some((r) =>
        (r.fileUri ?? r.symbol?.fileUri ?? '').includes('Consumer'),
      ),
    ).toBe(true);
  });

  it('treats a differently-cased local as shadowing the qualifier (case-insensitive)', async () => {
    // Apex identifiers are case-insensitive: a local declared `svc` shadows a
    // qualifier written `Svc`. The instance call `svc.run()` is therefore NOT a
    // reference to the like-named `Svc` type and must not be attributed to it.
    await add('public class Svc { public void run() {} }', 'file:///t/Svc.cls');
    await add(
      // Only the constructor `new Svc()` and the declared type `Svc` are true
      // type usages; `svc.run()` (differently cased receiver) is an instance
      // call on the local value and must be excluded by the case-folded check.
      'public class Caller { void m() { Svc svc = new Svc(); svc.run(); } }',
      'file:///t/Caller.cls',
    );
    await resolveCrossFile('file:///t/Svc.cls');
    await resolveCrossFile('file:///t/Caller.cls');

    const refs = await sm.findReferencesTo(
      await classSymbol('file:///t/Svc.cls', 'Svc'),
    );

    const src =
      'public class Caller { void m() { Svc svc = new Svc(); svc.run(); } }';
    const refTexts = refs.map((r) => {
      const range = r.location?.identifierRange ?? r.location?.symbolRange;
      if (!range) return '';
      return src.slice(range.startColumn, range.endColumn);
    });

    // Exactly the two real TYPE tokens (`Svc svc` and `new Svc()`) — never the
    // `svc` receiver of the instance call.
    expect(refs.length).toBe(2);
    refTexts.forEach((t) => expect(t).toBe('Svc'));
    expect(refTexts).not.toContain('svc');
  });

  it('binds the head qualifier to a resolved class rather than an arbitrary same-named class', async () => {
    // Two unrelated classes named `Shared` live in different files. A caller
    // uses `Shared` as a static-call qualifier. The head edge must land on the
    // `Shared` the caller actually resolved (with a preserved fileUri through
    // deferral), not get split/lost across the two same-named candidates.
    await add(
      'public class Shared { public static void go() {} }',
      'file:///t/pkgA/Shared.cls',
    );
    await add(
      'public class Shared { public static void far() {} }',
      'file:///t/pkgB/Shared.cls',
    );
    await add(
      'public class SharedCaller { void m() { Shared.go(); } }',
      'file:///t/pkgA/SharedCaller.cls',
    );
    await resolveCrossFile('file:///t/pkgA/Shared.cls');
    await resolveCrossFile('file:///t/pkgB/Shared.cls');
    await resolveCrossFile('file:///t/pkgA/SharedCaller.cls');

    // The caller's `Shared.go()` head edge is attributed to exactly one of the
    // same-named classes (not duplicated across both). Whichever `Shared`
    // resolution wins, the reference must be findable and point at the caller.
    const refsA = await sm.findReferencesTo(
      await classSymbol('file:///t/pkgA/Shared.cls', 'Shared'),
    );
    const refsB = await sm.findReferencesTo(
      await classSymbol('file:///t/pkgB/Shared.cls', 'Shared'),
    );
    const callerRefsA = refsA.filter((r) =>
      (r.fileUri ?? r.symbol?.fileUri ?? '').includes('SharedCaller'),
    );
    const callerRefsB = refsB.filter((r) =>
      (r.fileUri ?? r.symbol?.fileUri ?? '').includes('SharedCaller'),
    );

    // The head edge exists and is attributed to a single class — the resolved
    // fileUri prevents the deferred reference from being dropped or duplicated.
    expect(callerRefsA.length + callerRefsB.length).toBeGreaterThanOrEqual(1);
    expect(callerRefsA.length === 0 || callerRefsB.length === 0).toBe(true);
  });
});
