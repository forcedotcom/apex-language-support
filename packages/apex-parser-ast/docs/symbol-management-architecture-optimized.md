# Symbol Management Architecture - Optimized

## Overview

The Apex Language Server uses a sophisticated symbol management system built around a unified, graph-based architecture with optimized data storage. This document describes the optimized architecture that eliminates data duplication between `ApexSymbol` and `SymbolTable` while maintaining clear separation of concerns.

## Core Architecture Components

### 1. Symbol Production Pipeline

The symbol production pipeline starts with the ANTLR parser and flows through several key components:

```mermaid
graph TD
    A[Source Code] --> B[ANTLR Parser]
    B --> C[ApexSymbolCollectorListener]
    C --> D[SymbolFactory]
    D --> E[ApexSymbol]
    E --> F[SymbolTable]
    F --> G[ApexSymbolManager]
    G --> H[ApexSymbolGraph]

    subgraph "Parser Layer"
        B
        C
    end

    subgraph "Symbol Creation"
        D
        E
    end

    subgraph "Storage Layer"
        F
        G
        H
    end
```

### 2. Core Classes and Relationships - Optimized

```mermaid
classDiagram
    class CompilerService {
        -projectNamespace: string
        -logger: Logger
        +compile(fileContent, fileName, listener, options): CompilationResult
        +compileMultiple(files, listener, options): Promise~CompilationResult[]~
        -createParseTree(fileContent, fileName): ParseTreeResult
    }

    class ApexSymbolCollectorListener {
        -symbolTable: SymbolTable
        -currentTypeSymbol: TypeSymbol
        -currentMethodSymbol: MethodSymbol
        -blockDepth: number
        -currentModifiers: SymbolModifiers
        -currentAnnotations: Annotation[]
        +enterClassDeclaration(ctx): void
        +enterMethodDeclaration(ctx): void
        +enterFieldDeclaration(ctx): void
        -createTypeSymbol(ctx, name, kind, modifiers): TypeSymbol
        -createMethodSymbol(ctx, name, modifiers): MethodSymbol
    }

    class SymbolFactory {
        +createMinimalSymbol(name, kind, location, filePath, scopeId, modifierFlags): ApexSymbol
        +createFullSymbol(name, kind, location, filePath, modifiers, scopeId, typeData): ApexSymbol
        -modifiersToFlags(modifiers): number
        -flagsToModifiers(flags): SymbolModifiers
        -generateId(name, filePath): string
    }

    class ApexSymbol {
        +id: string
        +name: string
        +kind: SymbolKind
        +location: SymbolLocation
        +filePath: string
        +scopeId: string
        +fqn?: string
        +namespace?: string
        +annotations?: Annotation[]
        +_typeData?: TypeData
        +_modifierFlags: number
        +_isLoaded: boolean
        +_loadPromise?: Promise
        +modifiers: SymbolModifiers
    }

    class SymbolTable {
        -root: SymbolScope
        -current: SymbolScope
        -symbols: HashMap~string, ApexSymbol~
        -scopes: HashMap~string, SymbolScope~
        +addSymbol(symbol): void
        +enterScope(name, scopeType): void
        +exitScope(): void
        +lookup(name): ApexSymbol
        +findScopeByName(name): SymbolScope
        +getCurrentScope(): SymbolScope
        +getSymbol(symbolId): ApexSymbol
        +findSymbolsByName(name): ApexSymbol[]
        +getSymbolsInScope(scopeId): ApexSymbol[]
    }

    class SymbolScope {
        -symbols: HashMap~string, ApexSymbol~
        -children: SymbolScope[]
        -scopeId: string
        +name: string
        +parent: SymbolScope
        +addSymbol(symbol): void
        +getSymbol(name): ApexSymbol
        +getAllSymbols(): ApexSymbol[]
        +getChildren(): SymbolScope[]
        +getScopeId(): string
    }

    class ApexSymbolManager {
        -symbolGraph: ApexSymbolGraph
        -fileMetadata: HashMap~string, FileMetadata~
        -unifiedCache: UnifiedCache
        -MAX_CACHE_SIZE: number
        -CACHE_TTL: number
        +addSymbol(symbol, filePath): void
        +findSymbolByName(name): ApexSymbol[]
        +findSymbolByFQN(fqn): ApexSymbol
        +resolveSymbol(name, context): SymbolResolutionResult
        +findReferencesTo(symbol): ReferenceResult[]
        +analyzeDependencies(symbol): DependencyAnalysis
        +getStats(): Stats
    }

    class ApexSymbolGraph {
        -referenceGraph: DirectedGraph~ReferenceNode, ReferenceEdge~
        -symbolIds: Set~string~
        -fileToSymbolTable: HashMap~string, SymbolTable~
        -symbolFileMap: HashMap~string, string~
        -nameIndex: HashMap~string, string[]~
        -fileIndex: HashMap~string, string[]~
        -fqnIndex: HashMap~string, string~
        -deferredReferences: HashMap~string, DeferredReference[]~
        +addSymbol(symbol, filePath, symbolTable): void
        +addReference(sourceId, targetId, referenceType, location, context): void
        +findReferencesTo(symbol): ReferenceResult[]
        +findReferencesFrom(symbol): ReferenceResult[]
        +detectCircularDependencies(): string[][]
        +analyzeDependencies(symbol): DependencyAnalysis
        +lookupSymbolWithContext(symbolName, context): SymbolLookupResult
        +getSymbol(symbolId): ApexSymbol
    }

    class SymbolManagerFactory {
        -instance: ISymbolManager
        -testMode: boolean
        +setTestMode(enabled): void
        +createSymbolManager(): ISymbolManager
        +reset(): void
    }

    class ISymbolManager {
        <<interface>>
        +addSymbol(symbol, filePath): void
        +findSymbolByName(name): ApexSymbol[]
        +findSymbolByFQN(fqn): ApexSymbol
        +resolveSymbol(name, context): SymbolResolutionResult
        +findReferencesTo(symbol): ReferenceResult[]
        +analyzeDependencies(symbol): DependencyAnalysis
        +getStats(): Stats
    }

    CompilerService --> ApexSymbolCollectorListener : uses
    ApexSymbolCollectorListener --> SymbolFactory : creates symbols via
    ApexSymbolCollectorListener --> SymbolTable : builds
    SymbolFactory --> ApexSymbol : creates
    SymbolTable --> SymbolScope : contains
    SymbolScope --> ApexSymbol : stores
    ApexSymbolManager --> ApexSymbolGraph : uses
    ApexSymbolManager --> SymbolTable : delegates to
    SymbolManagerFactory --> ApexSymbolManager : creates
    SymbolManagerFactory --> ISymbolManager : implements
    ApexSymbolManager --> ISymbolManager : implements
    ApexSymbolGraph --> SymbolTable : references only
```

### 3. Symbol Types and Inheritance - Optimized

```mermaid
classDiagram
    class ApexSymbol {
        <<interface>>
        +id: string
        +name: string
        +kind: SymbolKind
        +location: SymbolLocation
        +filePath: string
        +scopeId: string
        +fqn?: string
        +namespace?: string
        +annotations?: Annotation[]
        +_typeData?: TypeData
        +_modifierFlags: number
        +_isLoaded: boolean
        +_loadPromise?: Promise
        +modifiers: SymbolModifiers
    }

    class TypeSymbol {
        <<interface>>
        +superClass?: string
        +interfaces: string[]
    }

    class MethodSymbol {
        <<interface>>
        +returnType?: TypeInfo
        +parameters: string[]
    }

    class VariableSymbol {
        <<interface>>
        +type?: TypeInfo
        +initialValue?: string
    }

    class EnumSymbol {
        <<interface>>
        +values: VariableSymbol[]
    }

    class PropertySymbol {
        <<interface>>
        +getter?: MethodSymbol
        +setter?: MethodSymbol
    }

    ApexSymbol <|-- TypeSymbol
    ApexSymbol <|-- MethodSymbol
    ApexSymbol <|-- VariableSymbol
    ApexSymbol <|-- EnumSymbol
    ApexSymbol <|-- PropertySymbol
    TypeSymbol <|-- ClassSymbol
    TypeSymbol <|-- InterfaceSymbol
    TypeSymbol <|-- TriggerSymbol
    TypeSymbol <|-- EnumSymbol
```

### 4. Graph-Based Relationship Management - Optimized

```mermaid
graph TD
    subgraph "ApexSymbolGraph - Cross-File Only"
        A[Reference Graph] --> B[Reference Nodes]
        A --> C[Reference Edges]
        B --> D[ReferenceNode]
        C --> E[ReferenceEdge]

        subgraph "Indexes"
            F[Name Index]
            G[File Index]
            H[FQN Index]
            I[Symbol File Map]
        end

        subgraph "References"
            J[Symbol Tables]
            K[Deferred References]
        end
    end

    subgraph "Reference Types - Cross-File Only"
        L[METHOD_CALL]
        M[FIELD_ACCESS]
        N[TYPE_REFERENCE]
        O[INHERITANCE]
        P[INTERFACE_IMPLEMENTATION]
        Q[STATIC_ACCESS]
        R[CONSTRUCTOR_CALL]
        S[ANNOTATION_REFERENCE]
    end

    D --> F
    D --> G
    D --> H
    D --> I
    E --> L
    E --> M
    E --> N
    E --> O
    E --> P
    E --> Q
    E --> R
    E --> S
```

### 5. Symbol Resolution Flow - Optimized

```mermaid
sequenceDiagram
    participant Client
    participant ApexSymbolManager
    participant ApexSymbolGraph
    participant SymbolTable
    participant SymbolScope

    Client->>ApexSymbolManager: resolveSymbol(name, context)
    ApexSymbolManager->>ApexSymbolGraph: lookupSymbolWithContext(name, context)
    ApexSymbolGraph->>SymbolTable: getSymbolsByName(name)
    SymbolTable->>SymbolScope: lookup(name)
    SymbolScope-->>SymbolTable: ApexSymbol[]
    SymbolTable-->>ApexSymbolGraph: ApexSymbol[]
    ApexSymbolGraph->>ApexSymbolGraph: resolveAmbiguousSymbol(candidates, context)

    alt Single candidate found
        ApexSymbolGraph-->>ApexSymbolManager: SymbolLookupResult with high confidence
    else Multiple candidates found
        ApexSymbolGraph->>ApexSymbolGraph: Apply context-based resolution
        ApexSymbolGraph-->>ApexSymbolManager: SymbolLookupResult with confidence score
    else No candidates found
        ApexSymbolGraph-->>ApexSymbolManager: null
    end

    ApexSymbolManager-->>Client: SymbolResolutionResult
```

## Key Design Patterns

### 1. Factory Pattern

- `SymbolFactory` creates symbols with different loading strategies
- `SymbolManagerFactory` creates appropriate symbol manager instances
- `HandlerFactory` creates LSP handlers with proper dependencies

### 2. Graph-Based Architecture

- `ApexSymbolGraph` uses a directed graph to track cross-file relationships only
- Nodes represent symbol references, edges represent cross-file references
- Supports complex queries like circular dependency detection

### 3. Lazy Loading

- Symbols can be created in minimal or full mode
- Expensive data is loaded only when needed
- Uses `_loadPromise` pattern for async loading

### 4. Unified Interface

- Single `ApexSymbol` interface for all symbol types
- Simplified scope management through `scopeId` reference
- Type-safe operations with TypeScript

### 5. Scope-Based Organization

- `SymbolTable` manages scopes within a file (primary storage)
- `SymbolScope` represents lexical scoping hierarchy
- Supports nested scope resolution with efficient traversal

### 6. Separation of Concerns

- **SymbolTable**: Primary symbol storage and scope management
- **ApexSymbolGraph**: Cross-file relationship tracking only
- **Clear delegation**: Graph delegates symbol operations to SymbolTable

## Data Structures - Optimized

### Core Collections

- `HashMap` from `data-structure-typed` for efficient symbol storage
- `DirectedGraph` for cross-file relationship tracking only
- Multiple indexes for fast lookups (name, file, FQN)

### Symbol Storage

- **Primary**: `SymbolTable` owns all symbol data
- **Graph**: Only stores lightweight `ReferenceNode` for cross-file relationships
- **Scope**: Unified scope management through `scopeId` references

### Reference Types - Cross-File Only

The system tracks cross-file references between symbols:

- Method calls, field access, type references
- Inheritance and interface implementation
- Static access, constructor calls, annotations
- SOQL/SOSL references, DML operations

## Integration Points

### 1. LSP Services

- `DiagnosticProcessingService` uses symbol manager for cross-file analysis
- `CompletionProcessingService` provides intelligent code completion
- `DefinitionProcessingService` resolves symbol definitions
- `ReferencesProcessingService` finds symbol references

### 2. Storage Layer

- `ApexStorageManager` provides persistent storage
- `ApexStorageInterface` defines storage contract
- Integration with file system and database backends

### 3. Parser Integration

- `CompilerService` orchestrates parsing and symbol collection
- `ApexSymbolCollectorListener` builds symbol tables during parsing
- Real-time symbol updates during development

## Architecture Benefits - Optimized

### 1. Eliminated Data Duplication

- **Single source of truth**: `SymbolTable` owns all symbol data
- **No duplicate storage**: Graph only stores references, not full symbols
- **Reduced memory footprint**: Eliminates redundant symbol storage
- **Simplified maintenance**: Fewer places to update symbol data

### 2. Clear Separation of Concerns

- **SymbolTable**: Lexical scope and symbol storage within files
- **ApexSymbolGraph**: Cross-file relationship tracking only
- **Focused purpose**: Graph maintains its core purpose without scope pollution

### 3. Improved Performance

- **Faster lookups**: Direct delegation to optimized SymbolTable
- **Reduced cache misses**: Single symbol storage location
- **Efficient scope traversal**: Optimized scope hierarchy in SymbolTable
- **Streamlined data flow**: Clear delegation pattern

### 4. Simplified Symbol Interface

- **Removed redundancy**: Eliminated `parentId`, `parentKey`, `parent` properties
- **Unified scope reference**: Single `scopeId` for scope relationships
- **Cleaner API**: Simplified symbol interface with clear responsibilities

### 5. Scalable Design

- **Efficient data structures**: Optimized for large codebases
- **Batch operations support**: Delegated to appropriate components
- **Memory-conscious design**: Eliminated duplicate storage
- **Clear delegation**: Each component handles its specific domain

## Data Flow - Optimized

### Symbol Addition

```typescript
// 1. Symbol created by SymbolFactory
const symbol = SymbolFactory.createMinimalSymbol(
  name,
  kind,
  location,
  filePath,
  scopeId,
);

// 2. Added to SymbolTable (primary storage)
symbolTable.addSymbol(symbol);

// 3. Graph only stores reference and indexes
symbolGraph.addSymbol(symbol, filePath, symbolTable);
// - Stores symbolId in Set
// - Updates indexes for fast lookup
// - Registers SymbolTable reference
// - Does NOT store full symbol
```

### Symbol Resolution

```typescript
// 1. Graph delegates to SymbolTable
symbolGraph.getSymbol(symbolId) {
  const filePath = this.symbolFileMap.get(symbolId);
  const symbolTable = this.fileToSymbolTable.get(filePath);
  return symbolTable?.getSymbol(symbolId) || null;
}

// 2. SymbolTable handles scope-aware lookup
symbolTable.lookup(name) {
  let scope = this.current;
  while (scope) {
    const symbol = scope.getSymbol(name);
    if (symbol) return symbol;
    scope = scope.parent;
  }
}
```

### Cross-File Reference Tracking

```typescript
// Graph handles cross-file relationships only
symbolGraph.addReference(
  sourceId,
  targetId,
  ReferenceType.METHOD_CALL,
  location,
);
// - Creates edge in reference graph
// - Stores relationship metadata
// - Enables dependency analysis
```

## Conclusion

The optimized symbol management architecture eliminates data duplication while maintaining clear separation of concerns. The `SymbolTable` serves as the primary storage for symbols and scope management, while the `ApexSymbolGraph` focuses exclusively on cross-file relationship tracking.

This approach provides:

- **Memory efficiency** through eliminated duplicate storage
- **Performance improvements** through optimized data structures
- **Clear separation** between lexical scope and cross-file relationships
- **Simplified maintenance** with single source of truth for symbol data
- **Scalable design** that handles large codebases efficiently

The architecture maintains all the benefits of the original design while providing a more efficient and maintainable foundation for Apex language analysis.
