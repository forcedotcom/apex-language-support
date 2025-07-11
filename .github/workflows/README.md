# GitHub Actions Workflow Documentation

This document provides a comprehensive overview of the GitHub Actions workflow system for the Apex Language Support monorepo.

## Workflow Architecture

```mermaid
graph TB
    %% Triggers
    subgraph "Triggers"
        A[Push to main] --> B[CI Workflow]
        A --> C[Release Workflow]
        A --> D[Benchmark Workflow]
        E[Manual Trigger] --> F[Release Workflow]
        E --> G[Individual Workflows]
        H[PR Events] --> I[Validate PR]
        H --> J[Automerge]
    end

    %% CI Workflow
    subgraph "CI Workflow (ci.yml)"
        B --> K[Test Matrix]
        K --> L[Package Job]
        L --> M[vsix-packages]
    end

    %% Release Workflow
    subgraph "Release Workflow (release.yml)"
        C --> N[Get Packages Action]
        F --> N
        N --> O[Release Extensions]
        N --> P[Determine Build Type]
    end

    %% Extension Release Workflow
    subgraph "Extension Release (release-extensions.yml)"
        O --> Q[Determine Changes]
        Q --> R[Package Workflow]
        R --> S[vsix-packages]
        Q --> T[Bump Versions]
        T --> U[Publish VSCode]
        T --> V[Publish OpenVSX]
    end

    %% Publish Workflows
    subgraph "Publish Workflows"
        U --> W[VSCode Marketplace]
        V --> X[OpenVSX Registry]
    end

    %% Additional Workflows
    subgraph "Additional Workflows"
        D --> Y[Performance Benchmarks]
        I --> Z[PR Validation]
        J --> AA[Auto-merge PRs]
    end

    %% Styling
    classDef trigger fill:#e1f5fe
    classDef workflow fill:#f3e5f5
    classDef action fill:#e8f5e8
    classDef artifact fill:#fff3e0
    classDef additional fill:#fff8e1

    class A,E,H trigger
    class B,C,D,F,G,I,J,K,L,N,O,P,Q,R,T,U,V workflow
    class N,R,W,X action
    class M,S artifact
    class Y,Z,AA additional
```

## Workflow Details

### 1. CI Workflow (`ci.yml`)

**Triggers:**

- Push to main
- Pull requests to main
- Manual dispatch

**Jobs:**

```mermaid
graph LR
    A[Test Matrix] --> B[Package Job]
    B --> C[vsix-packages]

    subgraph "Test Matrix"
        D[ubuntu-latest, 20.x]
        E[ubuntu-latest, lts/*]
        F[ubuntu-latest, node]
        G[windows-latest, 20.x]
        H[windows-latest, lts/*]
        I[windows-latest, node]
    end
```

**Purpose:** Run tests and create packaging artifacts for each PR/merge.

**Key Features:**

- Uses composite action `npm-install-with-retries` for reliable dependency installation
- Runs linting, compilation, and tests with coverage
- Merges coverage reports across matrix runs
- Creates VSIX packages for extensions

### 2. Release Workflow (`release.yml`)

**Triggers:**

- Manual dispatch (primary)
- ~~Push to main (commented out)~~
- ~~Nightly schedule (commented out)~~

**Jobs:**

```mermaid
graph TB
    A[Get Packages] --> B[Release Extensions]
    A --> C[Determine Build Type]

    subgraph "Get Packages Action"
        D[Scan packages/*/]
        D --> E[Identify NPM packages]
        D --> F[Identify Extensions]
    end
```

**Purpose:** Orchestrate releases of VS Code extensions (NPM releases currently disabled).

**Key Features:**

- Uses composite action `get-packages` to dynamically identify packages
- Supports manual input for branch, packages, dry-run, pre-release, etc.
- Determines build type (nightly vs regular)
- ~~NPM release workflow is commented out~~

### 3. Extension Release Workflow (`release-extensions.yml`)

**Triggers:**

- Called by release workflow
- Manual dispatch

**Jobs:**

```mermaid
graph TB
    A[Determine Changes] --> B[Package Workflow]
    B --> C[vsix-packages]
    A --> D[Bump Versions]
    D --> E[Commit & Push]
    E --> F[Publish VSCode]
    E --> G[Publish OpenVSX]

    subgraph "Extensions"
        H[apex-lsp-vscode-extension]
        I[apex-lsp-vscode-extension-web]
    end
```

**Purpose:** Release VS Code extensions to multiple registries.

### 4. Package Workflow (`package.yml`)

**Triggers:**

- Called by other workflows
- Manual dispatch

**Jobs:**

```mermaid
graph LR
    A[Checkout] --> B[Setup Node.js]
    B --> C[Install Dependencies]
    C --> D[Package Packages]
    D --> E[Upload VSIX Artifacts]
```

**Purpose:** Create VSIX files for extensions.

### 5. Additional Workflows

#### Performance Benchmarks (`benchmark.yml`)

**Triggers:**

- Push to main
- Pull requests to main

**Purpose:** Run LSP performance benchmarks and track performance over time.

**Features:**

- Uses `benchmark-action/github-action-benchmark` for performance tracking
- Stores results for main branch pushes
- Compares results in PRs without storing
- Alerts on 130% performance regression

#### Validate PR (`validatePR.yml`)

**Triggers:**

- Pull request events (opened, reopened, edited, synchronize)
- Target branch: `develop`

**Purpose:** Validate pull requests using Salesforce CLI workflows and code quality checks.

**Features:**

- Uses `salesforcecli/github-workflows` for PR validation
- Runs linting checks
- Ensures code quality standards

#### Automerge (`automerge.yml`)

**Triggers:**

- Pull request events
- Check suite completion
- Status events

**Purpose:** Automatically merge PRs with specific labels.

**Features:**

- Merges PRs with `automerge` or `dependencies` labels
- Supports Dependabot PRs
- Uses squash merge method
- Requires 1 approval

#### Stale (`stale.yml`)

**Triggers:**

- Scheduled (daily at 1:30 AM)

**Purpose:** Close stale issues and pull requests.

**Features:**

- Marks issues stale after 30 days, closes after 35 days
- Marks PRs stale after 30 days, closes after 40 days
- Exempts issues/PRs with specific labels

## Composite Actions

The workflow system uses several composite actions to reduce code duplication and improve maintainability:

### 1. Get Packages (`get-packages/action.yml`)

**Purpose:** Dynamically determines NPM packages and VS Code extensions in the monorepo.

**Outputs:**

- `npm-packages`: Comma-separated list of NPM package names
- `extensions`: Comma-separated list of VS Code extension names
- `extension-paths`: Extension package paths for publishing

### 2. Download VSIX Artifacts (`download-vsix-artifacts/action.yml`)

**Purpose:** Downloads and finds VSIX artifacts for publishing workflows.

**Inputs:**

- `artifact-name`: Name for the VSIX artifacts (default: 'vsix-packages')

**Outputs:**

- `vsix_files`: JSON array of VSIX file paths

### 3. Publish VSIX (`publish-vsix/action.yml`)

**Purpose:** Publishes VSIX files to a marketplace with dry-run support.

**Inputs:**

- `vsix-path`: Path to the VSIX file to publish
- `publish-tool`: Publishing tool to use (ovsx or vsce)
- `pat-secret`: Personal access token secret name
- `pre-release`: Publish as pre-release version
- `dry-run`: Run in dry-run mode

### 4. NPM Install with Retries (`npm-install-with-retries/action.yml`)

**Purpose:** Installs NPM dependencies with retry logic for reliability.

### 5. Calculate Artifact Name (`calculate-artifact-name/action.yml`)

**Purpose:** Calculates artifact names with run isolation.

## Execution Scenarios

### Scenario 1: Normal Development Flow

```mermaid
sequenceDiagram
    participant Dev
    participant GitHub
    participant CI
    participant Release

    Dev->>GitHub: Push feature branch
    Dev->>GitHub: Create PR
    Dev->>GitHub: Merge to main
    GitHub->>CI: Trigger ci.yml
    CI->>CI: Run tests & package
    Note over Release: Manual trigger required
    Dev->>Release: Manual trigger release.yml
    Release->>Release: Get changed packages
    Release->>Release: Release changed extensions
```

### Scenario 2: Manual Release

```mermaid
sequenceDiagram
    participant User
    participant Release
    participant Extensions

    User->>Release: Manual trigger
    Release->>Release: Get package lists
    Release->>Extensions: Release specific extensions
```

### Scenario 3: Performance Monitoring

```mermaid
sequenceDiagram
    participant Dev
    participant GitHub
    participant Benchmark

    Dev->>GitHub: Push to main
    GitHub->>Benchmark: Trigger benchmark.yml
    Benchmark->>Benchmark: Run performance tests
    Benchmark->>GitHub: Store results
    Benchmark->>GitHub: Alert if regression
```

## Package Classification

### NPM Packages (9 total)

- `apex-lsp-logging`
- `apex-parser-ast`
- `apex-ls-browser`
- `apex-ls-node`
- `lsp-compliant-services`
- `custom-services`
- `apex-lsp-browser-client`
- `apex-lsp-vscode-client`
- `apex-lsp-testbed`

**Note:** NPM package releases are currently disabled in the main release workflow.

### VS Code Extensions (2 total)

- `apex-lsp-vscode-extension` (desktop)
- `apex-lsp-vscode-extension-web` (web)

## Artifact Management

### CI Artifacts

- **Name**: `vsix-packages`
- **Purpose**: PR-specific packaging
- **Retention**: 5 days

### Release Artifacts

- **Name**: `vsix-packages-{run_number}-release` (normal) or `vsix-packages-{run_number}-dry-run` (dry-run)
- **Purpose**: Release packaging with run isolation
- **Retention**: 5 days
- **Pattern**: `{base_name}-{run_number}-{mode}` where mode is `release` or `dry-run`

## Safety Features

1. **Manual Control**: Release workflow requires manual trigger
2. **Change Detection**: Only releases packages with changes
3. **Branch Protection**: Automatic releases only from main (when enabled)
4. **Dry-run Support**: Full dry-run capability for testing
5. **Artifact Isolation**: PR artifacts don't interfere with releases
6. **Performance Monitoring**: Automatic performance regression detection

## Common Commands

### View Workflow Runs

```bash
# View all workflow runs
gh run list

# View specific workflow
gh run list --workflow=release.yml

# View workflow details
gh run view <run-id>
```

### Manual Triggers

```bash
# Trigger release workflow
gh workflow run release.yml

# Trigger with inputs
gh workflow run release.yml -f extensions=changed -f dry-run=true

# Trigger benchmark workflow
gh workflow run benchmark.yml
```

## Troubleshooting

### Common Issues

1. **Artifact not found**: Check if package workflow completed successfully
2. **Version conflicts**: Ensure semantic-release is configured correctly
3. **Permission errors**: Verify NPM_TOKEN and OVSX_PAT secrets are set
4. **Branch issues**: Ensure workflows are called with correct branch parameter
5. **NPM releases disabled**: NPM package releases are currently commented out

### Debug Steps

1. Check workflow run logs
2. Verify artifact upload/download
3. Confirm package.json versions
4. Check composite action outputs

## Smart Version Bumping Strategy

The extension release workflow uses a smart version bumping strategy that combines **conventional commits** with **VS Code's even/odd versioning** for pre-releases vs stable releases.

### Version Bumping Rules

#### **VS Code Even/Odd Strategy:**

- **Even minor versions** (0.2.x, 0.4.x): **Stable releases**
- **Odd minor versions** (0.3.x, 0.5.x): **Pre-releases**

#### **Conventional Commits:**

- **`fix:`** → **patch** bump (0.1.0 → 0.1.1)
- **`feat:`** → **minor** bump (0.1.0 → 0.2.0)
- **`BREAKING CHANGE:`** → **major** bump (1.0.0 → 2.0.0)

### Smart Bumping Examples

#### **Pre-release Mode (`pre-release: true`)**

| Current Version | Conventional Commit | New Version | Explanation                   |
| --------------- | ------------------- | ----------- | ----------------------------- |
| 0.1.0 (odd)     | `fix:`              | 0.1.1 (odd) | Patch bump, stays odd         |
| 0.1.0 (odd)     | `feat:`             | 0.3.0 (odd) | Minor bump, jumps to next odd |
| 0.2.0 (even)    | `feat:`             | 0.3.0 (odd) | Minor bump, jumps to next odd |
| 0.3.0 (odd)     | `feat:`             | 0.5.0 (odd) | Minor bump, jumps to next odd |

#### **Stable Release Mode (`pre-release: false`)**

| Current Version | Conventional Commit | New Version  | Explanation                    |
| --------------- | ------------------- | ------------ | ------------------------------ |
| 0.1.0 (odd)     | `fix:`              | 0.1.1 (odd)  | Patch bump, stays odd          |
| 0.1.0 (odd)     | `feat:`             | 0.2.0 (even) | Minor bump, jumps to next even |
| 0.2.0 (even)    | `feat:`             | 0.4.0 (even) | Minor bump, jumps to next even |
| 0.3.0 (odd)     | `feat:`             | 0.4.0 (even) | Minor bump, jumps to next even |

### Benefits

1. **Conventional Commits**: Maintains semantic versioning based on commit types
2. **VS Code Compatibility**: Ensures proper even/odd versioning for marketplace
3. **Pre-release Support**: Automatically handles pre-release vs stable versioning
4. **Clear Intent**: Version numbers clearly indicate release type

### Usage

```bash
# Pre-release with feature
gh workflow run release-extensions.yml --field pre-release=true

# Stable release with feature
gh workflow run release-extensions.yml --field pre-release=false
```

## Current Status and Notes

### Disabled Features

1. **NPM Package Releases**: The NPM release workflow is commented out in `release.yml`
2. **Automatic Releases**: Push-to-main triggers are commented out
3. **Nightly Builds**: Scheduled nightly builds are commented out

### Active Features

1. **Extension Releases**: Fully functional with manual triggers
2. **Performance Benchmarks**: Active monitoring and alerting
3. **PR Validation**: Active validation for develop branch
4. **Automerge**: Active for labeled PRs
5. **Stale Management**: Active cleanup of stale issues/PRs

### Composite Actions Benefits

1. **Code Reduction**: ~90% reduction in duplicate code across workflows
2. **Reusability**: Actions can be used in any workflow
3. **Maintainability**: Clear separation of concerns
4. **Consistency**: All workflows use identical logic for common operations
5. **Flexibility**: Easy to modify behavior without touching multiple files

### Future Enhancements

1. **Re-enable NPM Releases**: When needed, uncomment NPM release workflow
2. **Re-enable Automatic Releases**: When ready, uncomment push triggers
3. **Re-enable Nightly Builds**: When needed, uncomment scheduled builds
4. **Versioning**: Composite actions can be versioned independently if needed
5. **Testing**: Add dedicated tests for composite actions
6. **Documentation**: Expand documentation for each action
7. **Validation**: Add input validation to composite actions
