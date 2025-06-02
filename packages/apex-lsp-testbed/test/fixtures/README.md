# Test Fixtures

This directory contains test fixtures used for both accuracy and performance testing of the LSP implementation.

## Files

### ls-sample-trace.log.json

This file contains captured LSP communication traces between client and server. The data is used to:

1. Generate snapshot tests for accuracy verification
2. Provide realistic LSP requests for performance benchmarking

The JSON structure contains entries with the following format:
```typescript
interface LSPLogEntry {
  type: string;        // 'request' or 'response'
  direction: string;   // 'client-to-server' or 'server-to-client'
  method?: string;     // LSP method name for requests
  params?: any;        // Request parameters
  result?: any;        // Response result
  id?: number|string;  // Request/response correlation ID
}
```

## Usage

- Accuracy tests use this data to create Jest snapshots of request/response pairs
- Performance tests use this data to benchmark LSP method handling with realistic payloads
- New trace files can be added here to expand test coverage
