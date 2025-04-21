# Apex LSP Data-Driven Tests

This directory contains data-driven LSP functional tests that allow for scripted testing of LSP protocol interactions.

## Test Structure

The LSP tests are structured as follows:

- `scripts/` - JSON files containing LSP test scripts defining request/response sequences
- `__snapshots__/` - Snapshot files for verification of LSP responses
- `results/` - Logs and results from test runs
- `lsp-functional-tests.test.ts` - Jest test runner for LSP scripts

## How It Works

The LSP testing framework uses the following components:

1. **Test Scripts**: JSON files that define sequences of LSP requests and expected responses
2. **Middleware**: A middleware layer that captures LSP requests and responses
3. **Test Fixture**: Configures and runs scripts against an LSP server
4. **Snapshot Testing**: Automated verification of responses against saved snapshots

## Running the Tests

To run the LSP tests:

```bash
# Run all tests
npm test

# Run with snapshot update
UPDATE_SNAPSHOTS=true npm test

# Run only specific tests
npm test -- --testNamePattern="Completion"

# Specify a different server
LSP_SERVER_PATH=path/to/server npm test
```

## Test Scripts

Test scripts are defined in JSON format and describe a sequence of LSP protocol interactions. Here's an example:

```json
{
  "name": "Completion Test",
  "description": "Tests completion functionality",
  "setup": {
    "workspaceRoot": "test-artifacts/sample-project"
  },
  "steps": [
    {
      "description": "Initialize the language server",
      "method": "initialize",
      "params": { /* ... */ }
    },
    {
      "description": "Open a document",
      "method": "textDocument/didOpen", 
      "params": { /* ... */ }
    },
    {
      "description": "Request completion",
      "method": "textDocument/completion",
      "params": { /* ... */ },
      "expectedResult": { /* optional */ }
    }
  ]
}
```

## Creating Test Scripts

Test scripts can be created manually or generated from captured LSP interactions:

### Manual Creation

1. Create a JSON file in the `scripts/` directory
2. Define the test structure with name, description, setup, and steps
3. Add the LSP requests and optional expected responses

### Automatic Generation

The framework includes utilities to record LSP interactions and generate test scripts:

```typescript
import { RequestResponseCapturingMiddleware } from '../src/test-utils';
import { generateTestScript } from '../src/test-utils/generateTestScript';

// In your test/demo code:
const middleware = new RequestResponseCapturingMiddleware();
middleware.install(connection);

// After your test operations:
generateTestScript({
  name: 'My Test',
  description: 'Generated test script',
  capturedRequests: middleware.getCapturedRequests(),
  outputFile: 'scripts/generated-test.lsp-teston'
});
```

## Extending the Framework

You can extend the framework by:

1. Adding new test scripts for different LSP features
2. Enhancing the middleware to capture more detailed information
3. Creating custom comparison logic for response verification
4. Adding test utilities for specific testing scenarios

## Common LSP Test Patterns

### Document Lifecycle Test

Test opening, editing, and closing a document:

```json
{
  "steps": [
    /* Initialize server */
    {
      "description": "Open document",
      "method": "textDocument/didOpen",
      "params": { /* ... */ }
    },
    {
      "description": "Edit document",
      "method": "textDocument/didChange",
      "params": { /* ... */ }
    },
    {
      "description": "Close document",
      "method": "textDocument/didClose",
      "params": { /* ... */ }
    }
    /* Shutdown server */
  ]
}
```

### Feature Test

Test a specific LSP feature:

```json
{
  "steps": [
    /* Initialize server and open document */
    {
      "description": "Request hover information",
      "method": "textDocument/hover",
      "params": { /* ... */ }
    }
    /* Close document and shutdown server */
  ]
}
```

### Error Handling Test

Test server behavior with invalid requests:

```json
{
  "steps": [
    /* Initialize server */
    {
      "description": "Send invalid request",
      "method": "textDocument/completion",
      "params": { /* invalid params */ },
      "expectedResult": {
        "error": { /* error details */ }
      }
    }
    /* Shutdown server */
  ]
}
``` 