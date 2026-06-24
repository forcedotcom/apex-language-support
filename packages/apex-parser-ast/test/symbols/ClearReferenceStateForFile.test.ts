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
 * W-22692424 — clearReferenceStateForFile must preserve INCOMING edges.
 *
 * Re-adding a file (which happens on every enrichment write-back) clears that
 * file's reference state before rebuilding it. It must clear ONLY the OUTGOING
 * edges (references whose SOURCE is in the file) and LEAVE INTACT the INCOMING
 * edges (references whose source is in another file but whose target is a
 * symbol declared in this file). Otherwise re-adding file A wipes the
 * references that B, C, ... have into symbols declared in A, and
 * findReferencesTo(symbolInA) silently loses them.
 */
describe('clearReferenceStateForFile preserves incoming edges (W-22692424)', () => {
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

  it('keeps B -> Foo (in A) after A is re-added; drops A -> Bar (in C)', async () => {
    // A declares Foo and also references Bar (declared in C) — so A has an
    // OUTGOING edge (A -> Bar) and is the TARGET of an incoming edge (B -> Foo).
    const aUri = 'file:///A.cls';
    const aSrc = `
      public class A {
        public void useBar() {
          Bar b = new Bar();
        }
      }
    `;
    // B references Foo (declared in A) — this is the INCOMING edge into A.
    const bUri = 'file:///B.cls';
    const bSrc = `
      public class B {
        public void useFoo() {
          A foo = new A();
        }
      }
    `;
    const cUri = 'file:///C.cls';
    const cSrc = `
      public class Bar {
        public void noop() {}
      }
    `;

    await addFile(aSrc, aUri);
    await addFile(bSrc, bUri);
    await addFile(cSrc, cUri);

    // Resolve + drain so the cross-file edges (B -> A, A -> Bar) exist.
    for (const uri of [aUri, bUri, cUri]) {
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );
    }
    const graph = refManager();
    graph.drainAllDeferredReferencesSync();

    // The target symbol Foo (the class A) declared in A.
    const aType = graph
      .getSymbolsInFile(aUri)
      .find((s: ApexSymbol) => s.name === 'A' && s.kind === SymbolKind.Class);
    expect(aType).toBeDefined();

    // Pre-condition: B's incoming reference to A exists in the GRAPH reverse
    // index. We assert at the graph level (graph.findReferencesTo) because that
    // is what reads the reverse index that clearReferenceStateForFile mutates.
    // (The higher-level symbolManager.findReferencesTo has a symbol-table
    // fallback that would mask a reverse-index regression.)
    const graphRefsBefore = graph.findReferencesTo(aType!);
    expect(graphRefsBefore.some((r) => r.fileUri === bUri)).toBe(true);

    // Pre-condition: A has OUTGOING edges (forward index keyed by source file).
    const forwardBefore = graph.getForwardIndex().get(aUri);
    expect(forwardBefore && forwardBefore.size).toBeGreaterThan(0);

    // Re-add A from a FRESH symbol table instance — this is the enrichment
    // write-back path and triggers clearReferenceStateForFile(aUri).
    await addFile(aSrc, aUri);

    // INCOMING edge must survive: graph.findReferencesTo(A) STILL returns B's
    // ref. On the OLD behavior this FAILS — removeIncomingReferencesToSymbols
    // wiped the B -> A edge from the reverse index when A was re-added, leaving
    // an empty result here.
    const graphRefsAfter = graph.findReferencesTo(aType!);
    expect(graphRefsAfter.some((r) => r.fileUri === bUri)).toBe(true);

    // Prove this was NOT a no-op: A's OUTGOING edges were actually cleared by
    // clearReferenceStateForFile (the forward index for A is emptied before the
    // freshly parsed table re-adds them via resolve/drain).
    const forwardAfterClear = graph.getForwardIndex().get(aUri);
    expect(forwardAfterClear?.size ?? 0).toBe(0);

    // Re-resolve + drain and confirm A's outgoing edges are re-established and
    // B -> A is still present (clear-then-rebuild is lossless for incoming).
    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(aUri),
    );
    graph.drainAllDeferredReferencesSync();

    const graphRefsFinal = graph.findReferencesTo(aType!);
    expect(graphRefsFinal.some((r) => r.fileUri === bUri)).toBe(true);
    expect(graph.getForwardIndex().get(aUri)?.size ?? 0).toBeGreaterThan(0);
  });

  it('surfaces NO phantom result for a renamed target on A re-parse (P2.1)', async () => {
    // A declares type Foo. B references Foo. A is then re-parsed with Foo
    // RENAMED to Baz. B is NOT re-parsed, so the B -> Foo edge (B's OUTGOING
    // edge, untouched by clearReferenceStateForFile(A)) and its reverse-index
    // entry keyed on Foo's old stable id both persist.
    //
    // findReferencesTo resolves its target BY NAME in the target file
    // (findReferencesViaGraph -> findSymbolInFileByName). This test locks in
    // that the renamed/new symbol surfaces NO phantom incoming reference:
    // querying the new Baz declaration computes a fresh target id with no
    // reverse entry and returns []. Asserted at the graph level (consistent
    // with the test above) to exercise the reverse index directly.
    //
    // Honest nuance (verified): the re-add/enrichment path MERGES symbol
    // tables rather than evicting old declarations, so the stale Foo
    // declaration LINGERS in A's symbol index after the rename and a
    // findReferencesTo(Foo) still resolves B's edge (the old id is still
    // present and the edge is still valid). The genuinely-gone-target case is
    // exercised separately via removeFile below (P2.2). What 6.10 must
    // guarantee here is that the freshly-named target does not inherit a
    // phantom edge, which is what we assert.
    const aUri = 'file:///RenameA.cls';
    const aFooSrc = `
      public class Foo {
        public void noop() {}
      }
    `;
    const bUri = 'file:///RenameB.cls';
    const bSrc = `
      public class RenameB {
        public void useFoo() {
          Foo f = new Foo();
        }
      }
    `;
    // Re-parse of A with the declared type renamed Foo -> Baz.
    const aBazSrc = `
      public class Baz {
        public void noop() {}
      }
    `;

    await addFile(aFooSrc, aUri);
    await addFile(bSrc, bUri);

    for (const uri of [aUri, bUri]) {
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );
    }
    const graph = refManager();
    graph.drainAllDeferredReferencesSync();

    const fooBefore = graph
      .getSymbolsInFile(aUri)
      .find((s: ApexSymbol) => s.name === 'Foo' && s.kind === SymbolKind.Class);
    expect(fooBefore).toBeDefined();

    // Pre-condition: B -> Foo incoming edge exists.
    const refsBefore = graph.findReferencesTo(fooBefore!);
    expect(refsBefore.some((r) => r.fileUri === bUri)).toBe(true);

    // Re-parse A with Foo renamed to Baz (enrichment write-back path ->
    // clearReferenceStateForFile(aUri)). B is NOT re-parsed.
    await addFile(aBazSrc, aUri);

    // The newly-named Baz declaration exists in A.
    const bazAfter = graph
      .getSymbolsInFile(aUri)
      .find((s: ApexSymbol) => s.name === 'Baz' && s.kind === SymbolKind.Class);
    expect(bazAfter).toBeDefined();

    // GUARANTEE: the renamed target surfaces NO phantom incoming reference.
    // B's outgoing edge still points at the old Foo id (B has not been
    // re-resolved), so Baz computes a fresh target id with no reverse entry and
    // findReferencesTo(Baz) returns []. The stale reverse entry keyed on Foo's
    // old id is never surfaced under the new name.
    expect(graph.findReferencesTo(bazAfter!).length).toBe(0);
  });

  it('removeFile STILL purges incoming edges (re-parse vs remove asymmetry) (P2.2)', async () => {
    // Sibling assertion to make the asymmetry explicit: re-adding a file
    // PRESERVES incoming edges (the tests above), but removeFile PURGES them
    // (it calls removeIncomingReferencesToSymbols in addition to
    // removeReferencesFromFile) because the target symbols genuinely go away.
    const aUri = 'file:///RemoveA.cls';
    const aSrc = `
      public class RemoveA {
        public void noop() {}
      }
    `;
    const bUri = 'file:///RemoveB.cls';
    const bSrc = `
      public class RemoveB {
        public void useA() {
          RemoveA a = new RemoveA();
        }
      }
    `;

    await addFile(aSrc, aUri);
    await addFile(bSrc, bUri);

    for (const uri of [aUri, bUri]) {
      await Effect.runPromise(
        symbolManager.resolveCrossFileReferencesForFile(uri),
      );
    }
    const graph = refManager();
    graph.drainAllDeferredReferencesSync();

    const aType = graph
      .getSymbolsInFile(aUri)
      .find(
        (s: ApexSymbol) => s.name === 'RemoveA' && s.kind === SymbolKind.Class,
      );
    expect(aType).toBeDefined();

    // Pre-condition: B -> A incoming edge exists in the reverse index.
    const refsBefore = graph.findReferencesTo(aType!);
    expect(refsBefore.some((r) => r.fileUri === bUri)).toBe(true);

    // removeFile(A) — true deletion. Unlike clearReferenceStateForFile this
    // MUST purge incoming edges to A's symbols (the symbols no longer exist).
    graph.removeFile(aUri);

    // The B -> A incoming edge is gone from the reverse index.
    const refsAfter = graph.findReferencesTo(aType!);
    expect(refsAfter.some((r) => r.fileUri === bUri)).toBe(false);
    expect(refsAfter.length).toBe(0);
  });
});
