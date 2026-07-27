# W-23448544: Workspace Load Performance Profiling — Runbook

## Quick Start

### 1. Clear Old Spans
```bash
rm -rf ~/.sf/vscode-spans/*.jsonl
```

### 2. Launch Extension Development Host
From this workspace (`/Users/peter.hale/git/apex-ls-perf-workspace-load`):
- Press **F5** (or use "Run Extension" launch config)
- Wait for Extension Development Host window to open

### 3. Open Test Project
In the Extension Development Host window:
- File → Open Folder → `/Users/peter.hale/git/dreamhouse-lwc`
- (Or use `~/git/apex-recipes` or `~/git/apex-perf-project`)

### 4. Monitor Workspace Load
Watch the status bar (bottom right):
- Should show: "Apex: Loading workspace..."
- Wait for: "Apex: Ready"

Typical load times:
- dreamhouse-lwc: ~30-60 seconds (anecdotal: "minutes" reported in WI)
- apex-recipes: ~2-5 minutes
- apex-perf-project: varies

### 5. (Optional) Trigger Find-All-References During Load
To test the contention scenario:
- Wait 10-20 seconds after load starts
- Open a `.cls` file
- Right-click a symbol → "Find All References"
- Observe latency (should be elevated if pool is saturated)

### 6. Verify Spans Collected
```bash
ls -lh ~/.sf/vscode-spans/*.jsonl
cat ~/.sf/vscode-spans/*.jsonl | wc -l
```

Expected files:
- `extension-*.jsonl` - Coordinator spans
- `worker-*-*.jsonl` - Worker spans (one per worker)

### 7. Analyze with trace-debugger
```bash
# From any Claude Code session:
Can you analyze the workspace load traces in ~/.sf/vscode-spans/ and report:
1. Total workspace.load.total duration
2. Critical path breakdown
3. Top 10 slowest span types
4. Per-file compile outliers
5. Evidence of contention (coldReadGate.wait spans)
```

## Manual CLI Analysis

### Basic Stats
```bash
# Total spans collected
cat ~/.sf/vscode-spans/*.jsonl | wc -l

# Workspace-specific spans
cat ~/.sf/vscode-spans/*.jsonl | jq -r 'select(.name | test("workspace")) | {name, duration_ms: (.duration / 1000000)}' | jq -s .

# Top 20 span types by count
cat ~/.sf/vscode-spans/*.jsonl | jq -r '.name' | sort | uniq -c | sort -rn | head -20
```

### Critical Metrics

#### Workspace Load Total
```bash
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.name == "workspace.load.total") | {duration_ms: (.duration / 1000000), start: .startTimeUnixNano}'
```

#### Per-Phase Breakdown
```bash
# Decode phase
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.name == "workspace.batch.decode") | .duration / 1000000' | jq -s 'add'

# Ingest phase (data-owner)
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.name == "workspace.batch.ingestChunk") | .duration / 1000000' | jq -s 'add'

# Compile phase
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.name == "workspace.batch.compileChunk") | .duration / 1000000' | jq -s 'add'

# Enrichment phase
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.name == "workspace.crossFileEnrichment") | .duration / 1000000' | jq -s 'add'
```

#### Per-File Compile Costs (Top 10 Slowest)
```bash
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.name == "worker.compilation.batchCompile.file") | {file: .attributes.file, duration_ms: (.duration / 1000000)}' | jq -s 'sort_by(.duration_ms) | reverse | .[:10]'
```

#### Contention Evidence
```bash
# coldReadGate.wait spans (blocking on data-owner)
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.name == "coldReadGate.wait") | {duration_ms: (.duration / 1000000), traceId, spanId}'

# Total wait time
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.name == "coldReadGate.wait") | .duration / 1000000' | jq -s 'add'
```

#### Find-All-References Latency (if triggered during load)
```bash
cat ~/.sf/vscode-spans/*.jsonl | jq 'select(.name | test("references")) | {name, duration_ms: (.duration / 1000000)}' | jq -s .
```

## Troubleshooting

### No span files generated
Check:
1. Is tracing enabled in test project `.vscode/settings.json`?
   ```json
   {
     "apex.performance.enableWorkspaceLoadOnStartup": true,
     "apex.trace.server": "verbose"
   }
   ```
2. Did the extension actually load? (Check "Output" → "Apex Language Server" in Extension Development Host)
3. Did workspace load trigger? (Check status bar for "Apex: Loading workspace...")

### Span files empty or incomplete
- Workspace load may not have completed — wait longer
- Extension may have crashed — check "Output" → "Apex Language Server" for errors
- Span exporter may not have flushed — close the Extension Development Host to force flush

### Can't find workspace.load.total span
- Workspace load on startup may not have triggered
- Try manually triggering: Command Palette → "Apex: Load Workspace"
- Check that `apex.performance.enableWorkspaceLoadOnStartup` is actually set in the test project (not globally)

### Extension doesn't load in Extension Development Host
- Ensure `npm run compile` completed successfully
- Check that `packages/apex-lsp-vscode-extension/out/` exists
- Try "Run Extension (Production Mode)" launch config instead

## Expected Findings Template

```markdown
## Workspace Load Performance — dreamhouse-lwc

### Total Load Time
- workspace.load.total: XXX ms (X.XX seconds)

### Phase Breakdown
- Decode: XX ms (XX%)
- Ingest: XX ms (XX%)
- Compile: XX ms (XX%)
- Enrichment: XX ms (XX%)

### Top 10 Slowest Files
1. File1.cls: XX ms
2. File2.cls: XX ms
...

### Contention Evidence
- coldReadGate.wait total: XX ms across XX spans
- Find-all-references latency: XX ms (vs. XX ms baseline)

### Critical Path
1. workspace.load.total (XX ms)
2.   workspace.batch.compileChunk (XX ms)
3.     worker.compilation.batchCompile.file (XX ms)
...

### Bottleneck Ranking
1. [Phase/Operation]: XX ms, YY% of total
2. ...

### Candidate Optimizations
1. Isolate batch compilation from interactive requests
   - Current: Both use request pool
   - Proposed: Dedicated batch-compile worker or priority queue
2. Tune send concurrency
   - Current: Clamped to 2
   - Proposed: Scale with worker count (4-6)
3. Cache compilation results
   - Current: References recompiles files already compiled during batch
   - Proposed: Shared symbol table cache
```

## Next Steps After Data Collection

1. Run trace-debugger analysis (automated)
2. Fill in findings template (manual)
3. Post summary to W-23448544 with span evidence
4. Propose follow-up WIs for top-ranked optimizations
