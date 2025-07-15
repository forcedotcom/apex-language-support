# Release Automation Scripts

TypeScript-based release automation scripts for VS Code extensions, replacing complex bash scripts in GitHub Actions workflows.

## Features

- ✅ **Type Safety**: Full TypeScript with proper interfaces
- ✅ **Testability**: Each module can be unit tested independently
- ✅ **Maintainability**: Clear separation of concerns, well-structured code
- ✅ **Debugging**: Better error messages, stack traces, logging
- ✅ **Reusability**: Scripts can be used outside of workflows
- ✅ **Documentation**: JSDoc comments, clear function signatures

## Installation

The release scripts use dependencies from the root package.json. No separate installation is needed.

```bash
# Install all dependencies (including release script dependencies)
npm install
```

## Usage

### CLI Commands

These scripts are designed to be called directly from GitHub Actions workflows:

```bash
# Determine build type (nightly/promotion/regular)
npx tsx .github/scripts/index.ts build-type

# Find promotion candidates for nightly builds
npx tsx .github/scripts/index.ts promotion-finder

# Detect changes in extensions
npx tsx .github/scripts/index.ts change-detector

# Bump versions for selected extensions
npx tsx .github/scripts/index.ts version-bumper --dry-run

# Generate release plan
npx tsx .github/scripts/index.ts release-plan --dry-run
```

### Environment Variables

The scripts read from GitHub Actions environment variables:

- `GITHUB_EVENT_NAME`: Event that triggered the workflow
- `INPUT_BRANCH`: Branch to release from
- `INPUT_EXTENSIONS`: Extensions to release
- `INPUT_REGISTRIES`: Registries to publish to
- `INPUT_DRY_RUN`: Run in dry-run mode
- `INPUT_PRE_RELEASE`: Publish as pre-release version
- `INPUT_VERSION_BUMP`: Version bump type

### Outputs

Scripts set GitHub Actions outputs using the `::set-output` format:

- `is-nightly`: Whether this is a nightly build
- `version-bump`: Version bump type to use
- `pre-release`: Whether this is a pre-release
- `is-promotion`: Whether this is a promotion build
- `selected-extensions`: Comma-separated list of extensions to release
- `version-bumps`: Version bump type for selected extensions
- `promotion-commit-sha`: Commit SHA for promotion (if applicable)

## Architecture

### Simplified Structure

The release scripts are now consolidated into the `.github/scripts` folder:

```
.github/scripts/
├── RELEASE_SCRIPTS.md        # This documentation
├── index.ts                  # Main CLI entry point
├── types.ts                  # TypeScript interfaces
├── utils.ts                  # Common utilities
├── build-type.ts             # Determine build type
├── promotion-finder.ts       # Find promotion candidates
├── change-detector.ts        # Detect extension changes
├── audit-logger.sh           # Existing workflow script
├── publish-vsix.js           # Existing workflow script
└── slack-notify.js           # Existing workflow script
```

### Core Modules

- **`build-type.ts`**: Determine build type (nightly/promotion/regular)
- **`promotion-finder.ts`**: Find promotion candidates for nightly builds
- **`change-detector.ts`**: Detect changes in extensions
- **`version-bumper.ts`**: Smart version bumping with even/odd logic _(TODO)_
- **`release-planner.ts`**: Generate detailed release plans _(TODO)_

### Utilities

- **`types.ts`**: TypeScript interfaces for all data structures
- **`utils.ts`**: Common utility functions (version parsing, git operations, etc.)

### Integration

- **Dependencies**: Added to root `package.json` devDependencies
- **TypeScript**: Uses root `tsconfig.json` configuration
- **Build**: No separate build step needed - uses `tsx` for direct execution
- **Workflow**: Called directly from GitHub Actions workflows

## Version Bumping Strategy

The scripts implement the same smart version bumping strategy as the original bash scripts:

### VS Code Even/Odd Strategy

- **Even minor versions** (0.2.x, 0.4.x): **Stable releases**
- **Odd minor versions** (0.3.x, 0.5.x): **Pre-releases**

### Build Types

1. **Nightly Builds**: Always use patch bump, ensure odd minor version
2. **Promotions**: Bump from odd minor (nightly) to even minor (stable)
3. **Regular Builds**: Use conventional commit logic with even/odd strategy

## Testing

```bash
# Run tests
npm test

# Run in development mode with watch
npm run dev
```

## Integration with Workflows

These scripts are designed to replace the bash scripts in `.github/workflows/release-extensions.yml`. The workflow would change from:

```yaml
- name: Determine changes and version bumps
  run: |
    # 100+ lines of bash script
```

To:

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20.x'

- name: Install dependencies
  uses: ./.github/actions/npm-install-with-retries

- name: Determine changes and version bumps
  run: npx tsx .github/scripts/index.ts change-detector
```

## Benefits Over Bash Scripts

- **Type Safety**: Catch errors at compile time
- **Better Error Handling**: Proper try/catch with meaningful messages
- **Testability**: Each function can be unit tested
- **Maintainability**: Clear function signatures and documentation
- **Debugging**: Better stack traces and logging
- **IDE Support**: IntelliSense, refactoring, etc.

## Dependencies

- **`simple-git`**: Git operations (tags, commits, diffs)
- **`semver`**: Version parsing and comparison
- **`zod`**: Runtime type validation
- **`chalk`**: Colored console output
- **`commander`**: CLI argument parsing
- **`tsx`**: TypeScript execution without compilation
