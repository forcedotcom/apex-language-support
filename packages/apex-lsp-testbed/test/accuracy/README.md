# LSP Accuracy Tests

This directory contains accuracy tests that validate LSP request/response behavior against real trace data.

## Overview

The accuracy tests replay LSP protocol interactions from recorded trace data and validate that the current server implementation produces the same responses as the original trace.

## Portable Trace Data

The test framework uses **portable trace data** that works across different environments and contributors:

### How It Works

1. **Normalization**: Trace data is normalized to use `/workspace` as the root path instead of absolute paths
2. **Runtime Denormalization**: At test runtime, the framework converts normalized paths back to actual workspace paths
3. **Portability**: This makes test data work consistently across local development, CI, and different contributors

### Example

**Original trace data:**

```json
{
  "textDocument": {
    "uri": "file:///Users/peter.hale/git/dreamhouse-lwc/force-app/main/default/classes/PagedResult.cls"
  }
}
```

**Normalized trace data:**

```json
{
  "textDocument": {
    "uri": "file:///workspace/force-app/main/default/classes/PagedResult.cls"
  }
}
```

## Creating New Test Data

When creating new trace data for testing:

### 1. Record LSP Trace

Use your LSP client to record a trace of the interactions you want to test.

### 2. Normalize the Trace Data

Use the provided utility script:

```bash
# From the apex-lsp-testbed directory
node scripts/normalize-trace-data.js your-trace.json normalized-trace.json
```

This will:

- Detect the workspace root from the initialize request
- Replace all absolute paths with `/workspace`-relative paths
- Make the data portable across environments

### 3. Add to Test Fixtures

```bash
# Copy the normalized data to the fixtures directory
cp normalized-trace.json test/fixtures/
```

### 4. Update Test Configuration

Add your new request type to the `REQUEST_GROUPS` configuration in `lsp-requests.test.ts`:

```typescript
const REQUEST_GROUPS: RequestGroupConfig[] = [
  {
    name: 'textDocument/documentSymbol',
    methodPattern: /^textDocument\/documentSymbol/,
    description: 'Document symbol requests',
  },
  // Add your new request type here
  {
    name: 'textDocument/completion',
    methodPattern: /^textDocument\/completion/,
    description: 'Completion requests',
  },
];
```

### 5. Run Tests

The test framework will automatically:

- Load the normalized trace data
- Denormalize paths to match the actual workspace location
- Replay the LSP requests
- Validate responses against snapshots

## Benefits

- ✅ **No more snowflake fixes** - Works for any contributor's environment
- ✅ **CI compatibility** - Tests work in any CI environment
- ✅ **Easy to maintain** - Clear process for adding new test data
- ✅ **Portable** - Test data can be shared across team members

## Troubleshooting

### Path Normalization Issues

If you see path-related errors:

1. Check that your trace data was properly normalized using the utility script
2. Verify the workspace root is correctly detected in the initialize request
3. Ensure all file URIs in the trace data are relative to the workspace

### Missing Documents

If document symbol requests return `null`:

1. Check that the document was opened in the trace before the symbol request
2. Verify the document path exists in the workspace
3. Ensure the document content is available in the trace data

## Example Workflow

```bash
# 1. Record a trace of LSP interactions
# (using your LSP client's trace functionality)

# 2. Normalize the trace data
node scripts/normalize-trace-data.js my-trace.json normalized-trace.json

# 3. Add to test fixtures
cp normalized-trace.json test/fixtures/

# 4. Update test configuration
# (edit lsp-requests.test.ts to include your request type)

# 5. Run tests
npm test -- test/accuracy/lsp-requests.test.ts

# 6. Update snapshots if needed
npm test -- test/accuracy/lsp-requests.test.ts --updateSnapshot
```
