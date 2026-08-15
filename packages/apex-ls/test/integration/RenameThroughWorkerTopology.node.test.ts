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

  it('returns null from prepareRename when the cursor is one past the identifier end', async () => {
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

      // Declaration line `        Integer total = 0;` (LSP line 2): `total`
      // occupies chars 16-20, so the half-open identifier range ends at
      // exclusive column 21 (the space before `=`). A cursor at char 21 sits
      // AFTER the identifier and must NOT resolve — this is the off-by-one the
      // `endColumn > cursorChar` (not `>=`) fix guards against.
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('prepareRename', {
          textDocument: { uri: LOCAL_URI },
          position: { line: 2, character: 21 },
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    expect(result).toBeNull();
  }, 120_000);

  // W-23631084: Field rename tests (4.1)
  describe('renameField cross-file with receiver-type disambiguation (W-23631084)', () => {
    // Account.cls declares a `total` field, used in Caller.cls as `acct.total`.
    const ACCOUNT_URI = 'file:///test/Account.cls';
    const ACCOUNT_SRC = `public class Account {
    public Integer total;

    public void increment() {
        total = total + 1;
    }
}`;

    // Caller.cls uses Account.total as `acct.total`.
    const CALLER_URI = 'file:///test/Caller.cls';
    const CALLER_SRC = `public class Caller {
    public void process() {
        Account acct = new Account();
        acct.total = 10;
        Integer x = acct.total;
    }
}`;

    // Other.cls has an unrelated `total` field that should NOT be renamed.
    const OTHER_URI = 'file:///test/Other.cls';
    const OTHER_SRC = `public class Other {
    public Integer total;

    public void use() {
        Other other = new Other();
        other.total = 99;
    }
}`;

    const FIELD_SOURCES: Record<string, string> = {
      [ACCOUNT_URI]: ACCOUNT_SRC,
      [CALLER_URI]: CALLER_SRC,
      [OTHER_URI]: OTHER_SRC,
    };

    it('renames a field across files, disambiguating by receiver type', async () => {
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
          (uri) => FIELD_SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        // Open all files.
        for (const uri of [ACCOUNT_URI, CALLER_URI, OTHER_URI]) {
          yield* Effect.promise(() =>
            dispatcher.dispatch('documentOpen', {
              document: {
                uri,
                languageId: 'apex',
                version: 1,
                getText: () => FIELD_SOURCES[uri],
              },
              textDocument: { uri },
              text: FIELD_SOURCES[uri],
            }),
          );
        }

        // Cursor on Account.total declaration (line 1, char 23).
        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: ACCOUNT_URI },
            position: { line: 1, character: 23 },
            newName: 'amount',
            content: ACCOUNT_SRC,
          }),
        );

        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);
      logger.debug(`[rename-field] ${JSON.stringify(result)}`);

      // A multi-file WorkspaceEdit came back.
      const edit = result as {
        changes?: Record<string, Array<{ range: any; newText: string }>>;
      } | null;
      expect(edit?.changes).toBeDefined();

      // Account.cls: declaration + implicit-this usages.
      const accountEdits = edit!.changes![ACCOUNT_URI];
      expect(accountEdits).toBeDefined();
      expect(accountEdits.length).toBeGreaterThan(0);
      accountEdits.forEach((e) => expect(e.newText).toBe('amount'));

      // Caller.cls: acct.total usages.
      const callerEdits = edit!.changes![CALLER_URI];
      expect(callerEdits).toBeDefined();
      expect(callerEdits.length).toBeGreaterThan(0);
      callerEdits.forEach((e) => expect(e.newText).toBe('amount'));

      // Other.cls: should NOT be renamed (different receiver type).
      const otherEdits = edit!.changes![OTHER_URI];
      expect(otherEdits).toBeUndefined();
    }, 120_000);

    it('does NOT rename unrelated fields with the same name (disambiguation crux)', async () => {
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
          (uri) => FIELD_SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        for (const uri of [ACCOUNT_URI, CALLER_URI, OTHER_URI]) {
          yield* Effect.promise(() =>
            dispatcher.dispatch('documentOpen', {
              document: {
                uri,
                languageId: 'apex',
                version: 1,
                getText: () => FIELD_SOURCES[uri],
              },
              textDocument: { uri },
              text: FIELD_SOURCES[uri],
            }),
          );
        }

        // Rename Other.total (not Account.total).
        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: OTHER_URI },
            position: { line: 1, character: 23 },
            newName: 'count',
            content: OTHER_SRC,
          }),
        );

        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);

      const edit = result as {
        changes?: Record<string, Array<{ range: any; newText: string }>>;
      } | null;
      expect(edit?.changes).toBeDefined();

      // Other.cls: should be renamed.
      const otherEdits = edit!.changes![OTHER_URI];
      expect(otherEdits).toBeDefined();
      expect(otherEdits.length).toBeGreaterThan(0);
      otherEdits.forEach((e) => expect(e.newText).toBe('count'));

      // Account.cls and Caller.cls: should NOT be renamed.
      expect(edit!.changes![ACCOUNT_URI]).toBeUndefined();
      expect(edit!.changes![CALLER_URI]).toBeUndefined();
    }, 120_000);

    it('handles implicit-this usage inside the declaring class', async () => {
      const IMPLICIT_URI = 'file:///test/ImplicitThis.cls';
      const IMPLICIT_SRC = `public class ImplicitThis {
    public Integer value;

    public void useIt() {
        value = 5;
        Integer x = value;
    }
}`;

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
        const dispatcher = makeWorkerDispatcher(topology, logger, (uri) =>
          uri === IMPLICIT_URI ? IMPLICIT_SRC : FIELD_SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        yield* Effect.promise(() =>
          dispatcher.dispatch('documentOpen', {
            document: {
              uri: IMPLICIT_URI,
              languageId: 'apex',
              version: 1,
              getText: () => IMPLICIT_SRC,
            },
            textDocument: { uri: IMPLICIT_URI },
            text: IMPLICIT_SRC,
          }),
        );

        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: IMPLICIT_URI },
            position: { line: 1, character: 23 },
            newName: 'newValue',
            content: IMPLICIT_SRC,
          }),
        );

        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);

      const edit = result as {
        changes?: Record<string, Array<{ range: any; newText: string }>>;
      } | null;
      expect(edit?.changes).toBeDefined();

      const edits = edit!.changes![IMPLICIT_URI];
      expect(edits).toBeDefined();
      // Declaration + 2 implicit-this usages.
      expect(edits.length).toBeGreaterThanOrEqual(3);
      edits.forEach((e) => expect(e.newText).toBe('newValue'));
    }, 120_000);

    it('rejects invalid newName for a field (W-23631084 validation)', async () => {
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
          (uri) => FIELD_SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        yield* Effect.promise(() =>
          dispatcher.dispatch('documentOpen', {
            document: {
              uri: ACCOUNT_URI,
              languageId: 'apex',
              version: 1,
              getText: () => ACCOUNT_SRC,
            },
            textDocument: { uri: ACCOUNT_URI },
            text: ACCOUNT_SRC,
          }),
        );

        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: ACCOUNT_URI },
            position: { line: 1, character: 23 },
            newName: 'class', // reserved keyword
            content: ACCOUNT_SRC,
          }),
        );

        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('error');
      const errResult = result as { error: { code: number; message: string } };
      expect(errResult.error).toHaveProperty('message');
      expect(errResult.error.message).toContain('keyword');
    }, 120_000);

    // W-23631084 review regression: renaming a field whose subclass references it
    // via `super.field` or a bare inherited access must DECLINE (no partial edit),
    // because the single-file standalone scan cannot resolve the subclass→ancestor
    // relationship and would otherwise rename the declaration while leaving the
    // subclass references dangling.
    it('declines renaming a field referenced by a subclass via super/inherited access', async () => {
      const BASE_URI = 'file:///test/Base.cls';
      const BASE_SRC = `public class Base {
    public Integer total;
}`;
      const CHILD_URI = 'file:///test/Child.cls';
      const CHILD_SRC = `public class Child extends Base {
    public void bump() {
        super.total = 1;
        total = total + 1;
    }
}`;
      const INHERIT_SOURCES: Record<string, string> = {
        [BASE_URI]: BASE_SRC,
        [CHILD_URI]: CHILD_SRC,
      };

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
          (uri) => INHERIT_SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        for (const uri of [BASE_URI, CHILD_URI]) {
          yield* Effect.promise(() =>
            dispatcher.dispatch('documentOpen', {
              document: {
                uri,
                languageId: 'apex',
                version: 1,
                getText: () => INHERIT_SOURCES[uri],
              },
              textDocument: { uri },
              text: INHERIT_SOURCES[uri],
            }),
          );
        }

        // Cursor on Base.total declaration (line 1, char 19).
        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: BASE_URI },
            position: { line: 1, character: 19 },
            newName: 'amount',
            content: BASE_SRC,
          }),
        );
        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);

      // Must decline with an error — NOT a partial WorkspaceEdit that renames
      // Base.total's declaration while leaving Child's super.total / bare total
      // dangling.
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('error');
      expect(result).not.toHaveProperty('changes');
      const errResult = result as { error: { code: number; message: string } };
      expect(errResult.error.message).toContain('Cannot safely rename');
    }, 120_000);
  });
});
