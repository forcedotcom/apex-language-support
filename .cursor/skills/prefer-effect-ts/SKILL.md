---
name: prefer-effect-ts
description: Prefer Effect-TS for new code functionality, async operations, error handling, and dependency management over plain Promises or try/catch. Use Effect.gen, Effect.succeed/fail, Effect.provide, Effect.runPromise, and Effect logging. Effect logging integrates with LSP workspace/logMessage via EffectLspLoggerLive. Use when creating new functionality, implementing validators, services, async operations, or any code that needs error handling or dependencies.
---

# Prefer Effect-TS

## Core Principle

**When creating new code functionality, prefer Effect-TS over plain Promises, try/catch blocks, and manual error handling.** Effect provides type-safe error handling, dependency management, composable async operations, and integrated logging that connects to the LSP logging subsystem.

## When to Use Effect

Use Effect-TS for:
- **Async operations** - Replace `Promise` with `Effect`
- **Error handling** - Replace `try/catch` with `Effect.fail`/`Effect.succeed`
- **Dependency injection** - Use `Context.Tag` and `Layer` instead of manual DI
- **Service definitions** - Define services with Effect's type system
- **Composable operations** - Chain operations with `Effect.gen` or `pipe`

## Common Patterns

### Creating Effects

**Success:**
```typescript
import { Effect } from 'effect';

// Instead of: return value;
return Effect.succeed(value);

// Instead of: Promise.resolve(value)
Effect.succeed(value)
```

**Failure:**
```typescript
// Instead of: throw new Error('message')
return Effect.fail(new Error('message'));

// Use Data.TaggedError for typed errors
import { Data } from 'effect';
export class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly message: string;
}> {}
return Effect.fail(new ValidationError({ message: 'Invalid input' }));
```

**Sync Operations:**
```typescript
// Instead of: const result = compute();
const result = yield* Effect.sync(() => compute());
```

**Async Operations:**
```typescript
// Instead of: await fetch(url)
const response = yield* Effect.tryPromise({
  try: () => fetch(url),
  catch: (error) => new Error(`Fetch failed: ${error}`),
});
```

### Effect.gen Pattern

Use `Effect.gen` for sequential async operations:

```typescript
import { Effect } from 'effect';

const result = Effect.gen(function* () {
  const value1 = yield* getValue1();
  const value2 = yield* getValue2();
  return combine(value1, value2);
});
```

**Instead of:**
```typescript
// ❌ Don't use async/await
const value1 = await getValue1();
const value2 = await getValue2();
return combine(value1, value2);
```

### Running Effects

**At the edge (when you must):**
```typescript
import { Effect } from 'effect';

// For Promise-based APIs (LSP handlers, etc.)
await Effect.runPromise(myEffect);

// For synchronous code (rare)
Effect.runSync(myEffect);
```

**Prefer providing dependencies:**
```typescript
const program = myEffect.pipe(
  Effect.provide(MyServiceLive)
);

await Effect.runPromise(program);
```

### Service Definition Pattern

**Define services with Context.Tag:**
```typescript
import { Context, Effect, Layer } from 'effect';

export interface MyService {
  readonly doSomething: () => Effect.Effect<string, Error>;
}

export class MyService extends Context.Tag('MyService')<
  MyService,
  MyService
>() {}

// Implementation
export const MyServiceLive = Layer.succeed(MyService, {
  doSomething: () => Effect.succeed('result'),
});
```

**Use services in functions:**
```typescript
const myFunction = (): Effect.Effect<string, Error, MyService> =>
  Effect.gen(function* () {
    const service = yield* MyService;
    return yield* service.doSomething();
  });
```

### Validator Pattern

Validators return `Effect<ValidationResult, ValidationError>`:

```typescript
import { Effect } from 'effect';
import { ValidationError, type Validator } from '../ValidatorRegistry';

export const MyValidator: Validator = {
  id: 'my-validator',
  name: 'My Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 1,
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false,
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      
      // Validation logic here
      if (hasError) {
        errors.push({
          message: 'Error message',
          location: symbol.location,
          code: ErrorCodes.SOME_ERROR,
        });
      }

      yield* Effect.logDebug(`MyValidator: found ${errors.length} errors`);

      return {
        errors,
        warnings: [],
      };
    }),
};
```

### Error Handling

**Catch and handle errors:**
```typescript
const result = myEffect.pipe(
  Effect.catchAll((error) => {
    // Handle error
    return Effect.succeed(defaultValue);
  })
);
```

**Catch specific error types:**
```typescript
const result = myEffect.pipe(
  Effect.catchTag('ValidationError', (error) => {
    // Handle ValidationError
    return Effect.succeed(fallback);
  })
);
```

### Logging

**Prefer Effect logging for new code.** Effect logging integrates with the LSP logging subsystem and automatically emits messages via `workspace/logMessage` notifications to the VS Code Output panel.

**Use Effect logging methods:**
```typescript
import { Effect } from 'effect';

// Info level (default)
yield* Effect.log('Application started');

// Debug level
yield* Effect.logDebug(`Processing ${count} items`);

// Warning level
yield* Effect.logWarning('Deprecated API usage detected');

// Error level
yield* Effect.logError(`Failed to process: ${error.message}`);
```

**Provide Effect Logger Layer:**

When running Effects in production code, provide `EffectLspLoggerLive` to bridge Effect logging to LSP:

```typescript
import { EffectLspLoggerLive } from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';

const myEffect = Effect.gen(function* () {
  yield* Effect.logDebug('Starting validation');
  // ... your code ...
  yield* Effect.logDebug('Validation complete');
  return result;
});

// Provide logger layer to enable LSP logging
const result = await Effect.runPromise(
  myEffect.pipe(Effect.provide(EffectLspLoggerLive))
);
```

**For tests, use `EffectTestLoggerLive`:**
```typescript
import { EffectTestLoggerLive } from '@salesforce/apex-lsp-parser-ast';

const result = await Effect.runPromise(
  myEffect.pipe(Effect.provide(EffectTestLoggerLive))
);
```

**How it works:**
- `EffectLspLoggerLive` creates a custom Effect Logger that forwards all `Effect.log*` calls to the global LSP logger
- The LSP logger emits messages via `workspace/logMessage` notifications
- Messages appear in the VS Code Output panel under the appropriate log channel
- Log levels are automatically mapped (Effect LogLevel → LSP log level)
- Minimum log level is respected based on LSP configuration

**Integration details:**
- Effect logging calls (`Effect.logDebug`, `Effect.logInfo`, `Effect.logWarning`, `Effect.logError`) are consumed by the logging subsystem
- The logging subsystem properly emits messages over LSP protocol via `workspace/logMessage`
- This provides a unified logging experience across the language server

**Avoid direct logger calls in Effect code:**
```typescript
// ❌ Don't use getLogger() directly in Effect code
import { getLogger } from '@salesforce/apex-lsp-shared';
const logger = getLogger();
logger.debug('message'); // This bypasses Effect's logging system

// ✅ Use Effect logging instead
yield* Effect.logDebug('message'); // Automatically forwarded to LSP logger
```

### Yielding to Event Loop

For long-running operations, yield to prevent blocking:

```typescript
import { yieldToEventLoop } from '../utils/effectUtils';

const processLargeList = Effect.gen(function* () {
  for (const item of largeList) {
    processItem(item);
    if (shouldYield) {
      yield* yieldToEventLoop;
    }
  }
});
```

## Anti-Patterns to Avoid

**❌ Don't mix async/await with Effect:**
```typescript
// Bad
const result = await someEffect;
```

**✅ Use Effect.gen:**
```typescript
// Good
const result = yield* someEffect;
```

**❌ Don't use try/catch with Effect:**
```typescript
// Bad
try {
  const result = await Effect.runPromise(myEffect);
} catch (error) {
  // handle
}
```

**✅ Use Effect.catchAll:**
```typescript
// Good
const result = myEffect.pipe(
  Effect.catchAll((error) => Effect.succeed(fallback))
);
```

**❌ Don't use Promise directly:**
```typescript
// Bad
const fetchData = async (): Promise<string> => {
  const response = await fetch(url);
  return response.text();
};
```

**✅ Use Effect.tryPromise:**
```typescript
// Good
const fetchData = (): Effect.Effect<string, Error> =>
  Effect.tryPromise({
    try: () => fetch(url).then(r => r.text()),
    catch: (error) => new Error(`Fetch failed: ${error}`),
  });
```

## Effect Type Signature

Understand the Effect type: `Effect<Success, Error, Requirements>`

- **Success**: The value type on success
- **Error**: The error type (use `never` if it can't fail)
- **Requirements**: Dependencies needed (use `never` if none)

**Examples:**
```typescript
// Simple success value
Effect<number, never, never>

// Can fail with Error
Effect<string, Error, never>

// Requires MyService dependency
Effect<string, Error, MyService>

// Can fail with multiple error types (union)
Effect<string, ValidationError | NetworkError, MyService>
```

## New Code Guidelines

**When creating new functionality:**
1. **Always prefer Effect** over Promises or async/await
2. **Use Effect logging** (`Effect.logDebug`, `Effect.logInfo`, etc.) instead of direct logger calls
3. **Provide `EffectLspLoggerLive`** when running Effects in production code
4. **Provide `EffectTestLoggerLive`** when running Effects in tests
5. **Use Effect.gen** for sequential async operations
6. **Use Effect.fail/succeed** for error handling instead of throw/try-catch

**Migration strategy for existing code:**
- New code: Use Effect from the start
- Existing code: Migrate to Effect when making significant changes
- Logging: Prefer Effect logging even when migrating incrementally

## Additional Resources

- **Effect Documentation**: See @Effect Full LLM text for complete Effect-TS documentation
- **Effect Logger Integration**: See `packages/apex-parser-ast/src/utils/EffectLspLoggerLayer.ts` for implementation details
- **Existing Examples**: Check `packages/apex-parser-ast/src/semantics/validation/validators/` for validator patterns with Effect logging
- **Service Examples**: See `packages/apex-parser-ast/src/services/` for service definitions
- **LSP Logging**: See `packages/apex-lsp-shared/src/utils/Logging.ts` for LSP logger implementation
