# E2E Tests for Apex Language Server Extension

This package provides comprehensive end-to-end testing for the Apex Language Server Extension in VS Code Web environments. The test suite validates that the extension correctly integrates with VS Code's language server protocol and provides essential Apex language features.

## Test Suite Overview

**Total Tests:** 79 comprehensive e2e tests
**Test Files:** 5 feature-specific test suites
**Code Coverage:** Complete LSP feature coverage
**Architecture:** Page Objects + Fixtures + Utilities

### Test Coverage Summary

| Feature | Tests | Coverage |
|---------|-------|----------|
| Extension Activation & LCS Integration | 8 | ✅ 100% |
| Outline View (Document Symbols) | 11 | ✅ 100% |
| Hover Functionality | 19 | ✅ 100% |
| Go-to-Definition Navigation | 25 | ✅ 100% |
| LSP Integration & Stability | 16 | ✅ 100% |

---

## Purpose

The e2e test suite ensures the Apex Language Server Extension works correctly in real-world browser environments by testing:

### Core Functionality
- ✅ **Extension Activation** - Extension activates when Apex files are opened
- ✅ **LCS Integration** - LSP-Compliant-Services are properly integrated
- ✅ **Language Server** - LSP worker starts and initializes correctly
- ✅ **Worker Bundle** - Bundle size validates LCS inclusion

### LSP Features
- ✅ **Document Symbols** - Outline view shows Apex class structure
- ✅ **Hover Provider** - Hover displays type information and signatures
- ✅ **Go-to-Definition** - Navigate to symbol definitions
- ✅ **Error Recovery** - LSP handles errors gracefully
- ✅ **Performance** - Operations complete within acceptable timeframes

### Stability
- ✅ **No Crashes** - Extension doesn't cause VS Code failures
- ✅ **Error Monitoring** - All console/network errors are categorized
- ✅ **Extended Usage** - Maintains stability over time

---

## Directory Structure

```
e2e-tests/
├── tests/                          # Test files
│   ├── apex-extension-core.spec.ts      # Core activation (8 tests)
│   ├── apex-outline.spec.ts             # Outline view (11 tests)
│   ├── apex-hover.spec.ts               # Hover (19 tests)
│   ├── apex-goto-definition.spec.ts     # Go-to-def (25 tests)
│   └── apex-lsp-integration.spec.ts     # LSP integration (16 tests)
├── pages/                          # Page object models (Apex-specific)
│   ├── BasePage.ts                      # Common VS Code interactions
│   ├── ApexEditorPage.ts                # Editor operations
│   ├── OutlineViewPage.ts               # Outline view operations
│   └── HoverPage.ts                     # Hover operations
├── fixtures/                       # Playwright fixtures
│   ├── apexFixtures.ts                  # Main Apex fixtures (web)
│   ├── workspaceFixtures.ts             # Workspace setup fixtures
│   ├── createDesktopTest.ts             # Desktop Electron fixture factory
│   ├── desktopFixtureTypes.ts           # Desktop fixture types
│   └── desktopWorkspace.ts              # Desktop workspace setup
├── shared/                         # Shared utilities (monorepo parity)
│   ├── config/
│   │   ├── createWebConfig.ts           # Web config factory
│   │   ├── createDesktopConfig.ts       # Desktop config factory
│   │   └── downloadVSCode.ts            # VS Code download (global setup)
│   ├── pages/
│   │   ├── commands.ts                  # Command palette
│   │   ├── settings.ts                  # Settings UI
│   │   ├── contextMenu.ts               # Editor/explorer context menus
│   │   └── outputChannel.ts             # Output panel operations
│   ├── utils/
│   │   ├── locators.ts                  # CSS selectors
│   │   ├── helpers.ts                   # Shared helpers
│   │   ├── fileHelpers.ts               # File operations
│   │   └── repoRoot.ts                  # Repo root resolution
│   └── screenshotUtils.ts               # Screenshot utilities
├── utils/                          # E2E-specific utilities
│   ├── constants.ts                     # Selectors and test data
│   ├── error-handling.ts                # Error monitoring
│   ├── lsp-testing.ts                   # LSP test utilities
│   ├── outline-helpers.ts               # Outline utilities
│   ├── vscode-interaction.ts            # VS Code interactions
│   ├── worker-detection.ts              # LCS detection
│   ├── test-orchestration.ts            # High-level setup
│   ├── test-reporting.ts                # Result reporting
│   └── setup.ts                         # Workspace setup
├── test-data/                      # Sample Apex files
│   └── apex-samples/
│       ├── ComplexClass.cls              # Complex nested structures
│       ├── AccountHandler.cls            # Derived handler class (extends BaseHandler)
│       ├── BaseHandler.cls               # Base abstract handler class
│       ├── AccountProcessor.cls          # AccountProcessor implements DataProcessor
│       ├── DataProcessor.cls             # DataProcessor interface
│       └── ContactProcessor.cls         # ContactProcessor implements DataProcessor
├── playwright.config.ts            # Default config (re-exports web)
├── playwright.config.web.ts        # Web-only configuration
├── playwright.config.desktop.ts    # Desktop (Electron) configuration
├── test-server.js                  # VS Code Web test server
└── README.md                       # This file
```

---

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Extension must be built before running tests

### Build Extension

```bash
# From repository root
npm run compile
npm run bundle
```

### Run Tests

#### Web Mode (Default)

Uses `playwright.config.web.ts` and VS Code Web via `@vscode/test-web`:

```bash
# Run all web tests (recommended)
npm run test:e2e

# Run web tests with Chromium
npm run test:e2e:web:chromium

# Debug mode with browser UI visible
npm run test:e2e:debug

# Visual mode for test development
npm run test:e2e:visual

# Run specific test file
npx playwright test tests/apex-outline.spec.ts --config=playwright.config.web.ts

# Run tests in headed mode
npx playwright test --config=playwright.config.web.ts --headed

# Run with specific project
npx playwright test --config=playwright.config.web.ts --project=chromium-web
```

#### Desktop Mode

Uses `playwright.config.desktop.ts` and VS Code Electron via `@vscode/test-electron`. Launches actual VS Code Desktop with the extension loaded:

```bash
# Run desktop tests (recommended)
npm run test:e2e:desktop

# Debug desktop tests with VS Code window visible (pauses on failure)
npm run test:e2e:desktop:debug

# Run desktop tests
npm run test:e2e:desktop:chromium
npm run test:e2e:desktop:webkit
npm run test:e2e:desktop:all-browsers

# Run with explicit config
npx playwright test --config=playwright.config.desktop.ts --project=desktop-electron
```

**Desktop vs Web:**
- **Web Mode**: Tests browser-based VS Code Web with standard web APIs
- **Desktop Mode**: Tests actual VS Code Desktop (Electron) with the extension loaded; uses `createDesktopTest` fixture for Electron launch, video recording, and clipboard permissions

---

## Test Files

### 1. [apex-extension-core.spec.ts](tests/apex-extension-core.spec.ts)
**Focus:** Core extension activation and LCS integration

**Tests (8):**
- Extension startup and activation
- LCS (LSP-Compliant-Services) integration validation
- Worker bundle validation
- Extension stability
- Console/network error validation
- Editor responsiveness
- Language server initialization
- Workbench loading

**Key Validations:**
- `lcsIntegrationActive === true`
- `bundleSize` meets LCS threshold
- No critical errors in console
- Editor is responsive

### 2. [apex-outline.spec.ts](tests/apex-outline.spec.ts)
**Focus:** Outline view symbol parsing and display

**Tests (11):**
- Outline population with LCS type parsing
- Main class detection
- Inner class detection
- Inner enum detection
- Multiple symbol display
- Symbol type identification
- Navigation to symbols
- Outline refresh
- Complex class structures

**Key Features:**
- Uses `OutlineViewPage` page object
- Tests nested type parsing (inner classes, enums)
- Validates symbol hierarchy
- Screenshot capture for debugging

### 3. [apex-hover.spec.ts](tests/apex-hover.spec.ts)
**Focus:** Hover functionality for Apex symbols

**Tests (19):**
- Hover on classes, methods, variables
- Static vs instance members
- Inner types (classes, enums)
- Generic types (List, Map)
- Constructors and parameters
- Type information display
- Method signatures
- Hover responsiveness
- Multiple sequential hovers
- Screenshot capture

**Key Features:**
- Uses `HoverPage` page object
- Tests all symbol types
- Validates hover content
- Performance testing (< 2s)

### 4. [apex-goto-definition.spec.ts](tests/apex-goto-definition.spec.ts)
**Focus:** Navigate to symbol definitions

**Tests (25):**
- Navigate to classes, methods, fields
- Inner class/enum navigation
- Constructor navigation
- Local variables and parameters
- Static vs instance members
- Inheritance navigation (base/derived classes)
- Interface navigation (interface to implementation)
- Edge cases (not found, errors)
- Performance testing
- Complex class structures

**Key Features:**
- Uses `ApexEditorPage` page object
- Tests all definition types
- Advanced scenarios with test data files
- Cross-file navigation (inheritance, interfaces)

### 5. [apex-lsp-integration.spec.ts](tests/apex-lsp-integration.spec.ts)
**Focus:** General LSP lifecycle and stability

**Tests (16):**
- LSP initialization
- File edit handling
- Rapid operations
- Syntax error recovery
- Large file handling
- Performance benchmarking
- Completion requests
- Signature help
- Undo/redo operations
- Extended stability
- Worker thread validation

**Key Features:**
- Tests LSP lifecycle
- Error recovery validation
- Performance metrics
- Stability over time

---

## Architecture

### Page Objects

Page objects encapsulate UI interactions and provide clean APIs for tests.

**Benefits:**
- Hide implementation details
- Reusable across tests
- Easy to maintain
- Type-safe

**Available Page Objects:**
- `BasePage` - Common VS Code interactions
- `ApexEditorPage` - Editor operations
- `OutlineViewPage` - Outline view operations
- `HoverPage` - Hover functionality

**Shared Page Utilities** (in `shared/pages/`):
- `commands.ts` - Command palette (`executeCommandWithCommandPalette`, `verifyCommandExists`, `verifyCommandDoesNotExist`)
- `contextMenu.ts` - Editor/explorer context menus (`executeEditorContextMenuCommand`, `executeExplorerContextMenuCommand`)
- `outputChannel.ts` - Output panel (`ensureOutputPanelOpen`, `selectOutputChannel`, `clearOutputChannel`, `waitForOutputChannelText`)

**Example:**
```typescript
import { test, expect } from '../fixtures/apexFixtures';

test('example', async ({ apexEditor, outlineView }) => {
  await apexEditor.openFile('MyClass.cls');
  await outlineView.open();
  const symbols = await outlineView.getSymbols();
  expect(symbols.length).toBeGreaterThan(0);
});
```

### Fixtures

Fixtures provide automatic setup and teardown for tests.

**Benefits:**
- Automatic environment setup
- Dependency injection
- Clean test code
- Reusable patterns

**Available Fixtures:**
- `apexEditor` - ApexEditorPage instance
- `outlineView` - OutlineViewPage instance
- `hoverHelper` - HoverPage instance
- `apexTestEnvironment` - Complete test environment
- `consoleErrors` - Captured console errors
- `networkErrors` - Captured network errors

**Desktop Fixtures** (for Electron tests):
- `createDesktopTest()` - Factory that provides `page`, `workspaceDir`, `electronApp`; supports video renaming, clipboard permissions, DEBUG_MODE pause

**Example:**
```typescript
test('example', async ({
  apexEditor,      // Fixture provides page object
  consoleErrors,   // Fixture captures errors
}) => {
  // Test environment already set up!
  await apexEditor.openFile('MyClass.cls');
  // Assertions on consoleErrors
});
```

### Utilities

Utility functions for common operations.

**Key Utilities:**
- Error handling and validation
- LSP testing helpers
- Outline view helpers
- Worker detection (LCS integration)
- Test reporting and configuration

**Example:**
```typescript
import { performStrictValidation } from '../utils/test-helpers';

const validation = performStrictValidation(consoleErrors, networkErrors);
expect(validation.consoleValidation.allErrorsAllowed).toBe(true);
```

---

## Test Development

### Writing a New Test

1. **Choose the appropriate test file** based on feature
2. **Import from fixtures** (not `@playwright/test`)
3. **Use page objects** for interactions
4. **Use test.step()** for structured reporting
5. **Add descriptive assertions**

**Example:**
```typescript
import { test, expect } from '../fixtures/apexFixtures';

test('should do something', async ({ apexEditor, outlineView }) => {
  await test.step('Open Apex file', async () => {
    await apexEditor.openFile('MyClass.cls');
    await apexEditor.waitForLanguageServerReady();
  });

  await test.step('Verify outline', async () => {
    await outlineView.open();
    const symbols = await outlineView.getSymbols();
    expect(symbols.length).toBeGreaterThan(0);
  });

  console.log('✅ Test passed');
});
```

### Best Practices

**DO:**
- ✅ Use page objects for all UI interactions
- ✅ Use fixtures for setup/teardown
- ✅ Use `test.step()` for clear reporting
- ✅ Add descriptive console logs
- ✅ Write focused, single-purpose tests
- ✅ Use descriptive test names ("should...")

**DON'T:**
- ❌ Use `page.locator()` directly in tests
- ❌ Import from `@playwright/test`
- ❌ Put assertions in page objects
- ❌ Create test dependencies
- ❌ Use hard-coded waits

### Adding Test Data

1. Create Apex file in `test-data/apex-samples/`
2. Document purpose in `test-data/README.md`
3. Reference in tests by filename

**Example:**
```typescript
test('complex test', async ({ apexEditor }) => {
  await apexEditor.openFile('my-test-file.cls');
  // Test with custom file
});
```

---

## Debugging

### Debug Mode

Run tests with browser UI visible:
```bash
npm run test:e2e:debug
```

### Visual Mode

Interactive test development:
```bash
npm run test:e2e:visual
```

### Screenshots

Tests automatically capture screenshots on failure.
Location: `e2e-tests/test-results/screenshots/`

### Traces

Playwright captures execution traces.
View with: `npx playwright show-trace trace.zip`

### Console Logs

Tests include comprehensive logging:
- ✅ Success indicators
- ⚠️ Warning indicators
- 📋 Information logs
- 🔍 Debug details

---

## CI/CD Integration

Tests run automatically in GitHub Actions on:
- Push to `main`, `tdx26/main`
- Pull requests to `main` and `tdx26/main`
- Manual workflow dispatch

**Configuration:** `.github/workflows/e2e-tests.yml`

**Features:**
- Retry logic (2 retries in CI)
- Sequential retry with `--last-failed` when parallel run fails
- `E2E_SEQUENTIAL` and `E2E_NO_RETRIES` env vars for workflow control
- Headless execution
- Web tests sharded by spec file on Chromium
- Artifact collection (screenshots, traces, reports)
- JUnit XML and JSON reporting
- PR comment with test summary
- 30-day artifact retention

---

## Test Reports

### HTML Report

After test run:
```bash
npx playwright show-report
```

View comprehensive HTML report with:
- Test results
- Screenshots
- Traces
- Step-by-step execution

### Console Output

Tests provide real-time console output with:
- Test progress
- Step-by-step execution
- Pass/fail indicators
- Performance metrics

---

## Configuration

### Playwright Configs

- [`playwright.config.web.ts`](playwright.config.web.ts) - Web mode (VS Code Web)
- [`playwright.config.desktop.ts`](playwright.config.desktop.ts) - Desktop mode (VS Code Electron)
- [`playwright.config.ts`](playwright.config.ts) - Default (re-exports web config)

### Environment Variables

- `CI` - Enables CI-specific behavior (retries, headless, single worker)
- `DEBUG_MODE` - Enables debug mode (slow motion, headed, pause on failure)
- `VSCODE_DESKTOP` - Set when running desktop (Electron) tests
- `E2E_SEQUENTIAL` - Run tests sequentially (used for `--last-failed` retry step)
- `E2E_NO_RETRIES` - Disable Playwright retries (used for try-run in CI)

---

## Documentation

- [Test Data README](test-data/README.md) - Sample files guide
- [TESTING-GUIDE.md](TESTING-GUIDE.md) - Comprehensive testing guide
- [DESKTOP-TESTING.md](DESKTOP-TESTING.md) - Desktop mode details
- [PERFORMANCE-BASELINES.md](PERFORMANCE-BASELINES.md) - Performance baseline guide

---

## Test Philosophy

These tests focus on critical user-facing functionality rather than internal implementation details. They simulate real user interactions with the extension in a browser environment, providing confidence that the extension behaves correctly.

### Priorities

1. **Reliability** - Tests are stable across environments
2. **Performance** - Fast execution with parallel runs
3. **Maintainability** - Clean abstractions and patterns
4. **Comprehensive Coverage** - All LSP features validated

### Coverage Strategy

- ✅ **Happy paths** - Core functionality works
- ✅ **Edge cases** - Handle errors gracefully
- ✅ **Performance** - Operations complete quickly
- ✅ **Stability** - No crashes or memory leaks

---

## Contributing

When adding new tests:

1. **Use existing patterns** - Follow page object + fixture patterns
2. **Focus on user value** - Test user-facing functionality
3. **Ensure reliability** - Tests should be stable
4. **Include logging** - Add descriptive console logs
5. **Document changes** - Update README if needed

The test suite is designed to grow with the extension while maintaining reliability and performance.

---

## Test Statistics

### Growth Over Time

| Metric | Original | Phase 2 | Phase 3 |
|--------|----------|---------|---------|
| Test Files | 1 | 3 | 5 |
| Total Tests | 3 | 38 | 79 |
| Lines of Code | 259 | 789 | 1,750 |
| Coverage | ~30% | ~70% | 100% |

### Current Status

- **79 comprehensive e2e tests**
- **5 feature-specific test files**
- **4 Apex page object models** + shared utilities (commands, contextMenu, outputChannel)
- **5 fixture files** (apexFixtures, workspaceFixtures, createDesktopTest, desktopFixtureTypes, desktopWorkspace)
- **3 sample Apex files**
- **100% LSP feature coverage**

---

## Success Criteria

All tests passing indicates:
- ✅ Extension activates correctly
- ✅ LCS is properly integrated
- ✅ Outline view shows Apex symbols
- ✅ Hover provides type information
- ✅ Go-to-definition navigates correctly
- ✅ LSP maintains stability
- ✅ No critical errors occur
- ✅ Performance is acceptable

**Result:** The e2e suite reports strong coverage and stability for core Apex LSP behaviors.
