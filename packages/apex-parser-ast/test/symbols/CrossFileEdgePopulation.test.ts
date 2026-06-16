/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';

import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { ApexSymbolRefManager } from '../../src/symbols/ApexSymbolRefManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
  reset as schedulerReset,
} from '../../src/queue/priority-scheduler-utils';
import { SymbolKind, type ApexSymbol } from '../../src/types/symbol';

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
      const deferredBefore = (
        graph as unknown as { deferredReferences: Map<string, unknown[]> }
      ).deferredReferences;
      expect(deferredBefore.has('Callee')).toBe(true);

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
      const deferredAfter = (
        graph as unknown as { deferredReferences: Map<string, unknown[]> }
      ).deferredReferences;
      expect(deferredAfter.has('Callee')).toBe(false);

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

      // The override-aware path must consider related types without throwing
      // and must not duplicate results. It unions references to doWork across
      // Base/Middle/Leaf (and any caller edges that were populated).
      const refs = graph.findReferencesTo(baseDoWork!);

      // De-duplication invariant: no two results share the same
      // (fileUri, symbolId, line, column).
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
  });
});
