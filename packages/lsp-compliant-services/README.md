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
# Build the package
npm run build

# Watch for changes during development
npm run dev
```
