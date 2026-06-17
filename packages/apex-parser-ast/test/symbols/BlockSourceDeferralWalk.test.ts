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
 * W-22692422 — block-source walk to non-block before enqueueDeferredReference.
 *
 * A cross-file reference nested inside a block within a method body (e.g. inside
 * a `for` loop in a test method) has, as its innermost containing symbol, a
 * synthetic block symbol (id/name shaped like `block_LL_CC`). When that block is
 * enqueued as the deferral source, the post-batch drain cannot match the block
 * back to a real declaration via findSymbolInFileByName (which skips block
 * symbols), so the cross-file edge would be silently dropped.
 *
 * The fix walks from the block up to the enclosing non-block declaration
 * (method/class) at the deferral-enqueue site so the deferral is anchored to a
 * symbol the drain can resolve. This mirrors a dreamhouse-lwc-style test class
 * whose body references a controller that is added to the manager only later.
 */
describe('Block-source deferral walk (W-22692422)', () => {
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

  it('walks a block source to its enclosing declaration and populates the edge', async () => {
    // `new PropertyController()` lives inside a `for` block within the test
    // method body, so its innermost containing symbol is a synthetic block.
    // PropertyController is added AFTER the test class, so the reference is
    // deferred and must survive the drain.
    const testUri = 'file:///PropertyControllerTest.cls';
    const testSrc = `
      @isTest
      private class PropertyControllerTest {
        @isTest
        static void testGetProperties() {
          for (Integer i = 0; i < 1; i++) {
            PropertyController ctrl = new PropertyController();
          }
        }
      }
    `;

    await addFile(testSrc, testUri);

    // Spy on the deferral-enqueue boundary: every source enqueued must already
    // be a non-block declaration. Without the call-site walk, the synthetic
    // `for`-loop block (kind === Block) is what arrives here.
    const graph = refManager();
    const enqueuedSources: ApexSymbol[] = [];
    const original = graph.enqueueDeferredReference.bind(graph) as (
      source: ApexSymbol,
      ...rest: unknown[]
    ) => void;
    jest
      .spyOn(graph, 'enqueueDeferredReference')
      .mockImplementation((source: ApexSymbol, ...rest: unknown[]) => {
        enqueuedSources.push(source);
        original(source, ...rest);
      });

    // Resolve cross-file refs now — PropertyController is not present yet, so
    // the reference is deferred.
    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(testUri),
    );

    expect(graph.getDeferredTargetNames()).toContain('PropertyController');

    // Load-bearing: the source for the PropertyController deferral must be the
    // enclosing method/class, NOT the synthetic block. Reverting the call-site
    // walk makes this a Block symbol and the assertion fails.
    expect(enqueuedSources.length).toBeGreaterThan(0);
    for (const source of enqueuedSources) {
      expect(source.kind).not.toBe(SymbolKind.Block);
    }

    // Now add the target file.
    const ctrlUri = 'file:///PropertyController.cls';
    const ctrlSrc = `
      public with sharing class PropertyController {
        public PropertyController() {}
      }
    `;
    await addFile(ctrlSrc, ctrlUri);

    // Drain — the deferred reference must turn into a real graph edge.
    const resolved = graph.drainAllDeferredReferencesSync();
    expect(resolved).toBeGreaterThan(0);
    expect(graph.getDeferredTargetNames()).not.toContain('PropertyController');

    // Incoming edge: references TO PropertyController must include the test file.
    const ctrlSymbols =
      await symbolManager.findSymbolByName('PropertyController');
    const ctrlType = ctrlSymbols.find((s) => s.kind === SymbolKind.Class);
    expect(ctrlType).toBeDefined();

    const refsToCtrl = await symbolManager.findReferencesTo(ctrlType!);
    const fromTest = refsToCtrl.find((r) => r.fileUri === testUri);
    expect(fromTest).toBeDefined();
  });
});
