# Desktop Testing Guide

Comprehensive guide for running e2e tests in Desktop mode with enhanced native OS integrations.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Desktop vs Web Mode](#desktop-vs-web-mode)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Running Desktop Tests](#running-desktop-tests)
- [Browser Options](#browser-options)
- [OS-Specific Testing](#os-specific-testing)
- [Debugging Desktop Tests](#debugging-desktop-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Performance Considerations](#performance-considerations)

---

## Overview

Desktop mode enables testing of the Apex Language Server extension with enhanced browser capabilities that simulate native desktop environments. This mode is ideal for:

- **Performance testing** with native memory management
- **OS-specific behavior** testing
- **High-resolution displays** (1920x1080 viewport)
- **Advanced browser features** (SharedArrayBuffer, precise memory info, GC)
- **Cross-browser compatibility** on desktop platforms

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

**Purpose:** Test with native desktop environment features

**Characteristics:**
- Large viewport: 1920x1080 (desktop resolution)
- Enhanced browser capabilities:
  - SharedArrayBuffer enabled
  - Precise memory info available
  - JavaScript GC exposure (`--js-flags=--expose-gc`)
- Native OS integrations
- Closer to actual VS Code Desktop experience
- More realistic performance metrics

**Use Cases:**
- Performance benchmarking
- Memory profiling
- OS-specific feature testing
- High-resolution display testing
- Advanced LSP features requiring more resources
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
npm run build -w packages/apex-lsp-vscode-extension
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

Desktop mode is configured via environment variables and Playwright projects.

### Environment Variables

```bash
# Enable desktop mode
TEST_MODE=desktop

# Enable debug mode (headed browser, slow motion)
DEBUG_MODE=1

# CI mode (headless, retries, parallel workers)
CI=1
```

### Playwright Projects

Desktop mode includes several pre-configured projects:

**Cross-Platform Projects:**
- `chromium-desktop` - Chromium with desktop features
- `firefox-desktop` - Firefox with desktop features
- `webkit-desktop` - WebKit (Safari) with desktop features

**OS-Specific Projects:**
- `chromium-macos` - Chromium on macOS only
- `chromium-windows` - Chromium on Windows only
- `chromium-linux` - Chromium on Linux only

### Browser Arguments

Desktop mode enables additional browser features:

```javascript
// Common desktop arguments
'--enable-features=SharedArrayBuffer'
'--enable-precise-memory-info'
'--js-flags=--expose-gc'

// Standard stability arguments
'--disable-web-security'
'--disable-features=VizDisplayCompositor'
'--enable-logging=stderr'
```

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

### Browser-Specific Commands

```bash
# Chromium (recommended - most stable)
npm run test:e2e:desktop:chromium

# Firefox
npm run test:e2e:desktop:firefox

# WebKit (Safari)
npm run test:e2e:desktop:webkit

# All browsers
npm run test:e2e:desktop:all-browsers
```

### Debug Mode

```bash
# Debug with Chromium (headed, slow motion)
npm run test:e2e:desktop:debug

# Debug with specific browser
DEBUG_MODE=1 TEST_MODE=desktop npx playwright test --project=firefox-desktop --headed

# Debug specific test file
npm run test:e2e:desktop:debug -- tests/apex-outline.spec.ts
```

### Advanced Commands

```bash
# Run specific test file
TEST_MODE=desktop npx playwright test tests/apex-hover.spec.ts

# Run tests matching pattern
TEST_MODE=desktop npx playwright test --grep "should navigate"

# Run tests in parallel (faster)
TEST_MODE=desktop npx playwright test --workers=4

# Run tests with trace
TEST_MODE=desktop npx playwright test --trace=on
```

---

## Browser Options

### Chromium Desktop (Recommended)

**Pros:**
- Most stable and reliable
- Best DevTools support
- Consistent cross-platform behavior
- Full feature support (SharedArrayBuffer, etc.)

**Cons:**
- Slightly higher memory usage

**Use When:**
- Default desktop testing
- Performance benchmarking
- Memory profiling
- Most development work

```bash
npm run test:e2e:desktop:chromium
```

### Firefox Desktop

**Pros:**
- Alternative rendering engine
- Good memory management
- Cross-browser verification

**Cons:**
- Some features may behave differently
- Slightly slower than Chromium in some tests

**Use When:**
- Cross-browser compatibility testing
- Verifying Firefox-specific behavior
- Testing rendering differences

```bash
npm run test:e2e:desktop:firefox
```

### WebKit Desktop (Safari)

**Pros:**
- Tests Safari-specific behavior
- Important for macOS users
- Different JavaScript engine

**Cons:**
- macOS only (typically)
- Some desktop features limited
- Slower test execution

**Use When:**
- Testing macOS/Safari compatibility
- Verifying WebKit-specific issues
- Comprehensive browser coverage

```bash
npm run test:e2e:desktop:webkit
```

---

## OS-Specific Testing

Desktop mode supports OS-specific test configurations that run only on matching platforms.

### macOS Testing

```bash
# Runs only on macOS (darwin)
TEST_MODE=desktop npx playwright test --project=chromium-macos

# Test WebKit (Safari) on macOS
npm run test:e2e:desktop:webkit
```

**macOS-Specific Features:**
- Native Safari/WebKit testing
- macOS-specific keybindings
- Retina display simulation (high DPI)

### Windows Testing

```bash
# Runs only on Windows (win32)
TEST_MODE=desktop npx playwright test --project=chromium-windows
```

**Windows-Specific Features:**
- Windows-specific file paths
- Native Windows behaviors
- Windows keybindings

### Linux Testing

```bash
# Runs only on Linux
TEST_MODE=desktop npx playwright test --project=chromium-linux
```

**Linux-Specific Features:**
- Linux-specific sandbox settings
- X11/Wayland display handling
- Linux file system behaviors

### Cross-Platform Testing

```bash
# Run on all platforms automatically
npm run test:e2e:desktop:all-browsers

# The configuration automatically detects your OS and runs appropriate tests
```

---

## Debugging Desktop Tests

### Visual Debugging

```bash
# Open Playwright Inspector (step through tests)
npm run test:e2e:desktop:debug

# Run with headed browser (see what's happening)
DEBUG_MODE=1 TEST_MODE=desktop npx playwright test --headed
```

### Trace Viewer

```bash
# Record trace for debugging
TEST_MODE=desktop npx playwright test --trace=on

# View trace
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Desktop tests automatically capture:
- **Screenshots:** On failure (CI: all tests)
- **Videos:** On failure (CI: all tests)
- **Traces:** On first retry

```bash
# Force screenshot capture
TEST_MODE=desktop npx playwright test --screenshot=on

# Force video capture
TEST_MODE=desktop npx playwright test --video=on
```

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

### 4. Use OS-Specific Projects Carefully

OS-specific projects (`chromium-macos`, etc.) only run on matching OS:
```bash
# This only runs on macOS
TEST_MODE=desktop npx playwright test --project=chromium-macos
```

Use generic desktop projects for cross-platform tests.

### 5. Leverage Desktop Features

Desktop mode enables advanced features:

```typescript
// Example: Use exposed GC in tests
await page.evaluate(() => {
  if (typeof gc === 'function') {
    gc(); // Only available in desktop mode
  }
});

// Example: Check precise memory info
const memory = await page.evaluate(() => {
  return (performance as any).memory;
});
```

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

**Solution:** Ensure `TEST_MODE` environment variable is set:
```bash
TEST_MODE=desktop npm run test:e2e:desktop
```

Or use the pre-configured npm scripts:
```bash
npm run test:e2e:desktop
```

### Issue: Tests fail only in desktop mode

**Possible causes:**
1. **Viewport size differences** - Desktop uses 1920x1080
2. **Timing differences** - Desktop may be faster/slower
3. **Feature availability** - Desktop enables features not in web mode

**Solution:** Adjust test selectors or timeouts for desktop viewport.

### Issue: Browser won't launch in desktop mode

**Solution:** Check browser installation:
```bash
# Install Playwright browsers
npx playwright install chromium firefox webkit

# Install with dependencies
npx playwright install --with-deps
```

### Issue: OS-specific tests not running

**Solution:** OS-specific projects only run on matching platform:
```bash
# chromium-macos only runs on macOS
# chromium-windows only runs on Windows
# chromium-linux only runs on Linux
```

Use generic `chromium-desktop` for cross-platform tests.

### Issue: Tests are slow in desktop mode

**Possible causes:**
1. Larger viewport requires more rendering
2. Enhanced features add overhead
3. Debug mode enabled (slow motion)

**Solutions:**
```bash
# Disable debug mode
TEST_MODE=desktop npx playwright test

# Increase parallelization
TEST_MODE=desktop npx playwright test --workers=4

# Run specific tests instead of full suite
TEST_MODE=desktop npx playwright test tests/apex-hover.spec.ts
```

### Issue: Memory issues in desktop mode

**Solution:** Desktop mode enables precise memory tracking. If tests are hitting memory limits:

```bash
# Reduce parallel workers
TEST_MODE=desktop npx playwright test --workers=1

# Run tests serially
TEST_MODE=desktop npx playwright test --fully-parallel=false
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
TEST_MODE=desktop npx playwright test --workers=4

# Single worker for memory-intensive tests
TEST_MODE=desktop npx playwright test --workers=1
```

**2. Run Specific Tests:**
```bash
# Don't run full suite if not needed
TEST_MODE=desktop npx playwright test tests/apex-hover.spec.ts
```

**3. Disable Unnecessary Features:**
```bash
# Disable video/screenshots for faster execution
TEST_MODE=desktop npx playwright test --video=off --screenshot=off
```

**4. Use Shared Browsers:**
```bash
# Reuse existing browser instances
TEST_MODE=desktop npx playwright test --reuse-browser
```

---

## Summary

**Desktop mode provides:**
- ✅ Enhanced browser features (SharedArrayBuffer, GC, memory info)
- ✅ Native desktop resolution (1920x1080)
- ✅ Better performance profiling
- ✅ OS-specific testing capabilities
- ✅ Realistic desktop environment simulation

**When to use desktop mode:**
- Performance benchmarking
- Memory profiling
- Complex LSP operations
- OS-specific testing
- Desktop bug reproduction

**When to use web mode:**
- Quick feature verification
- CI/CD pipelines
- Simple smoke tests
- Browser-specific web testing

For most development and testing, **web mode (default)** is sufficient. Use **desktop mode** when you need enhanced features, performance profiling, or OS-specific testing.

---

## Additional Resources

- [Main README](README.md) - Complete e2e testing guide
- [Playwright Configuration](playwright.config.ts) - Desktop mode configuration
- [TESTING-GUIDE.md](TESTING-GUIDE.md) - Comprehensive testing guide
- [PHASE4-SUMMARY.md](PHASE4-SUMMARY.md) - Phase 4 enhancements summary
- [Playwright Docs](https://playwright.dev/docs/intro) - Official documentation
