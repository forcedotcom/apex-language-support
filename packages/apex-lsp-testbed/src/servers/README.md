# Apex Language Server Implementations

This directory contains various implementations of the Salesforce Apex Language Server, allowing it to be used in different environments including standalone mode outside of VS Code.

## Prerequisites

- Java 11 or later (for the Java-based server)
- Node 14 or later
- npm 6 or later

## Server Types

The testbed supports multiple different language server implementations:

### Java-based Server (Jorje)

- **jorje/** - The Java-based implementation using the Jorje parser
  - Production-grade implementation
  - Requires Java 11 or later
  - Full language support
  - Contains:
    - `javaServerLauncher.ts` - Core functionality for launching the Java language server
    - `runJavaServer.ts` - Interactive demo of the standalone server capabilities

### Node.js-based Servers

- **nodeServer/extensionServer/** - TypeScript implementation for Node.js (`apex-ls-node`)
  - Designed for VS Code integration
  - Uses Node.js standard I/O for communication
  - Provides core LSP functionality

- **nodeServer/webServer/** - TypeScript implementation for web browsers (`apex-ls-browser`)
  - *Coming soon*
  - Will adapt the extension server for browser environments

### Demo Server

- **demo/** - A mock server for testing and demonstrations
  - Simple implementation with simulated responses
  - No language parsing
  - Useful for testing the client infrastructure

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/forcedotcom/apex-language-support.git
   cd apex-language-support
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

## Usage

### Java-based Server (Jorje)

Start the Java-based server with:

```bash
npm run start:jorje
```

Or with verbose logging:

```bash
npm run start:jorje:verbose
```

For debugging:

```bash
npm run start:jorje:debug
```

For debugging with verbose logging:

```bash
npm run start:jorje:debug:verbose
```

For debugging with suspended startup (useful for attaching a debugger):

```bash
npm run start:jorje:debug:suspend
```

For debugging with verbose logging and suspended startup:

```bash
npm run start:jorje:debug:verbose:suspend
```

#### Interactive Mode

The Java-based server (Jorje) includes an interactive mode with a sample Apex class. Available commands:

- `1`: Get document symbols from the sample Apex class
- `2`: Get hover information at line 7, character 15 of the sample class
- `exit`: Shutdown the server and exit

#### Programmatic Usage with Java-based Server

You can use the Java-based Apex Language Server programmatically in your Node applications:

```javascript
import { createJavaServerOptions, launchJavaServer } from './jorje/javaServerLauncher';

// Launch the server with default options
const server = await launchJavaServer();

// Or with custom options
const server = await launchJavaServer({
  javaHome: '/path/to/java',
  javaMemory: 8192,
  enableSemanticErrors: true,
  logLevel: 'DEBUG'
});

// Alternatively, get the executable info without launching
const execInfo = await createJavaServerOptions({
  javaHome: '/path/to/java',
  javaMemory: 8192
});
console.log(`Command: ${execInfo.command} ${execInfo.args?.join(' ')}`);

// Send JSON-RPC messages to the server...
```

### Node.js Extension Server

Run the extension server harness:

```bash
npm run start:extension-server
```

For debugging:

```bash
npm run start:extension-server:debug
```

### Demo Server

Start the demo server with:

```bash
npm run start:demo
```

With verbose logging:

```bash
npm run start:demo:verbose
```

## Configuration Options

### Java-based Server Options

| Option | Description | Default |
|--------|-------------|---------|
| `javaHome` | Path to the Java home directory | Uses `JAVA_HOME` environment variable |
| `jarPath` | Path to the `apex-jorje-lsp.jar` file | Auto-detected |
| `javaMemory` | Memory allocation in MB | 4096 |
| `enableSemanticErrors` | Enable semantic error reporting | false |
| `enableCompletionStatistics` | Enable completion statistics | false |
| `debugPort` | Debug port for JDWP | 2739 |
| `logLevel` | Log level (ERROR, WARN, INFO, DEBUG) | ERROR |
| `suspendStartup` | Whether to suspend on startup (for debugging) | false |

### Node.js Extension Server Environment Variables

- `EXTENSION_LS_SERVER_PATH`: Optional path to the server module. If not provided, the harness will attempt to locate it automatically.

## Common Functionality

The language server implementations support core LSP functionality:

1. Document lifecycle (open, update, close)
2. Completion suggestions
3. Hover information
4. Document symbols
5. Diagnostics (where applicable)

## Customizing the Server

### Java-based Server

The Java-based server behavior can be customized by modifying the `javaServerLauncher.ts` file, which provides the core functionality for launching and configuring the Java-based language server.

To customize the server startup, modify the `createJavaServerOptions` function to add or modify command-line arguments passed to the Java process.

### Debugging the Java Language Server

To debug the Java Language Server:

1. Set the environment variable `LANGUAGE_SERVER_LOG_LEVEL=DEBUG`
2. Start the server
3. Debug messages will be output to the console

To attach a debugger to the Java process:

1. Start the server with one of the debug scripts (e.g., `npm run start:jorje:debug` or `npm run start:jorje:debug:suspend`)
2. Attach a Java debugger to the specified port (default: 2739)

## JSON-RPC API

All servers implement the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) over JSON-RPC. The following endpoints are supported:

### `initialize`

Initialize the language server.

Request:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "processId": 123,
    "rootUri": "file:///path/to/project",
    "capabilities": {
      // Client capabilities
    }
  }
}
```

### `textDocument/didOpen`

Notify the server about a new document.

Request:
```json
{
  "jsonrpc": "2.0",
  "method": "textDocument/didOpen",
  "params": {
    "textDocument": {
      "uri": "file:///path/to/file.cls",
      "languageId": "apex",
      "version": 1,
      "text": "public class MyClass {}"
    }
  }
}
```

### `textDocument/documentSymbol`

Get document symbols.

Request:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "textDocument/documentSymbol",
  "params": {
    "textDocument": {
      "uri": "file:///path/to/file.cls"
    }
  }
}
```

### `textDocument/hover`

Get hover information.

Request:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "textDocument/hover",
  "params": {
    "textDocument": {
      "uri": "file:///path/to/file.cls"
    },
    "position": {
      "line": 5,
      "character": 10
    }
  }
}
```

### `shutdown` and `exit`

Properly shutdown the server.

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "shutdown"
}
```

Followed by:

```json
{
  "jsonrpc": "2.0",
  "method": "exit"
}
```

## License

Copyright (c) 2025, salesforce.com, inc.
All rights reserved.
Licensed under the BSD 3-Clause license.
For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause 