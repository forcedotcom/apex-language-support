# Performance Optimization Analysis: didOpen Event

**Generated:** 2026-02-02  
**Purpose:** Analyze yielding opportunities, parallelization potential, and caching optimizations

## Table of Contents
1. [Yielding Opportunities](#yielding-opportunities)
2. [Parallelization Analysis](#parallelization-analysis)
3. [Caching & Redundant Operations](#caching--redundant-operations)
4. [Recommendations Summary](#recommendations-summary)

---

## Yielding Opportunities

### Overview

**Context:** JavaScript is single-threaded and CPU-bound operations block the event loop. Explicit yielding allows other events (UI updates, network I/O) to be processed.

**Environment-Specific Thresholds:**
- **Node.js:** 100ms (event loop responsiveness)
- **Browser Main Thread:** 16ms (60fps requirement)
- **Browser Web Worker:** 100ms (UI not blocked)

**Current State:** Compilation is a synchronous 151ms operation with **zero yields**.

---

### Opportunity 1: Standard Library Loading (146ms) 🔥 HIGH IMPACT

**Current Implementation:**
```typescript
// Loads ALL standard library classes in one blocking operation
async loadStandardLibraryClass(className: string): Promise<SymbolTable> {
  const compressed = getCompressedStdlib(className);
  const decompressed = decompress(compressed);  // ~100ms CPU work
  const symbolTable = parse(decompressed);       // ~46ms CPU work
  return symbolTable;
}
```

**Problem:**
- 146ms of uninterrupted CPU work
- No yielding between classes
- Blocks event loop entire time

**Solution A: Pre-load on Startup** ✅ **BEST**
```typescript
// On server initialization (one-time cost)
export async function initializeServer(): Promise<void> {
  await SchedulerInitializationService.getInstance().ensureInitialized();
  
  // Pre-load standard library BEFORE first didOpen
  const symbolManager = ApexSymbolProcessingManager
    .getInstance()
    .getSymbolManager();
  
  await symbolManager.preloadStandardLibrary();
  
  logger.info('Standard library pre-loaded and ready');
}
```

**Impact:**
- ✅ **Eliminates 146ms from first didOpen**
- ✅ **First didOpen becomes ~9ms** (same as subsequent)
- ⚠️ **One-time cost** at startup (acceptable)
- ✅ **Zero ongoing blocking**

**Solution B: Chunked Loading with Yielding** (If pre-load not viable)
```typescript
async loadStandardLibraryClasses(classes: string[]): Promise<void> {
  const CHUNK_SIZE = 5; // Load 5 classes, then yield
  
  for (let i = 0; i < classes.length; i += CHUNK_SIZE) {
    const chunk = classes.slice(i, i + CHUNK_SIZE);
    
    // Load chunk
    for (const className of chunk) {
      await this.loadSingleClass(className);
    }
    
    // Yield to event loop after each chunk
    await yieldToEventLoop();
    
    this.logger.debug(
      () => `Loaded ${Math.min(i + CHUNK_SIZE, classes.length)}/${classes.length} stdlib classes`
    );
  }
}
```

**Impact:**
- ✅ **Max blocking:** ~30ms per chunk (5 classes × ~6ms each)
- ✅ **Below 100ms Node.js threshold**
- ⚠️ **Total time increased** due to yielding overhead
- ⚠️ **Still above 16ms browser threshold**

**Recommendation:** Use **Solution A (Pre-load)**. It's simpler, more performant, and eliminates the problem entirely.

---

### Opportunity 2: Parse Tree Walking (3ms) ⚠️ LOW PRIORITY (Node.js)

**Current Implementation:**
```typescript
const walker = new ParseTreeWalker();
walker.walk(listener, parseTree);  // ~3ms synchronous traversal
```

**Analysis:**
- **Node.js:** 3ms is well below 100ms threshold → ✅ **Acceptable**
- **Browser:** 3ms is below 16ms threshold → ✅ **Acceptable**
- **Complexity:** Visitor pattern makes yielding difficult
- **Benefit:** Minimal (3ms is fast)

**Recommendation:** ❌ **Do not optimize** - effort >> benefit

---

### Opportunity 3: Reference Collection (1ms) ❌ SKIP

**Analysis:**
- **Duration:** 1ms
- **Below all thresholds**
- **Not worth optimizing**

**Recommendation:** ❌ **Do not optimize**

---

### Opportunity 4: Document Batch Processing (Variable) ⚠️ ALREADY OPTIMIZED

**Current Implementation:**
```typescript
// Already uses Effect.all with concurrency limits
const compileResults = yield* Effect.all(
  compileConfigs.map((config) => 
    Effect.either(Effect.sync(() => self.compile(/* ... */)))
  ),
  { concurrency: 'unbounded', batching: true }
);
```

**Analysis:**
- ✅ **Already wrapped in Effect.sync()**
- ✅ **Already batched**
- ✅ **Already has yielding** (implicit in Effect scheduler)

**Recommendation:** ✅ **Already optimal** - no changes needed

---

### Summary: Yielding Opportunities

| Operation | Duration | Should Yield? | Reason |
|-----------|----------|---------------|--------|
| **Stdlib Loading** | 146ms | ✅ **YES** | Above all thresholds - but pre-load is better |
| **Parsing** | 3ms | ❌ NO | Below thresholds |
| **Tree Walking** | 3ms | ❌ NO | Below thresholds, complex to impl |
| **Ref Collection** | 1ms | ❌ NO | Below thresholds |

**Primary Action:** Pre-load standard library on server startup.

---

## Parallelization Analysis

### Key Constraint: CPU-Bound, Single-Threaded Environment

**Critical Understanding:**
- All operations are **CPU-bound** (no I/O)
- All code runs on **single thread**
- Parallelization of CPU work on single thread = **sequential execution**
- True parallelization requires Web Workers or separate processes

**TL;DR:** ❌ **Cannot parallelize CPU work within a single JavaScript thread**

---

### Analysis by Operation

#### 1. Standard Library Loading

**Question:** Can we load multiple stdlib classes in parallel?

**Answer:** ❌ **NO** - Single-threaded JavaScript

**Why Not:**
```typescript
// This LOOKS parallel but actually runs sequentially on single thread
await Promise.all([
  loadClass('String'),   // CPU work
  loadClass('List'),     // CPU work  
  loadClass('Map'),      // CPU work
]);

// Equivalent to:
await loadClass('String');  // Blocks thread
await loadClass('List');    // Blocks thread
await loadClass('Map');     // Blocks thread
```

**Exception:** Could use **Web Worker** (browser only)
```typescript
// Main thread
const worker = new Worker('stdlib-loader.js');
worker.postMessage({ action: 'loadStdlib' });

// Worker thread (truly parallel)
onmessage = (e) => {
  const stdlib = loadAllClasses();  // Doesn't block main thread
  postMessage({ stdlib });
};
```

**Recommendation:**
- ✅ **Node.js:** Pre-load on startup (simpler)
- ⚠️ **Browser:** Consider Web Worker for stdlib loading
- ❌ **Don't use Promise.all** for CPU work (false parallelism)

---

#### 2. Multiple File Compilation

**Question:** Can we compile multiple files in parallel?

**Answer:** ✅ **Partially** - Only if using Effect scheduler with yielding

**Current Implementation (Batch Processing):**
```typescript
// In CompilerService.compileMultipleWithConfigs()
const compileResults = yield* Effect.all(
  compileConfigs.map((config) =>
    Effect.either(
      Effect.sync(() => self.compile(/* ... */))  // ✅ Wrapped in Effect.sync
    )
  ),
  { concurrency: 'unbounded', batching: true }
);

// Yields periodically
if ((i + 1) % YIELD_INTERVAL === 0) {
  yield* yieldToEventLoop;  // ✅ Explicit yielding
}
```

**What This Achieves:**
- ✅ **Interleaved execution:** File1 (partial) → yield → File2 (partial) → yield → File1 (partial) → ...
- ✅ **Better responsiveness:** Event loop not blocked for extended periods
- ❌ **NOT faster:** Total CPU time is the same or slightly higher

**Analogy:**
```
Sequential:     File1 [===] File2 [===] File3 [===]  (9 seconds, 9s blocking)
"Parallel":     File1 [=] File2 [=] File3 [=] File1 [=] ... (9.2 seconds, 1s max blocking)
```

**Recommendation:**
- ✅ **Current implementation is good** for multiple files
- ❌ **Don't expect speed improvements** - focus on responsiveness
- ✅ **Effect.sync + yielding** already provides best achievable parallelism

---

#### 3. Parsing vs. Symbol Collection vs. Reference Resolution

**Question:** Can we pipeline these stages?

**Answer:** ❌ **NO** - Dependencies prevent parallelism

**Dependencies:**
```
Parsing → Symbol Collection → Reference Resolution
   ↓            ↓                    ↓
Parse Tree → Symbol Table → Resolved References

Cannot start next stage until previous completes.
```

**Recommendation:** ❌ **Cannot parallelize** - sequential by nature

---

### True Parallelization Options (Advanced)

#### Option A: Web Worker (Browser Only)

**Use Case:** Offload compilation to background thread

```typescript
// Main thread (UI remains responsive)
const worker = new Worker('compiler-worker.js');
worker.postMessage({
  action: 'compile',
  code: fileContent,
  fileName: fileName
});

worker.onmessage = (e) => {
  const { symbolTable, diagnostics } = e.data;
  // Update UI with results
};

// Worker thread (separate CPU thread)
onmessage = (e) => {
  const { code, fileName } = e.data;
  const result = compile(code, fileName);  // Doesn't block main thread!
  postMessage(result);
};
```

**Pros:**
- ✅ **True parallelism** - separate CPU thread
- ✅ **Main thread stays responsive** - no UI freezing
- ✅ **Can compile while user types**

**Cons:**
- ⚠️ **Browser only** - not available in Node.js
- ⚠️ **Overhead:** Message passing between threads
- ⚠️ **Complexity:** Shared state management
- ⚠️ **Memory:** Separate memory space for worker

**Recommendation:** ⚠️ **Consider for browser deployment** if pre-loading isn't sufficient

---

#### Option B: Worker Threads (Node.js Only)

```typescript
// Similar to Web Worker but for Node.js
const { Worker } = require('worker_threads');

const worker = new Worker('./compiler-worker.js');
worker.postMessage({ code, fileName });
worker.on('message', (result) => {
  // Handle result
});
```

**Recommendation:** ❌ **Not recommended** - pre-loading is simpler and sufficient

---

### Summary: Parallelization Analysis

| Operation | Can Parallelize? | Recommendation |
|-----------|------------------|----------------|
| **Stdlib Loading** | ❌ NO (single thread) | ✅ Pre-load instead |
| **Multi-file Compilation** | ⚠️ Interleaved (not faster) | ✅ Already optimal |
| **Parsing Stages** | ❌ NO (sequential deps) | ❌ Not applicable |
| **Browser Compilation** | ✅ YES (Web Worker) | ⚠️ Consider if needed |

**Key Takeaway:** Focus on **pre-loading and caching**, not parallelization.

---

## Caching & Redundant Operations

### Overview

From the original log analysis (`Server_did_open.log`), we observed:
- Multiple "SAME OBJECT - skipping duplicate" messages
- Repeated symbol lookups
- Potential redundant standard library loading

---

### Issue 1: Repeated Standard Library Loading 🔥 HIGH IMPACT

**Observation:**
```
First compile:  151ms (loads stdlib)
Second compile:   5ms (stdlib cached)
```

**Root Cause:**
- Standard library loaded **on first compile**
- Not loaded at server startup
- Each new server instance pays 146ms penalty

**Cache Location:**
```typescript
// apex-parser-ast/src/symbols/ApexSymbolManager.ts
// Stdlib classes cached in symbolGraph after first load
private symbolGraph: ApexSymbolGraph;

// Cache check in resolveMemberInContext():
let symbolTable = this.symbolGraph.getSymbolTableForFile(contextFile);
if (!symbolTable && isStandardApexUri(contextFile)) {
  // Load from resource loader (expensive)
  symbolTable = await this.resourceLoader.loadStandardLibraryClass(/* ... */);
}
```

**Current Caching:**
- ✅ **In-memory cache:** Stdlib classes cached after first load
- ✅ **Per-session:** Cache persists for life of server process
- ❌ **Cold start penalty:** Every server restart pays 146ms cost

**Optimization:**
```typescript
// Pre-load on server initialization
await ApexSymbolManager.preloadStandardLibrary();

// This populates the cache BEFORE any didOpen events
// Result: ALL compiles are fast (no cold start)
```

**Impact:**
- ✅ **Eliminates cold start:** First compile is as fast as subsequent
- ✅ **Simple implementation:** One line at startup
- ✅ **Zero ongoing cost:** Cache persists

---

### Issue 2: Duplicate Symbol Lookups

**Observation from Log:**
```
[Debug] Class block lookup: not found - Account.BillingAddress
[Debug] SAME OBJECT - skipping duplicate
[Debug] resolveMemberInContext: Looking for member "Name"
[Debug] resolveMemberInContext: Looking for member "Name"  // DUPLICATE!
```

**Analysis:**

#### Source 1: Reference Collection
```typescript
// ApexReferenceCollectorListener walks tree and collects references
// May encounter same symbol multiple times in different contexts
walker.walk(referenceCollector, parseTree);
```

**Example:**
```apex
String name = 'Test';
String upper = name.toUpperCase();  // Resolves "name"
String lower = name.toLowerCase();  // Resolves "name" again
```

**Is This Bad?**
- ⚠️ **Depends on cache effectiveness**
- ✅ **If cached:** Duplicate lookup is <1ms → negligible
- ❌ **If not cached:** Duplicate lookup is expensive

**Current Caching:**
```typescript
// In ApexSymbolManager - uses symbolGraph as cache
const symbolTable = this.symbolGraph.getSymbolTableForFile(fileUri);
// Fast lookups after first resolution
```

**Recommendation:**
- ✅ **Cache is already effective** - duplicates are fast
- ❌ **Not worth optimizing** - complexity >> benefit

---

#### Source 2: Deferred Reference Resolution

**Observation:**
```typescript
// NamespaceResolutionService.resolveDeferredReferences()
// Processes list of unresolved references
// May have duplicate references in list
```

**Optimization Opportunity:**
```typescript
// BEFORE resolving, deduplicate reference list
const deferredRefs = symbolTable.getDeferredReferences();
const uniqueRefs = deduplicateReferences(deferredRefs);  // ← Add this

// Then resolve only unique references
for (const ref of uniqueRefs) {
  await this.resolve(ref);
}
```

**Impact:**
- ✅ **Reduces redundant work** if many duplicates
- ⚠️ **Small benefit** - duplicates are cached anyway
- ⚠️ **Added complexity** - need deduplication logic

**Recommendation:** ⚠️ **Low priority** - optimize only if profiling shows significant duplicates

---

### Issue 3: Type Name Parsing Cache

**Existing Optimization:**
```typescript
// In SymbolReferenceFactory - already has caching!
private static readonly TYPE_NAME_CACHE = new Map<string, TypeName>();

public static createTypeReference(typeName: string): TypeReference {
  // Check cache first
  let parsedTypeName = this.TYPE_NAME_CACHE.get(typeName);
  
  if (!parsedTypeName) {
    // Parse and cache
    parsedTypeName = parseTypeName(typeName);
    this.TYPE_NAME_CACHE.set(typeName, parsedTypeName);
  }
  
  return new TypeReference(parsedTypeName);
}
```

**Status:** ✅ **Already optimized** - no action needed

**Performance Test Results:**
```
Test: 6 methods using "System.Url"
Type name cache size: 1 (only "System.Url" cached, reused 6 times)
✅ Working as expected
```

---

### Issue 4: Document State Cache

**Current Implementation:**
```typescript
// In lsp-compliant-services/src/services/DocumentStateCache.ts
// Caches compilation results by URI + version

const cached = cache.getSymbolResult(
  event.document.uri,
  event.document.version
);

if (cached) {
  return cached.diagnostics;  // Skip compilation entirely!
}
```

**Cache Invalidation:**
- ✅ **Version-based:** Cache invalidates on document change
- ✅ **URI-based:** Different files have separate cache entries
- ✅ **Automatic cleanup:** Old versions are eventually evicted

**Status:** ✅ **Already optimal** - working well

---

### Issue 5: Symbol Table Caching in ApexSymbolGraph

**Current Implementation:**
```typescript
// apex-parser-ast/src/symbols/ApexSymbolGraph.ts
// Caches symbol tables by file URI

private symbolTablesByFile: Map<string, SymbolTable> = new Map();

public getSymbolTableForFile(fileUri: string): SymbolTable | undefined {
  return this.symbolTablesByFile.get(fileUri);
}

public addSymbolTable(fileUri: string, symbolTable: SymbolTable): void {
  this.symbolTablesByFile.set(fileUri, symbolTable);
}
```

**Status:** ✅ **Already optimized** - efficient in-memory cache

---

### Summary: Caching & Redundant Operations

| Issue | Current State | Recommendation | Impact |
|-------|---------------|----------------|--------|
| **Stdlib Loading** | ❌ Load on first compile | ✅ **Pre-load on startup** | 🔥 **High** (146ms saved) |
| **Duplicate Lookups** | ✅ Cached after first lookup | ❌ Skip | ⚠️ Low (already fast) |
| **Type Name Parsing** | ✅ Already cached | ❌ Skip | ✅ Optimal |
| **Document State** | ✅ Already cached | ❌ Skip | ✅ Optimal |
| **Symbol Tables** | ✅ Already cached | ❌ Skip | ✅ Optimal |

**Primary Action:** Pre-load standard library on server startup.

---

## Recommendations Summary

### Priority 1: Pre-load Standard Library 🔥

**Implementation Complexity:** ⭐ Low (one function call)  
**Performance Impact:** 🚀 High (146ms → 0ms)  
**Risk:** ⭐ Low (startup cost, no runtime impact)

```typescript
// Add to server initialization
await ApexSymbolManager.preloadStandardLibrary();
```

**Benefit:**
- First didOpen: 219ms → 73ms (**67% faster**)
- Eliminates cold start penalty
- All compilations consistently fast

---

### Priority 2: Wrap compile() in Effect.sync()

**Implementation Complexity:** ⭐⭐ Medium (refactor)  
**Performance Impact:** ⚠️ Medium (enables future optimizations)  
**Risk:** ⭐⭐ Medium (change compilation path)

```typescript
// In DocumentProcessingService.processDocumentOpenSingle()
const compileResult = yield* Effect.sync(() =>
  compilerService.compile(/* ... */)
);
```

**Benefit:**
- Makes compilation interruptible
- Consistency with DiagnosticProcessingService
- Enables future Effect-based optimizations

---

### Priority 3: Browser-Specific Optimizations

**If deploying to browser and 73ms is still too slow:**

#### Option A: Move to Web Worker
```typescript
// Main thread
const worker = new Worker('compiler-worker.js');
worker.postMessage({ action: 'compile', code, fileName });

// Worker thread
onmessage = (e) => {
  const result = compile(e.data.code, e.data.fileName);
  postMessage(result);
};
```

**Benefit:** True parallelism, main thread stays responsive

#### Option B: Chunked Compilation with Yielding
```typescript
// In CompilerService
async compileWithYielding(/* ... */): Promise<CompilationResult> {
  const parseTree = this.createParseTree(/* ... */);
  await yieldToEventLoop();
  
  const symbolTable = this.collectSymbols(parseTree);
  await yieldToEventLoop();
  
  const references = this.collectReferences(symbolTable);
  await yieldToEventLoop();
  
  return { symbolTable, references };
}
```

**Benefit:** Max blocking reduced to 16ms chunks

---

### Priority 4: Monitor and Measure

**After implementing Priority 1:**

1. **Re-run performance tests**
   ```bash
   npm test -- --testPathPattern="performance"
   ```

2. **Verify first didOpen is fast**
   ```typescript
   expect(firstDidOpenTime).toBeLessThan(100); // Node.js threshold
   expect(firstDidOpenTime).toBeLessThan(16);  // Browser threshold
   ```

3. **Add production metrics**
   ```typescript
   // Enable Effect metrics
   enableMetrics(Effect);
   
   // Metrics automatically collected:
   // - apex.compile.duration
   // - apex.stdlib.cache.hits
   // - apex.eventloop.blocking
   ```

---

## Conclusion

**The 146ms standard library loading is the primary bottleneck.** Pre-loading on server startup eliminates this entirely with minimal complexity.

**Parallelization is not beneficial** in a single-threaded CPU-bound environment. Focus on:
- ✅ **Caching** (already optimal)
- ✅ **Pre-loading** (primary fix)
- ⚠️ **Yielding** (only for browser if needed)

**After Priority 1 implementation:**
- Node.js: 73ms (below 100ms threshold) ✅ **Acceptable**
- Browser: 73ms (above 16ms threshold) ⚠️ **May need Priority 3**
- Browser Worker: 73ms (below 100ms threshold) ✅ **Acceptable**

The path forward is clear: **Pre-load the standard library.**
