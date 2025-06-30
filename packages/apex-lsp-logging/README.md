# Apex LSP Logging (`@salesforce/apex-lsp-logging`)

This package provides a unified logging system for the Apex Language Server ecosystem, supporting both LSP-based logging and standalone console logging.

## Features

- **LSP Integration**: Seamless integration with Language Server Protocol logging
- **Standalone Console Logging**: Console-based logging for standalone applications
- **Timestamp Support**: Automatic timestamp formatting for all log messages
- **Lazy Evaluation**: Support for lazy message evaluation to improve performance
- **Multiple Log Levels**: Debug, Info, Warning, Error, and custom log levels
- **Type Safety**: Full TypeScript support with proper typing

## Installation

```bash
npm install @salesforce/apex-lsp-logging
```

## Usage

### LSP Context (Default)

When used within a Language Server, the package automatically integrates with the LSP logging system:

```typescript
import { getLogger } from '@salesforce/apex-lsp-logging';

const logger = getLogger();
logger.info('Language server started');
logger.debug('Processing document');
logger.error('Compilation error occurred');
```

### Standalone Console Logging

For standalone applications or when running outside of an LSP context:

```typescript
import { enableConsoleLogging, getLogger } from '@salesforce/apex-lsp-logging';

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
import { disableLogging } from '@salesforce/apex-lsp-logging';

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
type LogMessageType = 'Error' | 'Warning' | 'Info' | 'Log' | 'Debug';
```

## Examples

See the `examples/` directory for complete usage examples:

- `standalone-usage.ts` - Demonstrates standalone console logging with the Apex parser

## Integration with Apex Parser

This package is designed to work seamlessly with the Apex parser:

```typescript
import { enableConsoleLogging } from '@salesforce/apex-lsp-logging';
import {
  CompilerService,
  ApexSymbolCollectorListener,
} from '@salesforce/apex-parser-ast';

// Enable logging
enableConsoleLogging();

// Use the parser with automatic logging
const compiler = new CompilerService();
const listener = new ApexSymbolCollectorListener();
const result = compiler.compile(apexCode, 'test.cls', listener);
```

## License

BSD-3-Clause
