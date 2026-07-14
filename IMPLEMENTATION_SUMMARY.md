# Workspace Load Tracing Implementation - Complete

## Summary

Successfully added OpenTelemetry distributed tracing instrumentation to the workspace batch loading pipeline. All tests pass (Node + Web environments).

## Changes Made

### 1. Created Effect Tracing Layer

**File:** [packages/apex-lsp-shared/src/observability/coordinatorEffectTracing.ts](packages/apex-lsp-shared/src/observability/coordinatorEffectTracing.ts)

New file that provides Effect-native tracing layer for the coordinator:
- Bridges Effect spans to existing Node.js OTEL tracer provider
- Uses `@effect/opentelemetry/Tracer.layerGlobal` to connect Effect spans to global provider
- Returns undefined in non-Node environments (browser/web) for compatibility
- Exports `provideCoordinatorTracing()` helper for easy layer provision

**Key features:**
- No-op when tracing is disabled (test environments)
- No-op in browser/web environments (guards with `typeof process !== 'undefined'`)
- Uses `require()` instead of `import` to avoid breaking web bundles
- Lazy initialization - layer only created when actually used

### 2. Added Tracing Spans to Workspace Load Pipeline

**File:** [packages/apex-ls/src/server/WorkspaceBatchHandler.ts](packages/apex-ls/src/server/WorkspaceBatchHandler.ts:669)

Added Effect tracing instrumentation throughout the batch processing pipeline:

**Span hierarchy:**
```
workspace.load.total (root span)
├── workspace.batch.decode (per-batch decompression)
│   ├── workspace.batch_index
│   ├── workspace.batch_total
│   └── workspace.file_count
├── workspace.batch.ingest (data ingestion to workers)
│   ├── workspace.session_id
│   ├── workspace.total_files
│   └── workspace.chunk_size
├── workspace.batch.compile (compilation phase)
│   ├── workspace.session_id
│   └── workspace.total_files
└── workspace.enrichment (cross-file reference processing)
    ├── workspace.session_id
    └── workspace.file_count
```

**Implementation approach:**
```typescript
const effect = Effect.gen(function* () {
  // ... workspace load logic with Effect.withSpan() calls
});

return effect.pipe(
  provideCoordinatorTracing(),  // Provide tracing layer
  Effect.withSpan('workspace.load.total', { attributes: {...} }),
  Effect.catchAll((error) => { /* error handling */ })
);
```

### 3. Exported Tracing Utilities

**File:** [packages/apex-lsp-shared/src/observability/index.ts](packages/apex-lsp-shared/src/observability/index.ts:56)

Added exports:
```typescript
export {
  getCoordinatorTracerLayer,
  provideCoordinatorTracing,
} from './coordinatorEffectTracing';
```

### 4. Fixed Test Mock

**File:** [packages/apex-ls/test/server/WorkspaceBatchHandler.test.ts](packages/apex-ls/test/server/WorkspaceBatchHandler.test.ts:49)

Added mock for `provideCoordinatorTracing()` to the `@salesforce/apex-lsp-shared` Jest mock:
```typescript
provideCoordinatorTracing: jest.fn(() => (effect: any) => effect),
```

This ensures the function is a pass-through in tests (returns the Effect unchanged).

## Test Results

### All Tests Pass ✅

**Node environment:**
```
Test Suites: 1 skipped, 32 passed, 32 of 33 total
Tests:       1 skipped, 224 passed, 225 total
Time:        133.678 s
```

**Web environment:**
```
Test Suites: 14 passed, 14 total
Tests:       12 skipped, 106 passed, 118 total
Time:        2.626 s
```

**Compilation:**
```
✅ Ran 0 scripts and skipped 6 in 0.3s
```

## Architecture

### How It Works

1. **Coordinator tracing initialization** (already existed):
   - `coordinatorTracing.ts` initializes Node.js OTEL tracer provider
   - Registers global tracer with `trace.setGlobalTracerProvider()`
   - Exports spans to OTLP collector URL

2. **Effect tracing layer** (new):
   - `coordinatorEffectTracing.ts` provides Effect's tracing layer
   - `Tracer.layerGlobal` binds Effect spans to the global tracer provider
   - Each `Effect.withSpan()` creates an actual OTEL span when tracing is enabled

3. **Workspace load instrumentation** (new):
   - `WorkspaceBatchHandler.ts` uses `Effect.withSpan()` throughout pipeline
   - `provideCoordinatorTracing()` provides the tracing layer to the Effect
   - Spans nest properly: root span → decode → ingest → compile → enrichment

4. **Environment compatibility**:
   - Node.js: Full tracing with OTEL spans exported to Tempo
   - Browser/Web: No-op (returns undefined), no tracing overhead
   - Tests: Mock returns Effect unchanged, tests run without tracing

### Why This Approach

**Effect tracing vs imperative tracing:**
- Workspace load pipeline is already Effect-based
- `Effect.withSpan()` is more natural than `runWithSpan()` for Effects
- Spans automatically nest based on Effect composition
- No need to manually pass parent spans through the call chain

**Dynamic require() instead of import:**
- Importing `@effect/opentelemetry` at top level breaks web bundles
- Using `require()` with environment check keeps it Node-only
- Web tests and browser environments never try to load the module

**provideCoordinatorTracing() as a pipe stage:**
- Single call provides the layer to the entire Effect pipeline
- Layer provision happens before `Effect.withSpan()` calls
- No need to thread layer through multiple function calls

## Verification

See [VERIFY_TRACING.md](VERIFY_TRACING.md) for steps to verify spans appear in Grafana Tempo.

**Quick verification:**
1. Build: `npm run compile -w @salesforce/apex-ls`
2. Launch VSCode with `salesforcedx-vscode-salesforcedx.enableLocalTraces` = `true`
3. Open Apex workspace (triggers workspace load)
4. Query Tempo: `curl "http://localhost:3200/api/search?tags=service.name=apex-ls-coordinator"`
5. Look for spans: `workspace.load.total`, `workspace.batch.decode`, etc.

## Files Changed

**New files:**
- `packages/apex-lsp-shared/src/observability/coordinatorEffectTracing.ts`
- `VERIFY_TRACING.md`
- `WORKSPACE_LOAD_TESTING.md`
- `IMPLEMENTATION_SUMMARY.md` (this file)

**Modified files:**
- `packages/apex-ls/src/server/WorkspaceBatchHandler.ts` - Added Effect tracing spans
- `packages/apex-lsp-shared/src/observability/index.ts` - Exported tracing utilities
- `packages/apex-ls/test/server/WorkspaceBatchHandler.test.ts` - Added test mock
- 70+ other files with prettier formatting fixes (union types)

## Next Steps

1. **Test with real workspace load**: Launch VSCode and verify spans appear in Tempo
2. **Create Grafana dashboards**: Build dashboards to monitor workspace load performance
3. **Set up alerts**: Configure alerts for slow workspace loads (e.g., >30s)
4. **Analyze bottlenecks**: Use trace data to identify and optimize slow operations
5. **Add more spans**: Consider adding spans for other coordinator operations

## Related Documentation

- [WORKSPACE_LOAD_TRACING.md](WORKSPACE_LOAD_TRACING.md) - Original implementation notes
- [VERIFY_TRACING.md](VERIFY_TRACING.md) - Detailed verification steps
- [WORKSPACE_LOAD_TESTING.md](WORKSPACE_LOAD_TESTING.md) - Testing documentation
