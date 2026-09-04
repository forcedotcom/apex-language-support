/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * renameMethod worker-topology tests (W-23631132 / WI 5.2, slice 4).
 *
 * Exercises resolveMethodRename end-to-end across the worker boundary:
 *   dispatch('rename') → request-pool `DispatchRename` handler →
 *   data-owner assist `dataOwner:ResolveMethodRenameFamily` (family cone +
 *   override declaration sites) → per-candidate `findMethodOccurrences` scan →
 *   multi-file WorkspaceEdit (declaration + all calls + every override decl).
 *
 * The KEY proof is the cross-file OVERRIDE case: renaming a base method must
 * also rewrite each subclass/implementor override DECLARATION, which is only
 * discoverable from the data-owner's COMPLETE inheritance cone. That cone only
 * exists after a full workspace load (Begin → ingest → compile → Drain) — plain
 * documentOpen does NOT resolve cross-file override edges — so this suite copies
 * CheckMemberConflicts' SUITE-LEVEL setup: one Scope-owned topology + one
 * ingested/compiled/drained workspace built in `beforeAll`. Each test then
 * dispatches a single pool rename via the production mediator (required so the
 * pool's requestCoordinatorAssistance reaches the data-owner assist).
 *
 * Every fixture uses a unique type name and a unique target method name so all
 * fixtures coexist in ONE workspace without cross-contamination.
 */

import * as path from 'node:path';
import { Effect, Exit, Scope } from 'effect';
import {
  getLogger,
  setLogLevel,
  type LoggerInterface,
  type WorkerRole,
} from '@salesforce/apex-lsp-shared';
import {
  clearRawWorkers,
  initializeTopology,
  makeNodeWorkerLayer,
  makeWorkerDispatcher,
  getRawWorkers,
  getAssistancePorts,
  getWorkerNames,
  runRemoteStdlibWarmupPhase,
  type WorkerTopology,
} from '../../src/server/WorkerCoordinator';
import { CoordinatorAssistanceMediator } from '../../src/server/CoordinatorAssistanceMediator';
import { createPrimaryAssistanceHandler } from '../../src/server/CoordinatorPrimaryAssistanceHandler';
import { ResourceLoaderProxy } from '../../src/server/ResourceLoaderProxy';

const WORKER_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const COMPILATION_POOL_SIZE = 2;
const SESSION_ID = 'rename-method-shared-session';

const workerLayerFactory = (role: WorkerRole) =>
  makeNodeWorkerLayer(WORKER_ENTRY, {
    name: `test-${role}`,
    execArgv: ['--import', 'tsx'],
    workerData: {
      role,
      compilationPoolSize: COMPILATION_POOL_SIZE,
      compilationConcurrency: 1,
    },
  });

// --- Fixtures ---------------------------------------------------------------
// Cursor positions are LSP 0-based {line, character}, placed INSIDE the method-
// name token (columns computed against the raw source below).

// Case 1: cross-file override. RmBase.run() is overridden by RmChild.run().
const RM_BASE_URI = 'file:///test/RmBase.cls';
const RM_BASE_SRC = `public virtual class RmBase {
    public virtual void run() { }
}`;
const RM_CHILD_URI = 'file:///test/RmChild.cls';
const RM_CHILD_SRC = `public class RmChild extends RmBase {
    public override void run() { }
}`;

// Case 2: interface implementer. RmGreeter implements RmIGreeter.greet().
const RM_IGREETER_URI = 'file:///test/RmIGreeter.cls';
const RM_IGREETER_SRC = `public interface RmIGreeter {
    void greet();
}`;
const RM_GREETER_URI = 'file:///test/RmGreeter.cls';
const RM_GREETER_SRC = `public class RmGreeter implements RmIGreeter {
    public void greet() { }
}`;

// Case 3: static method (no family cone) + an in-class call.
const RM_UTIL_URI = 'file:///test/RmUtil.cls';
const RM_UTIL_SRC = `public class RmUtil {
    public static Integer compute() { return 1; }
    public static Integer caller() { return compute(); }
}`;

// Case 4: overload disambiguation — rename the 0-arg m() only.
const RM_OVERLOAD_URI = 'file:///test/RmOverload.cls';
const RM_OVERLOAD_SRC = `public class RmOverload {
    public void m() { }
    public void m(Integer x) { }
    public void caller() { m(); }
}`;

// Case 5: unsafe method-result receiver → decline.
const RM_PRODUCT_URI = 'file:///test/RmProduct.cls';
const RM_PRODUCT_SRC = `public class RmProduct {
    public void ship() { }
}`;
const RM_FACTORY_URI = 'file:///test/RmFactory.cls';
const RM_FACTORY_SRC = `public class RmFactory {
    public RmProduct build() { return new RmProduct(); }
    public void go() { build().ship(); }
}`;

// Case 6 (review P1): cross-file SAME-ARITY overloads. Renaming pick(Integer)
// must decline because a caller's untyped same-arity call pick('hi') could bind
// the OTHER overload, and argumentTypes are never populated to disambiguate.
const RM_SVC_URI = 'file:///test/RmSvc.cls';
const RM_SVC_SRC = `public class RmSvc {
    public void pick(Integer a) { }
    public void pick(String a) { }
}`;
const RM_SVCCALLER_URI = 'file:///test/RmSvcCaller.cls';
const RM_SVCCALLER_SRC = `public class RmSvcCaller {
    public void run(RmSvc s) { s.pick('hi'); }
}`;

// Case 7 (review P2): SIBLING override with no calls. Renaming from the mid-cone
// override RmCircle.draw must also rename the sibling RmSquare.draw declaration
// (both override RmShape.draw), not silently leave it behind.
const RM_SHAPE_URI = 'file:///test/RmShape.cls';
const RM_SHAPE_SRC = `public virtual class RmShape {
    public virtual void draw() { }
}`;
const RM_CIRCLE_URI = 'file:///test/RmCircle.cls';
const RM_CIRCLE_SRC = `public class RmCircle extends RmShape {
    public override void draw() { }
}`;
const RM_SQUARE_URI = 'file:///test/RmSquare.cls';
const RM_SQUARE_SRC = `public class RmSquare extends RmShape {
    public override void draw() { }
}`;

const SOURCES: Record<string, string> = {
  [RM_BASE_URI]: RM_BASE_SRC,
  [RM_CHILD_URI]: RM_CHILD_SRC,
  [RM_IGREETER_URI]: RM_IGREETER_SRC,
  [RM_GREETER_URI]: RM_GREETER_SRC,
  [RM_UTIL_URI]: RM_UTIL_SRC,
  [RM_OVERLOAD_URI]: RM_OVERLOAD_SRC,
  [RM_PRODUCT_URI]: RM_PRODUCT_SRC,
  [RM_FACTORY_URI]: RM_FACTORY_SRC,
  [RM_SVC_URI]: RM_SVC_SRC,
  [RM_SVCCALLER_URI]: RM_SVCCALLER_SRC,
  [RM_SHAPE_URI]: RM_SHAPE_SRC,
  [RM_CIRCLE_URI]: RM_CIRCLE_SRC,
  [RM_SQUARE_URI]: RM_SQUARE_SRC,
};

const WORKSPACE_ENTRIES = Object.entries(SOURCES).map(([uri, content]) => ({
  uri,
  content,
  languageId: 'apex' as const,
  version: 1,
}));

const stubConnection = {
  sendRequest: async () => null,
  sendNotification: async () => undefined,
};

// Copied from RenameThroughWorkerTopology: wires the pool's assistance channel
// to the data owner so `dataOwner:ResolveMethodRenameFamily` / `...Candidates`
// requests are answered via queryDataOwner.
function wireProductionMediator(
  topology: WorkerTopology,
  dispatcher: ReturnType<typeof makeWorkerDispatcher>,
  logger: LoggerInterface,
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

type EditList = Array<{
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}>;
type RenameResult = {
  changes?: Record<string, EditList>;
  error?: { code: number; message: string };
} | null;

describe('renameMethod through the worker topology (W-23631132, slice 4)', () => {
  let logger: LoggerInterface;
  let scope: Scope.CloseableScope;
  let dispatcher: ReturnType<typeof makeWorkerDispatcher>;

  beforeAll(async () => {
    setLogLevel('error');
    logger = getLogger();

    // Long-lived, suite-owned scope keeps the workers alive across every test.
    scope = Effect.runSync(Scope.make());

    const setup = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        logger,
        logLevel: 'error',
        workerLayerFactory,
      });
      const d = makeWorkerDispatcher(topology, logger, (uri) => SOURCES[uri]);
      wireProductionMediator(topology, d, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      const session = d.createWorkspaceLoadSessionDispatcher();
      const ingest = d.createBatchIngestionDispatcher();
      const compile = d.createDataOwnerCompileDispatcher();

      // Begin → ingest → compile → Drain builds the COMPLETE inheritance cone,
      // so cross-file override / implementor edges resolve.
      yield* Effect.promise(() =>
        session({ _tag: 'BeginWorkspaceLoadSession', sessionId: SESSION_ID }),
      );
      yield* Effect.promise(() => ingest(SESSION_ID, WORKSPACE_ENTRIES));
      yield* Effect.promise(() =>
        compile({ sessionId: SESSION_ID, entries: WORKSPACE_ENTRIES }),
      );
      yield* Effect.promise(() =>
        session({ _tag: 'DrainDeferredReferences', sessionId: SESSION_ID }),
      );
      return d;
    });

    dispatcher = await Effect.runPromise(
      Effect.provideService(setup, Scope.Scope, scope),
    );
  }, 120_000);

  afterAll(async () => {
    if (scope) {
      await Effect.runPromise(Scope.close(scope, Exit.void));
    }
    clearRawWorkers();
  }, 30_000);

  // Dispatch a single pool rename with the cursor file's live buffer content.
  const rename = (
    uri: string,
    position: { line: number; character: number },
    newName: string,
  ): Promise<RenameResult> =>
    dispatcher.dispatch('rename', {
      textDocument: { uri },
      position,
      newName,
      content: SOURCES[uri],
    }) as Promise<RenameResult>;

  it('renames a base method AND its cross-file override declaration', async () => {
    // Cursor on RmBase.run declaration (LSP line 1, char 25 — inside `run`).
    const result = await rename(
      RM_BASE_URI,
      { line: 1, character: 25 },
      'execute',
    );
    logger.debug(`[rename-method:override] ${JSON.stringify(result)}`);

    expect(result?.error).toBeUndefined();
    expect(result?.changes).toBeDefined();
    const changes = result!.changes!;
    // BOTH the base and the child override declaration files are edited.
    expect(Object.keys(changes).sort()).toEqual(
      [RM_BASE_URI, RM_CHILD_URI].sort(),
    );

    // Base: the `run` declaration on line 1 is renamed to `execute`.
    const baseEdits = changes[RM_BASE_URI];
    expect(baseEdits.length).toBeGreaterThan(0);
    baseEdits.forEach((e) => expect(e.newText).toBe('execute'));
    expect(baseEdits.some((e) => e.range.start.line === 1)).toBe(true);

    // KEY PROOF: the child OVERRIDE DECLARATION (line 1 of RmChild) is renamed.
    const childEdits = changes[RM_CHILD_URI];
    expect(childEdits.length).toBeGreaterThan(0);
    childEdits.forEach((e) => expect(e.newText).toBe('execute'));
    expect(childEdits.some((e) => e.range.start.line === 1)).toBe(true);
  }, 120_000);

  it('renames an interface method AND its implementor declaration', async () => {
    // Cursor on RmIGreeter.greet declaration (LSP line 1, char 11).
    const result = await rename(
      RM_IGREETER_URI,
      { line: 1, character: 11 },
      'hail',
    );
    logger.debug(`[rename-method:interface] ${JSON.stringify(result)}`);

    expect(result?.error).toBeUndefined();
    expect(result?.changes).toBeDefined();
    const changes = result!.changes!;
    // Both the interface declaration and the implementor declaration renamed.
    expect(changes[RM_IGREETER_URI]).toBeDefined();
    expect(changes[RM_GREETER_URI]).toBeDefined();
    expect(changes[RM_IGREETER_URI].every((e) => e.newText === 'hail')).toBe(
      true,
    );
    expect(changes[RM_GREETER_URI].every((e) => e.newText === 'hail')).toBe(
      true,
    );
  }, 120_000);

  it('renames a static method declaration and its in-class call (no cone)', async () => {
    // Cursor on RmUtil.compute declaration (LSP line 1, char 29).
    const result = await rename(
      RM_UTIL_URI,
      { line: 1, character: 29 },
      'calc',
    );
    logger.debug(`[rename-method:static] ${JSON.stringify(result)}`);

    expect(result?.error).toBeUndefined();
    expect(result?.changes).toBeDefined();
    const changes = result!.changes!;
    // Static method: family is the declaring type alone — only RmUtil edited.
    expect(Object.keys(changes)).toEqual([RM_UTIL_URI]);
    const edits = changes[RM_UTIL_URI];
    // Declaration (line 1) + the compute() call (line 2).
    expect(edits.length).toBeGreaterThanOrEqual(2);
    edits.forEach((e) => expect(e.newText).toBe('calc'));
    expect(edits.some((e) => e.range.start.line === 1)).toBe(true);
    expect(edits.some((e) => e.range.start.line === 2)).toBe(true);
  }, 120_000);

  it('renames only the 0-arg overload, leaving m(Integer x) untouched', async () => {
    // Cursor on the 0-arg m() declaration (LSP line 1, char 16).
    const result = await rename(
      RM_OVERLOAD_URI,
      { line: 1, character: 16 },
      'run',
    );
    logger.debug(`[rename-method:overload] ${JSON.stringify(result)}`);

    expect(result?.error).toBeUndefined();
    expect(result?.changes).toBeDefined();
    const edits = result!.changes![RM_OVERLOAD_URI];
    expect(edits).toBeDefined();
    edits.forEach((e) => expect(e.newText).toBe('run'));
    // The 0-arg declaration (line 1) and its call in caller() (line 3) renamed.
    expect(edits.some((e) => e.range.start.line === 1)).toBe(true);
    expect(edits.some((e) => e.range.start.line === 3)).toBe(true);
    // The m(Integer x) declaration (line 2) is NOT renamed (arity distinguishes).
    expect(edits.some((e) => e.range.start.line === 2)).toBe(false);
  }, 120_000);

  it('declines when a candidate reaches the method via a method-result receiver', async () => {
    // Cursor on RmProduct.ship declaration (LSP line 1, char 17). RmFactory's
    // `build().ship()` is a method-result receiver that cannot be proven
    // standalone → the whole rename must decline (no partial edit).
    const result = await rename(
      RM_PRODUCT_URI,
      { line: 1, character: 17 },
      'deliver',
    );
    logger.debug(`[rename-method:decline] ${JSON.stringify(result)}`);

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('error');
    expect(result).not.toHaveProperty('changes');
    expect(result!.error!.code).toBe(-32600);
    expect(typeof result!.error!.message).toBe('string');
    expect(result!.error!.message.length).toBeGreaterThan(0);
  }, 120_000);

  it('declines a cross-file untyped call to a same-arity overload (review P1)', async () => {
    // Cursor on RmSvc.pick(Integer) declaration (LSP line 1, char 18). RmSvc
    // declares two arity-1 overloads; RmSvcCaller's `s.pick('hi')` is untyped
    // (argumentTypes never populated) so it could bind pick(String). The family
    // is arity-ambiguous, so the whole rename must DECLINE — never silently
    // rewrite that call while leaving pick(String) behind.
    const result = await rename(
      RM_SVC_URI,
      { line: 1, character: 18 },
      'choose',
    );
    logger.debug(
      `[rename-method:overload-crossfile] ${JSON.stringify(result)}`,
    );

    expect(result).not.toBeNull();
    expect(result).toHaveProperty('error');
    expect(result).not.toHaveProperty('changes');
    expect(result!.error!.code).toBe(-32600);
    expect(result!.error!.message.length).toBeGreaterThan(0);
  }, 120_000);

  it('renames a SIBLING override declaration with no calls (review P2)', async () => {
    // Cursor on the mid-cone override RmCircle.draw (LSP line 1, char 27).
    // RmSquare.draw is a SIBLING override (both extend RmShape) with no call
    // sites — it must still be renamed, not silently left behind.
    const result = await rename(
      RM_CIRCLE_URI,
      { line: 1, character: 27 },
      'render',
    );
    logger.debug(`[rename-method:sibling] ${JSON.stringify(result)}`);

    expect(result?.error).toBeUndefined();
    expect(result?.changes).toBeDefined();
    const changes = result!.changes!;
    // All three override declarations renamed — including the sibling RmSquare.
    expect(changes[RM_SHAPE_URI]).toBeDefined();
    expect(changes[RM_CIRCLE_URI]).toBeDefined();
    expect(changes[RM_SQUARE_URI]).toBeDefined();
    Object.values(changes)
      .flat()
      .forEach((e) => expect(e.newText).toBe('render'));
  }, 120_000);
});
