/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Unit coverage for the references-enrichment dependent-prefetch helper.
 *
 * Find References offloaded to an enrichment worker needs the *caller-side*
 * symbol tables (files whose declared symbols reference the target) loaded
 * locally before `processReferences` runs, so the search sees cross-file
 * usages. `loadDependentsForReferences` fetches those tables from the
 * data-owner via coordinator assistance and ingests them into the local
 * symbol manager.
 *
 * The live end-to-end path (real worker topology + coordinator assistance bus
 * + cross-file resolution pass) is covered by W-22692429 (6.13); see the
 * skipped test in WriteBackProtocol.integration.node.test.ts. These tests pin
 * the helper's ingestion contract — every returned entry rehydrated and added,
 * the count returned, and best-effort failures swallowed to 0 — by injecting
 * the assistance fetcher, so they need neither a worker nor the bus.
 */

import { Effect } from 'effect';
import { loadDependentsForReferences } from '../../src/worker.platform';
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

describe('loadDependentsForReferences', () => {
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

  it('ingests every dependent table and returns the count', async () => {
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
    // implements/extends edges land in the local reverse index.
    expect(resolveCrossFileReferencesForFile).toHaveBeenCalledTimes(2);
    expect(resolveCrossFileReferencesForFile).toHaveBeenCalledWith(
      CALLER_A_URI,
    );
    expect(resolveCrossFileReferencesForFile).toHaveBeenCalledWith(
      CALLER_B_URI,
    );

    // It asked the data-owner for *this* file's dependents.
    expect(fetchDependents).toHaveBeenCalledWith(
      'dataOwner:ResolveDependentUris',
      { uri: TARGET_URI, symbolName: undefined },
      true,
    );
  });

  it('threads the optional symbolName narrowing through to the request', async () => {
    const fetchDependents = jest.fn().mockResolvedValue({ entries: {} });

    await loadDependentsForReferences(
      svc,
      TARGET_URI,
      'doWork',
      fetchDependents,
    );

    expect(fetchDependents).toHaveBeenCalledWith(
      'dataOwner:ResolveDependentUris',
      { uri: TARGET_URI, symbolName: 'doWork' },
      true,
    );
  });

  it('skips null entries and counts only ingested tables', async () => {
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

  it('returns 0 when the data-owner reports no dependents', async () => {
    const fetchDependents = jest.fn().mockResolvedValue({ entries: {} });

    const ingested = await loadDependentsForReferences(
      svc,
      TARGET_URI,
      undefined,
      fetchDependents,
    );

    expect(ingested).toBe(0);
    expect(addSymbolTable).not.toHaveBeenCalled();
  });

  it('returns 0 when the response has no entries field', async () => {
    const fetchDependents = jest.fn().mockResolvedValue({});

    const ingested = await loadDependentsForReferences(
      svc,
      TARGET_URI,
      undefined,
      fetchDependents,
    );

    expect(ingested).toBe(0);
    expect(addSymbolTable).not.toHaveBeenCalled();
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

    // A failed resolve must not throw — the reference search proceeds on
    // whatever tables are already loaded (e.g. same-file references).
    expect(ingested).toBe(0);
    expect(addSymbolTable).not.toHaveBeenCalled();
  });

  it('best-effort: swallows a mid-ingestion failure and returns 0', async () => {
    addSymbolTable.mockImplementationOnce(() =>
      Effect.fail(new Error('symbol manager rejected the table')),
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
