# Test Fixtures

This directory contains test fixtures used by the LSP compliant services tests.

## Structure

- `classes/` - Apex class files used for testing
  - `FileUtilities.cls` - Sample Apex utility class
  - `FileUtilitiesTest.cls` - Test class for FileUtilities

## Usage

These fixtures can be used in tests that need real Apex class content. To read a fixture file:

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

const fixturePath = join(__dirname, 'classes', 'FileUtilities.cls');
const content = readFileSync(fixturePath, 'utf8');
```

## Adding New Fixtures

When adding new fixtures:

1. Place them in the appropriate subdirectory
2. Update this README with a description
3. Ensure they are representative of real-world Apex code
