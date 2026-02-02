# Performance Optimization Roadmap: textDocument/didOpen

**Date:** 2026-02-02  
**Updated:** 2026-02-02 (Corrected based on protobuf cache investigation)  
**Target:** Verify ResourceLoader initialization and optionally enhance first-file UX  
**Status:** Revised - No blocking operations found

## Quick Reference (UPDATED)

| Priority  | Optimization                         | Time Saved   | Complexity    | Risk      | Status       |
| --------- | ------------------------------------ | ------------ | ------------- | --------- | ------------ |
| **P0** ⚠️ | Verify ResourceLoader Initialization | **CRITICAL** | ⭐ Low        | 🔴 High   | 📋 Ready     |
| **P1**    | (Optional) Pre-populate Symbol Graph | **60-80ms**  | ⭐ Low        | 🟢 Low    | 📋 Optional  |
| **P2**    | Effect.sync() Migration              | 0ms\*        | ⭐⭐ Medium   | 🟡 Medium | 📋 Ready     |
| **P3**    | Browser Performance Testing          | 0ms          | ⭐ Low        | 🟢 Low    | 📋 Ready     |
| **P4**    | Production Metrics                   | 0ms          | ⭐ Low        | 🟢 Low    | 📋 Ready     |
| **P5** ⚠️ | Web Worker (Browser)                 | Variable     | ⭐⭐⭐⭐ High | 🟡 Medium | ⏸️ If needed |

\*Enables future optimizations

**Key Finding:** The original "219ms blocking" was due to missing ResourceLoader initialization in tests. With proper initialization, performance is acceptable (~100-120ms first file, non-blocking).

---

## 🎉 MAJOR UPDATE: GlobalTypeRegistry Implementation (Feb 2, 2026)

### Summary

Implemented GlobalTypeRegistry as an Effect-TS service with build-time generation to solve the O(n²) symbol resolution bottleneck discovered during namespace pre-population testing.

### Problem Discovered

During testing of "ALL namespaces" pre-population (Priority P1), we discovered a critical O(n²) performance issue:

- **Before**: Loading ALL 57 namespaces would take 10+ minutes with exponential slowdown
- **Root Cause**: `ApexSymbolManager.resolveStandardApexClass()` iterates through all loaded symbol tables for each unqualified type reference (e.g., "Exception", "String")
- **Impact**: The more stdlib classes loaded, the slower each subsequent type resolution became
- **Measured**: ConnectApi namespace alone took 142 seconds due to cascading O(n²) lookups

### Solution: GlobalTypeRegistry Effect Service

**Architecture:**

```
Build Pipeline (generate-stdlib-cache.mjs)
  ↓
apex-type-registry.pb.gz (160 KB, pre-built)
  ↓
GlobalTypeRegistry (Effect Service via Context.Tag)
  ↓
ApexSymbolManager (O(1) type lookups via Effect.gen)
```

**Key Components:**

1. **Protobuf Schema** (`apex-stdlib.proto`)
   - Added `TypeRegistry` and `TypeRegistryEntry` messages
   - Stores lightweight metadata: FQN, name, namespace, kind, symbolId, fileUri

2. **Build-Time Generation** (`generate-stdlib-cache.mjs`)
   - Extracts top-level types (classes, interfaces, enums) from parsed symbol tables
   - Generates `apex-type-registry.pb.gz` (160 KB) alongside stdlib cache (1.8 MB)
   - Zero runtime overhead - registry is pre-built

3. **Effect Service** (`GlobalTypeRegistryService.ts`)
   - Implements `Context.Tag` for proper dependency injection
   - Provides `Layer.succeed` for singleton lifecycle
   - O(1) type resolution with namespace priority support

4. **Deserializer** (`type-registry-loader.ts`)
   - Loads pre-built registry from protobuf cache
   - Validates and transforms entries to runtime format

5. **Integration** (`ResourceLoader.ts`, `ApexSymbolManager.ts`)
   - ResourceLoader loads registry during initialization
   - ApexSymbolManager consumes via `Effect.gen` + `Effect.provide`
   - Direct access, no coupling through ResourceLoader

### Performance Results

**Registry Loading:**
```
✅ Initialization: 0.0ms for 5,250 types
✅ Registry size: 160 KB (vs 1.8 MB stdlib cache)
✅ Memory: ~513 KB
```

**Type Lookup Performance:**
```
✅ Average lookup: 0.156ms (O(1))
✅ Hit rate: 66.7%
✅ Lookups tested:
   - Exception: 0.234ms
   - String: 0.170ms (found: system.string)
   - Database.QueryLocator: 0.133ms (found: database.querylocator)
   - System.Exception: 0.139ms
   - ApexPages.StandardController: 0.120ms (found: apexpages.standardcontroller)
   - ConnectApi.FeedItem: 0.139ms (found: connectapi.feeditem)
```

**ALL Namespaces Pre-population:**
```
Before: Would timeout (10+ minutes estimated)
After: ✅ 126.4 seconds (2.1 minutes) - COMPLETED SUCCESSFULLY
```

### Implementation Details

**1. Async Loading Fix**
- Made `populateFromProtobufCache()` async to ensure registry loads before use
- Fixed race condition where tests ran before registry population completed

**2. Symbol Kind Matching Fix**
- Changed from case-sensitive `'Class'` to lowercase `'class'`
- Handle both `null` and string `'null'` for parentId checks
- Case-insensitive kind comparison for robustness

**3. Logging Improvements**
- Streamlined to single log line: `Loaded type registry from cache in <1ms (5250 types)`
- Matches stdlib loading format for consistency
- Removed duplicate and redundant logging

### Benefits

1. **Zero Runtime Overhead**
   - Registry pre-built at compile time
   - Just deserialization at server startup (<1ms)

2. **O(1) Type Resolution**
   - Eliminated O(n²) symbol table scans
   - Consistent sub-millisecond lookups regardless of loaded types

3. **Effect Service Pattern**
   - Proper dependency injection via Context.Tag
   - Testable and mockable
   - Type-safe service boundaries

4. **Decoupled Architecture**
   - ApexSymbolManager accesses registry directly
   - No coupling through ResourceLoader
   - Clean separation of concerns

5. **Independent Artifact**
   - 160 KB registry vs 1.8 MB stdlib cache
   - Can be versioned/deployed separately
   - Cacheable at different levels

### Impact on Original Priorities

**Priority P1 (Pre-populate Symbol Graph):**
- ✅ Now feasible for ALL namespaces (126s vs timeout)
- ✅ No longer causes exponential slowdown
- ✅ Can safely pre-load any combination of namespaces

**Effect on Roadmap:**
- Pre-population strategies now viable
- Can consider more aggressive pre-loading
- Foundation for future optimizations

### Files Changed

**Created:**
- `src/services/GlobalTypeRegistryService.ts` (215 lines)
- `src/cache/type-registry-loader.ts` (146 lines)
- `src/cache/type-registry-data.ts` (29 lines)

**Modified:**
- `proto/apex-stdlib.proto` - Added TypeRegistry messages
- `scripts/generate-stdlib-cache.mjs` - Generate registry at build time
- `src/utils/resourceLoader.ts` - Load and initialize registry
- `src/symbols/ApexSymbolManager.ts` - Consume via Effect service
- `src/index.ts` - Export service for public API

**Deleted:**
- `src/symbols/GlobalTypeRegistry.ts` - Old singleton implementation

**Tests:**
- Updated 17 unit tests to use Effect.runPromise pattern
- Added performance test measuring registry initialization and lookups
- All tests passing

### Commits

1. `feat: implement GlobalTypeRegistry for O(1) type resolution`
2. `refactor: convert GlobalTypeRegistry to Effect service with build-time generation`
3. `fix: ensure GlobalTypeRegistry loads asynchronously and fix symbol kind matching`
4. `refactor: streamline ResourceLoader logging for consistency`

---

## Priority 0: Verify ResourceLoader Initialization ⚠️ CRITICAL

### Impact

- **Criticality:** FATAL if missing
- **Problem:** Without ResourceLoader initialization, system falls back to source compilation (198ms penalty)
- **Time Impact:** 219ms (source) → 100ms (protobuf) = **54% faster**
- **Risk:** 🔴 High - missing initialization causes fatal performance degradation

### Background

Investigation revealed that the original "219ms blocking" was caused by missing `ResourceLoader.initialize()` in performance tests. Without initialization:

- Protobuf cache is not loaded
- System falls back to compiling stdlib from source (~198ms)
- This is NOT the intended behavior

With proper initialization:

- Protobuf cache is loaded at startup (~250ms, one-time)
- Stdlib classes are retrieved pre-compiled from cache
- First didOpen: ~100-120ms (acceptable, non-blocking)

### Implementation

**Step 1: Verify All Server Entry Points**

Check that ALL LSP server initialization paths call `ResourceLoader.initialize()`:

```typescript
// Required in EVERY server entry point BEFORE accepting requests

export async function initializeServer(): Promise<void> {
  const logger = getLogger();

  // CRITICAL: Initialize ResourceLoader with protobuf cache
  logger.info('Initializing ResourceLoader...');
  const resourceLoader = ResourceLoader.getInstance({
    preloadStdClasses: true,
  });
  await resourceLoader.initialize();

  // Verify it loaded correctly
  if (!resourceLoader.isProtobufCacheLoaded()) {
    const error =
      'FATAL: Protobuf cache failed to load - stdlib will be compiled from source!';
    logger.error(error);
    throw new Error(error);
  }

  const protobufData = resourceLoader.getProtobufCacheData();
  logger.info(
    `✅ Protobuf cache loaded: ${protobufData?.symbolTables.size} stdlib types`,
  );

  // Continue with other initialization
  await SchedulerInitializationService.getInstance().ensureInitialized();

  logger.info('Server initialized successfully');
}
```

**Step 2: Check These Files**

Verify `ResourceLoader.initialize()` is called in:

- [ ] `packages/apex-lsp-vscode-extension/src/extension.ts` - VSCode extension
- [ ] `packages/lsp-compliant-services/src/server/LCSAdapter.ts` - LSP server adapter
- [ ] Any other server entry points

**Step 3: Add Startup Logging**

Add diagnostic logging to detect initialization issues:

```typescript
// After initialization, log cache status
const resourceLoader = ResourceLoader.getInstance();
logger.info(`Protobuf cache status: ${resourceLoader.isProtobufCacheLoaded()}`);
logger.info(
  `Stdlib types available: ${resourceLoader.getProtobufCacheData()?.symbolTables.size ?? 0}`,
);
```

**Step 4: Add Automated Tests**

Create test to verify ResourceLoader is initialized:

```typescript
// In lsp-compliant-services/test/integration/ServerInitialization.test.ts
describe('Server Initialization', () => {
  it('should initialize ResourceLoader before accepting didOpen events', async () => {
    await initializeServer();

    const resourceLoader = ResourceLoader.getInstance();
    expect(resourceLoader.isProtobufCacheLoaded()).toBe(true);

    const protobufData = resourceLoader.getProtobufCacheData();
    expect(protobufData).toBeDefined();
    expect(protobufData?.symbolTables.size).toBeGreaterThan(5000);
  });
});
```

### Estimated Effort

- **Investigation:** 2 hours (verify all entry points)
- **Implementation:** 1 hour (add logging + verification)
- **Testing:** 1 hour (create automated test)
- **Total:** ~4 hours

### Acceptance Criteria

- [ ] ResourceLoader.initialize() is called in ALL server entry points
- [ ] Startup logging confirms protobuf cache is loaded
- [ ] Automated test verifies initialization
- [ ] Performance tests show ~100-120ms first didOpen (NOT 219ms)
- [ ] Metrics/alerts detect initialization failures in production

---

## Priority 1: (Optional) Pre-populate Symbol Graph

### Impact

- **Time Saved:** 60-80ms from first-file penalty
- **Result:** First didOpen: ~100-120ms → ~40-60ms (user code only)
- **Status:** OPTIONAL - current performance is acceptable
- **Benefit:** Better first-file UX, eliminates symbol graph population cost

### Background

Currently, first file pays ~40-60ms to populate symbol graph with stdlib classes it references. This is a one-time cost per class, and subsequent files reuse the graph.

Pre-populating the graph with common namespaces during server startup eliminates this penalty for most files. This uses a **namespace-based approach** instead of individual class lists, making it more scalable and maintainable.

### Implementation

**Namespace-Based Pre-population Approach:**

Instead of hardcoding individual class names, configure which **namespaces** to pre-populate. The ResourceLoader already provides namespace → class mappings from the protobuf cache.

**Step 1: Add VSCode Configuration**

Add to `packages/apex-lsp-vscode-extension/package.json`:

```json
"apex.symbolGraph": {
  "type": "object",
  "description": "Symbol graph pre-population settings",
  "properties": {
    "enabled": {
      "type": "boolean",
      "default": false,
      "description": "Enable namespace pre-population at startup"
    },
    "preloadNamespaces": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["Database", "System", "Schema", "ConnectApi"]
      },
      "default": ["Database", "System"],
      "description": "Namespaces to pre-populate into symbol graph"
    }
  }
}
```

**Step 2: Add Settings Interface**

Add to `packages/apex-lsp-shared/src/server/ApexLanguageServerSettings.ts`:

```typescript
export interface SymbolGraphSettings {
  enabled: boolean;
  preloadNamespaces: string[];
}

// Add to ApexLanguageServerSettings.apex:
symbolGraph?: SymbolGraphSettings;
```

**Step 3: Implement Pre-population in LCSAdapter**

Add to `packages/apex-ls/src/server/LCSAdapter.ts`:

```typescript
private async prePopulateSymbolGraph(): Promise<void> {
  const settings = ApexSettingsManager.getInstance().getSettings();
  const symbolGraphSettings = settings.apex.symbolGraph;

  if (!symbolGraphSettings?.enabled) {
    return;
  }

  const namespacesToLoad = symbolGraphSettings.preloadNamespaces || [];
  this.logger.info(
    `Pre-populating symbol graph with namespaces: ${namespacesToLoad.join(', ')}`
  );

  const resourceLoader = ResourceLoader.getInstance();
  const symbolManager = ApexSymbolProcessingManager.getInstance().getSymbolManager();
  const availableNamespaces = resourceLoader.getStandardNamespaces();

  const startTime = performance.now();
  let totalClasses = 0;
  let loadedClasses = 0;

  for (const namespace of namespacesToLoad) {
    const classFiles = availableNamespaces.get(namespace);
    if (!classFiles) {
      this.logger.warn(`Namespace '${namespace}' not found in stdlib`);
      continue;
    }

    totalClasses += classFiles.length;
    for (const classFile of classFiles) {
      try {
        const className = classFile.value.replace(/\.cls$/i, '');
        const fqn = `${namespace}.${className}`;
        await symbolManager.resolveStandardApexClass(fqn);
        loadedClasses++;
      } catch (error) {
        this.logger.debug(`Failed to pre-populate ${namespace}.${classFile.value}`);
      }
    }
  }

  const duration = performance.now() - startTime;
  this.logger.info(
    `✅ Symbol graph pre-populated: ${loadedClasses}/${totalClasses} classes ` +
    `from ${namespacesToLoad.length} namespaces in ${duration.toFixed(2)}ms`
  );
}
```

Call in `setupEventHandlers()` after `initializeResourceLoader()`:

```typescript
// Pre-populate symbol graph with configured namespaces
this.prePopulateSymbolGraph().catch((error) => {
  this.logger.error(
    () => `❌ Symbol graph pre-population failed: ${formattedError(error)}`,
  );
});
```

**Step 4: User Configuration**

Users enable via VSCode settings:

```json
{
  "apex.symbolGraph.enabled": true,
  "apex.symbolGraph.preloadNamespaces": ["Database", "System"]
}
```

### Performance Characteristics

**Namespace Sizes (approximate):**

- `Database`: ~45 classes (SaveResult, QueryLocator, BatchableContext, etc.)
- `System`: ~180 classes (Assert, JSON, Test, String, Integer, etc.)
- `Schema`: ~25 classes (DescribeFieldResult, SObjectType, etc.)
- `ConnectApi`: ~150 classes (various API wrappers)

**Estimated Startup Cost:**

- Database namespace: ~200-300ms
- System namespace: ~700-900ms
- **Both: ~900-1200ms total**

**Estimated Benefit:**

- First file using these namespaces: 0ms penalty (already in graph)
- Subsequent files: Already fast (existing behavior)

### Performance Measurement (Required Before Implementation)

Before deciding to implement this feature, **measure actual costs** with dedicated performance tests:

**Test 1: Startup Cost Measurement**

Create `packages/apex-ls/test/performance/SymbolGraphPrePopulation.performance.test.ts`:

```typescript
describe('Symbol Graph Pre-population Performance', () => {
  test('Measure startup cost - Database namespace only', async () => {
    const settings = mockSettings({
      symbolGraph: { enabled: true, preloadNamespaces: ['Database'] },
    });

    const start = performance.now();
    await lcsAdapter.prePopulateSymbolGraph();
    const duration = performance.now() - start;

    console.log(`Database namespace: ${duration.toFixed(2)}ms`);
  });

  test('Measure startup cost - System namespace only', async () => {
    const settings = mockSettings({
      symbolGraph: { enabled: true, preloadNamespaces: ['System'] },
    });

    const start = performance.now();
    await lcsAdapter.prePopulateSymbolGraph();
    const duration = performance.now() - start;

    console.log(`System namespace: ${duration.toFixed(2)}ms`);
  });

  test('Measure startup cost - Database + System', async () => {
    const settings = mockSettings({
      symbolGraph: { enabled: true, preloadNamespaces: ['Database', 'System'] },
    });

    const start = performance.now();
    await lcsAdapter.prePopulateSymbolGraph();
    const duration = performance.now() - start;

    console.log(`Database + System: ${duration.toFixed(2)}ms`);
  });
});
```

**Test 2: First didOpen Improvement**

Extend `BenchmarkSuite.performance.test.ts`:

```typescript
describe('Benchmark Suite - With Pre-population', () => {
  beforeAll(async () => {
    await lcsAdapter.prePopulateSymbolGraph();
  });

  test('SmallTestClass with pre-populated symbols', async () => {
    const start = performance.now();
    await didOpen('SmallTestClass.cls');
    const duration = performance.now() - start;

    console.log(`First didOpen with pre-population: ${duration.toFixed(2)}ms`);
    // Compare to baseline: ~100ms without pre-population
  });
});
```

**Decision Criteria Based on Measurements:**

- **Strong YES**: If Database + System < 500ms (low cost, high benefit)
- **Conditional**: If 500-1000ms (reasonable trade-off)
- **Reconsider**: If > 1500ms (too expensive for optional feature)

**Run measurements:**

```bash
npm test -- --testPathPattern="SymbolGraphPrePopulation.performance"
```

### Estimated Effort

- **Settings + Interface:** 1 hour
- **Implementation:** 2 hours
- **Testing:** 1 hour
- **Total:** ~4 hours

### Acceptance Criteria

- [ ] VSCode settings for enabling feature and selecting namespaces
- [ ] Namespace-based pre-population in LCSAdapter
- [ ] Startup logging shows classes loaded per namespace
- [ ] First didOpen reduced to ~40-60ms for files using pre-populated namespaces
- [ ] Benchmark suite validates improvement

### Configuration Guidance

**Recommended for most users (DEFAULT):**

```json
{
  "apex.symbolGraph.enabled": true,
  "apex.symbolGraph.preloadNamespaces": ["Database", "System"]
}
```

Cost: ~190ms startup | Benefit: Eliminates 60-80ms first-file penalty

**For faster startup (minimal pre-population):**

```json
{
  "apex.symbolGraph.enabled": true,
  "apex.symbolGraph.preloadNamespaces": ["Database"]
}
```

Cost: ~18ms startup | Benefit: Partial coverage

**For measurement/testing ONLY (NOT recommended for production):**

```json
{
  "apex.symbolGraph.enabled": true,
  "apex.symbolGraph.preloadNamespaces": ["*"]
}
```

Cost: **VERY HIGH** (30+ seconds) | **NOT RECOMMENDED**

**⚠️ Warning About "\*" (All Namespaces):**

Loading all 57 namespaces triggers cascading dependency resolution and "find missing artifacts" searches across the entire stdlib. Performance varies wildly:

- Simple namespaces: ~0.7ms per class (Database)
- Complex namespaces: ~62ms per class (Slack: 401 classes = 25 seconds!)
- Total estimated: 30-60+ seconds startup cost

**This is NOT practical for production use.** Use "\*" only for performance measurement and analysis.

### Dependency-Ordered Loading Investigation (2026-02-02)

**Goal:** Eliminate O(n²) cascading lookups when loading all namespaces by using topological sort to load dependencies before dependents.

**Implementation:**

1. Created `NamespaceDependencyAnalyzer` to extract namespace dependencies from protobuf symbol tables
2. Implemented topological sort using `DirectedGraph` from `data-structure-typed` library (already in project)
3. Added `ResourceLoader.getNamespaceDependencyOrder()` to provide optimal loading sequence
4. Updated `LCSAdapter` to use dependency ordering when `"*"` is specified
5. Added comprehensive unit tests for dependency analysis

**Results:**

- Dependency ordering correctly computed (System → Database → Schema → ... → ConnectApi)
- Tests still timeout after 152+ seconds when attempting to load all namespaces
- ConnectApi namespace alone (3,894 classes) causes extreme slowdown

**Root Cause Analysis:**
The fundamental issue is in `ApexSymbolManager.resolveStandardApexClass()`:

- When resolving a type reference not in the name index, it iterates through ALL loaded symbol tables
- Each unresolved type triggers O(n) search where n = number of loaded classes
- As more classes load, unresolved references become exponentially more expensive
- ConnectApi has many type references, causing O(n²) behavior even with optimal load order

**Conclusion:**

- Dependency ordering helps but doesn't solve the core O(n²) problem
- Loading all namespaces is **not feasible** without optimizing `ApexSymbolManager` symbol resolution
- The `NamespaceDependencyAnalyzer` and dependency-ordered loading infrastructure remain in the codebase for future use when symbol manager is optimized

**Recommended Next Steps** (Future Work):

1. Add O(1) or O(log n) type lookup in `ApexSymbolManager` (e.g., global type index)
2. Implement incremental symbol loading with lazy evaluation
3. Cache resolved types to avoid repeated lookups
4. Re-evaluate all-namespaces loading after optimization

**Files:**

- `packages/apex-parser-ast/src/utils/NamespaceDependencyAnalyzer.ts`
- `packages/apex-parser-ast/src/utils/resourceLoader.ts` (`getNamespaceDependencyOrder()`)
- `packages/apex-ls/src/server/LCSAdapter.ts` (uses dependency order for `"*"`)
- `packages/apex-parser-ast/test/utils/NamespaceDependencyAnalyzer.test.ts`

### Decision Point

**Implement IF:**

- First-file UX is critical
- 100-120ms is perceived as slow by users
- Willing to accept ~900-1200ms startup cost

**Skip IF:**

- 100-120ms first-file is acceptable
- Want minimal startup time (~250ms protobuf load only)
- Most users open multiple files (benefit diminishes after first)

---

## Priority 2: Migrate to Effect.sync() Pattern

### Impact

- **Time Saved:** 0ms (enables future optimizations)
- **Benefit:** Consistency, interruptibility, better error handling

### Implementation

**Step 1: Update DocumentProcessingService**

```typescript
// Location: lsp-compliant-services/src/services/DocumentProcessingService.ts

// BEFORE (current):
public async processDocumentOpenSingle(
  event: TextDocumentChangeEvent<TextDocument>
): Promise<Diagnostic[] | undefined> {
  // ...
  const compileResult = compilerService.compile(  // 🔴 Direct sync call
    event.document.getText(),
    event.document.uri,
    listener,
    { collectReferences: true, resolveReferences: true }
  );
  // ...
}

// AFTER (Effect pattern):
public processDocumentOpenSingle = Effect.gen(
  this,
  function* (event: TextDocumentChangeEvent<TextDocument>) {
    // ...
    const compileResult = yield* Effect.sync(() =>  // ✅ Effect.sync wrapper
      compilerService.compile(
        event.document.getText(),
        event.document.uri,
        listener,
        { collectReferences: true, resolveReferences: true }
      )
    );
    // ...
    return diagnostics;
  }
);
```

**Step 2: Update Callers**

```typescript
// Update calls to use Effect.runPromise
await Effect.runPromise(
  documentProcessingService.processDocumentOpenSingle(event),
);
```

**Step 3: Update Tests**

```typescript
// Update integration tests
const result = await Effect.runPromise(
  service.processDocumentOpenSingle(event),
);
```

### Estimated Effort

- **Investigation:** 2 hours (trace all callers)
- **Implementation:** 4 hours (update service + callers)
- **Testing:** 4 hours (update tests, verify behavior)
- **Total:** ~10 hours

### Acceptance Criteria

- [ ] All calls to compile() wrapped in Effect.sync()
- [ ] Pattern matches DiagnosticProcessingService
- [ ] All tests pass
- [ ] No performance regression
- [ ] Error handling works correctly

---

## Priority 2: Browser Performance Testing

### Impact

- **Time Saved:** 0ms (measurement & validation)
- **Benefit:** Understand real browser performance

### Implementation

**Step 1: Create Browser Test Script**

```typescript
// Location: e2e-tests/tests/performance/browser-didOpen-perf.spec.ts

import { test, expect } from '@playwright/test';

test('measures didOpen performance in browser', async ({ page }) => {
  // Load VS Code test web environment
  await page.goto('http://localhost:3000');

  // Setup performance observer
  await page.evaluate(() => {
    (window as any).perfData = [];

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.startsWith('apex-')) {
          (window as any).perfData.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      }
    }).observe({ entryTypes: ['measure'] });
  });

  // Open Apex file
  await page.click('text=Open File');
  await page.fill('input[placeholder="File path"]', 'TestClass.cls');
  await page.press('input', 'Enter');

  // Wait for processing
  await page.waitForTimeout(5000);

  // Get performance data
  const perfData = await page.evaluate(() => (window as any).perfData);

  console.log('Browser Performance Data:', JSON.stringify(perfData, null, 2));

  // Find didOpen measurement
  const didOpen = perfData.find((e: any) => e.name === 'apex-didOpen');
  expect(didOpen).toBeDefined();
  expect(didOpen.duration).toBeLessThan(100); // Web Worker threshold
});
```

**Step 2: Run Tests**

```bash
# Start test server
npm run test:e2e:server

# Run browser performance tests
npm run test:e2e -- --testPathPattern="browser-didOpen-perf"
```

### Estimated Effort

- **Implementation:** 4 hours (create test, setup environment)
- **Execution:** 1 hour (run tests, collect data)
- **Analysis:** 2 hours (compare Node.js vs browser)
- **Total:** ~7 hours

### Acceptance Criteria

- [ ] Browser performance test runs successfully
- [ ] Performance data collected via PerformanceObserver
- [ ] Results compared to Node.js baseline
- [ ] Documented in performance-baseline-didOpen.md

---

## Priority 3: Enable Production Metrics

### Impact

- **Time Saved:** 0ms (monitoring & observability)
- **Benefit:** Real-world performance data, regression detection

### Implementation

**Step 1: Initialize Metrics at Startup**

```typescript
// Location: Server initialization (LCSAdapter or extension.ts)

import { enableMetrics } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

// Enable Effect metrics
enableMetrics(Effect);

logger.info('Performance metrics enabled');
```

**Step 2: Configure OpenTelemetry (Optional)**

```typescript
// If you want to export to monitoring system

import { NodeSdk } from '@opentelemetry/sdk-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

const sdk = new NodeSdk({
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: 'http://your-otel-collector:4318/v1/metrics',
    }),
  }),
});

sdk.start();

// Now all Effect metrics will be exported to OpenTelemetry
```

**Step 3: Add Dashboards**

Create Grafana/Datadog dashboards for:

- `apex.compile.duration` - P50, P95, P99 latencies
- `apex.eventloop.blocking` - Count of blocking operations
- `apex.stdlib.cache.hits` - Cache effectiveness
- `apex.stdlib.cache.misses` - Cache misses (should be low)

### Estimated Effort

- **Basic metrics:** 1 hour (enable metrics)
- **OpenTelemetry:** 4 hours (configure export)
- **Dashboards:** 4 hours (create visualization)
- **Total:** ~9 hours (basic) or ~9 hours (full observability)

### Acceptance Criteria

- [ ] Metrics enabled in production
- [ ] No performance overhead from metrics
- [ ] Metrics visible in logs or monitoring system
- [ ] Dashboards created (if using OpenTelemetry)

---

## Priority 4: Web Worker Migration (Browser Only) ⚠️

### Impact

- **Time Saved:** Variable (depends on implementation)
- **Benefit:** True parallelism in browser main thread

**⚠️ NOTE:** Only implement if Priority 0 (pre-loading) doesn't achieve <16ms target for browser main thread.

### Implementation

**Step 1: Assess Need**

After implementing P0, measure browser main thread performance:

```typescript
const browserMainThreadTime = measure('didOpen');

if (browserMainThreadTime > 16) {
  // Consider Web Worker
} else {
  // Skip - not needed
}
```

**Step 2: Create Compiler Worker** (If needed)

```typescript
// Location: apex-lsp-vscode-extension/src/workers/compiler-worker.ts

import { CompilerService } from '@salesforce/apex-lsp-parser-ast';

const compilerService = new CompilerService();

self.onmessage = (event) => {
  const { id, action, code, fileName, options } = event.data;

  if (action === 'compile') {
    try {
      const listener = new ApexSymbolCollectorListener(undefined, 'full');
      const result = compilerService.compile(code, fileName, listener, options);

      self.postMessage({
        id,
        success: true,
        result: serializeResult(result),
      });
    } catch (error) {
      self.postMessage({
        id,
        success: false,
        error: error.message,
      });
    }
  }
};
```

**Step 3: Update DocumentProcessingService**

```typescript
// Use worker for compilation
if (isMainThread && hasWebWorker) {
  const result = await this.compilerWorker.compile(code, fileName, options);
} else {
  const result = compilerService.compile(code, fileName, listener, options);
}
```

### Estimated Effort

- **Worker implementation:** 8 hours
- **Message serialization:** 4 hours (SymbolTable serialization)
- **Integration:** 8 hours (update service, handle errors)
- **Testing:** 8 hours (browser tests, edge cases)
- **Total:** ~28 hours

### Acceptance Criteria

- [ ] Browser main thread didOpen <16ms
- [ ] Worker compilation produces identical results
- [ ] Error handling works across worker boundary
- [ ] Tests pass in browser environment
- [ ] Fallback to sync compilation if worker fails

---

## Implementation Timeline

### Phase A: Quick Win (Priority 0)

**Duration:** 1-2 days  
**Effort:** 5 hours

**Tasks:**

1. Implement `preloadStandardLibrary()` method
2. Call at server initialization
3. Run performance tests to verify
4. Update documentation

**Deliverables:**

- ✅ First didOpen: 73ms (not blocking in Node.js)
- ✅ Performance tests showing improvement
- ✅ Updated baseline report

**Success Criteria:**

```typescript
// Performance test assertion
expect(firstDidOpenTime).toBeLessThan(100); // Node.js threshold
```

---

### Phase B: Effect Migration (Priority 1)

**Duration:** 3-5 days  
**Effort:** 10 hours  
**Depends on:** Phase A complete

**Tasks:**

1. Update DocumentProcessingService to use Effect.gen
2. Wrap compile() in Effect.sync()
3. Update all callers
4. Update integration tests
5. Verify no regressions

**Deliverables:**

- ✅ Consistent Effect pattern across services
- ✅ All tests passing
- ✅ No performance regression

**Success Criteria:**

```typescript
// Pattern matches DiagnosticProcessingService
public processDocumentOpenSingle = Effect.gen(this, function* () {
  const result = yield* Effect.sync(() => compilerService.compile(/* ... */));
  return result;
});
```

---

### Phase C: Browser Validation (Priority 2)

**Duration:** 2-3 days  
**Effort:** 7 hours  
**Depends on:** Phase A complete

**Tasks:**

1. Create browser performance test (Playwright)
2. Run in vscode/test-web environment
3. Measure with PerformanceObserver API
4. Compare to Node.js baseline
5. Document browser-specific findings

**Deliverables:**

- ✅ Browser performance test suite
- ✅ Comparison report (Node.js vs Browser)
- ✅ Updated documentation with browser metrics

**Success Criteria:**

```typescript
// Web Worker threshold
expect(browserWorkerDidOpenTime).toBeLessThan(100);

// Main thread (aspirational)
expect(browserMainDidOpenTime).toBeLessThan(50); // Reasonable target
```

---

### Phase D: Production Monitoring (Priority 3)

**Duration:** 1-2 days  
**Effort:** 9 hours  
**Depends on:** Phase A complete

**Tasks:**

1. Enable Effect metrics at startup
2. Configure OpenTelemetry (if using)
3. Create dashboards
4. Set up alerting for regressions
5. Document metrics for operators

**Deliverables:**

- ✅ Metrics enabled in production
- ✅ Dashboards (if OpenTelemetry)
- ✅ Alerting for performance regressions
- ✅ Operator documentation

**Success Criteria:**

- Metrics visible in monitoring system
- No performance overhead from instrumentation
- Alerts fire on regressions

---

### Phase E: Web Worker (Priority 4) ⚠️ CONDITIONAL

**Duration:** 2-3 weeks  
**Effort:** 28 hours  
**Depends on:** Phase C complete, **only if browser main thread >16ms**

**Decision Point:**

```
If (browserMainThreadTime after Phase A) > 16ms:
  → Implement Web Worker
Else:
  → Skip (not needed)
```

**Tasks:**

1. Create compiler worker
2. Implement message passing
3. Serialize/deserialize symbol tables
4. Update DocumentProcessingService
5. Browser testing
6. Error handling and fallback

**Deliverables:**

- ✅ Web Worker implementation
- ✅ Browser main thread didOpen <16ms
- ✅ Fallback for non-worker environments

**Success Criteria:**

- Browser main thread: <16ms (60fps maintained)
- Identical results (worker vs sync)
- Graceful fallback if worker unavailable

---

## Estimated Time Savings

### Node.js Environment

| Scenario            | Before | After P0 | Saved     | Impact          |
| ------------------- | ------ | -------- | --------- | --------------- |
| **First didOpen**   | 219ms  | 73ms     | **146ms** | 🔥 Major        |
| **Subsequent**      | 9ms    | 9ms      | 0ms       | ✅ Already fast |
| **User perception** | Slow   | Fast     | ✅        | ⭐⭐⭐⭐⭐      |

---

### Browser Web Worker

| Scenario            | Before | After P0 | Saved     | Impact          |
| ------------------- | ------ | -------- | --------- | --------------- |
| **First didOpen**   | 219ms  | 73ms     | **146ms** | 🔥 Major        |
| **Subsequent**      | 9ms    | 9ms      | 0ms       | ✅ Already fast |
| **User perception** | Slow   | Fast     | ✅        | ⭐⭐⭐⭐⭐      |

---

### Browser Main Thread

| Scenario           | Before | After P0 | After P4 | Impact        |
| ------------------ | ------ | -------- | -------- | ------------- |
| **First didOpen**  | 219ms  | 73ms     | <16ms    | 🔥 Critical   |
| **Subsequent**     | 9ms    | 9ms      | <16ms    | ⚠️ Borderline |
| **Frames dropped** | 13     | 4        | 0        | ⭐⭐⭐⭐⭐    |

---

## Risk Management

### Risk Matrix

| Priority | Risk Level | Mitigation Strategy                           |
| -------- | ---------- | --------------------------------------------- |
| **P0**   | 🟢 Low     | Startup cost acceptable, stdlib needed anyway |
| **P1**   | 🟡 Medium  | Pattern proven in DiagnosticProcessingService |
| **P2**   | 🟢 Low     | Read-only testing, no code changes            |
| **P3**   | 🟢 Low     | Metrics optional, no functional impact        |
| **P4**   | 🟡 Medium  | Complex, only if needed, prototype first      |

### Rollback Plan

**If P0 causes issues:**

```typescript
// Add flag to disable pre-loading
if (settings.apex.performance.preloadStdlib !== false) {
  await symbolManager.preloadStandardLibrary();
}
```

**If P1 causes issues:**

```typescript
// Can revert single commit
git revert <effect-migration-commit>
```

---

## Success Metrics

### Short-term (After P0)

- [ ] First didOpen <100ms (Node.js) ✅
- [ ] First didOpen <100ms (Browser Worker) ✅
- [ ] No blocking operations in Node.js ✅
- [ ] Performance tests pass ✅

### Medium-term (After P1-P2)

- [ ] Effect.sync() pattern used consistently
- [ ] Browser performance measured and documented
- [ ] Decision made on P4 (Web Worker) based on data

### Long-term (After P3)

- [ ] Production metrics enabled
- [ ] Dashboards show real-world performance
- [ ] No performance regressions in CI
- [ ] User-reported performance issues down

---

## Alternative Approaches (Considered & Rejected)

### ❌ Approach: Parallelize Standard Library Loading

**Idea:** Load multiple stdlib classes concurrently

**Why Rejected:**

```typescript
// This doesn't help in single-threaded JavaScript
await Promise.all([
  loadClass('String'), // CPU work
  loadClass('List'), // CPU work
  loadClass('Map'), // CPU work
]);

// Equivalent to sequential execution:
await loadClass('String');
await loadClass('List');
await loadClass('Map');
```

**Reason:** CPU-bound operations don't benefit from Promise.all on single thread.

---

### ❌ Approach: Lazy Load Only Used Classes

**Idea:** Only load stdlib classes that are actually referenced

**Why Rejected:**

- **Complexity:** Need dependency tracking
- **Unpredictable:** First file with `String` still pays 146ms cost
- **Marginal benefit:** Most code uses String, List, Map anyway
- **Pre-loading simpler:** Load all upfront, eliminate variability

---

### ❌ Approach: Optimize Decompression Algorithm

**Idea:** Use faster decompression (e.g., LZ4 instead of gzip)

**Why Not Primary Focus:**

- **Diminishing returns:** Still CPU-bound
- **Data format change:** Requires stdlib rebuild
- **Pre-loading better:** Eliminates decompression from critical path
- **Can be future optimization:** After pre-loading implemented

---

## Monitoring & Continuous Improvement

### Performance Test Suite

**Run regularly:**

```bash
# All performance tests
npm test -- --testPathPattern="performance"

# Specific test
npm test -- --testPathPattern="DocumentProcessing.performance"
```

**Add to CI:**

```yaml
# .github/workflows/ci.yml
- name: Performance Tests
  run: npm test -- --testPathPattern="performance" --maxWorkers=1

- name: Check Performance Thresholds
  run: |
    # Fail if any test shows blocking operations
    npm test -- --testPathPattern="performance" | grep "BLOCKING" && exit 1 || exit 0
```

### Regression Detection

**Set baseline thresholds:**

```typescript
// In performance tests
const THRESHOLDS = {
  didOpen: {
    first: 100, // After pre-loading
    subsequent: 20, // Allow some variance
  },
  compile: {
    first: 50,
    subsequent: 15,
  },
};

expect(firstDidOpen).toBeLessThan(THRESHOLDS.didOpen.first);
```

### Production Metrics

**Key metrics to track:**

```
apex.compile.duration (histogram)
├─ p50: <10ms
├─ p95: <50ms
└─ p99: <100ms

apex.eventloop.blocking (counter)
└─ target: 0 events/minute

apex.stdlib.cache.hits (counter)
├─ target: >99% hit rate
└─ misses: <1%
```

---

## Cost-Benefit Analysis

### Priority 0: Pre-load Standard Library

**Investment:**

- Development: 5 hours
- Testing: 2 hours
- Documentation: 1 hour
- **Total: 8 hours**

**Return:**

- 146ms saved per server startup
- Eliminates blocking in Node.js/Worker
- Improved user experience
- **ROI: 🔥 Extremely High**

**Break-even:** After ~1 hour of user time saved (many server startups)

---

### Priority 1: Effect.sync() Migration

**Investment:**

- Development: 10 hours
- Testing: 4 hours
- **Total: 14 hours**

**Return:**

- Enables future optimizations
- Consistency across codebase
- Better error handling
- **ROI: 🟡 Medium (long-term)**

**Break-even:** When future optimizations are implemented

---

### Priority 4: Web Worker

**Investment:**

- Development: 28 hours
- Testing: 8 hours
- Maintenance: Ongoing
- **Total: 36+ hours**

**Return:**

- Browser main thread: 73ms → <16ms
- Only benefits browser main thread deployments
- Added complexity
- **ROI: ⚠️ Low to Medium (depends on deployment)**

**Break-even:** Only if browser main thread deployment is critical

---

## Conclusion

### Clear Path Forward (UPDATED)

1. **✅ COMPLETED: GlobalTypeRegistry** - Solved O(n²) bottleneck, enables all other optimizations
2. **✅ Implement P0 immediately** - High impact, low effort, low risk
3. **✅ Implement P1 soon** - NOW VIABLE with GlobalTypeRegistry (was blocked by O(n²))
4. **✅ Implement P2 & P3** - Validate and monitor
5. **⚠️ Evaluate P4** - Only if browser main thread requires it

### Expected Outcome (UPDATED)

**With GlobalTypeRegistry + Pre-loading:**

- Node.js: First didOpen <73ms ✅ (O(1) lookups, no O(n²) penalty)
- Browser Worker: First didOpen <73ms ✅ (O(1) lookups, no O(n²) penalty)
- Browser Main: First didOpen <73ms ⚠️ (above 16ms, may need P4)
- ALL namespaces: 126s ✅ (was timeout/10+ min)

**Recommendation:** GlobalTypeRegistry complete. P1 (pre-population) now safe to implement.

### Success Definition (UPDATED)

**Node.js:** ✅ First didOpen <100ms → **Achievable with P0 + GlobalTypeRegistry**  
**Browser Worker:** ✅ First didOpen <100ms → **Achievable with P0 + GlobalTypeRegistry**  
**Browser Main:** ⚠️ First didOpen <16ms → **May require P4**  
**Symbol Resolution:** ✅ O(1) lookups → **ACHIEVED via GlobalTypeRegistry**  
**ALL Namespaces:** ✅ Completes in <3min → **ACHIEVED (126s)**

---

## Appendix: Related Work

### Existing Performance Infrastructure

**Already in codebase:**

- ✅ Benchmark.js for LSP benchmarks
- ✅ Node.js `--cpu-prof` for profiling
- ✅ Symbol table caching
- ✅ Document state caching
- ✅ Type name parsing cache

**What we added:**

- ✅ Blocking detection utilities
- ✅ Environment-aware thresholds
- ✅ Effect metrics integration
- ✅ Performance tests for didOpen
- ✅ Comprehensive analysis documents

### Future Considerations

**Not in scope (but worth considering later):**

- Incremental compilation (only recompile changed portions)
- Streaming parsing (parse as user types)
- Predictive pre-loading (preload likely-used symbols)
- Memory optimization (reduce stdlib memory footprint)
- Protocol buffer optimization (faster serialization format)

---

## Key Learnings from Investigation

### What We Discovered

1. **Protobuf cache works correctly** ✅
   - All 5,250 stdlib types are pre-compiled and loaded at server startup
   - Loading takes ~250ms but happens during initialization
   - Cache is permanent for server lifetime

2. **Symbol graph is populated on-demand** ✅
   - Classes are added to graph only when first referenced
   - Transfer from protobuf → graph takes ~30-50ms per class
   - Once in graph, lookups are instant (~5ms)

3. **No stdlib compilation during didOpen** ✅
   - When ResourceLoader is properly initialized, stdlib classes are NEVER compiled from source
   - They're retrieved pre-compiled from protobuf cache
   - "Loading" is actually just cache lookup + graph registration

4. **One-time penalty is per-class, not per-file** ✅
   - First file pays cost to populate graph with its required stdlib classes
   - Subsequent files reuse populated graph
   - Only pay cost again if new stdlib classes are referenced

5. **Test initialization matters critically** ⚠️
   - Performance tests MUST initialize ResourceLoader before didOpen
   - Without initialization, system falls back to source compilation (fatal 198ms penalty)
   - This was the root cause of original "blocking operation" finding

6. **O(n²) symbol resolution bottleneck** ⚠️ **[NEW - SOLVED]**
   - ApexSymbolManager had O(n²) type resolution when resolving unqualified references
   - Each type lookup scanned all loaded symbol tables linearly
   - With ALL namespaces loaded (5,250 types), this became exponential
   - **Solution:** GlobalTypeRegistry provides O(1) lookups (avg 0.156ms)
   - **Result:** ALL namespaces now load in 126s (was timeout)

### Previous Misunderstandings (Resolved)

- ❌ **"146ms stdlib loading"** was actually missing ResourceLoader init causing source compilation
- ❌ **"Decompression during didOpen"** - decompression happens once at server startup
- ❌ **"Per-file stdlib cost"** - it's per-class-first-use, not per-file; graph is shared across files
- ❌ **"Need to pre-load stdlib"** - stdlib is already pre-loaded in protobuf; just need proper initialization
- ❌ **"Pre-loading safe for all namespaces"** - was blocked by O(n²) bottleneck; now solved with GlobalTypeRegistry

### Recent Discoveries and Solutions

1. **O(n²) Symbol Resolution** ⚠️
   - **Problem**: Linear scan through all loaded symbol tables for each type lookup
   - **Impact**: ALL namespaces would timeout (10+ minutes)
   - **Solution**: GlobalTypeRegistry with O(1) lookups
   - **Status**: ✅ SOLVED (126s for ALL namespaces)

2. **Effect Service Pattern** ✅
   - Implemented GlobalTypeRegistry as Effect Context.Tag service
   - Proper dependency injection and lifecycle management
   - Testable, mockable, type-safe

3. **Build-Time Generation** ✅
   - Registry generated during build alongside protobuf cache
   - 160 KB artifact with 5,250 type entries
   - Zero runtime population overhead

---

**Next Actions:**
1. ✅ **COMPLETED:** GlobalTypeRegistry implementation
2. **TODO:** Implement Priority 0 (Verify ResourceLoader Initialization in all production entry points)
3. **TODO:** Implement Priority 1 (Pre-populate Symbol Graph) - now viable with O(1) lookups
