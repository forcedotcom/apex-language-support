# Apex LSP Shared (`@salesforce/apex-lsp-shared`)

This package provides shared utilities for the Apex Language Server ecosystem, including a unified logging system that supports both LSP-based logging and standalone console logging.

## Features

- **LSP Integration**: Seamless integration with Language Server Protocol logging
- **Standalone Console Logging**: Console-based logging for standalone applications
- **Timestamp Support**: Automatic timestamp formatting for all log messages
- **Lazy Evaluation**: Support for lazy message evaluation to improve performance
- **Multiple Log Levels**: Debug, Info, Warning, Error, and custom log levels
- **Type Safety**: Full TypeScript support with proper typing

## Installation

```bash
npm install @salesforce/apex-lsp-shared
```

## Usage

### LSP Context (Default)

When used within a Language Server, the package automatically integrates with the LSP logging system:

```typescript
import { getLogger } from '@salesforce/apex-lsp-shared';

const logger = getLogger();
logger.info('Language server started');
logger.debug('Processing document');
logger.error('Compilation error occurred');
```

### Standalone Console Logging

For standalone applications or when running outside of an LSP context:

```typescript
import { enableConsoleLogging, getLogger } from '@salesforce/apex-lsp-shared';

// Enable console logging with timestamps
enableConsoleLogging();

const logger = getLogger();
logger.info('Application started');
logger.debug('Debug information');
logger.warn('Warning message');
logger.error('Error message');
```

### Disabling Logging

To disable all logging (useful for production environments):

```typescript
import { disableLogging } from '@salesforce/apex-lsp-shared';

// Disable all logging
disableLogging();
```

## API Reference

### Core Functions

#### `getLogger()`

Returns the current logger instance.

#### `setLoggerFactory(factory: LoggerFactory)`

Sets a custom logger factory.

#### `getLoggerFactory()`

Returns the current logger factory.

#### `enableConsoleLogging()`

Enables console-based logging with timestamps for standalone usage.

#### `disableLogging()`

Disables all logging by setting the no-op logger.

### Logger Interface

The logger provides the following methods:

```typescript
interface LoggerInterface {
  log(messageType: LogMessageType, message: string | (() => string)): void;
  debug(message: string | (() => string)): void;
  info(message: string | (() => string)): void;
  warn(message: string | (() => string)): void;
  error(message: string | (() => string)): void;
}
```

### Log Message Types

```typescript
type LogMessageType = 'error' | 'warning' | 'info' | 'log' | 'debug';
```

## Examples

See the `examples/`
