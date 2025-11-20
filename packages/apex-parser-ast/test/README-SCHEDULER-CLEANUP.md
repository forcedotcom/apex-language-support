# Priority Scheduler Test Cleanup

## Overview

The priority scheduler runs a background controller loop that must be explicitly shut down to prevent Jest from hanging after tests complete. This document explains the solution implemented to handle scheduler cleanup across all test suites.

## Solution

### Global Teardown Files

Each package that uses the priority scheduler now has a `test/teardown.js` file that:

1. **Shuts down the scheduler** - Stops the background controller loop
2. **Resets scheduler state** - Clears internal state for next test run
3. **Cleans up singletons** - Resets ApexSymbolProcessingManager
4. **Allows cleanup time** - Gives Effect-TS resources time to complete cleanup

### Packages with Teardown

- `packages/apex-parser-ast/test/teardown.js`
- `packages/lsp-compliant-services/test/teardown.js`
- `packages/apex-ls/test/teardown.js`

### Jest Configuration

Each package's `jest.config.cjs` includes:

```javascript
globalTeardown: '<rootDir>/test/teardown.js',
```

This ensures the teardown runs automatically after all tests complete.

## For Test Writers

### When You Need Scheduler Cleanup

You typically **don't need** to add cleanup code in individual tests because the global teardown handles it. However, if you need to:

1. **Initialize scheduler in tests**: Use `beforeAll` to initialize:
   ```typescript
   beforeAll(async () => {
     await Effect.runPromise(
       schedulerInitialize({
         queueCapacity: 100,
         maxHighPriorityStreak: 50,
         idleSleepMs: 1,
       }),
     );
   });
   ```

2. **Cleanup between tests** (optional): If you need cleanup between tests for isolation:
   ```typescript
   afterEach(async () => {
     // Wait for tasks to complete
     await new Promise((resolve) => setTimeout(resolve, 50));
     // Clear test-specific state if needed
   });
   ```

3. **Global teardown handles final cleanup**: The `globalTeardown` ensures Jest exits cleanly.

### What Triggers Scheduler Initialization

The scheduler is initialized when:
- `BackgroundProcessingInitializationService.initialize()` is called
- `ApexSymbolProcessingManager.initialize()` is called
- `SchedulerInitializationService.ensureInitialized()` is called
- `initializeLSPQueueManager()` is called (in lsp-compliant-services)

### Common Patterns

**Pattern 1: Tests that don't use scheduler**
- No action needed - global teardown handles cleanup

**Pattern 2: Tests that initialize scheduler**
- Initialize in `beforeAll`
- Global teardown handles cleanup automatically

**Pattern 3: Tests that call `handleInitialized`**
- This initializes the scheduler automatically
- Global teardown handles cleanup automatically

## Troubleshooting

### Jest Still Hanging?

1. Check if `globalTeardown` is configured in `jest.config.cjs`
2. Verify the teardown file exists and is correct
3. Check if scheduler is being initialized in a way that bypasses normal initialization
4. Ensure `shutdown()` is called before `reset()` in teardown

### Tests Failing with "Scheduler not initialized"?

- This means scheduler wasn't initialized before use
- Add initialization in `beforeAll` if your test needs the scheduler

## Implementation Details

The teardown files use `require()` to import modules because they run in Node.js directly (not through Jest's TypeScript transformer). The imports work because:

- `@salesforce/apex-lsp-parser-ast` exports `shutdown` and `reset` from `priority-scheduler-utils`
- The teardown files handle errors gracefully if modules aren't available

