# Performance Optimization Roadmap: textDocument/didOpen

**Date:** 2026-02-02  
**Target:** Eliminate 219ms blocking operation on first file open  
**Status:** Ready for Implementation

## Quick Reference

| Priority | Optimization | Time Saved | Complexity | Risk | Status |
|----------|-------------|------------|------------|------|--------|
| **P0** 🔥 | Pre-load Standard Library | **146ms** | ⭐ Low | 🟢 Low | 📋 Ready |
| **P1** | Effect.sync() Migration | 0ms* | ⭐⭐ Medium | 🟡 Medium | 📋 Ready |
| **P2** | Browser Performance Testing | 0ms | ⭐ Low | 🟢 Low | 📋 Ready |
| **P3** | Production Metrics | 0ms | ⭐ Low | 🟢 Low | 📋 Ready |
| **P4** ⚠️ | Web Worker (Browser) | Variable | ⭐⭐⭐⭐ High | 🟡 Medium | ⏸️ If needed |

*Enables future optimizations

---

## Priority 0: Pre-load Standard Library 🔥

### Impact
- **Time Saved:** 146ms (67% reduction in first didOpen)
- **Result:** 219ms → 73ms
- **Node.js:** ✅ Below 100ms threshold
- **Browser Worker:** ✅ Below 100ms threshold
- **Browser Main:** ⚠️ Still above 16ms (may need P4)

### Implementation

**Step 1: Add Pre-load Method** (if not exists)

Check if `ApexSymbolManager` already has a pre-load method:

```typescript
// Location: apex-parser-ast/src/symbols/ApexSymbolManager.ts

public async preloadStandardLibrary(): Promise<void> {
  if (!this.resourceLoader) {
    this.logger.warn('Resource loader not available, skipping stdlib preload');
    return;
  }

  this.logger.info('Pre-loading standard library...');
  const start = performance.now();

  // Load core classes that are used in most code
  const coreClasses = [
    'String', 'Integer', 'Long', 'Double', 'Decimal', 'Boolean',
    'Object', 'List', 'Map', 'Set',
    'System', 'Database', 'Schema',
    'Date', 'Datetime', 'Time',
  ];

  for (const className of coreClasses) {
    try {
      const uri = `apex-stdlib:///${className}`;
      const symbolTable = this.symbolGraph.getSymbolTableForFile(uri);
      
      if (!symbolTable) {
        // Load if not in cache
        await this.resourceLoader.loadStandardLibraryClass(className, uri);
      }
    } catch (error) {
      this.logger.warn(`Failed to preload stdlib class ${className}: ${error}`);
    }
  }

  const duration = performance.now() - start;
  this.logger.info(`Standard library pre-loaded in ${duration.toFixed(2)}ms`);
}
```

**Step 2: Call on Server Initialization**

```typescript
// Location: lsp-compliant-services/src/server/LCSAdapter.ts
// Or: apex-lsp-vscode-extension/src/extension.ts

export async function initializeServer(): Promise<void> {
  // Existing initialization
  await SchedulerInitializationService.getInstance().ensureInitialized();
  
  // ADD THIS: Pre-load standard library
  const symbolManager = ApexSymbolProcessingManager
    .getInstance()
    .getSymbolManager();
  
  await symbolManager.preloadStandardLibrary();
  
  logger.info('Server initialized with standard library pre-loaded');
}
```

**Step 3: Verify with Performance Tests**

```bash
# Run performance tests to verify improvement
npm test -- --testPathPattern="performance" --maxWorkers=1

# Expected results:
# - First didOpen: 219ms → 73ms ✅
# - Blocking: YES → NO ✅
```

### Estimated Effort
- **Investigation:** 1 hour (check if method exists)
- **Implementation:** 2 hours (add method + call at startup)
- **Testing:** 2 hours (verify with performance tests)
- **Total:** ~5 hours

### Acceptance Criteria
- [ ] First didOpen completes in <100ms (Node.js)
- [ ] No blocking operations >100ms in Node.js environment
- [ ] Performance tests pass
- [ ] Server startup time increased by <200ms
- [ ] Memory usage increase <50MB

---

## Priority 1: Migrate to Effect.sync() Pattern

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
  documentProcessingService.processDocumentOpenSingle(event)
);
```

**Step 3: Update Tests**

```typescript
// Update integration tests
const result = await Effect.runPromise(
  service.processDocumentOpenSingle(event)
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

| Scenario | Before | After P0 | Saved | Impact |
|----------|--------|----------|-------|--------|
| **First didOpen** | 219ms | 73ms | **146ms** | 🔥 Major |
| **Subsequent** | 9ms | 9ms | 0ms | ✅ Already fast |
| **User perception** | Slow | Fast | ✅ | ⭐⭐⭐⭐⭐ |

---

### Browser Web Worker

| Scenario | Before | After P0 | Saved | Impact |
|----------|--------|----------|-------|--------|
| **First didOpen** | 219ms | 73ms | **146ms** | 🔥 Major |
| **Subsequent** | 9ms | 9ms | 0ms | ✅ Already fast |
| **User perception** | Slow | Fast | ✅ | ⭐⭐⭐⭐⭐ |

---

### Browser Main Thread

| Scenario | Before | After P0 | After P4 | Impact |
|----------|--------|----------|----------|--------|
| **First didOpen** | 219ms | 73ms | <16ms | 🔥 Critical |
| **Subsequent** | 9ms | 9ms | <16ms | ⚠️ Borderline |
| **Frames dropped** | 13 | 4 | 0 | ⭐⭐⭐⭐⭐ |

---

## Risk Management

### Risk Matrix

| Priority | Risk Level | Mitigation Strategy |
|----------|-----------|---------------------|
| **P0** | 🟢 Low | Startup cost acceptable, stdlib needed anyway |
| **P1** | 🟡 Medium | Pattern proven in DiagnosticProcessingService |
| **P2** | 🟢 Low | Read-only testing, no code changes |
| **P3** | 🟢 Low | Metrics optional, no functional impact |
| **P4** | 🟡 Medium | Complex, only if needed, prototype first |

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
  loadClass('String'),  // CPU work
  loadClass('List'),    // CPU work
  loadClass('Map'),     // CPU work
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
    first: 100,      // After pre-loading
    subsequent: 20,   // Allow some variance
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

### Clear Path Forward

1. **✅ Implement P0 immediately** - High impact, low effort, low risk
2. **✅ Implement P1 soon** - Prepares for future optimizations
3. **✅ Implement P2 & P3** - Validate and monitor
4. **⚠️ Evaluate P4** - Only if browser main thread requires it

### Expected Outcome

**After P0 (Pre-loading):**
- Node.js: First didOpen 73ms ✅ (below 100ms threshold)
- Browser Worker: First didOpen 73ms ✅ (below 100ms threshold)
- Browser Main: First didOpen 73ms ⚠️ (above 16ms, may need P4)

**Recommendation:** Start with P0, measure results, then decide on P4.

### Success Definition

**Node.js:** ✅ First didOpen <100ms → **Achieved with P0**  
**Browser Worker:** ✅ First didOpen <100ms → **Achieved with P0**  
**Browser Main:** ⚠️ First didOpen <16ms → **May require P4**

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

**Next Action:** Implement Priority 0 (Pre-load Standard Library)
