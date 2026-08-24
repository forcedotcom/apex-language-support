/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * W-23631128 re-review (P1): CheckMemberConflicts must not FAIL OPEN on a
 * full-detail table whose parse completeness is 'unknown'.
 *
 * A full-detail table can reach the data owner from a producer that never
 * established completeness — e.g. a raw cursor recompile serialized and
 * installed via `UpdateSymbolSubset`. `SymbolTable` defaults completeness to
 * 'unknown', so a guard that only rejects 'incomplete' would trust such a table
 * and could return `conflict:false` from a silently-truncated member set
 * (destructive false negative).
 *
 * These tests install a full/unknown table directly through `UpdateSymbolSubset`
 * (the protocol boundary the prior fix did NOT cover) and assert the query
 * re-establishes completeness from retained source before reading members:
 *  - a syntax-broken file → re-enrich yields 'incomplete' → the query DECLINES.
 *  - a clean file → re-enrich yields 'complete' → the query proceeds normally
 *    (proving the require-'complete' rule does NOT over-decline).
 */

import * as path from 'path';
import { Effect } from 'effect';
import {
  getLogger,
  setLogLevel,
  DispatchDocumentOpen,
  UpdateSymbolSubset,
  type LoggerInterface,
  type WorkerRole,
} from '@salesforce/apex-lsp-shared';
import {
  initializeTopology,
  makeNodeWorkerLayer,
  makeWorkerDispatcher,
  clearRawWorkers,
} from '../../src/server/WorkerCoordinator';

const WORKER_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const COMPILATION_POOL_SIZE = 2;

const workerLayerFactory = (role: WorkerRole) =>
  makeNodeWorkerLayer(WORKER_ENTRY, {
    name: `test-${role}`,
    execArgv: ['--import', 'tsx'],
    workerData: { role, compilationPoolSize: COMPILATION_POOL_SIZE },
  });

// Build a full-detail, UNKNOWN-completeness serialized table for `content` by
// compiling it at full detail and omitting parseCompleteness from the metadata
// (exactly what a raw cursor recompile that never stamped completeness yields).
async function buildFullUnknownWireTable(uri: string, content: string) {
  const { CompilerService, FullSymbolCollectorListener, SymbolTable } =
    await import('@salesforce/apex-lsp-parser-ast');
  const table = new SymbolTable();
  const compiled = new CompilerService().compile(
    content,
    uri,
    new FullSymbolCollectorListener(table),
    { collectReferences: true, resolveReferences: true },
  );
  const st = compiled.result instanceof SymbolTable ? compiled.result : table;
  // JSON round-trip to match the postMessage/pure-data boundary the real
  // write-back applies; metadata intentionally omits parseCompleteness.
  return JSON.parse(
    JSON.stringify({
      symbols: st.getAllSymbols(),
      references: st.getAllReferences(),
      hierarchicalReferences: st.getAllHierarchicalReferences(),
      metadata: { fileUri: uri, documentVersion: 1 },
      fileUri: uri,
    }),
  );
}

describe('CheckMemberConflicts write-back completeness (W-23631128)', () => {
  let logger: LoggerInterface;

  beforeAll(() => {
    setLogLevel('error');
    logger = getLogger();
  });

  afterEach(() => {
    clearRawWorkers();
  });

  it('declines when a full table with UNKNOWN completeness re-enriches to incomplete (broken source)', async () => {
    const URI = 'file:///test/BrokenWriteBack.cls';
    // `keep = ;` is a syntax error: the recovered full parse can drop
    // declarations, so its member set must not be trusted.
    const SRC = `public class BrokenWriteBack {
    public Integer keep;
    public void bad() {
        keep = ;
    }
}`;

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);

      // 1. Store the (broken) source on the data owner so UpdateSymbolSubset is
      //    accepted and the query can re-enrich from retained text.
      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: URI,
          languageId: 'apex',
          version: 1,
          content: SRC,
        }),
      );

      // 2. Install a FULL table with parseCompleteness 'unknown'.
      const wire = yield* Effect.promise(() =>
        buildFullUnknownWireTable(URI, SRC),
      );
      const upd = yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: URI,
          documentVersion: 1,
          enrichedSymbolTable: wire,
          enrichedDetailLevel: 'full',
          sourceWorkerId: 'test-writeback',
        }),
      );

      // 3. Query — the guard must re-establish completeness (→ incomplete) and
      //    decline rather than trust the unknown table.
      const queryResult = yield* Effect.promise(() =>
        dispatcher
          .queryDataOwner('CheckMemberConflicts', {
            definingTypeFqn: 'brokenwriteback',
            newName: 'brandNewName',
            memberKind: 'field',
            isRenamedMemberPrivate: false,
          })
          .then(
            (r) => ({ ok: true as const, r }),
            (e: unknown) => ({
              ok: false as const,
              message: String((e as { message?: string })?.message ?? e),
            }),
          ),
      );

      return { upd, queryResult };
    }).pipe(Effect.scoped);

    const { upd, queryResult } = await Effect.runPromise(program);

    // The full/unknown table was actually installed (accept path exercised).
    expect(upd.accepted).toBe(true);
    // The query declined rather than returning conflict:false from the unknown
    // (and, once re-parsed, incomplete) table.
    expect(queryResult.ok).toBe(false);
    if (!queryResult.ok) {
      expect(queryResult.message).toContain('CheckMemberConflictsError');
    }
  }, 120_000);

  it('does NOT over-decline: a full/unknown table over CLEAN source re-enriches to complete', async () => {
    const URI = 'file:///test/CleanWriteBack.cls';
    const SRC = `public class CleanWriteBack {
    public Integer keep;
}`;

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);

      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: URI,
          languageId: 'apex',
          version: 1,
          content: SRC,
        }),
      );

      const wire = yield* Effect.promise(() =>
        buildFullUnknownWireTable(URI, SRC),
      );
      yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: URI,
          documentVersion: 1,
          enrichedSymbolTable: wire,
          enrichedDetailLevel: 'full',
          sourceWorkerId: 'test-writeback',
        }),
      );

      // Rename `keep` to a name that does NOT collide — a clean full/unknown
      // table must re-enrich to complete and answer normally (no over-decline).
      const queryResult = yield* Effect.promise(() =>
        dispatcher
          .queryDataOwner('CheckMemberConflicts', {
            definingTypeFqn: 'cleanwriteback',
            newName: 'brandNewName',
            memberKind: 'field',
            isRenamedMemberPrivate: false,
          })
          .then(
            (r) => ({ ok: true as const, r: r as { conflict: boolean } }),
            (e: unknown) => ({
              ok: false as const,
              message: String((e as { message?: string })?.message ?? e),
            }),
          ),
      );

      return { queryResult };
    }).pipe(Effect.scoped);

    const { queryResult } = await Effect.runPromise(program);

    // No decline — the clean table's completeness was established and read.
    expect(queryResult.ok).toBe(true);
    if (queryResult.ok) {
      expect(queryResult.r.conflict).toBe(false);
    }
  }, 120_000);
});
