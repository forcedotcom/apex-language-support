# Desktop Testing Guide

Comprehensive guide for running e2e tests in Desktop mode using actual VS Code Electron.

---

## Table of Contents

- [Overview](#overview)
- [Desktop vs Web Mode](#desktop-vs-web-mode)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Running Desktop Tests](#running-desktop-tests)
- [Debugging Desktop Tests](#debugging-desktop-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Performance Considerations](#performance-considerations)

---

## Overview

Desktop mode launches **actual VS Code Desktop (Electron)** with the Apex extension loaded, using `@vscode/test-electron`. This mode is ideal for:

- **Performance testing** with native memory management
- **OS-specific behavior** testing
- **High-resolution displays** (1920x1080 viewport)
- **Real VS Code Desktop** experience (not browser simulation)
- **Video recording** with test-name renaming for debugging

---

## Desktop vs Web Mode

### Web Mode (Default)

**Purpose:** Test browser-based VS Code Web environment

**Characteristics:**
- Standard web browser viewport (default sizes)
- Standard web APIs and restrictions
- Browser security model (CORS, CSP, etc.)
- Optimized for cloud/browser deployment
- Faster test execution
- Web worker limitations

**Use Cases:**
- Standard LSP feature testing (outline, hover, go-to-def)
- Quick smoke tests
- CI/CD pipeline tests
- Browser compatibility (web-specific)

**Command:**
```bash
npm run test:e2e
npm run test:e2e:web:chromium
```

### Desktop Mode

**Purpose:** Test with actual VS Code Desktop (Electron)

**Characteristics:**
- Launches real VS Code via `@vscode/test-electron`
- Uses `createDesktopTest` fixture for Electron launch
- Large viewport: 1920x1080
- Video recording with test-name renaming
- Clipboard permissions granted
- DEBUG_MODE pauses on failure (keeps VS Code window open)

**Use Cases:**
- Performance benchmarking
- Memory profiling (desktop-only)
- OS-specific feature testing
- Desktop-specific bug reproduction

**Command:**
```bash
npm run test:e2e:desktop
npm run test:e2e:desktop:chromium
```

---

## Quick Start

### 1. Build Extension

```bash
# From repository root
npm run compile
npm run bundle
```

### 2. Run Desktop Tests

```bash
# Run with default browser (Chromium)
npm run test:e2e:desktop

# Debug mode with visible browser
npm run test:e2e:desktop:debug
```

---

## Configuration

Desktop mode uses `playwright.config.desktop.ts` and the `createDesktopTest` fixture.

### Environment Variables

```bash
# Enable debug mode (pauses on failure, keeps VS Code open)
DEBUG_MODE=1

# CI mode (retries, sequential retry on failure)
CI=1

# Sequential execution (used for --last-failed retry)
E2E_SEQUENTIAL=1

# Disable retries (used for try-run in CI)
E2E_NO_RETRIES=1
```

### Playwright Config

- **Config file:** `playwright.config.desktop.ts`
- **Project:** `desktop-electron`
- **Global setup:** `downloadVSCode.ts` (downloads VS Code before tests)

---

## Running Desktop Tests

### Basic Commands

```bash
# Run all desktop tests (Chromium)
npm run test:e2e:desktop

# From repository root
npm run test:e2e:desktop

# From e2e-tests directory
npm run test:e2e:desktop
```

### Run Commands

```bash
# Run desktop tests (uses VS Code Electron)
npm run test:e2e:desktop
npm run test:e2e:desktop:chromium   # Same as above
npm run test:e2e:desktop:webkit     # Same config, different script name
npm run test:e2e:desktop:all-browsers
```

All desktop scripts use the same `playwright.config.desktop.ts` and `desktop-electron` project.

### Debug Mode

```bash
# Debug with VS Code window visible (pauses on failure)
npm run test:e2e:desktop:debug

# Debug specific test file
npm run test:e2e:desktop:debug -- tests/apex-outline.spec.ts
```

### Advanced Commands

```bash
# Run specific test file
npx playwright test tests/apex-hover.spec.ts --config=playwright.config.desktop.ts

# Run tests matching pattern
npx playwright test --config=playwright.config.desktop.ts --grep "should navigate"

# Run with explicit project
npx playwright test --config=playwright.config.desktop.ts --project=desktop-electron
```

---

## Debugging Desktop Tests

### Visual Debugging

```bash
# Open Playwright Inspector (step through tests)
npm run test:e2e:desktop:debug

# DEBUG_MODE pauses on failure and keeps VS Code window open for inspection
```

### Trace Viewer

```bash
# Record trace for debugging
npx playwright test --config=playwright.config.desktop.ts --trace=on

# View trace
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Desktop tests (via `createDesktopTest` fixture) automatically capture:
- **Screenshots:** On failure (CI: all tests)
- **Videos:** Renamed with test name for easy identification (e.g., `MyTestName.webm`)
- **Traces:** On first retry

### Console Logging

Desktop tests include comprehensive logging:

```typescript
// Tests automatically log progress
console.log('✅ Test step completed');
console.log('⚠️ Warning message');
console.log('📋 Information');
```

---

## Best Practices

### 1. Use Desktop Mode When Appropriate

**DO use desktop mode for:**
- ✅ Performance benchmarking
- ✅ Memory profiling
- ✅ Large file handling tests
- ✅ Complex LSP operations
- ✅ OS-specific bug reproduction

**DON'T use desktop mode for:**
- ❌ Quick smoke tests (use web mode)
- ❌ Simple feature verification (use web mode)
- ❌ CI pipelines (unless specifically needed)

### 2. Start with Chromium

Always start desktop testing with Chromium:
```bash
npm run test:e2e:desktop:chromium
```

Then expand to other browsers if needed.

### 3. Debug Mode for Development

Use debug mode during test development:
```bash
npm run test:e2e:desktop:debug
```

This enables:
- Headed browser (visible)
- Slow motion (300ms delay)
- Better error visibility

### 4. Use createDesktopTest for Desktop Tests

Desktop tests require the `createDesktopTest` fixture which launches VS Code Electron. Tests using this fixture must import from `../fixtures/createDesktopTest` rather than the web `apexFixtures`.

### 5. Leverage Desktop Features

Desktop mode (VS Code Electron) enables:
- Clipboard permissions (granted automatically)
- Video recording with test-name renaming
- DEBUG_MODE pause on failure

### 6. Profile Performance

Desktop mode is ideal for performance testing:

```typescript
test('should perform within time limit', async ({ apexEditor }) => {
  const startTime = Date.now();

  await apexEditor.triggerCompletion();

  const elapsedTime = Date.now() - startTime;
  expect(elapsedTime).toBeLessThan(1000); // Should complete in < 1s

  console.log(`✅ Completion took ${elapsedTime}ms`);
});
```

---

## Troubleshooting

### Issue: Desktop tests not running

**Solution:** Use the npm scripts (they set `VSCODE_DESKTOP` automatically):
```bash
npm run test:e2e:desktop
```

Ensure extension is built first:
```bash
npm run compile && npm run bundle
```

### Issue: VS Code download fails

**Solution:** Desktop mode downloads VS Code on first run via `downloadVSCode.ts`. Check network and disk space. Cache is at repo root `.vscode-test/`.

### Issue: Tests fail only in desktop mode

**Possible causes:**
1. **Different environment** - Desktop uses actual VS Code, not browser
2. **Timing differences** - Electron may have different timing
3. **Fixture mismatch** - Current test specs use web fixtures; desktop tests need `createDesktopTest`

**Solution:** Desktop-specific tests must use the `createDesktopTest` fixture.

### Issue: Tests are slow in desktop mode

**Possible causes:**
1. VS Code launch overhead
2. Video recording
3. DEBUG_MODE enabled

**Solutions:**
```bash
# Run specific tests
npx playwright test tests/apex-hover.spec.ts --config=playwright.config.desktop.ts

# Reduce workers for memory-intensive tests
npx playwright test --config=playwright.config.desktop.ts --workers=1
```

### Issue: Memory issues in desktop mode

**Solution:**
```bash
# Reduce parallel workers
npx playwright test --config=playwright.config.desktop.ts --workers=1

# Run tests serially
E2E_SEQUENTIAL=1 npx playwright test --config=playwright.config.desktop.ts
```

---

## Performance Considerations

### Desktop vs Web Performance

| Metric | Web Mode | Desktop Mode |
|--------|----------|--------------|
| **Startup Time** | Faster | Slightly slower |
| **Test Execution** | Fast | Moderate |
| **Memory Usage** | Lower | Higher |
| **Feature Set** | Standard | Enhanced |
| **Best For** | Quick tests | Performance tests |

### Optimization Tips

**1. Use Workers Wisely:**
```bash
# Fast parallel execution
npx playwright test --config=playwright.config.desktop.ts --workers=4

# Single worker for memory-intensive tests
npx playwright test --config=playwright.config.desktop.ts --workers=1
```

**2. Run Specific Tests:**
```bash
# Don't run full suite if not needed
npx playwright test tests/apex-hover.spec.ts --config=playwright.config.desktop.ts
```

**3. Disable Unnecessary Features:**
```bash
# Disable video/screenshots for faster execution
npx playwright test --config=playwright.config.desktop.ts --video=off --screenshot=off
```

---

## Summary

**Desktop mode provides:**
- ✅ Actual VS Code Desktop (Electron) via `@vscode/test-electron`
- ✅ `createDesktopTest` fixture with video renaming, clipboard permissions
- ✅ Native desktop resolution (1920x1080)
- ✅ DEBUG_MODE pause on failure
- ✅ Real VS Code Desktop experience

**When to use desktop mode:**
- Performance benchmarking
- Memory profiling
- Desktop-specific bug reproduction

**When to use web mode:**
- Quick feature verification
- CI/CD pipelines (default)
- Simple smoke tests

For most development and testing, **web mode (default)** is sufficient. Use **desktop mode** when you need actual VS Code Desktop or performance profiling.

---

## Additional Resources

- [Main README](README.md) - Complete e2e testing guide
- [playwright.config.desktop.ts](playwright.config.desktop.ts) - Desktop configuration
- [createDesktopTest.ts](fixtures/createDesktopTest.ts) - Desktop fixture factory
- [TESTING-GUIDE.md](TESTING-GUIDE.md) - Comprehensive testing guide
- [Playwright Docs](https://playwright.dev/docs/intro) - Official documentation
