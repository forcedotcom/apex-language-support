# Apex Language Server Diagnostics

Complete guide to implementing and using diagnostic features in the Apex Language Server, including both comprehensive reference and quick implementation patterns.

## 📋 Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [LSP Diagnostic Requests](#lsp-diagnostic-requests)
- [Implementation Guide](#implementation-guide)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

## Overview

The Apex Language Server supports two types of diagnostic requests as defined by the Language Server Protocol (LSP):

1. **Pull-based Diagnostics** (`textDocument/diagnostic`) - Client requests diagnostics on-demand
2. **Push-based Diagnostics** (`textDocument/publishDiagnostics`) - Server automatically publishes diagnostics

## Quick Start

### Basic Implementation

```typescript
import { HandlerFactory } from '@salesforce/apex-lsp-compliant-services';

// Create handlers
const diagnosticHandler = HandlerFactory.createDiagnosticHandler();
const documentChangeHandler = HandlerFactory.createDidChangeDocumentHandler();

// Register LSP handlers
connection.onRequest('textDocument/diagnostic', async (params) => {
  return await diagnosticHandler.handleDiagnostic(params);
});

documents.onDidChangeContent(async (event) => {
  const diagnostics = await documentChangeHandler.handleDocumentChange(event);
  if (diagnostics) {
    connection.sendDiagnostics({
      uri: event.document.uri,
      diagnostics,
    });
  }
});
```

### Basic Configuration

```typescript
const settings = {
  diagnostics: {
    enablePullDiagnostics: true, // textDocument/diagnostic
    enablePushDiagnostics: true, // textDocument/publishDiagnostics
    maxDiagnosticsPerFile: 100, // Limit diagnostics per file
    includeWarnings: true, // Include warnings
    includeInfo: true, // Include info messages
  },
};
```

## LSP Diagnostic Requests

### 1. Pull-based Diagnostics (`textDocument/diagnostic`)

**Request**: Client → Server
**Method**: `textDocument/diagnostic`
**Purpose**: Request diagnostics for a specific document

#### Request Parameters

```typescript
interface DiagnosticParams {
  textDocument: {
    uri: string; // Document URI
  };
}
```

#### Response

```typescript
interface Diagnostic[] {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  message: string;
  severity: DiagnosticSeverity;
  code?: string | number;
  source?: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}
```

#### Example Request

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "textDocument/diagnostic",
  "params": {
    "textDocument": {
      "uri": "file:///path/to/MyClass.cls"
    }
  }
}
```

#### Example Response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    {
      "range": {
        "start": { "line": 4, "character": 9 },
        "end": { "line": 4, "character": 10 }
      },
      "message": "Syntax error: unexpected token",
      "severity": 1,
      "code": "SYNTAX_ERROR",
      "source": "apex-parser"
    }
  ]
}
```

### 2. Push-based Diagnostics (`textDocument/publishDiagnostics`)

**Notification**: Server → Client
**Method**: `textDocument/publishDiagnostics`
**Purpose**: Server automatically publishes diagnostics when documents change

#### Notification Parameters

```typescript
interface PublishDiagnosticsParams {
  uri: string; // Document URI
  diagnostics: Diagnostic[];
  version?: number; // Document version
}
```

#### Example Notification

```json
{
  "jsonrpc": "2.0",
  "method": "textDocument/publishDiagnostics",
  "params": {
    "uri": "file:///path/to/MyClass.cls",
    "diagnostics": [
      {
        "range": {
          "start": { "line": 4, "character": 9 },
          "end": { "line": 4, "character": 10 }
        },
        "message": "Syntax error: unexpected token",
        "severity": 1,
        "code": "SYNTAX_ERROR",
        "source": "apex-parser"
      }
    ]
  }
}
```

## Implementation Guide

### Basic Setup

```typescript
import { HandlerFactory } from '@salesforce/apex-lsp-compliant-services';

// Create handlers
const diagnosticHandler = HandlerFactory.createDiagnosticHandler();
const documentChangeHandler = HandlerFactory.createDidChangeDocumentHandler();
```

### Register LSP Handlers

```typescript
// Pull-based diagnostics
connection.onRequest('textDocument/diagnostic', async (params) => {
  return await diagnosticHandler.handleDiagnostic(params);
});

// Push-based diagnostics (on document changes)
documents.onDidChangeContent(async (event) => {
  const diagnostics = await documentChangeHandler.handleDocumentChange(event);
  if (diagnostics) {
    connection.sendDiagnostics({
      uri: event.document.uri,
      diagnostics,
    });
  }
});
```

### VS Code Extension Example

```typescript
// Request diagnostics for a file
const diagnostics = await connection.sendRequest('textDocument/diagnostic', {
  textDocument: { uri: 'file:///path/to/MyClass.cls' },
});

// Listen for diagnostic notifications
connection.onNotification('textDocument/publishDiagnostics', (params) => {
  console.log('Received diagnostics:', params.diagnostics);
});
```

### Custom LSP Client Example

```typescript
// Send diagnostic request
const response = await client.request('textDocument/diagnostic', {
  textDocument: { uri: documentUri },
});

// Handle diagnostic notifications
client.onNotification('textDocument/publishDiagnostics', (params) => {
  // Update UI with diagnostics
  updateDiagnostics(params.uri, params.diagnostics);
});
```

## Configuration

### Server Settings

Diagnostic behavior can be configured through the `ApexLanguageServerSettings`:

```typescript
interface DiagnosticSettings {
  /** Enable pull-based diagnostics (textDocument/diagnostic) */
  enablePullDiagnostics: boolean;

  /** Enable push-based diagnostics (textDocument/publishDiagnostics) */
  enablePushDiagnostics: boolean;

  /** Maximum number of diagnostics per file */
  maxDiagnosticsPerFile: number;

  /** Include warnings in diagnostics */
  includeWarnings: boolean;

  /** Include info messages in diagnostics */
  includeInfo: boolean;
}
```

### Default Settings

```typescript
{
  diagnostics: {
    enablePullDiagnostics: true,
    enablePushDiagnostics: true,
    maxDiagnosticsPerFile: 100,
    includeWarnings: true,
    includeInfo: true,
  }
}
```

### Environment-specific Settings

```typescript
import {
  DEFAULT_APEX_SETTINGS,
  BROWSER_DEFAULT_APEX_SETTINGS,
} from '@salesforce/apex-lsp-compliant-services';

// Node.js (default)
const settings = DEFAULT_APEX_SETTINGS;

// Browser (optimized)
const settings = BROWSER_DEFAULT_APEX_SETTINGS;
```

## Diagnostic Severity Levels

| Severity    | Value | Description                        | Usage                                |
| ----------- | ----- | ---------------------------------- | ------------------------------------ |
| Error       | 1     | Indicates an error                 | Syntax errors, compilation failures  |
| Warning     | 2     | Indicates a warning                | Code style issues, deprecated usage  |
| Information | 3     | Indicates an informational message | Suggestions, best practices          |
| Hint        | 4     | Indicates a hint                   | Quick fixes, refactoring suggestions |

## Diagnostic Codes

The server generates diagnostic codes based on error type and severity:

| Code               | Description                   |
| ------------------ | ----------------------------- |
| `SYNTAX_ERROR`     | Syntax parsing errors         |
| `SYNTAX_WARNING`   | Syntax warnings               |
| `SYNTAX_INFO`      | Syntax information messages   |
| `SEMANTIC_ERROR`   | Semantic analysis errors      |
| `SEMANTIC_WARNING` | Semantic warnings             |
| `SEMANTIC_INFO`    | Semantic information messages |

## Implementation Details

### Architecture

```
Client Request → DiagnosticHandler → DiagnosticProcessingService → Parser → Diagnostics
```

### Key Components

1. **DiagnosticHandler** - Handles `textDocument/diagnostic` requests
2. **DiagnosticProcessingService** - Core diagnostic processing logic
3. **DocumentProcessingService** - Triggers push diagnostics on document changes
4. **getDiagnosticsFromErrors** - Utility function for converting parser errors to LSP diagnostics

### Error Sources

Diagnostics are generated from:

- **Syntax Errors** - ANTLR parser errors during compilation
- **Semantic Errors** - Custom validation errors
- **Lexer Errors** - Token recognition errors

### Range Calculation

The server calculates diagnostic ranges using:

1. **Exact positions** - When `endLine` and `endColumn` are available
2. **Source text estimation** - When only start position is known
3. **Bounds checking** - Ensures positions are non-negative

## API Reference

### DiagnosticHandler

```typescript
class DiagnosticHandler {
  constructor(
    logger: LoggerInterface,
    diagnosticProcessor: IDiagnosticProcessor,
  );

  async handleDiagnostic(params: DocumentSymbolParams): Promise<Diagnostic[]>;
}
```

### DiagnosticProcessingService

```typescript
class DiagnosticProcessingService implements IDiagnosticProcessor {
  constructor(logger: LoggerInterface);

  async processDiagnostic(params: DocumentSymbolParams): Promise<Diagnostic[]>;
}
```

### DocumentProcessingService

```typescript
class DocumentProcessingService implements IDocumentProcessor {
  constructor(logger: LoggerInterface);

  async processDocumentChange(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined>;
}
```

### Utility Functions

```typescript
function getDiagnosticsFromErrors(
  errors: ApexError[],
  options?: {
    includeWarnings?: boolean;
    includeInfo?: boolean;
    maxDiagnostics?: number;
    includeCodes?: boolean;
  },
): Diagnostic[];
```

### Factory Methods

```typescript
class HandlerFactory {
  static createDiagnosticHandler(): DiagnosticHandler;
  static createDidChangeDocumentHandler(): DidChangeDocumentHandler;
  static createDocumentSymbolHandler(): DocumentSymbolHandler;
  // ... other factory methods
}
```

## Common Patterns

### Custom Diagnostic Processor

```typescript
import {
  DiagnosticProcessingService,
  IDiagnosticProcessor,
} from '@salesforce/apex-lsp-compliant-services';

class CustomDiagnosticProcessor extends DiagnosticProcessingService {
  async processDiagnostic(params: DocumentSymbolParams): Promise<Diagnostic[]> {
    const diagnostics = await super.processDiagnostic(params);

    // Add custom diagnostics
    diagnostics.push({
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
      message: 'Custom validation message',
      severity: DiagnosticSeverity.Warning,
      code: 'CUSTOM_WARNING',
    });

    return diagnostics;
  }
}

// Use custom processor
const handler = new DiagnosticHandler(
  logger,
  new CustomDiagnosticProcessor(logger),
);
```

### Error Handling

```typescript
try {
  const diagnostics = await handler.handleDiagnostic(params);
  return diagnostics;
} catch (error) {
  logger.error(() => `Diagnostic processing failed: ${error}`);
  return []; // Return empty array on error
}
```

### Performance Optimization

```typescript
// Limit diagnostics for large files
const diagnostics = getDiagnosticsFromErrors(errors, {
  maxDiagnostics: 50,
  includeWarnings: false,
  includeInfo: false,
});

// Use pull-based diagnostics for on-demand validation
// Use push-based diagnostics for real-time feedback
```

## Testing

### Unit Tests

```bash
# Run all diagnostic tests
npm test -- --testPathPattern="Diagnostic"

# Run specific test files
npm test -- --testPathPattern="DiagnosticHandler.test.ts"
npm test -- --testPathPattern="DiagnosticProcessingService.test.ts"
```

### Manual Testing

Use the Apex Language Server testbed:

```bash
cd packages/apex-lsp-testbed
npm run test:diagnostics
```

### LSP Trace Testing

Enable LSP tracing to see diagnostic requests:

```json
{
  "apex.ls.trace": "verbose"
}
```

### Turbo Commands

```bash
# Run tests for specific package
npx turbo run test --filter=@salesforce/apex-lsp-compliant-services

# Run tests with Jest arguments
npx turbo run test --filter=@salesforce/apex-lsp-compliant-services -- --testPathPattern="Diagnostic"
```

## Troubleshooting

### Common Issues

1. **No diagnostics returned**

   - Check if document exists in storage
   - Verify diagnostic settings are enabled
   - Check log files for parsing errors

2. **Incorrect diagnostic ranges**

   - Ensure document line endings are consistent
   - Check if source text is properly captured
   - Verify bounds checking logic

3. **Performance issues**
   - Reduce `maxDiagnosticsPerFile` setting
   - Disable `includeInfo` for large files
   - Use pull-based diagnostics for on-demand requests

### Debugging

Enable debug logging:

```typescript
// In your language server configuration
{
  "apex.ls.logLevel": "debug"
}
```

Check logs for:

- Diagnostic request/response messages
- Parser error details
- Range calculation information

### API Quick Reference

#### Core Classes

```typescript
// Handlers
DiagnosticHandler; // textDocument/diagnostic
DidChangeDocumentHandler; // Document change events
DidOpenDocumentHandler; // Document open events
DidCloseDocumentHandler; // Document close events

// Services
DiagnosticProcessingService; // Core diagnostic logic
DocumentProcessingService; // Document change processing

// Utilities
getDiagnosticsFromErrors(); // Convert parser errors to diagnostics
HandlerFactory; // Factory for creating handlers
```

#### Key Methods

```typescript
// DiagnosticHandler
handleDiagnostic(params: DocumentSymbolParams): Promise<Diagnostic[]>

// DiagnosticProcessingService
processDiagnostic(params: DocumentSymbolParams): Promise<Diagnostic[]>

// DocumentProcessingService
processDocumentChange(event: TextDocumentChangeEvent): Promise<Diagnostic[] | undefined>

// Utility
getDiagnosticsFromErrors(errors: ApexError[], options?: DiagnosticOptions): Diagnostic[]
```

## Best Practices

1. **Use pull-based diagnostics** for on-demand validation
2. **Use push-based diagnostics** for real-time feedback
3. **Limit diagnostic count** for large files
4. **Provide meaningful error codes** for client filtering
5. **Include source information** for better error context
6. **Handle errors gracefully** with proper fallbacks
7. **Use environment-specific settings** for optimal performance
8. **Test thoroughly** with both unit and integration tests

## Related Documentation

- [LSP Specification](https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/)
- [Apex Parser AST](../apex-parser-ast/README.md)
- [Configuration Guide](CONFIGURATION.md)
- [Testing Guide](TESTING.md)
