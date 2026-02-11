# Performance Baselines

Performance baselines and benchmarking guide for Apex Language Server Extension e2e tests.

---

## 📊 Performance Baselines

These baselines represent acceptable performance thresholds for common operations.

### Extension Lifecycle

| Operation | Baseline | Threshold | Unit |
|-----------|----------|-----------|------|
| **Extension Activation** | 3000ms | ±20% | ms |
| **LSP Initialization** | 2000ms | ±20% | ms |

**Notes:**
- Extension activation includes loading the extension bundle and starting the LSP worker
- LSP initialization includes parsing standard library and initializing services

### LSP Operations

| Operation | Baseline | Threshold | Unit |
|-----------|----------|-----------|------|
| **Outline Populate** | 1000ms | ±30% | ms |
| **Hover Show** | 500ms | ±30% | ms |
| **Go-to-Definition** | 500ms | ±30% | ms |
| **Completion Trigger** | 800ms | ±30% | ms |
| **Signature Help** | 600ms | ±30% | ms |

**Notes:**
- Baselines assume standard test file (~300 lines)
- Complex files (1000+ lines) may exceed thresholds
- First operation may be slower due to initial parsing

### File Operations

| Operation | Baseline | Threshold | Unit |
|-----------|----------|-----------|------|
| **File Open** | 500ms | ±30% | ms |
| **File Save** | 300ms | ±30% | ms |
| **Document Parse** | 1500ms | ±30% | ms |
| **Document Update** | 500ms | ±30% | ms |

**Notes:**
- File operations include VS Code UI interactions
- Parse time includes syntax tree construction and semantic analysis

### Memory Usage

| Operation | Baseline | Threshold | Unit |
|-----------|----------|-----------|------|
| **Initial Memory** | 50MB | ±20% | MB |
| **Peak Memory** | 200MB | ±30% | MB |

**Notes:**
- Memory baselines require desktop mode
- Initial memory: Extension load + LSP start
- Peak memory: After processing complex file

---

## 🔧 Using Performance Utilities

### 1. Basic Benchmarking

```typescript
import { PerformanceBenchmarker } from '../utils/performance-benchmarking';

test('should open file within performance threshold', async ({ apexEditor }) => {
  const benchmarker = new PerformanceBenchmarker();

  // Start timing
  benchmarker.start('file.open');

  // Perform operation
  await apexEditor.openFile('MyClass.cls');

  // End timing
  const benchmark = benchmarker.end('file.open');

  // Check against baseline
  const comparison = benchmarker.compareToBaseline('file.open');
  expect(comparison?.withinThreshold).toBe(true);

  // Generate report
  console.log(benchmarker.generateReport());
});
```

### 2. Memory Profiling

Memory profiling requires **desktop mode**:

```typescript
import { MemoryProfiler } from '../utils/performance-benchmarking';

test('should not leak memory', async ({ page, apexEditor }) => {
  const profiler = new MemoryProfiler();

  // Initial snapshot
  await profiler.takeSnapshot(page);

  // Perform operations
  await apexEditor.openFile('LargeClass.cls');
  await profiler.takeSnapshot(page);

  // Force GC and take final snapshot
  await profiler.forceGC(page);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await profiler.takeSnapshot(page);

  // Get memory statistics
  const peak = profiler.getPeakMemory();
  console.log(`Peak memory: ${(peak!.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);

  // Generate report
  console.log(profiler.generateReport());
});
```

### 3. Async Operation Measurement

```typescript
import { measureAsync } from '../utils/performance-benchmarking';

test('should complete hover quickly', async ({ hoverHelper }) => {
  const { result, duration } = await measureAsync(
    'hover.show',
    () => hoverHelper.hoverOnWord('ApexClassExample')
  );

  expect(duration).toBeLessThan(500); // 500ms threshold
  console.log(`✅ Hover completed in ${duration}ms`);
});
```

### 4. Comprehensive Performance Test

```typescript
import { PerformanceBenchmarker, MemoryProfiler } from '../utils/performance-benchmarking';

test('comprehensive performance test', async ({ page, apexEditor, outlineView, hoverHelper }) => {
  const benchmarker = new PerformanceBenchmarker();
  const profiler = new MemoryProfiler();

  // Initial memory
  await profiler.takeSnapshot(page);

  // Benchmark file open
  benchmarker.start('file.open');
  await apexEditor.openFile('ComplexClass.cls');
  benchmarker.end('file.open');
  await profiler.takeSnapshot(page);

  // Benchmark outline populate
  benchmarker.start('outline.populate');
  await outlineView.open();
  await outlineView.waitForSymbols(1, 5000);
  benchmarker.end('outline.populate');
  await profiler.takeSnapshot(page);

  // Benchmark hover
  benchmarker.start('hover.show');
  await hoverHelper.hoverOnWord('ComplexClass');
  await hoverHelper.waitForHover();
  benchmarker.end('hover.show');
  await profiler.takeSnapshot(page);

  // Generate reports
  console.log(benchmarker.generateReport());
  console.log(profiler.generateReport());

  // Verify all operations within thresholds
  const fileOpen = benchmarker.compareToBaseline('file.open');
  const outlinePopulate = benchmarker.compareToBaseline('outline.populate');
  const hoverShow = benchmarker.compareToBaseline('hover.show');

  expect(fileOpen?.withinThreshold).toBe(true);
  expect(outlinePopulate?.withinThreshold).toBe(true);
  expect(hoverShow?.withinThreshold).toBe(true);
});
```

---

## 📈 Performance Reports

### Benchmark Report Format

```
================================================================================
PERFORMANCE BENCHMARK REPORT
================================================================================

Total Operations: 5

Benchmark Results:
--------------------------------------------------------------------------------
Operation                                Duration       vs Baseline
--------------------------------------------------------------------------------
✅ file.open                             485.23ms       -2.9% (OK)
✅ outline.populate                      923.45ms       -7.7% (OK)
⚠️ hover.show                            675.12ms       +35.0% (SLOW)
✅ goto-definition                       412.78ms       -17.4% (OK)
✅ completion.trigger                    745.89ms       -6.8% (OK)
--------------------------------------------------------------------------------

⚠️ Performance Issues:

  - hover.show: 675.12ms (expected: 500ms, +35.0%)

================================================================================
```

### Memory Report Format

```
================================================================================
MEMORY PROFILING REPORT
================================================================================

Total Snapshots: 6

Memory Statistics:
--------------------------------------------------------------------------------
Initial Memory:  48.23MB
Final Memory:    142.67MB
Peak Memory:     178.92MB
Average Memory:  98.45MB
Memory Growth:   94.44MB
--------------------------------------------------------------------------------

⚠️ Peak memory exceeds baseline: 178.92MB > 150.00MB

================================================================================
```

---

## 🎯 Performance Testing Best Practices

### 1. Use Desktop Mode for Accurate Measurements

Desktop mode provides:
- Precise memory info (`performance.memory`)
- GC control (`gc()` function)
- Enhanced performance metrics

```bash
# Run performance tests in desktop mode
npm run test:e2e:desktop
```

### 2. Warm Up Before Measuring

First operation is often slower due to cold start:

```typescript
// Warm up
await apexEditor.openFile('WarmUp.cls');
await apexEditor.closeFile();

// Now measure
benchmarker.start('file.open');
await apexEditor.openFile('TestFile.cls');
benchmarker.end('file.open');
```

### 3. Run Multiple Iterations

Single measurements can be noisy:

```typescript
const durations: number[] = [];

for (let i = 0; i < 5; i++) {
  benchmarker.start(`hover.show.${i}`);
  await hoverHelper.hoverOnWord('TestClass');
  const benchmark = benchmarker.end(`hover.show.${i}`);
  durations.push(benchmark!.duration);
  await hoverHelper.dismissHover();
}

const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
console.log(`Average hover duration: ${avgDuration.toFixed(2)}ms`);
```

### 4. Isolate Operations

Minimize interference between measurements:

```typescript
// Bad: Operations overlap
benchmarker.start('operation1');
benchmarker.start('operation2'); // Overlaps!
await doSomething();
benchmarker.end('operation1');
benchmarker.end('operation2');

// Good: Operations isolated
benchmarker.start('operation1');
await doOperation1();
benchmarker.end('operation1');

benchmarker.start('operation2');
await doOperation2();
benchmarker.end('operation2');
```

### 5. Control for Variables

Minimize external factors:

```typescript
// Close other applications
// Disable browser extensions
// Use consistent test files
// Run tests in similar environment (CI vs local)
```

### 6. Use Baseline Comparisons

Always compare against baselines:

```typescript
const comparison = benchmarker.compareToBaseline('hover.show');
if (!comparison?.withinThreshold) {
  console.warn(
    `⚠️ Performance regression: ${comparison.operation} took ${comparison.actual}ms ` +
    `(expected: ${comparison.baseline}ms, +${comparison.differencePercent.toFixed(1)}%)`
  );
}
```

---

## 🔍 Analyzing Performance Issues

### 1. Identify Slow Operations

Run benchmark report to find operations exceeding thresholds:

```typescript
console.log(benchmarker.generateReport());

// Look for ⚠️ markers indicating slow operations
```

### 2. Profile Memory Usage

Check for memory leaks or excessive usage:

```typescript
console.log(profiler.generateReport());

// Look for:
// - Unexpected memory growth
// - Peak memory exceeding baselines
// - Memory not released after GC
```

### 3. Compare Web vs Desktop Mode

Desktop mode may reveal different performance characteristics:

```bash
# Web mode
npm run test:e2e:web:chromium

# Desktop mode
npm run test:e2e:desktop:chromium

# Compare results
```

### 4. Test with Different File Sizes

Performance may degrade with larger files:

```typescript
// Small file (100 lines)
await benchmarkFile('SmallClass.cls');

// Medium file (500 lines)
await benchmarkFile('MediumClass.cls');

// Large file (2000 lines)
await benchmarkFile('LargeClass.cls');
```

### 5. Use Browser DevTools

Debug performance in headed mode:

```bash
npm run test:e2e:desktop:debug
```

Then use Chrome DevTools:
- Performance tab
- Memory tab
- Network tab

---

## 🚀 Performance Optimization Tips

### For Test Code

1. **Reduce unnecessary waits:**
   ```typescript
   // Bad
   await page.waitForTimeout(5000);

   // Good
   await outlineView.waitForSymbols(1, 5000);
   ```

2. **Use efficient selectors:**
   ```typescript
   // Bad
   await page.locator('div > span > button').click();

   // Good
   await page.locator('[data-testid="my-button"]').click();
   ```

3. **Minimize page interactions:**
   ```typescript
   // Bad: Multiple round-trips
   const text1 = await element1.textContent();
   const text2 = await element2.textContent();

   // Good: Single evaluation
   const [text1, text2] = await page.evaluate(() => [
     document.querySelector('#elem1')?.textContent,
     document.querySelector('#elem2')?.textContent
   ]);
   ```

### For Extension Code

Performance issues in tests may indicate extension issues:

1. **Optimize LSP responses** - Reduce response time
2. **Cache parsed results** - Avoid re-parsing
3. **Use incremental updates** - Don't reprocess entire file
4. **Optimize symbol indexing** - Build efficient indexes
5. **Profile with real workloads** - Test with actual Salesforce projects

---

## 📋 Performance Test Checklist

Before committing code:

- [ ] Run performance tests in desktop mode
- [ ] Verify all operations within baseline thresholds
- [ ] Check for memory leaks (stable memory after GC)
- [ ] Compare performance vs previous version
- [ ] Test with various file sizes
- [ ] Review performance reports
- [ ] Document any intentional performance changes

---

## 🔗 Additional Resources

- [DESKTOP-TESTING.md](DESKTOP-TESTING.md) - Desktop mode guide
- [performance-benchmarking.ts](utils/performance-benchmarking.ts) - Benchmarking utilities
- [TESTING-GUIDE.md](TESTING-GUIDE.md) - Comprehensive testing guide
- [Playwright Performance](https://playwright.dev/docs/best-practices) - Best practices
