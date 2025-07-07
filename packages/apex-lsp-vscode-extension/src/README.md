# Apex Language Server Extension - Modular Architecture

This directory contains the refactored Apex Language Server extension with a modular architecture. The original large `extension.ts` file has been broken down into focused, single-responsibility modules.

## Module Structure

### Core Modules

- **`extension.ts`** - Main entry point with simplified activation/deactivation logic
- **`index.ts`** - Barrel export file for all modules
- **`types.ts`** - Type definitions and interfaces
- **`constants.ts`** - Configuration constants and enums

### Functional Modules

- **`logging.ts`** - Logging system management and output channel handling
- **`status-bar.ts`** - Status bar item creation and state management
- **`commands.ts`** - Command registration and execution logic
- **`configuration.ts`** - Workspace settings and configuration management
- **`server-config.ts`** - Server and client options creation
- **`error-handling.ts`** - Error handling, retry logic, and recovery
- **`language-server.ts`** - Core language server lifecycle management

## Module Responsibilities

### `extension.ts`

- Main extension entry point
- Orchestrates module initialization
- Handles activation and deactivation flow

### `types.ts`

- `ExtensionState` - Global state interface
- `WorkspaceSettings` - Configuration settings interface
- `DebugConfig` - Debug configuration interface

### `constants.ts`

- `EXTENSION_CONSTANTS` - Core extension constants
- `STATUS_BAR_TEXT` - Status bar display text
- `STATUS_BAR_TOOLTIPS` - Status bar tooltips
- `DEBUG_CONFIG` - Debug configuration constants

### `logging.ts`

- Output channel management
- Log level configuration
- Timestamped logging with message types

### `status-bar.ts`

- Status bar item lifecycle
- State-based status updates
- Visual feedback management

### `commands.ts`

- Command registration
- Restart logic coordination
- State management for retry logic

### `configuration.ts`

- Workspace settings retrieval
- Configuration change listeners
- Settings validation and defaults

### `server-config.ts`

- Server options creation
- Client options configuration
- Debug mode handling

### `error-handling.ts`

- Retry logic with exponential backoff
- Error recovery strategies
- User notification management

### `language-server.ts`

- Language client lifecycle
- Server start/stop/restart logic
- State change monitoring

## Benefits of Modular Architecture

1. **Single Responsibility** - Each module has a clear, focused purpose
2. **Maintainability** - Easier to locate and modify specific functionality
3. **Testability** - Individual modules can be tested in isolation
4. **Reusability** - Modules can be reused across different contexts
5. **Readability** - Smaller, focused files are easier to understand
6. **Collaboration** - Multiple developers can work on different modules simultaneously

## Usage

The main extension file (`extension.ts`) demonstrates how to use the modular components:

```typescript
import { initializeLogging } from './logging';
import { createStatusBarItem } from './status-bar';
import {
  initializeCommandState,
  registerRestartCommand,
  setRestartHandler,
} from './commands';
import {
  startLanguageServer,
  restartLanguageServer,
  stopLanguageServer,
} from './language-server';

export function activate(context: vscode.ExtensionContext): void {
  // Initialize modules in order
  initializeLogging(context);
  initializeCommandState(context);
  createStatusBarItem(context);

  // Set up restart handler
  setRestartHandler(restartLanguageServer);
  registerRestartCommand(context);

  // Start the language server
  startLanguageServer(context, restartLanguageServer);
}
```

## State Management

The extension uses a distributed state management approach where each module manages its own state while providing controlled access through exported functions. This prevents tight coupling while maintaining data consistency.

## Error Handling

Error handling is centralized in the `error-handling.ts` module, which provides:

- Consistent error logging
- Retry logic with exponential backoff
- User-friendly error messages
- Recovery strategies

## Configuration

Configuration management is handled by the `configuration.ts` module, which:

- Retrieves workspace settings
- Provides type-safe configuration access
- Handles configuration change events
- Manages default values

This modular approach makes the extension more maintainable, testable, and easier to extend with new features.
