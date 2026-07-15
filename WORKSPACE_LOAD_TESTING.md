# Workspace Load Testing Guide

This guide explains how to test workspace load with trace collection on a small repository.

## Overview

The profiling branch (`feature/W-23354947-workspace-load-profiling`) has distributed tracing infrastructure in place. This allows you to:
1. Trigger workspace load on server startup
2. Collect OTEL trace data to `~/.sf/vscode-spans/`
3. Analyze traces to identify bottlenecks

## Setup

### 1. Choose Your Test Repository

Use a **small** remote repository for focused testing:
- Fewer files = clearer traces
- Easier to identify bottlenecks
- Faster iteration

Examples:
- A minimal Salesforce DX project (5-10 Apex classes)
- A simple scratch org project
- Any small repo with Apex code

### 2. Configure VSCode Settings

Add to your workspace `.vscode/settings.json`:

```json
{
  "apex.enable": true,
  "apex.performance.enableWorkspaceLoadOnStartup": true,
  "apex.trace.server": "verbose"
}
```

Key settings:
- `enableWorkspaceLoadOnStartup`: Triggers workspace load immediately on server start
- `apex.trace.server`: Enables detailed logging

### 3. Enable Tracing (if not already enabled)

The distributed tracing should already be enabled on this branch based on commits:
- `04f0020d4` - "implement distributed tracing infrastructure for coordinator and workers"
- `5ba25d5dd` - "add deeper worker enrichment instrumentation"

Check if tracing is active:
```bash
ls -la ~/.sf/vscode-spans/
```

You should see `.jsonl` trace files being written.

## Testing Workflow

### Step 1: Clean Trace Directory

Before each test, clear old traces:
```bash
rm -rf ~/.sf/vscode-spans/*.jsonl
```

### Step 2: Open Your Test Repository

1. Open VSCode
2. Open your small test repository
3. Ensure the Apex extension loads

### Step 3: Trigger Workspace Load

The workspace load should trigger automatically due to `enableWorkspaceLoadOnStartup`.

You'll see status bar updates:
- "Apex: Loading workspace..."
- "Apex: Ready"

### Step 4: Collect Trace Data

Check the trace directory:
```bash
ls -lh ~/.sf/vscode-spans/
```

You should see files like:
- `extension-<timestamp>.jsonl` - Extension/coordinator traces
- `worker-<id>-<timestamp>.jsonl` - Worker process traces

### Step 5: Analyze Traces

Use the trace-debugger agent or manual analysis:

```bash
# View raw trace data
cat ~/.sf/vscode-spans/extension-*.jsonl | jq . | less

# Count spans by name
cat ~/.sf/vscode-spans/*.jsonl | jq -r '.name' | sort | uniq -c | sort -rn

# Find slow operations (>100ms)
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.duration > 100000000)' | jq -r '[.name, .duration/1000000 | tostring + "ms"] | @tsv'
```

## Key Span Names to Watch

Based on `packages/apex-lsp-shared/src/observability/tracing.ts`:

### Workspace Load Pipeline
- `workspace.load.total` - End-to-end workspace load
- `workspace.batch.decode` - Batch decoding
- `workspace.batch.ingestChunk` - Chunk ingestion
- `workspace.batch.compileChunk` - Chunk compilation
- `workspace.crossFileEnrichment` - Cross-file enrichment
- `coldReadGate.wait` - Cold read gate waiting

### Worker Operations
- `worker.dataOwner.batchIngest` - Worker batch ingestion
- `worker.compilation.batchCompile` - Worker batch compilation
- `worker.compilation.batchCompile.file` - Per-file compilation

## Expected Results

For a small repository (5-10 files), you should see:
- Clear parent-child span relationships
- Total workspace load time (typically <5 seconds for small repos)
- Breakdown by phase (discovery, compilation, enrichment)
- Worker distribution (which workers processed which files)

## Bottleneck Analysis

Look for:
1. **Long-duration spans** - Operations taking disproportionate time
2. **Sequential work** - Operations that could be parallelized
3. **Idle workers** - Workers waiting for coordination
4. **Repeated work** - Same files processed multiple times

## Next Steps

Once you have trace data:

1. **Identify the critical path** - Longest chain of dependent operations
2. **Find the bottleneck** - Single slowest operation
3. **Measure parallelism** - How much work happens concurrently
4. **Test hypotheses** - Make changes and re-test

## Troubleshooting

### No trace files generated

Check:
- Is tracing enabled? Look for `enableTracing()` calls
- Is the span exporter configured? Check for FileSpanExporter setup
- Are spans being created? Add debug logging

### Trace files empty

Check:
- Is workspace load actually happening? Check status bar
- Are spans being flushed? Look for BatchSpanProcessor shutdown
- Is there an error during load? Check extension logs

### Can't correlate spans across processes

Check:
- Is trace context being propagated? Look for `traceparent` headers
- Are worker spans using parent context?
- Is the trace ID consistent across files?

## Manual Testing Script

If you want to automate testing, create a script:

```bash
#!/bin/bash
# test-workspace-load.sh

REPO_PATH="/path/to/your/small/repo"
TRACE_DIR="$HOME/.sf/vscode-spans"

echo "Cleaning old traces..."
rm -rf "$TRACE_DIR"/*.jsonl

echo "Opening VSCode..."
code "$REPO_PATH"

echo "Waiting for workspace load (30s)..."
sleep 30

echo "Collecting traces..."
ls -lh "$TRACE_DIR"

echo "Analyzing..."
cat "$TRACE_DIR"/*.jsonl | jq -r '.name' | sort | uniq -c | sort -rn | head -20

echo "Done!"
```

## Using the trace-debugger Agent

For automated analysis:

```
Can you analyze the workspace load traces in ~/.sf/vscode-spans/ and identify bottlenecks?
```

The trace-debugger agent can:
- Parse trace files
- Build span trees
- Calculate critical path
- Identify slow operations
- Suggest optimizations
