# EDA Performance Test Configuration

## Problem

The EDA workspace performance tests were using **large file counts** (10-100+ files) with **Benchmark.js**, which is designed for micro-benchmarks with many iterations. This made the tests impractically slow:

- **Benchmark.js iterations**: Requires multiple runs for statistical significance
- **Large codebase**: EDA has 100+ Apex files
- **Multiplication effect**: 100 files × 5 iterations × 3 test scenarios = 1500+ compilations
- **Result**: Tests would take hours even in "QUICK" mode

## Solution

Changed the approach based on test type:

### 1. **Micro-benchmarks (Small file counts)**

- Use Benchmark.js for statistical analysis
- File count: 3-5 files maximum
- Example: Layered listener comparison with 3 files

### 2. **Integration measurements (Large file counts)**

- Use **single-run direct timing** (NOT Benchmark.js)
- Focus on absolute time and scaling characteristics
- Example: Full workspace load, batch compilation

### 3. **Mode-Based File Counts**

| Mode      | Full Workspace | Batch Tests | Incremental | Layered Listeners |
| --------- | -------------- | ----------- | ----------- | ----------------- |
| **QUICK** | 5 files        | 5 files     | 3 files     | 3 files           |
| **LOCAL** | 50 files       | 20 files    | 10 files    | 10 files          |
| **CI**    | All files      | 100 files   | 50 files    | 50 files          |

**Key principle**: QUICK mode runs ALL tests with minimal file counts. This allows developers to:

- Verify test logic works
- Catch compilation/syntax errors
- Iterate quickly when working on tests
- Get fast feedback (~30-60 seconds total)

### 4. **Skip Logic**

Tests automatically skip ONLY when:

- EDA repository not found
- No files discovered after filtering

## Usage

```bash
# Fast validation (30-60 seconds)
# - All tests run with 3-5 files
# - Verifies test logic works, catches errors
# - Enables fast iteration when developing tests
QUICK=true npm run test:perf:eda

# Local development (5-10 minutes)
# - Reasonable file counts (10-50)
# - Good for performance investigation
npm run test:perf:eda

# CI comprehensive (15-30 minutes)
# - Full file counts (50-100+)
# - Authoritative measurements
CI=true npm run test:perf:eda
```

## Test Categories

All tests run in QUICK mode with minimal file counts (3-5 files):

1. **Baseline Memory** - Quick memory snapshot (no files)
2. **Full Workspace Load** - 5 files (vs 50 LOCAL, all CI)
3. **Batch Compilation** - 5 files (vs 20 LOCAL, 100 CI)
4. **Incremental Load** - 3 files (vs 10 LOCAL, 50 CI)
5. **Layered Listeners** - 3 files (vs 10 LOCAL, 50 CI)
6. **Incremental Layered** - 3 files (vs 5 LOCAL, 30 CI)
7. **Symbol Manager Analysis** - 3 files (vs 10 LOCAL, 50 CI)

**No tests are skipped in QUICK mode** - all run with small file counts to enable development.

## Key Principles

1. **Benchmark.js for micro-benchmarks only** (< 5 files, fast operations)
2. **Direct timing for integration tests** (many files, slow operations)
3. **QUICK mode = verification**, all tests run with minimal data
4. **LOCAL mode = investigation**, balanced for development workflow
5. **CI mode = authoritative**, for trend tracking and regression detection
6. **Never skip tests in QUICK mode** - always run with small file counts so developers can verify changes

## Performance Expectations

### QUICK Mode

- **Runtime**: 30-60 seconds
- **Purpose**: Verify test logic works, catch compilation/syntax errors, enable fast iteration
- **All tests run**: Uses 3-5 files per test (no skipping)
- **Not suitable for**: Performance comparisons, trend analysis, actual benchmarking

### LOCAL Mode

- **Runtime**: 5-10 minutes
- **Purpose**: Investigate performance issues, compare changes
- **File counts**: Reasonable subset for development workflow

### CI Mode

- **Runtime**: 15-30 minutes
- **Purpose**: Official measurements, regression detection
- **File counts**: Comprehensive coverage

## EDA Repository

- **URL**: https://github.com/mshanemc/EDA.git
- **Location**: `test/fixtures/eda`
- **Auto-clone**: First run only
- **Size**: 100+ Apex files, real-world complexity
- **Purpose**: Realistic performance testing with production-like code

## Future Improvements

1. **Consider smaller synthetic test corpus** for QUICK mode
2. **Cache parsed ASTs** for repeated runs
3. **Add memory profiling** for specific bottlenecks
4. **Parallel compilation benchmarks** when supported
5. **Compare with testbed lsp-benchmarks** for end-to-end validation
