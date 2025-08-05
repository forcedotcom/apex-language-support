# Unified LSP Implementation Plan

## Executive Summary

This plan combines analysis from symbol management, namespace/FQN systems, and LSP infrastructure to create a **comprehensive roadmap** for fixing critical data loss issues and enhancing LSP functionality. The plan addresses **immediate symbol storage overwrites** while building toward **complete LSP feature support**.

---

## 🚨 **Critical Issues Identified**

### **Issue 1: Symbol Storage Overwrites (DATA LOSS)** ⚠️ **URGENT**

- **Problem**: Same-name variables in different method scopes get identical storage IDs
- **Impact**: Previous symbols permanently lost when new symbols with same name are added
- **Root Cause**: `SymbolFactory.generateId()` uses only `${filePath}:${name}`
- **Examples**:
  - `method1() { String x; }` → ID: `"TestClass.cls:x"` ✅ Stored
  - `method2() { String x; }` → ID: `"TestClass.cls:x"` ❌ **OVERWRITES method1's symbol**

### **Issue 2: Incomplete Reference Capture** 🔶 **HIGH PRIORITY**

- **Problem**: Only ~60-70% of identifier usage creates TypeReferences
- **Impact**: LSP features miss many symbol references
- **Root Cause**: Missing visitor methods in ApexSymbolCollectorListener
- **Examples**: Primary expressions (`myVariable`), assignments (`result = ...`), expressions

### **Issue 3: No Background Symbol Integration** 🔶 **MEDIUM PRIORITY**

- **Problem**: No efficient SymbolTable → ApexSymbolManager data flow
- **Impact**: Advanced LSP features not populated from parse-time data
- **Root Cause**: Missing lazy transfer mechanism

### **Issue 4: FQN Policy Unclear** 🔹 **LOW PRIORITY**

- **Problem**: Unclear FQN construction for local variables and parameters
- **Impact**: Inconsistent user-facing qualified names
- **Note**: Independent of storage fix

---

## 📋 **Unified Implementation Strategy**

### **PHASE 1: DATA LOSS PREVENTION** ⚠️ **CRITICAL - 1 WEEK**

**Goal**: Eliminate symbol storage overwrites immediately

#### 1.1 Scope-Qualified Symbol IDs

```typescript
// NEW: Include complete scope path in symbol IDs
class SymbolFactory {
  static generateScopedId(
    name: string,
    kind: SymbolKind,
    filePath: string,
    scopePath: string[],
  ): string {
    const scopeQualifier = scopePath.length > 0 ? scopePath.join('.') : 'file';
    return `${filePath}:${scopeQualifier}:${name}:${kind}`;
  }
}

// Examples:
// "TestClass.cls:TestClass.method1:result:variable"  ← Method 1
// "TestClass.cls:TestClass.method2:result:variable"  ← Method 2
// "TestClass.cls:TestClass.method1.block1:data:variable"  ← Block scope
```

#### 1.2 Scope Path Builder

```typescript
class ApexSymbolCollectorListener {
  private buildCurrentScopePath(): string[] {
    const path: string[] = [];

    // Add type scope
    if (this.currentTypeSymbol) {
      path.push(this.currentTypeSymbol.name);
    }

    // Add method scope
    if (this.currentMethodSymbol) {
      path.push(this.currentMethodSymbol.name);
    }

    // Add block scopes from symbol table hierarchy
    const currentScope = this.symbolTable.getCurrentScope();
    let scope = currentScope;
    const blockScopes: string[] = [];

    while (scope && scope.name.startsWith('block')) {
      blockScopes.unshift(scope.name);
      scope = scope.parent;
    }

    path.push(...blockScopes);
    return path;
  }
}
```

#### 1.3 Update Symbol Creation

```typescript
// Update createVariableSymbol to use scoped IDs
private createVariableSymbol(/*...*/): VariableSymbol {
  const scopePath = this.buildCurrentScopePath();

  // Use scoped ID generation (modify SymbolFactory.createFullSymbol)
  const symbol = SymbolFactory.createFullScopedSymbol(
    name, kind, location, this.currentFilePath,
    modifiers, parent?.id, { type },
    scopePath, // NEW: scope context
    namespace, annotations, identifierLocation
  );

  return symbol;
}
```

**Success Criteria:**

- ✅ No more symbol overwrites in storage
- ✅ All declared variables preserved in symbol table
- ✅ LSP features work for all symbol instances
- ✅ Symbol IDs remain internal (don't affect user-facing FQNs)

### **PHASE 2: COMPLETE REFERENCE CAPTURE** 🔶 **HIGH - 1-2 WEEKS**

**Goal**: Capture ALL identifier usage as TypeReferences (currently ~60-70%)

#### 2.1 Missing Visitor Methods

```typescript
// ADD: Primary expression references
enterPrimary(ctx: PrimaryContext): void {
  if (ctx.idPrimary()) {
    const ref = TypeReferenceFactory.createVariableUsageReference(
      ctx.idPrimary().text,
      this.getLocation(ctx),
      ReferenceContext.VARIABLE_USAGE,
      this.getCurrentMethodName()
    );
    this.symbolTable.addTypeReference(ref);
  }
}

// ADD: Assignment expression references
enterAssignExpression(ctx: AssignExpressionContext): void {
  // Capture left-hand side of assignments
  const ref = TypeReferenceFactory.createVariableUsageReference(/*...*/);
  this.symbolTable.addTypeReference(ref);
}

// ADD: General expression references
enterExpression(ctx: ExpressionContext): void {
  // Capture any remaining identifier usage
}
```

#### 2.2 Reference Coverage Audit

```typescript
class ReferenceCoverageAuditor {
  // Measure what percentage of identifier usage creates TypeReferences
  auditReferenceCapture(symbolTable: SymbolTable): CoverageReport {
    const totalIdentifiers = this.countAllIdentifiers();
    const capturedReferences = symbolTable.getAllReferences().length;
    return {
      totalIdentifiers,
      capturedReferences,
      coveragePercentage: (capturedReferences / totalIdentifiers) * 100,
      missingContexts: this.identifyMissingContexts(),
    };
  }
}
```

**Success Criteria:**

- ✅ 95%+ identifier usage creates TypeReferences
- ✅ All reference contexts covered (method calls, field access, variable usage, etc.)
- ✅ Parse performance maintained
- ✅ Enhanced LSP features (better completions, references, hover)

### **PHASE 3: BACKGROUND SYMBOL INTEGRATION** 🔶 **MEDIUM - 2-3 WEEKS**

**Goal**: Efficient SymbolTable → ApexSymbolManager data flow for advanced features

#### 3.1 Lazy Transfer Mechanism

```typescript
class SymbolTableToManagerAdapter {
  // Background processing without blocking parse
  async transferSymbolTable(
    symbolTable: SymbolTable,
    filePath: string,
    manager: ApexSymbolManager,
  ): Promise<void> {
    // Stream symbols to manager
    await this.streamSymbolsToManager(symbolTable.getAllSymbols(), manager);

    // Stream references to graph
    await this.streamReferencesToGraph(symbolTable.getAllReferences(), manager);

    // Trigger cross-file resolution
    await this.triggerBackgroundResolution(manager, filePath);
  }

  private async streamReferencesToGraph(
    references: TypeReference[],
    manager: ApexSymbolManager,
  ): Promise<void> {
    for (const ref of references) {
      await this.convertReferenceToGraphEdge(ref, manager);
    }
  }
}
```

#### 3.2 ApexSymbolGraph Population

```typescript
class BackgroundSymbolProcessor {
  // Convert TypeReferences to ApexSymbolGraph edges
  private convertReferenceToGraphEdge(
    ref: TypeReference,
    manager: ApexSymbolManager,
  ): void {
    // Map ReferenceContext to ReferenceType enum
    const referenceType = this.mapContextToReferenceType(ref.context);

    // Create graph relationship
    manager.addSymbolRelationship(
      ref.qualifier || 'unknown',
      ref.name,
      referenceType,
      ref.location,
    );
  }

  private mapContextToReferenceType(context: ReferenceContext): ReferenceType {
    switch (context) {
      case 'METHOD_CALL':
        return ReferenceType.METHOD_CALL;
      case 'FIELD_ACCESS':
        return ReferenceType.FIELD_ACCESS;
      case 'VARIABLE_USAGE':
        return ReferenceType.VARIABLE_REFERENCE;
      // ... map all contexts
    }
  }
}
```

#### 3.3 Browser-Optimized Processing

```typescript
class BrowserOptimizedProcessor {
  // Use Web Workers for background processing
  async processInBackground(symbolTable: SymbolTable): Promise<void> {
    if (typeof Worker !== 'undefined') {
      // Use Web Worker for heavy processing
      await this.processWithWebWorker(symbolTable);
    } else {
      // Fallback to chunked processing with requestIdleCallback
      await this.processWithIdleCallback(symbolTable);
    }
  }
}
```

**Success Criteria:**

- ✅ All LSP features work with full symbol coverage
- ✅ Cross-file resolution working
- ✅ Background processing doesn't block UI
- ✅ Advanced features available (dependency analysis, impact assessment)

### **PHASE 4: OPTIMIZATION & POLICY CLARIFICATION** 🔹 **LOW - 1-2 WEEKS**

**Goal**: Performance optimization and FQN policy clarification

#### 4.1 FQN Policy Definition

```typescript
// Clarify FQN rules by symbol type
interface FQNPolicy {
  // Type-level symbols: "Namespace.TypeName"
  typeSymbols: (symbol: ApexSymbol) => string;

  // Member symbols: "TypeName.memberName"
  memberSymbols: (symbol: ApexSymbol) => string;

  // Local variables: Just "variableName" (not globally referenceable)
  localVariables: (symbol: ApexSymbol) => string;

  // Parameters: Just "paramName" within method context
  parameters: (symbol: ApexSymbol) => string;
}
```

#### 4.2 Performance Optimization

```typescript
class PerformanceOptimizations {
  // Cache scope path calculations
  private scopePathCache = new Map<string, string[]>();

  // Memory management for long-running sessions
  private optimizeMemoryUsage(): void {
    // Incremental cleanup of processed symbols
    // Lazy loading of symbol relationships
    // Cache size management
  }
}
```

---

## 🎯 **Implementation Timeline**

### **Week 1: CRITICAL DATA LOSS FIX**

- [ ] Implement scope-qualified symbol IDs
- [ ] Update SymbolFactory.generateScopedId()
- [ ] Update ApexSymbolCollectorListener.buildCurrentScopePath()
- [ ] Test symbol storage uniqueness
- [ ] Verify no FQN impact

### **Week 2-3: COMPLETE REFERENCE CAPTURE**

- [ ] Add missing visitor methods (enterPrimary, enterAssignExpression, enterExpression)
- [ ] Audit current reference coverage
- [ ] Implement ReferenceCoverageAuditor
- [ ] Test LSP feature improvements
- [ ] Performance validation

### **Week 4-6: BACKGROUND INTEGRATION**

- [ ] Implement SymbolTableToManagerAdapter
- [ ] Build BackgroundSymbolProcessor
- [ ] Add ApexSymbolGraph population
- [ ] Browser optimization (Web Workers, idle callbacks)
- [ ] Cross-file resolution testing

### **Week 7-8: OPTIMIZATION & POLISH**

- [ ] Define and implement FQN policy
- [ ] Performance optimization
- [ ] Memory management
- [ ] Comprehensive testing
- [ ] Documentation updates

---

## ✅ **Success Metrics**

### **Phase 1 Success (Week 1)**

- ✅ **Zero symbol overwrites**: Storage uniqueness achieved
- ✅ **All symbols preserved**: No data loss in symbol table
- ✅ **LSP features restored**: Go-to-definition, hover work for all variables
- ✅ **FQNs unchanged**: User-facing names remain clean

### **Phase 2 Success (Week 3)**

- ✅ **95%+ reference capture**: Comprehensive identifier tracking
- ✅ **Enhanced LSP features**: Better completions, references, rename
- ✅ **Parse performance maintained**: No measurable slowdown
- ✅ **Coverage metrics**: Quantified improvement in symbol tracking

### **Phase 3 Success (Week 6)**

- ✅ **Advanced LSP features**: Full cross-file support
- ✅ **Background processing**: Non-blocking symbol analysis
- ✅ **Browser compatibility**: Works in constrained environments
- ✅ **Production ready**: Suitable for real-world usage

### **Phase 4 Success (Week 8)**

- ✅ **Performance optimized**: Memory and CPU efficiency
- ✅ **Policy clarity**: Clear FQN construction rules
- ✅ **Documentation complete**: Implementation and usage guides
- ✅ **Long-term maintainable**: Clean architecture for future enhancement

---

## 🛡️ **Risk Mitigation**

### **Technical Risks**

- **Symbol ID breaking changes**: Maintain backward compatibility with existing APIs
- **Performance regression**: Continuous benchmarking and optimization
- **Memory leaks**: Careful lifecycle management and cleanup
- **Browser compatibility**: Progressive enhancement and fallbacks

### **Process Risks**

- **Scope creep**: Strict phase boundaries and success criteria
- **Integration issues**: Comprehensive testing at each phase
- **Timeline pressure**: Phase 1 is critical, others can be staged
- **Quality assurance**: Automated testing and code review

---

## 🏁 **Next Steps**

### **Immediate Actions (This Week)**

1. **Start Phase 1**: Implement scope-qualified symbol IDs
2. **Set up testing**: Create test cases for symbol storage scenarios
3. **Baseline measurement**: Document current symbol overwrite issues
4. **Code review preparation**: Ensure changes are reviewable

### **Preparation for Phase 2**

1. **Reference audit setup**: Prepare coverage measurement tools
2. **Grammar review**: Identify all identifier contexts in Apex grammar
3. **Performance baseline**: Measure current parse performance

---

## 📚 **LSP Compliance**

This implementation targets **LSP 3.17** compliance with focus on:

### **Core Language Features**

- **Go to Definition** (`textDocument/definition`)
- **Find References** (`textDocument/references`)
- **Hover** (`textDocument/hover`)
- **Document Symbols** (`textDocument/documentSymbol`)
- **Completion** (`textDocument/completion`)
- **Rename** (`textDocument/rename`)

### **Advanced Features** (Phase 3)

- **Semantic Tokens** (`textDocument/semanticTokens`)
- **Call Hierarchy** (`textDocument/prepareCallHierarchy`)
- **Type Hierarchy** (`textDocument/prepareTypeHierarchy`)
- **Document Highlight** (`textDocument/documentHighlight`)
- **Code Actions** (`textDocument/codeAction`)

### **Performance Considerations**

- **Incremental sync** for large files
- **Partial results** for long-running operations
- **Background processing** for cross-file features
- **Memory optimization** for browser environments

---

**This unified plan addresses all critical issues identified in the analysis while providing a clear, phased approach to implementation that prioritizes data loss prevention and builds toward comprehensive LSP support.**
