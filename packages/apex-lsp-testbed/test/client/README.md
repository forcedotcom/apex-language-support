# Apex LSP Command Tests

This directory contains tests that verify the functionality of LSP commands implemented in the ApexJsonRpcClient.

## Test Files

- **ApexJsonRpcClientLspCommands.test.ts**: Tests specific LSP commands with predefined parameters.
- **ApexJsonRpcClientCommandsAutomated.test.ts**: Dynamically detects and tests all available LSP commands.

## How to Run Tests

You can run the tests using Jest:

```bash
# Run the basic LSP command tests
npm test -- packages/apex-lsp-testbed/test/client/ApexJsonRpcClientLspCommands.test.ts

# Run the automated LSP command tests
npm test -- packages/apex-lsp-testbed/test/client/ApexJsonRpcClientCommandsAutomated.test.ts

# Test against the jorje server (if available)
APEX_LSP_JAR_PATH=/path/to/apex-jorje-lsp.jar npm test -- packages/apex-lsp-testbed/test/client/ApexJsonRpcClientCommandsAutomated.test.ts
```

## Test Implementation Details

These tests:

1. Start a language server (demo or jorje) using the CLI configuration utilities
2. Create a temporary workspace with sample Apex code
3. Create an ApexJsonRpcClient to communicate with the server
4. Install the RequestResponseCapturingMiddleware to capture all requests and responses
5. Execute each LSP command supported by the client
6. Verify the request/response structure using Jest snapshots
7. Clean up the temporary workspace

## Snapshot Testing

The tests use Jest snapshots to validate the structure of requests and responses. On the first run, 
snapshots will be created. On subsequent runs, the actual results are compared against these snapshots.

To update snapshots after making changes to the tests or expected responses:

```bash
npm test -- -u packages/apex-lsp-testbed/test/client/ApexJsonRpcClientLspCommands.test.ts
```

## Testing Against Different Language Servers

The tests can be run against different language server implementations:

### Demo Server (Default)

The demo server is a mock implementation that simulates responses without actually analyzing code.
It's fast and doesn't require any special setup, making it ideal for quick tests.

### Jorje Server

The jorje server is the real Apex language server implementation in Java. To use it:

1. Uncomment the jorje server configuration in the serverTypes array
2. Set the `APEX_LSP_JAR_PATH` environment variable to point to the apex-jorje-lsp.jar file, or 
   ensure the JAR file is available in the `../../dist/resources/` directory

```bash
# Test against jorje server
APEX_LSP_JAR_PATH=/path/to/apex-jorje-lsp.jar npm test -- packages/apex-lsp-testbed/test/client/ApexJsonRpcClientCommandsAutomated.test.ts
```

## CLI Configuration Integration

These tests use configuration utilities similar to those in `packages/apex-lsp-testbed/src/cli.ts` to:

1. Create client options for different server types
2. Set up appropriate initialization parameters
3. Configure temporary workspaces
4. Handle workspace cleanup after tests

## Adding New Commands

When new LSP commands are added to the ApexJsonRpcClient:

1. The automated test will detect them automatically
2. Add an appropriate executor function to the commandMap for proper parameter values 