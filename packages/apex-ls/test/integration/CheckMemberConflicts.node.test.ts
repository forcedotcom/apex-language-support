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
 *
 * PERFORMANCE: all scenarios share ONE worker topology and ONE workspace load
 * (spun up in `beforeAll`, torn down in `afterAll`). Spinning a fresh topology
 * per test spawns four `tsx` worker threads each time (~30s on slower CI
 * runners), which pushed the suite past the per-test timeout on Windows and
 * older Node. Every fixture below has a unique type name and each query only
 * inspects its own type family (same-type + ancestors + descendants), so a
 * single combined workspace is behavior-equivalent to isolated per-test loads.
 */

import * as path from 'node:path';
import { Effect, Exit, Scope } from 'effect';
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
const SESSION_ID = 'check-member-conflicts-shared-session';

// Test fixtures covering the hierarchy conflict scenarios. Every type name is
// unique across the whole file so all fixtures can coexist in one workspace.

// base class with a public field 'existing' and a private field.
const BASE_URI = 'file:///test/base.cls';
const BASE_SRC = `public class base {
    public String existing;
    private String privateField;
}`;

// middle class extends base, has its own fields.
const MIDDLE_URI = 'file:///test/middle.cls';
const MIDDLE_SRC = `public class middle extends base {
    public String middleField;
    public String targetField;
}`;

// child class extends middle.
const CHILD_URI = 'file:///test/child.cls';
const CHILD_SRC = `public class child extends middle {
    public String childField;
}`;

// Unrelated class for no-conflict baseline.
const UNRELATED_URI = 'file:///test/Unrelated.cls';
const UNRELATED_SRC = `public class Unrelated {
    public String unrelatedField;
}`;

// Default-visibility ancestor member (effectively private for inheritance).
const BASE_DEFAULT_VIS_URI = 'file:///test/baseDefaultVis.cls';
const BASE_DEFAULT_VIS_SRC = `public class baseDefaultVis {
    String shared;
}`;
const CHILD_DEFAULT_VIS_URI = 'file:///test/childDefaultVis.cls';
const CHILD_DEFAULT_VIS_SRC = `public class childDefaultVis extends baseDefaultVis {
    public String myField;
}`;

// Interface ancestor with a method (interfaces declare methods, not fields).
const INTERFACE_URI = 'file:///test/IHasMethod.cls';
const INTERFACE_SRC = `public interface IHasMethod {
    void interfaceMethod();
}`;
const IMPLEMENTATION_URI = 'file:///test/Implementation.cls';
const IMPLEMENTATION_SRC = `public class Implementation implements IHasMethod {
    public void myMethod() {}
}`;

// A type with a PRIVATE field, for the same-type-against-private enrichment test.
const HAS_SECRET_URI = 'file:///test/hasSecret.cls';
const HAS_SECRET_SRC = `public class hasSecret {
    public String visibleField;
    private String secretField;
}`;

// PROTECTED ancestor member (inherited, unlike private/default) — enrichment.
const PROTECTED_BASE_URI = 'file:///test/protectedBase.cls';
const PROTECTED_BASE_SRC = `public virtual class protectedBase {
    protected String protectedField;
}`;
const PROTECTED_CHILD_URI = 'file:///test/protectedChild.cls';
const PROTECTED_CHILD_SRC = `public class protectedChild extends protectedBase {
    public String childOwn;
}`;

// PRIVATE descendant member (descendant check applies no private filter) —
// enrichment.
const DESC_PARENT_URI = 'file:///test/descParent.cls';
const DESC_PARENT_SRC = `public virtual class descParent {
    public String parentField;
}`;
const DESC_CHILD_URI = 'file:///test/descChild.cls';
const DESC_CHILD_SRC = `public class descChild extends descParent {
    private String hiddenChildField;
}`;

// Single-field types for the no-op / case-only rename short-circuit.
const CASE_ONLY_URI = 'file:///test/caseOnly.cls';
const CASE_ONLY_SRC = `public class caseOnly {
    public String total;
}`;
const NO_OP_URI = 'file:///test/noOp.cls';
const NO_OP_SRC = `public class noOp {
    public String total;
}`;

// A syntax-broken class: a normal field plus a malformed method body. Compilation
// RECOVERS a SymbolTable that reports getDetailLevel() === 'full' but whose parse
// carries a syntax error, so its member set may be silently incomplete. The
// conflict query must fail closed on it rather than trust "no conflict"
// (W-23631128 re-review, P1 — the diagnostic-return path, not missing source).
const BROKEN_URI = 'file:///test/brokenType.cls';
const BROKEN_SRC = `public class brokenType {
    public String existingField;
    public void broken() {
        visible = ;
    }
}`;

// One combined workspace containing every fixture. Ingested once.
const WORKSPACE_ENTRIES = [
  { uri: BASE_URI, content: BASE_SRC, languageId: 'apex', version: 1 },
  { uri: MIDDLE_URI, content: MIDDLE_SRC, languageId: 'apex', version: 1 },
  { uri: CHILD_URI, content: CHILD_SRC, languageId: 'apex', version: 1 },
  {
    uri: UNRELATED_URI,
    content: UNRELATED_SRC,
    languageId: 'apex',
    version: 1,
  },
  {
    uri: BASE_DEFAULT_VIS_URI,
    content: BASE_DEFAULT_VIS_SRC,
    languageId: 'apex',
    version: 1,
  },
  {
    uri: CHILD_DEFAULT_VIS_URI,
    content: CHILD_DEFAULT_VIS_SRC,
    languageId: 'apex',
    version: 1,
  },
  {
    uri: INTERFACE_URI,
    content: INTERFACE_SRC,
    languageId: 'apex',
    version: 1,
  },
  {
    uri: IMPLEMENTATION_URI,
    content: IMPLEMENTATION_SRC,
    languageId: 'apex',
    version: 1,
  },
  {
    uri: HAS_SECRET_URI,
    content: HAS_SECRET_SRC,
    languageId: 'apex',
    version: 1,
  },
  {
    uri: PROTECTED_BASE_URI,
    content: PROTECTED_BASE_SRC,
    languageId: 'apex',
    version: 1,
  },
  {
    uri: PROTECTED_CHILD_URI,
    content: PROTECTED_CHILD_SRC,
    languageId: 'apex',
    version: 1,
  },
  {
    uri: DESC_PARENT_URI,
    content: DESC_PARENT_SRC,
    languageId: 'apex',
    version: 1,
  },
  {
    uri: DESC_CHILD_URI,
    content: DESC_CHILD_SRC,
    languageId: 'apex',
    version: 1,
  },
  {
    uri: CASE_ONLY_URI,
    content: CASE_ONLY_SRC,
    languageId: 'apex',
    version: 1,
  },
  { uri: NO_OP_URI, content: NO_OP_SRC, languageId: 'apex', version: 1 },
  { uri: BROKEN_URI, content: BROKEN_SRC, languageId: 'apex', version: 1 },
];

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

describe('CheckMemberConflicts data-owner query', () => {
  let logger: LoggerInterface;
  let scope: Scope.CloseableScope;
  let dispatcher: ReturnType<typeof makeWorkerDispatcher>;

  beforeAll(async () => {
    setLogLevel('error');
    logger = getLogger();

    // The topology is created in a long-lived scope owned by this suite (not a
    // per-program `Effect.scoped`), so the workers stay alive across every test.
    scope = Effect.runSync(Scope.make());

    const setup = Effect.gen(function* () {
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
      const d = makeWorkerDispatcher(topology, logger);
      const session = d.createWorkspaceLoadSessionDispatcher();
      const ingest = d.createBatchIngestionDispatcher();
      const compile = d.createDataOwnerCompileDispatcher();

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

  // Issue a single CheckMemberConflicts query against the shared workspace.
  const runConflictQuery = (query: ConflictQuery): Promise<ConflictResult> =>
    dispatcher.queryDataOwner(
      'CheckMemberConflicts',
      query,
    ) as Promise<ConflictResult>;

  it('reports same-type conflict when member exists in the defining type', async () => {
    // Rename middle.middleField to 'targetField' (already exists in middle).
    const result = await runConflictQuery({
      definingTypeFqn: 'middle',
      newName: 'targetField',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
    });

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('same-type');
    expect(result.conflictingTypeFqn).toBe('middle');
  });

  it('reports ancestor conflict when non-private member exists in parent', async () => {
    // Rename middle.middleField to 'existing' (public in base).
    const result = await runConflictQuery({
      definingTypeFqn: 'middle',
      newName: 'existing',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
    });

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('ancestor');
    expect(result.conflictingTypeFqn).toBe('base');
  });

  it('does NOT report ancestor conflict for private ancestor member', async () => {
    // Rename middle.middleField to 'privateField' (private in base → excluded).
    const result = await runConflictQuery({
      definingTypeFqn: 'middle',
      newName: 'privateField',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
    });

    expect(result.conflict).toBe(false);
  });

  it('reports descendant conflict when renamed member is non-private', async () => {
    // Rename middle.middleField to 'childField' (exists in child, a descendant).
    const result = await runConflictQuery({
      definingTypeFqn: 'middle',
      newName: 'childField',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
    });

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('descendant');
    expect(result.conflictingTypeFqn).toBe('child');
  });

  it('does NOT report descendant conflict when renamed member is private', async () => {
    // A private middle member renamed to 'childField': the descendant check is
    // skipped when isRenamedMemberPrivate=true.
    const result = await runConflictQuery({
      definingTypeFqn: 'middle',
      newName: 'childField',
      memberKind: 'field',
      isRenamedMemberPrivate: true,
    });

    expect(result.conflict).toBe(false);
  });

  it('uses case-insensitive name matching', async () => {
    // Rename middle.middleField to 'EXISTING' (base has 'existing').
    const result = await runConflictQuery({
      definingTypeFqn: 'middle',
      newName: 'EXISTING',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
    });

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('ancestor');
  });

  it('returns no conflict when renaming to a unique name', async () => {
    // Rename middle.middleField to 'uniqueName' (exists nowhere in the family).
    const result = await runConflictQuery({
      definingTypeFqn: 'middle',
      newName: 'uniqueName',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
    });

    expect(result.conflict).toBe(false);
    expect(result.conflictingTypeFqn).toBeUndefined();
    expect(result.reason).toBeUndefined();
  });

  it('returns error when type FQN does not exist (failure path)', async () => {
    // Query a non-existent type — the query should reject.
    await expect(
      runConflictQuery({
        definingTypeFqn: 'nosuchtype',
        newName: 'field1',
        memberKind: 'field',
        isRenamedMemberPrivate: false,
      }),
    ).rejects.toThrow(/CheckMemberConflictsError/);
  });

  it('fails closed when the inspected type has a syntax-broken (recovered) parse', async () => {
    // brokenType RECOVERS a table that reports full detail, but its parse carries
    // a syntax error, so declarations may be missing. Enrichment now records that
    // incompleteness honestly and the query declines rather than returning
    // conflict:false from an untrustworthy member set (W-23631128 re-review P1 —
    // the diagnostic-return path, distinct from the missing-source path). The
    // FQN resolves (the class recovered), so a rejection here is specifically the
    // incomplete-parse guard, not a type-not-found error.
    await expect(
      runConflictQuery({
        definingTypeFqn: 'brokentype',
        newName: 'brandNewName',
        memberKind: 'field',
        isRenamedMemberPrivate: false,
      }),
    ).rejects.toThrow(/CheckMemberConflictsError/);
  });

  it('does NOT report ancestor conflict for default-visibility member', async () => {
    // childDefaultVis extends baseDefaultVis; 'shared' is default-visibility in
    // the ancestor, which is effectively private for inheritance → no conflict.
    const result = await runConflictQuery({
      definingTypeFqn: 'childdefaultvis',
      newName: 'shared',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
    });

    expect(result.conflict).toBe(false);
  });

  it('reports ancestor conflict for interface member via the ancestor branch', async () => {
    // Interfaces in Apex declare METHODS (not fields/properties). Implementation
    // declares only myMethod(), so renaming it to 'interfaceMethod' (declared
    // ONLY on the implemented interface) genuinely exercises the ANCESTOR
    // branch, not same-type. Fails if ancestor detection is removed.
    const result = await runConflictQuery({
      definingTypeFqn: 'implementation',
      newName: 'interfaceMethod',
      memberKind: 'method',
      isRenamedMemberPrivate: false,
    });

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('ancestor');
    expect(result.conflictingTypeFqn?.toLowerCase()).toContain('ihasmethod');
  });

  // --- Finding 1: non-public members must be visible ---------------------
  // Batch-loaded workspace files are served at 'public-api' detail, which drops
  // private/protected/default-visibility members. hasMemberNamed enriches to
  // 'full' before reading so all-visibility collisions are detected.

  it('reports same-type conflict against a PRIVATE field (enrichment)', async () => {
    // hasSecret has a public field and a private field. Renaming the public
    // field to collide with the private field must conflict (same-type needs
    // ALL members, including private — only visible after full enrichment).
    const result = await runConflictQuery({
      definingTypeFqn: 'hassecret',
      newName: 'secretField',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
    });

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('same-type');
    expect(result.conflictingTypeFqn).toBe('hassecret');
  });

  it('reports ancestor conflict against a PROTECTED ancestor member (enrichment)', async () => {
    // protectedBase declares a PROTECTED field. A protected member IS inherited
    // (unlike private/default) so renaming a child field to that name conflicts
    // via the ancestor branch — but only if enrichment exposes the protected
    // member (dropped at public-api).
    const result = await runConflictQuery({
      definingTypeFqn: 'protectedchild',
      newName: 'protectedField',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
    });

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('ancestor');
    expect(result.conflictingTypeFqn).toBe('protectedbase');
  });

  it('reports descendant conflict against a PRIVATE descendant member (enrichment)', async () => {
    // Renaming a NON-private member in the parent to a name that collides with a
    // PRIVATE member in a descendant must conflict (descendant check applies NO
    // private filter). The private descendant member is only visible after full
    // enrichment.
    const result = await runConflictQuery({
      definingTypeFqn: 'descparent',
      newName: 'hiddenChildField',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
    });

    expect(result.conflict).toBe(true);
    expect(result.reason).toBe('descendant');
    expect(result.conflictingTypeFqn).toBe('descchild');
  });

  // --- Finding 2: no-op / case-only rename never self-conflicts ----------

  it('returns no conflict for a case-only rename when currentName is provided', async () => {
    // total→Total is a case-only rename of the SAME member; it must not
    // self-conflict against the same-type lookup.
    const result = await runConflictQuery({
      definingTypeFqn: 'caseonly',
      newName: 'Total',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
      currentName: 'total',
    });

    expect(result.conflict).toBe(false);
  });

  it('returns no conflict for an exact no-op rename when currentName is provided', async () => {
    // total→total is a no-op; it must not self-conflict.
    const result = await runConflictQuery({
      definingTypeFqn: 'noop',
      newName: 'total',
      memberKind: 'field',
      isRenamedMemberPrivate: false,
      currentName: 'total',
    });

    expect(result.conflict).toBe(false);
  });
});
