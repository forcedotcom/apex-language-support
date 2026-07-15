# Worker Platform Shared Extraction — Design

**Date:** 2026-07-06
**Work item:** W-23333500 — "Consolidate overlapping logic between Node and Web worker platform entry points" (Epic: IDE Apex Language Support - Jorje Parity)

## Problem

`packages/apex-ls/src/worker.platform.ts` (Node, ~2,946 lines) and `worker.platform.web.ts` (Web/browser, ~2,660 lines) carry an estimated ~1,800 lines of hand-duplicated, "keep in sync" logic, maintained manually via comments (`worker.platform.ts:874-875,2166-2167`; `worker.platform.web.ts:806-807,912-913,1947-1948`). This is fragile and invites silent divergence between platforms.

A prior attempt (see project memory `project_worker_shared_extraction.md`) extracted the shared code into `worker.shared.ts` but was reverted: integration tests spawn `worker.platform.ts` directly via `tsx` in a `worker_threads` subprocess (`execArgv: ['--import', 'tsx']`), and in that context tsx on Node 22 cannot resolve bare relative specifiers (`./worker.shared`) or `.js`-remapped specifiers — only explicit `.ts`-extension specifiers (`./worker.shared.ts`) resolve. Using `.ts` extensions requires `allowImportingTsExtensions`, which TypeScript blocks unless `noEmit` or `emitDeclarationOnly` is set — and `tsconfig.worker.json` was, at the time, believed to require real JS emit.

This design resolves that blocker and re-attempts the extraction.

## What was verified before designing this

- **The tsx bare-specifier failure reproduces exactly as documented.** A minimal worker (`import { greeting } from './shared'`) spawned via `new Worker(path, { execArgv: ['--import', 'tsx'] })` throws `ERR_MODULE_NOT_FOUND`. Changing the import to `./shared.ts` fixes it immediately, with no other changes.
- **`tsconfig.worker.json`'s JS emit is dead.** Repo-wide search for any import of `out/worker/**/*.js` or `out/worker.d.ts` (the file esbuild's copy-plugin at `esbuild.config.ts:109` tries to copy) found no consumers. Every real consumer (`WorkerCoordinator.ts:258`, `LCSAdapter.ts:2311`, the vscode extension's `esbuild.config.ts`) reads `dist/worker.platform*.js` — the esbuild bundle output, not the tsc one. The `out/worker.d.ts` copy-plugin step is itself already broken/dead: the file it names doesn't exist under current output naming (actual outputs are `out/worker.platform.d.ts` / `out/worker.platform.web.d.ts`).
- **`emitDeclarationOnly: true` + `allowImportingTsExtensions: true` compiles cleanly together** under `tsconfig.worker.json` (which already has `moduleResolution: bundler`, satisfying the other half of TS5096's requirement). Verified via a scratch `tsc --build` run.
- **The `.ts`-extension import resolves correctly at runtime under tsx-in-worker_threads** — re-ran the original repro with the fixed tsconfig and confirmed the message round-trips.
- **esbuild bundles a `.ts`-extension relative import identically to a bare one.** A scratch `esbuild --bundle` run on an entry importing `./shared.ts` inlined the shared module with no runtime import left in the output — confirmed by running the bundled output directly.
- **No code-splitting is configured on either worker esbuild entry** (web build sets `splitting: false` explicitly at `esbuild.config.ts:149`; CJS format doesn't support splitting at all), so each bundle gets its own fully-inlined copy of the shared module — no relative-path resolution survives into `dist/`.

## Design

### Module boundary

New file: `packages/apex-ls/src/worker.platform.shared.ts`. Contains, per the work item's own inventory:

- **Enrichment helpers:** `resolveMissingNamesViaDataOwner`, `loadDependentsForReferences`, `recompileCursorFileAtFullDetail`, `loadReferencedTypesForFile`, `declaringFileForCursorSymbol`
- **Data-owner handlers:** `DataOwnerQuerySymbolByName`, `ResolveDepUris`, `ResolveDependentUris`
- **Handler factories + types:** `dataOwnerDocHandler`, `requestHandler`, `PositionReq`/`DocOnlyReq`/`DocWithContentReq`
- **Core infra:** `AllWorkerRequests` schema, `WorkerDocument`, `cloneForWire`, `writeBackCompiledSymbols`, `handleWorkerInitRole`, readiness latch, tiered data-owner queue, service bootstrapping, full LSP request-handler dispatch + handlers map

Stays platform-specific (unchanged, per the work item):

- Worker ID generation (`process.pid` vs browser)
- Bootstrap: `NodeWorkerRunner.layer` vs `BrowserWorkerRunner.layerMessagePort` + `WorkerPortsInit` handshake
- Assistance-bus transport (`worker_threads` MessagePort vs `postMessage`)
- Logger transport (Node export vs assistPort side-channel + pre-port buffer)
- Web-only polyfills (`process`, `Buffer`, `global`); Node-only write-back metrics exports

`worker.platform.ts` and `worker.platform.web.ts` become thin shells: platform bootstrap + platform-specific pieces above, importing everything else from the shared module.

### Import mechanism

Both entry files import the shared module with an explicit `.ts` extension:

```ts
import { ... } from './worker.platform.shared.ts';
```

This is required for tsx-in-worker_threads resolution (verified above) and is resolved identically by esbuild whether or not the extension is present (also verified) — so there's no dual-syntax split between "the tsx path" and "the esbuild path." One import statement, one behavior in both contexts.

### `tsconfig.worker.json` change

Add:

```json
"emitDeclarationOnly": true,
"allowImportingTsExtensions": true
```

Safe because the prior JS emit was dead (confirmed above). `.d.ts` emit (used for type-checking, if anything depends on it) is preserved; the JS emit that no one read is dropped.

### esbuild config

No changes required. Both `worker.platform` and `worker.platform.web` entries already set `bundle: true`; the shared module is tree-shaken and inlined automatically, one full copy per bundle (no splitting, so no shared-chunk cross-references to resolve at runtime).

### Housekeeping caught along the way

The `esbuild.config.ts:109` copy-plugin step (`from: ['out/worker.d.ts']`, `to: ['./dist/worker.d.ts']`) references a source file that doesn't exist under current output naming, and no consumer of `dist/worker.d.ts` was found repo-wide. Remove this dead step as part of this work.

## Testing / acceptance

Per the work item's own acceptance criteria:

- Shared logic lives in `worker.platform.shared.ts`, imported by both entries; "keep in sync" comments removed.
- Node (CJS) and Web (IIFE) bundles still build via `npm run bundle`, with no behavioral change.
- Existing `*.node.test.ts` / `*.web.test.ts` suites pass unchanged, including the integration tests that spawn `worker.platform.ts` directly via tsx (e.g. `ReferencesThroughWorkerTopology.node.test.ts`) — these are the direct regression check for the tsx resolution fix.
- Net reduction of ~1,500+ duplicated lines.

This is a pure code-motion refactor — no logic changes — so the existing test suites are the correctness gate, not new tests. No new test files are needed unless the module boundary reveals an untested seam.

## Risk

The module sits on the entire LSP request/compilation pipeline (per the work item). Mitigated by: (a) this being a pure move with no logic changes, (b) both platform test suites and the tsx-spawned integration tests exercising the moved code directly, and (c) every claim in this design having been verified against the actual repo state and a live repro rather than assumed from the prior attempt's notes.
