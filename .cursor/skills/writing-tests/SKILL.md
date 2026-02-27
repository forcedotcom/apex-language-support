---
name: writing-tests
description: Write comprehensive tests for all components using Jest, Effect-TS, and test helpers. Use when creating new tests, adding test cases, or when the user asks to write tests, add test coverage, or test specific functionality.
---

# Writing Tests

## Core Principles

**When writing tests:**

1. Use Jest with `describe`/`it` blocks
2. Use Effect-TS for async operations (not async/await)
3. Test both valid and invalid cases
4. **Add debugging to production code** using `Effect.logDebug` in the code being tested
5. **Add debugging to test code** using `console.log` in tests
6. **Enable console logging while debugging** - Use `enableConsoleLogging()` and `setLogLevel('debug')` in `beforeEach`, then change to `setLogLevel('error')` when tests are ready
7. **Prefer real implementations over mocks** - Use real services, managers, and components unless mocking is absolutely necessary

## Test Structure

### Basic Test Template

```typescript
import { MyComponent } from '../../src/components/MyComponent';
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { Effect } from 'effect';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

describe('MyComponent', () => {
  let symbolManager: ApexSymbolManager;
  let compilerService: CompilerService;

  beforeEach(() => {
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();

    // Enable console logging - set to 'debug' while debugging, 'error' when ready
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    symbolManager.clear();
  });

  it('should do something correctly', async () => {
    // Test implementation
    const result = await doSomething();
    expect(result).toBe(expectedValue);
  });
});
```

## Using Real Code vs Mocks

**Prefer real implementations** - Tests should use real code whenever possible:

```typescript
// ✅ Good - Use real implementations
let symbolManager: ApexSymbolManager;
let compilerService: CompilerService;

beforeEach(() => {
  symbolManager = new ApexSymbolManager();
  compilerService = new CompilerService();
});
```

**Use mocks only when absolutely necessary:**

- External services that can't be controlled (network calls, file system in some cases)
- Code that has side effects that would break test isolation
- Performance-critical tests where real implementations are too slow
- Testing error conditions that are difficult to trigger with real code

**Avoid mocks for:**

- `ApexSymbolManager` - Use real instances
- `CompilerService` - Use real instances
- Internal services and components - Use real implementations
- Effect services - Use real `EffectTestLoggerLive` and other live implementations
- Internal types and utilities - Use real implementations

**Example of acceptable mock usage:**

```typescript
// Only mock when testing error conditions that are hard to trigger
const mockService = {
  getData: jest.fn().mockRejectedValue(new Error('Network error')),
} as unknown as MyService;
```

**Example of preferred real code:**

```typescript
// Use real symbol manager - it's fast and provides better test coverage
const symbolManager = new ApexSymbolManager();
await Effect.runPromise(symbolManager.addSymbolTable(symbolTable, uri));
```

## Effect-TS in Tests

**Always use Effect.runPromise** (not async/await with Effect):

```typescript
// ✅ Correct
await Effect.runPromise(symbolManager.resolveCrossFileReferencesForFile(uri));

// ❌ Wrong
await symbolManager.resolveCrossFileReferencesForFile(uri);
```

## Debugging Tests

**Two approaches for debugging:**

1. **Add debugging to production code** using Effect logging:

   ```typescript
   // In your production code, add Effect logging for debugging:
   yield * Effect.logDebug(`Processing ${items.length} items`);
   yield * Effect.logInfo('Operation started');
   yield * Effect.logWarning('Potential issue detected');
   yield * Effect.logError(`Operation failed: ${error.message}`);
   ```

2. **Add debugging to test code** using `console.log`:

   ```typescript
   const result = await myFunction();

   // Debug: Log results if test fails
   if (result !== expectedValue) {
     console.log('Unexpected result:', JSON.stringify(result, null, 2));
     console.log('Expected:', expectedValue);
   }

   expect(result).toBe(expectedValue);
   ```

**Enable console logging while debugging tests:**

```typescript
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

beforeEach(() => {
  symbolManager = new ApexSymbolManager();
  compilerService = new CompilerService();

  // Enable console logging and set to debug level while debugging
  enableConsoleLogging();
  setLogLevel('debug');
});
```

**When tests are ready, change log level to error:**

```typescript
beforeEach(() => {
  symbolManager = new ApexSymbolManager();
  compilerService = new CompilerService();

  // Set to error level for production-ready tests
  enableConsoleLogging();
  setLogLevel('error');
});
```

**Note:** Effect logging from production code will appear in test output when console logging is enabled and log level is set appropriately. Ensure Effect services provide `EffectTestLoggerLive` or similar logging layers.

## Common Patterns

### Testing Valid Cases

```typescript
it('should handle valid input correctly', async () => {
  const input = createValidInput();
  const result = await myFunction(input);

  expect(result).toBeDefined();
  expect(result.isValid).toBe(true);
});
```

### Testing Invalid Cases

```typescript
it('should handle invalid input correctly', async () => {
  const input = createInvalidInput();
  const result = await myFunction(input);

  expect(result.isValid).toBe(false);
  expect(result.errors).toContain('Expected error message');
});
```

### Testing with Fixtures

```typescript
import * as fs from 'fs';
import * as path from 'path';

const loadFixture = (filename: string): string => {
  const fixturePath = path.join(__dirname, '../fixtures', filename);
  return fs.readFileSync(fixturePath, 'utf8');
};

it('should process fixture correctly', async () => {
  const content = loadFixture('MyFixture.cls');
  const result = await processContent(content);

  expect(result).toBeDefined();
});
```

## Test File Naming

Test files follow the pattern: `{ComponentName}.test.ts`

Examples:

- `OperatorValidator.test.ts`
- `ApexSymbolManager.getSymbolAtPosition.test.ts`
- `SymbolReference.test.ts`
- `ApexSymbolCollectorListener.assignment.test.ts`

## Anti-Patterns to Avoid

**❌ Don't use async/await with Effect:**

```typescript
// Bad
const result = await myEffect;
```

**✅ Use Effect.runPromise:**

```typescript
// Good
const result = await Effect.runPromise(myEffect);
```

**❌ Don't forget to clean up resources:**

```typescript
// Bad - missing afterEach
beforeEach(() => {
  symbolManager = new ApexSymbolManager();
});
```

**✅ Always clean up in afterEach:**

```typescript
// Good
afterEach(() => {
  symbolManager.clear();
});
```

**❌ Don't mock when real code works:**

```typescript
// Bad - unnecessary mock
const mockSymbolManager = {
  getSymbol: jest.fn().mockReturnValue(symbol),
} as ApexSymbolManager;
```

**✅ Use real implementations:**

```typescript
// Good - real code provides better test coverage
const symbolManager = new ApexSymbolManager();
await Effect.runPromise(symbolManager.addSymbolTable(symbolTable, uri));
```

**❌ Don't leave debug logging enabled:**

```typescript
// Bad - debug level left in production-ready test
beforeEach(() => {
  enableConsoleLogging();
  setLogLevel('debug'); // Should be 'error' when ready
});
```

**✅ Set log level to error when tests are ready:**

```typescript
// Good - error level for production-ready tests
beforeEach(() => {
  enableConsoleLogging();
  setLogLevel('error');
});
```

## Validator-Specific Testing

For validator tests, use helpers from `validation-test-helpers.ts`:

### compileFixtureWithOptions

Compiles a fixture file and creates validation options:

```typescript
import {
  compileFixtureWithOptions,
  runValidator,
} from './helpers/validation-test-helpers';

const { symbolTable, options } = await compileFixtureWithOptions(
  VALIDATOR_CATEGORY, // e.g., 'operator', 'variable-resolution'
  'MyFixture.cls', // Filename in test/fixtures/validation/{category}/
  undefined, // Optional file URI
  symbolManager,
  compilerService,
  {
    tier: ValidationTier.IMMEDIATE, // or ValidationTier.THOROUGH
    allowArtifactLoading: false, // true for TIER 2 tests
  },
);
```

### runValidator

Runs a validator Effect with all required services:

```typescript
const result = await runValidator(
  MyValidator.validate(symbolTable, options),
  symbolManager,
);
```

**Returns:** `ValidationResult` with `isValid`, `errors`, and `warnings` arrays.

**Note:** `runValidator` automatically provides `EffectTestLoggerLive`, so validators can use Effect logging (`Effect.logDebug`, `Effect.logInfo`, etc.). To see Effect logs in test output, enable console logging with `enableConsoleLogging()` and set an appropriate log level with `setLogLevel()`.

### Testing TIER 2 (THOROUGH) Validation

TIER 2 tests require cross-file resolution:

```typescript
describe('TIER 2: Cross-file type resolution', () => {
  it('should validate with resolved types', async () => {
    // Compile dependent files first
    await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'DependentClass.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: true,
      },
    );

    // Compile the file under test
    const { symbolTable, options } = await compileFixtureWithOptions(
      VALIDATOR_CATEGORY,
      'TestClass.cls',
      undefined,
      symbolManager,
      compilerService,
      {
        tier: ValidationTier.THOROUGH,
        allowArtifactLoading: true,
      },
    );

    // Resolve cross-file references
    await Effect.runPromise(
      symbolManager.resolveCrossFileReferencesForFile(
        symbolTable.getFileUri() || '',
      ),
    );

    const result = await runValidator(
      MyValidator.validate(symbolTable, options),
      symbolManager,
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

### Testing Error Codes

For validator tests, check for specific error codes:

```typescript
import { ErrorCodes } from '../../../../src/generated/ErrorCodes';

const hasError = result.errors.some(
  (e: any) => e.code === ErrorCodes.INVALID_COMPARISON_TYPES,
);
expect(hasError).toBe(true);
```

## Additional Resources

- **Test Helpers**: See `test/semantics/validation/validators/helpers/validation-test-helpers.ts` for validator-specific helpers
- **Error Codes**: See `src/generated/ErrorCodes.ts` for validator error codes
- **Example Tests**:
  - Validators: `test/semantics/validation/validators/OperatorValidator.test.ts`
  - Symbol Manager: `test/symbols/ApexSymbolManager.getSymbolAtPosition.test.ts`
  - Types: `test/types/typeReference.test.ts`
- **Effect-TS Testing**: See `prefer-effect-ts` skill for Effect patterns
