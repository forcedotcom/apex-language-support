# Performance Benchmarks

This directory contains performance benchmarks for the `apex-parser-ast` package using [Benchmark.js](https://benchmarkjs.com/).

## Benchmark Files

- `compilerService.perf.ts` - Compilation phases and scalability
- `protobuf-cache.perf.ts` - Cache loading and deserialization
- `symbolManager-stdlibLoading.perf.ts` - Standard library loading overhead
- `symbolGraph-memory.perf.ts` - Graph operations and memory usage

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

For production CI tracking with high statistical confidence (~5-10 minutes):

```bash
CI=true npm run test:perf
```

- **Purpose**: Generate authoritative benchmark data for trend tracking
- **Settings**: 5 samples, maxTime=30s, minTime=10s
- **Use when**: Automated CI runs, official performance tracking

## Output

Benchmarks generate a JSON file for CI tracking:

```
packages/apex-parser-ast/test/apex-parser-ast-benchmark-results.json
```

This file is uploaded to GitHub Actions and tracked over time using [github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark).

## CI Integration

Benchmarks run automatically on:

- **Push to main**: Tracks trends, stores data, alerts on >130% regression
- **Pull requests**: Compares performance, posts comment with results

See `.github/workflows/benchmark.yml` for configuration.

## Understanding Results

Benchmark.js output format:

```
CompilerService.compile (full) x 16.54 ops/sec ±286.23% (4 runs sampled)
                                  ^^^^^^^  ^^^^^^^^  ^^^^^^^^
                                  Hz       RME       Samples
```

- **Hz (ops/sec)**: Operations per second (higher is better)
- **RME**: Relative margin of error (lower is better, <5% is good)
- **Samples**: Number of times the benchmark ran

## Best Practices

1. **Use QUICK mode for development** - Don't wait for full benchmarks during iteration
2. **Use LOCAL mode for investigation** - More accurate than QUICK when debugging performance
3. **Let CI handle comprehensive benchmarks** - CI mode is slow but statistically rigorous
4. **Don't add assertions** - Benchmarks are informational, not pass/fail tests
5. **Merge results** - Each benchmark appends to the JSON file for complete CI tracking
