# Apex Language Server VSCode Extension

This extension provides Apex language support in Visual Studio Code through the Apex Language Server.

## Features

- **Syntax Highlighting**: Full Apex and SOQL syntax highlighting
- **Language Server Integration**: Real-time diagnostics and language features
- **Configurable Comment Collection**: Control how comments are processed
- **Performance Optimization**: Configurable settings for optimal performance
- **Document Symbols**: Navigate code structure with symbol support
- **Inspector Tools**: Debug LSP communication (for development)

## Installation

1. Install the extension from the VSCode marketplace
2. Open a workspace containing Apex files (`.cls`, `.trigger`, `.apex`)
3. The language server will start automatically

## Configuration

The extension supports extensive configuration through VSCode settings. All settings are prefixed with `apex.`.

### Comment Collection Settings

Control how comments are collected and processed during document parsing:

```json
{
  "apex.commentCollection.enableCommentCollection": true,
  "apex.commentCollection.includeSingleLineComments": false,
  "apex.commentCollection.associateCommentsWithSymbols": false,
  "apex.commentCollection.enableForDocumentChanges": true,
  "apex.commentCollection.enableForDocumentOpen": true,
  "apex.commentCollection.enableForDocumentSymbols": false,
  "apex.commentCollection.enableForFoldingRanges": false
}
```

#### Comment Collection Options

- **`enableCommentCollection`** (boolean, default: `true`)

  - Master switch for comment collection. When disabled, no comments are collected.

- **`includeSingleLineComments`** (boolean, default: `false`)

  - Include single-line (`//`) comments in addition to block comments (`/* */`).

- **`associateCommentsWithSymbols`** (boolean, default: `false`)

  - Associate comments with nearby symbols for enhanced language features.
  - ⚠️ May impact performance.

- **`enableForDocumentChanges`** (boolean, default: `true`)

  - Enable comment collection when documents are modified.

- **`enableForDocumentOpen`** (boolean, default: `true`)

  - Enable comment collection when documents are opened.

- **`enableForDocumentSymbols`** (boolean, default: `false`)

  - Enable comment collection for document symbols.
  - ⚠️ May impact performance.

- **`enableForFoldingRanges`** (boolean, default: `false`)
  - Enable comment collection for folding ranges.
  - ⚠️ May impact performance.

### Performance Settings

Optimize language server performance:

```json
{
  "apex.performance.commentCollectionMaxFileSize": 102400,
  "apex.performance.useAsyncCommentProcessing": true,
  "apex.performance.documentChangeDebounceMs": 300
}
```

#### Performance Options

- **`commentCollectionMaxFileSize`** (number, default: `102400`)

  - Maximum file size (in bytes) for comment collection. Files larger than this will skip comment collection.

- **`useAsyncCommentProcessing`** (boolean, default: `true`)

  - Use asynchronous comment processing to improve responsiveness.

- **`documentChangeDebounceMs`** (number, default: `300`)
  - Debounce delay (in milliseconds) for document change processing.

### Environment Settings

Control logging and debugging:

```json
{
  "apex.environment.enablePerformanceLogging": false,
  "apex.environment.commentCollectionLogLevel": "info"
}
```

#### Environment Options

- **`enablePerformanceLogging`** (boolean, default: `false`)

  - Enable performance logging for the language server.

- **`commentCollectionLogLevel`** (string, default: `"info"`)
  - Log level for comment collection operations.
  - Options: `"debug"`, `"info"`, `"warn"`, `"error"`

### Inspector Settings

Debug LSP communication:

```json
{
  "apex.inspector.enabled": false
}
```

- **`inspector.enabled`** (boolean, default: `false`)
  - Enable LSP request/response inspector for debugging.

### Legacy Settings

For compatibility with other tooling:

```json
{
  "apex.enable": true,
  "apex.trace.server": "off",
  "apex.debug": false,
  "apex.debugPort": 0
}
```

## Commands

The extension provides the following commands:

- **Restart Apex Language Server** (`apex.restart.server`)

  - Restart the language server if it becomes unresponsive
  - Available via Command Palette or status bar click

- **Toggle Apex LSP Inspector** (`apex.inspector.toggle`)
  - Toggle the LSP request/response inspector for debugging

## Workspace Settings Example

Create a `.vscode/settings.json` file in your workspace for project-specific settings:

```json
{
  "apex.commentCollection.enableCommentCollection": true,
  "apex.commentCollection.includeSingleLineComments": true,
  "apex.commentCollection.associateCommentsWithSymbols": true,
  "apex.performance.commentCollectionMaxFileSize": 204800,
  "apex.environment.commentCollectionLogLevel": "debug"
}
```

## User Settings Example

Configure global settings in VSCode user settings:

```json
{
  "apex.commentCollection.enableCommentCollection": true,
  "apex.performance.useAsyncCommentProcessing": true,
  "apex.performance.documentChangeDebounceMs": 500,
  "apex.environment.enablePerformanceLogging": false
}
```

## Performance Recommendations

For optimal performance with large codebases:

1. **Disable expensive features** for large files:

   ```json
   {
     "apex.commentCollection.associateCommentsWithSymbols": false,
     "apex.commentCollection.enableForDocumentSymbols": false,
     "apex.performance.commentCollectionMaxFileSize": 51200
   }
   ```

2. **Increase debounce** for frequently changing files:

   ```json
   {
     "apex.performance.documentChangeDebounceMs": 500
   }
   ```

3. **Enable performance logging** to identify bottlenecks:
   ```json
   {
     "apex.environment.enablePerformanceLogging": true,
     "apex.environment.commentCollectionLogLevel": "debug"
   }
   ```

## Troubleshooting

### Language Server Not Starting

1. Check the Output panel (View → Output → Apex Language Server)
2. Use the "Restart Apex Language Server" command
3. Verify workspace contains Apex files
4. Check extension and dependency versions

### Performance Issues

1. Reduce `commentCollectionMaxFileSize` for large files
2. Disable `associateCommentsWithSymbols` if not needed
3. Increase `documentChangeDebounceMs` for busy editing
4. Enable performance logging to identify bottlenecks

### Configuration Not Applying

1. Settings changes are applied immediately via `workspace/didChangeConfiguration`
2. Check for typos in setting names
3. Verify JSON syntax in settings files
4. Restart the language server if issues persist

## Development

For extension development and debugging:

1. Enable inspector: `"apex.inspector.enabled": true`
2. Use debug logging: `"apex.environment.commentCollectionLogLevel": "debug"`
3. Enable performance logging: `"apex.environment.enablePerformanceLogging": true`
4. Monitor the Output panel for detailed logs

## Architecture

The extension integrates with:

- **Apex Language Server (Node.js)**: Provides core language features
- **LSP Configuration Manager**: Handles settings lifecycle
- **Comment Collection System**: Configurable comment processing
- **Performance Monitoring**: Optimizes resource usage

For more details on the underlying language server, see the [Node.js Language Server documentation](../apex-ls-node/README.md).
