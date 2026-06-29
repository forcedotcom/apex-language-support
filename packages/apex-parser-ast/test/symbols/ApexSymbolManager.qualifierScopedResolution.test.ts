/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * F11-3 regression guard: qualifier-scoped member resolution.
 *
 * For a qualified access `Qualifier.member`, the member MUST be declared on the
 * qualifier's type (or its supertype / Object / stdlib chain). The original
 * F11-3 concern was that, when the leaf is NOT a member of the qualifier,
 * resolution could fall back to an unconstrained `findSymbolByName(member)` and
 * return the FIRST same-named symbol from an unrelated class — a wrong result.
 *
 * That leak is NOT reproducible in the current resolver: `resolveMemberInContext`
 * resolves a member strictly within the qualifier type's own scope (and its
 * superclass / Object / stdlib chain) and returns null when the member is absent
 * — it never falls through to a global same-named symbol for a concrete-type
 * qualifier. The chained entry point (`resolveQualifiedReferenceFromChain`)
 * likewise never returns an unrelated class's member.
 *
 * These tests lock that behavior in so a future change to the member-resolution
 * fallback cannot silently reintroduce the cross-class mis-resolve. They assert
 * on the resolver ops directly (the same calls ApexSymbolManager makes once a
 * qualifier is resolved), since the positional getSymbolAtPosition path layers
 * additional fallbacks on top.
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { SymbolKind, type ApexSymbol } from '../../src/types/symbol';
import {
  resolveMemberInContext,
  resolveQualifiedReferenceFromChain,
} from '../../src/symbols/ops/chainResolution';
import type { SymbolManagerOps } from '../../src/symbols/services/symbolResolver';
import { ReferenceContext } from '../../src/types/symbolReference';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import {
  initializeResourceLoaderForTests,
  getResourceLoaderServiceShapeFromSingleton,
  resetResourceLoader,
} from '../helpers/testHelpers';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('qualifier-scoped member resolution (F11-3 regression guard)', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeAll(async () => {
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
    await initializeResourceLoaderForTests();
  });

  beforeEach(() => {
    symbolManager = new ApexSymbolManager(
      getResourceLoaderServiceShapeFromSingleton(),
    );
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(async () => {
    await symbolManager.clear();
  });

  afterAll(async () => {
    try {
      await Effect.runPromise(schedulerShutdown());
    } catch {
      /* not initialized */
    }
    try {
      await Effect.runPromise(schedulerReset());
    } catch {
      /* not initialized */
    }
    resetResourceLoader();
  });

  const compileAndAdd = async (apexCode: string, fileUri: string) => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const result = compilerService.compile(apexCode, fileUri, listener);
    if (result.result) {
      await Effect.runPromise(
        symbolManager.addSymbolTable(result.result, fileUri),
      );
    }
  };

  const classSymbol = async (
    fileUri: string,
    name: string,
  ): Promise<ApexSymbol> => {
    const symbols = await symbolManager.findSymbolsInFile(fileUri);
    const cls = symbols.find(
      (s) => s.kind === SymbolKind.Class && s.name === name,
    );
    if (!cls) {
      throw new Error(`No class ${name} found in ${fileUri}`);
    }
    return cls;
  };

  const ops = (): SymbolManagerOps =>
    symbolManager as unknown as SymbolManagerOps;

  it('resolveMemberInContext does not leak a property to an unrelated class', async () => {
    // `Other` declares property `widget`; `Foo` declares no members. Resolving
    // `widget` in the context of the `Foo` type must NOT return Other.widget.
    const OTHER = 'file:///test/Other.cls';
    const FOO = 'file:///test/Foo.cls';

    await compileAndAdd(
      'public class Other { public String widget { get; set; } }',
      OTHER,
    );
    await compileAndAdd(
      'public class Foo { public String unrelated { get; set; } }',
      FOO,
    );

    const foo = await classSymbol(FOO, 'Foo');
    const resolved = await resolveMemberInContext(
      ops(),
      { type: 'symbol', symbol: foo },
      'widget',
      'property',
    );

    expect(resolved).toBeNull();
  });

  it('resolveMemberInContext does not leak a method to an unrelated class', async () => {
    const OTHER = 'file:///test/OtherM.cls';
    const FOO = 'file:///test/FooM.cls';

    await compileAndAdd(
      'public class OtherM { public void gizmo() {} }',
      OTHER,
    );
    await compileAndAdd(
      'public class FooM { public void unrelated() {} }',
      FOO,
    );

    const foo = await classSymbol(FOO, 'FooM');
    const resolved = await resolveMemberInContext(
      ops(),
      { type: 'symbol', symbol: foo },
      'gizmo',
      'method',
    );

    expect(resolved).toBeNull();
  });

  it('resolveMemberInContext still resolves a member that really is on the qualifier', async () => {
    const OTHER = 'file:///test/Other2.cls';
    const FOO = 'file:///test/Foo2.cls';

    await compileAndAdd(
      'public class Other2 { public String widget { get; set; } }',
      OTHER,
    );
    await compileAndAdd(
      'public class Foo2 { public String widget { get; set; } }',
      FOO,
    );

    const foo = await classSymbol(FOO, 'Foo2');
    const resolved = await resolveMemberInContext(
      ops(),
      { type: 'symbol', symbol: foo },
      'widget',
      'property',
    );

    expect(resolved).not.toBeNull();
    expect(resolved?.name).toBe('widget');
    expect(resolved?.fileUri).toBe(FOO);
  });

  it('resolveQualifiedReferenceFromChain does not return an unrelated class member', async () => {
    // gizmo() exists only on Helper; Foo has none. Resolving `Foo.gizmo()` from
    // a neutral third file must not return Helper.gizmo.
    const HELPER = 'file:///test/Helper3.cls';
    const FOO = 'file:///test/Foo3.cls';
    const CALLER = 'file:///test/Caller3.cls';

    await compileAndAdd(
      'public class Helper3 { public void gizmo() {} }',
      HELPER,
    );
    await compileAndAdd('public class Foo3 {}', FOO);
    await compileAndAdd(
      'public class Caller3 { void run() { Foo3.gizmo(); } }',
      CALLER,
    );

    const resolved = await resolveQualifiedReferenceFromChain(
      ops(),
      'Foo3',
      'gizmo',
      ReferenceContext.METHOD_CALL,
      CALLER,
    );

    // Must not resolve to Helper3's gizmo. (May be null or the Foo3 qualifier
    // itself, but never the unrelated class's member.)
    expect(resolved?.fileUri).not.toBe(HELPER);
    if (resolved) {
      expect(resolved.name).not.toBe('gizmo');
    }
  });
});
