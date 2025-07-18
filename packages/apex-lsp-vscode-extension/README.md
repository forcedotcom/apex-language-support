# Salesforce Apex Language Server for VSCode

This extension provides Apex language support in Visual Studio Code through the Apex Language Server.

## Features

- **Syntax Highlighting**: Full Apex and SOQL syntax highlighting.
- **Language Server Integration**: Real-time diagnostics and language features powered by the Apex Language Server.
- **Configurable Comment Collection**: Fine-tune how comments are parsed and processed.
- **Performance Optimization**: Adjust settings to optimize for speed and resource usage.
- **Document Symbols**: Easily navigate your code's structure.

## Installation

1. Install the extension from the VSCode Marketplace.
2. Open a workspace containing Apex files (`.cls`, `.trigger`, `.apex`).
3. The language server will start automatically.

## Configuration

The extension supports extensive configuration through VSCode settings. All settings are prefixed with `apex-ls-ts.`.

### Comment Collection Settings

Control how comments are collected and processed during document parsing:

```json
{
  "apex-ls-ts.commentCollection.enableCommentCollection": true,
  "apex-ls-ts.commentCollection.includeSingleLineComments": false,
  "apex-ls-ts.commentCollection.associateCommentsWithSymbols": true,
  "apex-ls-ts.commentCollection.enableForDocumentChanges": true,
  "apex-ls-ts.commentCollection.enableForDocumentOpen": true,
  "apex-ls-ts.commentCollection.enableForDocumentSymbols": false,
  "apex-ls-ts.commentCollection.enableForFoldingRanges": true
}
```

#### Comment Collection Options

- **`enableCommentCollection`** (boolean, default: `true`)
  - Master switch for comment collection. When disabled, no comments are collected.

- **`includeSingleLineComments`** (boolean, default: `false`)
  - Include single-line (`//`) comments in addition to block comments (`/* */`).

- **`associateCommentsWithSymbols`** (boolean, default: `true`)
  - Associate comments with nearby symbols for enhanced language features.
  - ⚠️ May impact performance, especially in large files.

- **`enableForDocumentChanges`** (boolean, default: `true`)
  - Enable comment collection when documents are modified.

- **`enableForDocumentOpen`** (boolean, default: `true`)
  - Enable comment collection when documents are opened.

- **`enableForDocumentSymbols`** (boolean, default: `false`)
  - Enable comment collection for document symbols.
  - ⚠️ May impact performance.

- **`enableForFoldingRanges`** (boolean, default: `true`)
  - Enable comment collection for folding ranges.
  - ⚠️ May impact performance.

### Performance Settings

Optimize language server performance:

```json
{
  "apex-ls-ts.performance.commentCollectionMaxFileSize": 102400,
  "apex-ls-ts.performance.useAsyncCommentProcessing": true,
  "apex-ls-ts.performance.documentChangeDebounceMs": 300
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
  "apex-ls-ts.environment.enablePerformanceLogging": false
}
```

#### Environment Options

- **`enablePerformanceLogging`** (boolean, default: `false`)
  - Enable performance logging for the language server.

### Debug Settings

Configure debugging for the language server:

```json
{
  "apex-ls-ts.debug": "off",
  "apex-ls-ts.debugPort": 6009
}
```

#### Debug Options

- **`debug`** (string, enum: `"off"`, `"inspect"`, `"inspect-brk"`, default: `"off"`)
  - **`"off"`**: No debugging enabled
  - **`"inspect"`**: Enable debugging without breaking on startup
  - **`"inspect-brk"`**: Enable debugging with break on startup

- **`debugPort`** (number, default: `6009`)
  - Port to use for debugging. Set to `6009` to use the default port.

### Legacy Settings

These settings are for low-level control and compatibility with other tooling:

```json
{
  "apex-ls-ts.enable": true,
  "apex-ls-ts.trace.server": "off"
}
```

## Server Mode Configuration

The Apex Language Server supports different operational modes that affect performance and feature availability:

### Server Modes

- **Production Mode**: Optimized for performance and stability
  - Disabled features: hover provider, completion resolve provider, will-save notifications
  - Full text document sync for reliability
  - Minimal diagnostic processing

- **Development Mode**: Full feature set for development workflows
  - Enabled features: hover provider, completion resolve provider, will-save notifications
  - Incremental text document sync for better performance
  - Enhanced diagnostic processing

### Mode Determination

The server mode is determined by the following priority order:

1. **Environment Variable**: `APEX_LS_MODE=production` or `APEX_LS_MODE=development`
2. **Extension Mode**: Automatically based on VS Code extension mode
   - Development/Test extension mode → Development server mode
   - Production extension mode → Production server mode
3. **NODE_ENV**: Falls back to `NODE_ENV` environment variable

### Environment Variable Override

You can force the server to run in a specific mode regardless of the extension mode:

```bash
# Force production mode
export APEX_LS_MODE=production

# Force development mode
export APEX_LS_MODE=development
```

This is useful for:

- Testing production behavior during development
- Debugging with enhanced logging in production environments
- CI/CD environments requiring specific modes

For detailed information, see [Server Mode Override Documentation](docs/server-mode-override.md).

## Commands

The extension provides the following commands, which can be accessed from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **Restart Apex Language Server** (`apex.restart.server`)
  - Restarts the language server if it becomes unresponsive.
  - Also available by clicking the status bar item.

## Workspace Settings Example

Create a `.vscode/settings.json` file in your workspace for project-specific settings:

```json
{
  "apex-ls-ts.commentCollection.enableCommentCollection": true,
  "apex-ls-ts.commentCollection.includeSingleLineComments": true,
  "apex-ls-ts.commentCollection.associateCommentsWithSymbols": true,
  "apex-ls-ts.performance.commentCollectionMaxFileSize": 204800
}
```

## User Settings Example

Configure global settings in VSCode user settings:

```json
{
  "apex-ls-ts.commentCollection.enableCommentCollection": true,
  "apex-ls-ts.performance.useAsyncCommentProcessing": true,
  "apex-ls-ts.performance.documentChangeDebounceMs": 500,
  "apex-ls-ts.environment.enablePerformanceLogging": false
}
```

## Performance Recommendations

For optimal performance, especially with large codebases:

1. **Disable expensive features** for large files or if not needed:

   ```json
   {
     "apex-ls-ts.commentCollection.associateCommentsWithSymbols": false,
     "apex-ls-ts.commentCollection.enableForDocumentSymbols": false,
     "apex-ls-ts.commentCollection.enableForFoldingRanges": false
   }
   ```

2. **Adjust file size limit** for comment collection:

   ```json
   {
     "apex-ls-ts.performance.commentCollectionMaxFileSize": 51200
   }
   ```

3. **Increase debounce** for frequently changing files:

   ```json
   {
     "apex-ls-ts.performance.documentChangeDebounceMs": 500
   }
   ```

4. **Enable performance logging** to identify bottlenecks:
   ```json
   {
     "apex-ls-ts.environment.enablePerformanceLogging": true
   }
   ```

## Troubleshooting

### Language Server Not Starting

1. Check the **Output** panel (View → Output) and select **Apex Language Server** from the dropdown.
2. Use the **Restart Apex Language Server** command from the Command Palette.
3. Verify your workspace contains Apex files (`.cls`, `.trigger`, `.apex`).
4. Check for conflicting extensions.

### Performance Issues

1. Reduce `commentCollectionMaxFileSize` for large files.
2. Disable `associateCommentsWithSymbols` if not needed.
3. Increase `documentChangeDebounceMs` for busy editing environments.
4. Enable performance logging to identify bottlenecks.

### Configuration Not Applying

1. Settings changes are applied immediately. If not, use the **Restart Apex Language Server** command.
2. Check for typos in setting keys in your `settings.json` file.
3. Verify the JSON syntax in your settings files is correct.

## Development

For extension development and debugging:

1. Enable performance logging: `"apex-ls-ts.environment.enablePerformanceLogging": true`
2. Set the trace level: `"apex-ls-ts.trace.server": "verbose"`
3. Enable debugging: `
