/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * CheckMemberConflicts data-owner query tests (W-23631128 / WI 4.0).
 *
 * Tests the hierarchy-aware member-name conflict check for rename validation.
 * Covers all three verdict types (same-type, ancestor, descendant) plus the
 * private-field gating rules and case-insensitivity per jorje parity spec.
 */

import * as path from 'node:path';
import { Effect } from 'effect';
import {
  getLogger,
  setLogLevel,
  type LoggerInterface,
} from '@salesforce/apex-lsp-shared';
import {
  clearRawWorkers,
  initializeTopology,
  makeNodeWorkerLayer,
  makeWorkerDispatcher,
} from '../../src/server/WorkerCoordinator';

const WORKER_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const COMPILATION_POOL_SIZE = 2;

// Test fixtures covering the hierarchy conflict scenarios

// base class with a field named 'existing'
const BASE_URI = 'file:///test/base.cls';
const BASE_SRC = `public class base {
    public String existing;
    private String privateField;
}`;

// middle class extends base, has its own field
const MIDDLE_URI = 'file:///test/middle.cls';
const MIDDLE_SRC = `public class middle extends base {
    public String middleField;
    public String targetField;
}`;

// child class extends middle
const CHILD_URI = 'file:///test/child.cls';
const CHILD_SRC = `public class child extends middle {
    public String childField;
}`;

// Unrelated class for no-conflict baseline
const UNRELATED_URI = 'file:///test/Unrelated.cls';
const UNRELATED_SRC = `public class Unrelated {
    public String unrelatedField;
}`;

const ALL_ENTRIES = [
  { uri: BASE_URI, content: BASE_SRC, languageId: 'apex', version: 1 },
  { uri: MIDDLE_URI, content: MIDDLE_SRC, languageId: 'apex', version: 1 },
  { uri: CHILD_URI, content: CHILD_SRC, languageId: 'apex', version: 1 },
  {
    uri: UNRELATED_URI,
    content: UNRELATED_SRC,
    languageId: 'apex',
    version: 1,
  },
];

describe('CheckMemberConflicts data-owner query', () => {
  let logger: LoggerInterface;

  beforeAll(() => {
    setLogLevel('error');
    logger = getLogger();
  });

  afterEach(() => {
    clearRawWorkers();
  });

  it('reports same-type conflict when member exists in the defining type', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: {
              role,
              compilationPoolSize: COMPILATION_POOL_SIZE,
            },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'conflict-same-type-session',
        }),
      );
      yield* Effect.promise(() =>
        ingest('conflict-same-type-session', ALL_ENTRIES),
      );
      yield* Effect.promise(() =>
        compile({
          sessionId: 'conflict-same-type-session',
          entries: ALL_ENTRIES,
        }),
      );
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'conflict-same-type-session',
        }),
      );

      // Try to rename middle.middleField to 'targetField' (which already exists in middle)
      const result = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('CheckMemberConflicts', {
          definingTypeFqn: 'middle',
          newName: 'targetField',
          memberKind: 'field',
          isRenamedMemberPrivate: false,
        }),
      )) as {
        conflict: boolean;
        conflictingTypeFqn?: string;
        reason?: 'same-type' | 'ancestor' | 'descendant';
      };

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('same-type');
    expect(result.conflictingTypeFqn).toBe('middle');
  }, 30_000);

  it('reports ancestor conflict when non-private member exists in parent', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: {
              role,
              compilationPoolSize: COMPILATION_POOL_SIZE,
            },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'conflict-ancestor-session',
        }),
      );
      yield* Effect.promise(() =>
        ingest('conflict-ancestor-session', ALL_ENTRIES),
      );
      yield* Effect.promise(() =>
        compile({
          sessionId: 'conflict-ancestor-session',
          entries: ALL_ENTRIES,
        }),
      );
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'conflict-ancestor-session',
        }),
      );

      // Try to rename middle.middleField to 'existing' (which exists in base)
      const result = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('CheckMemberConflicts', {
          definingTypeFqn: 'middle',
          newName: 'existing',
          memberKind: 'field',
          isRenamedMemberPrivate: false,
        }),
      )) as {
        conflict: boolean;
        conflictingTypeFqn?: string;
        reason?: 'same-type' | 'ancestor' | 'descendant';
      };

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('ancestor');
    expect(result.conflictingTypeFqn).toBe('base');
  }, 30_000);

  it('does NOT report ancestor conflict for private ancestor member', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: {
              role,
              compilationPoolSize: COMPILATION_POOL_SIZE,
            },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'no-conflict-private-ancestor-session',
        }),
      );
      yield* Effect.promise(() =>
        ingest('no-conflict-private-ancestor-session', ALL_ENTRIES),
      );
      yield* Effect.promise(() =>
        compile({
          sessionId: 'no-conflict-private-ancestor-session',
          entries: ALL_ENTRIES,
        }),
      );
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'no-conflict-private-ancestor-session',
        }),
      );

      // Try to rename middle.middleField to 'privateField' (private in base)
      const result = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('CheckMemberConflicts', {
          definingTypeFqn: 'middle',
          newName: 'privateField',
          memberKind: 'field',
          isRenamedMemberPrivate: false,
        }),
      )) as {
        conflict: boolean;
        conflictingTypeFqn?: string;
        reason?: 'same-type' | 'ancestor' | 'descendant';
      };

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    expect(result.conflict).toBe(false);
  }, 30_000);

  it('reports descendant conflict when renamed member is non-private', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: {
              role,
              compilationPoolSize: COMPILATION_POOL_SIZE,
            },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'conflict-descendant-session',
        }),
      );
      yield* Effect.promise(() =>
        ingest('conflict-descendant-session', ALL_ENTRIES),
      );
      yield* Effect.promise(() =>
        compile({
          sessionId: 'conflict-descendant-session',
          entries: ALL_ENTRIES,
        }),
      );
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'conflict-descendant-session',
        }),
      );

      // Try to rename middle.middleField to 'childField' (exists in child)
      const result = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('CheckMemberConflicts', {
          definingTypeFqn: 'middle',
          newName: 'childField',
          memberKind: 'field',
          isRenamedMemberPrivate: false,
        }),
      )) as {
        conflict: boolean;
        conflictingTypeFqn?: string;
        reason?: 'same-type' | 'ancestor' | 'descendant';
      };

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('descendant');
    expect(result.conflictingTypeFqn).toBe('child');
  }, 30_000);

  it('does NOT report descendant conflict when renamed member is private', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: {
              role,
              compilationPoolSize: COMPILATION_POOL_SIZE,
            },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'no-conflict-private-renamed-session',
        }),
      );
      yield* Effect.promise(() =>
        ingest('no-conflict-private-renamed-session', ALL_ENTRIES),
      );
      yield* Effect.promise(() =>
        compile({
          sessionId: 'no-conflict-private-renamed-session',
          entries: ALL_ENTRIES,
        }),
      );
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'no-conflict-private-renamed-session',
        }),
      );

      // Try to rename a private middle.middleField to 'childField'
      // (descendant check skipped when isRenamedMemberPrivate=true)
      const result = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('CheckMemberConflicts', {
          definingTypeFqn: 'middle',
          newName: 'childField',
          memberKind: 'field',
          isRenamedMemberPrivate: true,
        }),
      )) as {
        conflict: boolean;
        conflictingTypeFqn?: string;
        reason?: 'same-type' | 'ancestor' | 'descendant';
      };

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    expect(result.conflict).toBe(false);
  }, 30_000);

  it('uses case-insensitive name matching', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: {
              role,
              compilationPoolSize: COMPILATION_POOL_SIZE,
            },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'case-insensitive-session',
        }),
      );
      yield* Effect.promise(() =>
        ingest('case-insensitive-session', ALL_ENTRIES),
      );
      yield* Effect.promise(() =>
        compile({
          sessionId: 'case-insensitive-session',
          entries: ALL_ENTRIES,
        }),
      );
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'case-insensitive-session',
        }),
      );

      // Try to rename middle.middleField to 'EXISTING' (base has 'existing')
      const result = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('CheckMemberConflicts', {
          definingTypeFqn: 'middle',
          newName: 'EXISTING',
          memberKind: 'field',
          isRenamedMemberPrivate: false,
        }),
      )) as {
        conflict: boolean;
        conflictingTypeFqn?: string;
        reason?: 'same-type' | 'ancestor' | 'descendant';
      };

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('ancestor');
  }, 30_000);

  it('returns no conflict when renaming to a unique name', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: {
              role,
              compilationPoolSize: COMPILATION_POOL_SIZE,
            },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'no-conflict-session',
        }),
      );
      yield* Effect.promise(() => ingest('no-conflict-session', ALL_ENTRIES));
      yield* Effect.promise(() =>
        compile({ sessionId: 'no-conflict-session', entries: ALL_ENTRIES }),
      );
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'no-conflict-session',
        }),
      );

      // Rename middle.middleField to 'uniqueName' (doesn't exist anywhere)
      const result = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('CheckMemberConflicts', {
          definingTypeFqn: 'middle',
          newName: 'uniqueName',
          memberKind: 'field',
          isRenamedMemberPrivate: false,
        }),
      )) as {
        conflict: boolean;
        conflictingTypeFqn?: string;
        reason?: 'same-type' | 'ancestor' | 'descendant';
      };

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    expect(result.conflict).toBe(false);
    expect(result.conflictingTypeFqn).toBeUndefined();
    expect(result.reason).toBeUndefined();
  }, 30_000);

  it('returns error when type FQN does not exist (failure path)', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: {
              role,
              compilationPoolSize: COMPILATION_POOL_SIZE,
            },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'nonexistent-type-session',
        }),
      );
      yield* Effect.promise(() =>
        ingest('nonexistent-type-session', ALL_ENTRIES),
      );
      yield* Effect.promise(() =>
        compile({
          sessionId: 'nonexistent-type-session',
          entries: ALL_ENTRIES,
        }),
      );
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'nonexistent-type-session',
        }),
      );

      // Try to query with non-existent type
      return yield* Effect.promise(() =>
        dispatcher.queryDataOwner('CheckMemberConflicts', {
          definingTypeFqn: 'nosuchtype',
          newName: 'field1',
          memberKind: 'field',
          isRenamedMemberPrivate: false,
        }),
      );
    }).pipe(Effect.scoped);

    // The query should reject with CheckMemberConflictsError
    await expect(Effect.runPromise(program)).rejects.toThrow(
      /CheckMemberConflictsError/,
    );
  }, 30_000);

  it('does NOT report ancestor conflict for default-visibility member', async () => {
    // Test fixture with default visibility (no modifier)
    const baseDefaultVis = 'file:///test/baseDefaultVis.cls';
    const baseSrc = `public class baseDefaultVis {
    String shared;
}`;

    const childDefaultVis = 'file:///test/childDefaultVis.cls';
    const childSrc = `public class childDefaultVis extends baseDefaultVis {
    public String myField;
}`;

    const entries = [
      {
        uri: baseDefaultVis,
        content: baseSrc,
        languageId: 'apex',
        version: 1,
      },
      {
        uri: childDefaultVis,
        content: childSrc,
        languageId: 'apex',
        version: 1,
      },
    ];

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: {
              role,
              compilationPoolSize: COMPILATION_POOL_SIZE,
            },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'default-vis-session',
        }),
      );
      yield* Effect.promise(() => ingest('default-vis-session', entries));
      yield* Effect.promise(() =>
        compile({ sessionId: 'default-vis-session', entries }),
      );
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'default-vis-session',
        }),
      );

      // Try to rename childDefaultVis.myField to 'shared' (default-vis in ancestor)
      const result = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('CheckMemberConflicts', {
          definingTypeFqn: 'childdefaultvis',
          newName: 'shared',
          memberKind: 'field',
          isRenamedMemberPrivate: false,
        }),
      )) as {
        conflict: boolean;
        conflictingTypeFqn?: string;
        reason?: 'same-type' | 'ancestor' | 'descendant';
      };

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    // Default visibility is effectively private, so no ancestor conflict
    expect(result.conflict).toBe(false);
  }, 30_000);

  it('reports ancestor conflict for interface member', async () => {
    // Test with interface as ancestor
    const interfaceUri = 'file:///test/IHasProperty.cls';
    const interfaceSrc = `public interface IHasProperty {
    String interfaceField { get; set; }
}`;

    const implUri = 'file:///test/Implementation.cls';
    const implSrc = `public class Implementation implements IHasProperty {
    public String interfaceField { get; set; }
    public String myField;
}`;

    const entries = [
      {
        uri: interfaceUri,
        content: interfaceSrc,
        languageId: 'apex',
        version: 1,
      },
      { uri: implUri, content: implSrc, languageId: 'apex', version: 1 },
    ];

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: {
              role,
              compilationPoolSize: COMPILATION_POOL_SIZE,
            },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'interface-ancestor-session',
        }),
      );
      yield* Effect.promise(() =>
        ingest('interface-ancestor-session', entries),
      );
      yield* Effect.promise(() =>
        compile({ sessionId: 'interface-ancestor-session', entries }),
      );
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'interface-ancestor-session',
        }),
      );

      // Try to rename Implementation.myField to 'interfaceField'
      const result = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('CheckMemberConflicts', {
          definingTypeFqn: 'implementation',
          newName: 'interfaceField',
          memberKind: 'field',
          isRenamedMemberPrivate: false,
        }),
      )) as {
        conflict: boolean;
        conflictingTypeFqn?: string;
        reason?: 'same-type' | 'ancestor' | 'descendant';
      };

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('same-type');
  }, 30_000);
});
