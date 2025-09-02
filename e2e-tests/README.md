# E2E Tests for Apex Language Server Extension

This directory contains end-to-end tests for the Apex Language Server VSCode extension running in a web environment. The tests use Playwright to automate browser interactions with VSCode Web and verify that the extension works correctly.

## 📁 Project Structure

```
e2e-tests/
├── config/                     # Configuration files
│   ├── playwright.config.ts    # Main Playwright configuration
│   ├── environments.ts         # Environment-specific settings
│   ├── global-setup.ts         # Global test setup
│   └── global-teardown.ts      # Global test cleanup
├── fixtures/                   # Test data and sample files
│   └── apex-samples.ts         # Sample Apex files for testing
├── types/                      # TypeScript type definitions
│   └── test.types.ts          # Test-related interfaces
├── utils/                      # Utility functions and helpers
│   ├── constants.ts           # Test constants and selectors
│   ├── test-helpers.ts        # Core test helper functions
│   ├── outline-helpers.ts     # Outline view specific helpers
│   └── index.ts              # Centralized exports
├── tests/                     # Test files
│   ├── apex-extension-core.spec.ts  # Core functionality test
│   └── archived/              # Archived comprehensive tests
├── test-server.js            # VS Code Web test server
├── tsconfig.json             # TypeScript configuration
├── playwright.config.ts      # Configuration re-export (compatibility)
└── README.md                 # This file
```

## Overview

The e2e test suite verifies core extension functionality in VS Code Web:
- **VS Code Web startup** - Verifies the web environment loads correctly
- **Extension activation** - Confirms the extension activates when opening Apex files
- **LSP worker loading** - Ensures the language server starts without critical errors
- **File recognition** - Validates Apex files are detected in the workspace
- **Outline view** - Tests symbol parsing and outline generation
- **Stability** - Checks that VS Code remains responsive after extension activation

## Prerequisites

1. Node.js >= 20.0.0
2. npm packages installed (`npm install` from root)
3. Extension built (`npm run compile && npm run bundle` in `packages/apex-lsp-vscode-extension`)

## Running Tests

### Quick Start
```bash
# Run core e2e test (recommended - headless, parallel, fast)
npm run test:e2e

# Run all archived tests (comprehensive but may have browser compatibility issues)
npm run test:e2e:all

# Run tests with browser visible (headed, parallel)
npm run test:e2e:headed

# Run tests in visual debugging mode (headed, sequential, with hover effects)
npm run test:e2e:visual

# Open Playwright UI for interactive testing
npm run test:e2e:ui

# Run tests in debug mode with Playwright inspector
npm run test:e2e:debug
```

### Current Test Status

✅ **Core Tests (`apex-extension-core.spec.ts`):**

**Test 1: Core Extension Functionality**
- VS Code Web startup and loading
- Apex file recognition in workspace (2+ files)
- Extension activation when opening .cls files
- Monaco editor integration
- Language server worker initialization
- Critical error monitoring
- Extension stability verification

**Test 2: Outline View Integration**
- Opens Apex (.cls) file in editor
- Verifies outline view loads and is accessible
- Confirms LSP parses file and generates outline structure
- Detects outline tree elements and symbol icons
- Validates Apex symbols (HelloWorld, public, class, methods) appear
- Ensures outline view functionality works correctly

**Browser Support:** Chromium (primary), Firefox/WebKit available in test:e2e:all

📁 **Archived Tests:**
- Comprehensive test suites covering detailed functionality
- Multiple test scenarios for thorough coverage
- Available for reference and advanced testing scenarios
- **Location:** `tests/archived/` directory

### Manual Testing
```bash
# Start the test server manually (for development)
npm run test:web:server

# In another terminal, run specific tests
cd e2e-tests
npx playwright test apex-extension-core.spec.ts
```

## Configuration

### Environment Configuration
- **Development**: Fast retries, parallel execution
- **CI/CD**: Conservative settings, sequential execution
- **Browser**: Chromium with debugging features enabled
- **Timeouts**: Environment-specific values

### Test Server (`test-server.js`)
Starts a VS Code Web instance with:
- Extension loaded from `../packages/apex-lsp-vscode-extension`
- Test workspace with sample Apex files
- Debug options enabled
- Fixed port (3000) for Playwright

## Test Architecture

### Core Components

#### **Utilities (`utils/`)**
- `test-helpers.ts` - Core test functions (startup, activation, monitoring)
- `outline-helpers.ts` - Outline view specific functionality
- `constants.ts` - Centralized configuration and selectors
- `index.ts` - Unified exports for easy importing

#### **Types (`types/`)**
- Strong TypeScript typing for all test interfaces
- Console error tracking types
- Test metrics and environment configurations
- Sample file definitions

#### **Fixtures (`fixtures/`)**
- Sample Apex classes, triggers, and SOQL queries
- Follows Apex language rules (no imports, namespace resolution)
- Comprehensive examples for testing parsing and outline generation

#### **Configuration (`config/`)**
- Environment-specific settings
- Browser and server configurations
- Global setup and teardown logic
- Playwright configuration with proper typing

### Design Principles

Following `.cursor` TypeScript guidelines:
- ✅ Strong typing with `readonly` properties
- ✅ Arrow functions for consistency
- ✅ Descriptive naming conventions (camelCase, kebab-case)
- ✅ No enums (using string unions)
- ✅ Import type for type-only imports
- ✅ JSDoc documentation following Google Style Guide
- ✅ Error handling with proper filtering
- ✅ Constants for magic numbers
- ✅ Modular, maintainable code structure

## Test Data

The global setup creates a test workspace with sample files:

- **`HelloWorld.cls`**: Basic Apex class with static methods
- **`ComplexExample.cls`**: Advanced class with inner classes and multiple methods
- **`AccountTrigger.trigger`**: Sample trigger with validation logic
- **`query.soql`**: Sample SOQL query with joins and filtering

## Debugging

### Console Errors
Tests monitor browser console for errors. Non-critical errors (favicon, sourcemaps) are filtered out using centralized patterns.

### Network Issues
Tests check for worker file loading failures and report network issues with detailed logging.

### Screenshots and Videos
- Screenshots taken on test failures
- Videos recorded on retry
- Traces captured for failed tests
- Debug screenshots in `test-results/` directory

### Manual Debugging
1. Start server: `npm run test:web:server`
2. Open browser to `http://localhost:3000`
3. Open Developer Tools
4. Monitor console and network tabs
5. Interact with the extension manually

## CI/CD Integration

The tests are configured for CI environments:
- **Retries**: 2 attempts on CI
- **Workers**: 1 (sequential execution on CI)
- **Reporting**: HTML report generated
- **Headless**: Default on CI
- **Timeout**: Extended for CI stability

## Troubleshooting

### Extension Won't Activate
1. Verify extension is built: `npm run bundle` in extension directory
2. Check `dist/` directory exists with bundled files
3. Look for console errors in browser DevTools

### Tests Timeout
1. Check timeout configuration in `config/environments.ts`
2. Verify VS Code Web server is responding
3. Ensure network connectivity

### Worker Loading Errors
1. Check worker files exist in `dist/` directory
2. Verify file URLs are accessible
3. Look for CORS or security policy issues

### Port Conflicts
- Change port in `config/environments.ts`
- Ensure port is not in use by other services

## Contributing

When adding new tests:
1. Follow existing patterns using utilities from `utils/`
2. Add proper TypeScript types
3. Use centralized constants and selectors
4. Add JSDoc documentation
5. Update this README if needed
6. Follow `.cursor` TypeScript guidelines

## Known Limitations

- Some VS Code Web features may not work identically to desktop
- Worker loading paths may differ between environments
- Extension debugging capabilities are limited in web context
- Some file operations may not work in browser environment

---

## Recent Improvements

This test suite has been refactored to follow modern TypeScript best practices:

- **Modular Architecture**: Separated concerns into logical modules
- **Strong Typing**: Added comprehensive TypeScript interfaces
- **Centralized Configuration**: Environment-specific settings
- **Reusable Utilities**: Common functions for test operations
- **Improved Maintainability**: Following `.cursor` guidelines
- **Better Documentation**: Comprehensive JSDoc comments
- **Error Handling**: Centralized error filtering and reporting