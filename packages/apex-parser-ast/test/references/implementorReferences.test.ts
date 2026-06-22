/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * W-23006798 Phase 1: implements/extends produce reverse-reference graph edges.
 *
 * Before this change, `implements`/`extends` were stored only as string arrays
 * on the type symbol and emitted as generic TYPE_REFERENCE, so
 * findReferencesTo(interface) could not return implementors. The parser now
 * tags these sites INTERFACE_IMPLEMENTATION / INHERITANCE, which the resolver
 * maps to ReferenceType.INTERFACE_IMPLEMENTATION / INHERITANCE edges in the
 * reverse index. This is the basis for go-to-implementation discovering
 * implementors that live in (cross-file) unopened files.
 */

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { ReferenceType } from '../../src/symbols/ApexSymbolRefManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { VisibilitySymbolListener } from '../../src/parser/listeners/VisibilitySymbolListener';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import { SymbolKind, type ApexSymbol } from '../../src/types/symbol';
import { SymbolTable } from '../../src/types/symbol';
import { ReferenceContext } from '../../src/types/symbolReference';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('implementor reverse references (W-23006798 Phase 1)', () => {
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
  });

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  const compileAndAdd = async (apexCode: string, fileUri: string) => {
    const listener = new ApexSymbolCollectorListener();
    const result = compilerService.compile(apexCode, fileUri, listener);
    if (result.result) {
      await Effect.runPromise(
        symbolManager.addSymbolTable(result.result, fileUri),
      );
    }
    return result;
  };

  /**
   * Trigger on-demand cross-file reference resolution for a file. Cross-file
   * edges are resolved lazily (not during addSymbolTable, to avoid workspace-
   * load queue pressure); a feature like find-references / go-to-implementation
   * triggers this. The enrichment worker does the equivalent before searching.
   */
  const resolveCrossFile = async (fileUri: string) => {
    await Effect.runPromise(
      (
        symbolManager as unknown as {
          resolveCrossFileReferencesForFile: (
            uri: string,
          ) => Effect.Effect<void, never, never>;
        }
      ).resolveCrossFileReferencesForFile(fileUri),
    );
  };

  /** The top-level type symbol declared in a file (class or interface). */
  const topLevelType = async (fileUri: string): Promise<ApexSymbol> => {
    const symbols = await symbolManager.findSymbolsInFile(fileUri);
    const type = symbols.find(
      (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
    );
    if (!type) {
      throw new Error(`No type symbol found in ${fileUri}`);
    }
    return type;
  };

  it('findReferencesTo(interface) returns a class that implements it', async () => {
    const IFACE = 'file:///test/IAnimal.cls';
    const IMPL = 'file:///test/Dog.cls';

    await compileAndAdd('public interface IAnimal { void speak(); }', IFACE);
    await compileAndAdd(
      'public class Dog implements IAnimal { public void speak() {} }',
      IMPL,
    );
    await resolveCrossFile(IMPL);

    const iface = await topLevelType(IFACE);
    const refs = await symbolManager.findReferencesTo(iface);

    const implRef = refs.find((r) => r.fileUri === IMPL);
    expect(implRef).toBeDefined();
    expect(implRef!.referenceType).toBe(ReferenceType.INTERFACE_IMPLEMENTATION);
  });

  // Regression for the live go-to-implementation bug: in the worker topology the
  // data-owner never calls resolveCrossFileReferencesForFile on a freshly
  // batch-compiled implementor, so its implements edge stayed unresolved and
  // findReferencesTo(interface) returned nothing (go-to-implementation empty
  // even after a full workspace load). addSymbolTable now eagerly resolves a
  // newly-added file's SUPERTYPE edges (extends/implements) — and ONLY those,
  // to keep the workspace-load hot path cheap — so implementor discovery works
  // WITHOUT an explicit resolveCrossFile call. This mirrors the live ordering:
  // the interface is added first (cold open), the implementor second (batch).
  it('findReferencesTo(interface) finds a later implementor without an explicit cross-file resolve', async () => {
    const IFACE = 'file:///test/IAuto.cls';
    const IMPL = 'file:///test/AutoImpl.cls';

    // Interface first (target already in the graph), implementor second.
    await compileAndAdd('public interface IAuto { String go(); }', IFACE);
    await compileAndAdd(
      'public class AutoImpl implements IAuto { public String go() { return null; } }',
      IMPL,
    );
    // NOTE: deliberately NO resolveCrossFile(IMPL) — addSymbolTable must have
    // resolved the implements edge on its own.

    const iface = await topLevelType(IFACE);
    const refs = await symbolManager.findReferencesTo(iface);

    const implRef = refs.find((r) => r.fileUri === IMPL);
    expect(implRef).toBeDefined();
    expect(implRef!.referenceType).toBe(ReferenceType.INTERFACE_IMPLEMENTATION);
  });

  it('findReferencesTo(superclass) finds a subclass added later WITHOUT an explicit cross-file resolve', async () => {
    const BASE = 'file:///test/AutoBase.cls';
    const SUB = 'file:///test/AutoSub.cls';

    await compileAndAdd('public virtual class AutoBase {}', BASE);
    await compileAndAdd('public class AutoSub extends AutoBase {}', SUB);
    // No resolveCrossFile(SUB): the extends edge must auto-resolve.

    const base = await topLevelType(BASE);
    const refs = await symbolManager.findReferencesTo(base);

    const subRef = refs.find((r) => r.fileUri === SUB);
    expect(subRef).toBeDefined();
    expect(subRef!.referenceType).toBe(ReferenceType.INHERITANCE);
  });

  it('findReferencesTo(superclass) returns a subclass that extends it', async () => {
    const BASE = 'file:///test/Base.cls';
    const SUB = 'file:///test/Sub.cls';

    await compileAndAdd('public virtual class Base { }', BASE);
    await compileAndAdd('public class Sub extends Base { }', SUB);
    await resolveCrossFile(SUB);

    const base = await topLevelType(BASE);
    const refs = await symbolManager.findReferencesTo(base);

    const subRef = refs.find((r) => r.fileUri === SUB);
    expect(subRef).toBeDefined();
    expect(subRef!.referenceType).toBe(ReferenceType.INHERITANCE);
  });

  it('findReferencesTo(interface) returns a sub-interface that extends it', async () => {
    const BASE = 'file:///test/IAnimal.cls';
    const SUB = 'file:///test/ISpecialAnimal.cls';

    await compileAndAdd('public interface IAnimal { void speak(); }', BASE);
    await compileAndAdd(
      'public interface ISpecialAnimal extends IAnimal { void purr(); }',
      SUB,
    );
    await resolveCrossFile(SUB);

    const base = await topLevelType(BASE);
    const refs = await symbolManager.findReferencesTo(base);

    const subRef = refs.find((r) => r.fileUri === SUB);
    expect(subRef).toBeDefined();
    expect(subRef!.referenceType).toBe(ReferenceType.INTERFACE_IMPLEMENTATION);
  });

  // LISTENER-DRIFT GUARD. The compileAndAdd helper above uses
  // ApexSymbolCollectorListener, but the worker topology compiles with
  // VisibilitySymbolListener + { collectReferences: true } — a DIFFERENT
  // reference pass (ApexReferenceCollectorListener). Phase 1's supertype
  // tagging was added only to ApexSymbolCollectorListener, so the worker path
  // tagged `implements`/`extends` as PARAMETER_TYPE and go-to-implementation
  // returned nothing live even after a workspace load. These tests compile via
  // the worker's EXACT config and assert the supertype references carry
  // INTERFACE_IMPLEMENTATION / INHERITANCE, so the two listeners can't drift
  // apart again unnoticed.
  describe('worker reference pass (VisibilitySymbolListener + collectReferences) tags supertype edges', () => {
    const compileViaWorkerConfig = (apexCode: string, fileUri: string) => {
      const table = new SymbolTable();
      const listener = new VisibilitySymbolListener('public-api', table);
      const result = compilerService.compile(apexCode, fileUri, listener, {
        collectReferences: true,
        resolveReferences: true,
      });
      const st = result.result instanceof SymbolTable ? result.result : table;
      return st.getAllReferences();
    };

    it('tags a class `implements` clause as INTERFACE_IMPLEMENTATION', () => {
      const refs = compileViaWorkerConfig(
        'public class Impl implements IThing { public void go() {} }',
        'file:///test/Impl.cls',
      );
      const ref = refs.find((r) => r.name === 'IThing');
      expect(ref).toBeDefined();
      expect(ref!.context).toBe(ReferenceContext.INTERFACE_IMPLEMENTATION);
    });

    it('tags a class `extends` superclass as INHERITANCE', () => {
      const refs = compileViaWorkerConfig(
        'public class Sub extends Base {}',
        'file:///test/Sub.cls',
      );
      const ref = refs.find((r) => r.name === 'Base');
      expect(ref).toBeDefined();
      expect(ref!.context).toBe(ReferenceContext.INHERITANCE);
    });

    it('tags an interface `extends` clause as INTERFACE_IMPLEMENTATION', () => {
      const refs = compileViaWorkerConfig(
        'public interface ISub extends IBase { void x(); }',
        'file:///test/ISub.cls',
      );
      const ref = refs.find((r) => r.name === 'IBase');
      expect(ref).toBeDefined();
      expect(ref!.context).toBe(ReferenceContext.INTERFACE_IMPLEMENTATION);
    });
  });

  // Compile via the worker's EXACT config (VisibilitySymbolListener +
  // collectReferences) so the implements edges flow through the same
  // addSymbolTable / eager-supertype-resolution path the data-owner uses —
  // the live path where the multi-implementor collapse occurs.
  const addViaWorker = async (apexCode: string, fileUri: string) => {
    const table = new SymbolTable();
    const listener = new VisibilitySymbolListener('public-api', table);
    const result = compilerService.compile(apexCode, fileUri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    const st = result.result instanceof SymbolTable ? result.result : table;
    await Effect.runPromise(symbolManager.addSymbolTable(st, fileUri));
  };

  // Regression for the live "only ONE of multiple implementors resolves" bug.
  //
  // ROOT CAUSE: ApexSymbolManager.findReferencesTo caches its result under
  // `refs_to_<symbol.name>`, but addSymbolTable only invalidated symbol_name_*
  // and file_symbols_* — never refs_to_*. So once go-to-implementation queried
  // the interface while only the FIRST implementor was loaded, the cache pinned
  // [first]; subsequently-added implementors entered the reverse index but the
  // stale cache kept returning just the first. This mirrors the live order:
  // the user runs go-to-implementation (caches the current implementor set),
  // then creates a NEW implementing class, then runs it again — and only the
  // first resolves.
  //
  // The earlier cold-cache test missed this because it queried findReferencesTo
  // only once at the end. This test queries AFTER EACH add to populate the
  // cache, exactly as the live incremental pipeline does.
  it('returns all implementors when queried incrementally as each is added', async () => {
    const IFACE = 'file:///test/IMulti.cls';
    const IMPL_A = 'file:///test/MultiA.cls';
    const IMPL_B = 'file:///test/MultiB.cls';
    const IMPL_C = 'file:///test/MultiC.cls';

    await addViaWorker('public interface IMulti { String run(); }', IFACE);

    await addViaWorker(
      'public class MultiA implements IMulti { public String run() { return null; } }',
      IMPL_A,
    );
    // First query — populates the refs_to_IMulti cache with just [MultiA].
    let refs = await symbolManager.findReferencesTo(await topLevelType(IFACE));
    expect(new Set(refs.map((r) => r.fileUri))).toEqual(new Set([IMPL_A]));

    await addViaWorker(
      'public class MultiB implements IMulti { public String run() { return null; } }',
      IMPL_B,
    );
    refs = await symbolManager.findReferencesTo(await topLevelType(IFACE));
    expect(new Set(refs.map((r) => r.fileUri))).toEqual(
      new Set([IMPL_A, IMPL_B]),
    );

    await addViaWorker(
      'public class MultiC implements IMulti { public String run() { return null; } }',
      IMPL_C,
    );
    refs = await symbolManager.findReferencesTo(await topLevelType(IFACE));
    expect(new Set(refs.map((r) => r.fileUri))).toEqual(
      new Set([IMPL_A, IMPL_B, IMPL_C]),
    );
    refs.forEach((r) =>
      expect(r.referenceType).toBe(ReferenceType.INTERFACE_IMPLEMENTATION),
    );
  });

  // The same fix must apply symmetrically to `extends` (subclass discovery):
  // INHERITANCE edges go through the identical refs_to_<name> cache and the
  // identical clearReferenceStateForFile path, so a superclass queried while
  // only its first subclass was loaded would otherwise pin to that one
  // subclass. Same incremental query pattern as the implementors test.
  it('returns all subclasses when queried incrementally as each is added', async () => {
    const BASE = 'file:///test/MultiBase.cls';
    const SUB_A = 'file:///test/MultiSubA.cls';
    const SUB_B = 'file:///test/MultiSubB.cls';
    const SUB_C = 'file:///test/MultiSubC.cls';

    await addViaWorker('public virtual class MultiBase {}', BASE);

    await addViaWorker('public class MultiSubA extends MultiBase {}', SUB_A);
    // First query — populates the refs_to_MultiBase cache with just [MultiSubA].
    let refs = await symbolManager.findReferencesTo(await topLevelType(BASE));
    expect(new Set(refs.map((r) => r.fileUri))).toEqual(new Set([SUB_A]));

    await addViaWorker('public class MultiSubB extends MultiBase {}', SUB_B);
    refs = await symbolManager.findReferencesTo(await topLevelType(BASE));
    expect(new Set(refs.map((r) => r.fileUri))).toEqual(
      new Set([SUB_A, SUB_B]),
    );

    await addViaWorker('public class MultiSubC extends MultiBase {}', SUB_C);
    refs = await symbolManager.findReferencesTo(await topLevelType(BASE));
    expect(new Set(refs.map((r) => r.fileUri))).toEqual(
      new Set([SUB_A, SUB_B, SUB_C]),
    );
    refs.forEach((r) =>
      expect(r.referenceType).toBe(ReferenceType.INHERITANCE),
    );
  });

  // Regression for a latent 3->0 bug that the stale cache above HID: re-adding
  // the INTERFACE's own file (cold open, or any enrichment write-back of the
  // interface) ran clearReferenceStateForFile, whose
  // removeIncomingReferencesToSymbols wiped EVERY inbound implementor edge to
  // the interface's symbols — and the interface's own re-add never rebuilds
  // those (they belong to the implementor files). A re-add must clear only the
  // file's OWN (outbound) edges; inbound edges survive (they are dropped only on
  // true file removal). This test queries with a COLD cache after the re-add so
  // it sees the actual reverse-index state, not a cached value.
  it('keeps all implementors after the interface file is re-added', async () => {
    const IFACE = 'file:///test/IMulti.cls';
    const IMPL_A = 'file:///test/MultiA.cls';
    const IMPL_B = 'file:///test/MultiB.cls';
    const IMPL_C = 'file:///test/MultiC.cls';

    await addViaWorker('public interface IMulti { String run(); }', IFACE);
    await addViaWorker(
      'public class MultiA implements IMulti { public String run() { return null; } }',
      IMPL_A,
    );
    await addViaWorker(
      'public class MultiB implements IMulti { public String run() { return null; } }',
      IMPL_B,
    );
    await addViaWorker(
      'public class MultiC implements IMulti { public String run() { return null; } }',
      IMPL_C,
    );

    // All three implementor edges are present at this point.
    let refs = await symbolManager.findReferencesTo(await topLevelType(IFACE));
    expect(new Set(refs.map((r) => r.fileUri))).toEqual(
      new Set([IMPL_A, IMPL_B, IMPL_C]),
    );

    // Re-add the INTERFACE file (as a cold open or enrichment write-back does).
    // This must NOT discard the implementors' inbound edges.
    await addViaWorker('public interface IMulti { String run(); }', IFACE);

    refs = await symbolManager.findReferencesTo(await topLevelType(IFACE));
    const implFiles = new Set(refs.map((r) => r.fileUri));
    expect(implFiles).toEqual(new Set([IMPL_A, IMPL_B, IMPL_C]));
    refs.forEach((r) =>
      expect(r.referenceType).toBe(ReferenceType.INTERFACE_IMPLEMENTATION),
    );
  });
});
