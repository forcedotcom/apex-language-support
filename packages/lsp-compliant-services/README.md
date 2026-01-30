# LSP Compliant Services

Standard Language Server Protocol (LSP) compliant services for the Apex Language Server.

## Overview

This package implements services that conform to the standard Language Server Protocol (LSP) specification. These services provide core language features for Apex development within any LSP-compatible editor or IDE.

## Features

- Text document synchronization with intelligent caching
- Code completion
- Hover information
- Document symbols
- Document formatting
- Additional LSP-specified capabilities
- Persistent storage interface for AST, symbol tables, and references
- Platform-agnostic capabilities system with mode-based optimization
- Server mode configuration (Production/Development/Test)
- Environment-specific feature enablement
- Per-listener parse result caching for optimal performance

## Dependencies

- `@salesforce/apex-lsp-parser-ast`: Apex language parser and AST functionality from this monorepo
- `@salesforce/apex-lsp-custom-services`: Custom services from this monorepo
- `vscode-languageserver`: VSCode Language Server implementation
- `vscode-languageserver-protocol`: LSP protocol definitions

## Document Synchronization

The Apex Language Server implements comprehensive document synchronization with intelligent caching to provide optimal performance for LSP document lifecycle events.

### Document Lifecycle Events

The server handles all standard LSP document synchronization events:

- **`textDocument/didOpen`**: Document opened in the editor
- **`textDocument/didChange`**: Document content modified
- **`textDocument/didSave`**: Document saved to disk
- **`textDocument/didClose`**: Document closed in the editor

### Intelligent Parse Result Caching

The server implements a sophisticated caching system that dramatically improves performance by avoiding redundant parsing operations:

#### Cache Architecture

- **Unified Cache Structure**: Single cache supporting multiple listener types
- **Version-Based Invalidation**: Cache entries are invalidated when document versions change
- **LRU Eviction**: Least recently used entries are evicted when cache is full
- **Type-Safe Retrieval**: Specialized getter methods for different data types

#### Supported Cache Types

1. **Symbol Table Cache** (`ApexSymbolCollectorListener` results):
   - Symbol tables for document structure analysis
   - Diagnostic information for error reporting
   - Used by: document symbols, diagnostics, document lifecycle events

2. **Folding Range Cache** (`ApexFoldingRangeListener` results):
   - Code folding range information
   - Block comment folding ranges
   - Used by: folding range provider

#### Cache Integration Points

The following services automatically benefit from caching:

- **DocumentProcessingService**: Handles `didOpen` and `didChange` events
- **DocumentSaveProcessingService**: Handles `didSave` events
- **DiagnosticProcessingService**: Provides diagnostic information
- **ApexDocumentSymbolProvider**: Provides document outline/symbols
- **ApexFoldingRangeProvider**: Provides code folding ranges

#### Cache Performance Benefits

- **Reduced Compilation**: Avoids re-parsing unchanged documents
- **Faster Response Times**: Cache hits provide near-instant responses
- **Lower CPU Usage**: Eliminates redundant parsing operations
- **Better User Experience**: Smoother editor interactions

#### Cache Statistics

The cache provides detailed statistics for monitoring:

```typescript
interface CacheStats {
  hits: number; // Number of cache hits
  misses: number; // Number of cache misses
  invalidations: number; // Number of version-based invalidations
  evictions: number; // Number of LRU evictions
  hitRate: number; // Cache hit rate percentage
}
```

### Document Processing Pipeline

1. **Event Reception**: LSP document event received
2. **Cache Check**: Check for existing cached parse results
3. **Cache Hit**: Return cached data immediately (fast path)
4. **Cache Miss**: Perform full compilation with appropriate listener
5. **Cache Storage**: Store results for future requests
6. **Symbol Table Updates**: Apply changes to global symbol table
7. **Graph Analysis**: Update cross-file reference graph
8. **Response**: Return processed results to client

## Request Prerequisite Orchestration

The language server uses a sophisticated prerequisite system to ensure all LSP requests have the required data and enrichment level before processing. This system is managed by the `PrerequisiteOrchestrationService`.

### Detail Levels

Symbol tables are progressively enriched through layered compilation with four detail levels:

- **`'public-api'`**: Fast, public-only symbol collection for immediate feedback
- **`'protected'`**: Adds protected members for inheritance analysis
- **`'private'`**: Adds private members (full visibility)
- **`'full'`**: Equivalent to 'private' - all layers applied, complete symbol information

### Prerequisite Requirements by Request Type

Different LSP requests require different levels of symbol enrichment:

| Request Type     | Required Detail Level | Rationale                                      |
| ---------------- | --------------------- | ---------------------------------------------- |
| `documentSymbol` | `'public-api'`        | Public outline sufficient for navigation       |
| `hover`          | `'public-api'`        | Public information sufficient for quick info   |
| `completion`     | `'protected'`         | Need protected members for inheritance context |
| `diagnostics`    | `'full'`              | Need all members for complete validation       |
| `references`     | `'full'`              | Need all members to find all references        |
| `definition`     | `'full'`              | Need all members for accurate navigation       |

### Prerequisite Orchestration Flow

The `PrerequisiteOrchestrationService` ensures prerequisites are met before service execution:

```typescript
async runPrerequisitesForLspRequestType(
  requestType: LSPRequestType,
  documentUri: string
): Promise<PrerequisiteResult> {
  // 1. Verify document exists in storage
  const document = await storage.getDocument(documentUri);
  if (!document) {
    throw new Error(`Document not found: ${documentUri}`);
  }

  // 2. Get or compile symbol table
  let symbolTable = symbolManager.getSymbolTableForFile(documentUri);
  if (!symbolTable) {
    // Compile with public-api layer for initial processing
    const result = await compilerService.compileLayered(
      document.getText(),
      documentUri,
      ['public-api']
    );
    symbolTable = result.result;
    symbolManager.addSymbolTable(documentUri, symbolTable);
  }

  // 3. Check if enrichment is needed
  const requiredLevel = getRequiredDetailLevel(requestType);
  const currentLevel = symbolTable.getDetailLevel();

  if (needsEnrichment(currentLevel, requiredLevel)) {
    // 4. Enrich to required level (reuses cached parse tree!)
    await layerEnrichmentService.enrichToDetailLevel(
      symbolTable,
      requiredLevel,
      documentUri
    );
  }

  return { symbolTable, document };
}
```

### Layered Enrichment Process

When enrichment is needed, the system progressively applies visibility layers without re-parsing:

1. **Check Current Level**: Determine what layers have been applied
   - Symbol table tracks detail level via `symbol._detailLevel` property
   - `symbolTable.getDetailLevel()` returns highest level achieved

2. **Calculate Missing Layers**: Determine which layers to apply
   - From 'public-api' to 'protected': Apply `ProtectedSymbolListener`
   - From 'protected' to 'private': Apply `PrivateSymbolListener`
   - From 'public-api' to 'full': Apply both listeners sequentially

3. **Reuse Parse Tree**: No re-parsing required
   - Parse tree is cached during initial compilation
   - Same parse tree is walked again with new listeners
   - Dramatically faster than re-parsing (milliseconds vs. hundreds of milliseconds)

4. **Apply Listeners**: Walk parse tree with missing layer listeners
   - Each listener collects symbols for its visibility level
   - New symbols are added to existing symbol table
   - Existing symbols may have properties updated

5. **Update Detail Level**: Mark all symbols as enriched
   - After applying private layer, set `symbol._detailLevel = 'full'`
   - Ensures `symbolTable.getDetailLevel()` reports correct level
   - Prevents redundant enrichment on subsequent requests

### Performance Characteristics

The prerequisite system is designed for minimal overhead:

- **Cache First**: Checks for existing symbol tables before compiling
- **Lazy Enrichment**: Only enriches when request requires higher detail level
- **Parse Tree Reuse**: Enrichment reuses cached parse tree (no re-parsing)
- **Single Pass**: Each layer is applied at most once per file
- **Detail Level Tracking**: Prevents redundant enrichment checks

### Example: Diagnostic Request Flow

```typescript
// Client requests diagnostics
Client → textDocument/diagnostic

// Queue routes to DiagnosticProcessingService
LSPQueueManager → DiagnosticProcessingService.processDiagnostic()

// Service requests prerequisites
DiagnosticProcessingService → PrerequisiteOrchestrationService.runPrerequisitesForLspRequestType('diagnostics')

// Prerequisite service checks detail level
PrerequisiteOrchestrationService:
  - Get symbol table for file
  - Current level: 'public-api' (from didOpen)
  - Required level: 'full' (for validation)
  - Needs enrichment: true

// Enrich to full detail level
PrerequisiteOrchestrationService → LayerEnrichmentService.enrichToDetailLevel(table, 'full')

LayerEnrichmentService:
  - Retrieve cached parse tree (no re-parsing!)
  - Apply ProtectedSymbolListener → Add protected symbols
  - Apply PrivateSymbolListener → Add private symbols
  - Update all symbols._detailLevel = 'full'
  - Return enriched symbol table

// Prerequisites complete, run validation
DiagnosticProcessingService:
  - Receive fully enriched symbol table
  - Run TIER 1 validators (10 validators)
  - Run TIER 2 validators (4 validators)
  - Return diagnostics to client
```

### Integration with Services

All LSP request processing services automatically benefit from prerequisite orchestration:

```typescript
export class DiagnosticProcessingService {
  async processDiagnostic(
    params: DocumentDiagnosticParams,
  ): Promise<Diagnostic[]> {
    // Prerequisites handled automatically before this method is called
    const prerequisites =
      await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
        'diagnostics',
        params.textDocument.uri,
      );

    // Symbol table is guaranteed to be at 'full' detail level
    const symbolTable = prerequisites.symbolTable;

    // Run validation with fully enriched symbols
    const results = await this.runValidation(symbolTable);

    return this.mapToLspDiagnostics(results);
  }
}
```

### Symbol Table and Graph Management

The document synchronization system maintains a global symbol table and cross-file reference graph that gets updated with each document change:

#### Symbol Table Updates

When documents are processed, the system:

1. **Parse Document**: Extract symbols using `ApexSymbolCollectorListener`
2. **Remove Old Symbols**: Clear existing symbols for the file from global table
3. **Add New Symbols**: Insert updated symbols into global symbol table
4. **Cross-File Resolution**: Resolve references to symbols in other files
5. **Reference Processing**: Update bidirectional reference relationships

#### Graph Analysis

The system maintains a comprehensive reference graph that tracks:

- **Definition References**: Where symbols are defined
- **Usage References**: Where symbols are used
- **Type Relationships**: Inheritance and interface implementations
- **Method Calls**: Cross-file method invocations
- **Variable References**: Field and variable usage across files

#### Background Processing

Symbol table and graph updates are processed asynchronously for optimal performance:

```typescript
// Document save processing with background symbol updates
const backgroundManager = ApexSymbolProcessingManager.getInstance();
const taskId = backgroundManager.processSymbolTable(symbolTable, document.uri, {
  priority: 'HIGH', // Document save is high priority
  enableCrossFileResolution: true,
  enableReferenceProcessing: true,
});
```

#### Processing Priorities

Different document events have different processing priorities:

- **Document Save**: `HIGH` priority - immediate symbol processing
- **Document Change**: `NORMAL` priority - standard processing
- **Document Open**: `NORMAL` priority - initial symbol loading

#### Cross-File Resolution

The system automatically resolves references across files:

1. **Type Resolution**: Resolve class, interface, and enum references
2. **Method Resolution**: Find method definitions and overloads
3. **Variable Resolution**: Resolve field and variable references
4. **Namespace Resolution**: Handle namespace conflicts and imports

#### Reference Graph Benefits

The maintained reference graph enables:

- **Go-to-Definition**: Navigate to symbol definitions across files
- **Find References**: Locate all usages of a symbol
- **Rename Refactoring**: Safe symbol renaming across the codebase
- **Code Completion**: Context-aware suggestions
- **Hover Information**: Rich symbol information
- **Diagnostic Analysis**: Cross-file error detection

### Configuration

Cache behavior can be configured through the server settings:

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

#### Cache Configuration Options

- **`maxSize`** (number, default: `100`): Maximum number of documents to cache
- **`enableStatistics`** (boolean, default: `true`): Enable cache performance statistics
- **`logLevel`** (string, default: `"debug"`): Logging level for cache operations

### Performance Monitoring

The server logs detailed cache performance information:

```
[NODE] Cache HIT for file:///path/to/FileUtilities.cls (version 1) - 75.50% hit rate
[NODE] Cache MISS for file:///path/to/NewFile.cls (not cached)
[NODE] Merged parse result for file:///path/to/FileUtilities.cls (version 1) - size: 1/100
```

### Symbol Processing Architecture

The document synchronization system uses a sophisticated architecture for managing symbols and references:

#### ApexSymbolProcessingManager

Central manager for all symbol processing operations:

- **Task Queue**: Manages background symbol processing tasks
- **Priority Handling**: Different priorities for different document events
- **Cross-File Resolution**: Resolves references across multiple files
- **Reference Processing**: Maintains bidirectional reference relationships

#### Symbol Processing Flow

1. **Document Event**: LSP document event received
2. **Parse & Extract**: Extract symbols using appropriate listener
3. **Cache Check**: Check for cached parse results
4. **Symbol Removal**: Remove old symbols for the file
5. **Background Processing**: Queue symbol processing task
6. **Cross-File Resolution**: Resolve references to other files
7. **Graph Update**: Update reference graph with new relationships
8. **Storage Persistence**: Persist changes to storage backend

#### Storage Integration

The system integrates with persistent storage for:

- **AST Persistence**: Store parsed abstract syntax trees
- **Symbol Table Persistence**: Persist global symbol table
- **Reference Graph Persistence**: Store cross-file reference relationships
- **Session Recovery**: Restore state across server restarts

### Error Handling

The caching and symbol processing systems include robust error handling:

- **Graceful Degradation**: Cache failures don't break document processing
- **Version Mismatch Handling**: Automatic cache invalidation on version changes
- **Memory Management**: LRU eviction prevents memory leaks
- **Type Safety**: Compile-time validation of cache data types
- **Symbol Processing Errors**: Failed symbol processing doesn't break document sync
- **Cross-File Resolution Errors**: Partial resolution continues with available data
- **Storage Failures**: In-memory fallback when persistent storage fails

## Usage

```typescript
import {} from /* specific services */ '@salesforce/apex-lsp-compliant-services';

// Use the imported services
```

## Capabilities System

This package provides a platform-agnostic capabilities system that enables consistent language server features across different environments while allowing for mode-specific optimizations.

### Server Modes

The system supports three server modes:

- **Production Mode**: Optimized for performance and stability
  - Disabled features: hover provider, completion resolve provider, will-save notifications
  - Full text document sync for reliability
  - Minimal diagnostic processing

- **Development Mode**: Full feature set for development workflows
  - Enabled features: hover provider, completion resolve provider, will-save notifications
  - Incremental text document sync for better performance
  - Enhanced diagnostic processing

- **Test Mode**: Testing-specific features and configurations
  - Optimized for testing environments
  - Consistent behavior across test runs

### Capabilities Management

The capabilities system provides:

- **ApexCapabilitiesManager**: Singleton manager for server mode and capabilities
- **ApexLanguageServerCapabilities**: Defines capability configurations for different modes
- **LSPConfigurationManager**: High-level configuration interface with custom overrides

### Usage Examples

#### Basic Usage

```typescript
import { ApexCapabilitiesManager } from '@salesforce/apex-lsp-compliant-services';

// Get the capabilities manager instance
const manager = ApexCapabilitiesManager.getInstance();

// Set the server mode
manager.setMode('development');

// Get capabilities for the current mode
const capabilities = manager.getCapabilities();
```

#### With Custom Configuration

```typescript
import { LSPConfigurationManager } from '@salesforce/apex-lsp-compliant-services';

// Create configuration manager with custom options
const configManager = new LSPConfigurationManager({
  mode: 'development',
  customCapabilities: {
    hoverProvider: false, // Override hover provider
  },
});

// Get capabilities with custom overrides applied
const capabilities = configManager.getCapabilities();
```

For detailed information about the capabilities system, see:

- [Capabilities Documentation](docs/CAPABILITIES.md)
- [LSP Implementation Status](docs/LSP_IMPLEMENTATION_STATUS.md)

## Configuration

The Apex Language Server supports configurable comment collection settings that can be customized based on your development needs and environment.

### Configuration Overview

The language server accepts configuration through standard LSP mechanisms:

- Initial configuration via `initializationOptions` in the LSP initialize request
- Runtime configuration changes via `workspace/didChangeConfiguration` notifications
- Client-specific configuration files (VS Code settings.json, etc.)

### Configuration Sections

The server looks for configuration in these sections (in order of precedence):

1. `apex`
2. `apexLanguageServer`
3. `apex.languageServer`
4. `salesforce.apex`

### Configuration Schema

#### Comment Collection Settings

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

##### Options:

- **`enableCommentCollection`** (boolean, default: `true`)
  - Master switch for comment collection. When disabled, no comments are collected regardless of other settings.

- **`includeSingleLineComments`** (boolean, default: `false`)
  - Whether to include single-line (`//`) comments in addition to block comments (`/* */`).

- **`associateCommentsWithSymbols`** (boolean, default: `false`)
  - Whether to associate comments with nearby symbols for enhanced language features.
  - Note: This is more computationally expensive and may impact performance.

- **`enableForDocumentChanges`** (boolean, default: `true`)
  - Enable comment collection when documents are modified.

- **`enableForDocumentOpen`** (boolean, default: `true`)
  - Enable comment collection when documents are opened.

- **`enableForDocumentSymbols`** (boolean, default: `false`)
  - Enable comment collection for document symbol requests.
  - Disabled by default for performance reasons.

- **`enableForFoldingRanges`** (boolean, default: `false`)
  - Enable comment collection for folding range requests.
  - Disabled by default for performance reasons.

#### Performance Settings

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

##### Options:

- **`commentCollectionMaxFileSize`** (number, default: `102400` for Node.js, `51200` for browser)
  - Maximum file size in bytes for enabling comment collection.
  - Files larger than this will skip comment collection for performance.

- **`useAsyncCommentProcessing`** (boolean, default: `true`)
  - Whether to use asynchronous processing for comment collection in large files.

- **`documentChangeDebounceMs`** (number, default: `300` for Node.js, `500` for browser)
  - Debounce delay in milliseconds for document change events to avoid excessive processing.

#### Environment Settings

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

##### Options:

- **`profilingMode`** (string, enum: `"none"`, `"full"`, `"interactive"`, default: `"none"`)
  - Profiling mode for the language server (desktop only).
  - **`"none"`**: Profiling disabled (default).
  - **`"full"`**: Continuous profiling from server startup using Node.js flags. Best for performance testing over a test suite of events.
  - **`"interactive"`**: Manual start/stop control via inspector API. Best for studying particular events where it's convenient to isolate profile collection manually. Automatically starts profiling when enabled to capture server initialization.
- **`profilingType`** (string, default: `"cpu"`)
  - Type of profiling to perform when profiling is enabled (desktop only).
  - Options: `"cpu"` for CPU profiling, `"heap"` for heap profiling, or `"both"` for both.
  - Shared between both profiling modes.

- **`commentCollectionLogLevel`** (string, default: `"info"`)
  - Log level for comment collection operations.
  - Options: `"debug"`, `"info"`, `"warn"`, `"error"`

- **`additionalDocumentSchemes`** (array, default: `[]`)
  - Additional URI schemes to include for Apex language services.
  - Allows you to extend language server support to custom document URI schemes beyond the default ones.
  - Each entry is an object with:
    - **`scheme`** (string, required): The URI scheme name (e.g., `"my-custom-scheme"`).
    - **`excludeCapabilities`** (array of strings, optional): List of LSP capabilities to exclude this scheme from. Valid values: `"documentSymbol"`, `"hover"`, `"foldingRange"`, `"diagnostic"`, `"completion"`, `"definition"`, `"codeLens"`, `"executeCommand"`.

  **Important Constraints:**
  - **Immutable Schemes**: The default schemes (`"file"`, `"apexlib"`, `"vscode-test-web"`) are always included and cannot be added or excluded. Attempts to configure these schemes will result in warnings in the server logs.
  - **Immutable Languages**: The languages (`"apex"`, `"apex-anon"`) are always included and cannot be modified.
  - **Default Behavior**: Additional schemes apply to all capabilities by default unless explicitly excluded via `excludeCapabilities`.
  - **Capability-Specific Defaults**:
    - Most capabilities (documentSymbol, hover, foldingRange, diagnostic, completion, definition) include: `"file"`, `"apexlib"`, `"vscode-test-web"`.
    - CodeLens excludes `"apexlib"` by default and only includes: `"file"`, `"vscode-test-web"`.

  **Examples:**

  Add a custom scheme for all capabilities:

  ```json
  {
    "apex": {
      "environment": {
        "additionalDocumentSchemes": [{ "scheme": "orgtest" }]
      }
    }
  }
  ```

  Add a custom scheme only for CodeLens (exclude all other capabilities):

  ```json
  {
    "apex": {
      "environment": {
        "additionalDocumentSchemes": [
          {
            "scheme": "orgtest",
            "excludeCapabilities": [
              "documentSymbol",
              "hover",
              "foldingRange",
              "diagnostic",
              "completion",
              "definition"
            ]
          }
        ]
      }
    }
  }
  ```

  **Note**: If you attempt to add or exclude immutable schemes (like `"file"`), the server will log warnings but continue to operate with the default behavior. Check the server logs for validation warnings.

### Environment-Specific Defaults

The language server automatically applies different defaults based on the runtime environment:

#### Node.js Environment (Default)

- Higher file size limits (100KB)
- Shorter debounce delays (300ms)
- Comment association enabled by default for document operations

#### Browser Environment

- Lower file size limits (50KB) for better performance
- Longer debounce delays (500ms)
- More conservative defaults for memory usage

### Client Configuration Examples

#### VS Code (settings.json)

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

#### Neovim LSP Configuration

```lua
local lspconfig = require('lspconfig')

lspconfig.apex_ls.setup({
  init_options = {
    apex = {
      commentCollection = {
        enableCommentCollection = true,
        includeSingleLineComments = true,
        associateCommentsWithSymbols = true,
      },
      performance = {
        commentCollectionMaxFileSize = 150000,
      }
    }
  }
})
```

#### Emacs LSP Mode

```elisp
(setq lsp-apex-init-options
  '(:apex (:commentCollection
           (:enableCommentCollection t
            :includeSingleLineComments nil
            :associateCommentsWithSymbols t)
           :performance
           (:commentCollectionMaxFileSize 150000))))
```

### Performance Recommendations

#### For Large Codebases

- Keep `enableForDocumentSymbols` and `enableForFoldingRanges` disabled
- Set a reasonable `commentCollectionMaxFileSize` limit
- Use longer debounce delays to reduce processing frequency

#### For Enhanced Features

- Enable `associateCommentsWithSymbols` for better documentation support
- Enable `includeSingleLineComments` for comprehensive comment analysis
- Enable performance logging to monitor impact

#### For Browser/Web Environments

- Use the browser-optimized defaults
- Consider disabling comment collection for very large files
- Monitor memory usage and adjust limits accordingly

### Troubleshooting

#### High CPU Usage

- Reduce `commentCollectionMaxFileSize`
- Increase `documentChangeDebounceMs`
- Disable comment collection for document symbols and folding ranges

#### Missing Comment Features

- Ensure `enableCommentCollection` is `true`
- Check file size limits
- Verify the correct configuration section is being used

#### Configuration Not Applied

- Check the LSP client's configuration mechanism
- Verify the configuration section name
- Enable debug logging to see configuration processing

### Dynamic Configuration Changes

The language server supports runtime configuration changes through the LSP `workspace/didChangeConfiguration` notification. Changes are applied immediately without requiring a server restart.

Example of sending a configuration change:

```json
{
  "method": "workspace/didChangeConfiguration",
  "params": {
    "settings": {
      "apex": {
        "commentCollection": {
          "enableCommentCollection": false
        }
      }
    }
  }
}
```

## Persistent Storage

The package includes a storage interface for persisting AST, symbol tables, and references across sessions. This is particularly useful for large Apex codebases that need more permanent storage than in-memory data structures.

Runtime-specific implementations are provided by both web and extension packages:

- `@salesforce/apex-lsp-extension`: Node.js filesystem-based implementation
- `@salesforce/apex-lsp-web`: Browser IndexedDB-based implementation

### Integrating Storage in LSP Server

```typescript
import {
  ApexStorageManager,
  ApexStorageInterface,
} from '@salesforce/apex-lsp-compliant-services';

// For Node.js (VS Code Extension)
import { NodeFileSystemApexStorage } from '@salesforce/apex-lsp-node';

// Or for Browser
// import { BrowserIndexedDBApexStorage } from '@salesforce/apex-lsp-web';

// Initialize the storage manager with the appropriate implementation
ApexStorageManager.getInstance({
  storageFactory: (options) => new NodeFileSystemApexStorage(),
  storageOptions: {
    // Configuration options for the storage implementation
    storagePath: '/path/to/storage',
  },
  autoPersistIntervalMs: 30000, // Auto-persist every 30 seconds
});

// Initialize the storage
await ApexStorageManager.getInstance().initialize();

// Get the storage instance to use in services
const storage: ApexStorageInterface =
  ApexStorageManager.getInstance().getStorage();

// Use storage in your services
async function storeClassInfo(
  filePath: string,
  classInfo: ApexClassInfo[],
): Promise<void> {
  await storage.storeAst(filePath, classInfo);
}

// Don't forget to shut down the storage when the server is shutting down
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
