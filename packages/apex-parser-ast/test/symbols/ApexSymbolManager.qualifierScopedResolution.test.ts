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
import {
  SymbolKind,
  type ApexSymbol,
  type SymbolTable,
} from '../../src/types/symbol';
import {
  resolveMemberInContext,
  resolveQualifiedReferenceFromChain,
} from '../../src/symbols/ops/chainResolution';
import { loadAndRegisterStdlibSymbolTable } from '../../src/symbols/ops/symbolRefResolution';
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

  it('does not fetch or re-register an already-installed stdlib table', async () => {
    const installed = {} as SymbolTable;
    const getSymbolTableForFile = jest.fn(() => installed);
    const fetchSymbolTable = jest.fn(async () => ({}) as SymbolTable);
    const addSymbolTableAsync = jest.fn(async () => undefined);
    const fakeOps = {
      symbolRefManager: { getSymbolTableForFile },
      stdlibProvider: { getSymbolTable: fetchSymbolTable },
      addSymbolTableAsync,
      inFlightStdlibHydration: new Map(),
    } as unknown as SymbolManagerOps;

    const result = await loadAndRegisterStdlibSymbolTable(
      fakeOps,
      'apexlib://resources/StandardApexLibrary/System/Map.cls',
      'System/Map.cls',
    );

    expect(result).toBe(installed);
    expect(fetchSymbolTable).not.toHaveBeenCalled();
    expect(addSymbolTableAsync).not.toHaveBeenCalled();
  });

  it('resolves a warmed Map keySet member without re-fetching stdlib tables', async () => {
    const uri = 'file:///test/CollectionHover.cls';
    const source = `public class CollectionHover {
  void run(Map<Id, String> values) {
    for (Id key : values.keySet()) {
    }
  }
}`;
    await compileAndAdd(source, uri);

    // Establish the same worker-local stdlib state seen after the first
    // collection hover, then observe only the member-resolution request.
    await symbolManager.resolveStandardApexClass('Map');
    await symbolManager.resolveStandardApexClass('List');
    await symbolManager.resolveStandardApexClass('Object');
    const provider = (symbolManager as any).stdlibProvider;
    const getSymbolTable = jest.spyOn(provider, 'getSymbolTable');
    getSymbolTable.mockClear();

    const lineText = source.split('\n')[2];
    const references = await symbolManager.getReferencesAtPosition(uri, {
      line: 3,
      character: lineText.indexOf('keySet') + 1,
    });
    const chainedReference = references.find(
      (reference: any) => reference.chainNodes?.length === 2,
    );
    const directResolution = await resolveQualifiedReferenceFromChain(
      ops(),
      'values',
      'keySet',
      ReferenceContext.METHOD_CALL,
      uri,
      undefined,
      chainedReference,
      (symbolManager as any).symbolRefManager.getSymbolTableForFile(uri),
    );
    expect((directResolution as any)?.returnType?.originalTypeString).toBe(
      'Set<Id>',
    );
    const resolved = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: lineText.indexOf('keySet') + 1 },
      'precise',
    );

    expect(resolved?.kind).toBe(SymbolKind.Method);
    expect(resolved?.name.toLowerCase()).toBe('keyset');
    expect((resolved as any)?.returnType?.typeParameters?.[0]?.name).toBe('Id');
    expect((resolved as any)?.returnType?.originalTypeString).toBe('Set<Id>');
    expect(getSymbolTable).not.toHaveBeenCalled();
  });

  it('specializes Map value-returning methods from the receiver type', async () => {
    const uri = 'file:///test/MapValueHover.cls';
    const source = `public class MapValueHover {
  void run(Map<Id, Account> values) {
    Account value = values.get(null);
    List<Account> allValues = values.values();
  }
}`;
    await compileAndAdd(source, uri);
    await symbolManager.resolveStandardApexClass('Map');

    const lines = source.split('\n');
    const getSymbol = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: lines[2].indexOf('get') + 1 },
      'precise',
    );
    const valuesSymbol = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 4, character: lines[3].lastIndexOf('values') + 1 },
      'precise',
    );

    expect((getSymbol as any)?.returnType?.name).toBe('Account');
    expect((valuesSymbol as any)?.returnType?.originalTypeString).toBe(
      'List<Account>',
    );
  });

  it('resolves the base and generic argument of a collection cast separately', async () => {
    const uri = 'file:///test/CollectionCastHover.cls';
    const source = `public class CollectionCastHover {
  void run(Object input) {
    List<String> values = (List<String>) input;
  }
}`;
    await compileAndAdd(source, uri);

    const castLine = source.split('\n')[2];
    const castStart = castLine.indexOf('(List<String>)') + 1;
    const stringStart = castLine.indexOf('String', castStart);
    const castRefs = await symbolManager.getReferencesAtPosition(uri, {
      line: 3,
      character: castStart + 1,
    });
    const genericRefs = await symbolManager.getReferencesAtPosition(uri, {
      line: 3,
      character: stringStart + 1,
    });

    expect(castRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'List',
          context: ReferenceContext.CAST_TYPE_REFERENCE,
        }),
      ]),
    );
    expect(castRefs.some((ref) => ref.name === 'List<String>')).toBe(false);
    expect(genericRefs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'String',
          context: ReferenceContext.GENERIC_PARAMETER_TYPE,
        }),
      ]),
    );

    const listSymbol = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: castStart + 1 },
      'precise',
    );
    const stringSymbol = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: stringStart + 1 },
      'precise',
    );

    expect(listSymbol?.kind).toBe(SymbolKind.Class);
    expect(listSymbol?.name).toBe('List');
    expect(stringSymbol?.kind).toBe(SymbolKind.Class);
    expect(stringSymbol?.name).toBe('String');
  });

  it('resolves a declaration type token before its variable symbol', async () => {
    const uri = 'file:///test/DeclarationTypeHover.cls';
    const source = `public class DeclarationTypeHover {
  void run() {
    Http http = new Http();
  }
}`;
    await compileAndAdd(source, uri);

    const declarationLine = source.split('\n')[2];
    const resolved = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: declarationLine.indexOf('Http') + 1 },
      'precise',
    );

    expect(resolved?.kind).toBe(SymbolKind.Class);
    expect(resolved?.name).toBe('Http');
  });

  it('resolves an explicitly typed enhanced-for variable as that variable', async () => {
    const uri = 'file:///test/EnhancedForHover.cls';
    const source = `public class EnhancedForHover {
  void run(Map<Id, String> values) {
    for (Id recordTypeId : values.keySet()) {
      String copy = recordTypeId;
    }
  }
}`;
    await compileAndAdd(source, uri);

    const symbols = await symbolManager.findSymbolsInFile(uri);
    const loopVariable = symbols.find(
      (symbol) =>
        symbol.kind === SymbolKind.Variable && symbol.name === 'recordTypeId',
    ) as any;
    expect(loopVariable).toBeDefined();
    expect(loopVariable.type?.name).toBe('Id');

    const declarationLine = source.split('\n')[2];
    const declarationStart = declarationLine.indexOf('recordTypeId');
    const resolved = await symbolManager.getSymbolAtPosition(
      uri,
      { line: 3, character: declarationStart + 1 },
      'precise',
    );

    expect(resolved?.kind).toBe(SymbolKind.Variable);
    expect(resolved?.name).toBe('recordTypeId');
    expect((resolved as any)?.type?.name).toBe('Id');
  });

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
