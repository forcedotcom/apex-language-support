# GitHub Actions Workflow Documentation

This document provides a comprehensive overview of the GitHub Actions workflow system for the Apex Language Support monorepo.

## Workflow Architecture

```mermaid
graph TB
    %% Triggers
    subgraph "Triggers"
        A[Push to main] --> B[CI Workflow]
        A --> C[Release Workflow]
        D[Manual Trigger] --> E[Release Workflow]
        D --> F[Individual Workflows]
    end

    %% CI Workflow
    subgraph "CI Workflow (ci.yml)"
        B --> G[Test Matrix]
        G --> H[Package Job]
        H --> I[vsix-packages-{run_number}]
    end

    %% Release Workflow
    subgraph "Release Workflow (release.yml)"
        C --> J[Get Packages Action]
        E --> J
        J --> K[Release NPM]
        J --> L[Release Extensions]
    end

    %% Sub-workflows
    subgraph "NPM Release (release-npm.yml)"
        K --> M[Determine Changes]
        M --> N[Matrix: Changed Packages]
        N --> O[Build & Publish to NPM]
    end

    subgraph "Extension Release (release-extensions.yml)"
        L --> P[Determine Changes]
        P --> Q[Package Workflow]
        Q --> R[vsix-packages]
        P --> S[Bump Versions]
        S --> T[Publish VSCode]
        S --> U[Publish OpenVSX]
    end

    %% Publish Workflows
    subgraph "Publish Workflows"
        T --> V[VSCode Marketplace]
        U --> W[OpenVSX Registry]
    end

    %% Styling
    classDef trigger fill:#e1f5fe
    classDef workflow fill:#f3e5f5
    classDef action fill:#e8f5e8
    classDef artifact fill:#fff3e0

    class A,D trigger
    class B,C,E,F,G,H,K,L,M,N,P,Q,S,T,U workflow
    class J,O,V,W action
    class I,R artifact
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
    B --> C[vsix-packages-{run_number}]

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

### 2. Release Workflow (`release.yml`)

**Triggers:**

- Push to main (automatic)
- Manual dispatch

**Jobs:**

```mermaid
graph TB
    A[Get Packages] --> B[Release NPM]
    A --> C[Release Extensions]

    subgraph "Get Packages Action"
        D[Scan packages/*/]
        D --> E[Identify NPM packages]
        D --> F[Identify Extensions]
    end
```

**Purpose:** Orchestrate releases of NPM packages and VS Code extensions.

### 3. NPM Release Workflow (`release-npm.yml`)

**Triggers:**

- Called by release workflow
- Manual dispatch

**Jobs:**

```mermaid
graph LR
    A[Determine Changes] --> B[Matrix: Changed Packages]
    B --> C[Build Package]
    C --> D[Publish to NPM]

    subgraph "Matrix Strategy"
        E[apex-lsp-logging]
        F[apex-parser-ast]
        G[apex-ls-browser]
        H[apex-ls-node]
        I[lsp-compliant-services]
        J[custom-services]
        K[apex-lsp-browser-client]
        L[apex-lsp-vscode-client]
        M[apex-lsp-testbed]
    end
```

**Purpose:** Release NPM packages using semantic-release.

### 4. Extension Release Workflow (`release-extensions.yml`)

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

### 5. Package Workflow (`package.yml`)

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

### 6. Publish Workflows

#### VSCode Marketplace (`publishVSCode.yml`)

```mermaid
graph LR
    A[Package Workflow] --> B[Download Artifacts]
    B --> C[Find Desktop Extension]
    C --> D[Publish to VSCode Marketplace]
```

#### OpenVSX Registry (`publishOpenVSX.yml`)

```mermaid
graph LR
    A[Package Workflow] --> B[Download Artifacts]
    B --> C[Find Web Extension]
    C --> D[Publish to OpenVSX Registry]
```

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
    GitHub->>Release: Trigger release.yml
    Release->>Release: Get changed packages
    Release->>Release: Release changed NPM packages
    Release->>Release: Release changed extensions
```

### Scenario 2: Manual Release

```mermaid
sequenceDiagram
    participant User
    participant Release
    participant NPM
    participant Extensions

    User->>Release: Manual trigger
    Release->>Release: Get package lists
    Release->>NPM: Release specific NPM packages
    Release->>Extensions: Release specific extensions
```

### Scenario 3: Emergency Release

```mermaid
sequenceDiagram
    participant User
    participant Release
    participant Package
    participant Publish

    User->>Release: Manual trigger (hotfix branch)
    Release->>Package: Package from hotfix branch
    Package->>Publish: Publish to registries
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

### VS Code Extensions (2 total)

- `apex-lsp-vscode-extension` (desktop)
- `apex-lsp-vscode-extension-web` (web)

## Artifact Management

### CI Artifacts

- **Name**: `vsix-packages-{run_number}-release`
- **Purpose**: PR-specific packaging
- **Retention**: 5 days

### Release Artifacts

- **Name**: `vsix-packages-{run_number}-release` (normal) or `vsix-packages-{run_number}-dry-run` (dry-run)
- **Purpose**: Release packaging with run isolation
- **Retention**: 5 days
- **Pattern**: `{base_name}-{run_number}-{mode}` where mode is `release` or `dry-run`

## Safety Features

1. **NPM Publishing**: Defaults to "none" (manual override required)
2. **Change Detection**: Only releases packages with changes
3. **Branch Protection**: Automatic releases only from main
4. **Manual Control**: Full override capability for emergencies
5. **Artifact Isolation**: PR artifacts don't interfere with releases

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
gh workflow run release.yml -f npm-packages=all -f extensions=changed
```

## Troubleshooting

### Common Issues

1. **Artifact not found**: Check if package workflow completed successfully
2. **Version conflicts**: Ensure semantic-release is configured correctly
3. **Permission errors**: Verify NPM_TOKEN and OVSX_PAT secrets are set
4. **Branch issues**: Ensure workflows are called with correct branch parameter

### Debug Steps

1. Check workflow run logs
2. Verify artifact upload/download
3. Confirm package.json versions

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

## Nightly Build Strategy

The release workflow includes a nightly build strategy that automatically creates pre-release versions at 2 AM UTC daily.

### Nightly Build Triggers

- **Schedule**: `cron: '0 2 * * *'` (2 AM UTC daily)
- **Branch**: `main` (HEAD)
- **Type**: Always pre-release
- **Version Strategy**: Smart even/odd handling

### Nightly Version Bumping Rules

#### **The Challenge:**

- Nightly builds run from `main` HEAD regardless of current version
- Current version could be even (0.2.x) or odd (0.3.x)
- VS Code requires pre-releases to have odd minor versions
- Need to ensure version uniqueness and proper sequencing

#### **The Solution:**

1. **Ensure Odd Minor**: Always bump to odd minor version for pre-releases
2. **Add Timestamp**: Include nightly date for uniqueness
3. **Smart Increment**: Handle both even and odd current versions

### Nightly Version Examples

#### **Scenario 1: Current Version is Even**

```
Current: 0.2.5 (even minor)
Package.json: 0.3.0 (odd minor)
Release Tag: v0.3.0-nightly.20241201
Strategy: Bump to next odd minor, reset patch, add nightly timestamp to tag
```

#### **Scenario 2: Current Version is Odd**

```
Current: 0.3.2 (odd minor)
Package.json: 0.3.3 (odd minor)
Release Tag: v0.3.3-nightly.20241201
Strategy: Increment patch, keep odd minor, add nightly timestamp to tag
```

#### **Scenario 3: Multiple Nightly Builds**

```
Day 1: Package.json: 0.3.0, Tag: v0.3.0-nightly.20241201
Day 2: Package.json: 0.3.1, Tag: v0.3.1-nightly.20241202
Day 3: Package.json: 0.3.2, Tag: v0.3.2-nightly.20241203
Strategy: Increment patch each day, maintain odd minor, unique tags
```

### Nightly Build Benefits

1. **Automatic Pre-releases**: Daily pre-release versions for testing
2. **VS Code Compliance**: Proper major.minor.patch versions in package.json
3. **Unique Identification**: Timestamp in release tags for uniqueness
4. **Clear Identification**: Nightly versions are easily identifiable
5. **Sequential Ordering**: Proper version progression for updates
6. **Marketplace Compatible**: Follows VS Code version constraints

### Nightly vs Regular Releases

| Aspect              | Nightly Build                                     | Regular Release              |
| ------------------- | ------------------------------------------------- | ---------------------------- |
| **Trigger**         | Scheduled (2 AM UTC)                              | Manual/Push                  |
| **Version**         | Odd minor + proper major.minor.patch              | Smart even/odd based on type |
| **Release Tag**     | v{version}-nightly.{YYYYMMDD}                     | v{version}                   |
| **Pre-release**     | Always true                                       | Configurable                 |
| **Purpose**         | Daily testing                                     | Official releases            |
| **Version Example** | Package.json: 0.3.0, Tag: v0.3.0-nightly.20241201 | 0.2.0 or 0.3.0               |

### Usage

```bash
# Nightly builds run automatically
# Manual nightly-style build
gh workflow run release.yml --field pre-release=true

# Regular release
gh workflow run release.yml --field pre-release=false
```
