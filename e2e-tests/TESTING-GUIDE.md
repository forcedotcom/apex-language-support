# Comprehensive E2E Testing Guide

Complete guide for end-to-end testing of the Apex Language Server Extension.

---

## Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Test Modes](#test-modes)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Performance Testing](#performance-testing)
- [Debugging Tests](#debugging-tests)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

---

## Overview

### What We Test

The e2e test suite validates the Apex Language Server Extension in real browser environments:

**Core Functionality:**
- ✅ Extension activation and lifecycle
- ✅ LSP (Language Server Protocol) integration
- ✅ LCS (LSP-Compliant-Services) inclusion

**LSP Features:**
- ✅ Document symbols (outline view)
- ✅ Hover information
- ✅ Go-to-definition navigation
- ✅ Code completion
- ✅ Signature help

**Stability:**
- ✅ Error handling and recovery
- ✅ Performance benchmarking
- ✅ Memory profiling
- ✅ Extended usage stability

### Test Suite Statistics

- **79 comprehensive e2e tests**
- **5 feature-specific test files**
- **100% LSP feature coverage**
- **1,750+ lines of test code**
- **Multiple browser support** (Chromium, WebKit)
- **Cross-platform testing** (Linux, macOS, Windows)

---

## Getting Started

### Prerequisites

```bash
# Required
Node.js >= 20.0.0
npm >= 10.0.0

# Optional (for desktop mode)
Playwright browsers: chromium, webkit
```

### Installation

```bash
# Clone repository
git clone https://github.com/forcedotcom/apex-language-support.git
cd apex-language-support

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install chromium webkit --with-deps
```

### Build Extension

Before running tests, build the extension:

```bash
# From repository root
npm run compile
npm run bundle
```

### Quick Start

```bash
# Run all tests (web mode, default)
npm run test:e2e

# Run with visual debugger
npm run test:e2e:debug

# Run in desktop mode
npm run test:e2e:desktop

# Run specific test file
npx playwright test tests/apex-hover.spec.ts
```

---

## Test Modes

### Web Mode (Default)

**Purpose:** Test browser-based VS Code Web environment

**Characteristics:**
- Standard web browser capabilities
- Default viewport sizes
- Web worker limitations
- Fast execution
- CI/CD optimized

**When to Use:**
- Standard feature testing
- Quick smoke tests
- CI/CD pipelines
- Web-specific compatibility

**Commands:**
```bash
npm run test:e2e
npm run test:e2e:web:chromium
```

### Desktop Mode

**Purpose:** Test with enhanced desktop environment features

**Characteristics:**
- Large viewport (1920x1080)
- Enhanced browser capabilities
  - SharedArrayBuffer
  - Precise memory info
  - GC exposure
- Native OS integrations
- Realistic performance metrics

**When to Use:**
- Performance benchmarking
- Memory profiling
- OS-specific testing
- Desktop bug reproduction

**Commands:**
```bash
npm run test:e2e:desktop
npm run test:e2e:desktop:chromium
npm run test:e2e:desktop:webkit
npm run test:e2e:desktop:all-browsers
```

**See Also:** [DESKTOP-TESTING.md](DESKTOP-TESTING.md)

---

## Running Tests

### Basic Commands

```bash
# Run all tests (web mode)
npm run test:e2e

# Run in debug mode (headed, slow motion)
npm run test:e2e:debug

# Run in visual mode (interactive UI)
npm run test:e2e:visual

# Run specific test file
npx playwright test tests/apex-outline.spec.ts

# Run tests matching pattern
npx playwright test --grep "should navigate"
```

### Browser-Specific

```bash
# Web mode browsers
npm run test:e2e:web:chromium

# Desktop mode browsers
npm run test:e2e:desktop:chromium
npm run test:e2e:desktop:webkit
```

### Environment Variables

```bash
# Enable desktop mode
TEST_MODE=desktop npm run test:e2e

# Enable debug mode
DEBUG_MODE=1 npm run test:e2e

# CI mode (automatically detected)
CI=1 npm run test:e2e
```

### Advanced Options

```bash
# Run tests in parallel
npx playwright test --workers=4

# Run with trace recording
npx playwright test --trace=on

# Run with screenshots
npx playwright test --screenshot=on

# Run with video recording
npx playwright test --video=on

# Run specific project
npx playwright test --project=chromium-desktop

# Run in headed mode
npx playwright test --headed

# Update snapshots
npx playwright test --update-snapshots
```

---

## Writing Tests

### Test Structure

All tests use the page object pattern with fixtures:

```typescript
import { test, expect } from '../fixtures/apexFixtures';

test.describe('Feature Name', () => {
  test('should do something', async ({ apexEditor, outlineView }) => {
    await test.step('Setup', async () => {
      await apexEditor.openFile('MyClass.cls');
      await apexEditor.waitForLanguageServerReady();
    });

    await test.step('Action', async () => {
      await outlineView.open();
      const symbols = await outlineView.getSymbols();
    });

    await test.step('Verify', async () => {
      expect(symbols.length).toBeGreaterThan(0);
      console.log('✅ Test passed');
    });
  });
});
```

### Available Fixtures

```typescript
test('example', async ({
  apexEditor,          // ApexEditorPage instance
  outlineView,         // OutlineViewPage instance
  hoverHelper,         // HoverPage instance
  apexTestEnvironment, // Complete test environment
  consoleErrors,       // Captured console errors
  networkErrors,       // Captured network errors
}) => {
  // Test code
});
```

### Available Page Objects

**BasePage:**
- `waitForWorkbenchLoad()`
- `openCommandPalette()`
- `executeCommand()`
- `goToLine()`

**ApexEditorPage:**
- `openFile()`
- `goToPosition()`
- `goToDefinition()`
- `triggerCompletion()`
- `waitForLanguageServerReady()`

**OutlineViewPage:**
- `open()`
- `getSymbols()`
- `findSymbol()`
- `validateSymbols()`
- `waitForSymbols()`

**HoverPage:**
- `hoverOnWord()`
- `getHoverContent()`
- `hasTypeInformation()`
- `hasMethodSignature()`
- `dismissHover()`

### Test Best Practices

**DO:**
- ✅ Use page objects for all UI interactions
- ✅ Use fixtures for setup/teardown
- ✅ Use `test.step()` for clear reporting
- ✅ Add descriptive console logs
- ✅ Write focused, single-purpose tests
- ✅ Use descriptive test names ("should...")
- ✅ Test one thing at a time
- ✅ Make tests independent

**DON'T:**
- ❌ Use `page.locator()` directly in tests
- ❌ Import from `@playwright/test`
- ❌ Put assertions in page objects
- ❌ Create test dependencies
- ❌ Use hard-coded waits
- ❌ Test implementation details
- ❌ Write flaky tests

### Example Tests

**Simple Feature Test:**
```typescript
test('should show hover for class name', async ({ hoverHelper }) => {
  await hoverHelper.hoverOnWord('ApexClassExample');
  const content = await hoverHelper.getHoverContent();
  expect(content.length).toBeGreaterThan(0);
  console.log('✅ Hover displayed');
});
```

**Complex Workflow Test:**
```typescript
test('should navigate through class hierarchy', async ({
  apexEditor,
  outlineView,
  hoverHelper,
}) => {
  await test.step('Open file and populate outline', async () => {
    await apexEditor.openFile('inheritance.cls');
    await outlineView.open();
    await outlineView.waitForSymbols(1);
  });

  await test.step('Navigate to base class', async () => {
    await apexEditor.positionCursorOnWord('BaseHandler');
    await apexEditor.goToDefinition();
    expect(await apexEditor.isApexFileOpen()).toBe(true);
  });

  await test.step('Verify base class hover', async () => {
    await hoverHelper.hoverOnWord('abstract class BaseHandler');
    const content = await hoverHelper.getHoverContent();
    expect(content).toContain('abstract');
  });

  console.log('✅ Class hierarchy navigation successful');
});
```

---

## Performance Testing

### Using Performance Benchmarking

```typescript
import { PerformanceBenchmarker } from '../utils/performance-benchmarking';

test('should complete hover within threshold', async ({ hoverHelper }) => {
  const benchmarker = new PerformanceBenchmarker();

  benchmarker.start('hover.show');
  await hoverHelper.hoverOnWord('ApexClassExample');
  await hoverHelper.waitForHover();
  benchmarker.end('hover.show');

  // Compare to baseline
  const comparison = benchmarker.compareToBaseline('hover.show');
  expect(comparison?.withinThreshold).toBe(true);

  // Generate report
  console.log(benchmarker.generateReport());
});
```

### Memory Profiling

```typescript
import { MemoryProfiler } from '../utils/performance-benchmarking';

test('should not leak memory', async ({ page, apexEditor }) => {
  const profiler = new MemoryProfiler();

  await profiler.takeSnapshot(page);
  await apexEditor.openFile('LargeClass.cls');
  await profiler.takeSnapshot(page);

  await profiler.forceGC(page);
  await new Promise(resolve => setTimeout(resolve, 1000));
  await profiler.takeSnapshot(page);

  console.log(profiler.generateReport());
});
```

**See Also:** [PERFORMANCE-BASELINES.md](PERFORMANCE-BASELINES.md)

---

## Debugging Tests

### Debug Mode

```bash
# Open Playwright Inspector
npm run test:e2e:debug

# Debug specific test
npx playwright test tests/apex-hover.spec.ts --debug

# Debug in headed mode
npx playwright test --headed
```

### Trace Viewer

```bash
# Run with trace
npx playwright test --trace=on

# View trace
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Tests automatically capture on failure:
- Screenshots: `e2e-tests/test-results/`
- Videos: `e2e-tests/test-results/`
- Traces: `e2e-tests/test-results/`

### Console Logging

Tests include comprehensive logging:

```typescript
console.log('✅ Success indicator');
console.log('⚠️ Warning indicator');
console.log('📋 Information log');
console.log('🔍 Debug details');
```

### Browser DevTools

Debug in headed mode:

```bash
npm run test:e2e:desktop:debug
```

Then use Chrome DevTools:
- Performance tab
- Memory tab
- Network tab
- Console

---

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Push to `main`, `tdx26/main`, and `kyledev/e2eTests`
- Pull requests to `main` and `tdx26/main`
- Manual workflow dispatch

**Web Mode (Default):**
- Runs on: `ubuntu-latest`
- Browser: `chromium`
- Parallelized by test file in CI

**Desktop Mode (Manual):**
- Runs on: `ubuntu-latest`, `macos-latest`, `windows-latest`
- Browser: `chromium`
- Trigger: Workflow dispatch with `test_mode: desktop`

### Manual Trigger

Go to Actions → E2E Tests → Run workflow:
- Choose test mode: `web`, `desktop`, or `both`
- Click "Run workflow"

### CI Configuration

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, tdx26/main, kyledev/e2eTests]
  pull_request:
    branches: [main, tdx26/main]
  workflow_dispatch:
    inputs:
      test_mode:
        type: choice
        options: [web, desktop, both]
```

### Test Reports

- **HTML Report:** Artifacts → playwright-report
- **JUnit XML:** Artifacts → `test-results/<spec-file>/junit.xml`
- **JSON:** Artifacts → `test-results/<spec-file>/results.json`
- **Screenshots/Videos:** Artifacts → test-artifacts

### PR Comments

Test results automatically posted as PR comments with:
- Pass/fail summary
- Test counts
- Link to full report
- Artifacts link

---

## Best Practices

### Test Development

1. **Start Simple:**
   - Write one test at a time
   - Verify it passes
   - Add complexity gradually

2. **Use Page Objects:**
   - Encapsulate UI interactions
   - Keep tests readable
   - Make maintenance easier

3. **Test User Behavior:**
   - Test what users do
   - Don't test implementation
   - Focus on outcomes

4. **Make Tests Independent:**
   - No shared state
   - No test ordering dependencies
   - Can run in parallel

5. **Add Good Logging:**
   - Log test progress
   - Use emoji indicators
   - Log important values

### Performance

1. **Use Efficient Selectors:**
   - Data attributes best
   - CSS selectors good
   - XPath last resort

2. **Minimize Waits:**
   - Use smart waiting
   - Avoid hard-coded timeouts
   - Wait for specific conditions

3. **Run Tests in Parallel:**
   - Default for web mode
   - Use `--workers=N` flag
   - Faster CI/CD

4. **Profile Slow Tests:**
   - Use performance benchmarking
   - Check for unnecessary waits
   - Optimize page objects

### Maintenance

1. **Keep Tests DRY:**
   - Reuse page objects
   - Share test utilities
   - Extract common patterns

2. **Update Tests with Code:**
   - Update tests when UI changes
   - Keep fixtures current
   - Maintain page objects

3. **Monitor Flakiness:**
   - Fix flaky tests immediately
   - Add better waiting
   - Improve selectors

4. **Review Test Coverage:**
   - Ensure feature coverage
   - Remove redundant tests
   - Add missing scenarios

---

## Troubleshooting

### Tests Failing Locally

**Issue:** Tests pass in CI but fail locally

**Solution:**
```bash
# Ensure extension is built
npm run compile && npm run bundle

# Install/update browsers
npx playwright install --with-deps

# Clear test artifacts
rm -rf e2e-tests/test-results e2e-tests/playwright-report

# Run again
npm run test:e2e
```

### Browser Launch Fails

**Issue:** Browser won't launch

**Solution:**
```bash
# Install browsers with dependencies
npx playwright install --with-deps chromium webkit

# macOS: Grant accessibility permissions
# System Preferences → Security & Privacy → Privacy → Accessibility

# Linux: Install dependencies
sudo npx playwright install-deps
```

### Tests Timeout

**Issue:** Tests timeout

**Solution:**
```typescript
// Increase timeout for specific test
test('slow test', async ({ apexEditor }) => {
  test.setTimeout(120000); // 2 minutes

  await apexEditor.openFile('VeryLargeClass.cls');
});
```

### Flaky Tests

**Issue:** Tests pass/fail intermittently

**Solution:**
```typescript
// Replace hard-coded waits
await page.waitForTimeout(5000); // Bad

// With smart waiting
await outlineView.waitForSymbols(1, 10000); // Good
```

### Memory Issues

**Issue:** Tests crash with out of memory

**Solution:**
```bash
# Reduce parallel workers
npx playwright test --workers=1

# Run tests serially
npx playwright test --fully-parallel=false

# Increase Node.js memory
NODE_OPTIONS=--max-old-space-size=4096 npm run test:e2e
```

### Desktop Mode Not Working

**Issue:** Desktop-specific features don't work

**Solution:**
```bash
# Ensure TEST_MODE is set
TEST_MODE=desktop npm run test:e2e:desktop

# Or use npm script (sets automatically)
npm run test:e2e:desktop
```

---

## Additional Resources

### Documentation

- [README.md](README.md) - Test suite overview
- [DESKTOP-TESTING.md](DESKTOP-TESTING.md) - Desktop mode guide
- [PERFORMANCE-BASELINES.md](PERFORMANCE-BASELINES.md) - Performance testing
- [Test Data README](test-data/README.md) - Sample files guide

### Test Files

- [apex-extension-core.spec.ts](tests/apex-extension-core.spec.ts) - Core activation (8 tests)
- [apex-outline.spec.ts](tests/apex-outline.spec.ts) - Outline view (11 tests)
- [apex-hover.spec.ts](tests/apex-hover.spec.ts) - Hover (19 tests)
- [apex-goto-definition.spec.ts](tests/apex-goto-definition.spec.ts) - Go-to-def (25 tests)
- [apex-lsp-integration.spec.ts](tests/apex-lsp-integration.spec.ts) - LSP integration (16 tests)

### External Links

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [LSP Specification](https://microsoft.github.io/language-server-protocol/)

---

## Summary

**Test Suite Capabilities:**
- ✅ 79 comprehensive e2e tests
- ✅ 100% LSP feature coverage
- ✅ Web and desktop mode support
- ✅ Cross-browser testing
- ✅ Performance benchmarking
- ✅ Memory profiling
- ✅ CI/CD integration
- ✅ Comprehensive documentation

**Getting Help:**
- Check this guide first
- Review test examples
- Check [Troubleshooting](#troubleshooting)
- Review Playwright docs
- Ask team for help

Happy testing.
