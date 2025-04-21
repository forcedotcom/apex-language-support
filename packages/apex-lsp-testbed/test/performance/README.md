# Apex LSP Performance Testing

This directory contains tools for benchmarking Apex Language Server Protocol (LSP) operations.

## Available Benchmarks

### 1. Jest-based Performance Tests

Run all performance tests with:

```bash
npm run benchmark
```

These tests use Jest and provide detailed metrics through the testing framework.

### 2. Standalone Benchmark

A standalone benchmark script that measures key LSP operations:
- Completion requests at different locations
- Hover requests
- Document symbol requests

Run the standalone benchmark with:

```bash
npm run benchmark:standalone
```

## Creating Custom Benchmarks

To create a new performance test:

1. Add a new file in the `test/performance` directory
2. For Jest tests, use the naming convention `*.perf.test.ts`
3. For standalone scripts, add an NPM script entry in `package.json`

## Best Practices

- Run benchmarks in a stable environment for consistent results
- Compare results against previous versions to track performance changes
- Consider running benchmarks in CI pipelines to detect performance regressions 