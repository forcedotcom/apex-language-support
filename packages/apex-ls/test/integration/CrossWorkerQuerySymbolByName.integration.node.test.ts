/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Integration test for the cross-worker DataOwnerQuerySymbolByName path
 * (W-22692427 / 6.12).
 *
 * Exercises the data-owner handler that an enrichment worker hits via the
 * assistance proxy (`dataOwner:QuerySymbolByName`) when its LOCAL name index
 * misses a symbol whose owning file is not loaded in that worker. The
 * data-owner holds ALL workspace symbols, so the query returns the matching
 * symbol(s) with their owning file URI(s) plus the owning files' serialized
 * symbol tables for the worker to ingest.
 *
 * Flow:
 * 1. Spin up a live worker topology (data-owner + enrichment pool).
 * 2. Open a document on the data-owner (sets version) and write back a
 *    compiled symbol table via UpdateSymbolSubset (populates the name index) —
 *    the same protocol the compilation/enrichment workers use.
 * 3. Issue DataOwnerQuerySymbolByName for the declared class name and assert
 *    the match resolves to the owning file URI and the file's symbol table is
 *    returned in `entries`.
 * 4. Negative case: a name with no workspace symbol returns no matches/entries.
 */

import * as path from 'path';
import {
  initializeTopology,
  makeNodeWorkerLayer,
} from '../../src/server/WorkerCoordinator';
import {
  DispatchDocumentOpen,
  UpdateSymbolSubset,
  DataOwnerQuerySymbolByName,
  getLogger,
} from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolManager,
  CompilerService,
  VisibilitySymbolListener,
  SymbolTable,
  ReferenceContext,
} from '@salesforce/apex-lsp-parser-ast';
import type { SerializedSymbolTableData } from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };

const TARGET_URI = 'file:///test/CrossWorkerTarget.cls';
const TARGET_CLASS = `public class CrossWorkerTarget {
    public String label() {
        return 'cross-worker';
    }
}`;

/**
 * Compile a class to a wire-shaped serialized symbol table — the exact object
 * the compilation/enrichment workers produce for UpdateSymbolSubset.
 */
function compileToWireSymbolTable(content: string, uri: string): unknown {
  const table = new SymbolTable();
  const listener = new VisibilitySymbolListener('public-api', table);
  const result = new CompilerService().compile(content, uri, listener, {
    collectReferences: true,
    resolveReferences: true,
  });
  const st = result?.result instanceof SymbolTable ? result.result : table;
  // JSON round-trip to a plain tree — the same structured-clone-safe shape the
  // compilation/enrichment workers send over the wire (cloneForWire).
  return JSON.parse(
    JSON.stringify({
      symbols: st.getAllSymbols(),
      references: st.getAllReferences(),
      hierarchicalReferences: st.getAllHierarchicalReferences(),
      metadata: st.getMetadata(),
      fileUri: st.getFileUri(),
    }),
  );
}

describe('Cross-worker DataOwnerQuerySymbolByName Integration Tests', () => {
  const logger = getLogger();

  it('data-owner resolves a workspace symbol by name and returns its file URI + table', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: false,
        logger,
      });

      // Open the target document so the data-owner has a versioned doc, then
      // write back its compiled symbol table (populates the name index).
      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TARGET_URI,
          languageId: 'apex',
          version: 1,
          content: TARGET_CLASS,
        }),
      );

      const writeBack = yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: TARGET_URI,
          documentVersion: 1,
          enrichedSymbolTable: compileToWireSymbolTable(
            TARGET_CLASS,
            TARGET_URI,
          ),
          enrichedDetailLevel: 'full' as const,
          sourceWorkerId: 'test-worker-crossworker',
        }),
      );
      expect(writeBack.accepted).toBe(true);
      expect(writeBack.merged).toBeGreaterThan(0);

      // The cross-worker query an enrichment worker would issue when its local
      // name index misses CrossWorkerTarget.
      const queryResult = yield* topology.dataOwner.executeEffect(
        new DataOwnerQuerySymbolByName({ name: 'CrossWorkerTarget' }),
      );

      logger.info(
        () =>
          `QuerySymbolByName matches=${queryResult.matches.length} ` +
          `entries=${Object.keys(queryResult.entries).length}`,
      );

      // Matched the type and reported the owning file URI.
      expect(queryResult.matches.length).toBeGreaterThan(0);
      const match = queryResult.matches.find(
        (m) => m.name === 'CrossWorkerTarget',
      );
      expect(match).toBeDefined();
      expect(match!.fileUri).toBe(TARGET_URI);

      // Owning file's symbol table is returned for the worker to ingest.
      expect(queryResult.entries[TARGET_URI]).toBeDefined();
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 120_000);

  it('ingesting the returned table lets the requesting file resolve its cross-file reference end-to-end', async () => {
    // Regression for the gap behind concern #1: the data-owner returning a
    // table is necessary but NOT sufficient. addSymbolTable lands the owning
    // file's SYMBOLS but defers cross-file edges, so the requesting file's
    // TypeReference stays unresolved until resolveCrossFileReferencesForFile
    // runs — which is exactly what loadSymbolDataForEnrichment now does after a
    // cross-worker ingest. This asserts the END-TO-END resolution, not just the
    // returned payload.
    const REQUESTER_URI = 'file:///test/CrossWorkerRequester.cls';
    const REQUESTER_CLASS = `public class CrossWorkerRequester {
    public CrossWorkerTarget make() {
        return new CrossWorkerTarget();
    }
}`;

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: false,
        logger,
      });

      // Data-owner holds the target (the owning file an enrichment worker lacks).
      yield* topology.dataOwner.executeEffect(
        new DispatchDocumentOpen({
          uri: TARGET_URI,
          languageId: 'apex',
          version: 1,
          content: TARGET_CLASS,
        }),
      );
      yield* topology.dataOwner.executeEffect(
        new UpdateSymbolSubset({
          uri: TARGET_URI,
          documentVersion: 1,
          enrichedSymbolTable: compileToWireSymbolTable(
            TARGET_CLASS,
            TARGET_URI,
          ),
          enrichedDetailLevel: 'full' as const,
          sourceWorkerId: 'test-worker-crossworker-e2e',
        }),
      );

      // Cross-worker query the enrichment worker issues for the unresolved name.
      const queryResult = yield* topology.dataOwner.executeEffect(
        new DataOwnerQuerySymbolByName({ names: ['CrossWorkerTarget'] }),
      );
      expect(queryResult.entries[TARGET_URI]).toBeDefined();

      return queryResult;
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const queryResult = await Effect.runPromise(program);

    // --- Enrichment-worker side: ingest the requester + the returned table,
    // then resolve cross-file refs (the post-ingest step under test). ---
    const sm = new ApexSymbolManager();

    // The requesting file, locally present but referencing a type it doesn't own.
    const requesterListener = new VisibilitySymbolListener(
      'public-api',
      new SymbolTable(),
    );
    const requesterResult = new CompilerService().compile(
      REQUESTER_CLASS,
      REQUESTER_URI,
      requesterListener,
      { collectReferences: true, resolveReferences: true },
    );
    const requesterTable =
      requesterResult?.result instanceof SymbolTable
        ? requesterResult.result
        : new SymbolTable();
    await Effect.runPromise(sm.addSymbolTable(requesterTable, REQUESTER_URI));

    // Before ingest: CrossWorkerTarget is unknown locally.
    expect(await sm.findSymbolByName('CrossWorkerTarget')).toHaveLength(0);

    // Ingest the data-owner's returned table (what resolveMissingNamesViaDataOwner does).
    const ownerTable = SymbolTable.fromSerializedData(
      queryResult.entries[TARGET_URI] as SerializedSymbolTableData,
    );
    await Effect.runPromise(sm.addSymbolTable(ownerTable, TARGET_URI));

    // After ingest the SYMBOL is present, but the requesting file's reference is
    // still unresolved until cross-file resolution runs.
    expect(
      (await sm.findSymbolByName('CrossWorkerTarget')).length,
    ).toBeGreaterThan(0);

    // The post-ingest step loadSymbolDataForEnrichment performs.
    await Effect.runPromise(
      sm.resolveCrossFileReferencesForFile(REQUESTER_URI),
    );

    // End-to-end assertion: the requester's CrossWorkerTarget reference now
    // resolves to a symbol ID (the edge is materialized, not just the symbol).
    const refs = await sm.getAllReferencesInFile(REQUESTER_URI);
    const targetRef = refs.find(
      (r) =>
        r.name === 'CrossWorkerTarget' &&
        (r.context === ReferenceContext.CLASS_REFERENCE ||
          r.context === ReferenceContext.CONSTRUCTOR_CALL),
    );
    expect(targetRef).toBeDefined();
    expect(targetRef!.resolvedSymbolId).toBeTruthy();
  }, 120_000);

  it('data-owner returns no matches for an unknown name', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: false,
        logger,
      });

      const queryResult = yield* topology.dataOwner.executeEffect(
        new DataOwnerQuerySymbolByName({ name: 'NoSuchTypeAnywhere' }),
      );

      expect(queryResult.matches).toHaveLength(0);
      expect(Object.keys(queryResult.entries)).toHaveLength(0);
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    await Effect.runPromise(program);
  }, 120_000);
});
