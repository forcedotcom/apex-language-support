# Apex LSP Shared (`@salesforce/apex-lsp-shared`)

This package provides shared utilities for the Apex Language Server ecosystem, including a unified logging system that supports both LSP-based logging and standalone console logging, and a memory-efficient enum replacement utility.

## Features

- **LSP Integration**: Seamless integration with Language Server Protocol logging
- **Standalone Console Logging**: Console-based logging for standalone applications
- **Memory-Efficient Enums**: Type-safe, bidirectional enum replacement with Zod validation
- **Timestamp Support**: Automatic timestamp formatting for all log messages
- **Lazy Evaluation**: Support for lazy message evaluation to improve performance
- **Multiple Log Levels**: Debug, Info, Warning, Error, and custom log levels
- **Type Safety**: Full TypeScript support with proper typing

## Installation

```bash
npm install @salesforce/apex-lsp-shared
```

## Usage

### Memory-Efficient Enums

The `defineEnum` utility provides a memory-efficient alternative to traditional TypeScript enums with bidirectional mapping and Zod validation:

```typescript
import { defineEnum } from '@salesforce/apex-lsp-shared';

// Basic enum with custom values
const Status = defineEnum([
  ['Active', 1],
  ['Inactive', 0],
  ['Pending', 2],
] as const);

// Bidirectional mapping
console.log(Status.Active); // 1
console.log(Status[1]); // 'Active'

// Enum with default values (array indices)
const Colors = defineEnum([['Red'], ['Green'], ['Blue']] as const);

console.log(Colors.Red); // 0
console.log(Colors[0]); // 'Red'

// Mixed custom and default values
const Priority = defineEnum([
  ['Low', 1],
  ['Medium'], // defaults to 2 since 1 is taken
  ['High', 10],
  ['Critical'], // defaults to 3
] as const);
```

#### Validation and Type Safety

```typescript
import {
  defineEnum,
  isValidEnumKey,
  isValidEnumValue,
} from '@salesforce/apex-lsp-shared';

const Status = defineEnum([
  ['Active', 1],
  ['Inactive', 0],
] as const);

// Runtime validation
isValidEnumKey(Status, 'Active'); // true
isValidEnumKey(Status, 'Invalid'); // false
isValidEnumValue(Status, 1); // true
isValidEnumValue(Status, 999); // false

// Zod validation schemas
Status.keySchema.parse('Active'); // ✅ Valid
Status.keySchema.parse('Invalid'); // ❌ Throws error
Status.valueSchema.parse(1); // ✅ Valid
Status.valueSchema.parse(999); // ❌ Throws error
```

#### Utility Functions

```typescript
import {
  getEnumKeys,
  getEnumValues,
  getEnumEntries,
} from '@salesforce/apex-lsp-shared';

const Status = defineEnum([
  ['Active', 1],
  ['Inactive', 0],
  ['Pending', 2],
] as const);

getEnumKeys(Status); // ['Active', 'Inactive', 'Pending']
getEnumValues(Status); // [1, 0, 2]
getEnumEntries(Status); // [['Active', 1], ['Inactive', 0], ['Pending', 2]]
```

#### Memory Efficiency Benefits

- **50-75% memory reduction** compared to traditional string enums
- **Bidirectional mapping** without additional storage overhead
- **Frozen objects** prevent accidental modifications
- **Zod validation** built-in for runtime type safety
- **TypeScript support** with full type inference

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

### Enum Utilities

#### `defineEnum<T>(entries: T)`

Creates a memory-efficient, type-safe enum with bidirectional mapping.

**Parameters:**

- `entries`: Array of `[key, value?]` tuples where `value` defaults to array index

**Returns:** Frozen object with bidirectional mapping and Zod validation schemas

#### `isValidEnumKey<T>(enumObj: T, key: unknown)`

Checks if a value is a valid enum key with type narrowing.

#### `isValidEnumValue<T>(enumObj: T, value: unknown)`

Checks if a value is a valid enum value with type narrowing.

#### `getEnumKeys<T>(enumObj: T)`

Returns all enum keys as an array.

#### `getEnumValues<T>(enumObj: T)`

Returns all enum values as an array (duplicates removed).

#### `getEnumEntries<T>(enumObj: T)`

Returns all enum entries as `[key, value]` pairs.

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
