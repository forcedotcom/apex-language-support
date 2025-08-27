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

# Display extension release plan
npx tsx .github/scripts/index.ts ext-release-plan

# Bump versions for selected extensions
npx tsx .github/scripts/index.ts ext-version-bumper

# Determine publish matrix for extensions
npx tsx .github/scripts/index.ts ext-publish-matrix

# Create GitHub releases for extensions
npx tsx .github/scripts/index.ts ext-github-releases
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

#### Utility Commands

```bash
# Log audit events for release operations
npx tsx .github/scripts/index.ts audit-logger
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
- `IS_NIGHTLY`: Whether this is a nightly build
- `IS_PROMOTION`: Whether this is a promotion build
- `PROMOTION_COMMIT_SHA`: Commit SHA for promotion (if applicable)
- `BRANCH`: Branch to release from
- `BUILD_TYPE`: Build type (workflow_dispatch, schedule)
- `REGISTRIES`: Registries to publish to
- `VSIX_ARTIFACTS_PATH`: Path to VSIX artifacts
- `PACKAGE_DIR`: Package directory for VSIX publishing
- `VSCE_PERSONAL_ACCESS_TOKEN`: VSCE token for publishing

#### NPM Scripts

- `INPUT_BASE_BRANCH`: Base branch for change detection
- `SELECTED_PACKAGE`: NPM package selection mode (`none`, `all`, `changed`, specific packages)
- `AVAILABLE_PACKAGES`: Comma-separated list of available NPM packages
- `CHANGED_PACKAGES`: Comma-separated list of changed NPM packages
- `SELECTED_PACKAGES`: JSON array of selected packages
- `VERSION_BUMP`: Version bump type
- `MATRIX_PACKAGE`: Package name for matrix jobs
- `DRY_RUN`: Run in dry-run mode

#### Utility Scripts

- `ACTION`: Action being performed
- `ACTOR`: Actor performing action
- `REPOSITORY`: Repository name
- `BRANCH`: Branch name
- `WORKFLOW`: Workflow name
- `RUN_ID`: Workflow run ID
- `DETAILS`: JSON details
- `LOG_FILE`: Custom log file path

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
- `matrix`: JSON array for publish matrix

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
- **Examples**: `apex-lsp-vscode-extension` (supports both desktop and web)
- **Scripts**: `ext-change-detector`, `ext-package-selector`, `ext-version-bumper`, etc.

#### NPM Packages (npm-\* scripts)

- **Filter**: Only packages without a `publisher` field in `package.json`
- **Purpose**: NPM registry publishing
- **Examples**: `apex-lsp-shared`, `apex-parser-ast`, `lsp-compliant-services`
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
├── ext-release-plan.ts       # Display extension release plan
├── ext-version-bumper.ts     # Bump versions for extensions
├── ext-publish-matrix.ts     # Determine publish matrix
├── ext-github-releases.ts    # Create GitHub releases
├── npm-change-detector.ts    # Detect NPM package changes
├── npm-package-selector.ts   # Select NPM packages
├── npm-package-details.ts    # Extract NPM package details
├── npm-release-plan.ts       # Generate NPM release plans
└── audit-logger.ts           # Log audit events
```

### Core Modules

#### Extension Modules

- **`ext-build-type.ts`**: Determine build type (nightly/promotion/regular)
- **`ext-promotion-finder.ts`**: Find promotion candidates for nightly builds
- **`ext-change-detector.ts`**: Detect changes in VS Code extensions
- **`ext-package-selector.ts`**: Select VS Code extensions for release
- **`ext-release-plan.ts`**: Display extension release plan
- **`ext-version-bumper.ts`**: Bump versions for selected extensions
- **`ext-publish-matrix.ts`**: Determine publish matrix for extensions
- **`ext-github-releases.ts`**: Create GitHub releases for extensions

#### NPM Modules

- **`npm-change-detector.ts`**: Detect changes in NPM packages since base branch
- **`npm-package-selector.ts`**: Select NPM packages based on user preferences
- **`npm-package-details.ts`**: Extract package details for notifications
- **`npm-release-plan.ts`**: Generate release plans for NPM packages

#### Utility Modules

- **`audit-logger.ts`**: Log audit events for compliance and tracking
- **`utils.ts`**: Common utilities used across all scripts
- **`types.ts`**: TypeScript interfaces for extension operations
- **`npm-types.ts`**: TypeScript interfaces for NPM operations

## Workflow Integration

### Extension Release Workflow

The extension release workflow uses these scripts in sequence:

1. **`ext-build-type`**: Determines if this is a nightly, promotion, or regular build
2. **`ext-promotion-finder`**: Finds promotion candidates (if promotion build)
3. **`ext-change-detector`**: Detects which extensions have changes
4. **`ext-release-plan`**: Displays release plan (dry-run mode)
5. **`ext-version-bumper`**: Bumps versions and creates tags
6. **`ext-github-releases`**: Creates GitHub releases
7. **`ext-publish-matrix`**: Determines publish matrix for registries

### NPM Release Workflow

The NPM release workflow uses these scripts:

1. **`npm-change-detector`**: Detects which NPM packages have changes
2. **`npm-package-selector`**: Selects packages based on user input
3. **`npm-release-plan`**: Displays release plan (dry-run mode)
4. **`npm-package-details`**: Extracts details for notifications

### Environment Variable Patterns

#### Extension Scripts

```bash
# Build type determination
INPUT_VERSION_BUMP=auto INPUT_PRE_RELEASE=false \
npx tsx .github/scripts/index.ts ext-build-type

# Change detection
IS_NIGHTLY=false VERSION_BUMP=auto PRE_RELEASE=false IS_PROMOTION=false \
npx tsx .github/scripts/index.ts ext-change-detector

# Version bumping
VERSION_BUMP=minor SELECTED_EXTENSIONS=apex-lsp-vscode-extension \
PRE_RELEASE=false IS_NIGHTLY=false IS_PROMOTION=false \
npx tsx .github/scripts/index.ts ext-version-bumper
```

#### NPM Scripts

```bash
# Change detection
INPUT_BASE_BRANCH=main \
npx tsx .github/scripts/index.ts npm-change-detector

# Package selection
SELECTED_PACKAGE=all AVAILABLE_PACKAGES=apex-lsp-shared,apex-parser-ast \
CHANGED_PACKAGES=apex-lsp-shared \
npx tsx .github/scripts/index.ts npm-package-selector
```

## Testing

### Manual Testing

Test scripts locally with environment variables:

```bash
# Test extension change detection
IS_NIGHTLY=true VERSION_BUMP=minor PRE_RELEASE=false IS_PROMOTION=false \
npx tsx .github/scripts/index.ts ext-change-detector

# Test NPM package selection
SELECTED_PACKAGE=all AVAILABLE_PACKAGES=apex-lsp-shared,apex-parser-ast \
CHANGED_PACKAGES=apex-lsp-shared \
npx tsx .github/scripts/index.ts npm-package-selector
```

### Dry Run Mode

Most scripts support dry-run mode for safe testing:

```bash
DRY_RUN=true npx tsx .github/scripts/index.ts ext-version-bumper
```

## Error Handling

All scripts follow consistent error handling patterns:

1. **Input Validation**: Validate required environment variables
2. **Graceful Degradation**: Handle missing optional inputs with defaults
3. **Error Logging**: Log detailed error messages for debugging
4. **Exit Codes**: Use proper exit codes (0 for success, 1 for failure)
5. **Cleanup**: Ensure proper cleanup on errors

## Migration from Command-Line Arguments

This script suite was migrated from command-line arguments to environment variables for better GitHub Actions integration. The benefits include:

- **Better Integration**: Environment variables are the standard for GitHub Actions
- **Easier Debugging**: Variables are visible in workflow logs
- **Type Safety**: Better handling of complex data types
- **Consistency**: All scripts follow the same pattern
- **Maintainability**: Easier to modify and extend

## Contributing

When adding new scripts:

1. Follow the environment variable pattern
2. Use TypeScript interfaces for type safety
3. Include proper error handling
4. Add comprehensive logging
5. Update this documentation with new variables
6. Test with dry-run mode first
