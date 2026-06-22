/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Web-platform mirror of loadDependentsForReferences.node.test.ts.
 *
 * worker.platform.ts (node) and worker.platform.web.ts (web) hand-duplicate the
 * dependent-prefetch + resolve-on-ingest logic; the node test alone left the web
 * copy uncovered, so a web-only regression in that byte-identical block would go
 * unnoticed. This pins the web copy's contract: every returned entry rehydrated
 * and added, each ingested dependent's cross-file references resolved (so its
 * implements/extends edges land in the local reverse index), the count returned,
 * and best-effort failures swallowed to 0.
 *
 * worker.platform.web runs `self.addEventListener(...)` at module top level to
 * await its ports, so a minimal `self` is shimmed before the import to let the
 * module load under the node test environment.
 */

// Shim the worker `self` the web module wires a message listener onto at import.
// In the node test environment there is no worker global, so provide a minimal
// stub with a no-op addEventListener; the listener body only runs on a real
// WorkerPortsInit message, which this unit test never posts.
(globalThis as { self?: unknown }).self = {
  addEventListener: () => {},
} as unknown;

import { Effect } from 'effect';
import { loadDependentsForReferences } from '../../src/worker.platform.web';
import type { RequestServices } from '@salesforce/apex-lsp-compliant-services';
import { SymbolTable } from '@salesforce/apex-lsp-parser-ast';

const TARGET_URI = 'file:///workspace/Target.cls';
const CALLER_A_URI = 'file:///workspace/CallerA.cls';
const CALLER_B_URI = 'file:///workspace/CallerB.cls';

/** Minimal serialized-table payload accepted by SymbolTable.fromSerializedData. */
const serializedTableFor = (fileUri: string) => ({
  symbols: [],
  references: [],
  hierarchicalReferences: [],
  metadata: {
    fileUri,
    documentVersion: 1,
    parseCompleteness: 'complete' as const,
  },
  fileUri,
});

describe('loadDependentsForReferences (web)', () => {
  let addSymbolTable: jest.Mock;
  let resolveCrossFileReferencesForFile: jest.Mock;
  let svc: RequestServices;

  beforeEach(() => {
    addSymbolTable = jest.fn(() => Effect.void);
    // After ingesting each dependent, the helper resolves that file's own
    // cross-file references so its implements/extends edges enter the local
    // reverse index (what find-implementation / find-references read).
    resolveCrossFileReferencesForFile = jest.fn(() => Effect.void);
    svc = {
      symbolManager: { addSymbolTable, resolveCrossFileReferencesForFile },
    } as unknown as RequestServices;
  });

  it('ingests every dependent table and resolves each one on the web platform', async () => {
    const fetchDependents = jest.fn().mockResolvedValue({
      entries: {
        [CALLER_A_URI]: serializedTableFor(CALLER_A_URI),
        [CALLER_B_URI]: serializedTableFor(CALLER_B_URI),
      },
    });

    const ingested = await loadDependentsForReferences(
      svc,
      TARGET_URI,
      undefined,
      fetchDependents,
    );

    // Both caller-side tables were rehydrated and added to the local manager.
    expect(ingested).toBe(2);
    expect(addSymbolTable).toHaveBeenCalledTimes(2);
    expect(addSymbolTable).toHaveBeenCalledWith(
      expect.any(SymbolTable),
      CALLER_A_URI,
    );
    expect(addSymbolTable).toHaveBeenCalledWith(
      expect.any(SymbolTable),
      CALLER_B_URI,
    );

    // Each ingested dependent's cross-file refs were resolved so its outbound
    // implements/extends edges land in the local reverse index — the web copy
    // of the node behavior.
    expect(resolveCrossFileReferencesForFile).toHaveBeenCalledTimes(2);
    expect(resolveCrossFileReferencesForFile).toHaveBeenCalledWith(
      CALLER_A_URI,
    );
    expect(resolveCrossFileReferencesForFile).toHaveBeenCalledWith(
      CALLER_B_URI,
    );
  });

  it('skips null entries and resolves only the ingested tables', async () => {
    const fetchDependents = jest.fn().mockResolvedValue({
      entries: {
        [CALLER_A_URI]: serializedTableFor(CALLER_A_URI),
        [CALLER_B_URI]: null,
      },
    });

    const ingested = await loadDependentsForReferences(
      svc,
      TARGET_URI,
      undefined,
      fetchDependents,
    );

    expect(ingested).toBe(1);
    expect(addSymbolTable).toHaveBeenCalledTimes(1);
    expect(addSymbolTable).toHaveBeenCalledWith(
      expect.any(SymbolTable),
      CALLER_A_URI,
    );

    // Resolution is scoped to actually-ingested tables: the null entry is
    // neither added nor resolved.
    expect(resolveCrossFileReferencesForFile).toHaveBeenCalledTimes(1);
    expect(resolveCrossFileReferencesForFile).toHaveBeenCalledWith(
      CALLER_A_URI,
    );
  });

  it('best-effort: swallows a failed assistance fetch and returns 0', async () => {
    const fetchDependents = jest
      .fn()
      .mockRejectedValue(new Error('assistance bus unavailable'));

    const ingested = await loadDependentsForReferences(
      svc,
      TARGET_URI,
      undefined,
      fetchDependents,
    );

    expect(ingested).toBe(0);
    expect(addSymbolTable).not.toHaveBeenCalled();
    expect(resolveCrossFileReferencesForFile).not.toHaveBeenCalled();
  });

  it('best-effort: swallows a resolve-on-ingest failure and returns 0', async () => {
    // The resolve step added in this PR runs after ingestion; a failure there
    // must still be swallowed (best-effort) rather than thrown to the caller.
    resolveCrossFileReferencesForFile.mockImplementationOnce(() =>
      Effect.fail(new Error('cross-file resolution rejected')),
    );
    const fetchDependents = jest.fn().mockResolvedValue({
      entries: { [CALLER_A_URI]: serializedTableFor(CALLER_A_URI) },
    });

    const ingested = await loadDependentsForReferences(
      svc,
      TARGET_URI,
      undefined,
      fetchDependents,
    );

    expect(ingested).toBe(0);
  });
});
