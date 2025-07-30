# Namespace Resolution Remediation Plan

## Problem Statement

The `ApexSymbolCollectorListener.createTypeInfo()` implementation was incomplete and did not follow the comprehensive namespace resolution rules from the Java compiler. The original implementation:

1. **Only considered System namespace**: Only handled `System.*` types, ignoring other built-in namespaces
2. **Did not check built-in types**: Failed to recognize built-in primitive types, wrapper types, and SObject types
3. **No resolution flag**: Could not indicate when namespace resolution was needed for later processing
4. **Limited scope**: Did not follow the Java compiler's sophisticated rule-based resolution system

## Solution Overview

### 1. **Extended TypeInfo Interface**

Added a new property to indicate when namespace resolution is needed:

```typescript
export interface TypeInfo {
  // ... existing properties ...

  /**
   * Indicates if namespace resolution is needed for this type
   * This is true when the type name is ambiguous or requires
   * runtime resolution based on context
   */
  needsNamespaceResolution?: boolean;
}
```

### 2. **Created TypeInfoFactory Module**

Implemented a comprehensive module with arrow functions that follows Java compiler rules:

#### **Key Features:**

- **Built-in namespace recognition**: Handles all predefined namespaces (System, Schema, Apex, etc.)
- **Built-in type detection**: Uses `BuiltInTypeTablesImpl` to identify known types
- **Resolution flagging**: Marks user-defined types for later resolution
- **Qualified name parsing**: Properly handles `Namespace.Type` patterns
- **Collection type support**: Handles arrays, Lists, Sets, Maps with proper type parameters

#### **Resolution Logic:**

```typescript
export const createTypeInfo = (typeString: string): TypeInfo => {
  // Handle qualified type names (e.g., System.PageReference, MyNamespace.MyClass)
  if (typeString.includes('.')) {
    return createQualifiedTypeInfo(typeString);
  }

  // Handle simple type names
  return createSimpleTypeInfo(typeString);
};
```

#### **Built-in Namespace Support:**

```typescript
const getBuiltInNamespace = (namespace: string): Namespace | null => {
  // Check if it's a known built-in namespace
  if (BUILT_IN_NAMESPACES.includes(namespace)) {
    // For namespaces that have predefined constants, use those
    switch (namespace) {
      case 'System':
        return Namespaces.SYSTEM;
      case 'Schema':
        return Namespaces.SCHEMA;
      case 'Apex':
        return Namespaces.APEX;
      case 'ApexPages':
        return Namespaces.APEX_PAGES;
      case 'Database':
        return Namespaces.DATABASE;
      case 'Flow':
        return Namespaces.FLOW;
      case 'ConnectApi':
        return Namespaces.CONNECT_API;
      case 'CustomMetadata':
        return Namespaces.CUSTOM_METADATA;
      case 'Messaging':
        return Namespaces.MESSAGING;
      case 'Component':
        return Namespaces.VF_COMPONENT;
      case 'c':
        return Namespaces.VF;
      default:
        // For other built-in namespaces, create a new namespace instance
        return new Namespace(namespace, '');
    }
  }
  return null;
};
```

The module uses the complete `BUILT_IN_NAMESPACES` list from `FQNUtils.ts` which includes all 60+ Salesforce built-in namespaces such as:

- `AppLauncher`, `Approval`, `Auth`, `Cache`, `Canvas`
- `ChatterAnswers`, `CommerceBuyGrp`, `ConnectApi`, `Context`
- `Database`, `DataRetrieval`, `DataSource`, `EventBus`
- `Flow`, `Functions`, `Messaging`, `Metadata`
- `Process`, `Reports`, `Schema`, `Search`
- `System`, `Test`, `Trigger`, `Visualforce`
- And many more...

### 3. **Updated ApexSymbolCollectorListener**

Replaced the incomplete `createTypeInfo` method with the new module:

```typescript
/**
 * Create a TypeInfo object from a type string
 * Uses createTypeInfo for comprehensive namespace resolution
 */
private createTypeInfo(typeString: string): TypeInfo {
  return createTypeInfo(typeString);
}
```

## Implementation Details

### **Type Resolution Categories:**

1. **Qualified Types** (`Namespace.Type`):
   - Built-in namespaces: Resolved immediately with proper namespace
   - Custom namespaces: Created with new namespace instance
   - No resolution flag needed (namespace is known)

2. **Built-in Types** (`String`, `Integer`, `Account`, etc.):
   - Found in `BuiltInTypeTablesImpl`
   - Marked as primitive or non-primitive
   - No resolution flag needed (type is known)

3. **User-defined Types** (`MyClass`, `CustomObject__c`, etc.):
   - Not found in built-in tables
   - Marked with `needsNamespaceResolution: true`
   - Will be resolved later by symbol manager

### **Built-in Type Detection:**

The module uses `BuiltInTypeTablesImpl.getInstance().findType()` to check:

### **Built-in Namespace Detection:**

The module uses the complete `BUILT_IN_NAMESPACES` list from `FQNUtils.ts` to identify all Salesforce built-in namespaces. This provides comprehensive coverage of all 60+ built-in namespaces, ensuring that any type with a qualified name from these namespaces is properly recognized and handled.

- **Wrapper types**: String, Integer, Long, Double, Decimal, Boolean, Date, DateTime, Time, Blob, Id, Object
- **Scalar types**: void, null
- **System types**: System namespace types
- **Schema types**: Schema namespace types
- **SObject types**: Common SObject types (Account, Contact, Lead, etc.)

### **Resolution Flag Usage:**

```typescript
// For user-defined types that need later resolution
return {
  name: typeName,
  isPrimitive: false,
  namespace: undefined,
  needsNamespaceResolution: true, // Key flag for later processing
  getNamespace: () => null, // Will be resolved later
};
```

## Benefits

### 1. **Accuracy**

- Follows Java compiler namespace resolution rules
- Handles all built-in namespaces and types
- Properly identifies types requiring resolution

### 2. **Completeness**

- Supports all Apex type categories
- Handles qualified and unqualified names
- Preserves type information for later resolution

### 3. **Maintainability**

- Clear separation of concerns
- Module pattern with arrow functions for type creation
- Comprehensive test coverage

### 4. **Extensibility**

- Easy to add new built-in namespaces
- Support for future Apex features
- Integration ready for full namespace resolution system

## Testing

Created comprehensive test suite (`TypeInfoFactory.test.ts`) covering:

- **Qualified type handling**: System, Schema, Apex, custom namespaces
- **Built-in type detection**: Primitive, wrapper, scalar types
- **User-defined type flagging**: Proper resolution flag setting
- **Collection types**: Arrays, Lists, Sets, Maps
- **Utility methods**: Resolution checking and flagging

All tests pass, ensuring the implementation works correctly.

## Integration with Existing System

The new implementation:

1. **Maintains backward compatibility**: Existing code continues to work
2. **Prepares for full resolution**: Types marked for resolution can be processed later
3. **Integrates with symbol manager**: Ready for integration with `ApexSymbolManager`
4. **Supports LSP services**: Provides proper type information for language services

## Next Steps

### Phase 1: Immediate (Completed)

- ✅ Extended TypeInfo interface
- ✅ Created TypeInfoFactory
- ✅ Updated ApexSymbolCollectorListener
- ✅ Added comprehensive tests

### Phase 2: Integration (Future)

- Integrate with `ApexSymbolManager.resolveSymbol()`
- Implement `SymbolProvider` interface
- Add compilation context creation
- Bridge with namespace resolution system

### Phase 3: Advanced Features (Future)

- Complete resolution rules implementation
- Version compatibility system
- Performance optimizations
- Full Java compiler parity

## Conclusion

This remediation provides a solid foundation for proper namespace resolution in the TypeScript Apex parser. The implementation:

- **Fixes the immediate issues** with incomplete type resolution
- **Follows Java compiler patterns** for consistency
- **Prepares for full integration** with the namespace resolution system
- **Maintains code quality** with comprehensive testing

The solution addresses the core problem while setting up the infrastructure for complete namespace resolution parity with the Java compiler.
