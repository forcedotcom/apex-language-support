# Apex Language Server Implementations

Server implementations for running the Apex Language Server standalone (outside VS Code).

## Prerequisites

- Java 11+ (Jorje server)
- Node 18+

## Server Types

### jorje/ — Java-based Server (Jorje)

- Production-grade, full language support
- `javaServerLauncher.ts` — launch/configure the Java LS
- `runJavaServer.ts` — interactive demo

### nodeServer/ — Node.js Server (apex-ls)

- TypeScript implementation for VS Code integration
- Uses Node.js stdio for LSP communication

### demo/ — Mock Server

- Simulated responses, no parsing
- For testing client infrastructure

## Usage

### Jorje

```bash
npm run start:jorje            # default
npm run start:jorje:verbose    # verbose logging
npm run start:jorje:debug      # attach debugger (port 2739)
npm run start:jorje:debug:suspend  # suspend on startup for debugger attach
```

Interactive commands: `1` document symbols, `2` hover info, `exit` shutdown.

### Node.js Server

```bash
npm run start:apex-ls
```

### Demo

```bash
npm run start:demo
npm run start:demo:verbose
```

## Jorje Configuration

| Option | Description | Default |
|---|---|---|
| `javaHome` | Java home directory | `JAVA_HOME` env var |
| `jarPath` | Path to `apex-jorje-lsp.jar` | Auto-detected |
| `javaMemory` | Memory (MB) | 4096 |
| `enableSemanticErrors` | Semantic error reporting | false |
| `enableCompletionStatistics` | Completion stats | false |
| `debugPort` | JDWP debug port | 2739 |
| `logLevel` | ERROR / WARN / INFO / DEBUG | ERROR |
| `suspendStartup` | Suspend on startup for debugging | false |

### Node.js Server

- `EXTENSION_LS_SERVER_PATH` — optional path to server module; auto-located if unset

## Programmatic Usage (Jorje)

```javascript
import {
  createJavaServerOptions,
  launchJavaServer,
} from './jorje/javaServerLauncher';

const server = await launchJavaServer();

// With custom options
const server = await launchJavaServer({
  javaHome: '/path/to/java',
  javaMemory: 8192,
  enableSemanticErrors: true,
  logLevel: 'DEBUG',
});
```

## Debugging Jorje

1. Set `LANGUAGE_SERVER_LOG_LEVEL=DEBUG`
2. Start with a debug script (`start:jorje:debug` or `start:jorje:debug:suspend`)
3. Attach Java debugger to port 2739

## License

BSD 3-Clause — see [LICENSE.txt](https://opensource.org/licenses/BSD-3-Clause).
