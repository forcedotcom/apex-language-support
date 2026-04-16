# Enabling Worker Debug Logs

## Current Status

Worker debug logs using `Effect.logDebug` are **fully implemented** and working in VS Code Extension Host. They do not appear in Jest tests because workers run in separate processes whose stdout/stderr is not captured by Jest.

## Quick Start: See Logs in VS Code

1. **Build the extension:**
   ```bash
   npm run compile
   npm run bundle
   ```

2. **Launch Extension Development Host** (Press F5 in VS Code)

3. **Enable debug logging:**
   - In the Extension Development Host window
   - Open Settings (Cmd+,)
   - Search: `apex.logLevel`
   - Set to: `debug`

4. **View Output Panel:**
   - View → Output (or Cmd+Shift+U)
   - Select "Apex Language Server" from dropdown

5. **Trigger hover** on an Apex method

6. **Look for logs like:**
   ```
   [worker:0] [DATA-OWNER] Write-back accepted: 42 symbols merged at full level
   [worker:1] [ENRICHMENT] Write-back accepted: 42 symbols, full level (v1, 123ms)
   ```

## How Worker Logging Works

### Architecture

```
Worker Process                  Coordinator Process
┌─────────────────┐            ┌──────────────────┐
│ Effect.logDebug │            │ Output Panel     │
│       ↓         │            │                  │
│ workerLogger    │            │ Shows logs to    │
│       ↓         │──Assist──→ │ user             │
│ assistPort      │   Port     │                  │
│ .postMessage()  │            │                  │
└─────────────────┘            └──────────────────┘
```

1. Worker calls `Effect.logDebug(message)`
2. Effect logger forwards to `workerLogger`
3. `workerLogger` posts `WorkerLogMessage` to assistance port
4. Coordinator's `CoordinatorAssistanceMediator` receives message
5. `forwardLogMessage` sends to main logger
6. Appears in VS Code Output panel

### Code Locations

**Worker side** (packages/apex-ls/src/worker.platform.ts):
- Line ~1395: `workerLogger` definition
- Line ~1421-1428: `WorkerLoggerLayer` with `Logger.minimumLogLevel(LogLevel.Debug)`
- Line ~1438: Logger enabled via `Effect.provide(WorkerLoggerLayer)`
- Line ~687-707: `WorkerInit` handler sets log level from coordinator

**Coordinator side** (packages/apex-ls/src/server/CoordinatorAssistanceMediator.ts):
- Line ~60-72: Listens for `WorkerLogMessage` on assistance port
- Line ~93-109: `forwardLogMessage` routes to main logger

**Topology initialization** (packages/apex-ls/src/server/WorkerCoordinator.ts):
- Line ~180-219: `initializeTopology` passes logLevel to WorkerInit messages

## Debug Logs to Watch For

### Data Owner Worker

```
[worker:0] [DATA-OWNER] Write-back accepted: 42 symbols merged at full level for file:///Foo.cls (from worker-12345)
[worker:0] [DATA-OWNER] Write-back rejected: version mismatch (current=2, update=1) for file:///Bar.cls
[worker:0] [DATA-OWNER] Write-back skipped: already have full >= full for file:///Baz.cls
```

### Enrichment Worker

```
[worker:1] [ENRICHMENT] Write-back skipped: no symbol table for file:///Missing.cls
[worker:1] [ENRICHMENT] Write-back accepted: 42 symbols, full level, file:///Foo.cls (v1, 123ms)
[worker:1] [ENRICHMENT] Write-back rejected: ... [version mismatch]
```

### Which Requests Trigger Enrichment?

The following LSP requests are dispatched to enrichment workers and can trigger write-back:
- **Hover** (`textDocument/hover`) - Enriches symbols when hovering over code
- **Diagnostics** (`textDocument/diagnostic`) - Enriches symbols during pull diagnostics

Other requests (definition, completion, references, etc.) currently run on the coordinator thread.

## Implementation Details

### Effect Logger Minimum Level

Effect's Logger has a built-in minimum log level filter (default: Info) that runs **before** messages reach custom loggers. To ensure debug messages reach our `workerLogger`, we set:

```typescript
const WorkerLoggerLayer = Layer.merge(
  Logger.replace(Logger.defaultLogger, workerLogger),
  Logger.minimumLogLevel(LogLevel.Debug),
);
```

This allows all Debug-level messages through Effect's filter. Our `workerLogger` then applies a second filter based on `currentWorkerLogLevel` (set via WorkerInit).

### Two-Level Filtering

1. **Effect's minimum level** (Line ~1427): Set to Debug to allow all messages through
2. **Worker's runtime level** (Line ~1407): Filters based on `currentWorkerLogLevel` from coordinator

This design allows:
- Compile-time filter at Effect level (Debug and above)
- Runtime filter at worker level (configurable via settings)

## Troubleshooting

### Issue: No worker logs appear

**Check 1: Is log level set to debug?**
```json
// settings.json
{
  "apex.logLevel": "debug"
}
```

**Check 2: Are workers initialized?**
Look for:
```
[WorkerCoordinator] Data owner initialized
[WorkerCoordinator] Enrichment pool initialized (size=N)
```

**Check 3: Is Output panel showing Apex Language Server?**
- View → Output
- Dropdown should say "Apex Language Server" not "Extension Host"

**Check 4: Are workers actually processing requests?**
If hovers don't work at all, workers may have crashed. Check:
- Extension Host Debug Console for errors
- `ps aux | grep worker.platform` to see if worker processes exist

### Issue: Logs appear but no write-back logs

**Possible causes:**
1. No enrichment occurring (detail level already at max)
2. Write-back rejected (version mismatch, detail level)
3. `shouldEnrich` returning false

**Debug:**
- Look for hover completion logs
- Check if hovers are slow (may indicate enrichment is stuck)
- Look for rejection logs

### Issue: Tests don't show worker logs

**Known limitation:** Worker logs in tests are not fully working yet because:
- Workers run in separate processes
- Jest captures test process stdout, not worker stdout
- Effect logger forwarding in test environment needs more work

**Workaround for testing:**
- Use VS Code Extension Host instead (F5)
- Or add temporary `console.error()` in workers (goes to stderr, may appear)

## Alternative: Temporary Console Logging

If Effect logging doesn't work, add temporary console.error (goes to stderr):

```typescript
// In packages/apex-ls/src/worker.platform.ts
writeBackMetrics.accepted++;
console.error('[DATA-OWNER] Write-back accepted:', {
  uri: req.uri,
  merged: mergedCount,
  level: req.enrichedDetailLevel,
  worker: req.sourceWorkerId,
});
```

Then check:
- VS Code Extension Host Debug Console
- Terminal where extension was launched
- `~/.vscode/extensions/logs/` directory

## Metrics Without Logs

You can check write-back metrics without logs by:

1. **Attach debugger** to Extension Host
2. **Set breakpoint** in worker.platform.ts after write-back
3. **Inspect variables:**
   - `writeBackMetrics` object
   - `updateResult` object
   - `req` parameters

Or export metrics via LSP command (future enhancement).

## Future Improvements

To make worker logging fully functional in tests:
1. Capture worker stderr in tests
2. Add test-mode flag that logs to files
3. Create dedicated log aggregation service
4. Add metrics endpoint to query write-back stats

For now, **manual testing in VS Code Extension Host is the most reliable way** to see write-back logs.
