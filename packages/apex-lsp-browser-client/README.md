# Apex LSP Browser Client

A client library for connecting to the Apex Language Server in browser environments.

## Recent Changes

- **Removed Babel References:**  
  All references to Babel have been removed from the project. The project now uses `ts-jest` exclusively for testing.

- **TypeScript Improvements:**  
  Explicit types have been added to test files to resolve TypeScript errors. For example, in `apex-lsp-testbed/test/performance/lsp-benchmarks.web.test.ts`, variables and parameters now have explicit `any` types.

- **Jest Configuration:**  
  Jest configurations have been streamlined. Each package now uses a single Jest configuration file (`jest.config.cjs`), and the `"jest"` key has been removed from `package.json` files to avoid conflicts.

## Installation

```bash
npm install @salesforce/apex-lsp-browser-client
```

## Usage

This client is designed to connect to an Apex Language Server running in a web worker:

```typescript
import { ApexLspBrowserClient } from '@salesforce/apex-lsp-browser-client';

// Create a web worker running the Apex Language Server
const worker = new Worker('/path/to/apex-language-server.js');

// Create a client to connect to the worker
const client = new ApexLspBrowserClient({ worker });

// Use the connection to send and receive messages
const connection = client.getConnection();

// Initialize the language server
const initializeResult = await connection.sendRequest('initialize', {
  // initialization parameters
});

// Send a notification that initialization is complete
connection.sendNotification('initialized');

// Listen for completion requests
connection.onRequest('textDocument/completion', (params) => {
  // Handle completion requests
});

// Clean up when done
client.dispose();
```

## Features

- Connect to an Apex Language Server running in a web worker
- Provides a simple API for sending and receiving LSP messages
- Exports LSP protocol types for convenience
- Fully typed for TypeScript projects

## Browser Compatibility

This library is designed to work in modern browsers that support web workers and ES modules.

## License

BSD-3-Clause License
