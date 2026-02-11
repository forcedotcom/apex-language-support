# Test Data Directory

This directory contains Apex sample files and expected results for e2e tests.

## Directory Structure

```
test-data/
├── apex-samples/          # Apex source files for testing
│   ├── complex-class.cls
│   ├── inheritance.cls
│   ├── interface-impl.cls
│   └── ...
```

## Apex Samples

### complex-class.cls
Complex Apex class with:
- Multiple methods (public, private, static, instance)
- Inner classes and enums
- Various data types and collections
- Method parameters and return types

**Use for testing:**
- Outline population with nested types
- Hover on different symbol types
- Method signature parsing

### inheritance.cls
Class hierarchy example:
- Base class with inherited methods
- Derived class with overrides
- Virtual and abstract methods

**Use for testing:**
- Go-to-definition across inheritance
- Hover on inherited members
- Outline showing class hierarchy

### interface-impl.cls
Interface implementation:
- Interface definition
- Implementing class
- Interface method implementations

**Use for testing:**
- Go-to-definition from interface to implementation
- Hover on interface types
- Outline showing interface members

## Expected Results

Expected outcomes are currently asserted directly in the test specs (for example,
symbol names, hover content, and definition navigation targets). There is no
`expected-results/` JSON directory in this package at this time.

## Adding New Test Data

1. Create the Apex file in `apex-samples/`
2. Add or update assertions in the relevant test spec
3. Document the file purpose in this README
4. Reference the file in test specs

## Usage in Tests

```typescript
import { test } from '../fixtures/apexFixtures';

test('should parse complex class', async ({ apexEditor }) => {
  await apexEditor.openFile('complex-class.cls');
  // ... test assertions
});
```
