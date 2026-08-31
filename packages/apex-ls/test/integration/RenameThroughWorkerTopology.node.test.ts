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

  // W-23631087: prepareRename must recognize FIELDS, not just locals (else F2 on
  // a field won't open the box). Covers a declaration cursor AND a usage cursor.
  const PREP_FIELD_URI = 'file:///test/PrepareField.cls';
  const PREP_FIELD_SRC = `public class PrepareField {
    public Integer value;

    public void useIt() {
        value = 5;
        Integer x = value;
    }
}`;

  it('returns prepareRename range for a field DECLARATION cursor (W-23631087)', async () => {
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
        uri === PREP_FIELD_URI ? PREP_FIELD_SRC : undefined,
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: PREP_FIELD_URI,
            languageId: 'apex',
            version: 1,
            getText: () => PREP_FIELD_SRC,
          },
          textDocument: { uri: PREP_FIELD_URI },
          text: PREP_FIELD_SRC,
        }),
      );

      // `value` DECLARATION (LSP line 1, char 23) — exercises getSymbolAtPosition.
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('prepareRename', {
          textDocument: { uri: PREP_FIELD_URI },
          position: { line: 1, character: 23 },
          content: PREP_FIELD_SRC,
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);
    logger.debug(
      `[prepare-rename:field-declaration] ${JSON.stringify(result)}`,
    );

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('range');
    const prepareInfo = result as {
      range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
      placeholder: string;
    };
    // On LSP line 1, and the range must contain the cursor (char 23).
    expect(prepareInfo.range.start.line).toBe(1);
    expect(prepareInfo.range.end.line).toBe(1);
    expect(prepareInfo.range.start.character).toBeLessThanOrEqual(23);
    expect(prepareInfo.range.end.character).toBeGreaterThan(23);
    expect(prepareInfo.placeholder).toBe('value');
  }, 120_000);

  it('returns prepareRename range for a field USAGE cursor (W-23631087)', async () => {
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
        uri === PREP_FIELD_URI ? PREP_FIELD_SRC : undefined,
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: PREP_FIELD_URI,
            languageId: 'apex',
            version: 1,
            getText: () => PREP_FIELD_SRC,
          },
          textDocument: { uri: PREP_FIELD_URI },
          text: PREP_FIELD_SRC,
        }),
      );

      // `value` USAGE (LSP line 4, char 10) — must return the usage range, not the
      // declaration's (exercises exactCursorReference).
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('prepareRename', {
          textDocument: { uri: PREP_FIELD_URI },
          position: { line: 4, character: 10 },
          content: PREP_FIELD_SRC,
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);
    logger.debug(`[prepare-rename:field-usage] ${JSON.stringify(result)}`);

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('range');
    const prepareInfo = result as {
      range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
      placeholder: string;
    };
    // The usage is on LSP line 4, and the returned range must contain the cursor.
    expect(prepareInfo.range.start.line).toBe(4);
    expect(prepareInfo.range.end.line).toBe(4);
    expect(prepareInfo.range.start.character).toBeLessThanOrEqual(10);
    expect(prepareInfo.range.end.character).toBeGreaterThan(10);
    expect(prepareInfo.placeholder).toBe('value');
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

    it('renames despite an unrelated unparseable file that never mentions the field (W-23631084 review)', async () => {
      // renameField now scans EVERY stored doc (no raw-text prefilter). The
      // phase-2 "broken candidate → decline" guard is narrowed by a LEXER check:
      // a syntactically-broken file that does not even tokenize the field name
      // cannot reference it and must NOT block the rename. Here BrokenUnrelated
      // fails to parse and never mentions `total`, so Account.total still renames.
      const BROKEN_UNRELATED_URI = 'file:///test/BrokenUnrelated.cls';
      const BROKEN_UNRELATED_SRC = `public class BrokenUnrelated {
    public void oops() {
        Integer qty = ;
    }
}`;
      const sources: Record<string, string> = {
        [ACCOUNT_URI]: ACCOUNT_SRC,
        [BROKEN_UNRELATED_URI]: BROKEN_UNRELATED_SRC,
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
          (uri) => sources[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        for (const uri of [ACCOUNT_URI, BROKEN_UNRELATED_URI]) {
          yield* Effect.promise(() =>
            dispatcher.dispatch('documentOpen', {
              document: {
                uri,
                languageId: 'apex',
                version: 1,
                getText: () => sources[uri],
              },
              textDocument: { uri },
              text: sources[uri],
            }),
          );
        }

        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: ACCOUNT_URI },
            position: { line: 1, character: 23 }, // on Account.total decl
            newName: 'amount',
            content: ACCOUNT_SRC,
          }),
        );
        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);
      logger.debug(`[rename-field:broken-unrelated] ${JSON.stringify(result)}`);

      // The unrelated broken file did not force a decline — Account.total renamed.
      const edit = result as {
        changes?: Record<string, Array<{ range: any; newText: string }>>;
        error?: unknown;
      } | null;
      expect(edit?.error).toBeUndefined();
      expect(edit?.changes).toBeDefined();
      expect(edit!.changes![ACCOUNT_URI]).toBeDefined();
      expect(edit!.changes![BROKEN_UNRELATED_URI]).toBeUndefined();
    }, 120_000);

    it('declines while a workspace-load session is still active (W-23631084 review)', async () => {
      // During an active workspace-load session the data-owner store is only a
      // PARTIAL workspace: files referencing the field may not have arrived yet.
      // renameField must NOT treat the current store as the complete reference
      // set and edit the declaration (leaving not-yet-loaded references stale).
      // FindOccurrenceCandidates fails closed for skipTextFilter while a load
      // session is active, so the rename declines. LoadingBase is a plain final
      // class, so the local conflict fallback would otherwise proceed — this
      // proves the completeness guard, not the conflict check.
      const LOADING_BASE_URI = 'file:///test/LoadingBase.cls';
      const LOADING_BASE_SRC = `public class LoadingBase {
    public Integer total;

    public void bump() {
        total = total + 1;
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
          uri === LOADING_BASE_URI ? LOADING_BASE_SRC : undefined,
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        // Begin a workspace-load session and leave it ACTIVE (never drained).
        const session = dispatcher.createWorkspaceLoadSessionDispatcher();
        yield* Effect.promise(() =>
          session({
            _tag: 'BeginWorkspaceLoadSession',
            sessionId: 'active-load-rename-session',
          }),
        );

        // Rename LoadingBase.total using the live cursor buffer while the store
        // is mid-load (nothing else stored).
        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: LOADING_BASE_URI },
            position: { line: 1, character: 23 }, // on LoadingBase.total decl
            newName: 'amount',
            content: LOADING_BASE_SRC,
          }),
        );
        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);
      logger.debug(`[rename-field:active-load] ${JSON.stringify(result)}`);

      // Not a WorkspaceEdit — a RenameErrorResult declining while incomplete.
      const errorResult = result as {
        error?: { code: number; message: string };
        changes?: unknown;
      } | null;
      expect(errorResult?.changes).toBeUndefined();
      expect(errorResult?.error).toBeDefined();
      // Nit (W-23631084 review): assert this is the ACTIVE-LOAD guard, not any
      // error — key off its signal (-32600 + the active-load message) so a
      // regression or different decline path fails loudly.
      expect(errorResult?.error?.code).toBe(-32600);
      expect(errorResult?.error?.message).toMatch(
        /workspace load session still active/i,
      );
      expect(errorResult?.error?.message).toMatch(/incomplete/i);
    }, 120_000);

    it('declines rename when another file has an unprovable non-local receiver (W-23631086 #1)', async () => {
      // Renaming Other.total. Caller.cls contains `acct.total` where `acct` is
      // typed `Account` — a type NOT declared in Caller.cls. Standalone, this
      // parse cannot prove Account is outside Other's subtype cone (Account could
      // `extends Other` in Account.cls), so `acct.total` MIGHT be an inherited
      // Other.total. Renaming Other.total's declaration while dropping it would
      // emit a broken partial edit, so the whole rename must DECLINE rather than
      // silently skip the unprovable receiver. (Proving the cone needs the
      // data-owner hierarchy graph this pool path does not have.)
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

      // Declines with an error — never a partial WorkspaceEdit that renames
      // Other.total while leaving Caller's acct.total (an unprovable receiver)
      // dangling.
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('error');
      expect(result).not.toHaveProperty('changes');
      const errResult = result as { error: { code: number; message: string } };
      expect(errResult.error.message).toContain('Cannot safely rename');
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

    // W-23631086 review finding #2: the declaring-type anchor must be an FQN, not
    // the short type name. Two outer classes each hold an inner `Inner` with a
    // `total` field; renaming OuterOne.Inner.total must NOT touch
    // OuterTwo.Inner.total (the short name `Inner` is identical for both).
    it('does NOT rename a same-named inner field of a DIFFERENT outer class (FQN anchor)', async () => {
      const OUTER_ONE_URI = 'file:///test/OuterOne.cls';
      const OUTER_ONE_SRC = `public class OuterOne {
    public class Inner {
        public Integer total;
        public void f() {
            total = 1;
        }
    }
}`;
      const OUTER_TWO_URI = 'file:///test/OuterTwo.cls';
      const OUTER_TWO_SRC = `public class OuterTwo {
    public class Inner {
        public Integer total;
        public void f() {
            total = 2;
        }
    }
}`;
      const NESTED_SOURCES: Record<string, string> = {
        [OUTER_ONE_URI]: OUTER_ONE_SRC,
        [OUTER_TWO_URI]: OUTER_TWO_SRC,
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
          (uri) => NESTED_SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        for (const uri of [OUTER_ONE_URI, OUTER_TWO_URI]) {
          yield* Effect.promise(() =>
            dispatcher.dispatch('documentOpen', {
              document: {
                uri,
                languageId: 'apex',
                version: 1,
                getText: () => NESTED_SOURCES[uri],
              },
              textDocument: { uri },
              text: NESTED_SOURCES[uri],
            }),
          );
        }

        // Cursor on OuterOne.Inner.total declaration (line 2, char 24).
        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: OUTER_ONE_URI },
            position: { line: 2, character: 24 },
            newName: 'amount',
            content: OUTER_ONE_SRC,
          }),
        );
        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);
      logger.debug(`[rename-field:nested-fqn] ${JSON.stringify(result)}`);

      const edit = result as {
        changes?: Record<string, Array<{ range: any; newText: string }>>;
      } | null;
      expect(edit?.changes).toBeDefined();

      // OuterOne.cls is renamed (declaration + implicit-this usage).
      const oneEdits = edit!.changes![OUTER_ONE_URI];
      expect(oneEdits).toBeDefined();
      expect(oneEdits.length).toBeGreaterThan(0);
      // OuterTwo.cls's same-named inner field must be untouched.
      expect(edit!.changes![OUTER_TWO_URI]).toBeUndefined();
    }, 120_000);

    // W-23631084 P1: an IN-FILE-resolvable static qualifier (`Account.total`
    // inside a NESTED class of `Account`) must be renamed end-to-end without a
    // partial/corrupt edit. The parser emits the qualifier as a CLASS_REFERENCE
    // co-located at the field token (not a VARIABLE_USAGE), which findFieldOccurrences
    // now recognizes as a static access of the declaring type. Before the fix this
    // access was dropped (classified implicit-`this` on the unrelated enclosing
    // Helper), so renaming the declaration left `Account.total` dangling.
    it('renames an inner-class access of the OUTER type static field (no partial edit)', async () => {
      const OUTER_STATIC_URI = 'file:///test/OuterStatic.cls';
      const OUTER_STATIC_SRC = `public class Account {
    public static Integer total;
    public class Helper {
        void m() {
            Account.total = 5;
        }
    }
}`;
      const sources: Record<string, string> = {
        [OUTER_STATIC_URI]: OUTER_STATIC_SRC,
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
          (uri) => sources[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        yield* Effect.promise(() =>
          dispatcher.dispatch('documentOpen', {
            document: {
              uri: OUTER_STATIC_URI,
              languageId: 'apex',
              version: 1,
              getText: () => OUTER_STATIC_SRC,
            },
            textDocument: { uri: OUTER_STATIC_URI },
            text: OUTER_STATIC_SRC,
          }),
        );

        // Cursor on the Account.total declaration (line 1, char 26 = `total`).
        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: OUTER_STATIC_URI },
            position: { line: 1, character: 26 },
            newName: 'amount',
            content: OUTER_STATIC_SRC,
          }),
        );
        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);
      logger.debug(`[rename-field:outer-static] ${JSON.stringify(result)}`);

      // A WorkspaceEdit came back (NOT a decline / error).
      const edit = result as {
        changes?: Record<string, Array<{ range: any; newText: string }>>;
        error?: unknown;
      } | null;
      expect(edit?.error).toBeUndefined();
      expect(edit?.changes).toBeDefined();

      const edits = edit!.changes![OUTER_STATIC_URI];
      expect(edits).toBeDefined();
      // Declaration (line 1) + the static `Account.total` access inside Helper
      // (line 4) are both renamed — the inner-class access is NOT dangled.
      expect(edits.length).toBeGreaterThanOrEqual(2);
      edits.forEach((e) => expect(e.newText).toBe('amount'));
      expect(edits.some((e) => e.range.start.line === 4)).toBe(true);
    }, 120_000);

    // W-23631086 review finding #5: the cursor URI must ALWAYS be scanned with
    // the live buffer, even when the data-owner does not return it as a stored
    // candidate. Rename now requests the FULL stored document set (skipTextFilter,
    // W-23631084 review), but the cursor file can still be ABSENT from the store —
    // an unsaved/newly-modified buffer that was never documentOpen'd. An empty (or
    // cursor-less) stored set is NOT a decline: the live cursor buffer is inserted
    // and scanned, so its implicit-this usages are still found and renamed.
    it('scans the cursor buffer even when absent from the candidate set', async () => {
      const UNOPENED_URI = 'file:///test/Unopened.cls';
      const UNOPENED_SRC = `public class Unopened {
    public Integer total;

    public void bump() {
        total = total + 1;
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
          uri === UNOPENED_URI ? UNOPENED_SRC : FIELD_SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        // Deliberately do NOT documentOpen UNOPENED_URI — it is absent from the
        // data-owner store, so the document-set query cannot return it. Its
        // occurrences must still be found via the inserted live cursor buffer.
        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: UNOPENED_URI },
            position: { line: 1, character: 23 }, // on `total` declaration
            newName: 'amount',
            content: UNOPENED_SRC,
          }),
        );
        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);
      logger.debug(`[rename-field:cursor-absent] ${JSON.stringify(result)}`);

      const edit = result as {
        changes?: Record<string, Array<{ range: any; newText: string }>>;
      } | null;
      expect(edit?.changes).toBeDefined();

      // The cursor file's declaration + two implicit-this usages are renamed,
      // even though the data owner never returned it as a stored candidate.
      const edits = edit!.changes![UNOPENED_URI];
      expect(edits).toBeDefined();
      expect(edits.length).toBeGreaterThanOrEqual(3);
      edits.forEach((e) => expect(e.newText).toBe('amount'));
    }, 120_000);

    // W-23631086 review finding #2: CompilerService.compile RECOVERS from
    // malformed Apex — it returns a partial SymbolTable plus a non-empty errors
    // array rather than throwing. A candidate that lexically mentions the field
    // but failed to parse cleanly may have DROPPED the occurrence we need to
    // rewrite, so its symbol table is an incomplete semantic view. The rename
    // must decline (not silently skip it and emit a partial edit) even though no
    // exception is thrown.
    it('declines when a candidate file compiles with parser errors (diagnostic path)', async () => {
      const CLEAN_URI = 'file:///test/CleanField.cls';
      const CLEAN_SRC = `public class CleanField {
    public Integer total;
}`;
      // Broken.cls lexically contains `total` but does not parse cleanly (missing
      // semicolon + malformed method), so compile returns errors and a partial
      // table in which the `total` reference may be absent.
      const BROKEN_URI = 'file:///test/Broken.cls';
      const BROKEN_SRC = `public class Broken {
    public void oops() {
        Integer total = 1
        total = total +
    }
`;
      const BROKEN_SOURCES: Record<string, string> = {
        [CLEAN_URI]: CLEAN_SRC,
        [BROKEN_URI]: BROKEN_SRC,
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
          (uri) => BROKEN_SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        for (const uri of [CLEAN_URI, BROKEN_URI]) {
          yield* Effect.promise(() =>
            dispatcher.dispatch('documentOpen', {
              document: {
                uri,
                languageId: 'apex',
                version: 1,
                getText: () => BROKEN_SOURCES[uri],
              },
              textDocument: { uri },
              text: BROKEN_SOURCES[uri],
            }),
          );
        }

        // Rename CleanField.total — Broken.cls is a candidate (mentions `total`)
        // but compiles with errors.
        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: CLEAN_URI },
            position: { line: 1, character: 19 }, // on `total` declaration
            newName: 'amount',
            content: CLEAN_SRC,
          }),
        );
        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);
      logger.debug(`[rename-field:broken-candidate] ${JSON.stringify(result)}`);

      // Declines with an error — never a partial edit that renames the clean
      // declaration while the broken candidate's occurrences go unanalyzed.
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('error');
      expect(result).not.toHaveProperty('changes');
      const errResult = result as { error: { code: number; message: string } };
      expect(errResult.error.message).toContain('Cannot safely rename');
    }, 120_000);

    it('declines when a candidate references the field via a method-result receiver (W-23631084)', async () => {
      const ACCOUNT_URI = 'file:///test/AccountMr.cls';
      const ACCOUNT_SRC = `public class AccountMr {
    public Integer total;
}`;
      // Caller reaches the field through a method RESULT (`getAccount().total`),
      // a qualified access whose receiver type cannot be proven standalone. It
      // must be classified unsafe so the whole rename declines — never a partial
      // edit that renames the declaration and leaves this reference dangling.
      const CALLER_URI = 'file:///test/CallerMr.cls';
      const CALLER_SRC = `public class CallerMr {
    public AccountMr getAccount() { return null; }
    public void use() {
        Integer x = getAccount().total;
    }
}`;
      const SOURCES: Record<string, string> = {
        [ACCOUNT_URI]: ACCOUNT_SRC,
        [CALLER_URI]: CALLER_SRC,
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
          (uri) => SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        for (const uri of [ACCOUNT_URI, CALLER_URI]) {
          yield* Effect.promise(() =>
            dispatcher.dispatch('documentOpen', {
              document: {
                uri,
                languageId: 'apex',
                version: 1,
                getText: () => SOURCES[uri],
              },
              textDocument: { uri },
              text: SOURCES[uri],
            }),
          );
        }

        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: ACCOUNT_URI },
            position: { line: 1, character: 19 }, // on `total` declaration
            newName: 'amount',
            content: ACCOUNT_SRC,
          }),
        );
        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);
      logger.debug(`[rename-field:method-receiver] ${JSON.stringify(result)}`);

      // Declines with an error — never a partial edit that renames the
      // declaration while `getAccount().total` is left dangling.
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('error');
      expect(result).not.toHaveProperty('changes');
      const errResult = result as { error: { code: number; message: string } };
      expect(errResult.error.message).toContain('Cannot safely rename');
    }, 120_000);

    it('declines when a candidate references the field via a constructor-result receiver (W-23631084)', async () => {
      const ACCOUNT_URI = 'file:///test/AccountCr.cls';
      const ACCOUNT_SRC = `public class AccountCr {
    public Integer total;
}`;
      // Caller reaches the field through a CONSTRUCTOR result
      // (`new AccountCr().total`). The parser now represents this as a multi-hop
      // chain leaf that cannot be attributed standalone, so the whole rename must
      // decline — never a declaration-only partial edit that dangles this
      // reference.
      const CALLER_URI = 'file:///test/CallerCr.cls';
      const CALLER_SRC = `public class CallerCr {
    public void use() {
        Integer x = new AccountCr().total;
    }
}`;
      const SOURCES: Record<string, string> = {
        [ACCOUNT_URI]: ACCOUNT_SRC,
        [CALLER_URI]: CALLER_SRC,
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
          (uri) => SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        for (const uri of [ACCOUNT_URI, CALLER_URI]) {
          yield* Effect.promise(() =>
            dispatcher.dispatch('documentOpen', {
              document: {
                uri,
                languageId: 'apex',
                version: 1,
                getText: () => SOURCES[uri],
              },
              textDocument: { uri },
              text: SOURCES[uri],
            }),
          );
        }

        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: ACCOUNT_URI },
            position: { line: 1, character: 19 }, // on `total` declaration
            newName: 'amount',
            content: ACCOUNT_SRC,
          }),
        );
        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);
      logger.debug(`[rename-field:ctor-receiver] ${JSON.stringify(result)}`);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('error');
      expect(result).not.toHaveProperty('changes');
      const errResult = result as { error: { code: number; message: string } };
      expect(errResult.error.message).toContain('Cannot safely rename');
    }, 120_000);
  });

  describe('renameField hierarchy conflict detection (W-23631086)', () => {
    // A class with TWO fields: renaming one to the other's name is a same-type
    // declaration collision — CheckMemberConflicts (4.0) must reject it.
    const CONFLICT_URI = 'file:///test/ConflictSample.cls';
    const CONFLICT_SRC = `public class ConflictSample {
    public Integer total;
    public Integer amount;

    public void use() {
        total = 1;
        amount = 2;
    }
}`;

    const CONFLICT_SOURCES: Record<string, string> = {
      [CONFLICT_URI]: CONFLICT_SRC,
    };

    const runRename = (newName: string) =>
      Effect.gen(function* () {
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
          (uri) => CONFLICT_SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        yield* Effect.promise(() =>
          dispatcher.dispatch('documentOpen', {
            document: {
              uri: CONFLICT_URI,
              languageId: 'apex',
              version: 1,
              getText: () => CONFLICT_SRC,
            },
            textDocument: { uri: CONFLICT_URI },
            text: CONFLICT_SRC,
          }),
        );

        // Cursor on the `total` field declaration (line 1, char 19).
        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: CONFLICT_URI },
            position: { line: 1, character: 19 },
            newName,
            content: CONFLICT_SRC,
          }),
        );
        return { result };
      }).pipe(Effect.scoped);

    it('rejects a rename that collides with a same-type field', async () => {
      // Renaming `total` → `amount` collides with the sibling field `amount`.
      const { result } = await Effect.runPromise(runRename('amount'));

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('error');
      const errResult = result as { error: { code: number; message: string } };
      expect(errResult.error).toHaveProperty('message');
      // The message names the colliding new name; it is NOT a WorkspaceEdit.
      expect(errResult.error.message).toContain('amount');
      expect(result).not.toHaveProperty('changes');
    }, 120_000);

    it('allows a rename to a non-colliding name', async () => {
      // `quantity` collides with nothing → a real WorkspaceEdit, no error.
      const { result } = await Effect.runPromise(runRename('quantity'));

      const edit = result as {
        changes?: Record<string, unknown>;
        error?: unknown;
      } | null;
      expect(edit).not.toBeNull();
      expect(edit?.error).toBeUndefined();
      expect(edit?.changes).toBeDefined();
      expect(Object.keys(edit!.changes!)).toContain(CONFLICT_URI);
    }, 120_000);

    // W-23631086 review (P1): when CheckMemberConflicts (4.0) is UNAVAILABLE —
    // the declaring type never reached the data-owner store because it was never
    // documentOpen'd — the query FAILS CLOSED (rejects). The old catch failed
    // OPEN and proceeded, but the Stage 6 occurrence scan only classifies
    // REFERENCES, so renaming `total`→`amount` in a class that already declares
    // BOTH would have minted a duplicate `amount` declaration. The catch now runs
    // a local, parser-owned same-type check against the live cursor buffer and
    // DECLINES, so NO WorkspaceEdit is produced.
    it('declines a same-type collision when the conflict query is unavailable', async () => {
      const UNSTORED_URI = 'file:///test/UnstoredConflict.cls';
      // Plain class (not virtual/abstract, no extends/implements) declaring BOTH
      // `total` and `amount`. Deliberately NOT documentOpen'd below.
      const UNSTORED_SRC = `public class UnstoredConflict {
    public Integer total;
    public Integer amount;

    public void use() {
        total = 1;
        amount = 2;
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
          uri === UNSTORED_URI ? UNSTORED_SRC : CONFLICT_SOURCES[uri],
        );
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        // Deliberately do NOT documentOpen UNSTORED_URI — it never reaches the
        // data-owner store, so CheckMemberConflicts rejects and the catch runs
        // the local parser-owned check against the live buffer below.
        const result = yield* Effect.promise(() =>
          dispatcher.dispatch('rename', {
            textDocument: { uri: UNSTORED_URI },
            position: { line: 1, character: 19 }, // on `total` declaration
            newName: 'amount',
            content: UNSTORED_SRC,
          }),
        );
        return { result };
      }).pipe(Effect.scoped);

      const { result } = await Effect.runPromise(program);
      logger.debug(
        `[rename-field:unstored-same-type-collision] ${JSON.stringify(result)}`,
      );

      // Same-type collision detected locally → RenameErrorResult, no edit.
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('error');
      const errResult = result as { error: { code: number; message: string } };
      expect(errResult.error.code).toBe(-32600);
      expect(errResult.error.message).toContain('amount');
      expect(result).not.toHaveProperty('changes');
    }, 120_000);
  });
});
