# Server Mode Override

The Apex Language Server supports multiple ways to configure the server mode. This allows you to control which features are enabled and the server's behavior.

## Configuration Methods

You can configure the server mode using any of the following methods:

### 1. Environment Variable
Set the `APEX_LS_MODE` environment variable to one of the following values:
- `production` - Forces production mode
- `development` - Forces development mode

### 2. Workspace Settings
Add the following to your `.vscode/settings.json` or workspace settings:
```json
{
  "apex.environment.serverMode": "development"
}
```

### 3. Extension Mode
The server will automatically detect the VS Code extension mode (Development/Test → 'development', Production → 'production')

## Priority Order

The server determines its mode using the following priority order:

1. **APEX_LS_MODE environment variable** (highest priority)
2. **Workspace settings** (`apex.environment.serverMode`)
3. **Extension mode** (Development/Test → 'development', Production → 'production')
4. **NODE_ENV environment variable** (lowest priority)

## Examples

### Using Environment Variable

Force production mode:
```bash
export APEX_LS_MODE=production
```

Force development mode:
```bash
export APEX_LS_MODE=development
```

### Using Workspace Settings

Add to `.vscode/settings.json`:
```json
{
  "apex.environment.serverMode": "development",
  "apex.logLevel": "debug"
}
```

This is the recommended approach for:
- Project-specific configuration
- Shared team settings (via committed `.vscode/settings.json`)
- Enabling development features without changing VS Code launch configuration

## Use Cases

- **Testing**: Force production mode during development to test production behavior
- **Debugging**: Force development mode in production environments for enhanced logging
- **Team Development**: Share development mode configuration via workspace settings
- **Feature Testing**: Enable development-only features (hover, completion, etc.) without rebuilding the extension
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
