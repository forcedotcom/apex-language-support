# Worker Platform Shared Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the ~1,800 duplicated lines shared between `packages/apex-ls/src/worker.platform.ts` (Node) and `packages/apex-ls/src/worker.platform.web.ts` (Web/browser) into a new `worker.platform.shared.ts`, leaving each entry file a thin platform-specific shell, with no behavioral change and no new build step required for tests.

**Architecture:** The shared module is imported by both entry files using an explicit `.ts` extension (`./worker.platform.shared.ts`) — required because integration tests spawn the entry files directly via `tsx` in a `worker_threads` subprocess, which cannot resolve bare relative specifiers in that context (confirmed by direct repro). esbuild bundles the same `.ts`-extension import identically to a bare one (also confirmed), so no esbuild config changes are needed. Four small platform-specific values that shared code touches (`requestCoordinatorAssistancePromise`, `workerId`, `makeResourceLoaderRemoteLayer`, `setWorkerLogLevel`/`currentWorkerLogLevel`) cross the shared/shell boundary via a setter function each shell calls once at module load — confirmed safe with no ordering hazard, since `Effect.cached` defers actual invocation until first request handling, well after both modules finish loading.

**Tech Stack:** TypeScript, Effect-TS (`@effect/platform` WorkerRunner), esbuild, tsx, Jest/ts-jest.

## Global Constraints

- Pure code-motion refactor — no logic changes to moved code, only relocation and DI-boundary wiring.
- Existing `*.node.test.ts` / `*.web.test.ts` suites must pass unchanged (no test file deletions; a few test imports get repointed — see Task 8).
- Tests must keep running against raw `.ts` source via `tsx`, with no transpile/build step introduced ahead of `npm run test`.
- Both `dist/worker.platform.js` (Node CJS) and `dist/worker.platform.web.js` (Web IIFE) must still build via `npm run bundle` with no behavioral change.
- Net reduction of ~1,500+ duplicated lines (work item acceptance criterion).
- All "keep in sync" comments removed once the duplication they warned about no longer exists.

---

## Context for the implementer

Two files, `packages/apex-ls/src/worker.platform.ts` (2946 lines) and `packages/apex-ls/src/worker.platform.web.ts` (2660 lines), are near-identical worker entry points — one spawned via Node `worker_threads`, one via browser `Worker`. Every verification claim below was confirmed by direct repro against this repo's actual toolchain (not assumed from documentation):

- tsx-in-`worker_threads` fails to resolve a bare relative import (`./shared`) with `ERR_MODULE_NOT_FOUND`, but resolves `./shared.ts` correctly. Confirmed live.
- `tsc --build tsconfig.worker.json`'s JS emit (under `out/worker/`) has zero consumers repo-wide — every real consumer reads `dist/worker.platform*.js` (the esbuild bundle). Confirmed via repo-wide grep.
- `emitDeclarationOnly: true` + `allowImportingTsExtensions: true` compile cleanly together in `tsconfig.worker.json` (which already has `moduleResolution: bundler`, satisfying TS5096's other option). Confirmed via scratch `tsc --build`.
- esbuild bundles a `.ts`-extension relative import identically to a bare one — confirmed via scratch `esbuild --bundle` run, inlined output executes correctly.
- ts-jest also resolves `.ts`-extension relative imports correctly — confirmed via scratch Jest run. (Unit tests that import individual helpers, e.g. `resolveMissingNamesViaDataOwner.test.ts`, go through ts-jest, not tsx — this is a third consumption context and it's covered too.)
- A mutable `export let` binding plus a setter function keeps working correctly as a live binding across an esbuild-bundled module boundary — confirmed via scratch bundle-and-run.
- `getWorkerId`/`getWriteBackMetrics`/`resetWriteBackMetrics` (Node-only exports in `worker.platform.ts`) have zero consumers anywhere in the tracked repo (including `apex-lsp-vscode-extension` and all `.d.ts` files). Confirmed via repo-wide grep. `writeBackMetrics` (the underlying object) is NOT dead — it's mutated in the moving handler code — only its three exported accessor wrappers are unused.
- Every named entity in the work item's inventory exists under the exact name given in both files, and is logic-identical (differences are comment/JSDoc wording only) with three exceptions: `UpdateSymbolSubset`'s handler, `writeBackEnrichedSymbols`, and `WorkspaceBatchIngest`'s handler each have Node-only extra `Effect.logDebug`/`console.log` calls that web omits. This plan keeps Node's richer logging as the shared behavior (additive, low-risk) rather than dropping it or leaking it silently — see Task 5.
- `declaringFileForCursorSymbol` is `export`ed in the Node file but not in the web file (pure oversight — bodies are identical). The shared module exports it uniformly; this fixes the asymmetry as a side effect.
- `loadSymbolDataForEnrichment` is an additional shared helper not named in the original work-item inventory, but it's called from ~19 sites inside the moving handler code and must move with it.

### The DI boundary (4 hooks)

Four platform-specific values are read by code that's moving to the shared module. Each crosses the boundary via the same pattern: a module-level variable in the shared module with a default that throws/warns, plus an exported setter that each shell calls once, synchronously, near the top of its own file (order doesn't matter relative to the shared module's own top-level `Effect.runSync(Effect.cached(...))` calls, because `Effect.cached` defers the wrapped generator's body — including any call to the injected value — until the first time something actually runs the cached Effect, which only happens inside a request handler, long after module load finishes):

1. **`requestCoordinatorAssistancePromise`** — called at 8 sites inside moving code (`ensureRequestServices`, `writeBackCompiledSymbols`, `loadSymbolDataForEnrichment` ×2, `resolveMissingNamesViaDataOwner`'s default param, `loadDependentsForReferences`'s default param, `writeBackEnrichedSymbols`, `WorkspaceBatchCompile`'s handler). Crosses via `setAssistanceTransport(fn)`.
2. **`workerId`** — read at 2 sites (`writeBackCompiledSymbols`, `writeBackEnrichedSymbols`). Crosses via `setWorkerId(id)` writing to an exported `let workerId` in the shared module.
3. **`makeResourceLoaderRemoteLayer`** — called at 2 sites, both inside `ensureDataOwnerServices`/`ensureRequestServices` (never from the platform bootstrap tail). The function itself stays in each shell (its Node and web bodies are structurally different, not just comments). Crosses via `setResourceLoaderLayerFactory(fn)`.
4. **`setWorkerLogLevel`/`currentWorkerLogLevel`** — read/written by the `WorkerInit` handler (moving to shared) but declared in the logger-transport section (staying in each shell, since `workerLogger`/`WorkerLoggerLayer` differ structurally between platforms). Crosses via `setWorkerLogLevelSetter(fn)` — but see Task 3, which takes the simpler route of moving the log-level state itself into the shared module, since `LOG_LEVEL_PRIORITY`, `setWorkerLogLevel`, and `effectLogLevelToWire` are themselves byte-identical, pure, and have no platform dependency (only `workerLogger`, which reads `currentWorkerLogLevel`, needs to stay in the shell — and it can just import the shared `currentWorkerLogLevel` binding directly, no setter needed for that direction).

---

## Task 1: Create `worker.platform.shared.ts` with core infra (schema, types, queue, readiness latch, DI shims)

**Files:**
- Create: `packages/apex-ls/src/worker.platform.shared.ts`
- Test: `packages/apex-ls/test/server/WorkerPlatformShared.test.ts` (new)

**Interfaces:**
- Produces: `AllWorkerRequests` (const), `WorkerDocument` (interface), `cloneForWire<T>(value: T): T | null`, `DOQueueItem`/`DOQueues`/`processItem`/`initDataOwnerQueues`/`dataOwnerRead`/`dataOwnerWrite`, `ReadinessLatch`/`readinessLatches`/`armReadiness`/`resolveReadiness`/`clearReadiness`/`symbolsAreCurrent`, `guardRole(tag: string): Effect.Effect<void>`, `assignedRole` (module-level `let WorkerRole | null`), `LOG_LEVEL_PRIORITY`, `currentWorkerLogLevel` (exported `let`), `setWorkerLogLevel(level: string): void`, `effectLogLevelToWire(level: LogLevel.LogLevel): WorkerLogLevel | null`, and the four DI shims: `setAssistanceTransport(fn)`, `requestCoordinatorAssistancePromiseShared` (the shim itself, called internally by later tasks), `setWorkerId(id: string): void`, `workerId` (exported `let`), `setResourceLoaderLayerFactory(fn)`.

This task moves the smallest, most self-contained pieces first so later tasks can build on a working shared module.

- [ ] **Step 1: Read the exact source of the core-infra ranges to copy verbatim**

Read `packages/apex-ls/src/worker.platform.ts` lines 82-297 (schema, `WorkerDocument`, `cloneForWire`, `assignedRole`, `guardRole`, tiered queue) and lines 317-407 (readiness latch) and lines 2888-2909 (`LOG_LEVEL_PRIORITY`, `currentWorkerLogLevel`, `setWorkerLogLevel`, `effectLogLevelToWire` — NOT `workerLogger`/`WorkerLoggerLayer`, which stay in the shell). These ranges are confirmed byte-identical (comment-only diffs) against `worker.platform.web.ts` lines 93-276 / 290-376 / 2579-2600 respectively, EXCEPT `guardRole`'s exact range differs slightly by file (Node: `200-216`; confirm against current file state before copying — line numbers shift as earlier tasks are not yet applied, this task operates on the pre-refactor file).

- [ ] **Step 2: Create `worker.platform.shared.ts` with copyright header, schema, types, queue, readiness latch, and log-level state**

```ts
/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Platform-neutral worker logic shared by worker.platform.ts (Node) and
 * worker.platform.web.ts (Web/browser). Each entry file imports this module
 * with an explicit .ts extension — required because integration tests spawn
 * the entry files directly via tsx in a worker_threads subprocess, and tsx
 * cannot resolve bare relative specifiers in that context.
 *
 * Platform-specific values this module needs (coordinator assistance
 * transport, workerId, resource loader layer factory) are injected by each
 * shell via the setter functions below, called once at module load.
 */

import { Effect, Layer, LogLevel, Schema, Queue, Deferred } from 'effect';
import {
  WorkerInit,
  PingWorker,
  WorkerRemoteStdlibWarmup,
  QuerySymbolSubset,
  AwaitSymbolReadiness,
  UpdateSymbolSubset,
  ResolveDepUris,
  ResolveDependentUris,
  WorkspaceBatchIngest,
  DrainDeferredReferences,
  CompileDocument,
  WorkspaceBatchCompile,
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
  ResourceLoaderGetStandardNamespaces,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchCompletion,
  DispatchSignatureHelp,
  DispatchCodeAction,
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchCrossFileEnrichment,
  DispatchGenericLspRequest,
  isAllowedTag,
  QueryGraphData,
  DataOwnerQuerySymbolByName,
  type WorkerRole,
  type WorkerLogLevel,
} from '@salesforce/apex-lsp-shared';
import { getDocumentStateCache } from '@salesforce/apex-lsp-compliant-services';

// ---------------------------------------------------------------------------
// Schema union of all coordinator → worker requests
// WorkerAssistanceRequest excluded: it flows worker → coordinator
// ---------------------------------------------------------------------------

export const AllWorkerRequests = Schema.Union(
  WorkerInit,
  PingWorker,
  WorkerRemoteStdlibWarmup,
  QuerySymbolSubset,
  AwaitSymbolReadiness,
  UpdateSymbolSubset,
  ResolveDepUris,
  ResolveDependentUris,
  WorkspaceBatchIngest,
  DrainDeferredReferences,
  QueryGraphData,
  DataOwnerQuerySymbolByName,
  CompileDocument,
  WorkspaceBatchCompile,
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
  ResourceLoaderGetStandardNamespaces,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchCompletion,
  DispatchSignatureHelp,
  DispatchCodeAction,
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchCrossFileEnrichment,
  DispatchGenericLspRequest,
);

// ---------------------------------------------------------------------------
// Minimal document interface matching the subset of TextDocument used
// by storage/processing services. Avoids importing the full
// vscode-languageserver-textdocument package in worker context.
// ---------------------------------------------------------------------------

export interface WorkerDocument {
  readonly uri: string;
  readonly languageId: string;
  readonly version: number;
  getText(): string;
}

// ---------------------------------------------------------------------------
// Utility — deep clone for structured-clone-safe postMessage results
// ---------------------------------------------------------------------------

export function cloneForWire<T>(value: T): T | null {
  return value != null ? JSON.parse(JSON.stringify(value)) : null;
}

// ---------------------------------------------------------------------------
// Role state & guard
// ---------------------------------------------------------------------------

export let assignedRole: WorkerRole | null = null;

export function setAssignedRole(role: WorkerRole): void {
  assignedRole = role;
}

/**
 * Defects on role violation — these are programming errors (coordinator
 * misrouted a message) and should never happen in normal operation.
 */
export const guardRole = (tag: string): Effect.Effect<void> => {
  if (assignedRole === null) {
    return Effect.die(
      new Error(
        `WorkerRoleViolation: no role assigned yet, cannot handle '${tag}'`,
      ),
    );
  }
  if (!isAllowedTag(assignedRole, tag)) {
    return Effect.die(
      new Error(
        `WorkerRoleViolation: tag '${tag}' not allowed for role '${assignedRole}'`,
      ),
    );
  }
  return Effect.void;
};

// ---------------------------------------------------------------------------
// Worker log level (pure, platform-neutral — the transport that reads
// currentWorkerLogLevel to decide whether to post a message stays in each
// platform shell, since workerLogger/WorkerLoggerLayer differ structurally)
// ---------------------------------------------------------------------------

export const LOG_LEVEL_PRIORITY: Record<WorkerLogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
};

export let currentWorkerLogLevel: WorkerLogLevel = 'error';

export function setWorkerLogLevel(level: string): void {
  if (level in LOG_LEVEL_PRIORITY) {
    currentWorkerLogLevel = level as WorkerLogLevel;
  }
}

export function effectLogLevelToWire(
  level: LogLevel.LogLevel,
): WorkerLogLevel | null {
  if (LogLevel.greaterThanEqual(level, LogLevel.Error)) return 'error';
  if (LogLevel.greaterThanEqual(level, LogLevel.Warning)) return 'warning';
  if (LogLevel.greaterThanEqual(level, LogLevel.Info)) return 'info';
  if (LogLevel.greaterThanEqual(level, LogLevel.Debug)) return 'debug';
  return null;
}

// ---------------------------------------------------------------------------
// Platform-specific value injection (DI shims)
//
// Each shell (worker.platform.ts / worker.platform.web.ts) calls these
// setters once, synchronously, at module load. Safe regardless of call
// order relative to this module's own top-level Effect.cached(...) blocks
// (Task 2/3), because Effect.cached defers the wrapped generator's body
// until the first time something actually runs the cached Effect — which
// only happens inside a request handler, well after both modules finish
// loading.
// ---------------------------------------------------------------------------

type AssistanceTransport = (
  method: string,
  params: unknown,
  blocking: boolean,
) => Promise<unknown>;

let _requestCoordinatorAssistancePromise: AssistanceTransport = () =>
  Promise.reject(new Error('assistance transport not initialized'));

export function setAssistanceTransport(fn: AssistanceTransport): void {
  _requestCoordinatorAssistancePromise = fn;
}

export function requestCoordinatorAssistancePromiseShared(
  method: string,
  params: unknown,
  blocking: boolean,
): Promise<unknown> {
  return _requestCoordinatorAssistancePromise(method, params, blocking);
}

export let workerId = 'uninitialized';

export function setWorkerId(id: string): void {
  workerId = id;
}

type ResourceLoaderLayerFactory = () => Promise<unknown>;

let _makeResourceLoaderRemoteLayer: ResourceLoaderLayerFactory = () => {
  throw new Error('resource loader layer factory not initialized');
};

export function setResourceLoaderLayerFactory(
  fn: ResourceLoaderLayerFactory,
): void {
  _makeResourceLoaderRemoteLayer = fn;
}
```

Then append the tiered data-owner queue (copy `worker.platform.ts:227-297` verbatim, prefixing exports where the originals were module-local — check each declaration; `DOQueueItem`/`DOQueues` are types, `processItem`/`initDataOwnerQueues` are internal, `dataOwnerRead`/`dataOwnerWrite` are consumed by handlers moving in Task 4-5, so those two must be `export`ed) and the readiness latch (copy `worker.platform.ts:317-407` verbatim, `export` `armReadiness`/`resolveReadiness`/`clearReadiness`/`symbolsAreCurrent` since `UpdateSymbolSubset`'s handler, moving in Task 5, calls them).

- [ ] **Step 3: Write a test verifying the shared module's pure functions**

```ts
/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LogLevel } from 'effect';
import {
  cloneForWire,
  setWorkerLogLevel,
  currentWorkerLogLevel,
  effectLogLevelToWire,
  setAssistanceTransport,
  requestCoordinatorAssistancePromiseShared,
  setWorkerId,
  workerId,
} from '../../src/worker.platform.shared';

describe('worker.platform.shared', () => {
  it('cloneForWire deep-clones and drops functions', () => {
    const input = { a: 1, fn: () => null };
    const result = cloneForWire(input) as { a: number; fn?: unknown };
    expect(result).toEqual({ a: 1 });
    expect(result.fn).toBeUndefined();
  });

  it('cloneForWire returns null for null/undefined', () => {
    expect(cloneForWire(null)).toBeNull();
    expect(cloneForWire(undefined)).toBeNull();
  });

  it('setWorkerLogLevel only accepts known levels', () => {
    setWorkerLogLevel('debug');
    expect(currentWorkerLogLevel).toBe('debug');
    setWorkerLogLevel('not-a-level');
    expect(currentWorkerLogLevel).toBe('debug'); // unchanged
    setWorkerLogLevel('error');
  });

  it('effectLogLevelToWire maps Effect levels to wire levels', () => {
    expect(effectLogLevelToWire(LogLevel.Error)).toBe('error');
    expect(effectLogLevelToWire(LogLevel.Warning)).toBe('warning');
    expect(effectLogLevelToWire(LogLevel.Info)).toBe('info');
    expect(effectLogLevelToWire(LogLevel.Debug)).toBe('debug');
    expect(effectLogLevelToWire(LogLevel.None)).toBeNull();
  });

  it('setAssistanceTransport wires the shim through to callers', async () => {
    setAssistanceTransport(async (method, params) => ({ method, params }));
    const result = await requestCoordinatorAssistancePromiseShared(
      'test:Method',
      { x: 1 },
      false,
    );
    expect(result).toEqual({ method: 'test:Method', params: { x: 1 } });
  });

  it('setWorkerId updates the shared workerId binding', () => {
    setWorkerId('worker-test-123');
    expect(workerId).toBe('worker-test-123');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails (module doesn't exist yet if Step 2 wasn't done, or passes if it was)**

Run: `npm test -w @salesforce/apex-language-server -- WorkerPlatformShared` (from repo root) or `cd packages/apex-ls && npx jest test/server/WorkerPlatformShared.test.ts`
Expected: PASS (Step 2 already created the module — this step confirms it's correct before moving on)

- [ ] **Step 5: Commit**

```bash
git add packages/apex-ls/src/worker.platform.shared.ts packages/apex-ls/test/server/WorkerPlatformShared.test.ts
git commit -m "feat(apex-ls): add worker.platform.shared.ts core infra - W-23333500"
```

---

## Task 2: Update `tsconfig.worker.json` to unblock `.ts`-extension imports

**Files:**
- Modify: `packages/apex-ls/tsconfig.worker.json`

**Interfaces:**
- Consumes: nothing from prior tasks.
- Produces: a `tsc --build` configuration that accepts `.ts`-extension relative imports, which Task 4/5's shell rewrites depend on.

- [ ] **Step 1: Edit `tsconfig.worker.json`**

Current content:
```json
{
  "extends": "./tsconfig.base.shared.json",
  "compilerOptions": {
    "outDir": "./out/worker",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": [
      "ES2022",
      "WebWorker",
      "WebWorker.ImportScripts",
      "DOM",
      "DOM.Iterable",
      "ESNext.AsyncIterable",
      "ESNext.Disposable"
    ],
    "tsBuildInfoFile": "./out/worker/.tsbuildinfo"
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.worker.ts",
    "src/**/*.browser.ts",
    "src/**/*.node.ts"
  ],
  "exclude": [
    "node_modules",
    "out",
    "dist",
    "esbuild.config.ts"
  ],
  "references": [
    { "path": "../apex-lsp-shared" },
    { "path": "../apex-parser-ast" },
    { "path": "../lsp-compliant-services" }
  ]
}
```

Add two compiler options (`emitDeclarationOnly` and `allowImportingTsExtensions`) inside `compilerOptions`:

```json
{
  "extends": "./tsconfig.base.shared.json",
  "compilerOptions": {
    "outDir": "./out/worker",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "emitDeclarationOnly": true,
    "allowImportingTsExtensions": true,
    "lib": [
      "ES2022",
      "WebWorker",
      "WebWorker.ImportScripts",
      "DOM",
      "DOM.Iterable",
      "ESNext.AsyncIterable",
      "ESNext.Disposable"
    ],
    "tsBuildInfoFile": "./out/worker/.tsbuildinfo"
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.worker.ts",
    "src/**/*.browser.ts",
    "src/**/*.node.ts"
  ],
  "exclude": [
    "node_modules",
    "out",
    "dist",
    "esbuild.config.ts"
  ],
  "references": [
    { "path": "../apex-lsp-shared" },
    { "path": "../apex-parser-ast" },
    { "path": "../lsp-compliant-services" }
  ]
}
```

`emitDeclarationOnly` is safe because `tsc --build tsconfig.worker.json`'s prior JS emit (under `out/worker/`) has zero consumers repo-wide — confirmed in the design doc's verification pass.

- [ ] **Step 2: Verify the config compiles clean**

Run: `cd packages/apex-ls && npx tsc --build tsconfig.worker.json --force`
Expected: exits 0 with no output (or only informational build messages) — no TS5096 error.

- [ ] **Step 3: Commit**

```bash
git add packages/apex-ls/tsconfig.worker.json
git commit -m "build(apex-ls): allow .ts-extension imports in worker tsconfig - W-23333500"
```

---

## Task 3: Remove the dead `out/worker.d.ts` copy-plugin step from esbuild config

**Files:**
- Modify: `packages/apex-ls/esbuild.config.ts:105-116`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing new; this is dead-code removal, independent of the other tasks, done now because it's adjacent to the config Task 2 already touched.

- [ ] **Step 1: Read the current plugin block**

Read `packages/apex-ls/esbuild.config.ts` lines 100-118. Confirm the block is:

```ts
    plugins: [
      forceAntlr4CjsPlugin,
      stubApexParserCheckPlugin,
      copy({
        resolveFrom: 'cwd',
        assets: [
          {
            from: ['out/worker.d.ts'],
            to: ['./dist/worker.d.ts'],
          },
        ],
        watch: true,
        verbose: true,
      }),
    ],
```

This is inside the `server.node` esbuild config object (the one preceding the `worker.platform` node-worker config at line ~121). `out/worker.d.ts` does not exist under current output naming (`tsc --build tsconfig.worker.json` produces `out/worker.platform.d.ts` / `out/worker.platform.web.d.ts`, not a combined `out/worker.d.ts`), and no consumer of `dist/worker.d.ts` was found anywhere in the tracked repo.

- [ ] **Step 2: Remove the `copy(...)` plugin entry, leaving the other two plugins**

```ts
    plugins: [forceAntlr4CjsPlugin, stubApexParserCheckPlugin],
```

Remove the now-unused `copy` import at the top of the file if this was its only use — check with `rg -n "\\bcopy\\(" packages/apex-ls/esbuild.config.ts` first; if only one call site remains (the one just removed), also remove the `import { copy } from ...` line.

- [ ] **Step 3: Verify the bundle still builds**

Run: `cd packages/apex-ls && npm run bundle`
Expected: exits 0, produces `dist/server.node.js`, `dist/worker.platform.js`, `dist/worker.platform.web.js` (no `dist/worker.d.ts`, which is correct — nothing reads it).

- [ ] **Step 4: Commit**

```bash
git add packages/apex-ls/esbuild.config.ts
git commit -m "chore(apex-ls): remove dead out/worker.d.ts copy step - W-23333500"
```

---

## Task 4: Extract enrichment helpers, data-owner handler bodies, handler factories, and service bootstrapping into the shared module

**Files:**
- Modify: `packages/apex-ls/src/worker.platform.shared.ts` (append)
- Test: extend `packages/apex-ls/test/server/WorkerPlatformShared.test.ts`

**Interfaces:**
- Consumes: `guardRole`, `cloneForWire`, `requestCoordinatorAssistancePromiseShared`, `setAssistanceTransport`, `workerId`, `setWorkerId`, `setResourceLoaderLayerFactory` from Task 1.
- Produces: `resolveMissingNamesViaDataOwner`, `loadDependentsForReferences`, `loadSymbolDataForEnrichment`, `recompileCursorFileAtFullDetail`, `loadReferencedTypesForFile`, `declaringFileForCursorSymbol` (all `export`ed — note `declaringFileForCursorSymbol` was previously un-exported in the web file; export it uniformly here), `dataOwnerDocHandler`, `requestHandler`, `PositionReq`/`DocOnlyReq`/`DocWithContentReq`/`RefsReq`/`CompletionReq`/`SignatureHelpReq`/`CodeActionReq`, `ensureDataOwnerServices`, `ensureRequestServices`, `CompilationServices`, `ensureCompilationServices`, `getLayerOrderIndex`, `writeBackCompiledSymbols`, `handleWorkerInitRole`.

This is the largest task. Work file-by-file rather than trying to do it in one sitting: copy each named entity from `worker.platform.ts` (the Node file, which has the fuller/more-verbose comments and is the source of truth per the design doc's decision to keep Node's richer behavior) verbatim into the shared module, then fix up the two references that must change: `requestCoordinatorAssistancePromise` → `requestCoordinatorAssistancePromiseShared`, and `makeResourceLoaderRemoteLayer()` calls stay as-is (calling the module-level `_makeResourceLoaderRemoteLayer` — rename the two call sites inside `ensureDataOwnerServices`/`ensureRequestServices` to call the shared module's internal shim instead of an undefined name).

- [ ] **Step 1: Copy the enrichment helpers verbatim, redirecting the assistance-transport reference**

From `worker.platform.ts:722-813` (`loadSymbolDataForEnrichment`), `890-965` (`resolveMissingNamesViaDataOwner`), `989-1055` (`loadDependentsForReferences`), `1078-1115` (`recompileCursorFileAtFullDetail`), `1134-1194` (`loadReferencedTypesForFile`), `1208-1251` (`declaringFileForCursorSymbol`) — copy each function's full body (JSDoc + signature + body) into `worker.platform.shared.ts`, appending after the DI shims from Task 1.

In every copied body, replace each call to `requestCoordinatorAssistancePromise(...)` with `requestCoordinatorAssistancePromiseShared(...)`, and replace each default-parameter value `= requestCoordinatorAssistancePromise` (in `resolveMissingNamesViaDataOwner` and `loadDependentsForReferences`'s signatures) with `= requestCoordinatorAssistancePromiseShared`. Add the necessary imports at the top of `worker.platform.shared.ts`:

```ts
import type {
  DataOwnerServices,
  RequestServices,
} from '@salesforce/apex-lsp-compliant-services';
import type { SerializedSymbolTableData } from '@salesforce/apex-lsp-parser-ast';
import { getLogger } from '@salesforce/apex-lsp-shared';
```

`declaringFileForCursorSymbol` must be `export`ed (add the `export` keyword — the Node source already has it, so this is a straight copy; just confirm it survives).

- [ ] **Step 2: Copy the handler factories and request types verbatim**

From `worker.platform.ts:650-712` — `dataOwnerDocHandler`, `requestHandler`, and the seven type aliases (`PositionReq`, `DocOnlyReq`, `DocWithContentReq`, `RefsReq`, `CompletionReq`, `SignatureHelpReq`, `CodeActionReq`). No reference changes needed — these only touch `guardRole`, `dataOwnerWrite`/`dataOwnerRead` (Task 1), `ensureDataOwnerServices`/`ensureRequestServices` (this task, Step 3), and `cloneForWire` (Task 1), all already in the shared module.

- [ ] **Step 3: Copy service bootstrapping, redirecting the resource-loader-layer reference**

From `worker.platform.ts:420-434` (`getLayerOrderIndex`), `436-453` (`ensureDataOwnerServices`), `455-486` (`ensureRequestServices`), `492-529` (`CompilationServices` + `ensureCompilationServices`) — copy verbatim. Inside `ensureDataOwnerServices` and `ensureRequestServices`, replace the two calls `yield* Effect.promise(() => makeResourceLoaderRemoteLayer())` with `yield* Effect.promise(() => _makeResourceLoaderRemoteLayer())` — reaching the module-private shim variable declared in Task 1's Step 2 (same file, so it's a direct reference, not an import).

Inside `ensureRequestServices`, the line `requestCoordinatorAssistancePromise('apex/findMissingArtifact', params, false)` (inside `EnhancedMissingArtifactResolutionService.setAssistanceProxy(...)`) becomes `requestCoordinatorAssistancePromiseShared('apex/findMissingArtifact', params, false)`.

Add the dynamic-import types these reference (`bootstrapDataOwnerServices`, `bootstrapRequestServices`, `EnhancedMissingArtifactResolutionService`) — these are already dynamically imported inside the function bodies (`await import('@salesforce/apex-lsp-compliant-services')`), so no new top-level import is needed; the existing `import type { DataOwnerServices, RequestServices } from '@salesforce/apex-lsp-compliant-services';` from Step 1 covers the type positions.

- [ ] **Step 4: Copy `writeBackCompiledSymbols`, redirecting both platform-specific references**

From `worker.platform.ts:531-602`. Replace `requestCoordinatorAssistancePromise(...)` with `requestCoordinatorAssistancePromiseShared(...)`, and the `sourceWorkerId: workerId` field with `sourceWorkerId: workerId` unchanged (this now reads the shared module's own `workerId` `let` binding from Task 1 — no rename needed since the identifier name matches and it's declared in the same file).

- [ ] **Step 5: Copy `handleWorkerInitRole` verbatim**

From `worker.platform.ts:608-640`. References only `ensureDataOwnerServices`, `ensureRequestServices`, `ensureCompilationServices` (all in this module now) and a dynamic `ResourceLoader` import — no changes needed.

- [ ] **Step 6: Extend the shared-module test with an enrichment-helper smoke test**

```ts
  it('resolveMissingNamesViaDataOwner resolves via the injected transport', async () => {
    setAssistanceTransport(async () => ({ entries: {} }));
    const svc = {
      symbolManager: { addSymbolTable: () => Promise.resolve() },
    } as unknown as Parameters<typeof resolveMissingNamesViaDataOwner>[0];
    const count = await resolveMissingNamesViaDataOwner(svc, ['Foo']);
    expect(typeof count).toBe('number');
  });
```

Add this to `packages/apex-ls/test/server/WorkerPlatformShared.test.ts`, importing `resolveMissingNamesViaDataOwner` from `../../src/worker.platform.shared`.

- [ ] **Step 7: Run the test suite for this file**

Run: `cd packages/apex-ls && npx jest test/server/WorkerPlatformShared.test.ts`
Expected: PASS. If it fails on a missing import or unresolved reference, re-check Steps 1-5 against the exact source ranges — this task moves ~900 lines and a single missed rename (e.g. a stray `requestCoordinatorAssistancePromise` call not redirected to the `Shared` suffix) will surface as a "not defined" error here, not silently.

- [ ] **Step 8: Commit**

```bash
git add packages/apex-ls/src/worker.platform.shared.ts packages/apex-ls/test/server/WorkerPlatformShared.test.ts
git commit -m "feat(apex-ls): move enrichment helpers and service bootstrap to shared module - W-23333500"
```

---

## Task 5: Extract the request-handler dispatch map and data-owner handlers into the shared module

**Files:**
- Modify: `packages/apex-ls/src/worker.platform.shared.ts` (append)

**Interfaces:**
- Consumes: everything from Tasks 1 and 4 (`loadSymbolDataForEnrichment`, `requestHandler`, `dataOwnerDocHandler`, `dataOwnerRead`/`dataOwnerWrite`, `armReadiness`/`resolveReadiness`/`clearReadiness`, `cloneForWire`, `guardRole`, `workerId`, `AllWorkerRequests`).
- Produces: `handlers` (the full `WorkerRunner.SerializedRunner.Handlers<...>` object) — the single object both shells pass to `WorkerRunner.layerSerialized(AllWorkerRequests, handlers)`.

This is the second-largest task. It moves the `shouldEnrich` helper, `writeBackEnrichedSymbols`, the `requestHandlers` object (all `Dispatch*` entries), and the outer `handlers` const (all remaining `_tag` handlers: `WorkerInit`, `PingWorker`, `WorkerRemoteStdlibWarmup`, `QuerySymbolSubset`, `AwaitSymbolReadiness`, `UpdateSymbolSubset`, `ResolveDepUris`, `DataOwnerQuerySymbolByName`, `ResolveDependentUris`, `WorkspaceBatchIngest`, `DrainDeferredReferences`, `QueryGraphData`, doc open/change/save/close, `CompileDocument`, `WorkspaceBatchCompile`, `DispatchGenericLspRequest`, `ResourceLoaderGet*`).

Per the design doc, three of these handlers have a confirmed real (not comment-only) divergence between Node and web — Node has extra debug logging web omits. This task keeps Node's version (the richer one) as the single shared implementation.

- [ ] **Step 1: Copy `shouldEnrich` and `writeBackEnrichedSymbols` verbatim, redirecting references**

From `worker.platform.ts:1257-1341`. Replace `requestCoordinatorAssistancePromise(...)` with `requestCoordinatorAssistancePromiseShared(...)`; `sourceWorkerId: workerId` stays as-is (same reasoning as Task 4 Step 4). This includes the Node-only `Effect.logDebug('[ENRICHMENT] Write-back skipped: no symbol table for ${uri}')` branch (`worker.platform.ts:1288-1293`) — keep it; this is the confirmed decision to retain Node's richer logging as the shared behavior.

- [ ] **Step 2: Copy the `requestHandlers` object verbatim**

From `worker.platform.ts:1343-1747` (all `Dispatch*` entries: `DispatchHover` through `DispatchGenericLspRequest`... actually `DispatchGenericLspRequest` lives in the outer `handlers` map, not `requestHandlers` — copy exactly the `requestHandlers` const body as it appears in the file, whatever its precise member list is at this range). No reference changes needed beyond what Steps 1 already covers inside `loadSymbolDataForEnrichment` calls (already handled in Task 4) — this object calls `loadSymbolDataForEnrichment`, `writeBackEnrichedSymbols`, `shouldEnrich`, `requestHandler`, all now in the shared module.

- [ ] **Step 3: Copy the `UpdateSymbolSubset` handler verbatim, keeping Node's extra logging**

From `worker.platform.ts:1959-2101`. This handler has three extra `Effect.logDebug(...)` calls and one `console.log(logMsg)` call that the web version omits (confirmed real divergence, not comment drift). Copy Node's full version verbatim — per the design decision, this makes the extra debug output apply to both platforms going forward, which is additive and low-risk.

- [ ] **Step 4: Copy `ResolveDepUris`, `DataOwnerQuerySymbolByName`, `ResolveDependentUris` handler bodies verbatim**

From `worker.platform.ts:2120-2164`, `2166-2260`, `2262-2286` respectively. These three are confirmed byte-for-byte identical between platforms (well, `DataOwnerQuerySymbolByName` and `ResolveDepUris` are comment-only diffs; `ResolveDependentUris` is fully byte-identical) — copy directly, no reference changes.

- [ ] **Step 5: Copy the `WorkspaceBatchIngest` handler verbatim, keeping Node's extra stats logging**

From `worker.platform.ts:2288-2326`. Node additionally fetches `svc.symbolManager.getStats?.()` and appends graph stats to its debug log — web's version is shorter. Copy Node's full version verbatim (same rationale as Step 3).

- [ ] **Step 6: Copy the remaining outer `handlers` map entries verbatim**

From `worker.platform.ts:1756-1777` (`WorkerInit` — calls `setWorkerLogLevel`/`handleWorkerInitRole`, both already in shared from Tasks 1/4), `1779-1803` (`PingWorker` + `WorkerRemoteStdlibWarmup`), `1807-1863` (`QuerySymbolSubset`), `1865-1957` (`AwaitSymbolReadiness`), `2103-2118` (`DrainDeferredReferences`), `2328-2354` (`QueryGraphData`), `2356-2444` (doc open/change/save/close), `2448-2476` (`CompileDocument`), `2478-2542` (`WorkspaceBatchCompile`), `2552-2562` (`DispatchGenericLspRequest`), `2566-2631` (`ResourceLoaderGet*`).

Note that the `WorkerInit` handler sets `assignedRole = req.role` — this must become `setAssignedRole(req.role)` (the exported setter from Task 1), since `assignedRole` is a module-level binding and the handler needs to write to it, not just read it.

Assemble all of the above (Steps 1-6, plus Task 4's already-moved pieces) into one `handlers` const:

```ts
export const handlers: WorkerRunner.SerializedRunner.Handlers<
  Schema.Schema.Type<typeof AllWorkerRequests>
> = {
  WorkerInit: (req) => { /* ... from Step 6 ... */ },
  // ... every other _tag entry, in the same order as the original file
};
```

Add the missing top-level imports this needs: `import * as WorkerRunner from '@effect/platform/WorkerRunner';`, plus `ApexCapabilitiesManager`, `WIRE_PROTOCOL_VERSION` from `@salesforce/apex-lsp-shared` (both already referenced by the `WorkerInit` handler body).

- [ ] **Step 7: Run the full apex-ls test suite**

Run: `cd packages/apex-ls && npm test`
Expected: all suites pass. This won't pass yet, because Task 6/7 haven't rewired the two shell files to import from the shared module — at this point `worker.platform.shared.ts` exists standalone but is not yet imported by anything, so this step is really a compile/typecheck sanity check. Run `npx tsc --noEmit -p tsconfig.worker.json` instead at this point to confirm the shared module itself type-checks in isolation:

Run: `cd packages/apex-ls && npx tsc --build tsconfig.worker.json --force`
Expected: exits 0, no errors.

- [ ] **Step 8: Commit**

```bash
git add packages/apex-ls/src/worker.platform.shared.ts
git commit -m "feat(apex-ls): move handler dispatch map to shared module - W-23333500"
```

---

## Task 6: Rewrite `worker.platform.ts` as a thin Node shell importing the shared module

**Files:**
- Modify: `packages/apex-ls/src/worker.platform.ts` (large deletion + small addition)

**Interfaces:**
- Consumes: everything exported from `worker.platform.shared.ts` (Tasks 1, 4, 5).
- Produces: the same public surface the file had before (re-exports `resolveMissingNamesViaDataOwner`, `loadDependentsForReferences`, `recompileCursorFileAtFullDetail`, `declaringFileForCursorSymbol` for the test files that import them from this path — see Task 8), plus `requestCoordinatorAssistancePromise`, `requestCoordinatorAssistance` (Node-specific, stay local).

- [ ] **Step 1: Delete everything now living in the shared module**

Delete from `worker.platform.ts`: lines 82-297 (schema/types/queue — now in shared), 317-407 (readiness latch), 420-529 (service bootstrapping), 531-602 (`writeBackCompiledSymbols`), 608-640 (`handleWorkerInitRole`), 650-712 (handler factories/types), 722-813 (`loadSymbolDataForEnrichment`), 890-965, 989-1055, 1078-1115, 1134-1194, 1208-1251 (enrichment helpers), 1257-1341 (`shouldEnrich`/`writeBackEnrichedSymbols`), 1343-2632 (`requestHandlers` + `handlers` map). Also delete lines 154-159 (`workerIdCounter`/`workerId`/`getWorkerId` — `getWorkerId` is dead per the confirmed zero-consumers check; `workerId` itself becomes a local `const` that's pushed into the shared module via `setWorkerId`, not deleted) and lines 183-194 (`getWriteBackMetrics`/`resetWriteBackMetrics` — dead, delete; but keep `writeBackMetrics` itself at lines 174-181 if anything in the remaining shell code still references it — check with `rg -n "writeBackMetrics" packages/apex-ls/src/worker.platform.ts` after this deletion; if the only remaining references were inside the now-deleted `UpdateSymbolSubset` handler, `writeBackMetrics` itself is also now dead in the shell and should be deleted too).

What remains in `worker.platform.ts` after deletion: the copyright header + file JSDoc, the top import block (needs trimming — Step 3), `workerIdCounter`/`workerId` declaration, the assistance-bus transport (`requestCoordinatorAssistance`/`requestCoordinatorAssistancePromise`/`ensureAssistanceListener`/`AssistanceError`/`pendingAssistanceCallbacks`/`assistanceListenerAttached`/`assistanceIdCounter`/`assistPort`), `makeResourceLoaderRemoteLayer` (Node variant), the logger transport (`workerLogger`/`WorkerLoggerLayer` — NOT `LOG_LEVEL_PRIORITY`/`setWorkerLogLevel`/`effectLogLevelToWire`/`currentWorkerLogLevel`, which moved to shared in Task 1), and the bootstrap tail (`runnerLayer`/`WorkerRunner.launch(...)`).

- [ ] **Step 2: Add the shared-module import and wire the four DI setters**

At the top of the file, after the existing `@effect/platform`/`effect`/`@salesforce/apex-lsp-shared` imports, add:

```ts
import {
  handlers,
  AllWorkerRequests,
  setAssistanceTransport,
  setWorkerId,
  setResourceLoaderLayerFactory,
  setWorkerLogLevel,
  currentWorkerLogLevel,
} from './worker.platform.shared.ts';
```

Note the explicit `.ts` extension — required for tsx-in-worker_threads resolution, confirmed safe for esbuild and ts-jest too.

Near the bottom of the file, right before the existing `const runnerLayer = WorkerRunner.layerSerialized(AllWorkerRequests, handlers);` line (which now reads `AllWorkerRequests`/`handlers` from the import instead of a local declaration — no change to this line itself, just where its identifiers resolve from), add the three setter calls (log-level doesn't need a setter — see Step 4):

```ts
setWorkerId(workerId);
setAssistanceTransport(requestCoordinatorAssistancePromise);
setResourceLoaderLayerFactory(makeResourceLoaderRemoteLayer);
```

Place these calls immediately after `requestCoordinatorAssistancePromise` and `makeResourceLoaderRemoteLayer` are declared in the file (both are function declarations, so due to hoisting they could technically go anywhere at module scope after `workerId` is computed — but place them textually right after `makeResourceLoaderRemoteLayer`'s declaration, immediately before the bootstrap tail, for readability).

- [ ] **Step 3: Fix the logger transport to read the shared `currentWorkerLogLevel` and remove the now-redundant local log-level state**

The remaining `workerLogger` (in the logger-transport section) reads `currentWorkerLogLevel` — this now resolves to the imported binding from Step 2, so no code change is needed inside `workerLogger` itself. Delete the shell's own now-duplicate `LOG_LEVEL_PRIORITY`/`currentWorkerLogLevel`/`setWorkerLogLevel`/`effectLogLevelToWire` declarations if Task 1 Step 1 already moved them out (they should already be gone from Task 5's Step 6, which noted the `WorkerInit` handler calls `setWorkerLogLevel` — that handler is in shared now, calling the shared `setWorkerLogLevel`, and the shell's `workerLogger` reads the shared `currentWorkerLogLevel` via the Step 2 import).

- [ ] **Step 4: Trim the top import block to only what the remaining shell code needs**

Remove from the top-of-file `@salesforce/apex-lsp-shared` import list every schema tag and helper that only the now-deleted handler code used (e.g. `WorkerInit`, `PingWorker`, `UpdateSymbolSubset`, all `Dispatch*` tags, `isAllowedTag`, `ApexCapabilitiesManager`, `QueryGraphData`, `DataOwnerQuerySymbolByName`, `getLogger` if unused by remaining code). Keep `isAssistanceResponse`, `type WorkerRole`, `type WorkerLogMessage`, `type WorkerLogLevel`, `WIRE_PROTOCOL_VERSION` if any remaining shell code (the assistance transport, the logger) still references them — check each with `rg -n "<name>" packages/apex-ls/src/worker.platform.ts` after Step 1's deletion, before removing its import.

- [ ] **Step 5: Update the file-header JSDoc**

The header at lines 9-21 references "Handler stubs are wired to real implementations in later steps" — this is stale (predates this refactor and the features it describes have long since landed). Replace with:

```ts
/**
 * Node worker entry point.
 *
 * Spawned by the coordinator (WorkerCoordinator). The first message is
 * always WorkerInit, which assigns the worker's role. Subsequent messages
 * are validated against the role's allowed-tag set — disallowed tags cause
 * a defect (defense-in-depth against coordinator misrouting).
 *
 * Platform-neutral request/handler logic lives in worker.platform.shared.ts,
 * imported below. This file supplies the Node-specific pieces: worker_threads
 * transport, resource-loader remote layer, and logger wiring.
 */
```

- [ ] **Step 6: Run the Node test suite**

Run: `cd packages/apex-ls && npm test`
Expected: all suites pass. If a test fails with "X is not defined" or "X is not exported", cross-check against Task 4/5's export lists — a missed rename or a forgotten export is the most likely cause at this stage.

- [ ] **Step 7: Commit**

```bash
git add packages/apex-ls/src/worker.platform.ts
git commit -m "refactor(apex-ls): reduce worker.platform.ts to Node platform shell - W-23333500"
```

---

## Task 7: Rewrite `worker.platform.web.ts` as a thin Web shell importing the shared module

**Files:**
- Modify: `packages/apex-ls/src/worker.platform.web.ts` (large deletion + small addition)

**Interfaces:**
- Consumes: same shared-module exports as Task 6.
- Produces: same shape as Task 6, but for the browser worker, including web's own `loadDependentsForReferences` re-export path (see Task 8) — the web-side transport (`requestCoordinatorAssistancePromise`), `makeResourceLoaderRemoteLayer` (web variant, structurally different body — kept as-is), and the buffered logger transport (`preAssistBuffer`).

- [ ] **Step 1: Delete everything now living in the shared module**

Same deletion list as Task 6 Step 1, but using `worker.platform.web.ts`'s line numbers: 93-276 (schema/types/queue), 290-376 (readiness latch), 389-491 (service bootstrapping), 493-558 (`writeBackCompiledSymbols`), 564-596 (`handleWorkerInitRole`), 602-655 (handler factories/types), 657-748 (`loadSymbolDataForEnrichment`), 822-897, 924-990, 1004-1037, 1046-1102, 1109-1151 (enrichment helpers — note `declaringFileForCursorSymbol` at 1109 was NOT exported here; delete it regardless, since the shared module's exported version replaces it), 1153-1223 (`shouldEnrich`/`writeBackEnrichedSymbols`), 1225-2376 (`requestHandlers` + `handlers` map). Delete `workerIdCounter`/`workerId`'s accessor if any exists (the coordinator's report found no `getWorkerId` equivalent in the web file, so nothing extra to delete there beyond the `const workerId = ...` line itself, which stays local per Step 2 below).

What remains in `worker.platform.web.ts` after deletion: copyright header + file JSDoc, the web-only polyfill block (lines 23-29 — process/Buffer/global — must NOT move, stays first in the file), the top import block (needs trimming — Step 4), `workerId` declaration, the assistance-bus transport (web variant, `MessagePort`-based), `makeResourceLoaderRemoteLayer` (web variant), the buffered logger transport (`preAssistBuffer`/`workerLogger`/`WorkerLoggerLayer`), and the bootstrap tail (`WorkerPortsInit` handshake + `WorkerRunner.launch(...)`).

- [ ] **Step 2: Add the shared-module import and wire the four DI setters**

Same as Task 6 Step 2:

```ts
import {
  handlers,
  AllWorkerRequests,
  setAssistanceTransport,
  setWorkerId,
  setResourceLoaderLayerFactory,
  currentWorkerLogLevel,
} from './worker.platform.shared.ts';
```

(`setWorkerLogLevel` isn't needed here as a direct import unless the shell itself calls it — it doesn't; only the shared `WorkerInit` handler calls it internally.)

Add the three setter calls in the same position as Task 6 (right after `requestCoordinatorAssistancePromise` and `makeResourceLoaderRemoteLayer` are declared, before the bootstrap tail):

```ts
setWorkerId(workerId);
setAssistanceTransport(requestCoordinatorAssistancePromise);
setResourceLoaderLayerFactory(makeResourceLoaderRemoteLayer);
```

- [ ] **Step 3: Fix the buffered logger transport to read the shared `currentWorkerLogLevel`**

Web's `workerLogger` reads `currentWorkerLogLevel` and also has the extra `preAssistBuffer` fallback branch (buffering log messages before `assistPort` is set) — that branching logic is genuinely web-specific (Node's transport has no equivalent pre-port buffer) and stays in this shell unchanged, just now reading the imported `currentWorkerLogLevel` binding from Step 2 instead of a local declaration.

- [ ] **Step 4: Trim the top import block**

Same process as Task 6 Step 4, applied to `worker.platform.web.ts`'s import list (lines 31-87). Keep the web-only polyfill import block (lines 23-29) untouched — it must run before any other import evaluates, per the existing comment "Polyfills — must execute before any library code," and this ordering constraint is unaffected by adding the shared-module import afterward.

- [ ] **Step 5: Update the file-header JSDoc, removing the now-false "no local imports" claim**

Current header (lines 9-21):
```ts
/**
 * Browser worker entry point — mirror of worker.platform.ts.
 *
 * Bootstrapped via a WorkerPortsInit message on `self` (posted by the
 * coordinator before Effect starts). Two MessagePorts are received:
 *   effectPort — Effect protocol channel (BrowserWorkerRunner.layerMessagePort)
 *   assistPort — side-channel for logs and assistance RPC
 * Effect never touches `self`, so no message-collision risk.
 * Polyfills match webWorkerServer.ts (process, Buffer, global).
 *
 * Kept as a standalone file (no local imports) so each esbuild entry
 * bundles independently without cross-file resolution issues.
 */
```

Replace the last paragraph (the now-false "no local imports" claim) — esbuild bundles the shared module's code into this entry independently regardless of the shared import, so cross-entry resolution is still not a concern, but the "no local imports" framing is no longer accurate:

```ts
/**
 * Browser worker entry point — mirror of worker.platform.ts.
 *
 * Bootstrapped via a WorkerPortsInit message on `self` (posted by the
 * coordinator before Effect starts). Two MessagePorts are received:
 *   effectPort — Effect protocol channel (BrowserWorkerRunner.layerMessagePort)
 *   assistPort — side-channel for logs and assistance RPC
 * Effect never touches `self`, so no message-collision risk.
 * Polyfills match webWorkerServer.ts (process, Buffer, global).
 *
 * Platform-neutral request/handler logic lives in worker.platform.shared.ts,
 * imported below with an explicit .ts extension (required for tsx-in-worker
 * resolution in integration tests). esbuild bundles it independently into
 * this entry, so the two esbuild outputs (Node CJS / Web IIFE) remain
 * fully self-contained with no cross-entry resolution at runtime.
 */
```

- [ ] **Step 6: Run the web test suite**

Run: `cd packages/apex-ls && npm run test:web`
Expected: all suites pass.

- [ ] **Step 7: Commit**

```bash
git add packages/apex-ls/src/worker.platform.web.ts
git commit -m "refactor(apex-ls): reduce worker.platform.web.ts to browser platform shell - W-23333500"
```

---

## Task 8: Repoint test imports that referenced the moved functions, remove stale "keep in sync" comments, and verify end-to-end

**Files:**
- Modify: `packages/apex-ls/test/server/resolveMissingNamesViaDataOwner.test.ts:27`
- Modify: `packages/apex-ls/test/server/loadDependentsForReferences.node.test.ts:28`
- Modify: `packages/apex-ls/test/server/loadDependentsForReferences.web.test.ts:34`
- Modify: `packages/apex-ls/test/server/referenceEnrichmentRecipe.node.test.ts:50-54`

**Interfaces:**
- Consumes: `resolveMissingNamesViaDataOwner`, `loadDependentsForReferences`, `recompileCursorFileAtFullDetail`, `declaringFileForCursorSymbol` from `worker.platform.shared.ts` (Task 4).
- Produces: nothing new — this task only repoints existing test imports and does final cleanup/verification.

Four test files import these helpers directly by module path (`../../src/worker.platform` or `../../src/worker.platform.web`), rather than going through the request/handler dispatch. Since the functions now live in `worker.platform.shared.ts`, repoint these imports directly at the shared module — there's no reason to keep a re-export shim in the platform shells solely for test convenience.

- [ ] **Step 1: Repoint `resolveMissingNamesViaDataOwner.test.ts`**

Change line 27 from:
```ts
import { resolveMissingNamesViaDataOwner } from '../../src/worker.platform';
```
to:
```ts
import { resolveMissingNamesViaDataOwner } from '../../src/worker.platform.shared';
```

- [ ] **Step 2: Repoint `loadDependentsForReferences.node.test.ts` and `.web.test.ts`**

Change `loadDependentsForReferences.node.test.ts:28` from:
```ts
import { loadDependentsForReferences } from '../../src/worker.platform';
```
to:
```ts
import { loadDependentsForReferences } from '../../src/worker.platform.shared';
```

Change `loadDependentsForReferences.web.test.ts:34` from:
```ts
import { loadDependentsForReferences } from '../../src/worker.platform.web';
```
to:
```ts
import { loadDependentsForReferences } from '../../src/worker.platform.shared';
```

Both node and web test variants now import the exact same shared implementation — which is correct, since the whole point of this refactor is that there's only one implementation.

- [ ] **Step 3: Repoint `referenceEnrichmentRecipe.node.test.ts`**

Change lines 50-54 from importing `loadDependentsForReferences`, `recompileCursorFileAtFullDetail`, `declaringFileForCursorSymbol` out of `../../src/worker.platform` to importing all three from `../../src/worker.platform.shared`.

- [ ] **Step 4: Search for and remove any remaining "keep in sync" comments**

Run: `rg -n "keep.*in sync|keep this" packages/apex-ls/src/worker.platform.ts packages/apex-ls/src/worker.platform.web.ts packages/apex-ls/src/worker.platform.shared.ts`
Expected: no matches (all such comments were attached to code that's now moved and deduplicated, so the warning they existed to give is now moot). If any remain, delete them.

- [ ] **Step 5: Run the full test suite (Node + web)**

Run: `cd packages/apex-ls && npm test && npm run test:web`
Expected: all suites pass, including the tsx-spawned integration tests (`ReferencesThroughWorkerTopology.node.test.ts`, `CrossWorkerQuerySymbolByName.integration.node.test.ts`, `EnrichmentRoundTrip.node.test.ts`, `WorkerCoordinator.node.test.ts`, etc.) — these are the direct regression check for the tsx `.ts`-extension resolution fix, since they spawn `worker.platform.ts` itself via `tsx`, which now internally imports `worker.platform.shared.ts`.

- [ ] **Step 6: Verify both bundles still build and produce working output**

Run: `cd packages/apex-ls && npm run bundle`
Expected: exits 0, produces `dist/worker.platform.js` and `dist/worker.platform.web.js` with no bundler errors or warnings about unresolved imports.

- [ ] **Step 7: Verify the line-count reduction meets the acceptance criterion**

Run: `wc -l packages/apex-ls/src/worker.platform.ts packages/apex-ls/src/worker.platform.web.ts packages/apex-ls/src/worker.platform.shared.ts`
Expected: `worker.platform.ts` + `worker.platform.web.ts` combined is at least 1,500 lines smaller than the pre-refactor total of 5,606 lines (2,946 + 2,660).

- [ ] **Step 8: Run the full repo lint + typecheck**

Run: `cd packages/apex-ls && npm run lint && npm run typecheck`
Expected: both exit 0.

- [ ] **Step 9: Commit**

```bash
git add packages/apex-ls/test/server/resolveMissingNamesViaDataOwner.test.ts packages/apex-ls/test/server/loadDependentsForReferences.node.test.ts packages/apex-ls/test/server/loadDependentsForReferences.web.test.ts packages/apex-ls/test/server/referenceEnrichmentRecipe.node.test.ts
git commit -m "test(apex-ls): repoint helper imports at worker.platform.shared - W-23333500"
```

---

## Self-Review Notes

- **Spec coverage:** every inventory item from the design doc (enrichment helpers, data-owner handlers, handler factories/types, core infra) is covered across Tasks 1/4/5; platform-specific pieces (worker ID generation mechanism, bootstrap, assistance-bus transport, logger transport, polyfills, write-back metrics) are explicitly kept in Tasks 6/7; the tsconfig fix is Task 2; the dead esbuild copy-step cleanup is Task 3; test repointing and final verification is Task 8.
- **Real behavioral divergences** (Node's extra logging in `UpdateSymbolSubset`, `writeBackEnrichedSymbols`, `WorkspaceBatchIngest`) are explicitly called out in Task 5 with the decision (keep Node's version) stated inline, not left as an ambiguous "merge these" instruction.
- **Dead code** (`getWorkerId`, `getWriteBackMetrics`, `resetWriteBackMetrics`) is explicitly deleted in Task 6 with the zero-consumers verification cited, not silently dropped or silently kept.
- **The `declaringFileForCursorSymbol` export-visibility asymmetry** is called out and resolved (uniformly exported) in Task 4.
- **The `loadSymbolDataForEnrichment` helper**, not in the original work-item inventory but load-bearing for ~19 call sites in the moving handler code, is explicitly included in Task 4.
