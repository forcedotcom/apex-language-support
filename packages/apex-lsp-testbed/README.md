# Apex Language Server Testbed

A testing framework for evaluating and comparing different implementations of Apex language servers.

## Overview

This package provides a unified interface for testing various Apex language server implementations (such as the demo mock server and jorje Java-based server) using the JSON-RPC protocol.

## Prerequisites

- Node.js 18 or later
- npm 7 or later
- Java 11 or later (required for the jorje server implementation)

## Installation

```bash
npm install
npm run build
```

## Usage

The testbed provides several ways to launch and test language servers:

### Basic Usage

```bash
# Start with demo server (mock implementation)
npm run start:demo

# Start with jorje server (Java implementation)
npm run start:jorje

# Start with nodeServer (Node.js implementation)
npm run start:node

# Start with webServer (Web implementation)
npm run start:web

# Enable verbose logging for any server
npm run start:demo:verbose
npm run start:jorje:verbose
npm run start:node:verbose
npm run start:web:verbose

# Start the jorje server with debug suspend enabled (for Java debugging)
npm run start:jorje:debug
npm run start:jorje:debug:verbose
```

### Using with a Test Workspace

The testbed can be run with a specific workspace, which will be used by the language server for code analysis and operations. The workspace can be either a local directory or a GitHub repository URL.

```bash
# Start jorje server with a local workspace
npm run start:jorje -- --workspace /path/to/your/apex/project

# Start demo server with a local workspace
npm run start:demo -- --workspace /path/to/your/apex/project

# Start nodeServer with a local workspace
npm run start:node -- --workspace /path/to/your/apex/project

# Start webServer with a local workspace
npm run start:web -- --workspace /path/to/your/apex/project

# Start jorje server with a GitHub repository as workspace
npm run start:jorje -- --workspace https://github.com/username/repo.git

# Combine with verbose logging
npm run start:jorje:verbose -- --workspace /path/to/your/apex/project
```

**Note:** The `--` separator is required when passing arguments to npm scripts. This passes the `--workspace` parameter to the underlying script rather than to npm itself.

#### Workspace Handling

- **Local directories**: Specified local directories are validated and used directly.
- **GitHub repositories**: Repositories are cloned into a `test-artifacts` folder with a timestamp to ensure uniqueness. These temporary clones are automatically cleaned up when the process exits.

## Command-line Options

```
Usage: apex-lsp-testbed [options]

Options:
  -s, --server <type>      Server type to launch (demo, jorje, nodeServer, or webServer)
  -v, --verbose            Enable verbose logging
  -i, --interactive        Start in interactive mode
  -w, --workspace <path>   Path to test workspace or GitHub URL
  --suspend                Suspend the Java process for debugging (JDWP port: 2739)
  -h, --help               Show this help message

Workspace Examples:
  --workspace /path/to/local/folder
  --workspace https://github.com/username/repo.git
```

## Interactive Mode

When running in interactive mode (the default), the following commands are available:

- `open` - Open a test document
- `update` - Update the test document
- `close` - Close the test document
- `completion` - Request completion at a position
- `hover` - Request hover information
- `symbols` - Request document symbols
- `format` - Request document formatting
- `capabilities` - Show server capabilities
- `exit/quit` - Exit the program
- `help` - Show this help

## Recent Changes

- **Removed Babel References:**  
  All references to Babel have been removed from the project. The project now uses `ts-jest` exclusively for testing.

- **TypeScript Improvements:**  
  Explicit types have been added to test files to resolve TypeScript errors. For example, in `test/performance/lsp-benchmarks.test.ts`, variables and parameters now have explicit `any` types.

- **Jest Configuration:**  
  Jest configurations have been streamlined. Each package now uses a single Jest configuration file (`jest.config.cjs`), and the `"jest"` key has been removed from `package.json` files to avoid conflicts.

## Development

To modify or extend the testbed:

1. Make changes to the source files in `src/`
2. Run `npm run build` to compile the changes
3. Test with `npm run start:demo` or `npm run start:jorje`

## Java Debugging

To debug the Java-based language server (jorje), you can use the `--suspend` flag or the convenience scripts with `debug` suffix:

```bash
# Start jorje server with Java debugging enabled
npm run start:jorje:debug

# Start jorje server with Java debugging and verbose logging
npm run start:jorje:debug:verbose
```

When started with the `--suspend` flag, the Java process will wait for a debugger to attach before continuing execution. You can connect to the Java process with any JDWP-compatible debugger (like IntelliJ IDEA, Eclipse, or Visual Studio Code with Java extensions) using port 2739.

### Common Java Debugging Issues

1. **Java Version Compatibility**: Ensure you're using Java 11 or later. The launcher will check your Java version and provide an error message if it's incompatible.

2. **Java Home Not Found**: If JAVA_HOME is not set, the system will attempt to locate a Java installation automatically. To avoid issues, explicitly set JAVA_HOME to point to a valid Java 11+ installation.

3. **Permission Issues**: Ensure the Java executable has proper execute permissions, especially on macOS and Linux systems.

4. **JAR File Not Found**: If the apex-jorje-lsp.jar file cannot be found, check that it exists in the expected location or provide a custom path using the --jarPath option.

### Debugging with IntelliJ IDEA

1. Run the server with suspend: `npm run start:jorje:debug`
2. In IntelliJ IDEA, go to Run → Debug... → Remote JVM Debug
3. Configure the connection with host `localhost` and port `2739`
4. Click "Debug" to connect to the suspended Java process

### Debugging with VS Code

1. Add a launch configuration to your `.vscode/launch.json`:
   ```json
   {
     "type": "java",
     "name": "Attach to Apex Language Server",
     "request": "attach",
     "hostName": "localhost",
     "port": "2739"
   }
   ```
2. Run the server with suspend: `npm run start:jorje:debug`
3. Go to Run and Debug in VS Code and select "Attach to Apex Language Server"
4. Click the play button to connect to the suspended Java process

## Features

- Connect to different Apex Language Server implementations
- Measure performance metrics of language server operations
- Compare different server implementations
- Support for standard LSP features like code completion, hover information, etc.
- Automatic handling of server communication

## Configuration Options

The following configuration options are available:

| Option                       | Description                                   | Default                               |
| ---------------------------- | --------------------------------------------- | ------------------------------------- |
| `javaHome`                   | Path to the Java home directory               | Uses `JAVA_HOME` environment variable |
| `jarPath`                    | Path to the `apex-jorje-lsp.jar` file         | Auto-detected                         |
| `javaMemory`                 | Memory allocation in MB                       | 4096                                  |
| `enableSemanticErrors`       | Enable semantic error reporting               | false                                 |
| `enableCompletionStatistics` | Enable completion statistics                  | false                                 |
| `debugPort`                  | Debug port for JDWP                           | 2739                                  |
| `logLevel`                   | Log level (ERROR, WARN, INFO, DEBUG)          | ERROR                                 |
| `suspendStartup`             | Whether to suspend on startup (for debugging) | false                                 |

## Advanced JSON-RPC Client

This package includes a lightweight JSON-RPC client for direct communication with the Apex Language Server. See the `ApexJsonRpcClient` class for more details.

```typescript
import { ApexJsonRpcClient } from '@salesforce/apex-lsp-testbed';
```

## License

BSD-3-Clause license
