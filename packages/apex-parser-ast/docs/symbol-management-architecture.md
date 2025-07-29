# Symbol Management Architecture

## Overview

The Apex Language Server uses a sophisticated symbol management system built around a unified, graph-based architecture. This document describes the current architecture, including the major classes involved in symbol production, management, and resolution.

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

### 2. Core Classes and Relationships

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
        +createMinimalSymbol(name, kind, location, filePath, parentId, modifierFlags): ApexSymbol
        +createFullSymbol(name, kind, location, filePath, modifiers, parentId, typeData): ApexSymbol
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
        +parentId: string
        +key: SymbolKey
        +parentKey: SymbolKey
        +fqn?: string
        +namespace?: string
        +annotations?: Annotation[]
        +_typeData?: TypeData
        +_modifierFlags: number
        +_isLoaded: boolean
        +_loadPromise?: Promise
        +modifiers: SymbolModifiers
        +parent?: ApexSymbol
    }

    class SymbolTable {
        -root: SymbolScope
        -current: SymbolScope
        -symbolMap: HashMap~string, ApexSymbol~
        -scopeMap: HashMap~string, SymbolScope~
        +addSymbol(symbol): void
        +enterScope(name, scopeType): void
        +exitScope(): void
        +lookup(name): ApexSymbol
        +findScopeByName(name): SymbolScope
        +getCurrentScope(): SymbolScope
    }

    class SymbolScope {
        -symbols: HashMap~string, ApexSymbol~
        -children: SymbolScope[]
        -key: SymbolKey
        +name: string
        +parent: SymbolScope
        +addSymbol(symbol): void
        +getSymbol(name): ApexSymbol
        +getAllSymbols(): ApexSymbol[]
        +getChildren(): SymbolScope[]
        +getKey(): SymbolKey
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
        -referenceGraph: DirectedGraph~OptimizedSymbolNode, ReferenceEdge~
        -symbols: HashMap~string, ApexSymbol~
        -symbolToVertex: HashMap~string, DirectedVertex~
        -symbolFileMap: HashMap~string, string~
        -nameIndex: HashMap~string, string[]~
        -fileIndex: HashMap~string, string[]~
        -fqnIndex: HashMap~string, string~
        -fileToSymbolTable: HashMap~string, SymbolTable~
        -deferredReferences: HashMap~string, DeferredReference[]~
        +addSymbol(symbol, filePath, symbolTable): void
        +addReference(sourceSymbol, targetSymbol, referenceType, location, context): void
        +findReferencesTo(symbol): ReferenceResult[]
        +findReferencesFrom(symbol): ReferenceResult[]
        +detectCircularDependencies(): string[][]
        +analyzeDependencies(symbol): DependencyAnalysis
        +lookupSymbolWithContext(symbolName, context): SymbolLookupResult
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
    ApexSymbolManager --> SymbolTable : manages
    SymbolManagerFactory --> ApexSymbolManager : creates
    SymbolManagerFactory --> ISymbolManager : implements
    ApexSymbolManager --> ISymbolManager : implements
```

### 3. Symbol Types and Inheritance

```mermaid
classDiagram
    class ApexSymbol {
        <<interface>>
        +id: string
        +name: string
        +kind: SymbolKind
        +location: SymbolLocation
        +filePath: string
        +parentId: string
        +key: SymbolKey
        +parentKey: SymbolKey
        +fqn?: string
        +namespace?: string
        +annotations?: Annotation[]
        +_typeData?: TypeData
        +_modifierFlags: number
        +_isLoaded: boolean
        +_loadPromise?: Promise
        +modifiers: SymbolModifiers
        +parent?: ApexSymbol
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

### 4. Graph-Based Relationship Management

```mermaid
graph TD
    subgraph "ApexSymbolGraph"
        A[Reference Graph] --> B[Symbol Nodes]
        A --> C[Reference Edges]
        B --> D[OptimizedSymbolNode]
        C --> E[ReferenceEdge]

        subgraph "Indexes"
            F[Name Index]
            G[File Index]
            H[FQN Index]
            I[Symbol File Map]
        end

        subgraph "Storage"
            J[Symbol Tables]
            K[Deferred References]
        end
    end

    subgraph "Reference Types"
        L[METHOD_CALL]
        M[FIELD_ACCESS]
        N[TYPE_REFERENCE]
        O[INHERITANCE]
        P[INTERFACE_IMPLEMENTATION]
        Q[SCOPE_PARENT]
        R[SCOPE_CHILD]
        S[SCOPE_CONTAINS]
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

### 5. Symbol Resolution Flow

```mermaid
sequenceDiagram
    participant Client
    participant ApexSymbolManager
    participant ApexSymbolGraph
    participant SymbolTable
    participant SymbolScope

    Client->>ApexSymbolManager: resolveSymbol(name, context)
    ApexSymbolManager->>ApexSymbolGraph: lookupSymbolWithContext(name, context)
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

- `ApexSymbolGraph` uses a directed graph to track relationships
- Nodes represent symbols, edges represent references
- Supports complex queries like circular dependency detection

### 3. Lazy Loading

- Symbols can be created in minimal or full mode
- Expensive data is loaded only when needed
- Uses `_loadPromise` pattern for async loading

### 4. Unified Interface

- Single `ApexSymbol` interface for all symbol types
- Backward compatibility maintained through legacy properties
- Type-safe operations with TypeScript

### 5. Scope-Based Organization

- `SymbolTable` manages scopes within a file
- `SymbolScope` represents lexical scoping hierarchy
- Supports nested scope resolution

## Data Structures

### Core Collections

- `HashMap` from `data-structure-typed` for efficient symbol storage
- `DirectedGraph` for relationship tracking
- Multiple indexes for fast lookups (name, file, FQN)

### Symbol Storage

- `OptimizedSymbolNode` for graph vertices
- `ReferenceEdge` for relationship metadata
- `SymbolKey` for unique identification

### Reference Types

The system tracks 28 different types of references between symbols:

- Method calls, field access, type references
- Inheritance and interface implementation
- Scope relationships (parent, child, contains)
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

## Architecture Benefits

### 1. Unified Symbol System

- Single `ApexSymbol` interface eliminates type conversion overhead
- Consistent API across all symbol operations
- Simplified maintenance and debugging

### 2. Graph-Based Relationships

- Rich relationship tracking between symbols
- Bidirectional reference queries
- Circular dependency detection
- Impact analysis capabilities

### 3. Scalable Design

- Efficient data structures for large codebases
- Batch operations support
- Intelligent caching mechanisms
- Memory-conscious design

### 4. Extensible Architecture

- Clear separation of concerns
- Well-defined interfaces
- Factory patterns for testability
- Event-driven updates

## Conclusion

The current symbol management architecture provides a robust, scalable foundation for Apex language analysis. The unified symbol interface, graph-based relationship tracking, and scope-aware resolution create a powerful system capable of handling complex Apex codebases while maintaining clean, maintainable code.

The architecture supports advanced language server features like intelligent code completion, cross-file reference resolution, and dependency analysis, making it an essential component of the Apex Language Server ecosystem.
