# Namespace Resolution System

This directory contains the namespace resolution system for the Apex Language Server, which handles both immediate and deferred namespace resolution during compilation.

## Overview

The namespace resolution system operates in two phases:

1. **Phase 1: Immediate Resolution** - During symbol creation in the listener
2. **Phase 2: Deferred Resolution** - Post-compilation with full symbol graph

## Components

### NamespaceResolutionService

The `NamespaceResolutionService` handles deferred namespace resolution for complex references that cannot be resolved immediately during parsing.

#### Key Features

- **Type Reference Resolution**: Resolves type references in variable declarations and parameters
- **Qualified Name Support**: Handles both simple and qualified (dot-separated) type names
- **Error Handling**: Gracefully handles null inputs and unresolved references
- **Performance Optimized**: Efficiently processes large symbol tables
- **Extensible Design**: Prepared for future expression-level resolution

#### Usage

```typescript
import { NamespaceResolutionService } from './NamespaceResolutionService';
import { SymbolTable } from '../types/symbol';
import { CompilationContext, SymbolProvider } from './NamespaceUtils';

// Create the service
const namespaceResolutionService = new NamespaceResolutionService();

// Resolve deferred references
namespaceResolutionService.resolveDeferredReferences(
  symbolTable,
  compilationContext,
  symbolProvider,
);
```

#### API Reference

##### `resolveDeferredReferences(symbolTable, compilationContext, symbolProvider)`

Resolves all deferred references in a symbol table.

**Parameters:**

- `symbolTable: SymbolTable` - The symbol table containing symbols to resolve
- `compilationContext: CompilationContext` - The compilation context with namespace information
- `symbolProvider: SymbolProvider` - Provider for symbol lookup during resolution

**Returns:** `void`

#### Integration with Compilation Pipeline

The `NamespaceResolutionService` is designed to be integrated into the compilation pipeline after the initial symbol collection phase:

```typescript
// Phase 1: Immediate resolution during symbol collection
const listener = new ApexSymbolCollectorListener();
listener.setProjectNamespace('MyNamespace');
compilerService.compile(sourceCode, fileName, listener, options);

// Phase 2: Deferred resolution
const symbolTable = listener.getResult();
const compilationContext = createCompilationContext('MyNamespace');
const symbolProvider = createSymbolProvider();

namespaceResolutionService.resolveDeferredReferences(
  symbolTable,
  compilationContext,
  symbolProvider,
);
```

### NamespaceUtils

Contains utility functions and types for namespace resolution:

- **Namespace class**: Represents Apex namespaces
- **CompilationContext**: Context information for resolution
- **SymbolProvider**: Interface for symbol lookup
- **resolveTypeName()**: Core resolution function

### ResolutionRules

Contains resolution rules that define how different types of references are resolved:

- **Built-in types**: String, Integer, etc.
- **System types**: System.List, System.Datetime, etc.
- **SObject types**: Account, Contact, etc.
- **User-defined types**: Classes, interfaces, enums

## Testing

The namespace resolution system includes comprehensive test coverage:

### Unit Tests

- `NamespaceResolutionService.test.ts` - Tests for the service class
- `SymbolFactory.namespace.test.ts` - Tests for namespace-aware symbol creation

### Integration Tests

- `NamespaceResolution.integration.test.ts` - End-to-end compilation tests
- `ApexSymbolCollectorListener.namespace.test.ts` - Listener integration tests

### Performance Tests

- Large symbol table processing (1000+ symbols)
- Execution time validation (< 1 second for large tables)

## Future Enhancements

### Expression Resolution

The system is prepared for future expression-level resolution:

```typescript
// Placeholder for future implementation
private resolveExpressionReferences(
  symbolTable: SymbolTable,
  compilationContext: CompilationContext,
  symbolProvider: SymbolProvider,
): void {
  // TODO: Implement method call and field access resolution
}
```

### Cross-File Resolution

Future versions will support cross-file namespace resolution:

- Multi-file compilation contexts
- Symbol graph integration
- Dependency resolution

### Advanced Features

- Namespace aliases and imports
- Dynamic resolution
- Caching and optimization

## Performance Considerations

1. **Immediate Resolution**: Only resolve namespaces that can be determined immediately during parsing
2. **Deferred Resolution**: Batch complex resolutions to avoid parsing performance impact
3. **Caching**: Cache resolved namespaces to avoid repeated resolution
4. **Lazy Loading**: Only resolve namespaces when needed for specific operations

## Error Handling

The system includes robust error handling:

- **Null Safety**: Gracefully handles null/undefined inputs
- **Unresolved References**: Continues processing even when references cannot be resolved
- **Malformed Input**: Handles edge cases like empty type names and special characters
- **Logging**: Comprehensive debug logging for troubleshooting

## Examples

### Basic Usage

```typescript
// Create a symbol table with type references
const symbolTable = new SymbolTable();
const variableSymbol = SymbolFactory.createFullSymbol(
  'testVar',
  SymbolKind.Variable,
  location,
  'test.cls',
  modifiers,
  null,
  {
    type: {
      name: 'System.List<String>',
      isArray: false,
      isGeneric: true,
    },
  },
);
symbolTable.addSymbol(variableSymbol);

// Resolve the type reference
const compilationContext = createCompilationContext('MyNamespace');
const symbolProvider = createSymbolProvider();
const mockResolvedSymbol = createMockSymbol('List', SymbolKind.Class);
symbolProvider.findBuiltInType.mockReturnValue(mockResolvedSymbol);

namespaceResolutionService.resolveDeferredReferences(
  symbolTable,
  compilationContext,
  symbolProvider,
);

// Verify resolution
const symbols = symbolTable.getAllSymbols();
const resolvedVariable = symbols.find((s) => s.name === 'testVar');
expect(resolvedVariable?._typeData?.type?.resolvedSymbol).toBe(
  mockResolvedSymbol,
);
```

### Complex Scenarios

```typescript
// Handle qualified type names
const qualifiedType = {
  name: 'MyNamespace.MyClass',
  isArray: false,
  isGeneric: false,
};

// Handle generic types
const genericType = {
  name: 'List<String>',
  isArray: false,
  isGeneric: true,
  genericTypes: ['String'],
};

// Handle special characters
const specialType = {
  name: 'System.List<String>',
  isArray: false,
  isGeneric: true,
  genericTypes: ['String'],
};
```

## Contributing

When contributing to the namespace resolution system:

1. **Follow TDD**: Write tests first, then implement functionality
2. **Maintain Performance**: Ensure new features don't impact parsing performance
3. **Add Tests**: Include unit tests, integration tests, and performance tests
4. **Update Documentation**: Keep this README and implementation plan current
5. **Follow Patterns**: Use existing patterns for error handling and logging
