# MultiVolumeFileSystem

A thin wrapper around memfs that provides multi-volume support with URI-based file paths and protocol-based volume assignment.

## Features

- **Multi-volume support**: Each volume is assigned to a specific URI protocol
- **URI-based file paths**: Use paths like `apex://System/System.cls` for clear separation
- **Protocol-based routing**: Automatic routing to the correct volume based on URI protocol
- **Read-only volume support**: Protect volumes from modification
- **Root path configuration**: Customize internal storage paths for each volume
- **Cross-volume operation protection**: Prevent operations across different protocols
- **Volume management**: Export, import, reset, and statistics for volumes

## Basic Usage

```typescript
import {
  MultiVolumeFileSystem,
  VolumeConfig,
} from '@salesforce/apex-parser-ast';

// Create a new multi-volume file system
const fs = new MultiVolumeFileSystem();

// Register volumes for different protocols
fs.registerVolume('apex', { protocol: 'apex', rootPath: '/apex' });
fs.registerVolume('metadata', { protocol: 'metadata', rootPath: '/metadata' });
fs.registerVolume('temp', { protocol: 'temp', readOnly: false });

// Use URI-based paths
fs.writeFile('apex://System/System.cls', 'public class System {}');
fs.writeFile('metadata://package.xml', '<?xml version="1.0"?><Package/>');
fs.writeFile('temp://build.log', 'Build started...');

// Read files
const apexContent = fs.readFile('apex://System/System.cls');
const metadataContent = fs.readFile('metadata://package.xml');

// List directory contents
const apexFiles = fs.readdir('apex://');
const metadataFiles = fs.readdir('metadata://');
```

## Volume Configuration

Each volume can be configured with the following options:

```typescript
interface VolumeConfig {
  protocol: string; // The URI protocol (e.g., 'apex', 'metadata')
  rootPath?: string; // Optional root path for internal storage
  readOnly?: boolean; // Whether the volume is read-only (default: false)
}
```

### Protocol

The protocol determines the URI scheme used to access files in that volume. For example:

- `apex://` for Apex source code
- `metadata://` for Salesforce metadata files
- `temp://` for temporary build artifacts

### Root Path

The root path is prepended to all file paths within the volume for internal storage. This allows you to organize files within the memfs volume structure.

### Read-Only

Read-only volumes prevent any write operations (writeFile, mkdir, unlink, etc.) while still allowing read operations.

## File Operations

The MultiVolumeFileSystem implements a standard file system interface:

### Basic Operations

```typescript
// Check if file exists
const exists = fs.exists('apex://System/System.cls');

// Read file content
const content = fs.readFile('apex://System/System.cls', 'utf8');

// Write file content
fs.writeFile('apex://System/System.cls', 'public class System {}');

// Create directory
fs.mkdir('apex://System/Utils', { recursive: true });

// List directory contents
const files = fs.readdir('apex://System');

// Get file stats
const stats = fs.stat('apex://System/System.cls');
```

### File Management

```typescript
// Delete file
fs.unlink('apex://System/System.cls');

// Remove directory
fs.rmdir('apex://System/Utils');

// Rename file (within same volume)
fs.rename('apex://System/System.cls', 'apex://System/SystemClass.cls');

// Copy file (within same volume)
fs.copyFile('apex://System/System.cls', 'apex://System/SystemBackup.cls');
```

## Volume Management

### Registration and Unregistration

```typescript
// Register a new volume
fs.registerVolume('custom', { protocol: 'custom', rootPath: '/custom' });

// Unregister a volume (cannot unregister default 'file' volume)
fs.unregisterVolume('custom');

// Get all registered protocols
const protocols = fs.getRegisteredProtocols();

// Get volume configuration
const config = fs.getVolumeConfig('apex');
```

### Export and Import

```typescript
// Export specific volume to JSON
const apexExport = fs.exportToJSON('apex');

// Export all volumes
const allExports = fs.exportToJSON();

// Import volume from JSON
fs.importFromJSON(apexExport.apex, 'apex');
```

### Reset and Statistics

```typescript
// Reset specific volume
fs.reset('apex');

// Reset all volumes
fs.reset();

// Get statistics for all volumes
const stats = fs.getStatistics();
// Returns: { apex: { files: 5, size: 1024 }, metadata: { files: 2, size: 512 } }
```

## Integration with ResourceLoader

The MultiVolumeFileSystem can be integrated with the existing ResourceLoader to provide a unified file system interface:

```typescript
import { MultiVolumeFileSystem } from '@salesforce/apex-parser-ast';
import { ResourceLoader } from '@salesforce/apex-parser-ast';

const fs = new MultiVolumeFileSystem();
const resourceLoader = ResourceLoader.getInstance();

// Register a volume for standard library
fs.registerVolume('stdlib', { protocol: 'stdlib', readOnly: true });

// Load standard library from ResourceLoader into stdlib volume
const availableClasses = resourceLoader.getAvailableClasses();
for (const className of availableClasses) {
  const content = await resourceLoader.getFile(className);
  if (content) {
    fs.writeFile(`stdlib://${className}`, content);
  }
}

// Now you can access standard library classes via URI
const systemContent = fs.readFile('stdlib://System/System.cls');
```

## Error Handling

The MultiVolumeFileSystem provides comprehensive error handling:

### Read-Only Volume Protection

```typescript
fs.registerVolume('readonly', { protocol: 'readonly', readOnly: true });

// This will throw an error
try {
  fs.writeFile('readonly://file.txt', 'content');
} catch (error) {
  console.log(error.message); // "Volume for protocol 'readonly' is read-only"
}
```

### Cross-Volume Operation Protection

```typescript
// These operations will throw errors
try {
  fs.rename('apex://file.cls', 'metadata://file.cls');
} catch (error) {
  console.log(error.message); // "Cannot rename across different protocols"
}

try {
  fs.copyFile('apex://file.cls', 'metadata://file.cls');
} catch (error) {
  console.log(error.message); // "Cannot copy across different protocols"
}
```

### Non-existent File Handling

```typescript
// Check existence before operations
if (fs.exists('apex://nonexistent.cls')) {
  const content = fs.readFile('apex://nonexistent.cls');
}

// Or handle exceptions
try {
  const content = fs.readFile('apex://nonexistent.cls');
} catch (error) {
  console.log('File not found:', error.message);
}
```

## Best Practices

### Volume Organization

- Use descriptive protocol names that reflect the content type
- Group related files in the same volume
- Use read-only volumes for immutable content (like standard libraries)

### Path Management

- Use consistent path separators (forward slashes)
- Avoid special characters in file names
- Use descriptive directory structures

### Performance

- The MultiVolumeFileSystem is built on memfs, so all operations are in-memory
- Large numbers of files may impact memory usage
- Consider resetting volumes when no longer needed

### Integration Patterns

- Use the default 'file' protocol for general-purpose files
- Reserve specific protocols for domain-specific content
- Leverage root paths for internal organization

## Example Use Cases

### Apex Development Environment

```typescript
const fs = new MultiVolumeFileSystem();

// Set up volumes for different content types
fs.registerVolume('apex', { protocol: 'apex', rootPath: '/apex' });
fs.registerVolume('metadata', { protocol: 'metadata', rootPath: '/metadata' });
fs.registerVolume('temp', { protocol: 'temp', rootPath: '/temp' });
fs.registerVolume('stdlib', { protocol: 'stdlib', readOnly: true });

// Work with Apex classes
fs.writeFile('apex://AccountService.cls', 'public class AccountService {}');
fs.writeFile('apex://ContactService.cls', 'public class ContactService {}');

// Work with metadata
fs.writeFile('metadata://package.xml', '<?xml version="1.0"?><Package/>');
fs.writeFile(
  'metadata://destructiveChanges.xml',
  '<?xml version="1.0"?><Package/>',
);

// Work with temporary files
fs.writeFile('temp://build.log', 'Build started...');
fs.writeFile('temp://coverage.json', '{"coverage": 85}');
```

### Multi-Project Management

```typescript
const fs = new MultiVolumeFileSystem();

// Register volumes for different projects
fs.registerVolume('project-a', {
  protocol: 'project-a',
  rootPath: '/projects/a',
});
fs.registerVolume('project-b', {
  protocol: 'project-b',
  rootPath: '/projects/b',
});

// Work with Project A
fs.writeFile(
  'project-a://src/AccountService.cls',
  'public class AccountService {}',
);
fs.writeFile(
  'project-a://config/sfdx-project.json',
  '{"packageDirectories": []}',
);

// Work with Project B
fs.writeFile(
  'project-b://src/ContactService.cls',
  'public class ContactService {}',
);
fs.writeFile(
  'project-b://config/sfdx-project.json',
  '{"packageDirectories": []}',
);

// Export project data
const projectAExport = fs.exportToJSON('project-a');
const projectBExport = fs.exportToJSON('project-b');
```

## API Reference

### Constructor

```typescript
new MultiVolumeFileSystem();
```

### Volume Management Methods

- `registerVolume(protocol: string, config: VolumeConfig): void`
- `unregisterVolume(protocol: string): void`
- `getVolume(protocol: string): Volume`
- `getRegisteredProtocols(): string[]`
- `getVolumeConfig(protocol: string): VolumeConfig | undefined`

### File Operations

- `exists(path: string): boolean`
- `readFile(path: string, encoding?: string): string | Buffer`
- `writeFile(path: string, data: string | Buffer): void`
- `mkdir(path: string, options?: { recursive?: boolean }): void`
- `readdir(path: string): string[]`
- `stat(path: string): any`
- `unlink(path: string): void`
- `rmdir(path: string): void`
- `rename(oldPath: string, newPath: string): void`
- `copyFile(src: string, dest: string): void`

### Volume Operations

- `exportToJSON(protocol?: string): Record<string, any>`
- `importFromJSON(data: Record<string, any>, protocol: string): void`
- `reset(protocol?: string): void`
- `getStatistics(): Record<string, { files: number; size: number }>`
