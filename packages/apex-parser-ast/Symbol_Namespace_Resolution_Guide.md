# Symbol Namespace Resolution in Apex-Jorje Semantic Layer

## Overview

The Apex-Jorje semantic layer employs a sophisticated rule-based system to determine the correct namespace for symbol references. This document provides a detailed breakdown of the namespace resolution process, including all preconditions, context requirements, and resolution steps.

## Preconditions and Context Requirements

### 1. Compilation Context

#### 1.1 CodeUnitDetails
- **Source**: Must have valid `CodeUnitDetails` containing compilation unit information
- **Namespace**: The namespace of the current compilation unit (`referencingType.getNamespace()`)
- **Version**: Apex API version for the compilation unit (`referencingType.getCodeUnitDetails().getVersion()`)
- **Trust Level**: Whether the source is trusted (`referencingType.getCodeUnitDetails().isTrusted()`)
- **Source Type**: File-based vs DB-based vs generated code

#### 1.2 Type Context
- **Referencing Type**: The type in which the symbol reference occurs
- **Enclosing Type**: For inner types, the enclosing type hierarchy
- **Parent Types**: Superclass and interface hierarchy for inheritance-based resolution
- **Static Context**: Whether the reference occurs in a static context

### 2. Symbol Resolution Context

#### 2.1 ReferenceType Context
The `ReferenceType` enum determines which resolution order to use:
- **LOAD/STORE**: Variable access operations
- **METHOD**: Method call operations  
- **CLASS**: Class reference expressions (`.class`)
- **NONE**: Type declarations and other contexts

#### 2.2 IdentifierContext Context
- **STATIC**: Static member access context
- **OBJECT**: Instance member access context
- **NONE**: Ambiguous context (resolved based on static context)

### 3. Symbol Provider Context
- **Built-in Types**: Access to System, Schema, and other built-in namespaces
- **SObject Types**: Access to SObject metadata
- **User Types**: Access to user-defined types in the current org
- **External Types**: Access to types from external packages and services

## Namespace Resolution Process

### Step 1: Input Validation and Normalization

#### 1.1 Name List Processing
```java
// Handle double dots (..) in type names
List<String> adjustedNames = adjustEmptyNames(names, version);

// Validate maximum parts (up to 4 parts allowed)
if (adjustedNames.size() > TypeNameResolutionOrders.MAX_PARTS) {
    return UnresolvedTypeInfoFactory.create(adjustedNames);
}

// Convert all names to lowercase for case-insensitive resolution
names = names.stream().map(String::toLowerCase).collect(toList());
```

#### 1.2 Trigger Namespace Validation
```java
// Prevent use of trigger namespace for type references
if (TypeNameFactory.TRIGGER_NAMESPACE.equalsIgnoreCase(adjustedNames.get(0))) {
    return UnresolvedTypeInfoFactory.create(adjustedNames);
}
```

### Step 2: Resolution Order Selection

Based on `ReferenceType`, select the appropriate resolution order:

```java
public static TypeNameResolutionOrder get(final ReferenceType reference) {
    switch (reference) {
    case LOAD:
    case STORE:
        return TypeNameResolutionOrders.VARIABLE;
    case METHOD:
        return TypeNameResolutionOrders.METHOD;
    case CLASS:
        return TypeNameResolutionOrders.CLASS_REF;
    case NONE:
        return TypeNameResolutionOrders.DEFAULT;
    }
}
```

### Step 3: Rule-Based Resolution

The system applies different resolution rules based on the number of name parts:

#### 3.1 One-Part Type Names (e.g., `String`, `Account`)

**Resolution Order:**
1. **NamedScalarOrVoid**: Built-in scalar types (String, Integer, etc.)
2. **InnerTypeOfCurrentType**: Inner types of the current type
3. **InnerTypeOfParentType**: Inner types of parent types
4. **ArgumentType**: Type parameters and generic arguments
5. **InnerTypeOfEnclosingType**: Inner types of enclosing types
6. **TopLevelTypeInSameNamespace**: Types in the same namespace
7. **BuiltInSystemSchema**: Built-in System and Schema types
8. **SObject**: SObject types
9. **FileBaseSystemNamespace**: File-based System namespace access
10. **FileBaseSchemaNamespace**: File-based Schema namespace access

**Key Namespace Logic:**
```java
// TopLevelTypeInSameNamespace rule
final String candidateName = createTypeWithNamespace(
    referencingType.getNamespace(),
    firstPart
);
return symbols.find(referencingType, candidateName);
```

#### 3.2 Two-Part Type Names (e.g., `System.String`, `MyNamespace.MyClass`)

**Resolution Order:**
1. **VfComponentTypeTwo**: Visualforce component types
2. **InnerTypeInSameNamespace**: Inner types in the same namespace
3. **TwoPartInnerTypeViaSubType**: Inner types via subtype relationships
4. **NamespaceAndTopLevelType**: Explicit namespace + type name
5. **BuiltInNamespace**: Built-in namespace types
6. **SchemaSObject**: Schema SObject types
7. **Pre154SystemSObject**: Pre-154 System SObject types
8. **TwoPartSystemExceptions**: System exception types
9. **ApexPagesMappedTypes**: ApexPages mapped types
10. **DynamicClassTypeTwo**: Dynamic class types

**Key Namespace Logic:**
```java
// NamespaceAndTopLevelType rule
final String candidateName = createTypeWithNamespace(
    Namespaces.parse(firstPart),
    secondPart
);
return symbols.find(referencingType, candidateName);
```

#### 3.3 Three-Part and Four-Part Type Names

Handle complex scenarios like:
- Inner classes with namespaces: `Namespace.Outer.Inner`
- Nested namespaces: `Namespace1.Namespace2.Type`
- Dynamic types: `ExternalService.Namespace.Type`

### Step 4: Namespace Creation and Lookup

#### 4.1 Namespace Parsing
```java
public static Namespace parse(final String fullNamespace) {
    final int index = fullNamespace.indexOf("__");
    final Namespace namespace;
    namespace = index > -1
        ? create(fullNamespace.substring(0, index), fullNamespace.substring(index + 2, fullNamespace.length()))
        : create(fullNamespace);
    return NAMESPACES.intern(namespace);
}
```

#### 4.2 Type Name Construction
```java
// For types with namespace
static String createTypeWithNamespace(final Namespace namespace, final String outer) {
    if (Namespace.isEmptyOrNull(namespace)) {
        return outer;
    }
    return namespace.getBytecodeNameLower() + "/" + outer;
}

// For built-in types
static String createBuiltInCandidate(final Namespace namespace, final String name) {
    return Namespace.isEmptyOrNull(namespace)
        ? PackageNames.BUILT_IN + name
        : createTypeWithThreeParts(
            PackageNames.BUILT_IN_NO_SLASH,
            namespace.getBytecodeNameLower(),
            name
        );
}
```

### Step 5: Symbol Lookup

#### 5.1 Lookup Sources (in order)
1. **Compiled Types**: Already compiled types in the current compilation session
2. **Built-in Type Tables**: Predefined type tables for scalar types
3. **Symbol Provider**: External symbol provider for org-specific types
4. **Unresolved Type**: If no match found, create unresolved type info

#### 5.2 Lookup Implementation
```java
public TypeInfo find(final TypeInfo referencingType, final String lowerCaseFullName) {
    // Check wrapper types first
    TypeInfo type = TypeInfoTables.WRAPPER_TYPES.get(lowerCaseFullName);
    if (type != null) {
        return type;
    }

    // Check compiled types
    type = compiledTypesByLowerName.get(lowerCaseFullName);
    if (type != null) {
        return type;
    }

    // Check symbol provider
    type = compiler.getInput().getSymbolProvider().find(this, referencingType, lowerCaseFullName);
    if (type != null && type.isResolved()) {
        return type;
    }

    return null;
}
```

## Context Depth and Breadth Requirements

### 1. Compilation Unit Context
- **Namespace**: Must be available from `SourceFile.getNamespace()`
- **Version**: Must be available from `CodeUnitDetails.getVersion()`
- **Trust Level**: Must be available from `CodeUnitDetails.isTrusted()`

### 2. Type Hierarchy Context
- **Current Type**: The type containing the symbol reference
- **Enclosing Types**: Full hierarchy of enclosing types for inner type resolution
- **Parent Types**: Complete inheritance hierarchy for method/field resolution
- **Static Context**: Whether the reference occurs in static or instance context

### 3. Symbol Provider Context
- **Built-in Types**: Complete access to System, Schema, and other built-in namespaces
- **SObject Metadata**: Access to all SObject types and fields in the org
- **User Types**: Access to all user-defined types in the current namespace and org
- **Package Types**: Access to types from installed packages and external services

### 4. Resolution Rule Context
- **Version Compatibility**: Rules may be version-dependent
- **Context Sensitivity**: Different rules apply based on ReferenceType and IdentifierContext
- **Namespace Visibility**: Rules respect namespace visibility and access modifiers

## Error Handling and Edge Cases

### 1. Unresolved Symbols
- If no resolution rule matches, create `UnresolvedTypeInfo`
- Preserve original name parts for error reporting
- Allow compilation to continue for better error reporting

### 2. Ambiguous References
- Multiple rules may match the same symbol
- First matching rule wins (order is significant)
- Version-specific rules may override general rules

### 3. Namespace Conflicts
- Built-in namespaces take precedence over user namespaces
- System and Schema namespaces have special handling
- File-based vs DB-based namespace resolution differences

### 4. Version Compatibility
- Some resolution rules are version-dependent
- Older Apex versions may have different resolution behavior
- Version checks prevent incompatible rule application

## Performance Considerations

### 1. Caching
- **Namespace Interning**: Namespace objects are interned to avoid duplicates
- **Type Caching**: Compiled types are cached by lowercase name
- **Rule Caching**: Resolution rules are singleton instances

### 2. Early Termination
- Resolution stops at first successful match
- Version checks prevent unnecessary rule evaluation
- Context-specific rules reduce search space

### 3. Case Insensitivity
- All names are converted to lowercase early in the process
- Case-insensitive maps are used for lookups
- Reduces string comparison overhead

## Summary

The namespace resolution process in Apex-Jorje is a multi-layered, context-sensitive system that requires:

1. **Complete compilation context** including namespace, version, and trust level
2. **Full type hierarchy information** for inheritance and inner type resolution
3. **Comprehensive symbol provider access** for all available types
4. **Context-aware rule application** based on reference type and identifier context
5. **Version-compatible resolution** that respects Apex API version constraints

The system's strength lies in its rule-based approach, which allows for precise control over resolution behavior while maintaining performance through caching and early termination strategies. 