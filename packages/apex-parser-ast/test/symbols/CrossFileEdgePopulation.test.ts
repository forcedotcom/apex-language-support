/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import {
  ApexSymbolRefManager,
  ReferenceType,
} from '../../src/symbols/ApexSymbolRefManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { SymbolKind, type ApexSymbol } from '../../src/types/symbol';
import {
  EnhancedSymbolReference,
  ReferenceContext,
} from '../../src/types/symbolReference';

/**
 * W-22692421 — cross-file edge population on the data-owner.
 *
 * Exercises:
 *  1. Compile order: a reference whose target file is added later is deferred,
 *     then drainAllDeferredReferencesSync populates the incoming edge.
 *  2. The locals path of findReferencesTo (walks the local file, not the graph).
 *  3. Override-aware traversal across a 3-level inheritance fixture.
 */
describe('Cross-file edge population (W-22692421)', () => {
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
      /* scheduler may already be down */
    }
    try {
      await Effect.runPromise(schedulerReset());
    } catch {
      /* ignore */
    }
  });

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
  });

  afterEach(async () => {
    if (symbolManager) {
      await symbolManager.clear();
    }
  });

  const addFile = async (source: string, fileUri: string) => {
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const result = compilerService.compile(source, fileUri, listener);
    expect(result.result).toBeDefined();
    await Effect.runPromise(
      symbolManager.addSymbolTable(result.result!, fileUri),
    );
    return result.result!;
  };

  const refManager = (): ApexSymbolRefManager =>
    (symbolManager as unknown as { symbolRefManager: ApexSymbolRefManager })
      .symbolRefManager;

  describe('compile order: deferral then drain', () => {
    it('populates the incoming edge once the target file is added and drained', async () => {
      // Caller references Callee, but Callee is added AFTER Caller — so the
      // cross-file reference cannot be resolved yet and must be deferred.
      const callerUri = 'file:///Caller.cls';
      const callerSrc = `
        public class Caller {
          public void run() {
            Callee c = new Callee();
            c.greet();
          }
        }
      `;

      await addFile(callerSrc, callerUri);

      // Resolving cross-file refs now should defer (Callee not present yet).
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(callerUri),
      );

      const graph = refManager();
      expect(graph.getDeferredTargetNames()).toContain('Callee');

      // Now add the target file.
      const calleeUri = 'file:///Callee.cls';
      const calleeSrc = `
        public class Callee {
          public void greet() {}
        }
      `;
      await addFile(calleeSrc, calleeUri);

      // Drain synchronously — should turn the deferred Callee reference into a
      // graph edge so Callee now has an incoming reference from Caller.
      const resolved = graph.drainAllDeferredReferencesSync();
      expect(resolved).toBeGreaterThan(0);

      // Callee's deferred bucket should be cleared.
      expect(graph.getDeferredTargetNames()).not.toContain('Callee');

      // Incoming edge: references TO the Callee type should now include Caller.
      const calleeSymbols = await symbolManager.findSymbolByName('Callee');
      const calleeType = calleeSymbols.find((s) => s.kind === SymbolKind.Class);
      expect(calleeType).toBeDefined();

      const refsToCallee = await symbolManager.findReferencesTo(calleeType!);
      const fromCaller = refsToCallee.find((r) => r.fileUri === callerUri);
      expect(fromCaller).toBeDefined();
    });

    it('drainAllDeferredReferences (async wrapper) delegates to the sync drain', async () => {
      const graph = refManager();
      const resolved = await Effect.runPromise(
        graph.drainAllDeferredReferences(),
      );
      // Nothing deferred in a fresh manager.
      expect(resolved).toBe(0);
    });
  });

  describe('locals path', () => {
    it('resolves references to a local variable by walking the local file', async () => {
      const fileUri = 'file:///Locals.cls';
      const src = `
        public class Locals {
          public Integer compute() {
            Integer total = 0;
            total = total + 1;
            return total;
          }
        }
      `;
      await addFile(src, fileUri);

      const graph = refManager();
      const allInFile = graph.getSymbolsInFile(fileUri);
      const localTotal = allInFile.find(
        (s: ApexSymbol) => s.name === 'total' && s.kind === SymbolKind.Variable,
      );
      expect(localTotal).toBeDefined();

      // findReferencesTo for a local must NOT consult the cross-file reverse
      // index; it walks the declaring file's references.
      const refs = graph.findReferencesTo(localTotal!);
      // At least the usages of `total` inside compute() should be found.
      expect(refs.length).toBeGreaterThan(0);
      for (const r of refs) {
        expect(r.fileUri).toBe(fileUri);
      }
    });

    it('does not cross-contaminate same-named locals in sibling scopes', async () => {
      // Two methods each declare a local `total`. The normal compile path
      // resolves uses by id, but an UNRESOLVED reference named `total` sitting
      // in second()'s body must not be attributed to first()'s `total` via the
      // name-match fallback — it lies outside first()'s scope range.
      const fileUri = 'file:///SiblingLocals.cls';
      const src = `
        public class SiblingLocals {
          public Integer first() {
            Integer total = 1;
            total = total + 1;
            return total;
          }
          public Integer second() {
            Integer total = 100;
            total = total + total + total;
            return total;
          }
        }
      `;
      const symbolTable = await addFile(src, fileUri);

      const graph = refManager();
      const allInFile = graph.getSymbolsInFile(fileUri);
      const firstMethod = allInFile.find(
        (s: ApexSymbol) => s.name === 'first' && s.kind === SymbolKind.Method,
      );
      const secondMethod = allInFile.find(
        (s: ApexSymbol) => s.name === 'second' && s.kind === SymbolKind.Method,
      );
      expect(firstMethod).toBeDefined();
      expect(secondMethod).toBeDefined();

      // The local `total` declared in first().
      const firstRange = firstMethod!.location.symbolRange;
      const firstTotal = allInFile.find(
        (s: ApexSymbol) =>
          s.name === 'total' &&
          s.kind === SymbolKind.Variable &&
          s.location.identifierRange.startLine >= firstRange.startLine &&
          s.location.identifierRange.endLine <= firstRange.endLine,
      );
      expect(firstTotal).toBeDefined();

      // Inject an UNRESOLVED reference named `total` positioned inside second()'s
      // body. This is the exact shape the name-match fallback would wrongly
      // claim if it were not scope-bounded.
      const secondRange = secondMethod!.location.symbolRange;
      const injectedLine = secondRange.startLine + 1;
      const injectedLoc = {
        symbolRange: {
          startLine: injectedLine,
          startColumn: 12,
          endLine: injectedLine,
          endColumn: 17,
        },
        identifierRange: {
          startLine: injectedLine,
          startColumn: 12,
          endLine: injectedLine,
          endColumn: 17,
        },
      };
      symbolTable.addTypeReference(
        new EnhancedSymbolReference(
          'total',
          injectedLoc,
          ReferenceContext.VARIABLE_USAGE,
          undefined, // resolvedSymbolId: UNRESOLVED — triggers name-match fallback
        ),
      );

      // References to first()'s `total` must all stay within first()'s scope;
      // the injected (second-scope) reference must NOT appear.
      const refs = graph.findReferencesTo(firstTotal!);
      expect(refs.length).toBeGreaterThan(0);
      for (const r of refs) {
        const line = r.location.identifierRange.startLine;
        expect(line).toBeGreaterThanOrEqual(firstRange.startLine);
        expect(line).toBeLessThanOrEqual(firstRange.endLine);
      }
      const leaked = refs.some(
        (r) => r.location.identifierRange.startLine === injectedLine,
      );
      expect(leaked).toBe(false);
    });
  });

  describe('override-aware traversal (3-level inheritance)', () => {
    it('unions references to an instance method across the inheritance chain', async () => {
      // Base -> Middle -> Leaf, each declaring/overriding doWork().
      const baseUri = 'file:///Base.cls';
      const baseSrc = `
        public virtual class Base {
          public virtual void doWork() {}
        }
      `;
      const middleUri = 'file:///Middle.cls';
      const middleSrc = `
        public virtual class Middle extends Base {
          public override void doWork() {}
        }
      `;
      const leafUri = 'file:///Leaf.cls';
      const leafSrc = `
        public class Leaf extends Middle {
          public override void doWork() {}
        }
      `;

      // A caller invoking doWork() on a Base-typed reference.
      const callerUri = 'file:///WorkCaller.cls';
      const callerSrc = `
        public class WorkCaller {
          public void invoke(Base b) {
            b.doWork();
          }
        }
      `;

      await addFile(baseSrc, baseUri);
      await addFile(middleSrc, middleUri);
      await addFile(leafSrc, leafUri);
      await addFile(callerSrc, callerUri);

      // Resolve + drain so cross-file edges exist.
      for (const uri of [baseUri, middleUri, leafUri, callerUri]) {
        await Effect.runPromise(
          symbolManager.resolveCrossFileReferencesForFile(uri),
        );
      }
      const graph = refManager();
      graph.drainAllDeferredReferencesSync();

      // Find Base.doWork() — an instance (virtual) method. (Method symbols are
      // parented to the class block, so match by name/kind/file rather than by
      // the class declaration id.)
      const baseSymbols = graph.getSymbolsInFile(baseUri);
      const baseDoWork = baseSymbols.find(
        (s: ApexSymbol) => s.name === 'doWork' && s.kind === SymbolKind.Method,
      );
      expect(baseDoWork).toBeDefined();
      expect(baseDoWork!.modifiers.isStatic).toBe(false);

      // Seed a genuine cross-file caller edge whose target is Base.doWork. This
      // mirrors what a fully-resolved `b.doWork()` call (b typed Base) produces.
      //
      // NOTE: as of this story, the cross-file resolver in ApexSymbolManager does
      // NOT yet resolve a *qualified, receiver-typed* method call (`b.doWork()`,
      // b: Base) to the cross-file member Base.doWork — the qualifier `b` is a
      // same-file local, so the reference is treated as same-file and attributed
      // to the receiver variable rather than the member. That receiver-typed
      // cross-file member resolution is upstream of findReferencesTo and out of
      // scope here. We therefore seed the resolved edge directly so this test
      // exercises the in-scope override-UNION logic against non-empty data
      // (an empty result array would vacuously satisfy a dedup-only assertion).
      const callerSymbols = graph.getSymbolsInFile(callerUri);
      const invokeSym = callerSymbols.find(
        (s: ApexSymbol) => s.name === 'invoke' && s.kind === SymbolKind.Method,
      );
      expect(invokeSym).toBeDefined();
      graph.addReference(
        invokeSym!,
        baseDoWork!,
        ReferenceType.METHOD_CALL,
        {
          symbolRange: {
            startLine: 4,
            startColumn: 12,
            endLine: 4,
            endColumn: 22,
          },
          identifierRange: {
            startLine: 4,
            startColumn: 14,
            endLine: 4,
            endColumn: 20,
          },
        },
        { methodName: 'doWork' },
      );

      // The override-aware path must consider related types without throwing
      // and must not duplicate results. It unions references to doWork across
      // Base/Middle/Leaf, so the seeded caller edge surfaces.
      const refs = graph.findReferencesTo(baseDoWork!);

      // The union actually found the cross-file caller reference (not empty).
      expect(refs.length).toBeGreaterThan(0);
      expect(refs.some((r) => r.fileUri === callerUri)).toBe(true);

      // The same caller edge must also surface when querying a DERIVED override
      // (Leaf.doWork): the override-union walks the chain up to Base where the
      // edge lives. An empty array could never satisfy this.
      const leafDoWork = graph
        .getSymbolsInFile(leafUri)
        .find(
          (s: ApexSymbol) =>
            s.name === 'doWork' && s.kind === SymbolKind.Method,
        );
      expect(leafDoWork).toBeDefined();
      const refsFromLeaf = graph.findReferencesTo(leafDoWork!);
      expect(refsFromLeaf.some((r) => r.fileUri === callerUri)).toBe(true);

      // De-duplication invariant: no two results share the same
      // (fileUri, symbolId, line, column).
      const keys = refs.map((r) => {
        const ir = r.location.identifierRange;
        return `${r.fileUri}#${r.symbolId}#${ir.startLine}:${ir.startColumn}`;
      });
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('unions references to an interface method across its implementors', async () => {
      // Interface Greeter with greet(); two classes implement it.
      const ifaceUri = 'file:///Greeter.cls';
      const ifaceSrc = `
        public interface Greeter {
          void greet();
        }
      `;
      const implAUri = 'file:///GreeterA.cls';
      const implASrc = `
        public class GreeterA implements Greeter {
          public void greet() {}
        }
      `;
      const implBUri = 'file:///GreeterB.cls';
      const implBSrc = `
        public class GreeterB implements Greeter {
          public void greet() {}
        }
      `;

      await addFile(ifaceSrc, ifaceUri);
      await addFile(implASrc, implAUri);
      await addFile(implBSrc, implBUri);

      for (const uri of [ifaceUri, implAUri, implBUri]) {
        await Effect.runPromise(
          symbolManager.resolveCrossFileReferencesForFile(uri),
        );
      }
      const graph = refManager();
      graph.drainAllDeferredReferencesSync();

      // The interface method greet().
      const ifaceSymbols = graph.getSymbolsInFile(ifaceUri);
      const ifaceGreet = ifaceSymbols.find(
        (s: ApexSymbol) => s.name === 'greet' && s.kind === SymbolKind.Method,
      );
      expect(ifaceGreet).toBeDefined();

      // The implementor traversal must consider GreeterA/GreeterB without
      // throwing and de-duplicate results.
      const refs = graph.findReferencesTo(ifaceGreet!);
      const keys = refs.map((r) => {
        const ir = r.location.identifierRange;
        return `${r.fileUri}#${r.symbolId}#${ir.startLine}:${ir.startColumn}`;
      });
      expect(new Set(keys).size).toBe(keys.length);
    });

    it('does not throw on an inheritance cycle (cycle guard)', async () => {
      // Pathological: two classes naming each other as superclass. The graph
      // builder may permit this; the traversal must terminate.
      const aUri = 'file:///CycleA.cls';
      const bUri = 'file:///CycleB.cls';
      await addFile(
        'public virtual class CycleA extends CycleB { public virtual void m() {} }',
        aUri,
      );
      await addFile(
        'public virtual class CycleB extends CycleA { public virtual void m() {} }',
        bUri,
      );

      const graph = refManager();
      const aSymbols = graph.getSymbolsInFile(aUri);
      const aM = aSymbols.find(
        (s: ApexSymbol) => s.name === 'm' && s.kind === SymbolKind.Method,
      );
      expect(aM).toBeDefined();

      // Must terminate (no infinite loop) and return an array.
      const refs = graph.findReferencesTo(aM!);
      expect(Array.isArray(refs)).toBe(true);
    });

    it('pins edge direction: a sibling implementor is reached only via the correct up-then-down walk', async () => {
      // Direction-pinning topology. A 3-level CHAIN cannot catch a supertype /
      // subtype direction swap — queried from any node, an up-walk and a
      // down-walk both reach the same chain members. A SIBLING topology can: two
      // implementors of one interface are reachable from each other ONLY by
      // walking UP to the shared interface (outgoing INTERFACE_IMPLEMENTATION
      // edge) and then DOWN to the sibling (incoming edge). If
      // findSupertypesViaEdges / findSubtypesViaEdges were swapped, the up-walk
      // from PingB would read PingB's (empty) incoming edges, never reach the
      // interface, and the sibling PingA would be absent from the related set.
      const ifaceUri = 'file:///Pingable.cls';
      const ifaceSrc = `
        public interface Pingable {
          void ping();
        }
      `;
      const implAUri = 'file:///PingA.cls';
      const implASrc = `
        public class PingA implements Pingable {
          public void ping() {}
        }
      `;
      const implBUri = 'file:///PingB.cls';
      const implBSrc = `
        public class PingB implements Pingable {
          public void ping() {}
        }
      `;

      await addFile(ifaceSrc, ifaceUri);
      await addFile(implASrc, implAUri);
      await addFile(implBSrc, implBUri);

      // Resolve + drain so the implementor→interface edges are real (not seeded).
      for (const uri of [ifaceUri, implAUri, implBUri]) {
        await Effect.runPromise(
          symbolManager.resolveCrossFileReferencesForFile(uri),
        );
      }
      const graph = refManager();
      graph.drainAllDeferredReferencesSync();

      // Seed a caller edge targeting PingA.ping ONLY. (Receiver-typed call
      // resolution is upstream and out of scope here — see the override-union
      // test — so the method-reference datum is seeded; the inheritance edges
      // that drive discovery are real.)
      const pingAPing = graph
        .getSymbolsInFile(implAUri)
        .find(
          (s: ApexSymbol) => s.name === 'ping' && s.kind === SymbolKind.Method,
        );
      expect(pingAPing).toBeDefined();
      const callerUri = 'file:///PingCaller.cls';
      const callerSrc = `
        public class PingCaller {
          public void run(PingA a) {
            a.ping();
          }
        }
      `;
      await addFile(callerSrc, callerUri);
      const callerRun = graph
        .getSymbolsInFile(callerUri)
        .find(
          (s: ApexSymbol) => s.name === 'run' && s.kind === SymbolKind.Method,
        );
      expect(callerRun).toBeDefined();
      graph.addReference(
        callerRun!,
        pingAPing!,
        ReferenceType.METHOD_CALL,
        {
          symbolRange: {
            startLine: 4,
            startColumn: 12,
            endLine: 4,
            endColumn: 21,
          },
          identifierRange: {
            startLine: 4,
            startColumn: 14,
            endLine: 4,
            endColumn: 18,
          },
        },
        { methodName: 'ping' },
      );

      // Querying the SIBLING (PingB.ping) must surface the PingA caller: the
      // override-union walks UP from PingB to Pingable, then DOWN to PingA. A
      // direction swap leaves PingA undiscovered and this empty.
      const pingBPing = graph
        .getSymbolsInFile(implBUri)
        .find(
          (s: ApexSymbol) => s.name === 'ping' && s.kind === SymbolKind.Method,
        );
      expect(pingBPing).toBeDefined();
      const refsFromB = graph.findReferencesTo(pingBPing!);
      expect(refsFromB.some((r) => r.fileUri === callerUri)).toBe(true);
    });

    it('resolve-on-read: an instance-method query drains a deferred supertype edge (reverse load order)', async () => {
      // The regression this guards: collectRelatedTypeNames discovers the
      // hierarchy purely from RESOLVED inheritance edges. When an implementor is
      // loaded before the interface it implements (the documented lazy
      // reverse-ordering case), its INTERFACE_IMPLEMENTATION edge sits DEFERRED —
      // invisible to discovery — until a drain runs. findInstanceMethodReferences
      // now drains on read, so a find-references issued before the post-batch
      // drain still sees the full hierarchy.
      const implUri = 'file:///LazyImpl.cls';
      const implSrc = `
        public class LazyImpl implements LazyIface {
          public void act() {}
        }
      `;
      // Load the implementor FIRST; its supertype target (LazyIface) is absent,
      // so resolving its cross-file refs defers the implements edge.
      await addFile(implSrc, implUri);
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(implUri),
      );
      const graph = refManager();
      expect(graph.getDeferredTargetNames()).toContain('LazyIface');

      // Now load the interface — but do NOT drain. (Adding the target file does
      // not auto-resolve the deferral; see the deferral→drain test above.)
      const ifaceUri = 'file:///LazyIface.cls';
      const ifaceSrc = `
        public interface LazyIface {
          void act();
        }
      `;
      await addFile(ifaceSrc, ifaceUri);

      // Seed a caller edge on the INTERFACE method LazyIface.act.
      const ifaceAct = graph
        .getSymbolsInFile(ifaceUri)
        .find(
          (s: ApexSymbol) => s.name === 'act' && s.kind === SymbolKind.Method,
        );
      expect(ifaceAct).toBeDefined();
      const callerUri = 'file:///LazyCaller.cls';
      const callerSrc = `
        public class LazyCaller {
          public void run(LazyIface i) {
            i.act();
          }
        }
      `;
      await addFile(callerSrc, callerUri);
      const callerRun = graph
        .getSymbolsInFile(callerUri)
        .find(
          (s: ApexSymbol) => s.name === 'run' && s.kind === SymbolKind.Method,
        );
      expect(callerRun).toBeDefined();
      graph.addReference(
        callerRun!,
        ifaceAct!,
        ReferenceType.METHOD_CALL,
        {
          symbolRange: {
            startLine: 4,
            startColumn: 12,
            endLine: 4,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 4,
            startColumn: 14,
            endLine: 4,
            endColumn: 17,
          },
        },
        { methodName: 'act' },
      );

      // Query the IMPLEMENTOR method WITHOUT a manual drain. Discovery must reach
      // LazyIface (up-walk) to find the caller of LazyIface.act — which is only
      // possible if findReferencesTo drained the deferred implements edge on read.
      const implAct = graph
        .getSymbolsInFile(implUri)
        .find(
          (s: ApexSymbol) => s.name === 'act' && s.kind === SymbolKind.Method,
        );
      expect(implAct).toBeDefined();
      const refs = graph.findReferencesTo(implAct!);
      expect(refs.some((r) => r.fileUri === callerUri)).toBe(true);

      // The drain-on-read also satisfied the deferral as a side effect.
      expect(graph.getDeferredTargetNames()).not.toContain('LazyIface');
    });
  });

  describe('deferred target disambiguation (pickDeferredTarget)', () => {
    // Minimal stand-in for a graph symbol; only the fields the picker reads.
    const candidate = (fileUri: string, namespace?: string): ApexSymbol =>
      ({
        id: `id:${fileUri}`,
        name: 'Widget',
        kind: SymbolKind.Class,
        fileUri,
        namespace,
      }) as unknown as ApexSymbol;

    const pick = (
      candidates: ApexSymbol[],
      source: ApexSymbol,
      namespaceHint?: string,
    ): ApexSymbol =>
      (
        refManager() as unknown as {
          pickDeferredTarget(
            c: ApexSymbol[],
            s: ApexSymbol,
            ns: string | undefined,
            name: string,
          ): ApexSymbol;
        }
      ).pickDeferredTarget(candidates, source, namespaceHint, 'Widget');

    it('prefers the candidate in the same file as the source', () => {
      const source = candidate('file:///app/Caller.cls');
      const result = pick(
        [
          candidate('file:///other/Widget.cls'),
          candidate('file:///app/Caller.cls'),
        ],
        source,
      );
      expect(result.fileUri).toBe('file:///app/Caller.cls');
    });

    it('uses the namespace hint when there is no same-file match', () => {
      const source = candidate('file:///app/Caller.cls');
      const result = pick(
        [
          candidate('file:///ns1/Widget.cls', 'NsOne'),
          candidate('file:///ns2/Widget.cls', 'NsTwo'),
        ],
        source,
        'nstwo', // case-insensitive
      );
      expect(result.fileUri).toBe('file:///ns2/Widget.cls');
    });

    it('returns the sole candidate unambiguously', () => {
      const source = candidate('file:///app/Caller.cls');
      const only = candidate('file:///lib/Widget.cls');
      expect(pick([only], source).fileUri).toBe('file:///lib/Widget.cls');
    });

    it('falls back to the first candidate when still ambiguous', () => {
      const source = candidate('file:///app/Caller.cls');
      const result = pick(
        [candidate('file:///a/Widget.cls'), candidate('file:///b/Widget.cls')],
        source,
        // namespace hint matches neither candidate → no narrowing
        'NsZero',
      );
      expect(result.fileUri).toBe('file:///a/Widget.cls');
    });
  });
});
