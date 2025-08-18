# Unified Apex Language Server

A unified web worker-based language server that can run in both browser and Node.js environments, consolidating functionality from multiple packages into a single solution.

## Overview

This enhanced package provides a unified Apex Language Server that runs in web workers, eliminating Node.js API dependencies and creating a single codebase that works consistently across all platforms. It consolidates functionality from:

- `apex-ls-node` (Node.js language server)
- `apex-ls-browser` (Original browser language server)
- `apex-lsp-browser-client` (Browser client utilities)

## Architecture

### Web Worker Foundation

The language server is built around a web worker architecture that provides:

- **Platform Independence**: Runs in web workers that work in both browser and Node.js environments
- **Non-blocking Operations**: Language server operations don't block the main thread
- **Isolated Context**: Server runs in its own isolated context for better security and performance
- **Message-based Communication**: Uses standardized message passing for client-server communication

### Key Components

#### 1. Web Worker Language Server (`worker.ts`)

- Implements the LSP protocol in a web worker context
- Handles document processing, diagnostics, and language features
- Uses `BrowserMessageReader` and `BrowserMessageWriter` for communication

#### 2. Client Utilities (`client.ts`)

- Provides utilities for connecting to the web worker language server
- Includes `ApexLspClient` class for high-level client operations
- Handles message passing between main thread and worker

#### 3. Storage Implementation (`storage/WebWorkerStorage.ts`)

- In-memory storage for web worker environments
- Provides temporary storage during worker lifetime
- Includes synchronization methods for persistent storage

#### 4. Logging System (`utils/`)

- `WebWorkerLoggerFactory`: Creates loggers for web worker environments
- `WebWorkerLogNotificationHandler`: Handles log notifications via postMessage
- Sends logs to main thread for display or handling

## Features

- **Unified Architecture**: Single codebase for browser and Node.js environments
- **Web Worker Support**: Runs language server in isolated worker context
- **Platform Independence**: No Node.js API dependencies
- **Message-based Communication**: Standardized LSP protocol over web workers
- **In-memory Storage**: Optimized storage for web worker environments
- **Enhanced Logging**: Web worker-compatible logging system
- **Backward Compatibility**: Maintains existing browser storage functionality

## Dependencies

- `vscode-languageserver`: VSCode Language Server implementation (browser version)
- `vscode-languageserver-textdocument`: Text document handling
- `vscode-languageserver-protocol`: LSP protocol definitions
- `vscode-jsonrpc`: JSON-RPC communication
- `@salesforce/apex-lsp-parser-ast`: Apex parser and AST
- `@salesforce/apex-lsp-compliant-services`: LSP compliant services
- `@salesforce/apex-lsp-shared`: Shared utilities and logging

## Usage

### Basic Usage

```typescript
import { createApexLspClient, ApexLspClient } from '@salesforce/apex-ls';

// Create a worker with the language server
const worker = new Worker('/path/to/worker.js');

// Create a client
const client = new ApexLspClient(worker);

// Initialize the language server
const result = await client.initialize({
  processId: null,
  rootUri: null,
  capabilities: {},
  workspaceFolders: null,
});
```

### Advanced Usage

```typescript
import { createApexLspClient } from '@salesforce/apex-ls';

// Create a client with custom options
const client = createApexLspClient({
  worker: new Worker('/path/to/worker.js'),
  logger: {
    error: (msg) => console.error(msg),
    warn: (msg) => console.warn(msg),
    info: (msg) => console.info(msg),
    log: (msg) => console.log(msg),
  },
  autoListen: true,
});

// Use the client
const connection = client.connection;
const worker = client.worker;

// Initialize
const result = await client.initialize({
  processId: null,
  rootUri: 'file:///workspace',
  capabilities: {
    textDocument: {
      documentSymbol: {},
      diagnostic: {},
    },
  },
  workspaceFolders: [],
});

// Clean up
client.dispose();
```

### Web Worker Entry Point

```typescript
// In your worker script
import { createWebWorkerLanguageServer } from '@salesforce/apex-ls/worker';

// The server will auto-start when imported
```

### Client Entry Point

```typescript
// In your main application
import { createApexLspClient } from '@salesforce/apex-ls/client';

const client = createApexLspClient({
  worker: new Worker('./worker.js'),
});
```

## API Reference

### `createApexLspClient(options)`

Creates an Apex LSP client that connects to a web worker language server.

**Parameters:**

- `options.worker`: The Worker instance running the language server
- `options.logger`: Optional logger for the connection
- `options.autoListen`: Whether to automatically listen on the connection (default: true)

**Returns:** `LanguageServerInitResult`

### `ApexLspClient`

Main class for the Apex Language Server client.

**Constructor:** `new ApexLspClient(worker, logger?)`

**Methods:**

- `initialize(params)`: Initialize the language server
- `sendNotification(method, params?)`: Send a notification
- `sendRequest(method, params?)`: Send a request
- `onNotification(method, handler)`: Register notification handler
- `onRequest(method, handler)`: Register request handler
- `dispose()`: Clean up resources

### `WebWorkerStorage`

In-memory storage implementation for web worker environments.

**Methods:**

- `get(key)`: Get a value from storage
- `set(key, value)`: Set a value in storage
- `delete(key)`: Delete a value from storage
- `clear()`: Clear all storage
- `syncWithMainThread(data?)`: Sync with main thread
- `loadFromMainThread(data)`: Load data from main thread

## Recent Changes

- **Web Worker Architecture**: Enhanced with unified web worker-based language server
- **Platform Independence**: Removed Node.js API dependencies
- **Client Utilities**: Added comprehensive client utilities for web worker communication
- **Storage Implementation**: Added in-memory storage for web worker environments
- **Enhanced Logging**: Web worker-compatible logging system
- **Multiple Entry Points**: Added `/worker` and `/client` entry points for modular usage

## Development

```bash
# Build the package
npm run build

# Watch for changes during development
npm run dev
```

## Server Mode and Capabilities

The browser language server supports different operational modes optimized for web environments:

### Server Modes

- **Production Mode**: Optimized for performance and stability in browser environments
  - Conservative memory usage
  - Disabled expensive features for better performance
  - Optimized for web worker constraints

- **Development Mode**: Full feature set for development workflows
  - Enhanced debugging capabilities
  - Full feature set when performance allows
  - Better error reporting and logging

### Mode Configuration

The server mode is automatically determined based on the environment and can be configured through:

1. **Environment Variable**: `APEX_LS_MODE=production` or `APEX_LS_MODE=development`
2. **Initialization Options**: Passed during server initialization
3. **Auto-detection**: Based on environment and performance settings

### Capabilities System

The browser server uses the same platform-agnostic capabilities system as the Node.js implementation, ensuring consistent behavior across environments while optimizing for browser constraints.

For detailed information about capabilities and server modes, see:

- [Capabilities Documentation](../lsp-compliant-services/docs/CAPABILITIES.md)
- [LSP Implementation Status](../lsp-compliant-services/docs/LSP_IMPLEMENTATION_STATUS.md)

## Web Integration

To integrate this language server into a web-based editor:

1. Add this package as a dependency
2. Set up the proper message passing between your editor and the language server
3. Configure the editor to use the language server for Apex files
4. Configure server mode based on your application's needs

See the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) documentation for more details on LSP integration in web environments.

## Bundle Outputs

Starting with v1.1.0 this package ships pre-bundled artifacts in `bundle/` that are published to npm:

| File         | Format             | Use-case                                 |
| ------------ | ------------------ | ---------------------------------------- |
| `index.mjs`  | ES Module (ES2020) | Modern browsers / bundlers (recommended) |
| `index.js`   | CommonJS           | Legacy tooling that still requires CJS   |
| `index.d.ts` | Type Declarations  | Type-safe consumption from TypeScript    |

> **Note** Because we generate a single, side-effect-free bundle (`"sideEffects": false` in `package.json`), downstream bundlers can safely tree-shake any unused code.

### Supported Browsers / ECMAScript Target

The bundle is transpiled to the `es2020` target. That means it runs natively in all evergreen browsers (Chrome 88+, Firefox 78+, Edge 90+, Safari 14+). If you need to support older environments you can continue to transpile our ESM build through your own Babel/ESBuild pipeline.
