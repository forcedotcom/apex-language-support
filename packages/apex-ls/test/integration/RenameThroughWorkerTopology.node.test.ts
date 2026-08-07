/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * textDocument/rename through the live worker topology.
 *
 * Two deliverables are covered here as the epic progresses:
 *   - Phase 0 (W-23631069): the rename pipe is wired end-to-end across the
 *     worker boundary — `coordinator.dispatch('rename')` → request-pool worker
 *     `DispatchRename` handler → back to the coordinator. A cursor that doesn't
 *     resolve to a renamable local still settles with `null` (LSP "nothing to
 *     rename"), never a throw or a hang.
 *   - renameLocal (W-23631077): a cursor on a local variable / parameter comes
 *     back as a `WorkspaceEdit` whose `changes` rename the declaration and every
 *     scope-bound usage in the one file, produced on the pool via the standalone
 *     parse + scope-aware binding.
 *
 * Mirrors ReferencesThroughWorkerTopology.node.test.ts: rename routes to the
 * request pool (DISPATCH_ROUTING rename: 'requestPool').
 */

import * as path from 'path';
import {
  initializeTopology,
  makeNodeWorkerLayer,
  makeWorkerDispatcher,
  getRawWorkers,
  getAssistancePorts,
  getWorkerNames,
  clearRawWorkers,
  runRemoteStdlibWarmupPhase,
  type WorkerTopology,
} from '../../src/server/WorkerCoordinator';
import { CoordinatorAssistanceMediator } from '../../src/server/CoordinatorAssistanceMediator';
import { createPrimaryAssistanceHandler } from '../../src/server/CoordinatorPrimaryAssistanceHandler';
import { ResourceLoaderProxy } from '../../src/server/ResourceLoaderProxy';
import {
  getLogger,
  enableConsoleLogging,
  setLogLevel,
  LoggerInterface,
  type WorkerRole,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };
const LOG_LEVEL = 'debug';
const COMPILATION_POOL_SIZE = 2;
const workerLayerFactory = (role: WorkerRole) =>
  makeNodeWorkerLayer(WORKER_TS_ENTRY, {
    ...TSX_OPTIONS,
    workerData: {
      role,
      compilationPoolSize: COMPILATION_POOL_SIZE,
      compilationConcurrency: 1,
    },
  });

const UTIL_URI = 'file:///test/RenameTarget.cls';
const UTIL_SRC = `public class RenameTarget {
    public String greet(String input) {
        return input;
    }
}`;

// A class with a local variable `total` (declared + used twice) alongside a
// same-named local `total` in a SIBLING method — the shadowing trap renameLocal
// must not fall into. Renaming compute()'s `total` must leave other()'s alone.
const LOCAL_URI = 'file:///test/RenameLocal.cls';
const LOCAL_SRC = `public class RenameLocal {
    public Integer compute() {
        Integer total = 0;
        total = total + 1;
        return total;
    }
    public Integer other() {
        Integer total = 99;
        return total;
    }
}`;

const SOURCES: Record<string, string> = {
  [UTIL_URI]: UTIL_SRC,
  [LOCAL_URI]: LOCAL_SRC,
};

const stubConnection = {
  sendRequest: async () => null,
  sendNotification: async () => undefined,
};

function wireProductionMediator(
  topology: WorkerTopology,
  dispatcher: ReturnType<typeof makeWorkerDispatcher>,
  logger: ReturnType<typeof getLogger>,
): CoordinatorAssistanceMediator {
  const resourceLoaderProxy = topology.resourceLoader
    ? new ResourceLoaderProxy(topology.resourceLoader, logger)
    : undefined;
  const mediator = new CoordinatorAssistanceMediator(
    createPrimaryAssistanceHandler({
      connection: stubConnection,
      logger,
      getResourceLoaderProxy: () => resourceLoaderProxy,
    }),
    logger,
    (method, params) => dispatcher.queryDataOwner(method, params),
  );
  mediator.attachToWorkers(
    getRawWorkers(),
    getAssistancePorts(),
    getWorkerNames(),
  );
  return mediator;
}

describe('rename through the worker topology (Phase 0 no-op)', () => {
  let logger: LoggerInterface;

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel(LOG_LEVEL);
    logger = getLogger();
  });

  afterEach(() => {
    clearRawWorkers();
  });

  it('routes rename to the request pool and settles with null (Phase 0)', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => SOURCES[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      // rename must NOT be coordinator-only anymore — it dispatches to the pool.
      const canDispatch = dispatcher.canDispatch('rename');

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: UTIL_URI,
            languageId: 'apex',
            version: 1,
            getText: () => UTIL_SRC,
          },
          textDocument: { uri: UTIL_URI },
          text: UTIL_SRC,
        }),
      );

      // Dispatch rename on the `greet` method. The Phase-0 handler ignores the
      // position/newName and returns null; what we're proving is that the
      // request crosses the worker boundary and settles.
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('rename', {
          textDocument: { uri: UTIL_URI },
          position: { line: 1, character: 18 }, // on `greet`
          newName: 'salute',
        }),
      );

      return { canDispatch, result };
    }).pipe(Effect.scoped);

    const { canDispatch, result } = await Effect.runPromise(program);
    logger.debug(
      `[rename-topology] canDispatch=${canDispatch} result=${JSON.stringify(result)}`,
    );

    // The pipe is live (rename is pool-dispatchable) and a method cursor (not
    // yet a supported rename kind) returns null across the boundary — no throw,
    // no hang.
    expect(canDispatch).toBe(true);
    expect(result).toBeNull();
  }, 120_000);

  it('renames a local to a WorkspaceEdit, leaving a sibling-scope local untouched (W-23631077)', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => SOURCES[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: LOCAL_URI,
            languageId: 'apex',
            version: 1,
            getText: () => LOCAL_SRC,
          },
          textDocument: { uri: LOCAL_URI },
          text: LOCAL_SRC,
        }),
      );

      // Cursor on compute()'s `total` usage in `return total;` (LSP line 4,
      // char 15). compute()'s `total` is declared line 2 and used on lines 3-4;
      // other()'s unrelated `total` lives on lines 7-8 and must NOT be renamed.
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('rename', {
          textDocument: { uri: LOCAL_URI },
          position: { line: 4, character: 15 },
          newName: 'renamed',
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);
    logger.debug(`[rename-topology:local] ${JSON.stringify(result)}`);

    // A real WorkspaceEdit came back, scoped to the one file.
    const edit = result as {
      changes?: Record<
        string,
        Array<{
          range: { start: { line: number; character: number } };
          newText: string;
        }>
      >;
    } | null;
    expect(edit?.changes).toBeDefined();
    expect(Object.keys(edit!.changes!)).toEqual([LOCAL_URI]);

    const edits = edit!.changes![LOCAL_URI];
    // Declaration (line 2) + three usage tokens (line 3 twice, line 4 once).
    expect(edits.length).toBe(4);
    edits.forEach((e) => expect(e.newText).toBe('renamed'));

    const lines = edits.map((e) => e.range.start.line).sort((a, b) => a - b);
    expect(lines).toEqual([2, 3, 3, 4]);
    // The crux: other()'s same-named `total` (lines 7-8) is never touched.
    expect(edits.some((e) => e.range.start.line >= 7)).toBe(false);
  }, 120_000);

  it('rejects an invalid newName with an error result (W-23631080 validation)', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => SOURCES[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: LOCAL_URI,
            languageId: 'apex',
            version: 1,
            getText: () => LOCAL_SRC,
          },
          textDocument: { uri: LOCAL_URI },
          text: LOCAL_SRC,
        }),
      );

      // Cursor on compute()'s `total` usage (line 4, char 15), but try to rename
      // to a reserved word. The worker should return an error result, not null.
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('rename', {
          textDocument: { uri: LOCAL_URI },
          position: { line: 4, character: 15 },
          newName: 'class', // reserved keyword
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    // W-23631080: invalid newName produces a RenameErrorResult shape, not null.
    // The LCSAdapter handler converts this to a ResponseError at the connection
    // layer, but in this direct dispatcher test we see the raw error shape.
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('error');
    const errResult = result as { error: { code: number; message: string } };
    expect(errResult.error).toHaveProperty('code');
    expect(errResult.error).toHaveProperty('message');
    expect(errResult.error.message).toContain('keyword');
  }, 120_000);

  it('returns prepareRename info for a local variable (W-23631080)', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => SOURCES[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: LOCAL_URI,
            languageId: 'apex',
            version: 1,
            getText: () => LOCAL_SRC,
          },
          textDocument: { uri: LOCAL_URI },
          text: LOCAL_SRC,
        }),
      );

      // Cursor on compute()'s `total` USAGE (line 4, char 15). prepareRename
      // MUST return the range containing the cursor (the usage on line 4), NOT
      // the declaration — VS Code requires the returned range to contain the
      // cursor position or it rejects prepareRename.
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('prepareRename', {
          textDocument: { uri: LOCAL_URI },
          position: { line: 4, character: 15 },
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);
    logger.debug(`[prepare-rename:local-usage] ${JSON.stringify(result)}`);

    // W-23631080 review fix: prepareRename returns the range that CONTAINS
    // THE CURSOR, not necessarily the declaration. Cursor is on line 4 usage,
    // so the range must be on line 4.
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('range');
    expect(result).toHaveProperty('placeholder');
    const prepareInfo = result as {
      range: { start: { line: number; character: number } };
      placeholder: string;
    };
    expect(prepareInfo.range.start.line).toBe(4); // cursor-containing range
    expect(prepareInfo.placeholder).toBe('total');
  }, 120_000);

  it('returns cursor-containing range from prepareRename when cursor on declaration (W-23631080)', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => SOURCES[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: LOCAL_URI,
            languageId: 'apex',
            version: 1,
            getText: () => LOCAL_SRC,
          },
          textDocument: { uri: LOCAL_URI },
          text: LOCAL_SRC,
        }),
      );

      // Cursor on compute()'s `total` DECLARATION (line 2, char 16). prepareRename
      // should return the declaration range (which contains the cursor).
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('prepareRename', {
          textDocument: { uri: LOCAL_URI },
          position: { line: 2, character: 16 },
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);
    logger.debug(
      `[prepare-rename:local-declaration] ${JSON.stringify(result)}`,
    );

    // Cursor on declaration → range should be the declaration's range (line 2).
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('range');
    const prepareInfo = result as {
      range: { start: { line: number; character: number } };
      placeholder: string;
    };
    expect(prepareInfo.range.start.line).toBe(2);
    expect(prepareInfo.placeholder).toBe('total');
  }, 120_000);

  it('returns null from prepareRename for a non-local cursor (W-23631080)', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => SOURCES[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: LOCAL_URI,
            languageId: 'apex',
            version: 1,
            getText: () => LOCAL_SRC,
          },
          textDocument: { uri: LOCAL_URI },
          text: LOCAL_SRC,
        }),
      );

      // Cursor on the method name `compute` (line 1, char 20), which is NOT a
      // local — prepareRename should return null (not renamable as local).
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('prepareRename', {
          textDocument: { uri: LOCAL_URI },
          position: { line: 1, character: 20 },
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    // prepareRename returns null when the cursor isn't on a renamable local.
    expect(result).toBeNull();
  }, 120_000);
});
