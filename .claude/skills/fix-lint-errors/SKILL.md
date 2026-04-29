---
name: fix-lint-errors
description: Fix lint errors by removing unused variables and imports rather than prefixing with underscore. Use when lint errors are reported, when fixing compilation issues, or when the user asks to fix lint errors.
---

# Fix Lint Errors

## Core Principle

When fixing lint errors, **remove unused code rather than suppressing it**. The first specific hint from the linter should guide the fix.

## Unused Variables

**Rule**: Remove unused variables. Do not prefix them with `_` to suppress the warning.

**Example - Correct:**
```typescript
// Before (lint error: 'unusedVariable' is defined but never used)
function processData(data: string) {
  const unusedVariable = 'test';
  return data.toUpperCase();
}

// After (removed unused variable)
function processData(data: string) {
  return data.toUpperCase();
}
```

**Example - Incorrect:**
```typescript
// ❌ Don't do this - don't prefix with underscore
function processData(data: string) {
  const _unusedVariable = 'test';  // Wrong approach
  return data.toUpperCase();
}
```

## Unused Imports

Remove unused imports completely rather than leaving them in the code.

**Example:**
```typescript
// Before (lint error: 'unusedFunction' is imported but never used)
import { usedFunction, unusedFunction } from './utils';

// After (removed unused import)
import { usedFunction } from './utils';
```

## Workflow

1. **Read lint errors**: Check the specific lint error message
2. **Apply the first specific hint**: Follow the linter's suggestion if it's clear and specific
3. **Remove, don't suppress**: Delete unused code rather than prefixing with `_` or adding ignore comments
4. **Verify fix**: Run `npm run lint` to confirm the error is resolved

## Common Patterns

### Unused Function Parameters

If a parameter is truly unused, remove it:

```typescript
// Before
function handler(event: Event, unusedParam: string) {
  return event.type;
}

// After
function handler(event: Event) {
  return event.type;
}
```

### Unused Destructured Variables

Remove unused destructured variables:

```typescript
// Before
const { used, unused } = getData();

// After
const { used } = getData();
```

## When Suppression Might Be Acceptable

Only use suppression patterns (`_` prefix or ignore comments) when:
- The code is intentionally kept for future use (document why)
- It's part of an interface/type that must match a signature
- Removing it would break functionality

In all other cases, **remove the unused code**.
