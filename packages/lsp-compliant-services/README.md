# LSP Compliant Services

Standard Language Server Protocol (LSP) compliant services for the Apex Language Server.

## Overview

This package implements services that conform to the standard Language Server Protocol (LSP) specification. These services provide core language features for Apex development within any LSP-compatible editor or IDE.

## Features

- Text document synchronization
- Code completion
- Hover information
- Document symbols
- Document formatting
- Additional LSP-specified capabilities
- Persistent storage interface for AST, symbol tables, and references
- Platform-agnostic capabilities system with mode-based optimization
- Server mode configuration (Production/Development/Test)
- Environment-specific feature enablement

## Dependencies

- `@salesforce/apex-lsp-parser-ast`: Apex language parser and AST functionality from this monorepo
- `@salesforce/apex-lsp-custom-services`: Custom services from this monorepo
- `vscode-languageserver`: VSCode Language Server implementation
- `vscode-languageserver-protocol`: LSP protocol definitions

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
      "enablePerformanceLogging": false,
      "commentCollectionLogLevel": "info"
    }
  }
}
```

##### Options:

- **`enablePerformanceLogging`** (boolean, default: `false`)
  - Enable detailed performance logging for comment collection operations.

- **`commentCollectionLogLevel`** (string, default: `"info"`)
  - Log level for comment collection operations.
  - Options: `"debug"`, `"info"`, `"warn"`, `"error"`

#### Resource Settings

```json
{
  "apex": {
    "resources": {
      "loadMode": "full"
    }
  }
}
```

##### Options:

- **`loadMode`** (string, default: `"full"` for Node.js, `"lazy"` for browser)
  - Resource loading strategy for Apex standard library files.
  - `"full"`: Load all resources immediately during initialization (faster access, higher memory usage)
  - `"lazy"`: Load resources on-demand when accessed (lower memory usage, slight access delay)

### Environment-Specific Defaults

The language server automatically applies different defaults based on the runtime environment:

#### Node.js Environment (Default)

- Higher file size limits (100KB)
- Shorter debounce delays (300ms)
- Comment association enabled by default for document operations
- Resource loading mode: `"full"` (loads all resources immediately)

#### Browser Environment

- Lower file size limits (50KB) for better performance
- Longer debounce delays (500ms)
- More conservative defaults for memory usage
- Resource loading mode: `"lazy"` (loads resources on-demand)

### Client Configuration Examples

#### VS Code (settings.json)

```json
{
  "apex.commentCollection.enableCommentCollection": true,
  "apex.commentCollection.includeSingleLineComments": false,
  "apex.commentCollection.associateCommentsWithSymbols": true,
  "apex.performance.commentCollectionMaxFileSize": 200000,
  "apex.environment.enablePerformanceLogging": true,
  "apex.resources.loadMode": "full"
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
      },
      resources = {
        loadMode = "lazy",
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
           (:commentCollectionMaxFileSize 150000)
           :resources
           (:loadMode "lazy"))))
```

### Performance Recommendations

#### For Large Codebases

- Keep `enableForDocumentSymbols` and `enableForFoldingRanges` disabled
- Set a reasonable `commentCollectionMaxFileSize` limit
- Use longer debounce delays to reduce processing frequency
- Consider using `"lazy"` resource loading mode to reduce initial memory usage

#### For Enhanced Features

- Enable `associateCommentsWithSymbols` for better documentation support
- Enable `includeSingleLineComments` for comprehensive comment analysis
- Enable performance logging to monitor impact
- Use `"full"` resource loading mode for faster access to standard library resources

#### For Browser/Web Environments

- Use the browser-optimized defaults
- Consider disabling comment collection for very large files
- Monitor memory usage and adjust limits accordingly
- Use `"lazy"` resource loading mode to minimize initial memory footprint

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

- `@salesforce/apex-lsp-node`: Node.js in-memory implementation
- `@salesforce/apex-lsp-browser`: Browser in-memory implementation

### Integrating Storage in LSP Server

```typescript
import {
  ApexStorageManager,
  ApexStorageInterface,
} from '@salesforce/apex-lsp-compliant-services';

// For Node.js (VS Code Extension)
import { ApexStorage } from '@salesforce/apex-lsp-compliant-services';

// Initialize the storage manager with the in-memory implementation
ApexStorageManager.getInstance({
  storageFactory: (options) => ApexStorage.getInstance(),
  storageOptions: {
    // Configuration options for the storage implementation
  },
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

## Recent Changes

- **Removed Babel References:**  
  All references to Babel have been removed from the project. The project now uses `ts-jest` exclusively for testing.

- **TypeScript Improvements:**  
  Explicit types have been added to test files to resolve TypeScript errors. For example, in `apex-lsp-testbed/test/performance/lsp-benchmarks.test.ts`, variables and parameters now have explicit `any` types.

- **Jest Configuration:**  
  Jest configurations have been streamlined. Each package now uses a single Jest configuration file (`jest.config.cjs`), and the `"jest"` key has been removed from `package.json` files to avoid conflicts.

## Development

```bash
# Compile the package
npm run compile

# Watch for changes during development
npm run dev
```
