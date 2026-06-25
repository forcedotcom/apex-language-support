/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Unit tests for the enrichment-worker cross-worker fallback helper
 * `resolveMissingNamesViaDataOwner` (W-22692427 / 6.12).
 *
 * The helper is given an injectable `queryByName` seam specifically so the
 * ingestion contract can be exercised without a live assistance bus. These
 * tests feed canned `{ matches, entries }` responses through that seam and a
 * fake `RequestServices` (only the symbol-manager surface the helper touches)
 * and assert the load-bearing behaviors:
 *   (a) names the LOCAL name index already resolves are skipped (no query),
 *   (b) `entries` are ingested via SymbolTable.fromSerializedData and the
 *       `ingested` count is correct,
 *   (c) a rejected/throwing query degrades gracefully to a zero return,
 *   (d) all unresolved names are sent in ONE batched query (not one-per-name),
 *       with locally-resolved names filtered out of the batch.
 */

import { Effect } from 'effect';
import { resolveMissingNamesViaDataOwner } from '../../src/worker.platform';

const TARGET_URI = 'file:///test/CrossWorkerTarget.cls';

/**
 * Canned wire-shaped serialized symbol table — a plain, structured-clone-safe
 * tree matching {@link SerializedSymbolTableData} (only `symbols` is required).
 * This is the exact shape the data-owner returns in `entries` and that the
 * helper feeds to SymbolTable.fromSerializedData. Built statically (no live
 * compile) so the ingestion contract is exercised without a real assistance bus
 * and independent of the runtime environment.
 */
function makeWireSymbolTable(uri: string): unknown {
  return {
    symbols: [],
    references: [],
    hierarchicalReferences: [],
    metadata: { fileUri: uri },
    fileUri: uri,
  };
}

/**
 * Minimal fake of the symbol-manager surface the helper touches: a local
 * name-index lookup (Promise) and an ingestion sink (Effect).
 */
function makeFakeServices(localResolves: Set<string>) {
  const ingested: Array<{ fileUri: string }> = [];
  const svc = {
    symbolManager: {
      findSymbolByName: (name: string) =>
        Promise.resolve(localResolves.has(name) ? [{ name }] : []),
      addSymbolTable: (_st: unknown, fileUri: string) =>
        Effect.sync(() => {
          ingested.push({ fileUri });
        }),
    },
  } as never;
  return { svc, ingested };
}

describe('resolveMissingNamesViaDataOwner — ingestion contract', () => {
  it('skips names the local name index already resolves (no cross-worker query)', async () => {
    const { svc, ingested } = makeFakeServices(new Set(['LocallyKnown']));
    const calls: unknown[] = [];
    const queryByName = (_method: string, params: unknown) => {
      calls.push(params);
      return Promise.resolve({ matches: [], entries: {} });
    };

    const count = await resolveMissingNamesViaDataOwner(
      svc,
      ['LocallyKnown'],
      queryByName,
    );

    // Resolved locally → no query issued and nothing ingested.
    expect(calls).toHaveLength(0);
    expect(ingested).toHaveLength(0);
    expect(count).toBe(0);
  });

  it('sends all unresolved names in ONE batched query, filtering locally-known names', async () => {
    // 'Known' resolves locally; 'MissA'/'MissB' do not (and 'MissA' is
    // duplicated to prove de-duplication).
    const { svc } = makeFakeServices(new Set(['Known']));
    const calls: Array<{ method: string; params: unknown }> = [];
    const queryByName = (method: string, params: unknown) => {
      calls.push({ method, params });
      return Promise.resolve({ matches: [], entries: {} });
    };

    await resolveMissingNamesViaDataOwner(
      svc,
      ['Known', 'MissA', 'MissB', 'MissA'],
      queryByName,
    );

    // Exactly one round-trip carrying the de-duped residual — not one-per-name.
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('dataOwner:QuerySymbolByName');
    expect((calls[0].params as { names: string[] }).names).toEqual([
      'MissA',
      'MissB',
    ]);
  });

  it('threads an optional namespace hint into the batched query (F12-2)', async () => {
    // A qualified TypeReference (e.g. MyNs.Foo) supplies its leading qualifier
    // as the namespace hint so the data-owner can disambiguate same-named
    // matches across namespaces.
    const { svc } = makeFakeServices(new Set());
    const calls: Array<{ method: string; params: unknown }> = [];
    const queryByName = (method: string, params: unknown) => {
      calls.push({ method, params });
      return Promise.resolve({ matches: [], entries: {} });
    };

    await resolveMissingNamesViaDataOwner(svc, ['Foo'], queryByName, 'MyNs');

    expect(calls).toHaveLength(1);
    const params = calls[0].params as { names: string[]; namespace?: string };
    expect(params.names).toEqual(['Foo']);
    expect(params.namespace).toBe('MyNs');
  });

  it('omits the namespace key entirely when no namespace is supplied (F12-2)', async () => {
    // Unqualified queries must keep the exact prior payload shape — the
    // namespace key must be absent, not present-and-undefined — so the wire
    // payload is byte-identical to the pre-F12-2 batched query.
    const { svc } = makeFakeServices(new Set());
    const calls: Array<{ method: string; params: unknown }> = [];
    const queryByName = (method: string, params: unknown) => {
      calls.push({ method, params });
      return Promise.resolve({ matches: [], entries: {} });
    };

    await resolveMissingNamesViaDataOwner(svc, ['Foo'], queryByName);

    expect(calls).toHaveLength(1);
    const params = calls[0].params as Record<string, unknown>;
    expect(params.names).toEqual(['Foo']);
    expect('namespace' in params).toBe(false);
  });

  it('issues no query when every name resolves locally', async () => {
    const { svc } = makeFakeServices(new Set(['A', 'B']));
    const calls: unknown[] = [];
    const queryByName = (_method: string, params: unknown) => {
      calls.push(params);
      return Promise.resolve({ matches: [], entries: {} });
    };

    const count = await resolveMissingNamesViaDataOwner(
      svc,
      ['A', 'B'],
      queryByName,
    );

    expect(calls).toHaveLength(0);
    expect(count).toBe(0);
  });

  it('ingests entries via SymbolTable.fromSerializedData and returns the ingested count', async () => {
    const { svc, ingested } = makeFakeServices(new Set());
    const wireTable = makeWireSymbolTable(TARGET_URI);
    const queryByName = (_method: string, _params: unknown) =>
      Promise.resolve({
        matches: [{ name: 'CrossWorkerTarget', fileUri: TARGET_URI }],
        entries: { [TARGET_URI]: wireTable },
      });

    const count = await resolveMissingNamesViaDataOwner(
      svc,
      ['CrossWorkerTarget'],
      queryByName,
    );

    // One owning file's table ingested into the local symbol manager.
    expect(count).toBe(1);
    expect(ingested).toHaveLength(1);
    expect(ingested[0].fileUri).toBe(TARGET_URI);
  });

  it('skips null/missing entries while still counting valid ones', async () => {
    const { svc, ingested } = makeFakeServices(new Set());
    const wireTable = makeWireSymbolTable(TARGET_URI);
    const queryByName = (_method: string, _params: unknown) =>
      Promise.resolve({
        matches: [{ name: 'CrossWorkerTarget', fileUri: TARGET_URI }],
        entries: {
          'file:///test/Empty.cls': null,
          [TARGET_URI]: wireTable,
        },
      });

    const count = await resolveMissingNamesViaDataOwner(
      svc,
      ['CrossWorkerTarget'],
      queryByName,
    );

    expect(count).toBe(1);
    expect(ingested).toHaveLength(1);
    expect(ingested[0].fileUri).toBe(TARGET_URI);
  });

  it('returns zero gracefully when the query rejects (best-effort, no throw)', async () => {
    const { svc, ingested } = makeFakeServices(new Set());
    const queryByName = (_method: string, _params: unknown) =>
      Promise.reject(new Error('assistance bus unavailable'));

    const count = await resolveMissingNamesViaDataOwner(
      svc,
      ['CrossWorkerTarget'],
      queryByName,
    );

    expect(count).toBe(0);
    expect(ingested).toHaveLength(0);
  });

  it('returns zero when the response carries no entries', async () => {
    const { svc, ingested } = makeFakeServices(new Set());
    const queryByName = (_method: string, _params: unknown) =>
      Promise.resolve({ matches: [] });

    const count = await resolveMissingNamesViaDataOwner(
      svc,
      ['CrossWorkerTarget'],
      queryByName,
    );

    expect(count).toBe(0);
    expect(ingested).toHaveLength(0);
  });
});
