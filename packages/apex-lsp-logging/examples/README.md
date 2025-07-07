# Apex LSP Logging Examples

This directory contains examples of how to use the Apex LSP Logging package in different contexts.

## Standalone Usage

The `standalone-usage.ts` example demonstrates how to use the Apex parser with console logging when running outside of a Language Server context.

### Running the Example

```bash
# From the package root
npm run compile
node out/examples/standalone-usage.js
```

### Key Features Demonstrated

- **Console Logging Setup**: Shows how to enable console logging with timestamps
- **Parser Integration**: Demonstrates using the Apex parser with logging
- **Error Handling**: Shows how errors and warnings are logged
- **Symbol Collection**: Illustrates logging during symbol table construction

### Output Example

```
[2025-01-27T10:30:15.123Z] [INFO] Starting standalone Apex parser example
[2025-01-27T10:30:15.124Z] [INFO] Creating compiler service
[2025-01-27T10:30:15.125Z] [INFO] Creating symbol collector listener
[2025-01-27T10:30:15.126Z] [INFO] Compiling Apex code
[2025-01-27T10:30:15.127Z] [DEBUG] Starting compilation of ExampleClass.cls
[2025-01-27T10:30:15.128Z] [INFO] Compilation successful
[2025-01-27T10:30:15.129Z] [INFO] Found 3 symbols
[2025-01-27T10:30:15.130Z] [DEBUG] Found symbol: ExampleClass (Class)
[2025-01-27T10:30:15.131Z] [DEBUG] Found symbol: name (Variable)
[2025-01-27T10:30:15.132Z] [DEBUG] Found symbol: getName (Method)
[2025-01-27T10:30:15.133Z] [INFO] Standalone example completed
```

## Usage in Your Own Code

To enable console logging in your standalone application:

```typescript
import { enableConsoleLogging, getLogger } from '@salesforce/apex-lsp-logging';

// Enable console logging with timestamps
enableConsoleLogging();

// Use the logger
const logger = getLogger();
logger.info('Your application is starting');
logger.debug('Debug information');
logger.warn('Warning message');
logger.error('Error message');
```

To disable logging (for production):

```typescript
import { disableLogging } from '@salesforce/apex-lsp-logging';

// Disable all logging
disableLogging();
```

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

## Log Levels

The console logger supports all standard log levels:

- **DEBUG**: Detailed debugging information
- **INFO**: General information about program execution
- **WARN**: Warning messages for potentially harmful situations
- **ERROR**: Error messages for error conditions
- **LOG**: General log messages (equivalent to INFO)

Each log message includes:

- ISO timestamp for precise timing
- Log level indicator
- The actual message content
