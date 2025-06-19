# Custom ESLint Rules

This directory contains custom ESLint rules specific to this project.

## turbo-script-check

This rule examines `package.json` script entries and flags scripts that directly run targets defined in the root `turbo.json` configuration, rather than using `turbo run <target>`.

### Purpose

In a monorepo managed by Turbo, scripts should leverage Turbo's caching and dependency management by using `turbo run <target>` instead of directly calling the underlying tools.

### What it detects

The rule detects when package.json scripts directly call tools that correspond to Turbo targets:

- `"compile": "tsc --build"` → Should be `"compile": "turbo run compile"`
- `"test": "jest"` → Should be `"test": "turbo run test"`
- `"bundle": "tsup"` → Should be `"bundle": "turbo run bundle"`
- `"lint": "eslint src/**/*.ts"` → Should be `"lint": "turbo run lint"`

### Configuration

The rule accepts the following options:

```javascript
{
  "local/turbo-script-check": [
    "error",
    {
      "allowedDirectTargets": ["dev", "start"] // Targets that are allowed to run directly
    }
  ]
}
```

#### Options

- `allowedDirectTargets` (string[]): Array of turbo targets that are allowed to be run directly. Useful for development scripts or scripts that shouldn't go through Turbo.

### Examples

#### ❌ Incorrect

```json
{
  "scripts": {
    "compile": "tsc --build",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "bundle": "tsup",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "clean": "rimraf dist",
    "generate:stubs": "jest test/generator/generate-Standard-Apex-Library.ts"
  }
}
```

#### ✅ Correct

```json
{
  "scripts": {
    "compile": "turbo run compile",
    "test": "turbo run test",
    "test:coverage": "turbo run test:coverage",
    "bundle": "turbo run bundle",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint:fix",
    "clean": "turbo run clean"
  }
}
```

### Auto-fix

The rule provides an auto-fix that replaces direct commands with `turbo run <target>`. Use `eslint --fix` to automatically apply these fixes.

### Turbo Target Detection

The rule automatically reads the `turbo.json` file from the workspace root to determine which targets are defined. It filters out package-specific targets (those containing `#` in the name).

Current detected targets from your `turbo.json`:

- precompile
- compile
- bundle
- package
- test
- test:coverage
- lint
- lint:fix
- clean
- clean:coverage
- clean:all
