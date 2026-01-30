# Performance Utilities

Shared performance measurement utilities that work in both test and production environments,
with optional Effect metrics integration.

## Features

- ✅ **Environment-aware**: Works in Node.js, browser, and web workers
- ✅ **CPU blocking detection**: Automatic detection with environment-specific thresholds
- ✅ **Effect metrics integration**: Optional production observability via Effect.Metric
- ✅ **Browser Performance API**: Integrates with DevTools Performance timeline
- ✅ **Zero dependencies**: Works without Effect for simple testing

## Quick Start (Testing)

```typescript
import { measureTime, measureSyncBlocking } from '@salesforce/apex-lsp-shared';

// Measure async operation
const { result, avgTimeMs } = await measureTime(() => compile(code));
console.log(`Compilation took ${avgTimeMs}ms`);

// Measure sync operation with blocking detection
const { result, durationMs, isBlocking } = measureSyncBlocking(
  'parse-tree',
  () => parser.parse(code)
);

if (isBlocking) {
  console.warn(`Operation blocked event loop for ${durationMs}ms!`);
}
```

## Production Usage (with Effect Metrics)

### 1. Enable Metrics at Startup

```typescript
// In your server initialization
import { Effect } from 'effect';
import { enableMetrics } from '@salesforce/apex-lsp-shared';

// Enable metrics once at startup
enableMetrics(Effect);
```

### 2. Use Measurements (Metrics Emitted Automatically)

```typescript
import { measureSyncBlocking, PERFORMANCE_METRICS } from '@salesforce/apex-lsp-shared';

// This will automatically emit metrics when metrics are enabled
const { result } = measureSyncBlocking('compile', () => {
  return compilerService.compile(code, fileName, listener);
});

// Metrics emitted:
// - apex.compile.duration (histogram)
// - apex.eventloop.blocking (counter, if blocked)
```

### 3. Available Metrics

```typescript
// Compilation metrics
PERFORMANCE_METRICS.COMPILE_DURATION           // apex.compile.duration
PERFORMANCE_METRICS.PARSE_TREE_DURATION        // apex.parse.duration
PERFORMANCE_METRICS.TREE_WALK_DURATION         // apex.walk.duration

// Symbol resolution metrics
PERFORMANCE_METRICS.SYMBOL_RESOLUTION_DURATION // apex.symbol.resolution.duration
PERFORMANCE_METRICS.MEMBER_RESOLUTION_DURATION // apex.symbol.member.duration
PERFORMANCE_METRICS.STDLIB_LOAD_DURATION       // apex.stdlib.load.duration

// Cache effectiveness
PERFORMANCE_METRICS.STDLIB_CACHE_HITS          // apex.stdlib.cache.hits
PERFORMANCE_METRICS.STDLIB_CACHE_MISSES        // apex.stdlib.cache.misses

// Blocking detection
PERFORMANCE_METRICS.EVENT_LOOP_BLOCKING        // apex.eventloop.blocking
```

## Environment Detection

The utilities automatically detect the execution environment and adjust blocking thresholds:

| Environment | Blocking Threshold | Reason |
|-------------|-------------------|--------|
| Browser main thread | 16ms | 60fps requirement |
| Web worker | 100ms | Can block without freezing UI |
| Node.js | 100ms | Event loop responsiveness |

## API Reference

### measureTime<T>(fn, iterations?)

Measure execution time of an async function over multiple iterations.

```typescript
const { result, avgTimeMs, minTimeMs, maxTimeMs } = await measureTime(
  async () => await someAsyncOp(),
  3 // run 3 times
);
```

### measureSyncBlocking<T>(operation, fn, customThreshold?)

Measure sync function with automatic blocking detection and metrics.

```typescript
const { result, durationMs, isBlocking, environment } = measureSyncBlocking(
  'compile',
  () => compile(code),
  200 // optional custom threshold
);
```

### measureAsyncBlocking<T>(operation, fn, customThreshold?)

Measure async function with blocking detection.

```typescript
const { result, durationMs, isBlocking } = await measureAsyncBlocking(
  'resolve-member',
  async () => await manager.resolveMemberInContext(...)
);
```

### measurePhases<T>(phases)

Measure multiple phases of execution.

```typescript
const phases = await measurePhases([
  { name: 'parse', fn: () => parse(code) },
  { name: 'walk', fn: () => walk(tree) },
  { name: 'resolve', fn: async () => await resolve(refs) }
]);

phases.forEach(p => {
  console.log(`${p.phase}: ${p.durationMs}ms ${p.isBlocking ? 'BLOCKING!' : 'OK'}`);
});
```

### Browser Performance API Integration

```typescript
import { markPerformance, measurePerformance } from '@salesforce/apex-lsp-shared';

markPerformance('compile-start');
const result = compile(code);
markPerformance('compile-end');
measurePerformance('compile-operation', 'compile-start', 'compile-end');

// Now visible in Chrome DevTools Performance timeline
```

## Integration with Effect

### Manual Metric Recording

```typescript
import { 
  recordDuration, 
  incrementCounter, 
  PERFORMANCE_METRICS 
} from '@salesforce/apex-lsp-shared';

// Record a duration
recordDuration(PERFORMANCE_METRICS.COMPILE_DURATION, durationMs, {
  operation: 'compile',
  environment: 'node'
});

// Increment a counter
incrementCounter(PERFORMANCE_METRICS.STDLIB_CACHE_HITS);
```

### Adding Custom Metrics

```typescript
import { initializeMetrics } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

// Initialize and get registry
const registry = initializeMetrics(Effect);

// Add custom metric
const { Metric } = Effect;
registry.set('my.custom.metric', Metric.counter('my.custom.metric', {
  description: 'My custom counter'
}));
```

## CPU-Bound Performance Note

**Important**: This system runs in a CPU-bound, single-threaded environment with zero I/O.

- ❌ **Don't try to parallelize CPU work** - JavaScript is single-threaded
- ✅ **Do cache expensive computations** - Avoid repeating CPU work
- ✅ **Do yield explicitly** - Use Effect.sync() + yieldToEventLoop
- ✅ **Do measure blocking time** - These utilities help find bottlenecks

## Example: Finding Blocking Operations in Tests

```typescript
describe('Performance Analysis', () => {
  it('identifies blocking operations', () => {
    const result = measureSyncBlocking('compile', () => {
      return compilerService.compile(largeFile, fileName, listener);
    });

    // Assert it doesn't block too long
    expect(result.isBlocking).toBe(false);
    
    // Log timing for analysis
    console.log(formatTimingResult(result));
    // Output: "[PERF] compile: 1234ms BLOCKING (sync, node)"
  });
});
```

## OpenTelemetry Integration

When Effect is configured with OpenTelemetry, all metrics are automatically exported:

```typescript
// In your Effect runtime configuration
import { Effect } from 'effect';
import { NodeSdk } from '@opentelemetry/sdk-node';

// Configure OpenTelemetry
const sdk = new NodeSdk({
  // ... otel configuration
});

sdk.start();

// Enable our metrics
enableMetrics(Effect);

// All performance measurements now export to OpenTelemetry!
```

## See Also

- [Effect Metrics Documentation](https://effect.website/docs/observability/metrics)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/instrumentation/js/)
- [Plan: Identify Synchronous Blocking Operations](../../../../.session-files/plans/identify-synchronous-blocking-ops.md)
