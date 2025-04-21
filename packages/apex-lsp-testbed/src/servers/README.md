# Apex Language Server - Standalone Mode

This directory contains the standalone implementation of the Salesforce Apex Language Server, allowing it to be used outside of VS Code.

> **Note:** The VS Code specific wrapper (`src/javaServerLauncher.ts`) has been removed as this project will only be used in standalone mode.

## Prerequisites

- Java 11 or later
- Node.js 14 or later
- npm 6 or later

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

### Starting the Server

Start the standalone server with:

```bash
npm run start:standalone
```

This will launch the Java-based Apex Language Server and connect to it via JSON-RPC over stdin/stdout.

### Interactive Mode

The standalone server starts in interactive mode with a sample Apex class. Available commands:

- `1`: Get document symbols from the sample Apex class
- `2`: Get hover information at line 7, character 15 of the sample class
- `exit`: Shutdown the server and exit

### Programmatic Usage

You can use the Apex Language Server programmatically in your Node.js applications:

```javascript
import { createJavaServerOptions, launchJavaServer } from './standalone/javaServerLauncher.js';

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

## Configuration Options

The following configuration options are available when starting the server:

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

## JSON-RPC API

The Apex Language Server implements the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) over JSON-RPC. The following endpoints are supported:

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

## Customizing the Server

The server behavior can be customized by modifying the `javaServerLauncher.ts` file, which provides the core functionality for launching and configuring the Java-based language server.

To customize the server startup, modify the `createJavaServerOptions` function to add or modify command-line arguments passed to the Java process.

## Debugging

To debug the Java Language Server:

1. Set the environment variable `LANGUAGE_SERVER_LOG_LEVEL=DEBUG`
2. Start the server
3. Debug messages will be output to the console

To attach a debugger to the Java process:

1. Start the server with the `debugPort` option
2. Attach a Java debugger to the specified port

## File Structure

- `javaServerLauncher.ts` - Core functionality for launching the Java language server
- `runJavaServer.ts` - Interactive demo of the standalone server capabilities

## License

Copyright (c) 2025, salesforce.com, inc.
All rights reserved.
Licensed under the BSD 3-Clause license.
For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause 