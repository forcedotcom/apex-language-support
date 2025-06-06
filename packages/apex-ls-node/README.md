# Apex Language Server (Node.js)

This package provides the Node.js implementation of the Apex Language Server.

## Features

- Full Language Server Protocol (LSP) support
- Document parsing and symbol extraction
- Configurable comment collection
- Real-time diagnostics
- Document symbols

## Configuration

The language server supports configuration through standard LSP mechanisms. Configuration can be provided via:

1. **Initialization Options**: Settings passed during server initialization
2. **Workspace Configuration**: Runtime configuration changes via `workspace/didChangeConfiguration`

### Configuration Sections

The server looks for configuration in these sections (in order of precedence):

- `apex`
- `apexLanguageServer`
- `apex.languageServer`
- `salesforce.apex`

### Available Settings

#### Comment Collection Settings

```json
{
  "apex": {
    "commentCollection": {
      "enableCommentCollection": true,
      "includeSingleLineComments": false,
      "associateCommentsWithSymbols": false,
      "enableForDocumentChanges": true,
      "enableForDocumentOpen": true,
      "enableForDocumentSymbols": false,
      "enableForFoldingRanges": false
    }
  }
}
```

#### Performance Settings

```json
{
  "apex": {
    "performance": {
      "commentCollectionMaxFileSize": 102400,
      "useAsyncCommentProcessing": true,
      "documentChangeDebounceMs": 300
    }
  }
}
```

#### Environment Settings

```json
{
  "apex": {
    "environment": {
      "enablePerformanceLogging": false,
      "commentCollectionLogLevel": "info"
    }
  }
}
```

## Usage

### Starting the Server

The server supports multiple transport mechanisms:

```bash
# stdio transport
node dist/index.js --stdio

# Node IPC transport
node dist/index.js --node-ipc

# Socket transport
node dist/index.js --socket=6009
```

### With VS Code

When used with VS Code, configuration can be provided through workspace settings:

```json
{
  "apex.commentCollection.enableCommentCollection": true,
  "apex.performance.commentCollectionMaxFileSize": 204800
}
```

### Programmatic Usage

```typescript
import { createConnection } from 'vscode-languageserver/node';

// Configuration will be automatically handled through LSP mechanisms
const connection = createConnection(process.stdin, process.stdout);
```

## Architecture

The server integrates with:

- **ApexSettingsManager**: Manages server settings lifecycle
- **LSPConfigurationManager**: Handles LSP configuration protocol
- **ApexStorageManager**: Manages document storage and retrieval
- **CompilerService**: Processes Apex code parsing and analysis

For more details on configuration schema and options, see the [configuration documentation](../lsp-compliant-services/docs/CONFIGURATION.md).
