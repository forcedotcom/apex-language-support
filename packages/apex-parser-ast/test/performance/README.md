# Performance Benchmarks

This directory contains native [Vitest benchmarks](https://vitest.dev/guide/benchmarking) for the `apex-parser-ast` package.

## Benchmark Files

- `compilerService.perf.ts` - Compilation phases and scalability
- `protobuf-cache.perf.ts` - Cache loading and deserialization
- `symbolManager-stdlibLoading.perf.ts` - Standard library loading overhead
- `symbolRefManager-memory.perf.ts` - Graph operations and memory usage

## Running Benchmarks

### QUICK Mode (Fast Validation)

For quick validation during development (~10-30 seconds):

```bash
npm run test:perf:quick
# or with environment variable:
QUICK=true npm run test:perf
```

- **Purpose**: Verify benchmarks work without waiting for full statistical analysis
- **Settings**: 1 sample, maxTime=1s, minTime=0.1s
- **Use when**: Developing new benchmarks, fixing bugs, quick CI checks

### LOCAL Mode (Balanced)

For local development with reasonable accuracy (~1-2 minutes):

```bash
npm run test:perf
```

- **Purpose**: Get reasonably accurate performance data for local testing
- **Settings**: 2 samples, maxTime=6s, minTime=2s
- **Use when**: Investigating performance issues, comparing changes locally

### CI Mode (Comprehensive)

For comprehensive CI sampling (~5-10 minutes):

```bash
CI=true npm run test:perf
```

- **Purpose**: Exercise the full benchmark sampling budget
- **Settings**: 5 samples, maxTime=30s, minTime=10s
- **Use when**: Automated CI runs, official performance tracking

## Understanding Results

Vitest prints benchmark latency, throughput, and sample statistics in the command output.

```
name                              hz       min      max      mean
CompilerService.compile (full)   16.54    58 ms    65 ms    60 ms
```

- **Hz (ops/sec)**: Operations per second (higher is better)
- **Latency**: Time per operation (lower is better)
- **Samples**: Vitest reports the configured sample count and distribution

## Best Practices

1. **Use QUICK mode for development** - Don't wait for full benchmarks during iteration
2. **Use LOCAL mode for investigation** - More accurate than QUICK when debugging performance
3. **Let CI handle comprehensive benchmarks** - CI mode is slow but statistically rigorous
4. **Don't add assertions** - Benchmarks are informational, not pass/fail tests
5. **Use CI logs for comparison** - Vitest output is the benchmark record for CI runs
