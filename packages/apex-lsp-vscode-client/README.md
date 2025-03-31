# Apex LSP VSCode Client

A client library for connecting to the Apex Language Server in VSCode extensions.

## Installation

```bash
npm install @salesforce/apex-lsp-vscode-client
```

## Usage

This client is designed to be used in VSCode extensions that want to integrate with the Apex Language Server:

```typescript
import * as path from 'path';
import * as vscode from 'vscode';
import { ApexLspVscodeClient } from '@salesforce/apex-lsp-vscode-client';

export function activate(context: vscode.ExtensionContext) {
  // Get the path to the server module
  const serverModule = context.asAbsolutePath(
    path.join(
      'node_modules',
      '@salesforce/apex-language-server',
      'dist',
      'server.js',
    ),
  );

  // Create a client to connect to the language server
  const client = new ApexLspVscodeClient(context, {
    serverModule,
    extensionName: 'Apex Language Server',
  });

  // Start the client
  client.start();

  // Return the client for extension disposal
  return client;
}

export function deactivate() {
  // Nothing to do here
}
```

## Features

- Connect to an Apex Language Server from a VSCode extension
- Provides a simple API for configuring and managing the language client
- Handles the server lifecycle and communication
- Exports LSP protocol types for convenience
- Fully typed for TypeScript projects

## VSCode Extension Requirements

Your extension package.json should include:

```json
"engines": {
  "vscode": "^1.60.0"
},
"activationEvents": [
  "onLanguage:apex"
],
"main": "./dist/extension.js",
"contributes": {
  "languages": [
    {
      "id": "apex",
      "extensions": [".cls", ".trigger"],
      "aliases": ["Apex", "apex"]
    }
  ]
}
```

## License

BSD-3-Clause License
