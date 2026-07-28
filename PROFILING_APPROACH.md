# W-23448544: Workspace Load Performance Profiling Approach

## Investigation Goal

Quantify where workspace-load time goes and why it collides with interactive requests (specifically *find all references*). Deliverable is a profiled understanding with bottleneck rankings, not necessarily code changes.

## Key Infrastructure (Already on Main)

PR #553 (W-23354947) landed at commit `a96d04c25`, providing:
- OTEL span registry with workspace-specific spans
- Worker + coordinator distributed tracing
- CPU/heap profiling service
- Runbooks: `WORKSPACE_LOAD_TESTING.md`, `WORKSPACE_LOAD_TRACING.md`, `VERIFY_TRACING.md`
- Spans exported to `~/.sf/vscode-spans/*.jsonl`
- **trace-debugger** agent for span analysis

## Test Setup

### Branch
- Feature worktree: `feature/W-23448544-workspace-load-perf-profile`
- Based on: `main` @ `a96d04c25` (includes all tracing infrastructure)
- Path: `/Users/peter.hale/git/apex-ls-perf-workspace-load`

### Test Projects Available
1. **dreamhouse-lwc** - Named in WI, anecdotally shows "minutes" to load
2. **apex-recipes** - Larger codebase
3. **apex-perf-project** - Performance-focused test repo

### Required Settings (`.vscode/settings.json`)
```json
{
  "apex.performance.enableWorkspaceLoadOnStartup": true,
  "apex.trace.server": "verbose"
}
```

## Profiling Methodology

### Automated Script
[scripts/profile-workspace-load.sh](scripts/profile-workspace-load.sh)

Steps:
1. Clear old span files (`~/.sf/vscode-spans/*.jsonl`)
2. Launch VSCode Extension Development Host
3. Open test project (triggers workspace load on startup)
4. Wait for load completion ("Apex: Ready" in status bar)
5. Collect and summarize span data

### Manual VSCode Launch
Alternatively, use VS Code launch config "Run Extension":
1. F5 in this workspace
2. In Extension Development Host, open test project
3. Monitor status bar for workspace load progress
4. Analyze spans after completion

## Test Scenarios

### 1. Baseline: Workspace Load Alone
- Measure total `workspace.load.total` duration
- Break down by phase:
  - `workspace.batch.decode`
  - `workspace.batch.ingestChunk`
  - `workspace.batch.compileChunk`
  - `workspace.crossFileEnrichment`
- Identify per-file outliers (`worker.compilation.batchCompile.file`)

### 2. Contention: Load + Concurrent Find-All-References
- Start workspace load
- Trigger *find all references* mid-load
- Measure:
  - References latency during load vs. idle
  - `coldReadGate.wait` time (evidence of contention)
  - Request pool saturation

## Key Span Names to Observe

From [tracing.ts](packages/apex-lsp-shared/src/observability/tracing.ts):
- `workspace.load.total` - End-to-end load
- `workspace.batch.decode` - Batch decoding
- `workspace.batch.ingestChunk` - Chunk ingestion (data-owner)
- `workspace.batch.compileChunk` - Chunk compilation
- `workspace.crossFileEnrichment` - Cross-file enrichment
- `coldReadGate.wait` - Contention indicator
- `worker.compilation.batchCompile.file` - Per-file compile cost

## Architecture Context

### Contention Hypothesis
Both workspace batch compilation AND find-all-references route through the **request pool** worker:
- Routing map: [WorkerCoordinator.ts:619-654](packages/apex-ls/src/server/WorkerCoordinator.ts#L619-L654)
- References config: Priority.Low, 15s timeout, 0 retries ([ServiceConfiguration.ts:90-130](packages/lsp-compliant-services/src/config/ServiceConfiguration.ts#L90-L130))

References does:
1. Full-detail cursor recompile
2. Standalone parse of every lexical candidate
See: [worker.platform.shared.ts:2090-2229](packages/apex-ls/src/worker.platform.shared.ts#L2090-L2229)

### Batch Pipeline
- Coordinator: [LCSAdapter.ts:586-602](packages/apex-ls/src/server/LCSAdapter.ts#L586-L602)
- Handler: [WorkspaceBatchHandler.ts:594-1036](packages/apex-ls/src/server/WorkspaceBatchHandler.ts#L594-L1036)
- Chunk size: 100 files per batch
- Send concurrency: clamped to 2, yields between batches ([workspace-loader.ts:335](packages/apex-lsp-vscode-extension/src/workspace-loader.ts#L335))

### Worker Topology
- **Coordinator** (LCSAdapter) - Orchestrates batches
- **Data-owner** - Storage + ingest
- **Compilation** - Parse + symbol tables
- **Request pool** - LSP requests + batch compile chunks
- **Resource loader** - Stdlib + metadata

## Analysis Workflow

### 1. Collect Spans
```bash
# Option A: Automated
./scripts/profile-workspace-load.sh ~/git/dreamhouse-lwc

# Option B: Manual
rm -rf ~/.sf/vscode-spans/*.jsonl
code --extensionDevelopmentPath=./packages/apex-lsp-vscode-extension ~/git/dreamhouse-lwc
# Wait for load, then analyze
```

### 2. Quick Analysis (CLI)
```bash
# Count spans
cat ~/.sf/vscode-spans/*.jsonl | wc -l

# Top span types
cat ~/.sf/vscode-spans/*.jsonl | jq -r '.name' | sort | uniq -c | sort -rn | head -20

# Workspace-specific spans
cat ~/.sf/vscode-spans/*.jsonl | jq -r 'select(.name | test("workspace")) | .name' | sort | uniq -c

# Slow operations (>100ms)
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.duration > 100000000)' | jq -r '[.name, .duration/1000000 | tostring + "ms"] | @tsv'

# Per-file compile costs
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.name == "worker.compilation.batchCompile.file") | {file: .attributes.file, duration_ms: (.duration / 1000000)}' | jq -s 'sort_by(.duration_ms) | reverse | .[:10]'
```

### 3. Deep Analysis (trace-debugger Agent)
```
Can you analyze the workspace load traces in ~/.sf/vscode-spans/ and identify:
1. Total workspace.load.total duration
2. Critical path (longest chain of dependent spans)
3. Per-phase breakdown (decode, ingest, compile, enrichment)
4. Top 10 slowest per-file compiles
5. Evidence of contention (coldReadGate.wait spans)
6. Redundant work (files compiled multiple times)
```

## Expected Findings

### Hypothesis 1: Request Pool Saturation
- Batch compile chunks + interactive references both contend for request pool
- References experience elevated latency during load
- `coldReadGate.wait` spans indicate blocked requests

### Hypothesis 2: Per-File Compile Outliers
- Large files or complex inheritance hierarchies dominate compile time
- Symbol table construction (`addSymbolTable`) is the hot path

### Hypothesis 3: Redundant Recompiles
- Files compiled during batch load, then recompiled by references
- No shared compilation result cache

### Hypothesis 4: Send Concurrency Too Conservative
- Clamped to 2 concurrent batches
- Underutilizes worker pool (4-6 workers available)

## Deliverable

### Findings Document
- Bottleneck ranking (critical path, slowest operations)
- Contention evidence (references latency, coldReadGate.wait)
- Quantified per-phase breakdown
- Candidate optimizations sequenced as follow-up WIs

Example optimizations:
1. Isolate batch compilation from interactive requests (separate worker or priority queue)
2. Tune chunk size / send concurrency
3. Cache compilation results to avoid redundant recompiles
4. Stream early symbol data to unblock references sooner

### Post to WI
Summary of findings, critical-path timings, span evidence, and recommended follow-up work items.

## Verification

- [ ] Worktree created on `feature/W-23448544-workspace-load-perf-profile`
- [ ] Extension builds successfully (`npm run compile`)
- [ ] Test project settings configured
- [ ] Profiling run produces spans in `~/.sf/vscode-spans/*.jsonl`
- [ ] Spans include `workspace.load.total` and child spans
- [ ] trace-debugger yields critical-path breakdown
- [ ] Findings documented with span evidence
