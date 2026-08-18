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

  type ConflictResult = {
    conflict: boolean;
    conflictingTypeFqn?: string;
    reason?: 'same-type' | 'ancestor' | 'descendant';
  };

  type ConflictQuery = {
    definingTypeFqn: string;
    newName: string;
    memberKind: 'field' | 'method';
    isRenamedMemberPrivate: boolean;
    currentName?: string;
  };

  // Shared scenario runner: stands up a fresh topology, runs the standard
  // workspace-load session (begin → ingest → compile → drain), then issues a
  // single CheckMemberConflicts data-owner query and returns its result.
  const runConflictQuery = (
    entries: ReadonlyArray<{
      uri: string;
      content: string;
      languageId: string;
      version: number;
    }>,
    sessionId: string,
    query: ConflictQuery,
  ): Promise<ConflictResult> => {
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
        session({ _tag: 'BeginWorkspaceLoadSession', sessionId }),
      );
      yield* Effect.promise(() => ingest(sessionId, entries));
      yield* Effect.promise(() => compile({ sessionId, entries }));
      yield* Effect.promise(() =>
        session({ _tag: 'DrainDeferredReferences', sessionId }),
      );

      return (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('CheckMemberConflicts', query),
      )) as ConflictResult;
    }).pipe(Effect.scoped);

    return Effect.runPromise(program);
  };

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

  it('reports ancestor conflict for interface member via the ancestor branch', async () => {
    // Interfaces in Apex declare METHODS (not fields/properties). To genuinely
    // exercise the ANCESTOR branch (not same-type), the implementing type must
    // NOT declare a member with the target name — so the only collision is via
    // the interface (an ancestor). We rename Implementation.myMethod to
    // 'interfaceMethod', which is declared ONLY on the implemented interface.
    const interfaceUri = 'file:///test/IHasMethod.cls';
    const interfaceSrc = `public interface IHasMethod {
    void interfaceMethod();
}`;

    const implUri = 'file:///test/Implementation.cls';
    const implSrc = `public class Implementation implements IHasMethod {
    public void myMethod() {}
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

    const result = await runConflictQuery(
      entries,
      'interface-ancestor-session',
      {
        definingTypeFqn: 'implementation',
        newName: 'interfaceMethod',
        memberKind: 'method',
        isRenamedMemberPrivate: false,
      },
    );

    // Detected via the interface ancestor — NOT same-type (impl has no such
    // member). This test fails if ancestor detection is removed.
    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('ancestor');
    expect(result.conflictingTypeFqn?.toLowerCase()).toContain('ihasmethod');
  }, 30_000);

  // --- Finding 1: non-public members must be visible ---------------------
  // Batch-loaded workspace files are served at 'public-api' detail, which drops
  // private/protected/default-visibility members. hasMemberNamed enriches to
  // 'full' before reading so all-visibility collisions are detected.

  it('reports same-type conflict against a PRIVATE field (enrichment)', async () => {
    // hasSecret has a public field and a private field. Renaming the public
    // field to collide with the private field must conflict (same-type needs
    // ALL members, including private — only visible after full enrichment).
    const uri = 'file:///test/hasSecret.cls';
    const src = `public class hasSecret {
    public String visibleField;
    private String secretField;
}`;
    const entries = [{ uri, content: src, languageId: 'apex', version: 1 }];

    const result = await runConflictQuery(
      entries,
      'private-same-type-session',
      {
        definingTypeFqn: 'hassecret',
        newName: 'secretField',
        memberKind: 'field',
        isRenamedMemberPrivate: false,
      },
    );

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('same-type');
    expect(result.conflictingTypeFqn).toBe('hassecret');
  }, 30_000);

  it('reports ancestor conflict against a PROTECTED ancestor member (enrichment)', async () => {
    // protectedBase declares a PROTECTED field. A protected member IS inherited
    // (unlike private/default) so renaming a child field to that name conflicts
    // via the ancestor branch — but only if enrichment exposes the protected
    // member (dropped at public-api).
    const baseUri = 'file:///test/protectedBase.cls';
    const baseSrc = `public virtual class protectedBase {
    protected String protectedField;
}`;
    const childUri = 'file:///test/protectedChild.cls';
    const childSrc = `public class protectedChild extends protectedBase {
    public String childOwn;
}`;
    const entries = [
      { uri: baseUri, content: baseSrc, languageId: 'apex', version: 1 },
      { uri: childUri, content: childSrc, languageId: 'apex', version: 1 },
    ];

    const result = await runConflictQuery(
      entries,
      'protected-ancestor-session',
      {
        definingTypeFqn: 'protectedchild',
        newName: 'protectedField',
        memberKind: 'field',
        isRenamedMemberPrivate: false,
      },
    );

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('ancestor');
    expect(result.conflictingTypeFqn).toBe('protectedbase');
  }, 30_000);

  it('reports descendant conflict against a PRIVATE descendant member (enrichment)', async () => {
    // Renaming a NON-private member in the parent to a name that collides with a
    // PRIVATE member in a descendant must conflict (descendant check applies NO
    // private filter). The private descendant member is only visible after full
    // enrichment.
    const parentUri = 'file:///test/descParent.cls';
    const parentSrc = `public virtual class descParent {
    public String parentField;
}`;
    const childUri = 'file:///test/descChild.cls';
    const childSrc = `public class descChild extends descParent {
    private String hiddenChildField;
}`;
    const entries = [
      { uri: parentUri, content: parentSrc, languageId: 'apex', version: 1 },
      { uri: childUri, content: childSrc, languageId: 'apex', version: 1 },
    ];

    const result = await runConflictQuery(
      entries,
      'private-descendant-session',
      {
        definingTypeFqn: 'descparent',
        newName: 'hiddenChildField',
        memberKind: 'field',
        isRenamedMemberPrivate: false,
      },
    );

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('descendant');
    expect(result.conflictingTypeFqn).toBe('descchild');
  }, 30_000);

  // --- Finding 2: no-op / case-only rename never self-conflicts ----------

  it('returns no conflict for a case-only rename when currentName is provided', async () => {
    // total→Total is a case-only rename of the SAME member; it must not
    // self-conflict against the same-type lookup.
    const uri = 'file:///test/caseOnly.cls';
    const src = `public class caseOnly {
    public String total;
}`;
    const entries = [{ uri, content: src, languageId: 'apex', version: 1 }];

    const result = await runConflictQuery(entries, 'case-only-rename-session', {
      definingTypeFqn: 'caseonly',
      newName: 'Total',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
      currentName: 'total',
    });

    expect(result.conflict).toBe(false);
  }, 30_000);

  it('returns no conflict for an exact no-op rename when currentName is provided', async () => {
    // total→total is a no-op; it must not self-conflict.
    const uri = 'file:///test/noOp.cls';
    const src = `public class noOp {
    public String total;
}`;
    const entries = [{ uri, content: src, languageId: 'apex', version: 1 }];

    const result = await runConflictQuery(entries, 'noop-rename-session', {
      definingTypeFqn: 'noop',
      newName: 'total',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
      currentName: 'total',
    });

    expect(result.conflict).toBe(false);
  }, 30_000);
});
