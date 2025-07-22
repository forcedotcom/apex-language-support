# Cross-File Reference Resolution Spike Work

## Overview

This document outlines the spike work for implementing cross-file reference resolution capabilities in the Apex Language Server parser/AST system. The goal is to enable efficient symbol resolution, type checking, and method signature validation across file boundaries using lazy loading.

## Objective

Design and prototype a comprehensive cross-file reference resolution system for the Apex Language Server that enables efficient symbol resolution, type checking, and method signature validation across file boundaries using lazy loading.

## Critical Architecture Requirement

The lazy loading system must include a mechanism for requesting unknown symbols from the client via the storage system when they're not locally available. This client-request mechanism is essential for true lazy loading but is a separate implementation concern.

## Current State Analysis

The apex-parser-ast package currently provides:

1. **Single-file parsing**: Strong capabilities for parsing individual Apex files with comprehensive symbol collection
2. **Symbol table management**: Hierarchical scope management with efficient symbol lookup
3. **Namespace support**: Basic namespace handling for built-in Salesforce namespaces
4. **Type information**: Rich type system with support for primitives, collections, and arrays
5. **Comment collection**: Comprehensive comment handling with association capabilities
6. **Multi-file compilation**: Basic support for compiling multiple files in parallel
7. **Lazy loading**: ResourceLoader supports both 'lazy' and 'full' loading modes

### Gaps in Cross-File Capabilities

1. **No cross-file symbol resolution**: No mechanism to resolve symbols across file boundaries
2. **No reference tracking**: No system to track where symbols are referenced from other files
3. **No type checking across files**: No validation of type compatibility across file boundaries
4. **No method signature validation**: No validation of method calls against definitions in other files
5. **Incomplete FQN resolution**: TODO comments indicate FQN calculation is incomplete

## Scope

### In Scope

1. **Cross-file symbol resolution**: Resolve symbols from other files when they're referenced
2. **Cross-file type checking**: Validate type compatibility across file boundaries
3. **Method signature validation**: Validate method calls against their definitions across files
4. **Reference tracking**: Track where symbols from one file are referenced in other files
5. **Dependency-aware lazy loading**: Load referenced files when needed for resolution
6. **Symbol index integration**: Extend existing symbol tables with cross-file capabilities
7. **Caching strategy**: Leverage existing `compiledArtifacts` cache for cross-file lookups

### Out of Scope

1. **Client request implementation**: The specific mechanism for requesting symbols from clients
2. **Bytecode generation**: Converting AST to executable bytecode
3. **Runtime integration**: Integration with Salesforce runtime or governor limits
4. **Code optimization**: Performance optimization passes
5. **Dead code analysis**: Control flow analysis and dead code detection

## Design Approach: Hybrid Solution

### Overview

The recommended approach is a **hybrid solution** that combines the best aspects of different strategies:

1. **Global Symbol Registry** for fast cross-file lookups
2. **Enhanced SymbolTable** with global registry integration
3. **Lazy Loading** with client request capability
4. **Graph-Based Cross-Reference Tracking** for efficient relationship management

### 1. Global Symbol Registry

```typescript
class GlobalSymbolRegistry {
  private symbolMap: Map<string, ApexSymbol> = new Map();
  private fileToSymbols: Map<string, Set<string>> = new Map();
  private symbolToFile: Map<string, string> = new Map();
  private clientRequestHandler: ClientRequestHandler;

  // Register symbols from a file
  registerSymbols(filePath: string, symbols: ApexSymbol[]): void {
    const fileSymbols = new Set<string>();

    for (const symbol of symbols) {
      const fqn = calculateFQN(symbol);
      this.symbolMap.set(fqn, symbol);
      this.symbolToFile.set(fqn, filePath);
      fileSymbols.add(fqn);
    }

    this.fileToSymbols.set(filePath, fileSymbols);
  }

  // Resolve symbol by FQN with client request fallback
  async resolveSymbol(
    fqn: string,
    context: ResolutionContext,
  ): Promise<ApexSymbol | null> {
    // 1. Check local registry
    const localSymbol = this.symbolMap.get(fqn);
    if (localSymbol) return localSymbol;

    // 2. Request from client if not found
    return await this.clientRequestHandler.requestSymbol(fqn, context);
  }

  // Memory management with LRU eviction
  private evictLeastUsed(): void {
    // Implementation for managing memory usage
  }
}
```

### 2. Enhanced SymbolTable with Registry Integration

```typescript
class SymbolTable {
  private root: SymbolScope;
  private current: SymbolScope;
  private symbolMap: HashMap<string, ApexSymbol> = new HashMap();
  private scopeMap: HashMap<string, SymbolScope> = new HashMap();

  // NEW: Reference to global registry
  private globalRegistry: GlobalSymbolRegistry;

  constructor(globalRegistry?: GlobalSymbolRegistry) {
    this.root = new SymbolScope('file', null, 'file');
    this.current = this.root;
    this.scopeMap.set(this.keyToString(this.root.getKey()), this.root);
    this.globalRegistry = globalRegistry;
  }

  // ENHANCED: Lookup with global fallback
  async lookup(
    name: string,
    context?: ResolutionContext,
  ): Promise<ApexSymbol | null> {
    // 1. Try local scope first (existing behavior)
    let scope: SymbolScope | null = this.current;
    while (scope) {
      const symbol = scope.getSymbol(name);
      if (symbol) {
        return symbol;
      }
      scope = scope.parent;
    }

    // 2. Try global registry if available
    if (this.globalRegistry) {
      return await this.globalRegistry.resolveSymbol(name, context);
    }

    return null;
  }

  // NEW: Register symbols with global registry
  addSymbol(symbol: ApexSymbol): void {
    // Existing local registration
    if (symbol.parentKey) {
      const parent = this.lookupByKey(symbol.parentKey);
      if (parent) {
        symbol.parent = parent;
      }
    }
    this.current.addSymbol(symbol);
    this.symbolMap.set(this.keyToString(symbol.key), symbol);

    // NEW: Register with global registry
    if (this.globalRegistry) {
      this.globalRegistry.registerSymbol(symbol, this.filePath);
    }
  }
}
```

### 3. Lazy Loading Integration

```typescript
class LazySymbolResolver {
  constructor(
    private resourceLoader: ResourceLoader,
    private globalRegistry: GlobalSymbolRegistry,
  ) {}

  async resolveSymbol(fqn: string): Promise<ApexSymbol | null> {
    // 1. Check global registry first
    const cachedSymbol = await this.globalRegistry.resolveSymbol(fqn);
    if (cachedSymbol) return cachedSymbol;

    // 2. Determine file path from FQN
    const filePath = this.determineFilePath(fqn);

    // 3. Lazy load and compile file
    const fileContent = this.resourceLoader.getFile(filePath);
    if (fileContent) {
      const compiled = await this.compileFile(filePath, fileContent);
      this.globalRegistry.registerSymbols(filePath, compiled.symbols);
      return await this.globalRegistry.resolveSymbol(fqn);
    }

    // 4. Request from client
    return await this.globalRegistry.requestFromClient(fqn);
  }
}
```

### 4. Enhanced Type System for Cross-File Validation

```typescript
interface CrossFileTypeInfo extends TypeInfo {
  resolvedDefinition?: ApexSymbol; // Link to actual type definition
  inheritanceChain?: string[]; // Chain of parent types
  genericConstraints?: Map<string, TypeInfo>; // Generic type constraints
  accessibility?: SymbolVisibility; // Type accessibility
}

interface TypeValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  compatibilityLevel: 'exact' | 'compatible' | 'incompatible';
}
```

### 5. Method Signature Validation

```typescript
interface MethodValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  resolvedMethod?: MethodSymbol;
  argumentMatches: ArgumentMatch[];
}

class MethodSignatureValidator {
  async validateMethodCall(
    methodName: string,
    arguments: TypeInfo[],
    targetType: TypeInfo,
  ): Promise<MethodValidationResult> {
    // 1. Resolve target type to its definition (may require client request)
    // 2. Find method in target type (including inheritance)
    // 3. Validate argument types against parameter types
    // 4. Check method visibility and accessibility
    // 5. Return validation result
  }
}
```

### 6. Graph-Based Cross-Reference Tracking

The system uses the `data-structure-typed` library's `DirectedGraph` to efficiently track relationships between symbols across files. This provides O(1) lookup performance for references and enables powerful graph algorithms for dependency analysis.

#### 6.1 Cross-Reference Graph Architecture

```typescript
import {
  DirectedGraph,
  DirectedVertex,
  DirectedEdge,
} from 'data-structure-typed';

interface ReferenceEdge {
  type: ReferenceType;
  location: SymbolLocation;
  sourceFile: string;
  targetFile?: string; // For cross-file references
}

enum ReferenceType {
  METHOD_CALL = 'method-call',
  FIELD_ACCESS = 'field-access',
  TYPE_REFERENCE = 'type-reference',
  INHERITANCE = 'inheritance',
  INTERFACE_IMPLEMENTATION = 'interface-implementation',
  VARIABLE_DECLARATION = 'variable-declaration',
  PARAMETER_TYPE = 'parameter-type',
  RETURN_TYPE = 'return-type',
}

class CrossReferenceGraph {
  private referenceGraph: DirectedGraph<ApexSymbol, ReferenceEdge> =
    new DirectedGraph();
  private symbolToVertex: Map<string, DirectedVertex<ApexSymbol>> = new Map();
  private deferredReferences: Map<string, DeferredReference[]> = new Map();

  // Add a symbol to the graph
  addSymbol(symbol: ApexSymbol): void {
    const vertex = this.referenceGraph.createVertex(symbol.fqn, symbol);
    this.symbolToVertex.set(symbol.fqn, vertex);

    // Process any deferred references to this symbol
    this.processDeferredReferences(symbol.fqn);
  }

  // Track references between symbols
  addReference(
    sourceSymbol: ApexSymbol,
    targetSymbol: ApexSymbol,
    referenceType: ReferenceType,
    location: SymbolLocation,
  ): void {
    const sourceVertex = this.getOrCreateVertex(sourceSymbol);
    const targetVertex = this.getOrCreateVertex(targetSymbol);

    this.referenceGraph.createEdge(
      sourceVertex.key,
      targetVertex.key,
      1, // weight
      {
        type: referenceType,
        location,
        sourceFile: sourceSymbol.key.path[0], // file name
        targetFile: targetSymbol.key.path[0],
      },
    );
  }

  // Add deferred reference for lazy loading
  addDeferredReference(
    sourceSymbol: ApexSymbol,
    targetFQN: string,
    referenceType: ReferenceType,
    location: SymbolLocation,
  ): void {
    if (!this.deferredReferences.has(targetFQN)) {
      this.deferredReferences.set(targetFQN, []);
    }

    this.deferredReferences.get(targetFQN)!.push({
      sourceSymbol,
      referenceType,
      location,
    });
  }

  // Find all references to a symbol
  findReferencesTo(targetSymbol: ApexSymbol): ReferenceEdge[] {
    const targetVertex = this.symbolToVertex.get(targetSymbol.fqn);
    if (!targetVertex) return [];

    return this.referenceGraph.getIncomingEdges(targetVertex) || [];
  }

  // Find all references from a symbol
  findReferencesFrom(sourceSymbol: ApexSymbol): ReferenceEdge[] {
    const sourceVertex = this.symbolToVertex.get(sourceSymbol.fqn);
    if (!sourceVertex) return [];

    return this.referenceGraph.getOutgoingEdges(sourceVertex) || [];
  }

  // Get all symbols that reference a specific symbol
  getReferencingSymbols(targetSymbol: ApexSymbol): ApexSymbol[] {
    const edges = this.findReferencesTo(targetSymbol);
    return edges
      .map((edge) => {
        const vertex = this.referenceGraph.getVertex(edge.src);
        return vertex?.value;
      })
      .filter(Boolean) as ApexSymbol[];
  }
}
```

#### 6.2 Inheritance Graph for Type Relationships

```typescript
interface InheritanceEdge {
  type: 'extends' | 'implements';
  sourceFile: string;
  targetFile?: string;
}

class InheritanceGraph {
  private inheritanceGraph: DirectedGraph<TypeSymbol, InheritanceEdge> =
    new DirectedGraph();
  private globalRegistry: GlobalSymbolRegistry;

  constructor(globalRegistry: GlobalSymbolRegistry) {
    this.globalRegistry = globalRegistry;
  }

  // Add inheritance relationship
  addInheritance(
    childType: TypeSymbol,
    parentFQN: string,
    type: 'extends' | 'implements',
  ): void {
    // Try to resolve parent immediately
    const parentType = this.globalRegistry.resolveSymbol(parentFQN);

    if (parentType && isTypeSymbol(parentType)) {
      // Direct inheritance edge
      this.inheritanceGraph.createEdge(childType.fqn, parentType.fqn, 1, {
        type,
        sourceFile: childType.key.path[0],
        targetFile: parentType.key.path[0],
      });
    } else {
      // Deferred inheritance (for lazy loading)
      this.addDeferredInheritance(childType, parentFQN, type);
    }
  }

  // Resolve inheritance chain with graph traversal
  async resolveInheritanceChain(typeSymbol: TypeSymbol): Promise<TypeSymbol[]> {
    const chain: TypeSymbol[] = [];
    let current = typeSymbol;

    while (current) {
      chain.push(current);

      // Find parent in inheritance graph
      const parentEdges = this.inheritanceGraph.getOutgoingEdges(current.fqn);
      if (parentEdges.length === 0) break;

      // Get first parent (Apex doesn't support multiple inheritance)
      const parentEdge = parentEdges[0];
      const parentFQN = parentEdge.dest;

      // Resolve parent (may trigger lazy loading)
      current = await this.globalRegistry.resolveSymbol(parentFQN);
      if (!current || !isTypeSymbol(current)) break;
    }

    return chain;
  }

  // Find all subtypes of a given type
  findSubtypes(parentType: TypeSymbol): TypeSymbol[] {
    const subtypes: TypeSymbol[] = [];
    const incomingEdges = this.inheritanceGraph.getIncomingEdges(
      parentType.fqn,
    );

    for (const edge of incomingEdges) {
      const subtype = this.globalRegistry.resolveSymbol(edge.src);
      if (subtype && isTypeSymbol(subtype)) {
        subtypes.push(subtype);
      }
    }

    return subtypes;
  }
}
```

#### 6.3 Method Resolution Graph for Override Detection

```typescript
interface MethodEdge {
  type: 'override' | 'implementation' | 'overload';
  sourceFile: string;
  targetFile?: string;
}

class MethodResolutionGraph {
  private methodGraph: DirectedGraph<MethodSymbol, MethodEdge> =
    new DirectedGraph();
  private globalRegistry: GlobalSymbolRegistry;

  constructor(globalRegistry: GlobalSymbolRegistry) {
    this.globalRegistry = globalRegistry;
  }

  // Track method overrides and implementations
  addMethodOverride(
    childMethod: MethodSymbol,
    parentMethodFQN: string,
    overrideType: 'override' | 'implementation',
  ): void {
    const parentMethod = this.globalRegistry.resolveSymbol(parentMethodFQN);

    if (parentMethod && isMethodSymbol(parentMethod)) {
      this.methodGraph.createEdge(childMethod.fqn, parentMethod.fqn, 1, {
        type: overrideType,
        sourceFile: childMethod.key.path[0],
        targetFile: parentMethod.key.path[0],
      });
    }
  }

  // Find all overrides of a method
  findMethodOverrides(methodSymbol: MethodSymbol): MethodSymbol[] {
    const overrides: MethodSymbol[] = [];
    const incomingEdges = this.methodGraph.getIncomingEdges(methodSymbol.fqn);

    for (const edge of incomingEdges) {
      if (edge.value.type === 'override') {
        const overrideMethod = this.globalRegistry.resolveSymbol(edge.src);
        if (overrideMethod && isMethodSymbol(overrideMethod)) {
          overrides.push(overrideMethod);
        }
      }
    }

    return overrides;
  }

  // Find method implementations in inheritance chain
  async findMethodImplementations(
    methodName: string,
    targetType: TypeSymbol,
  ): Promise<MethodSymbol[]> {
    const implementations: MethodSymbol[] = [];
    const inheritanceChain =
      await this.inheritanceGraph.resolveInheritanceChain(targetType);

    for (const type of inheritanceChain) {
      const methods = this.findMethodsInType(type, methodName);
      implementations.push(...methods);
    }

    return implementations;
  }
}
```

#### 6.4 Dependency Analysis with Graph Algorithms

```typescript
interface DependencyEdge {
  type: 'imports' | 'extends' | 'implements' | 'uses';
  strength: number; // 1-10 scale for dependency strength
}

class DependencyAnalyzer {
  private dependencyGraph: DirectedGraph<ApexSymbol, DependencyEdge> =
    new DirectedGraph();

  // Analyze circular dependencies
  detectCircularDependencies(): CircularDependency[] {
    const cycles: CircularDependency[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const vertex of this.dependencyGraph.getAllVertices()) {
      if (!visited.has(vertex.key)) {
        this.dfsDetectCycles(vertex.key, visited, recursionStack, cycles, []);
      }
    }

    return cycles;
  }

  // Find all dependencies of a symbol
  findDependencies(symbol: ApexSymbol): ApexSymbol[] {
    const dependencies: ApexSymbol[] = [];
    const outgoingEdges = this.dependencyGraph.getOutgoingEdges(symbol.fqn);

    for (const edge of outgoingEdges) {
      const dependency = this.globalRegistry.resolveSymbol(edge.dest);
      if (dependency) {
        dependencies.push(dependency);
      }
    }

    return dependencies;
  }

  // Find all symbols that depend on a given symbol
  findDependents(symbol: ApexSymbol): ApexSymbol[] {
    const dependents: ApexSymbol[] = [];
    const incomingEdges = this.dependencyGraph.getIncomingEdges(symbol.fqn);

    for (const edge of incomingEdges) {
      const dependent = this.globalRegistry.resolveSymbol(edge.src);
      if (dependent) {
        dependents.push(dependent);
      }
    }

    return dependents;
  }

  // Calculate dependency impact when a symbol changes
  calculateImpact(symbol: ApexSymbol): ImpactAnalysis {
    const affectedSymbols = new Set<ApexSymbol>();
    const queue = [symbol];

    while (queue.length > 0) {
      const current = queue.shift()!;
      affectedSymbols.add(current);

      const dependents = this.findDependents(current);
      for (const dependent of dependents) {
        if (!affectedSymbols.has(dependent)) {
          queue.push(dependent);
        }
      }
    }

    return {
      affectedSymbols: Array.from(affectedSymbols),
      impactScore: affectedSymbols.size,
      criticalPaths: this.findCriticalPaths(symbol),
    };
  }
}
```

#### 6.5 Enhanced SymbolTable Integration

```typescript
class SymbolTable {
  // Existing scope-based structure
  private root: SymbolScope;
  private current: SymbolScope;
  private symbolMap: HashMap<string, ApexSymbol> = new HashMap();

  // NEW: Graph-based cross-reference tracking
  private crossReferenceGraph: CrossReferenceGraph;
  private inheritanceGraph: InheritanceGraph;
  private methodResolutionGraph: MethodResolutionGraph;
  private dependencyAnalyzer: DependencyAnalyzer;
  private globalRegistry: GlobalSymbolRegistry;

  constructor(globalRegistry?: GlobalSymbolRegistry) {
    // ... existing initialization
    this.globalRegistry = globalRegistry;

    // Initialize graph components
    this.crossReferenceGraph = new CrossReferenceGraph();
    this.inheritanceGraph = new InheritanceGraph(globalRegistry);
    this.methodResolutionGraph = new MethodResolutionGraph(globalRegistry);
    this.dependencyAnalyzer = new DependencyAnalyzer();
  }

  // ENHANCED: Add symbol with cross-reference tracking
  addSymbol(symbol: ApexSymbol): void {
    // Existing local registration
    this.current.addSymbol(symbol);
    this.symbolMap.set(this.keyToString(symbol.key), symbol);

    // NEW: Register with global registry
    if (this.globalRegistry) {
      this.globalRegistry.registerSymbol(symbol, this.filePath);
    }

    // NEW: Add to all graph components
    this.crossReferenceGraph.addSymbol(symbol);

    // Handle inheritance relationships
    if (isTypeSymbol(symbol)) {
      if (symbol.superClass) {
        this.inheritanceGraph.addInheritance(
          symbol,
          symbol.superClass,
          'extends',
        );
      }
      for (const interfaceName of symbol.interfaces) {
        this.inheritanceGraph.addInheritance(
          symbol,
          interfaceName,
          'implements',
        );
      }
    }
  }

  // NEW: Track cross-file references
  addCrossFileReference(
    sourceSymbol: ApexSymbol,
    targetFQN: string,
    referenceType: ReferenceType,
    location: SymbolLocation,
  ): void {
    // Try to resolve target symbol
    const targetSymbol = this.globalRegistry?.resolveSymbol(targetFQN);

    if (targetSymbol) {
      // Direct reference tracking
      this.crossReferenceGraph.addReference(
        sourceSymbol,
        targetSymbol,
        referenceType,
        location,
      );
    } else {
      // Deferred reference tracking (for lazy loading)
      this.crossReferenceGraph.addDeferredReference(
        sourceSymbol,
        targetFQN,
        referenceType,
        location,
      );
    }
  }

  // NEW: Find all references to a symbol
  findReferencesTo(symbol: ApexSymbol): ReferenceEdge[] {
    return this.crossReferenceGraph.findReferencesTo(symbol);
  }

  // NEW: Get inheritance chain
  async getInheritanceChain(typeSymbol: TypeSymbol): Promise<TypeSymbol[]> {
    return this.inheritanceGraph.resolveInheritanceChain(typeSymbol);
  }

  // NEW: Analyze dependencies
  analyzeDependencies(symbol: ApexSymbol): ImpactAnalysis {
    return this.dependencyAnalyzer.calculateImpact(symbol);
  }
}
```

#### 6.6 Benefits of Graph-Based Approach

1. **Efficient Reference Tracking**: O(1) lookup for references using graph adjacency
2. **Inheritance Chain Resolution**: Graph traversal for complex inheritance scenarios
3. **Circular Dependency Detection**: Built-in cycle detection algorithms
4. **Method Override Analysis**: Clear tracking of override relationships
5. **Dependency Analysis**: Easy identification of affected symbols when files change
6. **Lazy Loading Integration**: Deferred edges that resolve when symbols are loaded
7. **Impact Analysis**: Calculate the scope of changes when symbols are modified
8. **Reference Navigation**: Efficient "Find All References" and "Go to Definition" operations

### 7. Unresolved Symbol Strategy

Both map-based and graph-based approaches need a strategy for handling unresolved symbols in a lazy loading environment. When a source file references an external symbol that hasn't been loaded yet, the system must decide how to represent and track these references.

#### 7.1 Unresolved Symbol Representation

```typescript
interface UnresolvedSymbol {
  fqn: string;
  kind: SymbolKind;
  sourceFile: string;
  references: UnresolvedReference[];
  lastResolveAttempt?: Date;
  resolveAttempts: number;
  confidence: 'high' | 'medium' | 'low'; // Based on context clues
}

interface UnresolvedReference {
  sourceSymbol: ApexSymbol;
  referenceType: ReferenceType;
  location: SymbolLocation;
  context: ReferenceContext;
}

interface ReferenceContext {
  expectedType?: TypeInfo;
  methodSignature?: string;
  parameterIndex?: number;
  isStatic?: boolean;
  namespace?: string;
}
```

#### 7.2 Strategy Options for Unresolved References

##### **Strategy A: Deferred Edge Creation (Recommended)**

```typescript
class DeferredReferenceManager {
  private deferredEdges: Map<string, DeferredEdge[]> = new Map();
  private unresolvedSymbols: Map<string, UnresolvedSymbol> = new Map();

  // Create deferred reference when target is unknown
  addDeferredReference(
    sourceSymbol: ApexSymbol,
    targetFQN: string,
    referenceType: ReferenceType,
    location: SymbolLocation,
    context: ReferenceContext,
  ): void {
    // Store the reference for later resolution
    if (!this.deferredEdges.has(targetFQN)) {
      this.deferredEdges.set(targetFQN, []);
    }

    this.deferredEdges.get(targetFQN)!.push({
      sourceSymbol,
      referenceType,
      location,
      context,
    });

    // Create or update unresolved symbol entry
    this.ensureUnresolvedSymbol(targetFQN, sourceSymbol, context);
  }

  // Resolve deferred references when symbol becomes available
  resolveDeferredReferences(resolvedSymbol: ApexSymbol): void {
    const deferredEdges = this.deferredEdges.get(resolvedSymbol.fqn);
    if (!deferredEdges) return;

    for (const edge of deferredEdges) {
      // Create actual graph edge
      this.crossReferenceGraph.addReference(
        edge.sourceSymbol,
        resolvedSymbol,
        edge.referenceType,
        edge.location,
      );

      // Validate reference context
      this.validateReferenceContext(edge, resolvedSymbol);
    }

    // Clean up resolved references
    this.deferredEdges.delete(resolvedSymbol.fqn);
    this.unresolvedSymbols.delete(resolvedSymbol.fqn);
  }

  // Validate that resolved symbol matches expected context
  private validateReferenceContext(
    edge: DeferredEdge,
    resolvedSymbol: ApexSymbol,
  ): ValidationResult {
    const context = edge.context;
    const errors: ValidationError[] = [];

    // Type validation
    if (
      context.expectedType &&
      !this.isTypeCompatible(resolvedSymbol, context.expectedType)
    ) {
      errors.push({
        type: 'type-mismatch',
        message: `Expected ${context.expectedType.name}, got ${resolvedSymbol.kind}`,
        location: edge.location,
      });
    }

    // Method signature validation
    if (context.methodSignature && isMethodSymbol(resolvedSymbol)) {
      if (
        !this.isMethodSignatureCompatible(
          resolvedSymbol,
          context.methodSignature,
        )
      ) {
        errors.push({
          type: 'signature-mismatch',
          message: `Method signature mismatch for ${resolvedSymbol.name}`,
          location: edge.location,
        });
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}
```

##### **Strategy B: Placeholder Symbol Creation**

```typescript
class PlaceholderSymbolManager {
  // Create placeholder symbols for unresolved references
  createPlaceholderSymbol(
    fqn: string,
    context: ReferenceContext,
    sourceFile: string,
  ): ApexSymbol {
    const placeholder: ApexSymbol = {
      name: this.extractNameFromFQN(fqn),
      kind: this.inferSymbolKind(context),
      location: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
      modifiers: this.createDefaultModifiers(),
      key: this.createSymbolKey(fqn),
      parentKey: null,
      fqn: fqn,
      isPlaceholder: true, // NEW: Flag to identify placeholder symbols
      placeholderContext: context,
    };

    // Add to graph with placeholder flag
    this.crossReferenceGraph.addPlaceholderSymbol(placeholder);

    return placeholder;
  }

  // Replace placeholder with actual symbol when resolved
  replacePlaceholder(placeholderFQN: string, actualSymbol: ApexSymbol): void {
    const placeholder =
      this.crossReferenceGraph.getPlaceholderSymbol(placeholderFQN);
    if (!placeholder) return;

    // Transfer all references from placeholder to actual symbol
    const references = this.crossReferenceGraph.findReferencesTo(placeholder);
    for (const ref of references) {
      this.crossReferenceGraph.addReference(
        ref.sourceSymbol,
        actualSymbol,
        ref.type,
        ref.location,
      );
    }

    // Remove placeholder and add actual symbol
    this.crossReferenceGraph.removePlaceholderSymbol(placeholderFQN);
    this.crossReferenceGraph.addSymbol(actualSymbol);
  }
}
```

##### **Strategy C: Hybrid Approach (Most Flexible)**

```typescript
class HybridUnresolvedStrategy {
  private deferredManager: DeferredReferenceManager;
  private placeholderManager: PlaceholderSymbolManager;
  private confidenceThreshold: number = 0.7;

  // Choose strategy based on confidence and context
  handleUnresolvedReference(
    sourceSymbol: ApexSymbol,
    targetFQN: string,
    referenceType: ReferenceType,
    location: SymbolLocation,
    context: ReferenceContext,
  ): void {
    const confidence = this.calculateConfidence(targetFQN, context);

    if (confidence >= this.confidenceThreshold) {
      // High confidence: Create placeholder for immediate use
      const placeholder = this.placeholderManager.createPlaceholderSymbol(
        targetFQN,
        context,
        sourceSymbol.key.path[0],
      );

      this.crossReferenceGraph.addReference(
        sourceSymbol,
        placeholder,
        referenceType,
        location,
      );
    } else {
      // Low confidence: Use deferred resolution
      this.deferredManager.addDeferredReference(
        sourceSymbol,
        targetFQN,
        referenceType,
        location,
        context,
      );
    }
  }

  // Calculate confidence based on context clues
  private calculateConfidence(fqn: string, context: ReferenceContext): number {
    let confidence = 0.5; // Base confidence

    // Namespace matching
    if (context.namespace && fqn.startsWith(context.namespace)) {
      confidence += 0.2;
    }

    // Type compatibility hints
    if (context.expectedType) {
      confidence += 0.1;
    }

    // Method signature hints
    if (context.methodSignature) {
      confidence += 0.1;
    }

    // Static context hints
    if (context.isStatic !== undefined) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }
}
```

#### 7.3 Context-Aware Resolution Strategies

##### **Type-Specific Strategies**

```typescript
class ContextAwareResolver {
  // Different strategies for different reference types

  handleMethodCall(
    sourceSymbol: ApexSymbol,
    targetFQN: string,
    methodName: string,
    arguments: TypeInfo[],
    location: SymbolLocation,
  ): void {
    const context: ReferenceContext = {
      expectedType: this.inferTargetType(sourceSymbol),
      methodSignature: this.createMethodSignature(methodName, arguments),
      isStatic: this.isStaticContext(sourceSymbol),
    };

    this.hybridStrategy.handleUnresolvedReference(
      sourceSymbol,
      targetFQN,
      ReferenceType.METHOD_CALL,
      location,
      context,
    );
  }

  handleTypeReference(
    sourceSymbol: ApexSymbol,
    targetFQN: string,
    expectedType: TypeInfo,
    location: SymbolLocation,
  ): void {
    const context: ReferenceContext = {
      expectedType: expectedType,
      namespace: this.extractNamespace(targetFQN),
    };

    this.hybridStrategy.handleUnresolvedReference(
      sourceSymbol,
      targetFQN,
      ReferenceType.TYPE_REFERENCE,
      location,
      context,
    );
  }

  handleInheritance(
    childType: TypeSymbol,
    parentFQN: string,
    inheritanceType: 'extends' | 'implements',
  ): void {
    const context: ReferenceContext = {
      expectedType: {
        name: 'class',
        isPrimitive: false,
        isArray: false,
        isCollection: false,
        originalTypeString: parentFQN,
      },
      namespace: this.extractNamespace(parentFQN),
    };

    // Inheritance references are always high confidence
    const placeholder = this.placeholderManager.createPlaceholderSymbol(
      parentFQN,
      context,
      childType.key.path[0],
    );

    this.inheritanceGraph.addInheritance(
      childType,
      placeholder,
      inheritanceType,
    );
  }
}
```

#### 7.4 Resolution Triggers and Priorities

```typescript
class ResolutionScheduler {
  private resolutionQueue: PriorityQueue<ResolutionTask> = new PriorityQueue();
  private activeResolutions: Set<string> = new Set();

  // Schedule resolution based on priority
  scheduleResolution(
    targetFQN: string,
    priority: ResolutionPriority,
    trigger: ResolutionTrigger,
  ): void {
    const task: ResolutionTask = {
      targetFQN,
      priority,
      trigger,
      timestamp: Date.now(),
    };

    this.resolutionQueue.enqueue(task, this.calculatePriority(task));
  }

  // Priority calculation based on multiple factors
  private calculatePriority(task: ResolutionTask): number {
    let priority = task.priority.basePriority;

    // Boost priority for user-initiated actions
    if (task.trigger === 'user-action') {
      priority += 1000;
    }

    // Boost priority for symbols with many references
    const referenceCount = this.getUnresolvedReferenceCount(task.targetFQN);
    priority += referenceCount * 10;

    // Reduce priority for frequently failed resolutions
    const failureCount = this.getResolutionFailureCount(task.targetFQN);
    priority -= failureCount * 50;

    return Math.max(priority, 1);
  }

  // Process resolution queue
  async processResolutionQueue(): Promise<void> {
    while (!this.resolutionQueue.isEmpty() && this.activeResolutions.size < 5) {
      const task = this.resolutionQueue.dequeue();
      if (!task) break;

      if (this.activeResolutions.has(task.targetFQN)) continue;

      this.activeResolutions.add(task.targetFQN);

      try {
        await this.resolveSymbol(task.targetFQN);
      } catch (error) {
        this.handleResolutionFailure(task.targetFQN, error);
      } finally {
        this.activeResolutions.delete(task.targetFQN);
      }
    }
  }
}

enum ResolutionPriority {
  CRITICAL = 1000, // User-initiated actions
  HIGH = 500, // Type checking, diagnostics
  MEDIUM = 200, // Background analysis
  LOW = 50, // Prefetching, optimization
}

enum ResolutionTrigger {
  USER_ACTION = 'user-action',
  TYPE_CHECKING = 'type-checking',
  DIAGNOSTICS = 'diagnostics',
  BACKGROUND = 'background',
  PREFETCH = 'prefetch',
}
```

#### 7.5 Benefits of Unresolved Symbol Strategy

1. **Immediate Feedback**: Placeholder symbols provide instant reference tracking
2. **Context Preservation**: Rich context information improves resolution accuracy
3. **Graceful Degradation**: System continues working even with unresolved symbols
4. **Intelligent Prioritization**: Resolution based on user needs and symbol importance
5. **Validation on Resolution**: Context validation when symbols become available
6. **Memory Efficiency**: Deferred references use minimal memory until resolved
7. **User Experience**: Smooth operation without blocking on external dependencies

### 8. Namespace Ambiguity Resolution

Apex's namespace system creates unique challenges for unresolved symbol tracking. The same class name can exist in multiple namespaces (built-in Apex, user-defined, managed packages), making symbol resolution inherently ambiguous without explicit namespace qualification.

#### 8.1 Namespace Ambiguity Challenges

```typescript
// Example scenarios that create ambiguity:

// 1. Built-in Apex class vs User-defined class
System.debug('Hello'); // Built-in System class
System mySystem = new System(); // User-defined System class

// 2. Multiple managed packages with same class name
ManagedPkg1.System pkg1System = new ManagedPkg1.System();
ManagedPkg2.System pkg2System = new ManagedPkg2.System();

// 3. Implicit vs Explicit namespace usage
List<String> strings = new List<String>(); // Implicit Apex namespace
MyNamespace.List<String> myStrings = new MyNamespace.List<String>(); // Explicit namespace

// 4. Shadowing of built-in classes
public class System { // Shadows built-in System class
    public static void debug(String message) {
        // Custom implementation
    }
}
```

#### 8.2 Namespace-Aware Symbol Resolution

```typescript
interface NamespaceContext {
  currentNamespace?: string;
  importedNamespaces: Set<string>;
  managedPackageNamespaces: Set<string>;
  shadowedBuiltInClasses: Set<string>;
  explicitNamespaceUsage: Map<string, string>; // className -> namespace
}

class NamespaceAwareResolver {
  private namespaceContext: NamespaceContext;
  private builtInClasses: Set<string> = new Set([
    'System',
    'List',
    'Set',
    'Map',
    'String',
    'Integer',
    'Boolean',
    'Double',
    'Date',
    'DateTime',
    'Time',
    'Blob',
    'Id',
    'Object',
    'Exception',
  ]);

  // Resolve symbol with namespace awareness
  async resolveSymbolWithNamespace(
    symbolName: string,
    context: ResolutionContext,
    namespaceContext: NamespaceContext,
  ): Promise<SymbolResolutionResult> {
    const candidates = await this.findNamespaceCandidates(
      symbolName,
      namespaceContext,
    );

    if (candidates.length === 0) {
      return this.createUnresolvedSymbol(symbolName, context, namespaceContext);
    }

    if (candidates.length === 1) {
      return { symbol: candidates[0], confidence: 'high' };
    }

    // Multiple candidates - need disambiguation
    return this.disambiguateCandidates(candidates, context, namespaceContext);
  }

  // Find all possible candidates for a symbol name
  private async findNamespaceCandidates(
    symbolName: string,
    namespaceContext: NamespaceContext,
  ): Promise<ApexSymbol[]> {
    const candidates: ApexSymbol[] = [];

    // 1. Check current namespace first
    if (namespaceContext.currentNamespace) {
      const currentNamespaceSymbol = await this.globalRegistry.resolveSymbol(
        `${namespaceContext.currentNamespace}.${symbolName}`,
      );
      if (currentNamespaceSymbol) {
        candidates.push(currentNamespaceSymbol);
      }
    }

    // 2. Check built-in Apex classes (unless shadowed)
    if (
      this.builtInClasses.has(symbolName) &&
      !namespaceContext.shadowedBuiltInClasses.has(symbolName)
    ) {
      const builtInSymbol = await this.globalRegistry.resolveSymbol(symbolName);
      if (builtInSymbol) {
        candidates.push(builtInSymbol);
      }
    }

    // 3. Check imported namespaces
    for (const importedNamespace of namespaceContext.importedNamespaces) {
      const importedSymbol = await this.globalRegistry.resolveSymbol(
        `${importedNamespace}.${symbolName}`,
      );
      if (importedSymbol) {
        candidates.push(importedSymbol);
      }
    }

    // 4. Check managed package namespaces
    for (const managedNamespace of namespaceContext.managedPackageNamespaces) {
      const managedSymbol = await this.globalRegistry.resolveSymbol(
        `${managedNamespace}.${symbolName}`,
      );
      if (managedSymbol) {
        candidates.push(managedSymbol);
      }
    }

    return candidates;
  }

  // Disambiguate between multiple candidates
  private disambiguateCandidates(
    candidates: ApexSymbol[],
    context: ResolutionContext,
    namespaceContext: NamespaceContext,
  ): SymbolResolutionResult {
    // 1. Check for explicit namespace usage in context
    const explicitNamespace = namespaceContext.explicitNamespaceUsage.get(
      context.symbolName,
    );
    if (explicitNamespace) {
      const explicitCandidate = candidates.find((c) =>
        c.fqn?.startsWith(`${explicitNamespace}.`),
      );
      if (explicitCandidate) {
        return { symbol: explicitCandidate, confidence: 'high' };
      }
    }

    // 2. Use type context to disambiguate
    if (context.expectedType) {
      const typeCompatibleCandidates = candidates.filter((c) =>
        this.isTypeCompatible(c, context.expectedType!),
      );
      if (typeCompatibleCandidates.length === 1) {
        return { symbol: typeCompatibleCandidates[0], confidence: 'medium' };
      }
    }

    // 3. Use method signature context
    if (context.methodSignature) {
      const signatureCompatibleCandidates = candidates.filter((c) =>
        this.isMethodSignatureCompatible(c, context.methodSignature!),
      );
      if (signatureCompatibleCandidates.length === 1) {
        return {
          symbol: signatureCompatibleCandidates[0],
          confidence: 'medium',
        };
      }
    }

    // 4. Prefer built-in classes over user-defined (unless shadowed)
    const builtInCandidate = candidates.find(
      (c) =>
        this.builtInClasses.has(c.name) &&
        !namespaceContext.shadowedBuiltInClasses.has(c.name),
    );
    if (builtInCandidate) {
      return { symbol: builtInCandidate, confidence: 'low' };
    }

    // 5. Return all candidates for user disambiguation
    return {
      candidates,
      confidence: 'ambiguous',
      requiresUserDisambiguation: true,
    };
  }
}
```

#### 8.3 Namespace-Aware Unresolved Symbol Tracking

```typescript
interface NamespaceAwareUnresolvedSymbol extends UnresolvedSymbol {
  namespaceCandidates: string[];
  disambiguationContext: DisambiguationContext;
  shadowingInfo?: ShadowingInfo;
}

interface DisambiguationContext {
  explicitNamespace?: string;
  typeContext?: TypeInfo;
  methodContext?: string;
  usagePattern: 'static' | 'instance' | 'constructor' | 'type-reference';
  sourceFile: string;
  lineNumber: number;
}

interface ShadowingInfo {
  shadowedBuiltInClass: string;
  userDefinedClass: string;
  shadowingFile: string;
  shadowingLine: number;
}

class NamespaceAwareUnresolvedManager {
  private namespaceUnresolvedSymbols: Map<
    string,
    NamespaceAwareUnresolvedSymbol[]
  > = new Map();
  private shadowingDetector: ShadowingDetector;

  // Handle unresolved symbol with namespace awareness
  handleNamespaceUnresolvedSymbol(
    symbolName: string,
    context: ResolutionContext,
    namespaceContext: NamespaceContext,
  ): void {
    // 1. Detect shadowing of built-in classes
    const shadowingInfo = this.shadowingDetector.detectShadowing(
      symbolName,
      context.sourceFile,
      namespaceContext,
    );

    // 2. Find all possible namespace candidates
    const candidates = this.findNamespaceCandidates(
      symbolName,
      namespaceContext,
    );

    // 3. Create namespace-aware unresolved symbol
    const unresolvedSymbol: NamespaceAwareUnresolvedSymbol = {
      fqn: symbolName, // Base name without namespace
      kind: this.inferSymbolKind(context),
      sourceFile: context.sourceFile,
      references: [
        {
          sourceSymbol: context.sourceSymbol,
          referenceType: context.referenceType,
          location: context.location,
          context: context.context,
        },
      ],
      namespaceCandidates: candidates,
      disambiguationContext: {
        explicitNamespace: context.context.namespace,
        typeContext: context.context.expectedType,
        methodContext: context.context.methodSignature,
        usagePattern: this.determineUsagePattern(context),
        sourceFile: context.sourceFile,
        lineNumber: context.location.startLine,
      },
      shadowingInfo,
      confidence: this.calculateNamespaceConfidence(candidates, context),
    };

    // 4. Store for later resolution
    this.storeNamespaceUnresolvedSymbol(unresolvedSymbol);
  }

  // Detect when user-defined classes shadow built-in classes
  private detectShadowing(
    symbolName: string,
    sourceFile: string,
    namespaceContext: NamespaceContext,
  ): ShadowingInfo | undefined {
    if (!this.builtInClasses.has(symbolName)) return undefined;

    // Check if there's a user-defined class with the same name
    const userDefinedClass = this.findUserDefinedClass(symbolName, sourceFile);
    if (userDefinedClass) {
      return {
        shadowedBuiltInClass: symbolName,
        userDefinedClass: userDefinedClass.fqn,
        shadowingFile: sourceFile,
        shadowingLine: userDefinedClass.location.startLine,
      };
    }

    return undefined;
  }

  // Resolve namespace-unresolved symbols when new information becomes available
  async resolveNamespaceUnresolvedSymbols(
    resolvedSymbol: ApexSymbol,
    namespaceContext: NamespaceContext,
  ): Promise<void> {
    const unresolvedSymbols = this.namespaceUnresolvedSymbols.get(
      resolvedSymbol.name,
    );
    if (!unresolvedSymbols) return;

    for (const unresolved of unresolvedSymbols) {
      // Check if this resolved symbol matches any of the candidates
      if (unresolved.namespaceCandidates.includes(resolvedSymbol.fqn)) {
        await this.resolveUnresolvedSymbol(unresolved, resolvedSymbol);
      }
    }
  }

  // Provide namespace disambiguation suggestions
  getNamespaceDisambiguationSuggestions(
    symbolName: string,
    context: DisambiguationContext,
  ): DisambiguationSuggestion[] {
    const suggestions: DisambiguationSuggestion[] = [];

    // 1. Suggest explicit namespace qualification
    const candidates = this.findNamespaceCandidates(symbolName, context);
    for (const candidate of candidates) {
      suggestions.push({
        type: 'explicit-namespace',
        symbol: candidate,
        suggestion: `Use ${candidate.fqn} instead of ${symbolName}`,
        confidence: this.calculateSuggestionConfidence(candidate, context),
      });
    }

    // 2. Suggest import statements
    if (context.explicitNamespace) {
      suggestions.push({
        type: 'import-statement',
        namespace: context.explicitNamespace,
        suggestion: `Add import ${context.explicitNamespace};`,
        confidence: 'medium',
      });
    }

    // 3. Suggest renaming shadowed classes
    if (context.shadowingInfo) {
      suggestions.push({
        type: 'rename-suggestion',
        oldName: context.shadowingInfo.shadowedBuiltInClass,
        newName: `${context.shadowingInfo.shadowedBuiltInClass}Custom`,
        suggestion: `Rename class to avoid shadowing built-in ${context.shadowingInfo.shadowedBuiltInClass}`,
        confidence: 'high',
      });
    }

    return suggestions.sort(
      (a, b) =>
        this.getConfidenceScore(b.confidence) -
        this.getConfidenceScore(a.confidence),
    );
  }
}
```

#### 8.4 Namespace Resolution Strategies

```typescript
enum NamespaceResolutionStrategy {
  EXPLICIT_ONLY = 'explicit-only', // Only resolve with explicit namespace
  BUILT_IN_PREFERRED = 'built-in-preferred', // Prefer built-in classes
  CONTEXT_AWARE = 'context-aware', // Use context to disambiguate
  USER_DISAMBIGUATION = 'user-disambiguation', // Require user choice
}

class NamespaceResolutionManager {
  private strategy: NamespaceResolutionStrategy;
  private namespaceContext: NamespaceContext;

  constructor(strategy: NamespaceResolutionStrategy) {
    this.strategy = strategy;
  }

  // Resolve symbol based on chosen strategy
  async resolveSymbol(
    symbolName: string,
    context: ResolutionContext,
  ): Promise<SymbolResolutionResult> {
    switch (this.strategy) {
      case NamespaceResolutionStrategy.EXPLICIT_ONLY:
        return this.resolveExplicitOnly(symbolName, context);

      case NamespaceResolutionStrategy.BUILT_IN_PREFERRED:
        return this.resolveBuiltInPreferred(symbolName, context);

      case NamespaceResolutionStrategy.CONTEXT_AWARE:
        return this.resolveContextAware(symbolName, context);

      case NamespaceResolutionStrategy.USER_DISAMBIGUATION:
        return this.resolveWithUserDisambiguation(symbolName, context);

      default:
        return this.resolveContextAware(symbolName, context);
    }
  }

  // Strategy: Only resolve symbols with explicit namespace
  private async resolveExplicitOnly(
    symbolName: string,
    context: ResolutionContext,
  ): Promise<SymbolResolutionResult> {
    const explicitNamespace = context.context.namespace;
    if (!explicitNamespace) {
      return {
        confidence: 'ambiguous',
        requiresExplicitNamespace: true,
        suggestion: `Use explicit namespace for ${symbolName}`,
      };
    }

    const symbol = await this.globalRegistry.resolveSymbol(
      `${explicitNamespace}.${symbolName}`,
    );

    return symbol
      ? { symbol, confidence: 'high' }
      : { confidence: 'unresolved' };
  }

  // Strategy: Prefer built-in classes over user-defined
  private async resolveBuiltInPreferred(
    symbolName: string,
    context: ResolutionContext,
  ): Promise<SymbolResolutionResult> {
    // First try built-in class
    if (this.builtInClasses.has(symbolName)) {
      const builtInSymbol = await this.globalRegistry.resolveSymbol(symbolName);
      if (builtInSymbol) {
        return { symbol: builtInSymbol, confidence: 'high' };
      }
    }

    // Then try with explicit namespace
    const explicitNamespace = context.context.namespace;
    if (explicitNamespace) {
      const explicitSymbol = await this.globalRegistry.resolveSymbol(
        `${explicitNamespace}.${symbolName}`,
      );
      if (explicitSymbol) {
        return { symbol: explicitSymbol, confidence: 'high' };
      }
    }

    // Finally, try all candidates and let user choose
    return this.resolveWithUserDisambiguation(symbolName, context);
  }
}
```

#### 8.5 Impact on Unresolved Symbol Strategy

The namespace ambiguity significantly impacts how we handle unresolved symbols:

1. **Multiple Candidates**: Unresolved symbols must track multiple possible namespace candidates
2. **Context-Dependent Resolution**: Resolution depends heavily on usage context and explicit namespace qualification
3. **Shadowing Detection**: Must detect when user-defined classes shadow built-in classes
4. **Disambiguation Support**: Must provide suggestions for resolving ambiguous references
5. **Confidence Levels**: Confidence in resolution varies based on namespace context

#### 8.6 Recommended Approach for Namespace-Aware Unresolved Symbols

1. **Track All Candidates**: Store all possible namespace candidates for unresolved symbols
2. **Context-Aware Resolution**: Use type context, method signatures, and usage patterns to disambiguate
3. **Explicit Namespace Preference**: Prefer explicitly qualified namespaces over implicit ones
4. **Shadowing Detection**: Detect and warn about shadowing of built-in classes
5. **User Disambiguation**: Provide clear suggestions when automatic disambiguation fails
6. **Progressive Resolution**: Start with high-confidence resolutions and progressively refine as more context becomes available

### 10. Ambiguous Symbol Resolution in Global Registry

The global symbol registry must handle **ambiguous symbol names** where the same name can exist in multiple contexts (built-in namespaces, user-defined classes, managed packages). This is critical for symbols like `System` which could refer to the built-in `System` namespace or a user-defined `System` class.

#### 10.1 Ambiguous Symbol Storage Strategy

```typescript
interface AmbiguousSymbolEntry {
  symbolName: string;
  candidates: SymbolCandidate[];
  defaultCandidate?: SymbolCandidate; // Most likely candidate based on usage patterns
  confidence: number; // 0-1 confidence in default candidate
}

interface SymbolCandidate {
  symbol: ApexSymbol;
  filePath: string;
  namespace?: string;
  context: SymbolContext;
  usageCount: number;
  lastUsed: number;
  confidence: number; // 0-1 confidence based on context
}

interface SymbolContext {
  isBuiltIn: boolean;
  isManagedPackage: boolean;
  isUserDefined: boolean;
  namespace: string;
  visibility: SymbolVisibility;
  isStatic: boolean;
}

class AmbiguousSymbolRegistry {
  private ambiguousSymbols: Map<string, AmbiguousSymbolEntry> = new Map();
  private symbolToFiles: Map<string, Set<string>> = new Map();
  private fileToSymbols: Map<string, Set<string>> = new Map();

  // Register a symbol with potential ambiguity
  registerSymbol(symbol: ApexSymbol, filePath: string): void {
    const symbolName = symbol.name;

    // Check if this symbol name is already ambiguous
    if (this.ambiguousSymbols.has(symbolName)) {
      const entry = this.ambiguousSymbols.get(symbolName)!;

      // Add new candidate
      const candidate: SymbolCandidate = {
        symbol,
        filePath,
        namespace: symbol.namespace?.name,
        context: this.createSymbolContext(symbol),
        usageCount: 0,
        lastUsed: Date.now(),
        confidence: this.calculateInitialConfidence(symbol),
      };

      entry.candidates.push(candidate);
      this.updateDefaultCandidate(entry);
    } else {
      // First occurrence of this symbol name
      const candidate: SymbolCandidate = {
        symbol,
        filePath,
        namespace: symbol.namespace?.name,
        context: this.createSymbolContext(symbol),
        usageCount: 0,
        lastUsed: Date.now(),
        confidence: this.calculateInitialConfidence(symbol),
      };

      const entry: AmbiguousSymbolEntry = {
        symbolName,
        candidates: [candidate],
        defaultCandidate: candidate,
        confidence: candidate.confidence,
      };

      this.ambiguousSymbols.set(symbolName, entry);
    }

    // Update file mappings
    this.updateFileMappings(symbolName, filePath);
  }

  // Resolve ambiguous symbol with context
  resolveSymbol(
    symbolName: string,
    context: ResolutionContext,
  ): ApexSymbol | null {
    const entry = this.ambiguousSymbols.get(symbolName);
    if (!entry) return null;

    if (entry.candidates.length === 1) {
      // No ambiguity, return the single candidate
      return entry.candidates[0].symbol;
    }

    // Multiple candidates - use context to disambiguate
    const bestCandidate = this.findBestCandidate(entry.candidates, context);
    if (bestCandidate) {
      // Update usage statistics
      bestCandidate.usageCount++;
      bestCandidate.lastUsed = Date.now();
      this.updateDefaultCandidate(entry);
      return bestCandidate.symbol;
    }

    // Return default candidate if no context match
    return entry.defaultCandidate?.symbol || null;
  }

  // Get all candidates for an ambiguous symbol
  getCandidates(symbolName: string): SymbolCandidate[] {
    const entry = this.ambiguousSymbols.get(symbolName);
    return entry ? [...entry.candidates] : [];
  }

  // Get all files containing a symbol with the given name
  getFilesForSymbol(symbolName: string): string[] {
    const files = this.symbolToFiles.get(symbolName);
    return files ? Array.from(files) : [];
  }

  // Get all symbols in a file
  getSymbolsInFile(filePath: string): string[] {
    const symbols = this.fileToSymbols.get(filePath);
    return symbols ? Array.from(symbols) : [];
  }

  private findBestCandidate(
    candidates: SymbolCandidate[],
    context: ResolutionContext,
  ): SymbolCandidate | null {
    let bestCandidate: SymbolCandidate | null = null;
    let bestScore = -1;

    for (const candidate of candidates) {
      const score = this.calculateContextScore(candidate, context);
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  private calculateContextScore(
    candidate: SymbolCandidate,
    context: ResolutionContext,
  ): number {
    let score = candidate.confidence;

    // Prefer built-in symbols for common operations
    if (context.isCommonOperation && candidate.context.isBuiltIn) {
      score += 0.3;
    }

    // Prefer symbols from the same namespace
    if (
      context.expectedNamespace &&
      candidate.context.namespace === context.expectedNamespace
    ) {
      score += 0.4;
    }

    // Prefer symbols with higher usage count
    score += Math.min(candidate.usageCount / 100, 0.2);

    // Prefer recently used symbols
    const timeSinceLastUse = Date.now() - candidate.lastUsed;
    const recencyBonus = Math.max(
      0,
      1 - timeSinceLastUse / (24 * 60 * 60 * 1000),
    ); // 24 hours
    score += recencyBonus * 0.1;

    return score;
  }

  private updateDefaultCandidate(entry: AmbiguousSymbolEntry): void {
    if (entry.candidates.length === 0) return;

    // Find candidate with highest confidence and usage
    let bestCandidate = entry.candidates[0];
    let bestScore = bestCandidate.confidence + bestCandidate.usageCount / 100;

    for (const candidate of entry.candidates) {
      const score = candidate.confidence + candidate.usageCount / 100;
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    entry.defaultCandidate = bestCandidate;
    entry.confidence = bestScore;
  }

  private createSymbolContext(symbol: ApexSymbol): SymbolContext {
    return {
      isBuiltIn: this.isBuiltInSymbol(symbol),
      isManagedPackage: this.isManagedPackageSymbol(symbol),
      isUserDefined:
        !this.isBuiltInSymbol(symbol) && !this.isManagedPackageSymbol(symbol),
      namespace: symbol.namespace?.name || '',
      visibility: symbol.modifiers.visibility,
      isStatic: symbol.modifiers.isStatic,
    };
  }

  private calculateInitialConfidence(symbol: ApexSymbol): number {
    let confidence = 0.5; // Base confidence

    // Built-in symbols have higher confidence
    if (this.isBuiltInSymbol(symbol)) {
      confidence += 0.3;
    }

    // Global symbols have higher confidence
    if (symbol.modifiers.visibility === SymbolVisibility.Global) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private updateFileMappings(symbolName: string, filePath: string): void {
    // Update symbol to files mapping
    if (!this.symbolToFiles.has(symbolName)) {
      this.symbolToFiles.set(symbolName, new Set());
    }
    this.symbolToFiles.get(symbolName)!.add(filePath);

    // Update file to symbols mapping
    if (!this.fileToSymbols.has(filePath)) {
      this.fileToSymbols.set(filePath, new Set());
    }
    this.fileToSymbols.get(filePath)!.add(symbolName);
  }
}
```

#### 10.2 Enhanced Global Symbol Registry with Ambiguity Support

```typescript
class GlobalSymbolRegistry {
  private unambiguousSymbols: Map<string, ApexSymbol> = new Map();
  private ambiguousSymbolRegistry: AmbiguousSymbolRegistry;
  private fqnToSymbol: Map<string, ApexSymbol> = new Map();

  constructor() {
    this.ambiguousSymbolRegistry = new AmbiguousSymbolRegistry();
  }

  // Register a symbol (handles ambiguity automatically)
  registerSymbol(symbol: ApexSymbol, filePath: string): void {
    const symbolName = symbol.name;
    const fqn = this.calculateFQN(symbol);

    // Always store FQN mapping (unambiguous)
    this.fqnToSymbol.set(fqn, symbol);

    // Check if symbol name is ambiguous
    const existingSymbol = this.unambiguousSymbols.get(symbolName);
    if (existingSymbol) {
      // Symbol name is ambiguous - move to ambiguous registry
      this.unambiguousSymbols.delete(symbolName);
      this.ambiguousSymbolRegistry.registerSymbol(
        existingSymbol,
        this.getFilePath(existingSymbol),
      );
      this.ambiguousSymbolRegistry.registerSymbol(symbol, filePath);
    } else {
      // First occurrence - check if it might become ambiguous
      const potentialAmbiguity = this.checkPotentialAmbiguity(symbolName);
      if (potentialAmbiguity) {
        // Register in ambiguous registry from the start
        this.ambiguousSymbolRegistry.registerSymbol(symbol, filePath);
      } else {
        // Register in unambiguous registry
        this.unambiguousSymbols.set(symbolName, symbol);
      }
    }
  }

  // Resolve symbol with context
  resolveSymbol(
    symbolName: string,
    context?: ResolutionContext,
  ): ApexSymbol | null {
    // First try unambiguous symbols
    const unambiguousSymbol = this.unambiguousSymbols.get(symbolName);
    if (unambiguousSymbol) {
      return unambiguousSymbol;
    }

    // Try ambiguous symbol registry
    return this.ambiguousSymbolRegistry.resolveSymbol(
      symbolName,
      context || {},
    );
  }

  // Resolve by FQN (always unambiguous)
  resolveByFQN(fqn: string): ApexSymbol | null {
    return this.fqnToSymbol.get(fqn) || null;
  }

  // Get all candidates for ambiguous symbol
  getCandidates(symbolName: string): SymbolCandidate[] {
    return this.ambiguousSymbolRegistry.getCandidates(symbolName);
  }

  // Get all files containing a symbol
  getFilesForSymbol(symbolName: string): string[] {
    return this.ambiguousSymbolRegistry.getFilesForSymbol(symbolName);
  }

  // Get all symbols in a file
  getSymbolsInFile(filePath: string): string[] {
    return this.ambiguousSymbolRegistry.getSymbolsInFile(filePath);
  }

  // Check if symbol name has potential for ambiguity
  private checkPotentialAmbiguity(symbolName: string): boolean {
    // Built-in names that users might redefine
    const builtInNames = [
      'System',
      'String',
      'Integer',
      'Boolean',
      'Object',
      'List',
      'Set',
      'Map',
    ];
    return builtInNames.includes(symbolName);
  }

  private calculateFQN(symbol: ApexSymbol): string {
    // Implementation of FQN calculation
    let fqn = symbol.name;
    if (symbol.namespace) {
      fqn = `${symbol.namespace.name}.${fqn}`;
    }
    return fqn;
  }

  private getFilePath(symbol: ApexSymbol): string {
    // Extract file path from symbol location
    return symbol.location.filePath || 'unknown';
  }
}

interface ResolutionContext {
  expectedNamespace?: string;
  isCommonOperation?: boolean; // e.g., System.debug(), System.assert()
  currentFile?: string;
  importStatements?: string[];
  usagePattern?: string; // 'method-call', 'field-access', 'type-reference'
}
```

#### 10.3 Usage Examples

```typescript
// Example: Handling System.debug() ambiguity
const registry = new GlobalSymbolRegistry();

// Register built-in System namespace
registry.registerSymbol(builtInSystemSymbol, 'built-in');
// Register user-defined System class
registry.registerSymbol(userSystemSymbol, 'UserSystem.cls');

// Resolve System.debug() with context
const context: ResolutionContext = {
  isCommonOperation: true, // System.debug() is a common operation
  usagePattern: 'method-call',
};

const resolvedSymbol = registry.resolveSymbol('System', context);
// Should resolve to built-in System namespace due to common operation context

// Get all candidates for System
const candidates = registry.getCandidates('System');
// Returns both built-in System and user-defined System

// Get all files containing System
const files = registry.getFilesForSymbol('System');
// Returns ['built-in', 'UserSystem.cls']
```

#### 10.4 Benefits of Ambiguous Symbol Registry

1. **Complete Coverage**: Stores all possible candidates for ambiguous symbols
2. **Context-Aware Resolution**: Uses usage patterns and context to disambiguate
3. **Performance Optimization**: Caches resolution decisions and usage statistics
4. **Progressive Learning**: Improves resolution accuracy over time based on usage
5. **File Mapping**: Maintains bidirectional file-to-symbol and symbol-to-file mappings
6. **Fallback Strategy**: Always provides a default candidate when context is insufficient

### 11. Universal Ambiguous Symbol Approach

An alternative approach is to **treat every symbol as potentially ambiguous** from the start, regardless of whether ambiguity currently exists. This defensive programming approach simplifies the architecture but comes with significant trade-offs.

#### 11.1 Universal Ambiguous Symbol Architecture

```typescript
class UniversalAmbiguousSymbolRegistry {
  private allSymbols: Map<string, AmbiguousSymbolEntry> = new Map();
  private fqnToSymbol: Map<string, ApexSymbol> = new Map();

  // Every symbol registration goes through the same path
  registerSymbol(symbol: ApexSymbol, filePath: string): void {
    const symbolName = symbol.name;
    const fqn = this.calculateFQN(symbol);

    // Always store FQN mapping (unambiguous)
    this.fqnToSymbol.set(fqn, symbol);

    // Always treat as potentially ambiguous
    if (!this.allSymbols.has(symbolName)) {
      // First occurrence - create ambiguous entry
      const candidate: SymbolCandidate = {
        symbol,
        filePath,
        namespace: symbol.namespace?.name,
        context: this.createSymbolContext(symbol),
        usageCount: 0,
        lastUsed: Date.now(),
        confidence: this.calculateInitialConfidence(symbol),
      };

      const entry: AmbiguousSymbolEntry = {
        symbolName,
        candidates: [candidate],
        defaultCandidate: candidate,
        confidence: candidate.confidence,
      };

      this.allSymbols.set(symbolName, entry);
    } else {
      // Add to existing ambiguous entry
      const entry = this.allSymbols.get(symbolName)!;
      const candidate: SymbolCandidate = {
        symbol,
        filePath,
        namespace: symbol.namespace?.name,
        context: this.createSymbolContext(symbol),
        usageCount: 0,
        lastUsed: Date.now(),
        confidence: this.calculateInitialConfidence(symbol),
      };

      entry.candidates.push(candidate);
      this.updateDefaultCandidate(entry);
    }
  }

  // Resolution always goes through context-aware logic
  resolveSymbol(
    symbolName: string,
    context?: ResolutionContext,
  ): ApexSymbol | null {
    const entry = this.allSymbols.get(symbolName);
    if (!entry) return null;

    if (entry.candidates.length === 1) {
      // Single candidate - still update usage statistics
      const candidate = entry.candidates[0];
      candidate.usageCount++;
      candidate.lastUsed = Date.now();
      return candidate.symbol;
    }

    // Multiple candidates - use context to disambiguate
    const bestCandidate = this.findBestCandidate(
      entry.candidates,
      context || {},
    );
    if (bestCandidate) {
      bestCandidate.usageCount++;
      bestCandidate.lastUsed = Date.now();
      this.updateDefaultCandidate(entry);
      return bestCandidate.symbol;
    }

    return entry.defaultCandidate?.symbol || null;
  }

  // Get all candidates (always returns at least one for existing symbols)
  getCandidates(symbolName: string): SymbolCandidate[] {
    const entry = this.allSymbols.get(symbolName);
    return entry ? [...entry.candidates] : [];
  }

  // Check if symbol is actually ambiguous
  isAmbiguous(symbolName: string): boolean {
    const entry = this.allSymbols.get(symbolName);
    return entry ? entry.candidates.length > 1 : false;
  }

  // Get ambiguity statistics
  getAmbiguityStats(): AmbiguityStats {
    let totalSymbols = 0;
    let ambiguousSymbols = 0;
    let totalCandidates = 0;

    for (const [symbolName, entry] of this.allSymbols) {
      totalSymbols++;
      totalCandidates += entry.candidates.length;
      if (entry.candidates.length > 1) {
        ambiguousSymbols++;
      }
    }

    return {
      totalSymbols,
      ambiguousSymbols,
      totalCandidates,
      ambiguityRate: ambiguousSymbols / totalSymbols,
      averageCandidatesPerSymbol: totalCandidates / totalSymbols,
    };
  }
}

interface AmbiguityStats {
  totalSymbols: number;
  ambiguousSymbols: number;
  totalCandidates: number;
  ambiguityRate: number; // 0-1
  averageCandidatesPerSymbol: number;
}
```

#### 11.2 Risks and Trade-offs

##### **Performance Risks**

1. **Memory Overhead**: Every symbol requires candidate structure overhead

   ```typescript
   // Memory usage comparison
   // Traditional approach: Map<string, ApexSymbol> = O(n)
   // Universal ambiguous: Map<string, AmbiguousSymbolEntry> = O(n * c)
   // where c = average candidates per symbol
   ```

2. **Lookup Performance**: Additional indirection for all symbol lookups

   ```typescript
   // Traditional: O(1) direct lookup
   const symbol = unambiguousSymbols.get('MyClass');

   // Universal ambiguous: O(1) + candidate selection overhead
   const entry = allSymbols.get('MyClass');
   const symbol = entry?.candidates[0]?.symbol;
   ```

3. **Context Resolution Overhead**: Every lookup requires context scoring
   ```typescript
   // Even for unambiguous symbols, we still calculate context scores
   const bestCandidate = this.findBestCandidate(entry.candidates, context);
   ```

##### **Complexity Risks**

1. **Over-Engineering**: Simple cases become unnecessarily complex

   ```typescript
   // Simple case becomes complex
   // Before: direct symbol lookup
   const symbol = registry.getSymbol('MyClass');

   // After: candidate selection with context
   const symbol = registry.resolveSymbol('MyClass', {
     currentFile: 'MyFile.cls',
     usagePattern: 'type-reference',
   });
   ```

2. **Debugging Difficulty**: Harder to trace symbol resolution issues

   ```typescript
   // Debugging becomes more complex
   console.log('Symbol candidates:', registry.getCandidates('MyClass'));
   console.log('Ambiguity stats:', registry.getAmbiguityStats());
   ```

3. **API Complexity**: All consumers must handle candidate arrays
   ```typescript
   // Consumers must always consider multiple candidates
   const candidates = registry.getCandidates('MyClass');
   if (candidates.length > 1) {
     // Handle ambiguity
   } else {
     // Single candidate
   }
   ```

##### **Accuracy Risks**

1. **False Positives**: Treating unambiguous symbols as ambiguous

   ```typescript
   // Even unique symbols get candidate overhead
   const uniqueSymbol = registry.resolveSymbol('VeryUniqueClassName');
   // Still goes through context resolution even though there's only one candidate
   ```

2. **Context Pollution**: Unnecessary context calculations

   ```typescript
   // Context scoring for symbols that don't need it
   const score = this.calculateContextScore(candidate, context);
   // This calculation is wasted for unambiguous symbols
   ```

3. **Learning Bias**: Usage statistics may not reflect actual ambiguity
   ```typescript
   // Usage count increases even for unambiguous symbols
   candidate.usageCount++; // May not be meaningful for unique symbols
   ```

#### 11.3 Mitigation Strategies

##### **Hybrid Approach**

```typescript
class HybridSymbolRegistry {
  private unambiguousSymbols: Map<string, ApexSymbol> = new Map();
  private ambiguousSymbolRegistry: AmbiguousSymbolRegistry;
  private ambiguityThreshold: number = 0.01; // 1% ambiguity rate

  registerSymbol(symbol: ApexSymbol, filePath: string): void {
    const symbolName = symbol.name;

    // Check if symbol is likely to be ambiguous
    if (this.isLikelyAmbiguous(symbolName)) {
      this.ambiguousSymbolRegistry.registerSymbol(symbol, filePath);
    } else {
      // Check for actual ambiguity
      const existingSymbol = this.unambiguousSymbols.get(symbolName);
      if (existingSymbol) {
        // Move to ambiguous registry
        this.unambiguousSymbols.delete(symbolName);
        this.ambiguousSymbolRegistry.registerSymbol(
          existingSymbol,
          this.getFilePath(existingSymbol),
        );
        this.ambiguousSymbolRegistry.registerSymbol(symbol, filePath);
      } else {
        this.unambiguousSymbols.set(symbolName, symbol);
      }
    }
  }

  private isLikelyAmbiguous(symbolName: string): boolean {
    // Built-in names, common patterns, etc.
    const builtInNames = ['System', 'String', 'Integer', 'Boolean', 'Object'];
    const commonPatterns = /^(Test|Controller|Handler|Service|Util|Helper)$/;

    return builtInNames.includes(symbolName) || commonPatterns.test(symbolName);
  }
}
```

##### **Lazy Ambiguity Detection**

```typescript
class LazyAmbiguousSymbolRegistry {
  private symbols: Map<string, ApexSymbol | AmbiguousSymbolEntry> = new Map();

  registerSymbol(symbol: ApexSymbol, filePath: string): void {
    const symbolName = symbol.name;
    const existing = this.symbols.get(symbolName);

    if (!existing) {
      // First occurrence - store directly
      this.symbols.set(symbolName, symbol);
    } else if (existing instanceof ApexSymbol) {
      // Second occurrence - convert to ambiguous entry
      const entry = this.createAmbiguousEntry(existing, symbol, filePath);
      this.symbols.set(symbolName, entry);
    } else {
      // Already ambiguous - add to existing entry
      const entry = existing as AmbiguousSymbolEntry;
      this.addCandidateToEntry(entry, symbol, filePath);
    }
  }

  resolveSymbol(
    symbolName: string,
    context?: ResolutionContext,
  ): ApexSymbol | null {
    const entry = this.symbols.get(symbolName);

    if (!entry) return null;

    if (entry instanceof ApexSymbol) {
      // Unambiguous symbol - direct return
      return entry;
    } else {
      // Ambiguous entry - use context resolution
      return this.resolveAmbiguousEntry(entry, context);
    }
  }
}
```

#### 11.4 Recommendation

**The universal ambiguous approach is NOT recommended** for the following reasons:

1. **Performance Impact**: Significant overhead for the common case (unambiguous symbols)
2. **Complexity**: Unnecessary complexity for simple symbol lookups
3. **Memory Usage**: Substantial memory overhead for large codebases
4. **Maintenance**: Harder to debug and maintain

**Better Approach**: Use **lazy ambiguity detection** where:

- Symbols start as unambiguous (direct lookup)
- Convert to ambiguous structure only when needed
- Maintain performance for the common case
- Provide full ambiguity support when required

This gives us the best of both worlds: performance for unambiguous symbols and comprehensive support for ambiguous ones.

### 12. Graph vs. Candidates: The Trade-off Analysis

You raise an excellent point: **are we just trading candidates for edges?** This is a critical architectural question that affects both performance and complexity.

#### 12.1 The Fundamental Trade-off

```typescript
// Candidate-based approach
interface AmbiguousSymbolEntry {
  symbolName: string;
  candidates: SymbolCandidate[]; // O(n) storage per ambiguous symbol
}

// Graph-based approach
class CrossReferenceGraph {
  private referenceGraph: DirectedGraph<ApexSymbol, ReferenceEdge>; // O(e) storage for all relationships
  private symbolToVertex: Map<string, DirectedVertex<ApexSymbol>>; // O(n) storage for all symbols
}
```

**The Reality**: We're not eliminating candidates - we're **changing the data structure** that holds them.

#### 12.2 Storage Complexity Comparison

##### **Candidate-Based Storage**

```typescript
// Memory usage: O(n * c) where n = symbols, c = average candidates per symbol
const ambiguousSymbols = new Map<string, AmbiguousSymbolEntry>();

// For each ambiguous symbol:
{
  "System": {
    candidates: [
      { symbol: builtInSystem, filePath: "built-in", ... },
      { symbol: userSystem, filePath: "UserSystem.cls", ... },
      { symbol: managedSystem, filePath: "ManagedPackage.cls", ... }
    ]
  }
}
```

##### **Graph-Based Storage**

```typescript
// Memory usage: O(n + e) where n = symbols, e = edges
const referenceGraph = new DirectedGraph<ApexSymbol, ReferenceEdge>();
const symbolToVertex = new Map<string, DirectedVertex<ApexSymbol>>();

// Same symbols, but stored as vertices with edges
// Vertices: [builtInSystem, userSystem, managedSystem, ...]
// Edges: [(source, target, referenceType, location), ...]
```

#### 12.3 What We're Actually Trading

##### **What We Gain with Graphs:**

1. **Relationship Navigation**:

   ```typescript
   // Find all references TO a symbol
   const referencesTo = graph.findReferencesTo(symbol);

   // Find all references FROM a symbol
   const referencesFrom = graph.findReferencesFrom(symbol);

   // Find inheritance chain
   const inheritanceChain = graph.getInheritanceChain(symbol);
   ```

2. **Graph Algorithms**:

   ```typescript
   // Detect circular dependencies
   const cycles = graph.detectCircularDependencies();

   // Find impact analysis
   const impact = graph.calculateImpact(symbol);

   // Topological sorting
   const sorted = graph.topologicalSort();
   ```

3. **Efficient Traversal**:

   ```typescript
   // Breadth-first search for dependencies
   const dependencies = graph.bfs(symbol, 'dependencies');

   // Depth-first search for inheritance
   const inheritance = graph.dfs(symbol, 'inheritance');
   ```

##### **What We Still Need (Candidates):**

```typescript
// We STILL need to track ambiguous symbols
class GraphBasedSymbolRegistry {
  private unambiguousSymbols: Map<string, ApexSymbol> = new Map();
  private ambiguousSymbols: Map<string, SymbolCandidate[]> = new Map(); // Still here!
  private referenceGraph: CrossReferenceGraph;

  resolveSymbol(
    symbolName: string,
    context?: ResolutionContext,
  ): ApexSymbol | null {
    // Check unambiguous first
    const unambiguous = this.unambiguousSymbols.get(symbolName);
    if (unambiguous) return unambiguous;

    // Check ambiguous candidates (still needed!)
    const candidates = this.ambiguousSymbols.get(symbolName);
    if (candidates) {
      return this.findBestCandidate(candidates, context);
    }

    return null;
  }
}
```

#### 12.4 The Real Architecture

**We need BOTH candidates AND edges:**

```typescript
class HybridSymbolRegistry {
  // For symbol resolution (candidates)
  private unambiguousSymbols: Map<string, ApexSymbol> = new Map();
  private ambiguousSymbols: Map<string, SymbolCandidate[]> = new Map();

  // For relationship analysis (graph)
  private referenceGraph: CrossReferenceGraph;
  private inheritanceGraph: InheritanceGraph;
  private dependencyGraph: DependencyGraph;

  // For cross-file lookups (FQN)
  private fqnToSymbol: Map<string, ApexSymbol> = new Map();

  resolveSymbol(
    symbolName: string,
    context?: ResolutionContext,
  ): ApexSymbol | null {
    // Use candidates for resolution
    const symbol = this.resolveByCandidates(symbolName, context);

    if (symbol) {
      // Use graph for relationship analysis
      const references = this.referenceGraph.findReferencesTo(symbol);
      const dependencies = this.dependencyGraph.findDependencies(symbol);

      return symbol;
    }

    return null;
  }

  // Get all references to a symbol (uses graph)
  getReferencesTo(symbol: ApexSymbol): ReferenceEdge[] {
    return this.referenceGraph.findReferencesTo(symbol);
  }

  // Get all candidates for ambiguous symbol (uses candidates)
  getCandidates(symbolName: string): SymbolCandidate[] {
    return this.ambiguousSymbols.get(symbolName) || [];
  }
}
```

#### 12.5 Performance Implications

##### **Memory Usage:**

```typescript
// Candidate-only approach
Memory = O(n * c); // n symbols, c average candidates

// Graph-only approach
Memory = O(n + e); // n symbols, e edges

// Hybrid approach (what we actually need)
Memory = O(n * c + n + e); // Candidates + Symbols + Edges
```

##### **Lookup Performance:**

```typescript
// Symbol resolution (candidates)
resolveSymbol(symbolName) = O(1) for unambiguous, O(c) for ambiguous

// Relationship queries (graph)
findReferencesTo(symbol) = O(outgoing_edges)
findReferencesFrom(symbol) = O(incoming_edges)
```

#### 12.6 The Answer to Your Question

**Yes, we are trading candidates for edges, but we're also adding complexity:**

1. **Candidates are still needed** for symbol resolution
2. **Edges are added** for relationship analysis
3. **We get both** - symbol resolution AND relationship navigation
4. **Memory usage increases** - we store both data structures
5. **Complexity increases** - we manage both systems

#### 12.7 Recommendation

**Use a hybrid approach:**

```typescript
class OptimizedSymbolRegistry {
  // Fast symbol resolution (candidates)
  private symbolResolution: LazyAmbiguousSymbolRegistry;

  // Relationship analysis (graph)
  private relationshipGraph: CrossReferenceGraph;

  // Cross-file lookups (FQN)
  private globalLookup: GlobalSymbolRegistry;

  resolveSymbol(
    symbolName: string,
    context?: ResolutionContext,
  ): ApexSymbol | null {
    // Use optimized candidate resolution
    return this.symbolResolution.resolveSymbol(symbolName, context);
  }

  getReferencesTo(symbol: ApexSymbol): ReferenceEdge[] {
    // Use graph for relationship queries
    return this.relationshipGraph.findReferencesTo(symbol);
  }
}
```

**The graph doesn't replace candidates - it complements them.** We need candidates for fast symbol resolution and graphs for relationship analysis. The trade-off is increased complexity and memory usage for enhanced functionality.

### 13. The Symbol Relationship Problem

You've identified a critical flaw in the current approach: **`System.debug(...)` yields two separate symbols `'System'` and `'System.debug'`** instead of understanding the **relationship** between them. This reveals a fundamental issue with how we're thinking about symbol collection.

#### 13.1 The Problem with Current Symbol Collection

```typescript
// Current approach: Treating System.debug() as separate symbols
enterMethodInvocation(ctx: MethodInvocationContext): void {
  const methodName = ctx.methodName()?.text; // "debug"
  const targetExpression = this.getTargetExpression(ctx); // "System"

  // Creates TWO separate symbol references:
  // 1. Target symbol: "System"
  // 2. Method symbol: "System.debug"

  const systemReference: ExpressionReference = {
    symbolName: "System",
    referenceType: ReferenceType.TYPE_REFERENCE,
    // ...
  };

  const debugReference: ExpressionReference = {
    symbolName: "debug",
    referenceType: ReferenceType.METHOD_CALL,
    // ...
  };
}
```

**The Issue**: We're losing the **semantic relationship** between `System` and `debug`.

#### 13.2 The Correct Approach: Hierarchical Symbol References

```typescript
interface HierarchicalSymbolReference {
  rootSymbol: string; // "System"
  memberChain: string[]; // ["debug"]
  fullPath: string; // "System.debug"
  referenceType: ReferenceType;
  location: SymbolLocation;
  context: ExpressionContext;
  targetSymbol?: ApexSymbol;
  namespace?: string;
}

class HierarchicalSymbolCollector {
  // Method invocation: System.debug(args)
  enterMethodInvocation(ctx: MethodInvocationContext): void {
    const fullExpression = ctx.text; // "System.debug(args)"
    const methodName = ctx.methodName()?.text; // "debug"
    const targetExpression = this.getTargetExpression(ctx); // "System"

    // Parse the hierarchical structure
    const hierarchy = this.parseHierarchicalExpression(fullExpression);

    const reference: HierarchicalSymbolReference = {
      rootSymbol: hierarchy.root, // "System"
      memberChain: hierarchy.members, // ["debug"]
      fullPath: hierarchy.fullPath, // "System.debug"
      referenceType: ReferenceType.METHOD_CALL,
      location: this.getLocation(ctx),
      context: {
        isStatic: this.isStaticContext(ctx),
        isMethodCall: true,
        isFieldAccess: false,
        isTypeReference: false,
        arguments: this.collectArguments(ctx.arguments()),
        chainIndex: this.currentExpressionChain.length,
      },
    };

    this.hierarchicalReferences.push(reference);
  }

  // Field access: System.debug
  enterFieldAccess(ctx: FieldAccessContext): void {
    const fullExpression = ctx.text; // "System.debug"
    const fieldName = ctx.fieldName()?.text; // "debug"
    const targetExpression = this.getTargetExpression(ctx); // "System"

    const hierarchy = this.parseHierarchicalExpression(fullExpression);

    const reference: HierarchicalSymbolReference = {
      rootSymbol: hierarchy.root,
      memberChain: hierarchy.members,
      fullPath: hierarchy.fullPath,
      referenceType: ReferenceType.FIELD_ACCESS,
      location: this.getLocation(ctx),
      context: {
        isStatic: this.isStaticContext(ctx),
        isMethodCall: false,
        isFieldAccess: true,
        isTypeReference: false,
        chainIndex: this.currentExpressionChain.length,
      },
    };

    this.hierarchicalReferences.push(reference);
  }

  private parseHierarchicalExpression(expression: string): {
    root: string;
    members: string[];
    fullPath: string;
  } {
    // Parse "System.debug" into:
    // root: "System"
    // members: ["debug"]
    // fullPath: "System.debug"

    const parts = expression.split('.');
    const root = parts[0];
    const members = parts.slice(1);
    const fullPath = expression;

    return { root, members, fullPath };
  }
}
```

#### 13.3 Correct Understanding: Scoped AST Already Handles Hierarchy

You're absolutely right! The **scoped AST already captures the hierarchical relationship** within a single file. When we have a file named `System.cls`, the AST structure already shows:

```
System.cls (file scope)
├── System (class scope)
    ├── debug (method scope)
    ├── assert (method scope)
    └── ...
```

The **hierarchical resolution** is already handled by the existing `SymbolTable` scope system.

```typescript
// The existing SymbolTable already handles this hierarchy
class SymbolTable {
  private scopes: SymbolScope[] = [];

  // When parsing System.cls, we get:
  // file scope -> class scope -> method scope
  enterScope('file');
  enterScope('System'); // class scope
  enterScope('debug');  // method scope within System class
}
```

**The real issue is cross-file resolution**, not hierarchical resolution within a file.

#### 13.4 The Real Problem: Cross-File Symbol Resolution

The **real issue** is not hierarchical resolution within a file, but **cross-file symbol resolution**. When we have:

```typescript
// File: MyClass.cls
public class MyClass {
  public void myMethod() {
    System.debug('Hello'); // Reference to System.debug from different file
  }
}
```

The problem is:

1. **`System`** is defined in a different file (built-in or user-defined)
2. **`debug`** is a method within the `System` class/namespace
3. We need to **resolve across file boundaries**

**The existing SymbolTable scope system works perfectly within a single file**, but we need **cross-file resolution** for the global symbol registry.

#### 13.5 Corrected Understanding: Cross-File Resolution Strategy

The **real solution** is to leverage the existing scoped AST structure for cross-file resolution:

```typescript
class CrossFileSymbolResolver {
  resolveCrossFileReference(
    symbolName: string,
    context: ResolutionContext,
  ): ApexSymbol | null {
    // Step 1: Find the file containing the symbol
    const filePath = this.globalRegistry.getFilesForSymbol(symbolName);

    if (filePath.length === 0) {
      return null; // Symbol not found
    }

    // Step 2: Load the file's SymbolTable (if not already loaded)
    const symbolTable = this.loadSymbolTable(filePath[0]);

    // Step 3: Use existing scope resolution within that file
    const symbol = symbolTable.lookup(symbolName);

    return symbol;
  }

  // For System.debug, we need to:
  // 1. Find System class/namespace
  // 2. Load its SymbolTable
  // 3. Look up 'debug' method within System's scope
  resolveMemberReference(
    rootSymbol: string,
    memberName: string,
  ): ApexSymbol | null {
    // Find the file containing the root symbol
    const rootFile = this.globalRegistry.getFilesForSymbol(rootSymbol)[0];
    const rootSymbolTable = this.loadSymbolTable(rootFile);

    // Find the root symbol in its file
    const rootSymbolObj = rootSymbolTable.lookup(rootSymbol);
    if (!rootSymbolObj) return null;

    // Find the member within the root symbol's scope
    const memberSymbol = rootSymbolTable.lookup(
      memberName,
      rootSymbolObj.scope,
    );

    return memberSymbol;
  }
}
```

#### 13.6 Implementation Impact

**No Parser Changes Required:**

- Existing `SymbolTable` scope system already handles hierarchy
- Existing `ApexSymbolCollectorListener` already captures scoped symbols
- No need for hierarchical expression parsing

**Global Registry Changes Required:**

- Add file-to-SymbolTable mapping
- Add lazy loading of SymbolTables
- Add cross-file symbol resolution

**Performance Benefits:**

- Leverages existing, proven scope system
- No duplicate hierarchy implementation
- Consistent with current architecture

**The key insight**: The existing scoped AST already provides the hierarchical structure we need. We just need to **extend it across file boundaries** using the global symbol registry.

### 9. Missing Symbol Collection for Cross-File References

The current `ApexSymbolCollectorListener` only collects **declaration symbols** (classes, methods, fields, variables, etc.) but does not collect **reference symbols** (method calls, field access, type references, etc.). For comprehensive cross-file reference tracking, we need to extend the listener to capture all symbol usage patterns.

#### 9.1 Current Symbol Collection Gaps

The current listener handles:

- ✅ **Declaration symbols**: Classes, interfaces, methods, fields, properties, variables, parameters
- ✅ **Scope management**: File, class, method, block scopes
- ✅ **Modifiers and annotations**: Visibility, static, final, etc.
- ✅ **Type information**: Return types, parameter types, field types

**Missing for cross-file references:**

- ❌ **Method invocations**: `obj.methodName()`, `Class.staticMethod()`
- ❌ **Field access**: `obj.fieldName`, `Class.staticField`
- ❌ **Type references**: `new MyClass()`, `List<String>`, `MyClass[]`
- ❌ **Variable references**: `variableName`, `this.fieldName`
- ❌ **Constructor calls**: `new MyClass(params)`
- ❌ **Static member access**: `System.debug()`, `MyClass.STATIC_FIELD`
- ❌ **Namespace-qualified references**: `MyNamespace.MyClass`
- ❌ **Array access**: `array[index]`
- ❌ **Method chaining**: `obj.method1().method2()`

#### 9.2 Required Expression-Level Symbol Collection

The `ExpressionSymbolCollector` should **NOT** be a separate listener class. Instead, it should be **integrated directly into the existing `ApexSymbolCollectorListener`** to avoid the overhead of multiple parse tree walks.

````typescript
// INTEGRATED: Expression-level symbol collection methods added to ApexSymbolCollectorListener

interface ExpressionReference {
  symbolName: string;
  referenceType: ReferenceType;
  location: SymbolLocation;
  context: ExpressionContext;
  targetSymbol?: ApexSymbol; // Resolved symbol (if available)
  namespace?: string; // Explicit namespace qualification
}

interface ExpressionContext {
  parentExpression?: ExpressionReference;
  isStatic: boolean;
  isMethodCall: boolean;
  isFieldAccess: boolean;
  isTypeReference: boolean;
  arguments?: TypeInfo[]; // For method calls
  arrayIndex?: string; // For array access
  chainIndex: number; // Position in method chaining
}

// These methods would be ADDED to the existing ApexSymbolCollectorListener class
// NOT as a separate collector class

#### 9.2.1 Correct Usage Pattern

**The `ExpressionSymbolCollector` should NOT be used as a separate listener.** Instead, the expression-level methods should be **integrated directly into the existing `ApexSymbolCollectorListener`** to avoid:

1. **Multiple Parse Tree Walks**: Running separate listeners would require parsing the same file multiple times
2. **Performance Overhead**: Each additional parse walk adds significant processing time
3. **Complexity**: Managing multiple listeners and coordinating their results
4. **Memory Usage**: Storing multiple parse trees and results

**Correct Approach:**
```typescript
// ✅ CORRECT: Single listener with integrated expression collection
class ApexSymbolCollectorListener extends BaseApexParserListener<SymbolTable> {
  // Existing declaration methods (unchanged)
  enterClassDeclaration(ctx: ClassDeclarationContext): void { /* ... */ }
  enterMethodDeclaration(ctx: MethodDeclarationContext): void { /* ... */ }

  // NEW: Expression-level methods added directly
  enterMethodInvocation(ctx: MethodInvocationContext): void { /* ... */ }
  enterFieldAccess(ctx: FieldAccessContext): void { /* ... */ }
  enterTypeReference(ctx: TypeReferenceContext): void { /* ... */ }
}

// Usage: Single parse walk
const listener = new ApexSymbolCollectorListener(symbolTable, globalRegistry);
const walker = new ParseTreeWalker();
walker.walk(listener, parseTree);

// Get both declaration symbols AND expression references
const symbolTable = listener.getResult();
const expressionReferences = listener.getExpressionReferences();
const crossReferences = listener.getCrossReferenceTracker();
````

**Incorrect Approach:**

```typescript
// ❌ WRONG: Multiple listeners requiring multiple parse walks
const declarationListener = new ApexSymbolCollectorListener();
const expressionListener = new ExpressionSymbolCollector(); // Separate class

// First walk for declarations
walker.walk(declarationListener, parseTree);
const symbolTable = declarationListener.getResult();

// Second walk for expressions
walker.walk(expressionListener, parseTree);
const expressionReferences = expressionListener.getExpressionReferences();

// Third walk to coordinate results
const crossReferenceListener = new CrossReferenceListener(
  symbolTable,
  expressionReferences,
);
walker.walk(crossReferenceListener, parseTree);
```

````

#### 9.3 Enhanced ApexSymbolCollectorListener

```typescript
class EnhancedApexSymbolCollectorListener extends ApexSymbolCollectorListener {
  private expressionCollector: ExpressionSymbolCollector;
  private crossReferenceTracker: CrossReferenceTracker;

  constructor(symbolTable?: SymbolTable) {
    super(symbolTable);
    this.expressionCollector = new ExpressionSymbolCollector();
    this.crossReferenceTracker = new CrossReferenceTracker();
  }

  // Override existing methods to add cross-reference tracking
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    super.enterMethodDeclaration(ctx);

    // Track method declaration for cross-file references
    const methodSymbol = this.currentMethodSymbol;
    if (methodSymbol) {
      this.crossReferenceTracker.trackSymbolDeclaration(methodSymbol);
    }
  }

  // NEW: Track method invocations
  enterMethodInvocation(ctx: MethodInvocationContext): void {
    const reference = this.expressionCollector.collectMethodInvocation(ctx);

    // Try to resolve the method reference
    const resolvedSymbol = this.resolveMethodReference(reference);
    if (resolvedSymbol) {
      this.crossReferenceTracker.trackReference(
        this.currentMethodSymbol || this.currentTypeSymbol,
        resolvedSymbol,
        reference,
      );
    } else {
      // Handle unresolved reference
      this.crossReferenceTracker.trackUnresolvedReference(reference);
    }
  }

  // NEW: Track field access
  enterFieldAccess(ctx: FieldAccessContext): void {
    const reference = this.expressionCollector.collectFieldAccess(ctx);

    const resolvedSymbol = this.resolveFieldReference(reference);
    if (resolvedSymbol) {
      this.crossReferenceTracker.trackReference(
        this.currentMethodSymbol || this.currentTypeSymbol,
        resolvedSymbol,
        reference,
      );
    } else {
      this.crossReferenceTracker.trackUnresolvedReference(reference);
    }
  }

  // NEW: Track type references
  enterTypeReference(ctx: TypeReferenceContext): void {
    const reference = this.expressionCollector.collectTypeReference(ctx);

    const resolvedSymbol = this.resolveTypeReference(reference);
    if (resolvedSymbol) {
      this.crossReferenceTracker.trackReference(
        this.currentMethodSymbol || this.currentTypeSymbol,
        resolvedSymbol,
        reference,
      );
    } else {
      this.crossReferenceTracker.trackUnresolvedReference(reference);
    }
  }

  // NEW: Track variable references
  enterVariableReference(ctx: VariableReferenceContext): void {
    const reference = this.expressionCollector.collectVariableReference(ctx);

    const resolvedSymbol = this.resolveVariableReference(reference);
    if (resolvedSymbol) {
      this.crossReferenceTracker.trackReference(
        this.currentMethodSymbol || this.currentTypeSymbol,
        resolvedSymbol,
        reference,
      );
    } else {
      this.crossReferenceTracker.trackUnresolvedReference(reference);
    }
  }

  // NEW: Track constructor calls
  enterConstructorCall(ctx: ConstructorCallContext): void {
    const reference = this.expressionCollector.collectConstructorCall(ctx);

    const resolvedSymbol = this.resolveConstructorReference(reference);
    if (resolvedSymbol) {
      this.crossReferenceTracker.trackReference(
        this.currentMethodSymbol || this.currentTypeSymbol,
        resolvedSymbol,
        reference,
      );
    } else {
      this.crossReferenceTracker.trackUnresolvedReference(reference);
    }
  }

  // NEW: Track static member access
  enterStaticMemberAccess(ctx: StaticMemberAccessContext): void {
    const reference = this.expressionCollector.collectStaticMemberAccess(ctx);

    const resolvedSymbol = this.resolveStaticMemberReference(reference);
    if (resolvedSymbol) {
      this.crossReferenceTracker.trackReference(
        this.currentMethodSymbol || this.currentTypeSymbol,
        resolvedSymbol,
        reference,
      );
    } else {
      this.crossReferenceTracker.trackUnresolvedReference(reference);
    }
  }

  // Resolution methods for different reference types
  private resolveMethodReference(
    reference: ExpressionReference,
  ): ApexSymbol | null {
    const targetType = this.inferTargetType(reference);
    if (!targetType) return null;

    // Try to find method in target type
    return this.findMethodInType(
      targetType,
      reference.symbolName,
      reference.context.arguments,
    );
  }

  private resolveFieldReference(
    reference: ExpressionReference,
  ): ApexSymbol | null {
    const targetType = this.inferTargetType(reference);
    if (!targetType) return null;

    // Try to find field in target type
    return this.findFieldInType(targetType, reference.symbolName);
  }

  private resolveTypeReference(
    reference: ExpressionReference,
  ): ApexSymbol | null {
    // Try to resolve type by name and namespace
    const fqn = reference.namespace
      ? `${reference.namespace}.${reference.symbolName}`
      : reference.symbolName;

    return this.globalRegistry?.resolveSymbol(fqn);
  }

  private resolveVariableReference(
    reference: ExpressionReference,
  ): ApexSymbol | null {
    // Look up variable in current scope hierarchy
    return this.symbolTable.lookup(reference.symbolName);
  }

  private resolveConstructorReference(
    reference: ExpressionReference,
  ): ApexSymbol | null {
    // Constructor references are type references
    return this.resolveTypeReference(reference);
  }

  private resolveStaticMemberReference(
    reference: ExpressionReference,
  ): ApexSymbol | null {
    // Static members can be methods or fields
    const targetType = this.resolveTypeReference({
      ...reference,
      referenceType: ReferenceType.TYPE_REFERENCE,
    });

    if (!targetType) return null;

    // Look for static method or field
    return this.findStaticMemberInType(targetType, reference.symbolName);
  }
}
````

#### 9.4 Cross-Reference Tracking Integration

```typescript
class CrossReferenceTracker {
  private crossReferenceGraph: CrossReferenceGraph;
  private unresolvedReferences: Map<string, UnresolvedReference[]> = new Map();

  // Track a resolved reference
  trackReference(
    sourceSymbol: ApexSymbol,
    targetSymbol: ApexSymbol,
    reference: ExpressionReference,
  ): void {
    this.crossReferenceGraph.addReference(
      sourceSymbol,
      targetSymbol,
      reference.referenceType,
      reference.location,
    );
  }

  // Track an unresolved reference
  trackUnresolvedReference(reference: ExpressionReference): void {
    const key = this.createUnresolvedKey(reference);

    if (!this.unresolvedReferences.has(key)) {
      this.unresolvedReferences.set(key, []);
    }

    this.unresolvedReferences.get(key)!.push({
      reference,
      sourceSymbol: this.getCurrentSourceSymbol(),
      timestamp: Date.now(),
    });
  }

  // Resolve unresolved references when symbols become available
  resolveUnresolvedReferences(resolvedSymbol: ApexSymbol): void {
    const key = this.createResolvedKey(resolvedSymbol);
    const unresolved = this.unresolvedReferences.get(key);

    if (!unresolved) return;

    for (const unresolvedRef of unresolved) {
      this.trackReference(
        unresolvedRef.sourceSymbol,
        resolvedSymbol,
        unresolvedRef.reference,
      );
    }

    // Clean up resolved references
    this.unresolvedReferences.delete(key);
  }

  // Get all references to a symbol
  getReferencesTo(symbol: ApexSymbol): ExpressionReference[] {
    return this.crossReferenceGraph.findReferencesTo(symbol);
  }

  // Get all references from a symbol
  getReferencesFrom(symbol: ApexSymbol): ExpressionReference[] {
    return this.crossReferenceGraph.findReferencesFrom(symbol);
  }
}
```

#### 9.5 Implementation Impact

**New Parser Contexts Required:**

- `MethodInvocationContext`
- `FieldAccessContext`
- `TypeReferenceContext`
- `VariableReferenceContext`
- `ConstructorCallContext`
- `StaticMemberAccessContext`
- `ArrayAccessContext`

**Enhanced Symbol Table:**

- Add expression reference tracking
- Integrate with cross-reference graph
- Support unresolved reference resolution
- Maintain reference context information

**Performance Considerations:**

- Expression collection adds significant parsing overhead
- Need efficient indexing for reference lookups
- Consider lazy evaluation for complex expressions
- Cache resolved references to avoid repeated lookups

**Integration Points:**

- Extend existing `ApexSymbolCollectorListener`
- Add expression-level parsing to `CompilerService`
- Integrate with `GlobalSymbolRegistry` for cross-file resolution
- Connect to `CrossReferenceGraph` for relationship tracking

## Implementation Plan

### Phase 1: Global Symbol Registry (3-4 days)

1. **GlobalSymbolRegistry**: Implement central registry with O(1) symbol lookup
2. **Symbol Registration**: Create mechanism to register symbols from compiled files
3. **Client Request Integration**: Integrate with storage system's client request capability
4. **Memory Management**: Implement LRU eviction for large symbol sets

### Phase 2: Graph-Based Cross-Reference Tracking (3-4 days)

1. **CrossReferenceGraph**: Implement directed graph for symbol reference tracking
2. **InheritanceGraph**: Create graph for type inheritance relationships
3. **MethodResolutionGraph**: Build graph for method override and implementation tracking
4. **DependencyAnalyzer**: Implement dependency analysis with cycle detection
5. **Deferred Reference Handling**: Support for lazy loading of cross-file references

### Phase 3: Enhanced SymbolTable Integration (2-3 days)

1. **SymbolTable Enhancement**: Modify SymbolTable to include global registry and graph components
2. **Lookup Delegation**: Implement fallback from local scope to global registry
3. **Symbol Registration**: Automatically register symbols with global registry and graphs during parsing
4. **Cross-Reference Tracking**: Integrate reference tracking into symbol collection process
5. **Backward Compatibility**: Ensure existing functionality remains unchanged

### Phase 4: Lazy Loading Integration (2-3 days)

1. **LazySymbolResolver**: Implement resolver that integrates with ResourceLoader
2. **File Path Resolution**: Create mechanism to determine file path from FQN
3. **On-Demand Compilation**: Trigger file compilation when symbols are requested
4. **Caching Strategy**: Optimize caching for frequently accessed symbols
5. **Graph Edge Resolution**: Resolve deferred graph edges when symbols are loaded

### Phase 5: Cross-File Type Checking (2-3 days)

1. **Type Compatibility Engine**: Implement type compatibility validation
2. **Inheritance Resolution**: Use inheritance graph for chain resolution across files
3. **Generic Type Handling**: Handle generic type parameters and constraints
4. **Type Validation Integration**: Integrate type checking with symbol resolution
5. **Graph-Based Type Analysis**: Leverage graph algorithms for type relationship analysis

### Phase 6: Method Signature Validation (2-3 days)

1. **Method Resolution**: Use method resolution graph for finding definitions across files
2. **Signature Matching**: Validate method calls against definitions
3. **Argument Type Checking**: Validate argument types against parameter types
4. **Overload Resolution**: Handle method overloads and inheritance using graph traversal
5. **Override Detection**: Use graph algorithms to detect and validate method overrides

### Phase 7: Language Server Integration (2-3 days)

1. **Enhanced Definition Provider**: Extend for cross-file lookups with type validation
2. **Reference Provider**: Implement "Find All References" using graph-based reference tracking
3. **Completion Provider**: Extend completion with type-aware suggestions
4. **Diagnostic Provider**: Add cross-file type checking diagnostics
5. **Impact Analysis**: Provide dependency impact analysis for code changes

## Technical Integration Points

### Leverage Existing Infrastructure

- **ResourceLoader**: Use existing lazy loading and compilation capabilities
- **SymbolTable**: Extend existing symbol tables with global registry integration
- **CompilerService**: Reuse existing compilation pipeline for cross-file resolution
- **TypeInfo**: Extend existing type system for cross-file validation
- **ErrorReporter**: Use existing error reporting for validation errors
- **Storage Interface**: Use existing storage system's client request capability

### New Parser/AST Components

- **GlobalSymbolRegistry**: Central registry for all symbols across files with O(1) lookup
- **CrossReferenceGraph**: Directed graph for tracking symbol references across files
- **InheritanceGraph**: Graph for managing type inheritance relationships
- **MethodResolutionGraph**: Graph for tracking method overrides and implementations
- **DependencyAnalyzer**: Graph-based dependency analysis with cycle detection
- **Enhanced SymbolTable**: Modified SymbolTable with global registry and graph integration
- **LazySymbolResolver**: Orchestrator for lazy loading and cross-file resolution
- **TypeCompatibilityEngine**: Engine for type compatibility validation
- **MethodSignatureValidator**: Validator for method calls and signatures
- **CrossFileReferenceScanner**: Scanner for finding and validating cross-file references

### Integration Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   SymbolTable   │───▶│ GlobalSymbolReg  │───▶│ ClientRequest   │
│   (Enhanced)    │    │   (New)          │    │   (Storage)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ ResourceLoader  │    │ LazySymbolResolv │    │ CrossFileRef    │
│   (Existing)    │    │   (New)          │    │   (New)         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Success Criteria

1. **Performance**: Cross-file symbol resolution completes in <200ms for cached files
2. **Type Checking**: Type validation completes in <500ms for complex scenarios
3. **Memory**: Memory usage scales with actively referenced files, not total codebase
4. **Accuracy**: 95%+ accuracy in cross-file symbol resolution and type validation
5. **Integration**: Seamless integration with existing lazy loading architecture

## Risk Mitigation

1. **Complexity**: Implement incrementally, starting with basic symbol resolution
2. **Performance**: Implement aggressive caching and lazy loading strategies
3. **Type System Complexity**: Focus on common Apex type patterns first
4. **Integration**: Maintain backward compatibility with existing APIs

## Deliverables

1. **Design Document**: Detailed architecture for cross-file resolution with type checking
2. **Prototype Implementation**: Working cross-file resolution and validation system
3. **Integration Guide**: Documentation for extending existing language server features
4. **Performance Benchmarks**: Metrics comparing cross-file vs. single-file scenarios
5. **Test Suite**: Comprehensive tests for cross-file scenarios including type validation

## Dependencies

- Existing `ResourceLoader` lazy loading infrastructure
- Existing `ApexStorageInterface` with client request capability
- Existing `SymbolTable` and `TypeInfo` systems
- Existing `CompilerService` compilation pipeline

## Timeline

- **Total Duration**: 16-22 days
- **Phase 1**: 3-4 days (Global Symbol Registry)
- **Phase 2**: 3-4 days (Graph-Based Cross-Reference Tracking)
- **Phase 3**: 2-3 days (Enhanced SymbolTable Integration)
- **Phase 4**: 2-3 days (Lazy Loading Integration)
- **Phase 5**: 2-3 days (Cross-File Type Checking)
- **Phase 6**: 2-3 days (Method Signature Validation)
- **Phase 7**: 2-3 days (Language Server Integration)

## Next Steps

1. Review and approve this spike work plan
2. Set up development environment and dependencies
3. Begin Phase 1 implementation
4. Regular progress reviews and adjustments as needed
