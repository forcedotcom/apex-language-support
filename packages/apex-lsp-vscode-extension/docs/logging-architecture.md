# Apex Language Server Logging Architecture

## Overview

The Apex Language Server extension implements a comprehensive logging system that spans both the extension host and web worker environments. This document describes the logging architecture, its components, and how they work together.

## Components

### 1. Extension Logging

- **Channel**: `Apex Language Extension (Typescript)`
- **Purpose**: Logs extension host operations, configuration changes, and lifecycle events
- **Implementation**: Uses VS Code's `OutputChannel` API
- **Location**: `src/logging.ts`

### 2. Worker Logging

- **Channel**: `Apex Worker`
- **Purpose**: Logs web worker operations, LSP messages, and performance metrics
- **Implementation**: Uses LSP's `window/logMessage` notifications
- **Location**: `src/utils/WorkerLogger.ts`

### 3. Aggregated Logging

- **Channel**: `Apex Logs (All)`
- **Purpose**: Combines and chronologically orders logs from both extension and worker
- **Implementation**: Custom `AggregatedLogView` class
- **Location**: `src/logging/AggregatedLogView.ts`

## Log Categories

The worker logger supports the following categories:

- `STARTUP`: Worker initialization and lifecycle events
- `LSP`: Language Server Protocol messages and operations
- `SYMBOLS`: Document symbol processing
- `COMPLETION`: Code completion operations
- `DIAGNOSTICS`: Diagnostic processing
- `PERFORMANCE`: Performance timing metrics

## Configuration

### Extension Settings

```json
{
  "apex-ls-ts.worker.logLevel": {
    "type": "string",
    "enum": ["error", "warning", "info", "debug"],
    "default": "info"
  },
  "apex-ls-ts.worker.enablePerformanceLogs": {
    "type": "boolean",
    "default": false
  },
  "apex-ls-ts.worker.logCategories": {
    "type": "array",
    "items": {
      "type": "string",
      "enum": [
        "STARTUP",
        "LSP",
        "SYMBOLS",
        "COMPLETION",
        "DIAGNOSTICS",
        "PERFORMANCE"
      ]
    }
  }
}
```

## Log Format

All logs follow a consistent format:

```
[timestamp] [source] [category?] [correlationId?] message
```

Example:

```
[12:34:56 PM] [APEX-WORKER] [LSP] [CID:1234-abc] Initialize request received
```

## Correlation IDs

- Generated for operations that span extension and worker
- Format: `${timestamp}-${random}`
- Included in log messages as `[CID:id]`
- Helps track request flow across environments

## Performance Logging

- Enabled via `apex-ls-ts.worker.enablePerformanceLogs`
- Uses `time()` and `timeEnd()` methods
- Logs duration in milliseconds
- Categorized under `PERFORMANCE`

Example:

```
[12:34:56 PM] [APEX-WORKER] [PERFORMANCE] Document Symbol Parsing: 123.45ms
```

## Commands

- `apex-ls-ts.setLogLevel.*`: Set log level (error, warning, info, debug)
- `apex-ls-ts.showAggregatedLogs`: Show combined logs from all channels

## Best Practices

1. **Log Levels**
   - Use appropriate log levels:
     - `error`: Failures and errors
     - `warning`: Potential issues
     - `info`: Important operations
     - `debug`: Detailed debugging

2. **Categories**
   - Always specify a category for worker logs
   - Use the most specific category available
   - Add new categories when needed

3. **Correlation**
   - Use correlation IDs for multi-step operations
   - Pass IDs between extension and worker
   - Include IDs in all related log messages

4. **Performance Logging**
   - Use for expensive operations
   - Keep timer labels descriptive
   - Include relevant context

## Implementation Details

### Extension to Worker Communication

1. Extension sends request to worker
2. Generates correlation ID
3. Logs request with ID
4. Worker receives request
5. Logs processing with same ID
6. Sends response with ID
7. Extension logs completion with ID

### Log Aggregation

1. Monitors both output channels
2. Parses timestamps from log lines
3. Combines and sorts chronologically
4. Updates aggregated view
5. Preserves all log metadata

## Future Improvements

1. **Search and Filtering**
   - Add text search in aggregated view
   - Filter by source/category
   - Time range filtering

2. **Log Analysis**
   - Performance metrics aggregation
   - Operation timing statistics
   - Error pattern detection

3. **Log Persistence**
   - Save logs to disk
   - Load historical logs
   - Log rotation
