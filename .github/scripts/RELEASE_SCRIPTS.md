# Release Automation Scripts

TypeScript-based release automation scripts for VS Code extensions and NPM packages, replacing complex bash scripts in GitHub Actions workflows.

## Features

- ✅ **Type Safety**: Full TypeScript with proper interfaces
- ✅ **Testability**: Each module can be unit tested independently
- ✅ **Maintainability**: Clear separation of concerns, well-structured code
- ✅ **Debugging**: Better error messages, stack traces, logging
- ✅ **Reusability**: Scripts can be used outside of workflows
- ✅ **Documentation**: JSDoc comments, clear function signatures
- ✅ **Dual Support**: Handles both VS Code extensions and NPM packages
- ✅ **Clear Naming**: Prefixed commands for easy identification

## Installation

The release scripts use dependencies from the root package.json. No separate installation is needed.

```bash
# Install all dependencies (including release script dependencies)
npm install
```

## Usage

### CLI Commands

These scripts are designed to be called directly from GitHub Actions workflows:

#### Extension Commands (prefixed with "ext-")

```bash
# Determine build type (nightly/promotion/regular)
npx tsx .github/scripts/index.ts ext-build-type

# Find promotion candidates for nightly builds
npx tsx .github/scripts/index.ts ext-promotion-finder

# Detect changes in extensions
npx tsx .github/scripts/index.ts ext-change-detector
```

#### NPM Commands (prefixed with "npm-")

```bash
# Detect changes in NPM packages
npx tsx .github/scripts/index.ts npm-change-detector

# Select NPM packages for release
npx tsx .github/scripts/index.ts npm-package-selector

# Extract NPM package details for notifications
npx tsx .github/scripts/index.ts npm-package-details

# Generate NPM release plan
npx tsx .github/scripts/index.ts npm-release-plan
```

#### General Commands

```bash
# Bump versions for selected extensions
npx tsx .github/scripts/index.ts version-bumper --dry-run

# Generate release plan
npx tsx .github/scripts/index.ts release-plan --dry-run
```

### Environment Variables

The scripts read from GitHub Actions environment variables:

#### Extension Scripts

- `GITHUB_EVENT_NAME`: Event that triggered the workflow
- `INPUT_BRANCH`: Branch to release from
- `INPUT_EXTENSIONS`: Extensions to release
- `INPUT_REGISTRIES`: Registries to publish to
- `INPUT_DRY_RUN`: Run in dry-run mode
- `INPUT_PRE_RELEASE`: Publish as pre-release version
- `INPUT_VERSION_BUMP`: Version bump type

#### NPM Scripts

- `INPUT_BASE_BRANCH`: Base branch for change detection
- `SELECTED_PACKAGE`: Package selection mode (none/all/changed/specific)
- `AVAILABLE_PACKAGES`: Comma-separated list of available packages
- `CHANGED_PACKAGES`: Comma-separated list of changed packages
- `SELECTED_PACKAGES`: JSON array of selected packages
- `VERSION_BUMP`: Version bump type
- `MATRIX_PACKAGE`: Package name for matrix jobs
- `DRY_RUN`: Run in dry-run mode

### Outputs

Scripts set GitHub Actions outputs using the `::set-output` format:

#### Extension Outputs

- `is-nightly`: Whether this is a nightly build
- `version-bump`: Version bump type to use
- `pre-release`: Whether this is a pre-release
- `is-promotion`: Whether this is a promotion build
- `selected-extensions`: Comma-separated list of extensions to release
- `version-bumps`: Version bump type for selected extensions
- `promotion-commit-sha`: Commit SHA for promotion (if applicable)

#### NPM Outputs

- `packages`: Comma-separated list of changed packages
- `bump`: Version bump type
- `package_names`: Comma-separated list of package names
- `package_versions`: Comma-separated list of package versions
- `package_descriptions`: Comma-separated list of package descriptions

## Architecture

### File Structure

The release scripts are organized in the `.github/scripts` folder:

```
.github/scripts/
├── RELEASE_SCRIPTS.md        # This documentation
├── index.ts                  # Main CLI entry point
├── types.ts                  # Extension TypeScript interfaces
├── npm-types.ts              # NPM TypeScript interfaces
├── utils.ts                  # Common utilities
├── ext-build-type.ts         # Determine build type
├── ext-promotion-finder.ts   # Find promotion candidates
├── ext-change-detector.ts    # Detect extension changes
├── npm-change-detector.ts    # Detect NPM package changes
├── npm-package-selector.ts   # Select NPM packages
├── npm-package-details.ts    # Extract NPM package details
├── npm-release-plan.ts       # Generate NPM release plans
├── audit-logger.sh           # Existing workflow script
├── publish-vsix.js           # Existing workflow script
└── slack-notify.js           # Existing workflow script
```

### Core Modules

#### Extension Modules

- **`ext-build-type.ts`**: Determine build type (nightly/promotion/regular)
- **`ext-promotion-finder.ts`**: Find promotion candidates for nightly builds
- **`ext-change-detector.ts`**: Detect changes in extensions

#### NPM Modules

- **`npm-change-detector.ts`**: Detect changes in NPM packages since base branch
- **`npm-package-selector.ts`**: Select NPM packages based on criteria
- **`npm-package-details.ts`**: Extract package details for notifications
- **`npm-release-plan.ts`**: Generate release plans for NPM packages

#### General Modules

- **`version-bumper.ts`**: Smart version bumping with even/odd logic _(TODO)_
- **`release-planner.ts`**: Generate detailed release plans _(TODO)_

### Utilities

- **`types.ts`**: TypeScript interfaces for extension data structures
- **`npm-types.ts`**: TypeScript interfaces for NPM data structures
- **`utils.ts`**: Common utility functions (version parsing, git operations, etc.)

### Integration

- **Dependencies**: Added to root `package.json` devDependencies
- **TypeScript**: Uses root `tsconfig.json` configuration
- **Build**: No separate build step needed - uses `tsx` for direct execution
- **Workflow**: Called directly from GitHub Actions workflows

## Version Bumping Strategy

The scripts implement smart version bumping strategies for both extensions and NPM packages:

### VS Code Extension Even/Odd Strategy

- **Even minor versions** (0.2.x, 0.4.x): **Stable releases**
- **Odd minor versions** (0.3.x, 0.5.x): **Pre-releases**

### Build Types

1. **Nightly Builds**: Always use patch bump, ensure odd minor version
2. **Promotions**: Bump from odd minor (nightly) to even minor (stable)
3. **Regular Builds**: Use conventional commit logic with even/odd strategy

### NPM Package Strategy

- **Conventional Commits**: Parse commit messages for version bump type
- **Change Detection**: Only bump versions for packages with actual changes
- **Smart Selection**: Support for different package selection modes

## Testing

```bash
# Test extension commands
npx tsx .github/scripts/index.ts ext-build-type
npx tsx .github/scripts/index.ts ext-change-detector

# Test NPM commands
npx tsx .github/scripts/index.ts npm-change-detector
npx tsx .github/scripts/index.ts npm-package-selector

# Run tests
npm test

# Run in development mode with watch
npm run dev
```

## Integration with Workflows

These scripts are designed to replace the bash scripts in both extension and NPM release workflows.

### Extension Workflow Integration

The workflow would change from:

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
  run: npx tsx .github/scripts/index.ts ext-change-detector
```

### NPM Workflow Integration

For NPM release workflows:

```yaml
- name: Detect NPM changes
  run: npx tsx .github/scripts/index.ts npm-change-detector
  env:
    INPUT_BASE_BRANCH: main

- name: Select NPM packages
  run: npx tsx .github/scripts/index.ts npm-package-selector
  env:
    SELECTED_PACKAGE: changed
    AVAILABLE_PACKAGES: ${{ steps.detect.outputs.packages }}
    CHANGED_PACKAGES: ${{ steps.detect.outputs.packages }}

- name: Extract package details
  run: npx tsx .github/scripts/index.ts npm-package-details
  env:
    SELECTED_PACKAGES: ${{ steps.select.outputs.packages }}
    VERSION_BUMP: ${{ steps.detect.outputs.bump }}
```

## Benefits Over Bash Scripts

- **Type Safety**: Catch errors at compile time
- **Better Error Handling**: Proper try/catch with meaningful messages
- **Testability**: Each function can be unit tested
- **Maintainability**: Clear function signatures and documentation
- **Debugging**: Better stack traces and logging
- **IDE Support**: IntelliSense, refactoring, etc.
- **Clear Naming**: Prefixed commands make it easy to identify functionality
- **Dual Support**: Handle both extensions and NPM packages with consistent patterns

## Dependencies

- **`simple-git`**: Git operations (tags, commits, diffs)
- **`semver`**: Version parsing and comparison
- **`zod`**: Runtime type validation
- **`chalk`**: Colored console output
- **`commander`**: CLI argument parsing
- **`tsx`**: TypeScript execution without compilation

## Migration Guide

### From Bash to TypeScript

1. **Identify bash scripts** in workflows that need replacement
2. **Choose appropriate TypeScript script** based on functionality
3. **Update workflow** to use `npx tsx .github/scripts/index.ts <command>`
4. **Set environment variables** as needed for the specific script
5. **Test thoroughly** in dry-run mode before deploying

### Naming Convention

- **Extension scripts**: Prefixed with `ext-` (e.g., `ext-build-type`)
- **NPM scripts**: Prefixed with `npm-` (e.g., `npm-change-detector`)
- **General scripts**: No prefix (e.g., `version-bumper`)

This naming convention makes it immediately clear which scripts handle extensions vs NPM packages, improving maintainability and reducing confusion.
