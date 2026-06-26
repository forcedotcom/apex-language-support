/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Reference-enrichment recipe (W-22692429 / 6.13).
 *
 * find-references offloaded to an enrichment worker only returns correct
 * cross-file results when the worker's local graph is assembled the right way.
 * Three conditions must hold, and each was a distinct gap this story closed:
 *
 *  1. The CURSOR file must be parsed at FULL detail. The data-owner serves
 *     files at 'public-api' (method bodies stripped), so a cursor on an in-body
 *     usage (`RefUtil u = new RefUtil()`) resolves to no reference and Find
 *     References returns []. recompileCursorFileAtFullDetail fixes this.
 *  2. The caller-side tables loaded must be dependents of the TARGET symbol's
 *     DECLARING file, not of the cursor file. A `RefUtil` usage in CallerA has
 *     references in CallerB too, but CallerA has no dependents of its own.
 *  3. Those caller tables' cross-file edges must be resolved into the reverse
 *     index (loadDependentsForReferences does this per ingested table).
 *
 * These tests assemble a real ApexSymbolManager + real ReferencesProcessingService
 * exactly as the worker's DispatchReferences handler does — driving the exported
 * worker helpers and injecting the data-owner fetcher — so they verify the
 * recipe end-to-end with full observability (no opaque worker boundary). The
 * live worker-topology path is additionally smoke-covered by
 * ReferencesThroughWorkerTopology.node.test.ts.
 */

import { Effect } from 'effect';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger, ApexSettingsManager } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolManager,
  CompilerService,
  VisibilitySymbolListener,
  SymbolTable,
  type SymbolTable as SymbolTableType,
} from '@salesforce/apex-lsp-parser-ast';
import {
  ReferencesProcessingService,
  ApexStorageManager,
  ApexStorage,
  type RequestServices,
} from '@salesforce/apex-lsp-compliant-services';
import {
  loadDependentsForReferences,
  recompileCursorFileAtFullDetail,
  declaringFileForCursorSymbol,
} from '../../src/worker.platform';

const UTIL_URI = 'file:///t/RefUtil.cls';
const CALLER_A_URI = 'file:///t/RefCallerA.cls';
const CALLER_B_URI = 'file:///t/RefCallerB.cls';

const UTIL_SRC = `public class RefUtil {
  public String greet(String input) {
    return input;
  }
}`;
const CALLER_A_SRC = `public class RefCallerA {
  public String run() {
    RefUtil u = new RefUtil();
    return u.greet('a');
  }
}`;
const CALLER_B_SRC = `public class RefCallerB {
  public void run() {
    RefUtil u = new RefUtil();
    String x = u.greet('b');
  }
}`;

const SOURCES: Record<string, string> = {
  [UTIL_URI]: UTIL_SRC,
  [CALLER_A_URI]: CALLER_A_SRC,
  [CALLER_B_URI]: CALLER_B_SRC,
};

/** Compile a file at public-api detail (what the data-owner stores/serves). */
const compilePublicApi = (uri: string): SymbolTableType => {
  const table = new SymbolTable();
  new CompilerService().compile(
    SOURCES[uri],
    uri,
    new VisibilitySymbolListener('public-api', table),
    { collectReferences: true, resolveReferences: true },
  );
  return table;
};

const serialize = (st: SymbolTableType) => ({
  symbols: st.getAllSymbols(),
  references: st.getAllReferences(),
  hierarchicalReferences: st.getAllHierarchicalReferences(),
  metadata: st.getMetadata(),
  fileUri: st.getFileUri(),
});

describe('reference-enrichment recipe (worker DispatchReferences path)', () => {
  let symbolManager: ApexSymbolManager;
  let svc: RequestServices;

  beforeAll(() => {
    // createResolutionContext reads ApexSettingsManager; initialize the
    // singleton so the service doesn't throw on first getInstance().
    ApexSettingsManager.resetInstance();
    ApexSettingsManager.getInstance({}, 'desktop');
  });

  afterAll(() => {
    ApexSettingsManager.resetInstance();
  });

  beforeEach(async () => {
    symbolManager = new ApexSymbolManager();

    // The data-owner holds every file at public-api. Seed the worker's local
    // graph the way loadSymbolDataForEnrichment does: ingest public-api tables.
    for (const uri of [UTIL_URI, CALLER_A_URI, CALLER_B_URI]) {
      await Effect.runPromise(
        symbolManager.addSymbolTable(compilePublicApi(uri), uri),
      );
    }

    // The worker's storage serves the live cursor document; the position lookup
    // (ReferencesProcessingService → ApexStorageManager.getInstance) reads it.
    // Use real in-memory storage and seed every file's text.
    ApexStorageManager.reset();
    const storageManager = ApexStorageManager.getInstance({
      storageFactory: () => ApexStorage.getInstance(),
      autoPersistIntervalMs: 0,
    });
    await storageManager.initialize();
    const storage = storageManager.getStorage();
    for (const uri of [UTIL_URI, CALLER_A_URI, CALLER_B_URI]) {
      await storage.setDocument(
        uri,
        TextDocument.create(uri, 'apex', 1, SOURCES[uri]),
      );
    }

    svc = {
      symbolManager,
    } as unknown as RequestServices;
  });

  afterEach(() => {
    ApexStorageManager.reset();
  });

  /** Data-owner ResolveDependentUris stub: dependents of `uri` keyed by symbol. */
  const fetchDependents = jest.fn(async (_method: string, params: unknown) => {
    const { uri } = params as { uri: string };
    // Only RefUtil has dependents (the two callers). Callers have none.
    if (uri === UTIL_URI) {
      return {
        entries: {
          [CALLER_A_URI]: serialize(compilePublicApi(CALLER_A_URI)),
          [CALLER_B_URI]: serialize(compilePublicApi(CALLER_B_URI)),
        },
      };
    }
    return { entries: {} };
  });

  it('returns every cross-file usage for a cursor on an in-body type usage', async () => {
    const service = new ReferencesProcessingService(getLogger(), symbolManager);

    // Cursor on `RefUtil` in CallerA's body: line 2 (0-based), col 4.
    const position = { line: 2, character: 4 };

    // --- the handler's recipe (mirrors DispatchReferences end-to-end) -----
    // 1. Recompile the cursor file at full detail so the position resolves.
    await recompileCursorFileAtFullDetail(svc, CALLER_A_URI, CALLER_A_SRC);
    // 2. Resolve the cursor symbol's DECLARING file (RefUtil.cls, not CallerA).
    const targetUri = await declaringFileForCursorSymbol(
      svc,
      CALLER_A_URI,
      position,
    );
    expect(targetUri).toBe(UTIL_URI);
    // 3. Load dependents of the TARGET — surfacing CallerB, which CallerA's own
    //    (empty) dependents never would.
    await loadDependentsForReferences(
      svc,
      targetUri ?? CALLER_A_URI,
      undefined,
      fetchDependents,
    );
    // 4. Re-assert the cursor file at full detail (step 3 may re-ingest it).
    await recompileCursorFileAtFullDetail(svc, CALLER_A_URI, CALLER_A_SRC);
    // ----------------------------------------------------------------------

    const locations = await service.processReferences({
      textDocument: { uri: CALLER_A_URI },
      position,
      context: { includeDeclaration: true },
    });
    const uris = locations.map((l) => l.uri);

    // Cross-file usages from BOTH callers surface, plus the declaration.
    expect(uris).toContain(UTIL_URI);
    expect(uris.some((u) => u.includes('RefCallerA'))).toBe(true);
    expect(uris.some((u) => u.includes('RefCallerB'))).toBe(true);
    expect(locations.length).toBeGreaterThanOrEqual(4);
  });

  it('misses CallerB when dependents load for the cursor file, not the target (gap #3 load-bearing)', async () => {
    const service = new ReferencesProcessingService(getLogger(), symbolManager);
    const position = { line: 2, character: 4 };

    await recompileCursorFileAtFullDetail(svc, CALLER_A_URI, CALLER_A_SRC);

    // The WRONG behavior the fix corrects: load dependents of the CURSOR file
    // (CallerA) rather than the resolved target's declaring file (RefUtil).
    // CallerA has no dependents, so CallerB's usages never enter the pool's
    // graph and are missing from the result.
    await loadDependentsForReferences(
      svc,
      CALLER_A_URI,
      undefined,
      fetchDependents,
    );
    await recompileCursorFileAtFullDetail(svc, CALLER_A_URI, CALLER_A_SRC);

    const locations = await service.processReferences({
      textDocument: { uri: CALLER_A_URI },
      position,
      context: { includeDeclaration: true },
    });
    const uris = locations.map((l) => l.uri);

    // CallerB is absent — exactly the bug the declaring-file resolution fixes.
    expect(uris.some((u) => u.includes('RefCallerB'))).toBe(false);
  });
});
