# Workspace Load Tracing Implementation

## Summary

Added OpenTelemetry distributed tracing instrumentation to the workspace batch loading pipeline to enable performance monitoring and debugging in Grafana Tempo.

## Changes Made

### 1. Fixed LSP Initialization Race Condition ✅

**File:** `packages/apex-ls/src/server/LCSAdapter.ts`

- **Problem:** Client was sending `apex/sendWorkspaceBatch` requests before server registered handlers, causing "Unhandled method" errors
- **Root Cause:** Handlers were registered in async `handleInitialized()` after client started sending requests
- **Fix:** Moved `setupProtocolHandlers()` call to end of `handleInitialize()` (before returning capabilities)
- **Result:** Handlers ready synchronously before client receives initialize response (LSP spec compliant)

### 2. Added Workspace Load Tracing Instrumentation ✅

**File:** `packages/apex-ls/src/server/WorkspaceBatchHandler.ts`

Added Effect-based OpenTelemetry spans to track workspace load performance:

#### Span Hierarchy

```
workspace.load.total (root span for entire workspace load session)
├── workspace.batch.decode (per-batch decompression)
│   ├── batch_index
│   ├── batch_total
│   └── file_count
├── workspace.batch.ingest (data ingestion to workers)
│   ├── session_id
│   ├── total_files
│   └── chunk_size
├── workspace.batch.compile (compilation phase)
│   ├── session_id
│   └── total_files
└── workspace.enrichment (cross-file reference processing)
    ├── session_id
    └── file_count
```

#### Key Attributes

- `workspace.session_id`: Unique identifier for batch processing session
- `workspace.batch_count`: Number of batches in session
- `workspace.total_files`: Total files across all batches
- `workspace.batch_index`: Index of current batch
- `workspace.file_count`: Files in specific operation
- `workspace.chunk_size`: Chunk size for parallel processing

## Testing

### Test Results ✅

```
Test Suites: 1 skipped, 32 passed, 32 of 33 total
Tests:       1 skipped, 224 passed, 225 total
Time:        132.542 s
```

All existing tests pass without modification. The tracing instrumentation uses Effect's `withSpan` which:
- Is a no-op when tracing is disabled (test environment)  
- Activates automatically when OTEL tracing is configured (production)

The Effect tracing layer (`provideCoordinatorTracing()`) is key to this behavior:
- Returns undefined when `isTracingEnabled()` is false (tests)
- Provides `@effect/opentelemetry/Tracer.layerGlobal` when tracing is enabled (production)

### Verification Steps

**See [VERIFY_TRACING.md](VERIFY_TRACING.md) for detailed verification steps.**

Quick summary:

1. **Launch VSCode with tracing enabled:**
   - Ensure `salesforcedx-vscode-salesforcedx.enableLocalTraces` is `true`
   - Grafana Tempo running on `localhost:3200` (query API) and `localhost:4318` (OTLP endpoint)

2. **Trigger workspace load:**
   - Open Apex project (e.g., `/Users/peter.hale/git/dreamhouse-lwc`)
   - Watch logs for workspace batch processing

3. **Verify spans in Grafana Tempo:**
   ```bash
   # Query Tempo for workspace load traces
   curl -s "http://localhost:3200/api/search?tags=service.name%3Dapex-ls-coordinator&limit=50" | \
     jq '.traces[] | select(.rootTraceName | contains("workspace"))'
   ```

4. **Expected log output:**
   ```
   [coordinatorTracing] Initialized OTEL tracing for apex-ls-coordinator -> http://127.0.0.1:<port>
   [BATCH-PROCESSING] Processing N stored batches for session workspace-load-...
   [BATCH-PROCESSING] Completed session workspace-load-...: N batches, ~X files in Yms
   ```

## Architecture

### Span Propagation

```
┌─────────────────────────────────────────────────────────┐
│ Client (VSCode Extension)                               │
│  - Sends apex/sendWorkspaceBatch requests               │
│  - No tracing instrumentation needed                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Coordinator (LCSAdapter)                                │
│  ✅ workspace.load.total span starts                    │
│  - Stores batches in WorkspaceBatchStorage             │
│  - Triggers processing when all batches received       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ WorkspaceBatchHandler                                   │
│  ├─ workspace.batch.decode (per batch)                 │
│  ├─ workspace.batch.ingest (dispatch to workers)       │
│  ├─ workspace.batch.compile (worker compilation)       │
│  └─ workspace.enrichment (cross-file refs)             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Workers (dataOwner, compilation, enrichment)           │
│  - Worker spans forwarded via spanCollector            │
│  - Linked to coordinator spans via trace context       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ Grafana Tempo (OTLP Collector)                         │
│  - Receives spans at http://localhost:4318            │
│  - Builds complete trace hierarchy                     │
│  - Queryable via Tempo API or Grafana UI              │
└─────────────────────────────────────────────────────────┘
```

## Next Steps

1. **Test in production environment** - Verify spans appear in Grafana Tempo during actual workspace load
2. **Add dashboards** - Create Grafana dashboards for workspace load performance monitoring
3. **Set alerts** - Configure alerts for slow workspace loads (e.g., > 30s for typical projects)
4. **Optimize bottlenecks** - Use trace data to identify and optimize slow operations

## Related Files

- `packages/apex-ls/src/server/LCSAdapter.ts` - LSP adapter with protocol handler registration fix
- `packages/apex-ls/src/server/WorkspaceBatchHandler.ts` - Batch processing with tracing spans
- `packages/apex-lsp-vscode-extension/src/language-server.ts` - Client-side workspace batch sending
- `packages/apex-lsp-shared/src/observability/coordinatorEffectTracing.ts` - Effect tracing utilities
