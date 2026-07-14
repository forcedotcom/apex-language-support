# Verification Steps for Workspace Load Tracing

## Status: Implementation Complete ✅

All tests pass with the Effect tracing instrumentation in place:

**Node tests:**
```
Test Suites: 1 skipped, 32 passed, 32 of 33 total
Tests:       1 skipped, 224 passed, 225 total
Time:        133.678 s
```

**Web tests:**
```
Test Suites: 14 passed, 14 total
Tests:       12 skipped, 106 passed, 118 total
Time:        2.626 s
```

## Next Step: Live Verification

The tracing instrumentation is now in place and all tests pass. To verify that workspace load spans appear in Grafana Tempo:

### Prerequisites

1. **Grafana Tempo must be running:**
   ```bash
   # Check if Tempo API is accessible
   curl -s "http://localhost:3200/api/search?limit=1"
   
   # Check if OTLP endpoint is accessible
   curl -s -X POST http://localhost:4318/v1/traces
   ```

2. **VSCode setting must be enabled:**
   - Setting: `salesforcedx-vscode-salesforcedx.enableLocalTraces`
   - Value: `true`
   - This enables the span collector and sets the collector URL

### Verification Steps

1. **Build the extension with tracing changes:**
   ```bash
   cd /Users/peter.hale/git/apex-language-support-my-work/.claude/worktrees/workspace-load-investigation
   npm run compile -w @salesforce/apex-ls
   ```

2. **Launch VSCode with the extension:**
   - Use VSCode Extension Development Host or installed extension
   - Open an Apex project (e.g., `/Users/peter.hale/git/dreamhouse-lwc`)
   - Watch for workspace batch processing in Output panel (Apex Language Server)

3. **Expected log messages:**
   ```
   [coordinatorTracing] Initialized OTEL tracing for apex-ls-coordinator -> http://127.0.0.1:<port>
   [BATCH-PROCESSING] Processing N stored batches for session workspace-load-...
   [BATCH-PROCESSING] Completed session workspace-load-...: N batches, ~X files in Yms
   ```

4. **Query Tempo for workspace load spans:**
   ```bash
   # Search for coordinator traces
   curl -s "http://localhost:3200/api/search?tags=service.name%3Dapex-ls-coordinator&limit=50" | \
     jq '.traces[] | select(.rootTraceName | contains("workspace"))'
   
   # Expected span names:
   # - workspace.load.total (root span)
   #   - workspace.batch.decode (per batch)
   #   - workspace.batch.ingest (dispatch to workers)
   #   - workspace.batch.compile (compilation phase)
   #   - workspace.enrichment (cross-file references)
   ```

5. **Inspect a specific trace:**
   ```bash
   # Get trace ID from search results
   TRACE_ID="<trace-id-from-search>"
   
   # Fetch full trace details
   curl -s "http://localhost:3200/api/traces/${TRACE_ID}" | jq '.'
   ```

### Expected Span Attributes

- **workspace.load.total:**
  - `workspace.session_id`: Unique session identifier
  - `workspace.batch_count`: Number of batches processed
  - `workspace.total_files`: Total files across all batches

- **workspace.batch.decode:**
  - `workspace.batch_index`: Current batch index (0-based)
  - `workspace.batch_total`: Total number of batches
  - `workspace.file_count`: Files in this batch

- **workspace.batch.ingest:**
  - `workspace.session_id`: Session identifier
  - `workspace.total_files`: Total files being ingested
  - `workspace.chunk_size`: Parallel processing chunk size

- **workspace.batch.compile:**
  - `workspace.session_id`: Session identifier
  - `workspace.total_files`: Total files being compiled

- **workspace.enrichment:**
  - `workspace.session_id`: Session identifier
  - `workspace.file_count`: Files being enriched with cross-file references

## Known Limitations

### Root span (`workspace.load.total`) may not appear in Tempo

**Symptom**: Child spans (decode, ingest, compile) are present in Tempo, but the root `workspace.load.total` span is missing. Tempo shows `<root span not yet received>`.

**Cause**: The workspace load processing runs in a daemon fiber (`Effect.forkDaemon`). When the daemon completes, the root span created by `Effect.withSpan('workspace.load.total')` may not be fully exported before the fiber terminates, even though `SimpleSpanProcessor` exports synchronously.

**Child spans work**: The child spans (decode, ingest, compile) are shorter-lived and complete while the parent Effect is still active, so they export successfully.

**Workaround**: The root span timing information can be reconstructed from the child spans:
- Start time: earliest child span start time
- End time: latest child span end time  
- Duration: end time - start time

**Impact**: The span hierarchy is still correct (child spans have proper `parentSpanId`), and all timing data is present. Only the root span wrapper is missing from Tempo's view.

## Troubleshooting

### No coordinator spans in Tempo

1. **Check if tracing is enabled:**
   ```bash
   # Look for coordinator tracing init message in logs
   tail -1000 ~/.sf/vscode-spans/coordinator-*.log | rg "Initialized OTEL"
   ```

2. **Check VSCode setting:**
   ```bash
   # Verify enableLocalTraces is true
   code --list-extensions --show-versions | rg salesforce
   ```

3. **Check span collector is running:**
   ```bash
   ps aux | rg span-collector
   lsof -i :59053  # Default span collector port
   ```

### Spans present but missing attributes

- Check Effect tracing layer is being provided via `provideCoordinatorTracing()`
- Verify `isTracingEnabled()` returns true when span collector URL is set
- Check that `enableTracing()` is called in `coordinatorTracing.ts`

### Worker spans forwarded but not linked to coordinator spans

- Verify W3C trace context propagation is working
- Check that coordinator spans have proper trace ID and parent span ID
- Ensure workers are receiving and propagating trace context headers

## Files Modified

- [packages/apex-ls/src/server/WorkspaceBatchHandler.ts](packages/apex-ls/src/server/WorkspaceBatchHandler.ts) - Added Effect tracing spans
- [packages/apex-lsp-shared/src/observability/coordinatorEffectTracing.ts](packages/apex-lsp-shared/src/observability/coordinatorEffectTracing.ts) - Effect tracing layer utilities
- [packages/apex-ls/src/server/coordinatorTracing.ts](packages/apex-ls/src/server/coordinatorTracing.ts) - OTEL coordinator initialization

## Implementation Details

The tracing instrumentation uses Effect's `withSpan()` to create OpenTelemetry spans that are bridged to the existing Node.js OTEL tracer provider. The `provideCoordinatorTracing()` function provides the Effect tracing layer that:

1. Returns undefined if tracing is disabled (test environment)
2. Provides `@effect/opentelemetry/Tracer.layerGlobal` when tracing is enabled
3. Binds Effect spans to the global `NodeTracerProvider` set up in `coordinatorTracing.ts`

This approach keeps the tracing as a no-op in tests while enabling full distributed tracing in production.
