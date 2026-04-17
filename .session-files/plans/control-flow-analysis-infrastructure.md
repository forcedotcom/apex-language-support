---
name: Control Flow Analysis Infrastructure
overview: Implement Control Flow Analysis (CFA) infrastructure to enable advanced language server features including missing return statement detection, type narrowing, null safety analysis, and enhanced code completion. Build foundational CFG construction first, then implement high-value features that benefit from CFA.
todos:
  - id: cfg-foundation
    content: 'Phase 1: Build foundational CFG infrastructure - create CFGNode/CFGEdge types, ControlFlowGraph wrapper around DirectedGraph, and CFGBuilder using data-structure-typed'
    status: pending
  - id: cfg-basic-blocks
    content: 'Phase 1: Implement basic block identification - group statements into basic blocks, identify block boundaries'
    status: pending
  - id: cfg-edges
    content: 'Phase 1: Implement edge creation - sequential, conditional (if/else), loop (for/while), switch, exception (try/catch) edges'
    status: pending
  - id: path-analysis
    content: 'Phase 2: Implement path analysis infrastructure - PathAnalyzer for path enumeration, ReachabilityAnalyzer for reachability'
    status: pending
  - id: missing-returns
    content: 'Phase 3: Implement missing return statement detection - enhance ReturnStatementValidator to use CFG and check all paths have returns'
    status: pending
  - id: type-narrowing-infra
    content: 'Phase 4: Build type narrowing infrastructure - TypeNarrowing and FlowSensitiveTypes for tracking narrowed types through control flow'
    status: pending
  - id: completion-narrowing
    content: 'Phase 5: Enhance code completion with type narrowing - integrate CFG and type narrowing into CompletionProcessingService'
    status: pending
  - id: null-safety
    content: 'Phase 6: Implement null safety analysis - NullSafetyAnalyzer to track nullability and detect potential null dereferences'
    status: pending
  - id: unused-vars
    content: 'Phase 7: Implement unused variable detection - create UnusedVariableValidator using CFG to track variable definitions and uses'
    status: pending
  - id: complexity-metrics
    content: 'Phase 8: Implement cyclomatic complexity calculation - ComplexityAnalyzer to calculate McCabe complexity from CFG'
    status: pending
  - id: code-actions
    content: 'Phase 9: Enhance code actions with CFA - add missing return, remove unreachable code, initialize variable, remove unused variable actions'
    status: pending
  - id: cfg-caching
    content: 'Phase 10: Implement CFG caching and integration - CFGCache for performance, expose CFG through public API, integrate with validators and LSP services'
    status: pending
isProject: false
---

# Control Flow Analysis Infrastructure Implementation Plan

## Overview

This plan implements Control Flow Analysis (CFA) infrastructure to enable advanced language server features. CFA builds Control Flow Graphs (CFG) representing execution paths through code, enabling path analysis, reachability detection, and flow-sensitive type analysis.

## Architecture

### Control Flow Graph Structure

**Leveraging `data-structure-typed` DirectedGraph**:

The codebase already uses `DirectedGraph<VertexValue, EdgeValue>` from `data-structure-typed` (see `ApexSymbolGraph.ts`). We'll use the same infrastructure for CFG:

```
DirectedGraph<CFGNode, CFGEdge>
├── Vertices (CFGNode)
│   ├── key: string (node ID)
│   ├── value: CFGNode
│   │   ├── statements: Statement[]
│   │   ├── type: 'entry' | 'exit' | 'basic' | 'decision' | 'merge'
│   │   ├── location: SymbolLocation
│   │   └── metadata: { methodId, blockType, ... }
│   └── DirectedVertex<CFGNode>
└── Edges (CFGEdge)
    ├── src: vertex key (from node)
    ├── dest: vertex key (to node)
    ├── weight: number (default 1)
    └── value: CFGEdge
        ├── type: 'normal' | 'true' | 'false' | 'loop-back' | 'exception'
        ├── condition?: Expression (for if/switch edges)
        └── metadata: { sourceLocation, ... }
```

**Key API Methods** (from `data-structure-typed`):

- `addVertex(key, nodeValue)` - Add a CFG node
- `addEdge(fromKey, toKey, weight, edgeValue)` - Add control flow edge
- `getVertex(key)` - Get node by ID
- `incomingEdgesOf(vertexKey)` - Get predecessors
- `outgoingEdgesOf(vertexKey)` - Get successors
- `getVertices()` - Get all nodes
- `getEdges()` - Get all edges

### Integration Points

- **Parse Tree**: Build CFG from ANTLR parse tree
- **Symbol Table**: CFG nodes reference symbol table entries (for method context)
- **data-structure-typed**: Use `DirectedGraph` infrastructure (separate instance from ApexSymbolGraph)
- **Validators**: Use CFG for path analysis (missing returns, unreachable code)
- **LSP Services**: Use CFG for completion, hover, type narrowing

### Key Distinction: CFG vs Symbol Graph

**ApexSymbolGraph** (existing):

- Tracks relationships between symbols (cross-symbol)
- Nodes: Symbols (classes, methods, fields)
- Edges: References (method calls, field access, inheritance)
- Scope: Workspace-wide (all files)
- Purpose: Symbol resolution, find references, dependency analysis

**ControlFlowGraph** (new):

- Tracks execution flow within methods (intra-method)
- Nodes: Basic blocks (statements within a method)
- Edges: Control flow (if/else, loops, switch, exceptions)
- Scope: Method-scoped (one CFG per method)
- Purpose: Path analysis, reachability, type narrowing

**No Intersection**: These graphs serve completely different purposes and have no overlap. CFG will use `DirectedGraph` separately, not reuse ApexSymbolGraph.

### CFG Benefits for Pending Validations

CFG infrastructure enables several pending validations beyond missing return statements:

**1. Chained Expression Type Resolution** (OperatorValidator enhancement):

- **Problem**: `obj.field.method()` - need to resolve types through chain
- **CFG Help**:
  - Type narrowing: If `obj` is narrowed to `String` in a control flow path, then `obj.length()` is valid
  - Null safety: If `obj` could be null, `obj.field.method()` could fail
  - Flow-sensitive types: Type of `obj` changes along paths, affecting available methods
- **Example**: `if (obj instanceof String) { obj.length(); }` - CFG tracks that `obj` is `String` in that path

**2. Complex Expression Type Resolution** (OperatorValidator):

- **Problem**: `obj.method() + 5` - need return type of `method()` to validate arithmetic
- **CFG Help**:
  - Inter-procedural: Resolve `method()` return type by analyzing callee CFG
  - Type narrowing: Return type might be narrowed by control flow in callee
  - Null safety: Method might return null, affecting expression validity

**3. Exception Throw Variable/Method Expressions** (ExceptionValidator):

- **Problem**: `throw getException()` - need return type of `getException()`
- **CFG Help**:
  - Inter-procedural: Analyze `getException()` CFG to determine return type
  - Type compatibility: Check if return type extends Exception

**4. Collection Method Call Validation** (CollectionValidator):

- **Problem**: `list.all(predicate)` - need to validate predicate type matches element type
- **CFG Help**:
  - Type narrowing: If list element type is narrowed, predicate type must match
  - Flow-sensitive: Element type might vary by control flow path

**5. Null Safety Analysis** (New validator):

- **Problem**: `obj.field.method()` when `obj` might be null
- **CFG Help**:
  - Track nullability along paths
  - Detect null dereferences before they happen
  - Inter-procedural: Method calls might return null

### Inter-Procedural Analysis: Composing Method-Scoped CFGs

**Question**: How do method-scoped CFGs participate in cross-method analysis?

**Answer**: CFGs are method-scoped, but analyses can compose them for inter-procedural questions:

1. **Intra-Procedural (Method-Scoped)** - CFG analyzes single method:
   - Missing return statements (all paths in method must return)
   - Unreachable code within method
   - Local variable type narrowing (`if (x instanceof String)`)
   - Local null checks (`if (obj != null)`)
   - Unused local variables
2. **Inter-Procedural (Cross-Method)** - Compose CFGs across method calls:
   - **Null Safety**: `String result = getValue(); result.length;`
     - Resolve `getValue()` method call → find method symbol
     - Look up CFG for `getValue()` method
     - Analyze CFG paths: can any path return null?
     - Propagate nullability back to caller's CFG analysis
   - **Type Narrowing**: `String s = getString(); if (s != null) { s.length; }`
     - Resolve `getString()` → get return type from method signature
     - If return type is nullable, track nullability in caller's CFG
   - **Completion**: `obj.method().`
     - Resolve `method()` call → get return type
     - Build CFG for `method()` if needed for flow-sensitive return types
     - Use return type for completion filtering
   - **Return Type Analysis**: Enhanced method return type validation
     - Analyze callee's CFG to determine possible return types
     - Check compatibility with caller's assignment context

**Architecture for Inter-Procedural Analysis**:

```
Caller Method CFG
├── Method call node (e.g., "result = getValue()")
│   ├── Resolve method call → MethodSymbol
│   ├── Lookup CFG for callee method (from CFGCache)
│   ├── Analyze callee CFG:
│   │   ├── Can return null? → Propagate to caller
│   │   ├── Return type narrowing? → Propagate to caller
│   │   └── Side effects? → Track in caller
│   └── Continue caller CFG analysis with propagated info
```

**Implementation Strategy**:

- **CFGCache**: Store CFGs keyed by method signature + file URI
- **Method Call Resolution**: Use `ISymbolManager` to resolve method calls to `MethodSymbol`
- **CFG Lookup**: Query `CFGCache` for callee's CFG
- **Analysis Composition**:
  - For null safety: Analyze callee CFG paths → determine if any path returns null
  - For type narrowing: Get return type from method signature (declared type)
  - For flow-sensitive types: Analyze callee CFG → determine possible return types per path
- **Propagation**: Merge callee analysis results into caller's CFG state

**Limitations**:

- **Recursion**: Limit depth to prevent infinite analysis
- **Performance**: Inter-procedural analysis is expensive - cache aggressively
- **Incomplete Information**: If callee CFG unavailable (missing file, not parsed), fall back to method signature only
- **Polymorphism**: For virtual method calls, analyze all possible callees (union of results)

**Example Flow**:

```apex
// File A
String result = getValue();  // Method call node in CFG
result.length;               // Null dereference check

// Analysis:
// 1. Build CFG for current method (File A)
// 2. At method call node: resolve getValue() → MethodSymbol
// 3. Lookup CFG for getValue() method (from File B)
// 4. Analyze getValue() CFG: check if any path returns null
// 5. Propagate: "getValue() can return null" → caller CFG
// 6. Continue analysis: result.length has potential null dereference
```

## Implementation Phases

### Phase 1: Foundation - CFG Construction

**Files to Create**:

- `packages/apex-parser-ast/src/analysis/controlflow/ControlFlowGraph.ts` - CFG wrapper around DirectedGraph
- `packages/apex-parser-ast/src/analysis/controlflow/CFGBuilder.ts` - Builds CFG from parse tree
- `packages/apex-parser-ast/src/analysis/controlflow/CFGNode.ts` - Node value type (used as DirectedGraph vertex value)
- `packages/apex-parser-ast/src/analysis/controlflow/CFGEdge.ts` - Edge value type (used as DirectedGraph edge value)

**Key Components**:

1. **ControlFlowGraph Class**:
   - Wraps `DirectedGraph<CFGNode, CFGEdge>` from `data-structure-typed`
   - Provides CFG-specific convenience methods
   - Manages node IDs and entry/exit nodes
   - Similar pattern to `ApexSymbolGraph` but for control flow
2. **CFGNode Value Type** (vertex value in DirectedGraph):
   ```typescript
   interface CFGNode {
     statements: Statement[];
     type: 'entry' | 'exit' | 'basic' | 'decision' | 'merge';
     location: SymbolLocation;
     methodId?: string; // Reference to method symbol
     metadata?: { ... };
   }
   ```
3. **CFGEdge Value Type** (edge value in DirectedGraph):
   ```typescript
   interface CFGEdge {
     type: 'normal' | 'true' | 'false' | 'loop-back' | 'exception';
     condition?: Expression; // For if/switch edges
     sourceLocation?: SymbolLocation;
   }
   ```
4. **CFGBuilder**:
   - Walk parse tree using listener pattern (similar to existing validators)
   - Identify basic blocks (maximal sequences without branches)
   - Use `graph.addVertex(nodeId, cfgNode)` to add nodes
   - Use `graph.addEdge(fromId, toId, 1, cfgEdge)` to add edges
   - Handle exceptions (try/catch/finally edges)
   - Handle loops (back-edges, exit edges)
5. **Basic Block Identification**:
   - Start of basic block: method entry, targets of branches, after branches
   - End of basic block: branches, method exit, exception throws

**Dependencies**:

- ANTLR parse tree (already available)
- Symbol table (for method/constructor context)
- `data-structure-typed` DirectedGraph (already in dependencies, used by ApexSymbolGraph)

### Phase 2: Path Analysis Infrastructure

**Files to Create**:

- `packages/apex-parser-ast/src/analysis/controlflow/PathAnalyzer.ts` - Path enumeration and analysis
- `packages/apex-parser-ast/src/analysis/controlflow/ReachabilityAnalyzer.ts` - Reachability analysis

**Key Features**:

1. **Path Enumeration**:
   - Enumerate all paths from entry to exit
   - Limit depth to prevent exponential explosion
   - Handle loops (visit loop header max N times)
   - Track visited nodes to detect cycles
2. **Reachability Analysis**:
   - Determine if a node is reachable from entry
   - Determine if a node can reach exit
   - Identify unreachable code
3. **Path Properties**:
   - Track which statements execute on each path
   - Track which variables are assigned/used
   - Track return statements per path

### Phase 3: Missing Return Statement Detection

**Files to Modify**:

- `packages/apex-parser-ast/src/semantics/validation/validators/ReturnStatementValidator.ts`

**Implementation**:

1. **Enhance ReturnStatementValidator**:
   - Build CFG for each method/constructor
   - Enumerate all paths from entry to exit
   - Check if every path has a return statement (for non-void methods)
   - Handle exceptions (throw statements also exit methods)
   - Handle void methods (should not return values)
2. **Path Analysis**:
   - For each path, check if it ends with return or throw
   - Report `INVALID_RETURN_NON_VOID` for paths without return
   - Handle switch statements (all cases must return)
   - Handle if/else chains (all branches must return)
3. **Edge Cases**:
   - Infinite loops (may never return - warn but don't error)
   - Recursive calls (may never return - warn but don't error)
   - Exception-only paths (throw is valid exit)

**Test Files**:

- `packages/apex-parser-ast/test/fixtures/validation/return-statement/MethodWithMissingReturn.cls`
- `packages/apex-parser-ast/test/fixtures/validation/return-statement/MethodWithAllPathsReturn.cls`
- `packages/apex-parser-ast/test/fixtures/validation/return-statement/MethodWithInfiniteLoop.cls`

### Phase 4: Type Narrowing Infrastructure

**Files to Create**:

- `packages/apex-parser-ast/src/analysis/controlflow/TypeNarrowing.ts` - Type narrowing analysis
- `packages/apex-parser-ast/src/analysis/controlflow/FlowSensitiveTypes.ts` - Flow-sensitive type tracking

**Key Features**:

1. **Intra-Procedural Type Narrowing Rules**:
   - `instanceof` checks: `if (obj instanceof String)` → obj is String
   - Null checks: `if (obj != null)` → obj is non-null
   - Equality checks: `if (x == 5)` → x is Integer(5) if applicable
   - Type guards: Custom methods that narrow types
2. **Flow-Sensitive Type Tracking** (within method):
   - Track narrowed types along each path in method's CFG
   - Merge types at merge points (union of possible types)
   - Propagate types through assignments
   - Handle type widening (assignments can widen types)
3. **Inter-Procedural Type Narrowing**:
   - Method call return types: use method signature (declared return type)
   - For flow-sensitive return types: analyze callee CFG to determine possible return types per path
   - Propagate narrowed return types to caller's CFG state
   - Example: `String s = getString();` → s has type String (from method signature)
4. **Integration with Completion**:
   - Use narrowed types (both intra and inter-procedural) to filter completion candidates
   - Suggest methods/properties based on narrowed type
   - Filter out incompatible operations

### Phase 5: Enhanced Code Completion with Type Narrowing

**Files to Modify**:

- `packages/lsp-compliant-services/src/services/CompletionProcessingService.ts`

**Implementation**:

1. **Context Analysis**:
   - Build CFG for method containing cursor position
   - Determine execution path to cursor
   - Apply type narrowing rules along path
   - Get narrowed types for variables at cursor
2. **Completion Filtering**:
   - Filter methods by narrowed type (not just declared type)
   - Suggest String methods after `instanceof String` check
   - Filter null-unsafe operations after null checks
   - Prioritize completions based on narrowed types
3. **Dead Code Detection**:
   - Check if cursor is in unreachable code
   - Gray out or filter completions in dead code
   - Show warning in completion context

### Phase 6: Null Safety Analysis

**Files to Create**:

- `packages/apex-parser-ast/src/analysis/controlflow/NullSafetyAnalyzer.ts` - Null safety tracking

**Implementation**:

1. **Intra-Procedural Nullability Tracking**:
   - Track which variables can be null at each point within method
   - Propagate nullability through assignments
   - Handle null checks (`if (obj != null)`) → narrow to non-null
   - Handle null assignments (`obj = null`) → mark as null
2. **Inter-Procedural Nullability Analysis**:
   - At method call nodes: resolve callee method → lookup CFG
   - Analyze callee CFG paths: determine if any path can return null
   - Propagate nullability from callee to caller's CFG state
   - Handle method signatures: if return type is nullable, mark result as potentially null
   - Limit recursion depth for inter-procedural analysis
3. **Null Dereference Detection**:
   - Detect potential null pointer exceptions
   - Check if variable is null before dereference (considering both intra and inter-procedural nullability)
   - Consider null checks in control flow (type narrowing)
   - Report warnings for potential null dereferences
4. **Integration**:
   - Add to diagnostics (new error code or warning)
   - Show in hover information
   - Filter completions (don't suggest null-unsafe operations)

### Phase 7: Unused Variable Detection

**Files to Create**:

- `packages/apex-parser-ast/src/semantics/validation/validators/UnusedVariableValidator.ts`

**Implementation**:

1. **Variable Usage Tracking**:
   - Track variable definitions (assignments)
   - Track variable uses (reads)
   - Use CFG to determine if uses are reachable
   - Handle parameters (may be unused)
2. **Detection Rules**:
   - Variable assigned but never read → unused
   - Parameter never read → unused parameter
   - Local variable never read → unused local
   - Exception variable in catch never read → unused exception
3. **Reporting**:
   - Report as warnings (not errors)
   - Allow configuration to enable/disable
   - Different severity for parameters vs locals

### Phase 8: Code Metrics (Cyclomatic Complexity)

**Files to Create**:

- `packages/apex-parser-ast/src/analysis/controlflow/ComplexityAnalyzer.ts` - Complexity calculation

**Implementation**:

1. **McCabe Complexity**:
   - Calculate from CFG: `Complexity = E - N + 2P`
   - E = edges, N = nodes, P = connected components
   - Or count decision points + 1
2. **Exposure**:
   - Add to hover information (show complexity on method hover)
   - Add to diagnostics (warn for high complexity)
   - Add to code lens (show complexity inline)
   - Code action to suggest refactoring for complex methods
3. **Configuration**:
   - Threshold for warnings (default: 10)
   - Different thresholds for different method types

### Phase 9: Enhanced Code Actions

**Files to Modify**:

- `packages/lsp-compliant-services/src/services/CodeActionProcessingService.ts`

**New Code Actions**:

1. **Add Missing Return Statement**:
   - Detect missing return in non-void method
   - Suggest adding return at end of method
   - Handle different return types (suggest appropriate default)
2. **Remove Unreachable Code**:
   - Detect unreachable statements
   - Offer to remove dead code
   - Show preview of what will be removed
3. **Initialize Variable Before Use**:
   - Detect uninitialized variable usage
   - Suggest initialization
   - Determine appropriate initial value
4. **Remove Unused Variable**:
   - Detect unused variables
   - Offer to remove variable and assignment
   - Handle cases where removal affects other code

### Phase 10: Integration & Caching

**Files to Create/Modify**:

- `packages/apex-parser-ast/src/analysis/controlflow/CFGCache.ts` - Cache CFG per method
- `packages/apex-parser-ast/src/analysis/controlflow/InterProceduralAnalyzer.ts` - Composes CFGs for cross-method analysis
- `packages/apex-parser-ast/src/analysis/controlflow/index.ts` - Public API

**Caching Strategy**:

1. **CFG Cache**:
   - Cache CFG per method (keyed by method signature + file URI + version)
   - Invalidate on method changes
   - Incremental updates when possible
   - Support lookup by MethodSymbol for inter-procedural analysis
2. **Inter-Procedural Analysis Support**:
   - `InterProceduralAnalyzer`: Resolves method calls → looks up callee CFGs
   - Limits recursion depth (default: 3 levels)
   - Handles missing CFGs gracefully (fall back to method signature)
   - Caches inter-procedural analysis results
3. **Performance**:
   - Build CFG lazily (only when needed)
   - Cache path analysis results
   - Limit path enumeration depth
   - Use heuristics for complex methods
   - Limit inter-procedural analysis depth to prevent exponential explosion
4. **Integration**:
   - Expose CFG through ISymbolManager or new interface
   - Expose InterProceduralAnalyzer for cross-method queries
   - Make CFG available to validators
   - Make CFG available to LSP services

## Implementation Details

### CFG Construction Algorithm

1. **Identify Basic Blocks**:
   - Start: method entry, branch targets, after branches
   - End: branches, method exit, exception throws
   - Group consecutive statements into basic blocks
2. **Create Edges**:
   - Sequential: from block to next block
   - Conditional: if/else edges with conditions
   - Loop: back-edge to loop header, exit edge
   - Switch: edges for each case
   - Exception: try → catch/finally edges
3. **Handle Special Cases**:
   - Return statements: edge to exit node
   - Throw statements: edge to exit or catch node
   - Break/continue: edges to appropriate targets
   - Switch break: edge to after switch

### Path Enumeration Algorithm

**Using DirectedGraph API**:

1. **Depth-First Search**:
   - Start from entry node (get via `graph.getVertex(entryNodeId)`)
   - Use `outgoingEdgesOf(vertexKey)` to get successors
   - Follow edges, tracking visited nodes
   - Limit loop iterations (max N visits to loop header)
   - Collect paths that reach exit
2. **Cycle Detection**:
   - Track visited nodes in current path
   - Detect cycles (revisit node in same path)
   - Handle cycles by limiting iterations
   - Use `incomingEdgesOf()` and `outgoingEdgesOf()` for graph traversal
3. **Path Properties**:
   - Track statements executed on path (from CFGNode.statements)
   - Track variables assigned/used
   - Track return statements
   - Track exceptions thrown
   - Access edge metadata via `edge.value` (CFGEdge type, condition, etc.)

## Testing Strategy

### Unit Tests

1. **CFG Construction**:
   - Test basic block identification
   - Test edge creation for if/else
   - Test edge creation for loops
   - Test edge creation for switch
   - Test edge creation for try/catch
2. **Path Analysis**:
   - Test path enumeration
   - Test reachability analysis
   - Test cycle detection
   - Test path property tracking
3. **Validators**:
   - Test missing return detection
   - Test unused variable detection
   - Test null safety analysis

### Integration Tests

1. **LSP Services**:
   - Test completion with type narrowing
   - Test hover with CFG information
   - Test code actions
2. **Performance**:
   - Test CFG construction performance
   - Test caching effectiveness
   - Test incremental updates

## Success Metrics

1. **Functionality**:
   - Missing return statements detected correctly
   - Type narrowing works in completion
   - Null safety warnings accurate
   - Unused variables detected
2. **Performance**:
   - CFG construction < 100ms per method
   - Path enumeration < 500ms per method
   - Caching reduces redundant work by >80%
3. **Coverage**:
   - All control flow constructs handled
   - Edge cases (loops, exceptions, recursion) handled
   - Integration with existing validators working

## Dependencies

- ANTLR parse tree (already available)
- Symbol table (already available)
- `data-structure-typed` DirectedGraph (already in dependencies, used by ApexSymbolGraph)
- Effect library (already used)
- Existing validator infrastructure

## Leveraging Existing Infrastructure

**Key Insight**: `ApexSymbolGraph.ts` already demonstrates how to use `DirectedGraph`:

- Uses `DirectedGraph<ReferenceNode, ReferenceEdge>`
- Methods: `addVertex()`, `addEdge()`, `getVertex()`, `incomingEdgesOf()`, `outgoingEdgesOf()`
- Similar pattern can be used for CFG: `DirectedGraph<CFGNode, CFGEdge>`

**Benefits**:

- No need to build custom graph data structures
- Proven, tested graph implementation
- Consistent with existing codebase patterns
- Rich graph algorithms available from library

## Risks & Mitigations

1. **Performance**: CFG construction and path enumeration can be expensive
   - **Mitigation**: Caching, lazy construction, limit path depth
2. **Complexity**: Path enumeration can be exponential
   - **Mitigation**: Limit loop iterations, use heuristics, early termination
3. **Accuracy**: Some analyses may have false positives/negatives
   - **Mitigation**: Conservative analysis, allow configuration, user feedback
4. **Integration**: CFG needs to integrate with many existing systems
   - **Mitigation**: Clean API, gradual rollout, backward compatibility
