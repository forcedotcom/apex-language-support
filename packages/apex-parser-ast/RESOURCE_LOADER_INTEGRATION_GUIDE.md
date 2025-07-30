# ResourceLoader Integration Guide

## Overview

The ResourceLoader has been enhanced to properly integrate with the ApexSymbolManager and the new Java-compatible namespace resolution system. This ensures that compiled standard Apex classes are available for accurate symbol resolution.

## Problem Solved

### Before Enhancement

The original ResourceLoader was compiling standard Apex classes but storing them in isolation:

- Compiled artifacts were stored in `compiledArtifacts` map
- Symbols were not available to the global symbol manager
- Namespace resolution couldn't access standard Apex classes
- No integration with the new namespace resolution system

### After Enhancement

The enhanced ResourceLoader now:

- Integrates compiled symbols with ApexSymbolManager
- Provides SymbolProvider implementation for namespace resolution
- Supports Java-compatible namespace resolution for standard Apex classes
- Maintains backward compatibility with existing code

## Key Enhancements

### 1. Symbol Manager Integration

```typescript
// NEW: ResourceLoader now integrates with ApexSymbolManager
const resourceLoader = ResourceLoader.getInstance({
  loadMode: 'full',
  integrateWithSymbolManager: true, // NEW OPTION
  symbolManager: existingSymbolManager, // NEW OPTION
});

await resourceLoader.initialize();

// Symbols are now available in the global symbol manager
const symbolManager = SymbolManagerFactory.createSymbolManager();
const systemSymbols = symbolManager.findSymbolByName('System');
```

### 2. SymbolProvider Implementation

The ResourceLoader now provides a complete SymbolProvider implementation:

```typescript
const symbolProvider = resourceLoader.createSymbolProvider();

// This provider can be used with the namespace resolution system
const result = NamespaceResolver.resolveTypeName(
  ['System', 'debug'],
  compilationContext,
  'METHOD',
  'STATIC',
  symbolProvider,
);
```

### 3. Enhanced Statistics and Monitoring

```typescript
const stats = resourceLoader.getStatistics();
console.log(`Total files: ${stats.totalFiles}`);
console.log(`Compiled files: ${stats.compiledFiles}`);
console.log(`Symbols added: ${stats.symbolsAdded}`);
console.log(`Symbol manager integration: ${stats.symbolManagerIntegration}`);
```

## Usage Examples

### Basic Usage

```typescript
import { ResourceLoader } from '@salesforce/apex-lsp-parser-ast';

// Create resource loader with symbol manager integration
const loader = ResourceLoader.getInstance({
  loadMode: 'full',
  integrateWithSymbolManager: true,
});

// Initialize and wait for compilation
await loader.initialize();
await loader.waitForCompilation();

// Symbols are now available in the global symbol manager
const symbolManager = loader.getSymbolManager();
const systemClass = symbolManager.findSymbolByName('System')[0];
```

### Advanced Usage with Namespace Resolution

```typescript
import {
  ResourceLoaderIntegration,
  createResourceLoaderIntegration,
} from '@salesforce/apex-lsp-parser-ast';

// Create integration utility
const integration = await createResourceLoaderIntegration({
  loadMode: 'full',
});

// Resolve symbols using Java compiler's namespace resolution
const stringResult = integration.resolveSymbolSimple(
  'String',
  'test.cls',
  undefined,
  'NONE',
);
console.log(
  `String resolution: ${stringResult.isResolved ? 'SUCCESS' : 'FAILED'}`,
);

const systemResult = integration.resolveSymbolSimple(
  'System',
  'test.cls',
  undefined,
  'NONE',
);
console.log(
  `System resolution: ${systemResult.isResolved ? 'SUCCESS' : 'FAILED'}`,
);

const systemDebugResult = integration.resolveSymbolSimple(
  'System.debug',
  'test.cls',
  undefined,
  'METHOD',
);
console.log(
  `System.debug resolution: ${systemDebugResult.isResolved ? 'SUCCESS' : 'FAILED'}`,
);

// Check symbol types
console.log(`String is built-in: ${integration.isBuiltInType('String')}`);
console.log(
  `System is standard class: ${integration.isStandardApexClass('System')}`,
);
```

### Integration with Existing Code

```typescript
// Existing code continues to work
const loader = ResourceLoader.getInstance();
await loader.initialize();

// Get compiled artifacts (existing functionality)
const artifact = loader.getCompiledArtifact('System.cls');
const allArtifacts = loader.getAllCompiledArtifacts();

// NEW: Get symbol manager (if integration enabled)
const symbolManager = loader.getSymbolManager();
if (symbolManager) {
  const symbols = symbolManager.findSymbolByName('System');
  console.log(`Found ${symbols.length} System symbols`);
}
```

## Configuration Options

### ResourceLoaderOptions

```typescript
interface ResourceLoaderOptions {
  loadMode?: 'lazy' | 'full'; // Existing
  integrateWithSymbolManager?: boolean; // NEW
  symbolManager?: ApexSymbolManager; // NEW
}
```

- **`loadMode`**: Controls when compilation happens ('lazy' or 'full')
- **`integrateWithSymbolManager`**: Enables/disables symbol manager integration (default: true)
- **`symbolManager`**: Use existing symbol manager instance instead of creating new one

### ResourceLoaderIntegration Options

```typescript
interface ResourceLoaderIntegrationOptions {
  loadMode?: 'lazy' | 'full';
  symbolManager?: ApexSymbolManager;
}
```

## Performance Impact

### Memory Usage

- **Before**: Compiled artifacts stored separately from symbol manager
- **After**: Symbols stored in unified symbol manager (more efficient)
- **Net Impact**: Slightly higher initial memory usage, but better overall efficiency

### Compilation Time

- **No Change**: Compilation time remains the same
- **Additional Step**: Symbol registration adds minimal overhead
- **Benefit**: Better symbol resolution performance after compilation

### Symbol Resolution Performance

- **Before**: Limited to basic name matching
- **After**: Full Java-compatible namespace resolution
- **Benefit**: More accurate and faster symbol resolution

## Migration Guide

### For Existing Code

1. **No Breaking Changes**: Existing code continues to work unchanged
2. **Optional Enhancement**: Enable symbol manager integration for better functionality
3. **Gradual Migration**: Can be enabled per instance

### For New Code

1. **Use Enhanced ResourceLoader**: Enable symbol manager integration
2. **Use ResourceLoaderIntegration**: For complete namespace resolution support
3. **Leverage SymbolProvider**: For custom namespace resolution needs

## Testing

### Unit Tests

```typescript
// Test symbol manager integration
const loader = ResourceLoader.getInstance({
  integrateWithSymbolManager: true,
});
await loader.initialize();

const symbolManager = loader.getSymbolManager();
expect(symbolManager).toBeDefined();
expect(symbolManager.findSymbolByName('System')).toHaveLength(1);
```

### Integration Tests

```typescript
// Test namespace resolution
const integration = await createResourceLoaderIntegration();
const result = integration.resolveSymbolSimple(
  'System.debug',
  'test.cls',
  undefined,
  'METHOD',
);
expect(result.isResolved).toBe(true);
expect(result.symbol).toBeDefined();
```

## Troubleshooting

### Common Issues

1. **Symbols Not Found**
   - Ensure `integrateWithSymbolManager: true`
   - Wait for compilation to complete with `await loader.waitForCompilation()`
   - Check statistics with `loader.getStatistics()`

2. **Performance Issues**
   - Use 'lazy' load mode for large codebases
   - Consider using existing symbol manager instance
   - Monitor memory usage with `symbolManager.getMemoryUsage()`

3. **Namespace Resolution Failures**
   - Verify built-in type tables are loaded
   - Check compilation context is properly configured
   - Use `integration.isBuiltInType()` to verify symbol availability

### Debug Information

```typescript
// Get detailed statistics
const stats = integration.getStatistics();
console.log('ResourceLoader Stats:', stats.resourceLoader);
console.log('SymbolManager Stats:', stats.symbolManager);
console.log('Total Symbols:', stats.totalSymbols);

// Check symbol availability
const systemSymbols = integration.findSymbolByName('System');
console.log('System symbols:', systemSymbols.length);

// Test namespace resolution
const result = integration.resolveSymbolSimple('String', 'test.cls');
console.log('Resolution result:', result);
```

## Future Enhancements

### Planned Features

1. **Lazy Symbol Loading**: Load symbols on-demand for better memory usage
2. **Incremental Updates**: Update only changed symbols instead of full recompilation
3. **Symbol Dependencies**: Track and resolve symbol dependencies automatically
4. **Performance Profiling**: Built-in performance monitoring and optimization

### Integration Points

1. **LSP Services**: Direct integration with completion, hover, and definition services
2. **IDE Extensions**: Enhanced IntelliSense and code navigation
3. **Build Tools**: Integration with Apex build and deployment tools
4. **Testing Frameworks**: Support for test-aware symbol resolution

## Conclusion

The enhanced ResourceLoader provides a complete solution for loading standard Apex classes and integrating them with the namespace resolution system. This ensures accurate symbol resolution that matches the Java compiler's behavior while maintaining backward compatibility and providing excellent performance.

The integration is designed to be:

- **Non-breaking**: Existing code continues to work
- **Optional**: Can be enabled per instance
- **Performant**: Minimal overhead with significant benefits
- **Extensible**: Ready for future enhancements
