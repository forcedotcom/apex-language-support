# LSP Compliant Services

Standard Language Server Protocol (LSP) compliant services for the Apex Language Server.

## Overview

This package implements services that conform to the LSP specification, providing core language features for Apex development within any LSP-compatible editor or IDE.

## Features

- Text document synchronization with intelligent caching
- Code completion
- Hover information
- Document symbols
- Document formatting
- Persistent storage interface for AST, symbol tables, and references
- Platform-agnostic capabilities system with mode-based optimization
- Per-listener parse result caching for optimal performance

## Dependencies

- `@salesforce/apex-lsp-parser-ast`: Apex language parser and AST functionality from this monorepo
- `@salesforce/apex-lsp-custom-services`: Custom services from this monorepo
- `vscode-languageserver`: VSCode Language Server implementation
- `vscode-languageserver-protocol`: LSP protocol definitions

## Document Synchronization

The server handles all standard LSP document synchronization events (`didOpen`, `didChange`, `didSave`, `didClose`) with intelligent caching to avoid redundant parsing.

### Parse Result Caching

A unified cache stores parse results keyed by document URI and version:

- **Version-based invalidation**: Cache entries are invalidated when document versions change.
- **LRU eviction**: Least recently used entries are evicted when the cache is full.
- **Type-safe retrieval**: Specialized getter methods for symbol tables and folding ranges.

The following services automatically benefit from caching:

- **DocumentProcessingService**: Handles `didOpen` and `didChange` events
- **DocumentSaveProcessingService**: Handles `didSave` events
- **DiagnosticProcessingService**: Provides diagnostic information
- **ApexDocumentSymbolProvider**: Provides document outline/symbols
- **ApexFoldingRangeProvider**: Provides code folding ranges

### Document Processing Pipeline

1. LSP document event received
2. Check for cached parse results
3. On cache hit, return cached data immediately
4. On cache miss, perform full compilation with appropriate listener
5. Store results in cache
6. Update global symbol table and cross-file reference graph
7. Return processed results to client

### Cache Configuration

Cache behavior can be configured through server settings:

```json
{
  "apex": {
    "cache": {
      "maxSize": 100,
      "enableStatistics": true,
      "logLevel": "debug"
    }
  }
}
```

- **`maxSize`** (number, default: `100`): Maximum number of documents to cache.
- **`enableStatistics`** (boolean, default: `true`): Enable cache performance statistics.
- **`logLevel`** (string, default: `"debug"`): Logging level for cache operations.

## Request Prerequisite Orchestration

The `PrerequisiteOrchestrationService` ensures all LSP requests have the required symbol enrichment level before processing.

### Detail Levels

Symbol tables are progressively enriched through layered compilation:

- **`'public-api'`**: Fast, public-only symbol collection for immediate feedback
- **`'protected'`**: Adds protected members for inheritance analysis
- **`'private'`**: Adds private members (full visibility)
- **`'full'`**: Equivalent to `'private'` — all layers applied

### Prerequisite Requirements by Request Type

| Request Type     | Required Detail Level | Rationale                                      |
| ---------------- | --------------------- | ---------------------------------------------- |
| `documentSymbol` | `'public-api'`        | Public outline sufficient for navigation       |
| `hover`          | `'public-api'`        | Public information sufficient for quick info   |
| `completion`     | `'protected'`         | Need protected members for inheritance context |
| `diagnostics`    | `'full'`              | Need all members for complete validation       |
| `references`     | `'full'`              | Need all members to find all references        |
| `definition`     | `'full'`              | Need all members for accurate navigation       |

### Enrichment Process

When a request requires a higher detail level than currently available, the system progressively applies visibility layers without re-parsing. The cached parse tree is walked again with additional listeners, making enrichment significantly faster than a full reparse.

Each layer is applied at most once per file. The symbol table tracks its current detail level to prevent redundant enrichment.

## Capabilities System

The capabilities system provides platform-agnostic feature management with mode-specific optimizations.

### Server Modes

- **Production Mode**: Optimized for performance and stability. Disables hover provider, completion resolve provider, and will-save notifications. Uses full text document sync.
- **Development Mode**: Full feature set with incremental text document sync and enhanced diagnostic processing.
- **Test Mode**: Optimized for consistent behavior across test runs.

### Usage

```typescript
import { ApexCapabilitiesManager } from '@salesforce/apex-lsp-compliant-services';

const manager = ApexCapabilitiesManager.getInstance();
manager.setMode('development');
const capabilities = manager.getCapabilities();
```

Custom overrides can be applied via `LSPConfigurationManager`:

```typescript
import { LSPConfigurationManager } from '@salesforce/apex-lsp-compliant-services';

const configManager = new LSPConfigurationManager({
  mode: 'development',
  customCapabilities: {
    hoverProvider: false,
  },
});
const capabilities = configManager.getCapabilities();
```

For detailed information, see [Capabilities Documentation](docs/CAPABILITIES.md) and [LSP Implementation Status](docs/LSP_IMPLEMENTATION_STATUS.md).

## Configuration

The language server accepts configuration through standard LSP mechanisms:

- Initial configuration via `initializationOptions` in the LSP initialize request
- Runtime configuration changes via `workspace/didChangeConfiguration` notifications
- Client-specific configuration files (e.g., VS Code `settings.json`)

Configuration changes are applied immediately without requiring a server restart.

### Configuration Sections

The server looks for configuration in these sections (in order of precedence):

1. `apex`
2. `apexLanguageServer`
3. `apex.languageServer`
4. `salesforce.apex`

### Comment Collection Settings

```json
{
  "apex": {
    "commentCollection": {
      "enableCommentCollection": true,
      "includeSingleLineComments": false,
      "associateCommentsWithSymbols": false,
      "enableForDocumentChanges": true,
      "enableForDocumentOpen": true,
      "enableForDocumentSymbols": false,
      "enableForFoldingRanges": false
    }
  }
}
```

- **`enableCommentCollection`** (boolean, default: `true`): Master switch for comment collection.
- **`includeSingleLineComments`** (boolean, default: `false`): Include single-line (`//`) comments in addition to block comments.
- **`associateCommentsWithSymbols`** (boolean, default: `false`): Associate comments with nearby symbols. More computationally expensive.
- **`enableForDocumentChanges`** (boolean, default: `true`): Collect comments when documents are modified.
- **`enableForDocumentOpen`** (boolean, default: `true`): Collect comments when documents are opened.
- **`enableForDocumentSymbols`** (boolean, default: `false`): Collect comments for document symbol requests. Disabled by default for performance.
- **`enableForFoldingRanges`** (boolean, default: `false`): Collect comments for folding range requests. Disabled by default for performance.

### Performance Settings

```json
{
  "apex": {
    "performance": {
      "commentCollectionMaxFileSize": 102400,
      "useAsyncCommentProcessing": true,
      "documentChangeDebounceMs": 300
    }
  }
}
```

- **`commentCollectionMaxFileSize`** (number, default: `102400` for Node.js, `51200` for browser): Maximum file size in bytes for comment collection.
- **`useAsyncCommentProcessing`** (boolean, default: `true`): Use asynchronous processing for comment collection in large files.
- **`documentChangeDebounceMs`** (number, default: `300` for Node.js, `500` for browser): Debounce delay for document change events.

### Environment Settings

```json
{
  "apex": {
    "environment": {
      "profilingMode": "none",
      "profilingType": "cpu",
      "commentCollectionLogLevel": "info",
      "additionalDocumentSchemes": []
    }
  }
}
```

- **`profilingMode`** (string, default: `"none"`): Profiling mode for the language server (desktop only).
  - `"none"`: Disabled.
  - `"full"`: Continuous profiling from server startup. Best for performance testing over a test suite.
  - `"interactive"`: Manual start/stop via inspector API. Best for studying particular events.
- **`profilingType`** (string, default: `"cpu"`): Type of profiling — `"cpu"`, `"heap"`, or `"both"` (desktop only).
- **`commentCollectionLogLevel`** (string, default: `"info"`): Log level for comment collection. Options: `"debug"`, `"info"`, `"warn"`, `"error"`.
- **`additionalDocumentSchemes`** (array, default: `[]`): Additional URI schemes for Apex language services. Each entry has:
  - **`scheme`** (string, required): The URI scheme name.
  - **`excludeCapabilities`** (array, optional): LSP capabilities to exclude. Valid values: `"documentSymbol"`, `"hover"`, `"foldingRange"`, `"diagnostic"`, `"completion"`, `"definition"`, `"codeLens"`, `"executeCommand"`.

  Default schemes (`"file"`, `"apexlib"`, `"vscode-test-web"`) are always included and cannot be modified. Additional schemes apply to all capabilities unless explicitly excluded.

### VS Code Configuration Example

```json
{
  "apex.commentCollection.enableCommentCollection": true,
  "apex.commentCollection.includeSingleLineComments": false,
  "apex.commentCollection.associateCommentsWithSymbols": true,
  "apex.performance.commentCollectionMaxFileSize": 200000,
  "apex.environment.profilingMode": "full",
  "apex.environment.profilingType": "both"
}
```

### Environment-Specific Defaults

The language server applies different defaults based on the runtime environment:

- **Node.js**: Higher file size limits (100KB), shorter debounce delays (300ms).
- **Browser**: Lower file size limits (50KB), longer debounce delays (500ms), more conservative memory usage.

## Persistent Storage

The package includes a storage interface for persisting AST, symbol tables, and references across sessions. Host integrations provide runtime-specific implementations — for example, filesystem-backed storage for desktop hosts and browser-backed storage for web hosts.

```typescript
import {
  ApexStorageManager,
  ApexStorageInterface,
} from '@salesforce/apex-lsp-compliant-services';

ApexStorageManager.getInstance({
  storageFactory: (options) => {
    // Provide your host-specific ApexStorageInterface implementation
    throw new Error('Provide a storage implementation for your runtime');
  },
  storageOptions: {
    storagePath: '/path/to/storage',
  },
  autoPersistIntervalMs: 30000,
});

await ApexStorageManager.getInstance().initialize();

const storage: ApexStorageInterface =
  ApexStorageManager.getInstance().getStorage();

connection.onShutdown(async () => {
  await ApexStorageManager.getInstance().shutdown();
});
```

## Development

```bash
# Compile the package
npm run compile

# Watch for changes during development
npm run dev
```
