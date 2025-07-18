# Apex Language Server Capabilities

This document describes the capabilities management system for the Apex Language Server, which provides platform-agnostic language server capabilities based on server mode.

## Overview

The capabilities system is designed to be platform-agnostic, providing consistent language server features across different environments while allowing for mode-specific optimizations. The system uses the official LSP `ServerCapabilities` type from the `vscode-languageserver-protocol` package for full compatibility and type safety.

## Architecture

### Core Components

- **ApexLanguageServerCapabilities**: Defines the capability configurations for different server modes
- **ApexCapabilitiesManager**: Singleton manager that provides capabilities based on server mode
- **LSPConfigurationManager**: High-level configuration interface with custom override support

### Server Modes

The system supports three server modes:

1. **Production**: Optimized for performance and stability
2. **Development**: Full feature set for development workflows
3. **Test**: Testing-specific features and configurations

## Capability Configurations

### Production Capabilities

Optimized for performance and stability in production environments:

```typescript
export const PRODUCTION_CAPABILITIES: ServerCapabilities = {
  textDocumentSync: {
    openClose: true,
    change: 1, // Full text document sync for reliability
    save: true,
    willSave: false, // Disabled for performance
    willSaveWaitUntil: false, // Disabled for performance
  },
  completionProvider: {
    resolveProvider: false, // Disabled for performance
    triggerCharacters: ['.'],
  },
  hoverProvider: false, // Disabled for performance
  documentSymbolProvider: true, // Essential for navigation
  foldingRangeProvider: true, // Essential for code folding
  diagnosticProvider: {
    interFileDependencies: false, // Disabled for performance
    workspaceDiagnostics: false, // Disabled for performance
  },
  workspace: {
    workspaceFolders: {
      supported: true,
      changeNotifications: true,
    },
  },
};
```

### Development Capabilities

Full feature set for development workflows:

```typescript
export const DEVELOPMENT_CAPABILITIES: ServerCapabilities = {
  textDocumentSync: {
    openClose: true,
    change: 2, // Incremental sync for better performance
    save: true,
    willSave: true, // Enabled for development features
    willSaveWaitUntil: true, // Enabled for development features
  },
  completionProvider: {
    resolveProvider: true, // Enabled for rich completions
    triggerCharacters: ['.', '('],
  },
  hoverProvider: true, // Enabled for development
  documentSymbolProvider: true,
  foldingRangeProvider: true,
  diagnosticProvider: {
    interFileDependencies: true, // Enabled for better diagnostics
    workspaceDiagnostics: true, // Enabled for workspace-wide analysis
  },
  workspace: {
    workspaceFolders: {
      supported: true,
      changeNotifications: true,
    },
  },
};
```

### Test Capabilities

Testing-specific features and configurations:

```typescript
export const TEST_CAPABILITIES: ServerCapabilities = {
  textDocumentSync: {
    openClose: true,
    change: 1, // Full sync for testing reliability
    save: true,
    willSave: false,
    willSaveWaitUntil: false,
  },
  completionProvider: {
    resolveProvider: false,
    triggerCharacters: ['.'],
  },
  hoverProvider: false,
  documentSymbolProvider: true,
  foldingRangeProvider: true,
  diagnosticProvider: {
    interFileDependencies: false,
    workspaceDiagnostics: false,
  },
  workspace: {
    workspaceFolders: {
      supported: true,
      changeNotifications: true,
    },
  },
};
```

## Usage

### Basic Usage

```typescript
import { ApexCapabilitiesManager } from '@salesforce/apex-lsp-compliant-services';

// Get the capabilities manager instance
const manager = ApexCapabilitiesManager.getInstance();

// Set the server mode
manager.setMode('development');

// Get capabilities for the current mode
const capabilities = manager.getCapabilities();
```

### Using LSPConfigurationManager

```typescript
import { LSPConfigurationManager } from '@salesforce/apex-lsp-compliant-services';

// Create configuration manager with custom options
const configManager = new LSPConfigurationManager({
  mode: 'development',
  customCapabilities: {
    hoverProvider: false, // Override hover provider
  },
});

// Get capabilities with custom overrides applied
const capabilities = configManager.getCapabilities();
```

### Checking Capabilities

```typescript
const manager = ApexCapabilitiesManager.getInstance();

// Check if a capability is enabled in the current mode
if (manager.isCapabilityEnabled('hoverProvider')) {
  // Hover provider is available
}

// Check if a capability is enabled in a specific mode
if (manager.isCapabilityEnabledForMode('development', 'hoverProvider')) {
  // Hover provider is available in development mode
}
```

## Integration with Language Servers

### Node.js Server Integration

```typescript
import { ApexCapabilitiesManager } from '@salesforce/apex-lsp-compliant-services';

// In your language server initialization
const manager = ApexCapabilitiesManager.getInstance();

// Set mode based on environment or configuration
const mode =
  process.env.NODE_ENV === 'development' ? 'development' : 'production';
manager.setMode(mode);

// Use capabilities in initialize response
const connection = createConnection();
connection.onInitialize(() => {
  return {
    capabilities: manager.getCapabilities(),
  };
});
```

### VS Code Extension Integration

```typescript
import { ApexCapabilitiesManager } from '@salesforce/apex-lsp-compliant-services';

// In your VS Code extension
const manager = ApexCapabilitiesManager.getInstance();

// Set mode based on extension mode
const extensionMode = context.extensionMode;
const serverMode =
  extensionMode === ExtensionMode.Development ? 'development' : 'production';
manager.setMode(serverMode);

// Pass capabilities to language server
const clientOptions = {
  documentSelector: [{ scheme: 'file', language: 'apex' }],
  synchronize: {
    configurationSection: 'apex',
  },
  initializationOptions: {
    mode: serverMode,
  },
};
```

## Capability Features

### Text Document Synchronization

- **Full Sync (change: 1)**: Sends the full content of the document on each change
- **Incremental Sync (change: 2)**: Sends only the changed portions of the document
- **Save Notifications**: Configurable save and will-save notifications
- **Will-Save Wait Until**: Allows servers to make edits before saving

### Completion Provider

- **Trigger Characters**: Characters that trigger completion (e.g., '.', '(')
- **Resolve Provider**: Whether completion items can be resolved for additional information
- **Performance Impact**: Resolve provider disabled in production for better performance

### Hover Provider

- **Development Mode**: Enabled for rich hover information
- **Production Mode**: Disabled for performance optimization
- **Test Mode**: Disabled to focus on core functionality

### Document Symbols

- **Always Enabled**: Essential for navigation and outline views
- **Consistent Across Modes**: Provides reliable symbol information

### Folding Ranges

- **Always Enabled**: Essential for code folding functionality
- **Consistent Across Modes**: Provides reliable folding information

### Diagnostics

- **Inter-file Dependencies**: Whether diagnostics can depend on other files
- **Workspace Diagnostics**: Whether workspace-wide diagnostics are supported
- **Performance Considerations**: Disabled in production for better performance

### Workspace Support

- **Workspace Folders**: Support for multi-root workspaces
- **Change Notifications**: Notifications when workspace folders change

## Best Practices

### Mode Selection

1. **Production**: Use for deployed environments where performance is critical
2. **Development**: Use during development for full feature access
3. **Test**: Use for testing scenarios where reliability is more important than performance

### Custom Overrides

- Use custom capabilities sparingly and only when necessary
- Consider the impact on performance and stability
- Document any custom overrides for team awareness

### Capability Validation

- Always check if a capability is enabled before using it
- Provide fallback behavior for disabled capabilities
- Log capability state for debugging purposes

## Migration Guide

### From Environment-Specific Capabilities

If you were previously using environment-specific capabilities:

1. **Remove Environment Detection**: No longer needed with platform-agnostic design
2. **Update Mode Selection**: Use server mode instead of environment detection
3. **Simplify Configuration**: Use the unified capabilities configuration

### Example Migration

**Before (Environment-Specific)**:

```typescript
const capabilities = manager.getCapabilities('node', 'production');
```

**After (Platform-Agnostic)**:

```typescript
manager.setMode('production');
const capabilities = manager.getCapabilities();
```

## Troubleshooting

### Common Issues

1. **Capability Not Available**: Check if the capability is enabled for the current mode
2. **Performance Issues**: Consider switching to production mode
3. **Missing Features**: Ensure you're in development mode for full feature access

### Debugging

```typescript
const manager = ApexCapabilitiesManager.getInstance();

// Log current mode and capabilities
console.log('Current mode:', manager.getMode());
console.log(
  'Capabilities:',
  JSON.stringify(manager.getCapabilities(), null, 2),
);

// Check specific capabilities
console.log('Hover enabled:', manager.isCapabilityEnabled('hoverProvider'));
console.log(
  'Completion enabled:',
  manager.isCapabilityEnabled('completionProvider'),
);
```

### Performance Monitoring

- Monitor capability usage in different modes
- Track performance impact of enabled capabilities
- Adjust mode selection based on performance requirements

## API Reference

### ApexCapabilitiesManager

- `getInstance()`: Get the singleton instance
- `setMode(mode)`: Set the current server mode
- `getMode()`: Get the current server mode
- `getCapabilities()`: Get capabilities for the current mode
- `getCapabilitiesForMode(mode)`: Get capabilities for a specific mode
- `getAllCapabilities()`: Get all capability configurations
- `isCapabilityEnabled(capability)`: Check if a capability is enabled
- `isCapabilityEnabledForMode(mode, capability)`: Check if a capability is enabled for a mode

### LSPConfigurationManager

- `constructor(options)`: Create with configuration options
- `getCapabilities()`: Get capabilities with custom overrides
- `setMode(mode)`: Set the server mode
- `getMode()`: Get the current server mode
- `setCustomCapabilities(capabilities)`: Set custom capability overrides
- `clearCustomCapabilities()`: Clear custom overrides
- `getCapabilitiesForMode(mode)`: Get capabilities for a mode with overrides
- `isCapabilityEnabled(capability)`: Check if a capability is enabled

## Contributing

When adding new capabilities:

1. **Update All Modes**: Ensure the capability is defined for all three modes
2. **Consider Performance**: Evaluate the performance impact in each mode
3. **Add Tests**: Include tests for the new capability in all modes
4. **Update Documentation**: Document the new capability and its behavior
5. **Follow LSP Specification**: Ensure compliance with the LSP specification
