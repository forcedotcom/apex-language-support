# GitHub Actions Release Scripts

This directory contains TypeScript scripts for automating release operations in GitHub Actions workflows. All scripts use environment variables for inputs and outputs, following GitHub Actions best practices.

## Architecture

### Design Principles

- **Environment Variables**: All inputs/outputs use environment variables for better GitHub Actions integration
- **Type Safety**: Full TypeScript support with proper interfaces and error handling
- **Modularity**: Each script has a single responsibility and can be composed together
- **Reusability**: Scripts can be used across multiple workflows
- **Error Handling**: Consistent error handling with proper exit codes and logging

### Script Categories

#### Extension Scripts (ext-\*)

Handle VS Code extension-specific operations:

- `ext-build-type`: Determine build type (nightly/promotion/regular)
- `ext-promotion-finder`: Find promotion candidates for nightly builds
- `ext-change-detector`: Detect changes in extensions
- `ext-release-plan`: Display extension release plan
- `ext-version-bumper`: Bump versions for selected extensions
- `ext-publish-matrix`: Determine publish matrix for extensions
- `ext-github-releases`: Create GitHub releases for extensions

#### NPM Scripts (npm-\*)

Handle NPM package-specific operations:

- `npm-change-detector`: Detect changes in NPM packages
- `npm-package-selector`: Select packages for release
- `npm-release-plan`: Display NPM release plan
- `npm-package-details`: Extract package details for notifications

#### Utility Scripts

Common utilities used across workflows:

- `audit-logger`: Log audit events for compliance

## Usage

### Running Scripts

All scripts are executed through the main CLI interface:

```bash
npx tsx .github/scripts/index.ts <command>
```

### Environment Variables

Scripts expect inputs via environment variables. Here are the common patterns:

#### Extension Scripts

```bash
# ext-build-type
npx tsx .github/scripts/index.ts ext-build-type

# ext-promotion-finder
npx tsx .github/scripts/index.ts ext-promotion-finder

# ext-change-detector
IS_NIGHTLY=true VERSION_BUMP=minor PRE_RELEASE=false IS_PROMOTION=false PROMOTION_COMMIT_SHA=abc123 \
npx tsx .github/scripts/index.ts ext-change-detector

# ext-release-plan
BRANCH=main BUILD_TYPE=workflow_dispatch IS_NIGHTLY=false VERSION_BUMP=auto REGISTRIES=all PRE_RELEASE=false SELECTED_EXTENSIONS=apex-lsp-vscode-extension \
npx tsx .github/scripts/index.ts ext-release-plan

# ext-version-bumper
DRY_RUN=true VERSION_BUMP=minor SELECTED_EXTENSIONS=apex-lsp-vscode-extension PRE_RELEASE=false IS_NIGHTLY=false IS_PROMOTION=false \
npx tsx .github/scripts/index.ts ext-version-bumper

# ext-publish-matrix
REGISTRIES=all SELECTED_EXTENSIONS=apex-lsp-vscode-extension \
npx tsx .github/scripts/index.ts ext-publish-matrix

# ext-github-releases
DRY_RUN=true PRE_RELEASE=false VERSION_BUMP=auto SELECTED_EXTENSIONS=apex-lsp-vscode-extension IS_NIGHTLY=false VSIX_ARTIFACTS_PATH=./vsix-artifacts \
npx tsx .github/scripts/index.ts ext-github-releases
```

#### NPM Scripts

```bash
# npm-change-detector
INPUT_BASE_BRANCH=main \
npx tsx .github/scripts/index.ts npm-change-detector

# npm-package-selector
SELECTED_PACKAGE=all AVAILABLE_PACKAGES=apex-lsp-logging,apex-parser-ast CHANGED_PACKAGES=apex-lsp-logging \
npx tsx .github/scripts/index.ts npm-package-selector

# npm-release-plan
MATRIX_PACKAGE=apex-lsp-logging VERSION_BUMP=patch DRY_RUN=true \
npx tsx .github/scripts/index.ts npm-release-plan

# npm-package-details
SELECTED_PACKAGES='["apex-lsp-logging"]' VERSION_BUMP=patch \
npx tsx .github/scripts/index.ts npm-package-details
```

#### Utility Scripts

```bash


# audit-logger
ACTION=release ACTOR=github-actions REPOSITORY=forcedotcom/apex-language-support BRANCH=main WORKFLOW=release RUN_ID=123456789 DETAILS='{"packages":"apex-lsp-logging","version":"1.0.0"}' \
npx tsx .github/scripts/index.ts audit-logger
```

### Outputs

Scripts produce outputs in GitHub Actions format:

```bash
# Set output variables
echo "key=value" >> $GITHUB_OUTPUT

# Example outputs
echo "build-type=nightly" >> $GITHUB_OUTPUT
echo "is-promotion=false" >> $GITHUB_OUTPUT
echo "selected-extensions=apex-lsp-vscode-extension" >> $GITHUB_OUTPUT
echo "matrix={\"registry\":\"vsce\",\"vsix_pattern\":\"*apex-language-server-extension*.vsix\"}" >> $GITHUB_OUTPUT
```

## Workflow Integration

### Example Workflow Usage

```yaml
jobs:
  determine-changes:
    runs-on: ubuntu-latest
    outputs:
      selected-extensions: ${{ steps.changes.outputs.selected-extensions }}
      version-bumps: ${{ steps.changes.outputs.version-bumps }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Install dependencies
        run: npm ci

      - name: Determine changes
        id: changes
        env:
          IS_NIGHTLY: ${{ needs.build-type.outputs.is-nightly }}
          VERSION_BUMP: auto
          PRE_RELEASE: ${{ inputs.pre-release }}
          IS_PROMOTION: ${{ needs.build-type.outputs.is-promotion }}
          PROMOTION_COMMIT_SHA: ${{ needs.promotion-finder.outputs.promotion-commit-sha }}
        run: |
          npx tsx .github/scripts/index.ts ext-change-detector

  bump-versions:
    needs: determine-changes
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Install dependencies
        run: npm ci

      - name: Bump versions
        env:
          DRY_RUN: ${{ inputs.dry-run }}
          VERSION_BUMP: ${{ needs.determine-changes.outputs.version-bumps }}
          SELECTED_EXTENSIONS: ${{ needs.determine-changes.outputs.selected-extensions }}
          PRE_RELEASE: ${{ inputs.pre-release }}
          IS_NIGHTLY: ${{ needs.build-type.outputs.is-nightly }}
          IS_PROMOTION: ${{ needs.build-type.outputs.is-promotion }}
          PROMOTION_COMMIT_SHA: ${{ needs.promotion-finder.outputs.promotion-commit-sha }}
        run: |
          npx tsx .github/scripts/index.ts ext-version-bumper
```

## Environment Variables Reference

### Common Variables

| Variable               | Description          | Example                           |
| ---------------------- | -------------------- | --------------------------------- |
| `DRY_RUN`              | Run in dry-run mode  | `true` or `false`                 |
| `VERSION_BUMP`         | Version bump type    | `auto`, `patch`, `minor`, `major` |
| `PRE_RELEASE`          | Pre-release mode     | `true` or `false`                 |
| `IS_NIGHTLY`           | Is nightly build     | `true` or `false`                 |
| `IS_PROMOTION`         | Is promotion build   | `true` or `false`                 |
| `PROMOTION_COMMIT_SHA` | Promotion commit SHA | `abc123...`                       |

### Extension-Specific Variables

| Variable              | Description                        | Example                                                   |
| --------------------- | ---------------------------------- | --------------------------------------------------------- |
| `SELECTED_EXTENSIONS` | Comma-separated list of extensions | `apex-lsp-vscode-extension,apex-lsp-vscode-extension-web` |
| `REGISTRIES`          | Registries to publish to           | `all`, `vsce`, `ovsx`                                     |
| `VSIX_ARTIFACTS_PATH` | Path to VSIX artifacts             | `./vsix-artifacts`                                        |
| `BRANCH`              | Branch to release from             | `main`                                                    |
| `BUILD_TYPE`          | Build type                         | `workflow_dispatch`, `schedule`                           |

### NPM-Specific Variables

| Variable             | Description                      | Example                            |
| -------------------- | -------------------------------- | ---------------------------------- |
| `SELECTED_PACKAGE`   | Selected package                 | `all`, `none`, `apex-lsp-logging`  |
| `AVAILABLE_PACKAGES` | Available packages               | `apex-lsp-logging,apex-parser-ast` |
| `CHANGED_PACKAGES`   | Changed packages                 | `apex-lsp-logging`                 |
| `SELECTED_PACKAGES`  | JSON array of selected packages  | `["apex-lsp-logging"]`             |
| `MATRIX_PACKAGE`     | Current matrix package           | `apex-lsp-logging`                 |
| `INPUT_BASE_BRANCH`  | Base branch for change detection | `main`                             |

### Utility Variables

| Variable            | Description              | Example                             |
| ------------------- | ------------------------ | ----------------------------------- |
| `SLACK_WEBHOOK_URL` | Slack webhook URL        | `https://hooks.slack.com/...`       |
| `STATUS`            | Status for notifications | `success`, `failure`, `dry-run`     |
| `TYPE`              | Type for notifications   | `extension`, `npm`                  |
| `REPOSITORY`        | Repository name          | `forcedotcom/apex-language-support` |
| `WORKFLOW`          | Workflow name            | `release`                           |
| `RUN_ID`            | Workflow run ID          | `123456789`                         |
| `ACTOR`             | Actor performing action  | `github-actions`                    |
| `DETAILS`           | JSON details             | `{"packages":"apex-lsp-logging"}`   |
| `ACTION`            | Action being performed   | `release`                           |
| `LOG_FILE`          | Custom log file path     | `./custom-audit.log`                |

## Testing

### Manual Testing

Test scripts locally with environment variables:

```bash
# Test extension change detection
IS_NIGHTLY=true VERSION_BUMP=minor PRE_RELEASE=false IS_PROMOTION=false \
npx tsx .github/scripts/index.ts ext-change-detector

# Test NPM package selection
SELECTED_PACKAGE=all AVAILABLE_PACKAGES=apex-lsp-logging,apex-parser-ast CHANGED_PACKAGES=apex-lsp-logging \
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
5. Update this README with new variables
6. Test with dry-run mode first
