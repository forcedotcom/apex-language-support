# Lazy Standard Library SymbolTable Plan

## Goal

Shift stdlib loading from eager full `SymbolTable` instantiation to **index-first + on-demand table hydration**, so startup does less work while preserving lookup correctness.

## Current Hot Path

- `ResourceLoader.initialize()` eagerly loads protobuf cache and stores full symbol table payload in memory via [resourceLoader.ts](/Users/peter.hale/git/apex-language-support/packages/apex-parser-ast/src/utils/resourceLoader.ts).
- `StandardLibraryDeserializer` currently creates a `SymbolTable` per stdlib type and calls `symbolTable.addSymbol(...)` repeatedly in [stdlib-deserializer.ts](/Users/peter.hale/git/apex-language-support/packages/apex-parser-ast/src/cache/stdlib-deserializer.ts).
- `SymbolTable.addSymbol()` emits high-volume debug logs for top-level classes in [symbol.ts](/Users/peter.hale/git/apex-language-support/packages/apex-parser-ast/src/types/symbol.ts).

## Proposed Design

### 1) Introduce a lightweight stdlib index model

- Add a cache data shape in [stdlib-cache-loader.ts](/Users/peter.hale/git/apex-language-support/packages/apex-parser-ast/src/cache/stdlib-cache-loader.ts) and/or [stdlib-deserializer.ts](/Users/peter.hale/git/apex-language-support/packages/apex-parser-ast/src/cache/stdlib-deserializer.ts) that stores:
  - `fileUri`
  - namespace/class-name mappings
  - enough proto payload (or reference) to reconstruct one table later
- Do **not** instantiate runtime `SymbolTable` objects during initial load.

### 2) Keep eager metadata/index population

- Preserve eager setup in [resourceLoader.ts](/Users/peter.hale/git/apex-language-support/packages/apex-parser-ast/src/utils/resourceLoader.ts):
  - `namespaceIndex`
  - `classNameToNamespace`
  - `fileIndex`
  - type registry bootstrap
- Build these from the lightweight index instead of iterating fully materialized `SymbolTable`s.

### 3) Add on-demand SymbolTable materialization API

- Implement lazy hydration at the retrieval boundary in [resourceLoader.ts](/Users/peter.hale/git/apex-language-support/packages/apex-parser-ast/src/utils/resourceLoader.ts):
  - `getSymbolTableFromCache(...)` / `getSymbolTable(...)` should hydrate from indexed proto data only when requested.
- Reuse conversion logic from [stdlib-deserializer.ts](/Users/peter.hale/git/apex-language-support/packages/apex-parser-ast/src/cache/stdlib-deserializer.ts) to avoid behavior drift.

### 4) Define no-eviction lifecycle for hydrated/promoted tables

- Do **not** introduce LRU/eviction in this phase.
- Keep lazy hydration, but once a stdlib table is hydrated and used, keep it resident for session lifetime.
- When symbols are promoted into `ApexSymbolManager` / refs graph, treat manager lifecycle as source of truth (no loader-driven eviction).

### 5) Compatibility and fallback

- Ensure existing consumers of `StandardLibraryCacheLoader.getSymbolTables()` still work:
  - either deprecate with migration path,
  - or provide a compatibility method that materializes lazily per requested key.
- Maintain current behavior for non-stdlib symbol paths.

## Verification

- Add/adjust tests in:
  - [stdlib-deserializer.test.ts](/Users/peter.hale/git/apex-language-support/packages/apex-parser-ast/test/cache/stdlib-deserializer.test.ts) (index correctness + per-type hydration parity)
  - [NamespaceResolutionService.test.ts](/Users/peter.hale/git/apex-language-support/packages/apex-parser-ast/test/namespace/NamespaceResolutionService.test.ts) (no resolution regression)
  - [NamespaceResolution.integration.test.ts](/Users/peter.hale/git/apex-language-support/packages/apex-parser-ast/test/integration/NamespaceResolution.integration.test.ts) (end-to-end behavior unchanged)
- Add performance assertion(s): startup load path should avoid full table construction and reduce init time/log count.
- Run:
  - `npm run compile --workspace=packages/apex-parser-ast`
  - `npm run lint --workspace=packages/apex-parser-ast`
  - targeted tests for cache/resource loader + namespace integration.

## Rollout Sequence

1. Introduce index model and lazy hydrator (no consumer switch yet).
2. Switch `ResourceLoader` read paths to lazy hydrator.
3. Define no-eviction ownership/lifecycle.
4. Remove/replace eager materialization assumptions and stabilize tests.
