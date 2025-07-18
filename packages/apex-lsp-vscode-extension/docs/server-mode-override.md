# Server Mode Override

The Apex Language Server supports overriding the server mode using the `APEX_LS_MODE` environment variable. This allows you to force the server to run in a specific mode regardless of the VS Code extension's mode.

## Usage

Set the `APEX_LS_MODE` environment variable to one of the following values:

- `production` - Forces production mode
- `development` - Forces development mode

## Priority Order

The server determines its mode using the following priority order:

1. **APEX_LS_MODE environment variable** (highest priority)
2. **Extension mode** (Development/Test → 'development', Production → 'production')
3. **NODE_ENV environment variable** (lowest priority)

## Examples

### Force Production Mode

```bash
export APEX_LS_MODE=production
```

### Force Development Mode

```bash
export APEX_LS_MODE=development
```

## Use Cases

- **Testing**: Force production mode during development to test production behavior
- **Debugging**: Force development mode in production environments for enhanced logging
- **CI/CD**: Set specific modes in automated environments
- **Troubleshooting**: Override mode to isolate issues

## Implementation Details

The environment variable is passed from the VS Code extension to the language server process and is checked during server initialization. The server logs which mode source is being used for transparency.

**Extension Mode Mapping:**

- `vscode.ExtensionMode.Development` → `'development'`
- `vscode.ExtensionMode.Test` → `'development'` (maps to development mode)
- `vscode.ExtensionMode.Production` → `'production'`

## Notes

- Invalid values for `APEX_LS_MODE` are ignored, and the server falls back to the next priority level
- The environment variable takes precedence over all other mode determination methods
- This override is useful for testing and debugging scenarios where you need to control the server's behavior independently of the extension's mode
