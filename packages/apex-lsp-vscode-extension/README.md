# Salesforce Apex Language Server for VSCode

This extension provides Apex language support in Visual Studio Code through the Apex Language Server.

## Features

- **Syntax Highlighting**: Full Apex and SOQL syntax highlighting.
- **Language Server Integration**: Real-time diagnostics and language features powered by the Apex Language Server.
- **Configurable Comment Collection**: Fine-tune how comments are parsed and processed.
- **Performance Optimization**: Adjust settings to optimize for speed and resource usage.
- **Document Symbols**: Easily navigate your code's structure.
- **Inspector Tools**: Debug Language Server Protocol (LSP) communication for development and troubleshooting.

## Installation

1. Install the extension from the VSCode Marketplace.
2. Open a workspace containing Apex files (`.cls`, `.trigger`, `.apex`).
3. The language server will start automatically.

## Configuration

The extension supports extensive configuration through VSCode settings. All settings are prefixed with `apex.`.

### Comment Collection Settings

Control how comments are collected and processed during document parsing:

```json
{
  "apex.commentCollection.enableCommentCollection": true,
  "apex.commentCollection.includeSingleLineComments": false,
  "apex.commentCollection.associateCommentsWithSymbols": true,
  "apex.commentCollection.enableForDocumentChanges": true,
  "apex.commentCollection.enableForDocumentOpen": true,
  "apex.commentCollection.enableForDocumentSymbols": false,
  "apex.commentCollection.enableForFoldingRanges": true
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
  "apex.environment.enablePerformanceLogging": false
}
```

#### Environment Options

- **`enablePerformanceLogging`** (boolean, default: `false`)
  - Enable performance logging for the language server.

### Inspector Settings

Debug LSP communication:

```json
{
  "apex.inspector.enabled": false
}
```

- **`inspector.enabled`** (boolean, default: `false`)
  - Enable LSP request/response inspector for debugging.

### Debug Settings

Configure debugging for the language server:

```json
{
  "apex.debug": "off",
  "apex.debugPort": 6009
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
  "apex.enable": true,
  "apex.trace.server": "off"
}
```

## Commands

The extension provides the following commands, which can be accessed from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

- **Restart Apex Language Server** (`apex.restart.server`)

  - Restarts the language server if it becomes unresponsive.
  - Also available by clicking the status bar item.

- **Toggle Apex LSP Inspector** (`apex.inspector.toggle`)
  - Toggles the LSP request/response inspector for debugging.

## Workspace Settings Example

Create a `.vscode/settings.json` file in your workspace for project-specific settings:

```json
{
  "apex.commentCollection.enableCommentCollection": true,
  "apex.commentCollection.includeSingleLineComments": true,
  "apex.commentCollection.associateCommentsWithSymbols": true,
  "apex.performance.commentCollectionMaxFileSize": 204800
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

For optimal performance, especially with large codebases:

1. **Disable expensive features** for large files or if not needed:

   ```json
   {
     "apex.commentCollection.associateCommentsWithSymbols": false,
     "apex.commentCollection.enableForDocumentSymbols": false,
     "apex.commentCollection.enableForFoldingRanges": false
   }
   ```

2. **Adjust file size limit** for comment collection:

   ```json
   {
     "apex.performance.commentCollectionMaxFileSize": 51200
   }
   ```

3. **Increase debounce** for frequently changing files:

   ```json
   {
     "apex.performance.documentChangeDebounceMs": 500
   }
   ```

4. **Enable performance logging** to identify bottlenecks:
   ```json
   {
     "apex.environment.enablePerformanceLogging": true
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

1. Enable inspector: `"apex.inspector.enabled": true`
2. Enable performance logging: `"apex.environment.enablePerformanceLogging": true`
3. Set the trace level: `"apex.trace.server": "verbose"`
4. Enable debugging: `"apex.debug": "inspect"` or `"apex.debug": "inspect-brk"`
5. Monitor the **Output** panel for detailed logs.

### Debugging the Language Server

The extension supports VS Code configuration-based debugging of the language server process. Configure the debug settings in your VS Code settings to control inspection behavior:

#### Debug Mode Options

- **No Inspection** (default): Set `"apex.debug": "off"`

  ```json
  {
    "apex.debug": "off"
  }
  ```

- **Inspection without Break**: Set to `"inspect"`

  ```json
  {
    "apex.debug": "inspect",
    "apex.debugPort": 6009
  }
  ```

- **Inspection with Break**: Set to `"inspect-brk"`
  ```json
  {
    "apex.debug": "inspect-brk",
    "apex.debugPort": 6009
  }
  ```

#### Usage Examples

1. **For development without debugging**:

   ```json
   {
     "apex.debug": "off"
   }
   ```

2. **For debugging with inspection**:

   ```json
   {
     "apex.debug": "inspect",
     "apex.debugPort": 6009
   }
   ```

   Then attach debugger to `localhost:6009`

3. **For debugging with break on startup**:
   ```json
   {
     "apex.debug": "inspect-brk",
     "apex.debugPort": 6009
   }
   ```
   Debugger will break immediately when language server starts

#### Debugging in VS Code

To debug the language server in VS Code:

1. Configure your settings with the desired debug mode
2. Restart the language server using the **Restart Apex Language Server** command
3. Open the Debug panel in VS Code
4. Create a new launch configuration for "Attach to Node.js Process"
5. Set the port to match your `apex.debugPort` setting (6009 is the default)
6. Start debugging

The language server will pause on startup if using `"inspect-brk"` mode, allowing you to set breakpoints and step through the code.

**Note**: The language server will log debug mode changes in the Output panel under 'Apex Language Server (Typescript)' when inspection is enabled (`"inspect"` or `"inspect-brk"`). No log messages are output when debug mode is set to `"off"`.

### Logging Behavior

The extension provides consistent timestamped logging through the Output panel. All log messages from the language server are automatically formatted with ISO timestamps for easy debugging and monitoring.

## Architecture

The extension integrates with:

- **Apex Language Server (Node.js)**: Provides core language features.
- **LSP Configuration Manager**: Handles the settings lifecycle.
- **Comment Collection System**: Provides configurable comment processing.
- **Performance Monitoring**: Helps optimize resource usage.

For more details on the underlying language server, see the [Node.js Language Server documentation](../apex-ls-node/README.md).
