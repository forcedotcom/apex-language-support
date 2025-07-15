# Release Automation Scripts

TypeScript-based release automation scripts for VS Code extensions and NPM packages, replacing complex bash scripts in GitHub Actions workflows. The scripts automatically filter packages based on their type to ensure proper separation of concerns.

## Features

- ✅ **Type Safety**: Full TypeScript with proper interfaces
- ✅ **Testability**: Each module can be unit tested independently
- ✅ **Maintainability**: Clear separation of concerns, well-structured code
- ✅ **Debugging**: Better error messages, stack traces, logging
- ✅ **Reusability**: Scripts can be used outside of workflows
- ✅ **Documentation**: JSDoc comments, clear function signatures
- ✅ **Dual Support**: Handles both VS Code extensions and NPM packages
- ✅ **Clear Naming**: Prefixed commands for easy identification
- ✅ **Package Filtering**: Automatic filtering based on package type
- ✅ **Separation of Concerns**: Clear distinction between extension and NPM workflows

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

Handle VS Code extensions (packages with `publisher` field in package.json):

```bash
# Determine build type (nightly/promotion/regular)
npx tsx .github/scripts/index.ts ext-build-type

# Find promotion candidates for nightly builds
npx tsx .github/scripts/index.ts ext-promotion-finder

# Detect changes in VS Code extensions
npx tsx .github/scripts/index.ts ext-change-detector

# Select VS Code extensions for release
npx tsx .github/scripts/index.ts ext-package-selector
```

#### NPM Commands (prefixed with "npm-")

Handle NPM packages (packages without `publisher` field in package.json):

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
- `SELECTED_EXTENSIONS`: Extension selection mode (`none`, `all`, `changed`, specific extensions)
- `AVAILABLE_EXTENSIONS`: Available VS Code extensions (from change detector)
- `CHANGED_EXTENSIONS`: Changed VS Code extensions (from change detector)

#### NPM Scripts

- `INPUT_BASE_BRANCH`: Base branch for change detection
- `SELECTED_PACKAGE`: NPM package selection mode (`none`, `all`, `changed`, specific packages)
- `AVAILABLE_PACKAGES`: Comma-separated list of available NPM packages
- `CHANGED_PACKAGES`: Comma-separated list of changed NPM packages
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

### Package Filtering Strategy

The scripts implement automatic package filtering to ensure proper separation between VS Code extensions and NPM packages:

#### VS Code Extensions (ext-\* scripts)

- **Filter**: Only packages with a `publisher` field in `package.json`
- **Purpose**: VS Code Marketplace publishing
- **Examples**: `apex-lsp-vscode-extension`, `apex-lsp-vscode-extension-web`
- **Scripts**: `ext-change-detector`, `ext-package-selector`, `ext-version-bumper`, etc.

#### NPM Packages (npm-\* scripts)

- **Filter**: Only packages without a `publisher` field in `package.json`
- **Purpose**: NPM registry publishing
- **Examples**: `apex-lsp-logging`, `apex-parser-ast`, `lsp-compliant-services`
- **Scripts**: `npm-change-detector`, `npm-package-selector`, `npm-release-plan`, etc.

This filtering prevents cross-contamination between extension and NPM workflows and ensures each release process operates on the appropriate package types.

### Separation of Concerns

The scripts follow a clear separation pattern:

1. **Change Detection**: Scripts that analyze git history to determine what has changed
   - `ext-change-detector.ts`: Detects changes in VS Code extensions
   - `npm-change-detector.ts`: Detects changes in NPM packages

2. **Package Selection**: Scripts that apply user preferences to the detected changes
   - `ext-package-selector.ts`: Selects VS Code extensions based on user input
   - `npm-package-selector.ts`: Selects NPM packages based on user input

3. **Release Operations**: Scripts that perform the actual release tasks
   - Version bumping, publishing, notifications, etc.

This separation allows for flexible workflows where change detection can be automated while package selection can be manually controlled.

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
├── ext-change-detector.ts    # Detect VS Code extension changes
├── ext-package-selector.ts   # Select VS Code extensions
├── npm-change-detector.ts    # Detect NPM package changes
├── npm-package-selector.ts   # Select NPM packages
├── npm-package-details.ts    # Extract NPM package details
└── npm-release-plan.ts       # Generate NPM release plans
```

### Core Modules

#### Extension Modules

- **`ext-build-type.ts`**: Determine build type (nightly/promotion/regular)
- **`ext-promotion-finder.ts`**: Find promotion candidates for nightly builds
- **`ext-change-detector.ts`**: Detect changes in VS Code extensions
- **`ext-package-selector.ts`**: Select VS Code extensions for release

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
npx tsx .github/scripts/index.ts ext-package-selector

# Test NPM commands
npx tsx .github/scripts/index.ts npm-change-detector
npx tsx .github/scripts/index.ts npm-package-selector

# Test with environment variables
SELECTED_EXTENSIONS=all AVAILABLE_EXTENSIONS=apex-lsp-vscode-extension,apex-lsp-vscode-extension-web CHANGED_EXTENSIONS=apex-lsp-vscode-extension \
npx tsx .github/scripts/index.ts ext-package-selector

SELECTED_PACKAGE=all AVAILABLE_PACKAGES=apex-lsp-logging,apex-parser-ast CHANGED_PACKAGES=apex-lsp-logging \
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

- name: Detect extension changes
  id: ext-changes
  run: npx tsx .github/scripts/index.ts ext-change-detector

- name: Select extensions for release
  id: extensions
  env:
    SELECTED_EXTENSIONS: ${{ github.event.inputs.extensions || 'none' }}
    AVAILABLE_EXTENSIONS: ${{ steps.ext-changes.outputs.available-extensions }}
    CHANGED_EXTENSIONS: ${{ steps.ext-changes.outputs.changed-extensions }}
  run: npx tsx .github/scripts/index.ts ext-package-selector
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
