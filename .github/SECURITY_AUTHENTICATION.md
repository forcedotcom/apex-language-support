# GitHub Authentication & Token Security

This document outlines the authentication requirements and token usage across all GitHub workflows in this repository.

## 🔐 Required Secrets

### **Core GitHub Token**

- **Name**: `GITHUB_TOKEN` (automatically provided by GitHub Actions)
- **Usage**: All repository operations, GitHub CLI commands, releases, PRs
- **Permissions**:
  - `contents: write` - For commits, pushes, releases
  - `pull-requests: write` - For creating PRs
  - `packages: write` - For publishing packages

### **Marketplace Publishing Tokens**

- **Name**: `VSCE_PERSONAL_ACCESS_TOKEN`
- **Usage**: Publishing to Visual Studio Code Marketplace
- **Permissions**: Marketplace publishing

- **Name**: `OVSX_PAT`
- **Usage**: Publishing to Open VSX Registry
- **Permissions**: Open VSX publishing

### **NPM Publishing Token**

- **Name**: `NPM_TOKEN`
- **Usage**: Publishing packages to npmjs.org
- **Permissions**: NPM package publishing

## 🛡️ Authentication Security Measures

### **1. Token Validation**

All workflows that perform GitHub operations include validation steps:

```bash
# Validate that required tokens are present
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: GITHUB_TOKEN is not set"
  exit 1
fi

# Test GitHub CLI authentication
if ! gh auth status >/dev/null 2>&1; then
  echo "❌ Error: GitHub CLI authentication failed"
  exit 1
fi
```

### **2. Environment Variable Usage**

Tokens are passed via environment variables to prevent command-line exposure:

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  VSCE_PERSONAL_ACCESS_TOKEN: ${{ secrets.VSCE_PERSONAL_ACCESS_TOKEN }}
  OVSX_PAT: ${{ secrets.OVSX_PAT }}
```

### **3. Least Privilege Permissions**

Each workflow has explicit permission declarations:

```yaml
permissions:
  contents: write # Only for operations that need it
  packages: write # Only for publishing workflows
  actions: read # Minimal required access
```

## 📋 Workflow Authentication Requirements

### **CI Workflow** (`ci.yml`)

- **Token**: `GITHUB_TOKEN` (automatic)
- **Operations**: Checkout, test, package
- **Permissions**: `contents: read`, `pull-requests: read`, `actions: read`

### **Package Workflow** (`package.yml`)

- **Token**: `GITHUB_TOKEN` (automatic)
- **Operations**: Checkout, build, upload artifacts
- **Permissions**: `contents: read`, `actions: read`

### **Release Workflow** (`release.yml`)

- **Token**: `GITHUB_TOKEN` (automatic)
- **Operations**: Orchestrate releases
- **Permissions**: `contents: write`, `packages: write`, `actions: read`

### **Release Extensions Workflow** (`release-extensions.yml`)

- **Token**: `GITHUB_TOKEN` (automatic)
- **Operations**:
  - Git operations (commit, push, PR creation)
  - GitHub releases creation
  - Version bumping
- **Permissions**: `contents: write`, `packages: write`, `actions: read`

### **Release NPM Workflow** (`release-npm.yml`)

- **Token**: `GITHUB_TOKEN`, `NPM_TOKEN`
- **Operations**: NPM package publishing
- **Permissions**: `contents: write`, `packages: write`, `actions: read`

### **Automerge Workflow** (`automerge.yml`)

- **Token**: `GITHUB_TOKEN`
- **Operations**: Automatic PR merging
- **Permissions**: `contents: write`, `pull-requests: write`, `actions: read`

### **Validate PR Workflow** (`validatePR.yml`)

- **Token**: `GITHUB_TOKEN` (automatic)
- **Operations**: PR validation, linting
- **Permissions**: `contents: read`, `pull-requests: read`, `actions: read`

### **Benchmark Workflow** (`benchmark.yml`)

- **Token**: `GITHUB_TOKEN`
- **Operations**: Performance benchmarking, GitHub Pages deployment
- **Permissions**: `deployments: write`, `contents: write`

### **Stale Workflow** (`stale.yml`)

- **Token**: `GITHUB_TOKEN` (automatic)
- **Operations**: Close stale issues and PRs
- **Permissions**: `issues: write`, `pull-requests: write`, `actions: read`

## 🔒 Security Best Practices

### **1. Token Rotation**

- Rotate `VSCE_PERSONAL_ACCESS_TOKEN` and `OVSX_PAT` regularly
- Use minimal required permissions for each token
- Set expiration dates on PAT tokens

### **2. Audit Logging**

All authentication events are logged:

```bash
# Audit log entry example
[2024-01-15T10:30:00Z] AUTH_ATTEMPT: actor=github-actions, repo=owner/repo, operation=git_push, success=true
```

### **3. Input Validation**

All workflow inputs are validated for security threats:

- Path traversal attempts
- XSS attempts
- Malicious command injection

### **4. Error Handling**

Authentication failures are handled gracefully:

```bash
if ! gh auth status >/dev/null 2>&1; then
  echo "❌ Error: GitHub CLI authentication failed"
  exit 1
fi
```

## 🚨 Troubleshooting

### **Common Authentication Issues**

1. **"GITHUB_TOKEN is not set"**

   - Ensure the workflow has proper permissions
   - Check that the token is being passed correctly

2. **"GitHub CLI authentication failed"**

   - Verify the token has the required permissions
   - Check if the token has expired

3. **"Permission denied" errors**

   - Review workflow permissions
   - Ensure branch protection rules allow the operation

4. **Marketplace publishing failures**
   - Verify `VSCE_PERSONAL_ACCESS_TOKEN` or `OVSX_PAT` are set
   - Check token permissions for marketplace publishing

### **Debugging Steps**

1. **Enable debug logging**:

   ```bash
   export GITHUB_TOKEN_DEBUG=1
   ```

2. **Test authentication manually**:

   ```bash
   gh auth status
   ```

3. **Check token permissions**:
   ```bash
   gh api user
   ```

## 📞 Security Contact

For authentication security issues, contact:

- **Email**: security@forcedotcom.com
- **Subject**: [SECURITY] Apex Language Support - Authentication Issue

## 🔄 Token Rotation Schedule

- **GITHUB_TOKEN**: Automatic (managed by GitHub)
- **VSCE_PERSONAL_ACCESS_TOKEN**: Every 90 days
- **OVSX_PAT**: Every 90 days
- **NPM_TOKEN**: Every 90 days

## 📊 Monitoring

All authentication events are monitored and logged for:

- Failed authentication attempts
- Unusual access patterns
- Token usage statistics
- Security policy violations
