# Performance Benchmarks

This directory contains performance benchmarks for the `apex-lsp-testbed` package using [Benchmark.js](https://benchmarkjs.com/).

## Benchmark Files

- `lsp-benchmarks.perf.ts` - End-to-end LSP protocol benchmarks (client/server communication)
- `eda-workspace.perf.ts` - Large workspace compilation analysis using real EDA codebase

## Running Benchmarks

### QUICK Mode (Fast Validation)

For quick validation during development (~30-60 seconds):

```bash
npm run test:perf:quick
# or with environment variable:
QUICK=true npm run test:perf
```

- **Purpose**: Verify benchmarks work without waiting for comprehensive analysis
- **LSP Benchmarks**: Fast settings (maxTime=6s, minSamples=2)
- **EDA Workspace**: Skips large tests, uses 3-5 files where applicable
- **Use when**: Developing benchmarks, fixing bugs, quick CI checks

### LOCAL Mode (Balanced)

For local development with reasonable accuracy (~5-10 minutes):

```bash
npm run test:perf
```

- **Purpose**: Get reasonably accurate performance data for local testing
- **LSP Benchmarks**: Balanced settings (maxTime=8s, minSamples=2)
- **EDA Workspace**: 10-20 files for manageable runtime
- **Use when**: Investigating performance issues, comparing changes locally

### CI Mode (Comprehensive)

For production CI tracking with high statistical confidence (~15-30 minutes):

```bash
CI=true npm run test:perf
```

- **Purpose**: Generate authoritative benchmark data for trend tracking
- **LSP Benchmarks**: Comprehensive settings (maxTime=30s, minSamples=3-5)
- **EDA Workspace**: 50-100 files for thorough analysis
- **Use when**: Automated CI runs, official performance tracking

### Targeted Tests

Run specific benchmark suites:

```bash
# LSP protocol benchmarks only
npm run test:perf:lsp

# EDA workspace analysis only
npm run test:perf:eda
```

## Benchmark Types

### LSP Benchmarks (`lsp-benchmarks.perf.ts`)

**Micro-benchmarks** using Benchmark.js for statistical analysis:

- Multiple iterations for ops/sec measurement
- Statistical variance analysis (RME, stddev)
- Tests individual LSP operations (textDocument/didOpen, completion, etc.)
- Suitable for Benchmark.js because operations are fast (< 100ms)

### EDA Workspace Benchmarks (`eda-workspace.perf.ts`)

**Integration measurements** using single-run timing:

- **NOT statistical benchmarks** - too slow for multiple iterations
- Direct timing measurements for large-scale compilation
- Tests workspace loading, batch compilation, layered listeners
- Uses real EDA repository (large Salesforce codebase)
- Benchmark.js only used for very small file counts (3-5 files)

**Important**: EDA tests skip heavy workloads in QUICK mode. Use LOCAL or CI mode for meaningful results.

## Output

Benchmarks generate JSON files for CI tracking:

```
packages/apex-lsp-testbed/test/apex-lsp-testbed-benchmark-results.json
```

This file is uploaded to GitHub Actions and tracked over time using [github-action-benchmark](https://github.com/benchmark-action/github-action-benchmark).

## CI Integration

Benchmarks run automatically on:

- **Push to main**: Tracks trends, stores data, alerts on >130% regression
- **Pull requests**: Compares performance, posts comment with results

See `.github/workflows/benchmark.yml` for configuration.

## Understanding Results

### Benchmark.js Output (LSP benchmarks):

```
textDocument/didOpen x 45.32 ops/sec ±2.15% (8 runs sampled)
                      ^^^^^^^  ^^^^^^  ^^^^^^^^
                      Hz       RME     Samples
```

- **Hz (ops/sec)**: Operations per second (higher is better)
- **RME**: Relative margin of error (lower is better, <5% is good)
- **Samples**: Number of times the benchmark ran

### Direct Timing Output (EDA workspace):

```
Total Compilation Time: 2023.00ms (2.02s)
Average Time per File: 197.09ms
```

- Single-run measurements, not statistical averages
- Focus on absolute time and scaling characteristics
- Memory growth and peak usage tracked throughout

## Best Practices

1. **Use QUICK mode for development** - Don't wait for full benchmarks during iteration
2. **Use LOCAL mode for investigation** - More accurate than QUICK when debugging performance
3. **Let CI handle comprehensive benchmarks** - CI mode is slow but statistically rigorous
4. **Don't add assertions** - Benchmarks are informational, not pass/fail tests
5. **Understand the test type**:
   - **Micro-benchmarks** (LSP): Use Benchmark.js, expect statistical data
   - **Integration measurements** (EDA): Direct timing, expect single-run results

## EDA Repository

The EDA workspace tests use a real Salesforce codebase for realistic performance analysis:

- **Repository**: https://github.com/mshanemc/EDA.git
- **Automatically cloned** on first run to `test/fixtures/eda`
- **88% Apex code** with complex dependencies
- **Excellent real-world test case** for compilation performance

The repository is cloned once and reused across test runs.
