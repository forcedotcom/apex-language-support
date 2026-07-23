# Apex LSP Client Tests

This directory contains tests that verify the functionality of the SDK-backed client (`ApexLspTestClient`) and its supporting components.

## Test Files

- **ApexLspTestClient.test.ts**: Tests the `ApexLspTestClient` wrapper with `MockRpcConnection`, verifying document operations, LSP methods, and lifecycle management.
- **ApexJsonRpcClientWebWorker.test.ts**: Tests the `MockRpcConnection` implementation as a `RpcConnection` for `ApexClientCore`, verifying it handles all required LSP operations.

## How to Run Tests

You can run the tests using Jest:

```bash
# Run the client tests
npm test -- packages/apex-lsp-testbed/test/client/ApexLspTestClient.test.ts

# Run the mock connection tests
npm test -- packages/apex-lsp-testbed/test/client/ApexJsonRpcClientWebWorker.test.ts
```

## Test Implementation Details

These tests:

1. Create a `MockRpcConnection` (in-memory RPC transport)
2. Create an `ApexClientCore` via `ApexClientCore.create(mockConn)`
3. Initialize the server with `DEFAULT_APEX_SETTINGS`
4. Wrap the core in `ApexLspTestClient` for convenience methods
5. Exercise LSP methods (hover, completion, documentSymbol) through the mock
6. Verify lifecycle behavior (health checks, dispose)

## SDK Architecture

The tests use the following SDK components:

- **`ApexClientCore`** - The SDK's core client that handles JSON-RPC communication
- **`ApexClientMiddleware`** - The SDK's middleware interface for intercepting messages
- **`RpcConnection`** - The transport interface that `MockRpcConnection` implements
- **`createHeadlessClient`** - Factory for creating real server connections (used in integration tests)

## Adding New Tests

When adding new LSP commands or features:

1. Add test cases to `ApexLspTestClient.test.ts` for the new wrapper methods
2. Add mock responses to `MockRpcConnection` if needed for demo/test mode
3. The `RequestResponseCapturingMiddleware` can be used to verify request/response pairs
