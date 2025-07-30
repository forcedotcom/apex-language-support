# FQN Bug Fix Documentation

## Problem Description

The cross-file hover tests were pointing to a potential bug in the symbol manager/graph code. The fact that hover detected missing FQNs (Fully Qualified Names) indicated there was a gap in recording FQNs when symbols were first parsed and added to the system.

### Root Cause Analysis

1. **FQNs were not calculated during symbol creation**: In the `ApexSymbolCollectorListener`, when symbols were created using `SymbolFactory.createFullSymbol()`, the FQN parameter was always passed as `undefined`.

2. **FQN index was only populated if FQN already existed**: In `ApexSymbolGraph.addSymbol()`, the FQN was only added to the index if it already existed:

   ```typescript
   if (symbol.fqn) {
     this.fqnIndex.set(symbol.fqn, symbolId);
   }
   ```

3. **FQN calculation happened too late**: The FQN was only calculated when needed (like in hover requests) using `calculateFQN()`, but this calculated FQN was never stored back to the symbol or indexed.

### Impact

This bug caused:

- FQN index to remain empty after initial parsing
- Hover requests to fail when trying to resolve symbols by FQN
- Cross-file symbol resolution to be unreliable
- Inconsistent behavior between first parse and subsequent operations

## Solution

### Changes Made

#### 1. ApexSymbolGraph.addSymbol() Enhancement

**File**: `packages/apex-parser-ast/src/symbols/ApexSymbolGraph.ts`

Added FQN calculation and storage when symbols are first added:

```typescript
// BUG FIX: Calculate and store FQN if not already present
if (!symbol.fqn) {
  symbol.fqn = calculateFQN(symbol);
  this.logger.debug(() => `Calculated FQN for ${symbol.name}: ${symbol.fqn}`);
}

if (symbol.fqn) {
  this.fqnIndex.set(symbol.fqn, symbolId);
}
```

#### 2. ApexSymbolManager.addSymbol() Enhancement

**File**: `packages/apex-parser-ast/src/symbols/ApexSymbolManager.ts`

Added the same FQN calculation logic to ensure consistency:

```typescript
// BUG FIX: Calculate and store FQN if not already present
if (!symbol.fqn) {
  symbol.fqn = calculateFQN(symbol);
  this.logger.debug(() => `Calculated FQN for ${symbol.name}: ${symbol.fqn}`);
}
```

#### 3. Import Statement Addition

**File**: `packages/apex-parser-ast/src/symbols/ApexSymbolGraph.ts`

Added import for the `calculateFQN` function:

```typescript
import { calculateFQN } from '../utils/FQNUtils';
```

### How the Fix Works

1. **Early FQN Calculation**: When a symbol is added to either the `ApexSymbolGraph` or `ApexSymbolManager`, the system now checks if the symbol already has an FQN.

2. **Automatic FQN Generation**: If no FQN exists, the system automatically calculates it using the existing `calculateFQN()` utility function, which considers:
   - Symbol hierarchy (parent relationships)
   - Namespace information
   - Symbol name

3. **Persistent Storage**: The calculated FQN is stored back to the symbol object and added to the FQN index for future lookups.

4. **Backward Compatibility**: Existing symbols with FQNs are preserved unchanged.

## Testing

### Test Coverage

Created comprehensive tests to verify the fix:

1. **ApexSymbolGraph.fqn.test.ts**: Tests FQN calculation and storage in the symbol graph
2. **ApexSymbolManager.fqn.test.ts**: Tests FQN calculation and storage in the symbol manager

### Test Scenarios

- ✅ Top-level class FQN calculation
- ✅ Nested method FQN calculation
- ✅ Deeply nested symbols (outer class → inner class → method)
- ✅ Preservation of existing FQNs
- ✅ FQN index population
- ✅ Integration with symbol resolution

### Test Results

All tests pass, confirming:

- FQNs are calculated correctly for all symbol types
- FQN index is properly populated
- Existing FQNs are preserved
- Symbol resolution works correctly

## Benefits

### Immediate Benefits

1. **Fixed Hover Functionality**: Hover requests now work correctly on first parse
2. **Reliable Cross-File Resolution**: FQN-based lookups work consistently
3. **Consistent Behavior**: No difference between first parse and subsequent operations

### Long-term Benefits

1. **Improved Performance**: FQN lookups are now O(1) instead of requiring recalculation
2. **Better Debugging**: FQN information is available for all symbols
3. **Enhanced Tooling**: Other LSP features can rely on FQN availability

## Migration Notes

### No Breaking Changes

This fix is backward compatible:

- Existing code continues to work unchanged
- Symbols with pre-existing FQNs are not modified
- All existing APIs remain the same

### Performance Impact

- **Minimal overhead**: FQN calculation only happens once per symbol
- **Memory efficient**: FQNs are stored as strings, not complex objects
- **Improved cache efficiency**: FQN lookups are now cached properly

## Future Considerations

### Potential Enhancements

1. **FQN Validation**: Add validation to ensure calculated FQNs are correct
2. **FQN Caching**: Consider caching FQN calculations for frequently accessed symbols
3. **FQN Metrics**: Add metrics to track FQN calculation performance

### Monitoring

Monitor the following after deployment:

- Hover request success rates
- Cross-file symbol resolution performance
- Memory usage patterns
- FQN calculation timing

## Conclusion

This bug fix resolves the core issue where FQNs were not being recorded during initial symbol parsing, which caused hover functionality and cross-file symbol resolution to fail. The fix ensures that FQNs are calculated and stored when symbols are first added to the system, providing consistent and reliable behavior for all LSP features that depend on FQN information.
