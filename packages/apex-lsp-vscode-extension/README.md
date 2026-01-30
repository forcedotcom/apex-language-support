# Salesforce Apex Language Server Extension

A Visual Studio Code extension providing comprehensive Apex language support powered by a modern TypeScript-based language server.

## Features

### Core Language Support

- **Syntax Highlighting**: Full Apex, SOQL, and Anonymous Apex syntax highlighting
- **Real-time Diagnostics**: Instant error detection and validation as you type
- **Code Intelligence**: Hover information, go-to-definition, find references, and more
- **Document Symbols**: Quick navigation through class members and methods
- **Code Lens**: Inline actionable insights for test methods and class references
- **Folding Ranges**: Smart code folding based on structure and comments
- **Auto-completion**: Context-aware code completion (development mode)

### Advanced Features

- **Missing Artifact Resolution**: Automatically finds and loads referenced types when needed
- **Workspace Loading**: Batch loading of Apex files for comprehensive cross-file analysis
- **Queue-Based Processing**: Priority-based request handling for responsive editing
- **Performance Profiling**: Built-in CPU and heap profiling for performance analysis (desktop only)

### Platform Support

- **Desktop**: Full Node.js-based language server
- **Web**: Browser-based language server for vscode.dev and github.dev

## Installation

1. Install from the VS Code Marketplace or Extensions view
2. Open a workspace containing Apex files (`.cls`, `.trigger`, `.apex`)
3. The language server starts automatically

## Configuration

All settings use the `apex.*` prefix. Configure in VS Code Settings (UI or JSON).

### Quick Start: Recommended Settings

```json
{
  "apex.environment.serverMode": "development",
  "apex.commentCollection.enableCommentCollection": true,
  "apex.performance.documentChangeDebounceMs": 300,
  "apex.logLevel": "info"
}
```

---

## Settings Reference

### Server Mode

Control the language server's operational mode and feature set.

#### `apex.environment.serverMode`

**Type**: `"production"` | `"development"`  
**Default**: `"production"`

Sets the server's operational mode:

- **`production`**: Optimized for performance with minimal features
  - Disabled: hover, completion resolve, will-save notifications
  - Full document sync for reliability
- **`development`**: Full feature set with enhanced diagnostics
  - Enabled: all features including hover and completion
  - Incremental document sync for better performance

**Override**: Set `APEX_LS_MODE` environment variable to force a specific mode.

---

### Comment Collection

Configure how comments are parsed and processed during compilation.

#### `apex.commentCollection.enableCommentCollection`

**Type**: `boolean`  
**Default**: `true`

Master switch for comment collection. When disabled, no comments are collected.

#### `apex.commentCollection.includeSingleLineComments`

**Type**: `boolean`  
**Default**: `false`

Include single-line (`//`) comments in addition to block comments (`/* */`).

#### `apex.commentCollection.associateCommentsWithSymbols`

**Type**: `boolean`  
**Default**: `true`

Associate comments with nearby symbols for enhanced features like hover documentation.  
⚠️ **Performance Impact**: May affect large files.

#### `apex.commentCollection.enableForDocumentChanges`

**Type**: `boolean`  
**Default**: `true`

Enable comment collection when documents are modified.

#### `apex.commentCollection.enableForDocumentOpen`

**Type**: `boolean`  
**Default**: `true`

Enable comment collection when documents are opened.

#### `apex.commentCollection.enableForDocumentSymbols`

**Type**: `boolean`  
**Default**: `false`

Enable comment collection for document symbol requests.  
⚠️ **Performance Impact**: May affect responsiveness.

#### `apex.commentCollection.enableForFoldingRanges`

**Type**: `boolean`  
**Default**: `true`

Enable comment collection for folding range requests.  
⚠️ **Performance Impact**: May affect responsiveness.

---

### Performance Settings

Optimize language server performance for your environment.

#### `apex.performance.commentCollectionMaxFileSize`

**Type**: `number` (bytes)  
**Default**: `102400` (100KB)

Maximum file size for comment collection. Files larger than this skip comment collection.

#### `apex.performance.useAsyncCommentProcessing`

**Type**: `boolean`  
**Default**: `true`

Use asynchronous comment processing to improve UI responsiveness.

#### `apex.performance.documentChangeDebounceMs`

**Type**: `number` (milliseconds)  
**Default**: `300`

Debounce delay for document change processing. Higher values reduce processing frequency.

---

### Logging Settings

Control logging verbosity and output.

#### `apex.logLevel`

**Type**: `"error"` | `"warning"` | `"info"` | `"log"` | `"debug"`  
**Default**: `"info"`

Extension log level for the main extension process.

#### `apex.worker.logLevel`

**Type**: `"error"` | `"warning"` | `"info"` | `"debug"`  
**Default**: `"info"`

Log level for the language server worker process.

#### `apex.worker.enablePerformanceLogs`

**Type**: `boolean`  
**Default**: `false`

Enable detailed performance logging for request processing.

#### `apex.worker.logCategories`

**Type**: `string[]`  
**Default**: `["STARTUP", "LSP", "SYMBOLS", "COMPLETION", "DIAGNOSTICS"]`  
**Options**: `"STARTUP"`, `"LSP"`, `"SYMBOLS"`, `"COMPLETION"`, `"DIAGNOSTICS"`, `"PERFORMANCE"`

Filter log output by category.

---

### Environment Settings

Configure runtime environment and profiling.

#### `apex.environment.profilingMode`

**Type**: `"none"` | `"full"` | `"interactive"`  
**Default**: `"none"`  
**Desktop Only**

Profiling mode for performance analysis:

- **`none`**: Profiling disabled
- **`full`**: Continuous profiling from startup (best for test suites)
- **`interactive`**: Manual start/stop via commands (best for specific events)

#### `apex.environment.profilingType`

**Type**: `"cpu"` | `"heap"` | `"both"`  
**Default**: `"cpu"`  
**Desktop Only**

Type of profiling data to collect when profiling is enabled.

#### `apex.environment.profilingTag`

**Type**: `string`  
**Default**: `""`  
**Desktop Only**

Optional tag appended to profile filenames for organization.

#### `apex.environment.jsHeapSizeGB`

**Type**: `number` (0.1-32 GB)  
**Default**: (Node.js default)  
**Desktop Only**

Set Node.js heap size for large workspaces. Example: `4` for 4GB.

#### `apex.environment.additionalDocumentSchemes`

**Type**: `Array<{ scheme: string, excludeCapabilities?: string[] }>`  
**Default**: `[]`

Add custom URI schemes for language server support beyond default schemes (`file`, `apexlib`, `vscode-test-web`).

**Example**:

```json
{
  "apex.environment.additionalDocumentSchemes": [
    { "scheme": "orgtest" },
    {
      "scheme": "custom",
      "excludeCapabilities": ["codeLens", "hover"]
    }
  ]
}
```

---

### Resource Loading

Control how standard Apex library is loaded.

#### `apex.resources.loadMode`

**Type**: `"lazy"` | `"full"`  
**Default**: `"lazy"`

- **`lazy`**: Load standard library types on-demand
- **`full`**: Load entire standard library at startup

---

### Missing Artifact Resolution

Configure automatic discovery and loading of missing type definitions.

#### `apex.findMissingArtifact.enabled`

**Type**: `boolean`  
**Default**: `true`

Enable automatic finding and loading of missing artifacts when go-to-definition or hover encounters an unknown type.

#### `apex.findMissingArtifact.blockingWaitTimeoutMs`

**Type**: `number` (milliseconds)  
**Default**: `2000`

Maximum time to wait for artifact loading before returning partial results.

#### `apex.findMissingArtifact.indexingBarrierPollMs`

**Type**: `number` (milliseconds)  
**Default**: `100`

Polling interval while waiting for workspace indexing to complete.

#### `apex.findMissingArtifact.maxCandidatesToOpen`

**Type**: `number`  
**Default**: `3`

Maximum number of candidate files to open when searching for a missing type.

#### `apex.findMissingArtifact.timeoutMsHint`

**Type**: `number` (milliseconds)  
**Default**: `1500`

Timeout hint for background artifact searches.

#### `apex.findMissingArtifact.enablePerfMarks`

**Type**: `boolean`  
**Default**: `false`

Enable performance marks for artifact resolution timing analysis.

---

### Workspace Loading

Configure batch loading of workspace files.

#### `apex.loadWorkspace.enabled`

**Type**: `boolean`  
**Default**: `true`

Enable workspace-wide file loading for comprehensive cross-file analysis.

#### `apex.loadWorkspace.maxConcurrency`

**Type**: `number`  
**Default**: `50`

Maximum number of files to process concurrently during workspace load.

#### `apex.loadWorkspace.yieldInterval`

**Type**: `number`  
**Default**: `50`

Number of files to process before yielding control to other tasks.

#### `apex.loadWorkspace.yieldDelayMs`

**Type**: `number` (milliseconds)  
**Default**: `25`

Delay after yielding to prevent blocking the event loop.

#### `apex.loadWorkspace.batchSize`

**Type**: `number`  
**Default**: `100`

Number of files per batch when loading workspace.

---

### Queue Processing

Fine-tune the LSP request queue for your workload.

#### `apex.queueProcessing.maxConcurrency`

**Type**: `object`

Maximum concurrent requests per priority level:

- `CRITICAL`: `100` (reserved for future use)
- `IMMEDIATE`: `50` (hover, completion, signature help)
- `HIGH`: `50` (document open/save, pull diagnostics)
- `NORMAL`: `25` (document changes, background compilation)
- `LOW`: `10` (background indexing, references)
- `BACKGROUND`: `5` (cleanup, statistics)

**Example**:

```json
{
  "apex.queueProcessing.maxConcurrency": {
    "IMMEDIATE": 100,
    "HIGH": 50,
    "NORMAL": 25
  }
}
```

#### `apex.queueProcessing.maxTotalConcurrency`

**Type**: `number`  
**Default**: (sum of all priority levels)

Global limit on total concurrent requests across all priorities.

#### `apex.queueProcessing.yieldInterval`

**Type**: `number`  
**Default**: `50`

Number of requests to process before yielding.

#### `apex.queueProcessing.yieldDelayMs`

**Type**: `number` (milliseconds)  
**Default**: `25`

Delay after yielding to prevent event loop blocking.

---

### Scheduler Settings

Configure queue scheduler behavior.

#### `apex.scheduler.queueCapacity`

**Type**: `object`

Maximum queue size per priority level (all default to `200`).

#### `apex.scheduler.maxHighPriorityStreak`

**Type**: `number`  
**Default**: `50`

Maximum consecutive high-priority requests before processing lower priorities (prevents starvation).

#### `apex.scheduler.idleSleepMs`

**Type**: `number` (milliseconds)  
**Default**: `1`

Sleep duration when queue is idle.

#### `apex.scheduler.queueStateNotificationIntervalMs`

**Type**: `number` (milliseconds)  
**Default**: `200`

Interval for queue state notifications (visible in status bar and queue viewer).

---

### Deferred Reference Processing

Configure background processing of type references.

#### `apex.deferredReferenceProcessing.deferredBatchSize`

**Type**: `number`  
**Default**: `50`

Number of deferred references to process per batch.

#### `apex.deferredReferenceProcessing.initialReferenceBatchSize`

**Type**: `number`  
**Default**: `50`

Number of references to process synchronously before deferring.

#### `apex.deferredReferenceProcessing.maxRetryAttempts`

**Type**: `number`  
**Default**: `10`

Maximum retries for failed reference resolution.

#### `apex.deferredReferenceProcessing.retryDelayMs`

**Type**: `number` (milliseconds)  
**Default**: `100`

Initial delay between retry attempts (increases exponentially).

#### `apex.deferredReferenceProcessing.maxRetryDelayMs`

**Type**: `number` (milliseconds)  
**Default**: `5000`

Maximum retry delay cap.

#### `apex.deferredReferenceProcessing.queueCapacityThreshold`

**Type**: `number` (percentage)  
**Default**: `90`

Queue capacity threshold that triggers deferred processing.

#### `apex.deferredReferenceProcessing.queueDrainThreshold`

**Type**: `number` (percentage)  
**Default**: `75`

Queue capacity threshold below which deferred processing resumes.

#### `apex.deferredReferenceProcessing.circuitBreakerFailureThreshold`

**Type**: `number`  
**Default**: `5`

Consecutive failures before circuit breaker opens.

#### `apex.deferredReferenceProcessing.circuitBreakerResetThreshold`

**Type**: `number`  
**Default**: `50`

Successful operations required to close circuit breaker.

#### `apex.deferredReferenceProcessing.maxDeferredTasksPerSecond`

**Type**: `number`  
**Default**: `10`

Rate limit for deferred task processing.

---

### Debug Settings

Configure Node.js debugging (desktop only).

#### `apex.debug`

**Type**: `"off"` | `"inspect"` | `"inspect-brk"`  
**Default**: `"off"`  
**Desktop Only**

Enable Node.js debugging:

- **`off`**: No debugging
- **`inspect`**: Enable debugging without breaking on startup
- **`inspect-brk`**: Enable debugging with break on startup

#### `apex.debugPort`

**Type**: `number`  
**Default**: `6009`  
**Desktop Only**

Port for Node.js debugger.

---

### Legacy Settings

#### `apex.enable`

**Type**: `boolean`  
**Default**: `true`

Enable/disable the extension.

#### `apex.trace.server`

**Type**: `"off"` | `"messages"` | `"verbose"`  
**Default**: `"off"`

LSP message tracing for debugging (logs to "Apex Language Server" output channel).

#### `apex.custom`

**Type**: `object`  
**Default**: `{}`

Reserved for custom configuration (not currently used).

---

## Commands

Access commands via Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).

### General Commands

- **Apex: Restart Apex Language Server** (`apex-ls-ts.restart.server`)  
  Restart the language server if unresponsive. Also available via status bar click.

- **Apex: Show Aggregated Logs** (`apex.showAggregatedLogs`)  
  View combined logs from extension and language server.

- **Apex: Show Queue State** (`apex-ls-ts.showQueueState`)  
  Display real-time queue state and processing statistics.

- **Apex: Show Performance Settings** (`apex-ls-ts.showPerformanceSettings`)  
  View current performance configuration.

- **Apex: Show Dependency Graph** (`apex-ls-ts.showGraph`)  
  Visualize type dependencies in the workspace.

### Log Level Commands

Quickly change log verbosity without editing settings:

- **Apex: Set Log Level to Error** (`apex-ls-ts.setLogLevel.error`)
- **Apex: Set Log Level to Warning** (`apex-ls-ts.setLogLevel.warning`)
- **Apex: Set Log Level to Info** (`apex-ls-ts.setLogLevel.info`)
- **Apex: Set Log Level to Debug** (`apex-ls-ts.setLogLevel.debug`)

### Profiling Commands (Desktop Only)

Interactive profiling control when `apex.environment.profilingMode` is `"interactive"`:

- **Apex: Start Profiling** (`apex.profiling.start`)  
  Begin collecting profiling data.

- **Apex: Stop Profiling** (`apex.profiling.stop`)  
  Stop profiling and save data to file.

- **Apex: Profiling Status** (`apex.profiling.status`)  
  Check if profiling is currently active.

---

## Views

### Apex Explorer

The extension adds an **Apex Explorer** view in the Activity Bar for quick access to workspace insights and diagnostics.

---

## Usage Examples

### Example 1: Performance-Focused Settings

For large codebases prioritizing speed:

```json
{
  "apex.environment.serverMode": "production",
  "apex.commentCollection.associateCommentsWithSymbols": false,
  "apex.commentCollection.enableForDocumentSymbols": false,
  "apex.commentCollection.enableForFoldingRanges": false,
  "apex.performance.commentCollectionMaxFileSize": 51200,
  "apex.performance.documentChangeDebounceMs": 500,
  "apex.queueProcessing.maxConcurrency": {
    "IMMEDIATE": 100,
    "HIGH": 50,
    "NORMAL": 15
  }
}
```

### Example 2: Development-Focused Settings

For active development with full features:

```json
{
  "apex.environment.serverMode": "development",
  "apex.commentCollection.enableCommentCollection": true,
  "apex.commentCollection.includeSingleLineComments": true,
  "apex.commentCollection.associateCommentsWithSymbols": true,
  "apex.performance.documentChangeDebounceMs": 200,
  "apex.logLevel": "debug",
  "apex.worker.enablePerformanceLogs": true
}
```

### Example 3: Profiling for Performance Analysis (Desktop)

```json
{
  "apex.environment.profilingMode": "interactive",
  "apex.environment.profilingType": "both",
  "apex.environment.profilingTag": "my-test-suite",
  "apex.worker.enablePerformanceLogs": true,
  "apex.worker.logCategories": ["STARTUP", "LSP", "PERFORMANCE"]
}
```

Then use **Apex: Start Profiling** and **Apex: Stop Profiling** commands to capture specific scenarios.

---

## Troubleshooting

### Language Server Not Starting

1. **Check Output Panel**: View → Output → "Apex Language Server"
2. **Restart Server**: Run "Apex: Restart Apex Language Server" command
3. **Verify Files**: Ensure workspace contains `.cls`, `.trigger`, or `.apex` files
4. **Check Conflicts**: Disable other Apex extensions

### Performance Issues

1. **Switch to Production Mode**: Set `"apex.environment.serverMode": "production"`
2. **Reduce Comment Collection**: Disable expensive comment features:
   ```json
   {
     "apex.commentCollection.associateCommentsWithSymbols": false,
     "apex.performance.commentCollectionMaxFileSize": 51200
   }
   ```
3. **Increase Debounce**: `"apex.performance.documentChangeDebounceMs": 500`
4. **Adjust Queue Concurrency**: Lower values for `apex.queueProcessing.maxConcurrency`
5. **Profile Performance** (desktop): Enable profiling to identify bottlenecks

### High Memory Usage (Desktop)

1. **Increase Heap Size**: `"apex.environment.jsHeapSizeGB": 4`
2. **Reduce Concurrency**: Lower `apex.queueProcessing.maxConcurrency` values
3. **Lazy Loading**: `"apex.resources.loadMode": "lazy"`

### Settings Not Applying

1. Settings apply immediately (no restart needed)
2. Check for typos in `settings.json`
3. Verify JSON syntax
4. Use Command Palette: "Preferences: Open Settings (JSON)" to edit directly

### Queue Saturation

If you see queue warnings in the status bar:

1. **View Queue State**: Run "Apex: Show Queue State" command
2. **Increase Capacity**: Adjust `apex.scheduler.queueCapacity`
3. **Increase Concurrency**: Raise `apex.queueProcessing.maxConcurrency`
4. **Check Logs**: Enable performance logs to identify slow operations

---

## Support & Feedback

- **Issues**: [GitHub Issues](https://github.com/forcedotcom/apex-language-support/issues)
- **Repository**: [apex-language-support](https://github.com/forcedotcom/apex-language-support)

---

## License

BSD-3-Clause
