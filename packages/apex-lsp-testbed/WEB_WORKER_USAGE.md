# Web Worker Support for Apex Language Server

This document explains how to use the new web worker functionality in the Apex Language Server testbed.

## Overview

The `ApexJsonRpcClient` now supports running the language server in a web worker using the [web-worker](https://www.npmjs.com/package/web-worker) package. This provides a unified API that works in both Node.js and browser environments.

## Installation

First, install the web-worker package:

```bash
npm install web-worker
```

## Usage

### Basic Web Worker Setup

```typescript
import {
  ApexJsonRpcClient,
  ConsoleLogger,
} from './src/client/ApexJsonRpcClient';
import * as path from 'path';

const logger = new ConsoleLogger('WebWorkerExample');

const options = {
  serverType: 'webWorker',
  serverPath: path.join(__dirname, 'path/to/apex-ls-node/out/index.js'),
  webWorkerOptions: {
    workerUrl: path.join(__dirname, 'path/to/apex-ls-node/out/index.js'),
    workerOptions: {
      name: 'apex-language-server-worker',
    },
  },
  initializeParams: {
    processId: process.pid,
    clientInfo: {
      name: 'Web Worker Client',
      version: '1.0.0',
    },
    capabilities: {
      textDocument: {
        completion: { dynamicRegistration: true },
        hover: { dynamicRegistration: true },
        documentSymbol: { dynamicRegistration: true },
      },
      workspace: {
        applyEdit: true,
        workspaceEdit: { documentChanges: true },
      },
    },
    rootUri: `file://${process.cwd()}`,
  },
};

const client = new ApexJsonRpcClient(options, logger);

// Start the web worker
await client.start();

// Use the client as normal
const isHealthy = await client.isHealthy();
console.log(`Server healthy: ${isHealthy}`);

// Clean up
await client.stop();
```

### Using with nodeServer Type

You can also use web workers with the existing `nodeServer` type by providing `webWorkerOptions`:

```typescript
const options = {
  serverType: 'nodeServer', // Still uses nodeServer type
  serverPath: path.join(__dirname, 'path/to/apex-ls-node/out/index.js'),
  webWorkerOptions: {
    workerUrl: path.join(__dirname, 'path/to/apex-ls-node/out/index.js'),
    workerOptions: {
      name: 'apex-language-server-worker',
    },
  },
  // ... other options
};
```

## Configuration Options

### JsonRpcClientOptions

- `serverType`: Set to `'webWorker'` to use web worker mode
- `webWorkerOptions`: Configuration for the web worker
  - `workerUrl`: URL or path to the worker script
  - `workerOptions`: Worker options (name, credentials, type, etc.)

### Worker Options

The `workerOptions` object supports the following properties:

- `name`: A name for the worker (useful for debugging)
- `credentials`: Request credentials ('omit', 'same-origin', 'include')
- `type`: Worker type ('classic' or 'module')

## Benefits

1. **Cross-platform**: Works in both Node.js and browser environments
2. **Unified API**: Same interface regardless of environment
3. **Better isolation**: Language server runs in a separate thread
4. **Browser compatibility**: Can run language servers in web applications

## Example: Running in Browser

```typescript
// In a browser environment
const options = {
  serverType: 'webWorker',
  serverPath: '/path/to/worker.js',
  webWorkerOptions: {
    workerUrl: '/path/to/worker.js',
    workerOptions: {
      type: 'module', // Use ES modules
    },
  },
  // ... other options
};
```

## Health Checking

The web worker implementation supports the same health checking as other server types:

```typescript
// Check if server is healthy
const isHealthy = await client.isHealthy();

// Wait for server to be healthy
await client.waitForHealthy(30000);

// Send ping request
await client.ping();
```

## Error Handling

Web workers provide the same error handling as child processes:

```typescript
client.onNotification('error', (error) => {
  console.error('Server error:', error);
});

// The client will automatically handle worker termination
```

## Limitations

1. **File system access**: Web workers have limited file system access compared to Node.js processes
2. **Module loading**: May require different module loading strategies in browser environments
3. **Debugging**: Web worker debugging can be more complex than process debugging

## Migration from Child Processes

To migrate from child processes to web workers:

1. Change `serverType` from `'nodeServer'` to `'webWorker'`
2. Add `webWorkerOptions` configuration
3. Update any file paths to be compatible with the target environment
4. Test thoroughly in your target environment

## See Also

- [web-worker package documentation](https://www.npmjs.com/package/web-worker)
- [Example usage](./examples/web-worker-usage.ts)
- [Web worker tests](./test/client/ApexJsonRpcClientWebWorker.test.ts)
