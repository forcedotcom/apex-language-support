# Cross-File Symbol Manager: Hash-Based vs Graph-Based Analysis

## Overview

This document analyzes the current `CrossFileSymbolManager` implementation and compares it with potential graph-based alternatives for tracking cross-file references in Apex code, specifically focusing on a hybrid approach using `data-structure-typed` collections with `graphology` APIs.

## Current Implementation

The current `CrossFileSymbolManager` uses a **multi-index hash-based approach** with four primary data structures:

```typescript
// Primary storage: symbol name -> symbol entries
private symbolMap: HashMap<string, GlobalSymbolEntry[]>

// File mapping: file path -> symbol table
private fileToSymbolTable: HashMap<string, SymbolTable>

// Symbol to file mapping: symbol key -> file paths
private symbolToFiles: HashMap<string, string[]>

// File to symbols mapping: file path -> symbol names
private fileToSymbols: HashMap<string, string[]>
```

## Desired Hybrid Solution: data-structure-typed + graphology

### Architecture Overview

```typescript
import { HashMap, DirectedGraph } from 'data-structure-typed';
import { Graph } from 'graphology';
import { dfs, bfs } from 'graphology-traversal';
import { isAcyclic, topologicalSort } from 'graphology-operators';

class HybridCrossFileSymbolManager {
  // Use data-structure-typed for optimized data storage
  private symbolIndex: HashMap<string, ApexSymbol> = new HashMap();
  private nameIndex: HashMap<string, string[]> = new HashMap();
  private fileIndex: HashMap<string, string[]> = new HashMap();

  // Use graphology for graph algorithms and traversal
  private referenceGraph: Graph = new Graph({ type: 'directed' });
  private inheritanceGraph: Graph = new Graph({ type: 'directed' });
  private dependencyGraph: Graph = new Graph({ type: 'directed' });
}
```

### Key Benefits of This Approach

1. **Optimized Data Operations**: `data-structure-typed` provides faster operations than native JavaScript
2. **Rich Algorithm Ecosystem**: `graphology` offers extensive graph algorithms and traversal capabilities
3. **Best of Both Worlds**: Fast lookups + powerful graph analysis
4. **Community Support**: Both libraries have active development and extensive documentation

## Performance Analysis

### data-structure-typed Performance (vs Native JavaScript)

| Operation                    | data-structure-typed | Native JavaScript | Performance Gain    |
| ---------------------------- | -------------------- | ----------------- | ------------------- |
| HashMap.set (1M)             | 122.51 ms            | 223.80 ms         | **82% faster**      |
| HashMap.set & get (1M)       | 109.86 ms            | 255.33 ms         | **132% faster**     |
| Queue.push & shift (100K)    | 5.83 ms              | 2829.59 ms        | **48,500% faster**  |
| Deque.unshift & shift (100K) | 2.44 ms              | 4750.37 ms        | **194,600% faster** |

### Graphology Algorithm Ecosystem

```typescript
// Rich traversal algorithms
import { dfs, bfs, dijkstra } from 'graphology-traversal';

// Graph analysis algorithms
import { isAcyclic, topologicalSort } from 'graphology-operators';

// Centrality and metrics
import { betweenness, closeness } from 'graphology-metrics';

// Community detection
import { communities } from 'graphology-communities';
```

## Updated Feature Comparison Tables

### 1. Symbol Lookup by Name

| Aspect                   | Current Hash-Based            | data-structure-typed + graphology    |
| ------------------------ | ----------------------------- | ------------------------------------ |
| **Performance**          | ✅ O(1) lookup time           | ✅ **O(1) + 82% faster than native** |
| **Implementation**       | ✅ Simple and straightforward | ❌ More complex implementation       |
| **Symbol Overloading**   | ✅ Handles naturally          | ✅ Can handle with graph algorithms  |
| **Memory Efficiency**    | ✅ Efficient for name queries | ✅ **More efficient than native JS** |
| **Relationship Context** | ❌ No relationship context    | ✅ Includes reference context        |
| **Fuzzy Search**         | ❌ Limited to exact matches   | ✅ Could support fuzzy matching      |
| **Scope Awareness**      | ❌ Limited scope resolution   | ✅ Full scope-aware resolution       |

### 2. Cross-File Reference Tracking

| Aspect                        | Current Hash-Based         | data-structure-typed + graphology   |
| ----------------------------- | -------------------------- | ----------------------------------- |
| **File Lookup**               | ✅ Fast file lookup        | ✅ **Faster file lookup**           |
| **Reference Direction**       | ❌ No direction tracking   | ✅ Bidirectional reference tracking |
| **Reference Context**         | ❌ No context information  | ✅ Reference context and metadata   |
| **Reference Types**           | ❌ No type differentiation | ✅ Supports reference types         |
| **Impact Analysis**           | ❌ Limited impact analysis | ✅ **Rich algorithm ecosystem**     |
| **Implementation Complexity** | ✅ Simple implementation   | ❌ More complex data structure      |
| **Memory Usage**              | ✅ Lower memory usage      | ✅ **Optimized data structures**    |

### 3. Context-Aware Symbol Resolution

| Aspect                     | Current Hash-Based              | data-structure-typed + graphology  |
| -------------------------- | ------------------------------- | ---------------------------------- |
| **Resolution Speed**       | ✅ Fast resolution              | ✅ **Faster than native JS**       |
| **Context Awareness**      | ❌ Limited context awareness    | ✅ Full scope-aware resolution     |
| **Scope Resolution**       | ❌ No scope-based resolution    | ✅ Complete scope-based resolution |
| **Import Analysis**        | ❌ No import/namespace analysis | ✅ Import/namespace analysis       |
| **Inheritance Chain**      | ❌ No inheritance traversal     | ✅ **Graph traversal algorithms**  |
| **Resolution Accuracy**    | ❌ Basic heuristics only        | ✅ More accurate resolution        |
| **Maintenance Complexity** | ✅ Predictable behavior         | ❌ More complex to maintain        |

### 4. Dependency Analysis

| Aspect                        | Current Hash-Based                  | data-structure-typed + graphology    |
| ----------------------------- | ----------------------------------- | ------------------------------------ |
| **File-to-Symbol Mapping**    | ✅ Fast file-to-symbol mapping      | ✅ **Faster file-to-symbol mapping** |
| **Dependency Relationships**  | ❌ No dependency relationships      | ✅ **Full dependency analysis**      |
| **Circular Dependencies**     | ❌ No circular dependency detection | ✅ **Built-in cycle detection**      |
| **Impact Analysis**           | ❌ No impact analysis               | ✅ **Comprehensive impact analysis** |
| **Build Order Optimization**  | ❌ No build order support           | ✅ **Topological sorting**           |
| **Graph Algorithms**          | ❌ No graph algorithms available    | ✅ **Rich algorithm ecosystem**      |
| **Implementation Complexity** | ✅ Simple implementation            | ❌ Complex graph algorithms          |

### 5. Pattern-Based Symbol Search

| Aspect                   | Current Hash-Based                     | data-structure-typed + graphology           |
| ------------------------ | -------------------------------------- | ------------------------------------------- |
| **Implementation**       | ✅ Simple implementation               | ❌ Complex search algorithms                |
| **Performance**          | ✅ Predictable performance             | ✅ **Optimized algorithms**                 |
| **Search Capabilities**  | ❌ Limited to exact substring matching | ✅ **Semantic search capabilities**         |
| **Relationship Search**  | ❌ No relationship-based search        | ✅ **Relationship-based search**            |
| **Fuzzy Matching**       | ❌ No fuzzy matching                   | ✅ **Fuzzy matching with graph algorithms** |
| **Context-Aware Search** | ❌ No context awareness                | ✅ **Context-aware search**                 |
| **Understanding**        | ✅ Easy to understand                  | ❌ More complex implementation              |

### 6. Performance Characteristics

| Metric                  | Current Hash-Based                | data-structure-typed + graphology             |
| ----------------------- | --------------------------------- | --------------------------------------------- |
| **Memory Usage**        | ✅ O(symbols + files) - efficient | ✅ **O(symbols + files + edges) - optimized** |
| **Symbol Lookup**       | ✅ O(1) for most operations       | ✅ **O(1) + 82% faster than native**          |
| **File Lookup**         | ✅ O(1) for most operations       | ✅ **O(1) + optimized data structures**       |
| **Single Updates**      | ✅ O(1) for single operations     | ✅ **O(1) + optimized operations**            |
| **Bulk Updates**        | ❌ O(n) for file removal          | ❌ O(n + e) where e is number of edges        |
| **Reference Tracking**  | ❌ Not available                  | ✅ **O(1) to O(n) with graph algorithms**     |
| **Dependency Analysis** | ❌ Not available                  | ✅ **O(n + e) with optimized algorithms**     |

### 7. LSP Feature Support

| LSP Feature           | Current Hash-Based               | data-structure-typed + graphology            |
| --------------------- | -------------------------------- | -------------------------------------------- |
| **Go to Definition**  | ✅ Excellent (fast, simple)      | ✅ **Excellent + faster lookups**            |
| **Find References**   | ❌ Limited (no bidirectional)    | ✅ **Excellent (bidirectional, contextual)** |
| **Rename**            | ❌ Limited (no impact analysis)  | ✅ **Excellent (impact analysis)**           |
| **Code Completion**   | ✅ Excellent (fast lookup)       | ✅ **Excellent + faster lookups**            |
| **Hover Information** | ✅ Good (fast symbol lookup)     | ✅ **Good + faster lookups**                 |
| **Signature Help**    | ✅ Good (fast method lookup)     | ✅ **Good + faster lookups**                 |
| **Document Symbols**  | ✅ Excellent (fast file symbols) | ✅ **Excellent + faster lookups**            |

### 8. Code Analysis Features

| Analysis Feature            | Current Hash-Based        | data-structure-typed + graphology       |
| --------------------------- | ------------------------- | --------------------------------------- |
| **Dependency Analysis**     | ❌ Not available          | ✅ **Excellent with graph algorithms**  |
| **Impact Analysis**         | ❌ Not available          | ✅ **Excellent with graph algorithms**  |
| **Refactoring Support**     | ❌ Limited support        | ✅ **Excellent with graph algorithms**  |
| **Performance Profiling**   | ✅ Good (simple queries)  | ✅ **Good + optimized data operations** |
| **Code Metrics**            | ✅ Good (symbol counting) | ✅ **Excellent (relationship metrics)** |
| **Architecture Analysis**   | ❌ Not available          | ✅ **Excellent with graph algorithms**  |
| **Technical Debt Analysis** | ❌ Limited                | ✅ **Excellent with graph algorithms**  |

## Implementation Strategy

### Phase 1: Hybrid Data Structure Setup (1-2 days)

```typescript
class HybridCrossFileSymbolManager {
  // Use data-structure-typed for optimized data storage
  private symbolIndex: HashMap<string, ApexSymbol> = new HashMap();
  private nameIndex: HashMap<string, string[]> = new HashMap();
  private fileIndex: HashMap<string, string[]> = new HashMap();

  // Use graphology for graph algorithms
  private referenceGraph: Graph = new Graph({ type: 'directed' });
  private inheritanceGraph: Graph = new Graph({ type: 'directed' });
  private dependencyGraph: Graph = new Graph({ type: 'directed' });

  // Fast symbol lookup using optimized data structures
  lookupSymbol(name: string): ApexSymbol | null {
    const symbolIds = this.nameIndex.get(name);
    if (!symbolIds || symbolIds.length === 0) return null;

    // Return first unambiguous symbol or resolve ambiguity
    return this.resolveAmbiguousSymbol(symbolIds);
  }

  // Graph-based analysis using graphology algorithms
  findReferencesTo(symbolId: string): Reference[] {
    return bfs(this.referenceGraph, symbolId, { mode: 'inbound' });
  }
}
```

### Phase 2: Graph Algorithm Integration (2-3 days)

```typescript
class GraphologyAlgorithms {
  // Dependency analysis using graphology
  analyzeDependencies(symbolId: string): DependencyAnalysis {
    const dependencies = bfs(this.dependencyGraph, symbolId, {
      mode: 'outbound',
    });
    const dependents = bfs(this.dependencyGraph, symbolId, { mode: 'inbound' });

    return {
      dependencies: dependencies.map((id) => this.symbolIndex.get(id)),
      dependents: dependents.map((id) => this.symbolIndex.get(id)),
      impactScore: dependents.length,
    };
  }

  // Circular dependency detection using graphology
  detectCircularDependencies(): CircularDependency[] {
    if (isAcyclic(this.dependencyGraph)) return [];

    // Use graphology algorithms to find cycles
    return this.findCyclesInGraph();
  }

  // Build order optimization using graphology
  getOptimalBuildOrder(): string[] {
    try {
      return topologicalSort(this.dependencyGraph);
    } catch (error) {
      // Handle circular dependencies
      return this.getPartialBuildOrder();
    }
  }
}
```

### Phase 3: Enhanced SymbolTable Integration (2-3 days)

```typescript
class EnhancedSymbolTable {
  // Existing scope-based structure
  private root: SymbolScope;
  private current: SymbolScope;

  // NEW: Hybrid cross-reference tracking
  private hybridManager: HybridCrossFileSymbolManager;

  constructor() {
    // Initialize hybrid manager
    this.hybridManager = new HybridCrossFileSymbolManager();
  }

  // ENHANCED: Add symbol with cross-reference tracking
  addSymbol(symbol: ApexSymbol): void {
    // Existing local registration
    this.current.addSymbol(symbol);

    // NEW: Register with hybrid manager
    this.hybridManager.addSymbol(symbol);
  }

  // NEW: Find all references to a symbol using graphology
  findReferencesTo(symbol: ApexSymbol): Reference[] {
    return this.hybridManager.findReferencesTo(symbol.fqn);
  }

  // NEW: Analyze dependencies using graphology
  analyzeDependencies(symbol: ApexSymbol): DependencyAnalysis {
    return this.hybridManager.analyzeDependencies(symbol.fqn);
  }
}
```

## Benefits of data-structure-typed + graphology Approach

### Performance Benefits:

- ✅ **82% faster** HashMap operations than native JavaScript
- ✅ **Optimized data structures** for all operations
- ✅ **Rich graph algorithms** from graphology ecosystem
- ✅ **Community-driven** optimizations and improvements

### Algorithm Benefits:

- ✅ **Built-in cycle detection** with `isAcyclic()`
- ✅ **Topological sorting** with `topologicalSort()`
- ✅ **Efficient traversal** with `bfs()`, `dfs()`, `dijkstra()`
- ✅ **Centrality analysis** with `betweenness()`, `closeness()`
- ✅ **Community detection** with `communities()`

### Development Benefits:

- ✅ **Active community** support for both libraries
- ✅ **Extensive documentation** and examples
- ✅ **TypeScript support** with full type safety
- ✅ **Modular architecture** for selective imports

## Conclusion

The **data-structure-typed + graphology** hybrid approach provides the best balance of performance and functionality:

- **For data operations**: `data-structure-typed` provides 82% faster operations than native JavaScript
- **For graph algorithms**: `graphology` provides a rich ecosystem of proven, optimized algorithms
- **For development**: Both libraries have active communities and extensive documentation

This approach enables:

- **Fast symbol resolution** with optimized data structures
- **Rich relationship analysis** with graph algorithms
- **Advanced code analysis** features like impact analysis and circular dependency detection
- **Future-proof architecture** with community-driven improvements

The implementation complexity is justified by the significant performance improvements and algorithmic capabilities gained.
