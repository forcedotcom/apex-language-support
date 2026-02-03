# Apex LSP Shared (`@salesforce/apex-lsp-shared`)

This package provides shared utilities for the Apex Language Server ecosystem, including logging, priority definitions, capabilities management, settings management, and custom LSP protocol extensions.

## Features

- **Priority System**: Five-level priority system for queue-based request scheduling
- **Logging System**: Unified logging with LSP integration and standalone console support
- **Memory-Efficient Enums**: Type-safe, bidirectional enum replacement with Zod validation
- **Capabilities Management**: Platform-agnostic server capabilities with mode-based optimization
- **Settings Management**: Configuration management for language server settings
- **Custom LSP Protocol**: Extensions for artifact resolution and workspace loading
- **Type Safety**: Full TypeScript support with proper typing across all utilities

## Installation

```bash
npm install @salesforce/apex-lsp-shared
```

## Usage

### Priority System

The package provides a five-level priority system used by the LSP queue for request scheduling:

```typescript
import { Priority, AllPriorities } from '@salesforce/apex-lsp-shared';

// Priority levels (1 = highest, 5 = lowest)
Priority.Immediate; // 1 - Critical tasks that must execute immediately
Priority.High; // 2 - High-priority tasks (e.g., user-facing requests)
Priority.Normal; // 3 - Standard priority tasks (default for most requests)
Priority.Low; // 4 - Low-priority tasks (e.g., background analysis)
Priority.Background; // 5 - Background tasks (e.g., cleanup, maintenance)

// Get all priority values in order
console.log(AllPriorities);
// [Priority.Immediate, Priority.High, Priority.Normal, Priority.Low, Priority.Background]
```

#### Usage in Queue System

The priority system integrates with `LSPQueueManager` for request scheduling:

```typescript
// Submit a request with specific priority
await queueManager.submitRequest('diagnostics', params, {
  priority: Priority.Normal,
});

// High-priority request for immediate user feedback
await queueManager.submitRequest('hover', params, {
  priority: Priority.Immediate,
});

// Low-priority background indexing
await queueManager.submitNotification('documentChange', params, {
  priority: Priority.Low,
});
```

#### Priority Assignment Guidelines

| Priority     | Use Case                  | Examples                                  |
| ------------ | ------------------------- | ----------------------------------------- |
| `Immediate`  | User-triggered, blocks UI | Hover, completion, signature help         |
| `High`       | User-facing, high impact  | Document open/save, diagnostics (pull)    |
| `Normal`     | Standard operations       | Document change, background compilation   |
| `Low`        | Deferred work             | Background indexing, reference processing |
| `Background` | Maintenance tasks         | Cache cleanup, statistics collection      |

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

### Priority

#### `Priority` (enum)

Five-level priority system for task scheduling:

- `Priority.Immediate = 1`: Critical tasks
- `Priority.High = 2`: High-priority tasks
- `Priority.Normal = 3`: Standard priority
- `Priority.Low = 4`: Low-priority tasks
- `Priority.Background = 5`: Background tasks

#### `AllPriorities` (constant)

Readonly array of all priority values in order from highest to lowest.

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

## Additional Features

### Capabilities Management

The package provides platform-agnostic capabilities management:

```typescript
import {
  ApexCapabilitiesManager,
  LSPConfigurationManager,
} from '@salesforce/apex-lsp-shared';

// Get capabilities manager
const manager = ApexCapabilitiesManager.getInstance();

// Set server mode
manager.setMode('development'); // or 'production', 'test'

// Get capabilities for current mode
const capabilities = manager.getCapabilities();
```

### Settings Management

Unified settings management for language server configuration:

```typescript
import {
  ApexSettingsManager,
  generateStartupSummary,
} from '@salesforce/apex-lsp-shared';

// Get settings manager
const settings = ApexSettingsManager.getInstance();

// Update settings
settings.updateSettings({
  commentCollection: { enableCommentCollection: true },
  performance: { documentChangeDebounceMs: 300 },
});

// Generate configuration summary
const summary = generateStartupSummary(settings);
console.log(summary);
```

### Custom LSP Protocol Extensions

The package defines custom LSP protocol extensions:

#### Missing Artifact Resolution

```typescript
import type {
  FindMissingArtifactParams,
  FindMissingArtifactResult,
} from '@salesforce/apex-lsp-shared';

// Request to find and load missing type definitions
const params: FindMissingArtifactParams = {
  identifier: 'MyCustomClass',
  origin: {
    uri: 'file:///workspace/MyFile.cls',
    requestKind: 'definition',
  },
  mode: 'blocking',
};

// Result from client
const result: FindMissingArtifactResult = {
  opened: ['file:///workspace/MyCustomClass.cls'],
};
```

#### Workspace Loading

```typescript
import type {
  RequestWorkspaceLoadParams,
  WorkspaceLoadCompleteParams,
} from '@salesforce/apex-lsp-shared';

// Server requests workspace load
const request: RequestWorkspaceLoadParams = {
  workDoneToken: 'workspace-load-123',
};

// Client notifies completion
const completion: WorkspaceLoadCompleteParams = {
  success: true,
};
```

## Examples

See the `examples/`
