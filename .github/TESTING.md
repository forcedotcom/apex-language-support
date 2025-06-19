# Testing GitHub Actions Workflows

This document provides comprehensive guidance for testing the GitHub Actions CI/CD workflows in this repository.

## 🧪 Testing Strategy Overview

The testing strategy consists of multiple layers to ensure reliability:

1. **Local Validation** - Scripts and tools to test components locally
2. **Dry Run Workflows** - GitHub Actions that simulate releases without publishing
3. **Component Testing** - Individual workflow testing
4. **Integration Testing** - Full workflow testing with real artifacts

## 📋 Prerequisites

Before testing, ensure you have:

- Node.js 20.x or later
- npm 9.x or later
- Git with access to the repository
- GitHub repository with Actions enabled

## 🚀 Quick Start Testing

### 1. Run Local Validation Script

```bash
# Make script executable (if not already)
chmod +x scripts/test-workflows.sh

# Run comprehensive local tests
./scripts/test-workflows.sh
```

This script will:

- ✅ Validate workflow file existence
- ✅ Check package.json scripts
- ✅ Test package detection logic
- ✅ Validate package structure
- ✅ Test change detection
- ✅ Verify version bumping logic
- ✅ Check artifact naming

### 2. Test Individual Components

Use the manual testing workflow to test specific components:

1. Go to **Actions** tab in GitHub
2. Select **"Test Workflows Locally"**
3. Choose a test type:
   - **package-detection**: Test package discovery
   - **change-detection**: Test change detection logic
   - **artifact-creation**: Test VSIX creation
   - **version-bumping**: Test version calculation
   - **npm-publishing**: Test NPM package validation
   - **extension-publishing**: Test extension validation

### 3. Run Dry Run Release

Simulate a complete release without publishing:

1. Go to **Actions** tab in GitHub
2. Select **"Dry Run Release"**
3. Configure inputs:
   - **Branch**: Branch to test from (default: main)
   - **Packages**: NPM packages to test (default: all)
   - **Extensions**: Extensions to test (default: all)
   - **Registries**: Registries to test (default: vscode,openvsx)

## 🔍 Detailed Testing Guide

### Testing Package Detection

```bash
# Test the get-packages action locally
cd .github/actions/get-packages
node -e "
const fs = require('fs');
const path = require('path');

const packages = fs.readdirSync('../../../../packages')
  .filter(pkg => fs.statSync(path.join('../../../../packages', pkg)).isDirectory())
  .filter(pkg => fs.existsSync(path.join('../../../../packages', pkg, 'package.json')));

const npmPackages = [];
const extensions = [];

packages.forEach(pkg => {
  const pkgJson = JSON.parse(fs.readFileSync(path.join('../../../../packages', pkg, 'package.json')));
  if (pkgJson.publisher) {
    extensions.push(pkg);
  } else {
    npmPackages.push(pkg);
  }
});

console.log('NPM Packages:', npmPackages.join(','));
console.log('Extensions:', extensions.join(','));
"
```

### Testing Change Detection

```bash
# Test change detection logic
git diff --name-only HEAD~1 HEAD | grep "^packages/" | while read file; do
  pkg=$(echo $file | cut -d'/' -f2)
  echo "Changed package: $pkg"
done
```

### Testing Version Bumping

```bash
# Test version bump calculation
CURRENT_VERSION="1.2.3"
BUMP_TYPE="minor"

IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

case "$BUMP_TYPE" in
  "major")
    NEW_VERSION="$((MAJOR + 1)).0.0"
    ;;
  "minor")
    NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
    ;;
  "patch")
    NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
    ;;
esac

echo "Current: $CURRENT_VERSION -> New: $NEW_VERSION"
```

## 🧩 Component-Specific Testing

### Testing CI Workflow

1. **Trigger on PR**: Create a test PR to trigger CI
2. **Check Matrix**: Verify tests run on multiple OS/Node versions
3. **Validate Artifacts**: Check that VSIX packages are created
4. **Coverage Reports**: Verify coverage artifacts are uploaded

### Testing Package Workflow

1. **Manual Trigger**: Use workflow_dispatch to test packaging
2. **Artifact Validation**: Check VSIX files are created correctly
3. **Naming Convention**: Verify artifact names follow conventions

### Testing Release Workflows

1. **Dry Run First**: Always run dry-run workflow before actual release
2. **Version Validation**: Check version bumping logic
3. **Change Detection**: Verify only changed packages are released
4. **Registry Testing**: Test publishing to different registries

## 🐛 Troubleshooting Common Issues

### Issue: Workflow Not Triggering

**Symptoms**: Workflow doesn't run when expected

**Solutions**:

- Check workflow file syntax: `yamllint .github/workflows/*.yml`
- Verify trigger conditions in workflow file
- Check branch protection rules
- Ensure Actions are enabled in repository settings

### Issue: Package Detection Failing

**Symptoms**: Wrong packages detected or missing packages

**Solutions**:

- Run local validation script: `./scripts/test-workflows.sh`
- Check package.json files for correct structure
- Verify publisher field presence/absence
- Test get-packages action manually

### Issue: Version Bumping Incorrect

**Symptoms**: Wrong version calculated or no version bump

**Solutions**:

- Check commit message format (conventional commits)
- Verify version bump logic in workflow
- Test version calculation manually
- Check package.json version format

### Issue: Artifact Upload Failing

**Symptoms**: Artifacts not created or not downloadable

**Solutions**:

- Check artifact naming (avoid special characters)
- Verify file paths exist before upload
- Check GitHub Actions storage limits
- Ensure proper permissions

### Issue: Publishing Failing

**Symptoms**: Packages/extensions not published

**Solutions**:

- Verify secrets are configured correctly
- Check registry authentication
- Validate package.json structure
- Test with dry-run workflow first

## 🔧 Advanced Testing

### Testing with Different Branches

```bash
# Test workflow on feature branch
git checkout -b test-workflow
# Make changes
git commit -m "test: testing workflow changes"
git push origin test-workflow

# Trigger workflow manually with branch parameter
```

### Testing with Different Node Versions

```bash
# Test locally with different Node versions
nvm use 18
npm test

nvm use 20
npm test

nvm use node
npm test
```

### Testing Artifact Downloads

```bash
# Download artifacts from workflow run
gh run download <run-id> --dir artifacts

# Verify artifact contents
ls -la artifacts/
file artifacts/*.vsix
```

## 📊 Testing Checklist

Before running actual releases, ensure:

- [ ] Local validation script passes
- [ ] Dry run workflow completes successfully
- [ ] All required secrets are configured
- [ ] Package.json files are valid
- [ ] Version bumping logic is correct
- [ ] Change detection works as expected
- [ ] Artifact naming follows conventions
- [ ] Registry authentication is working

## 🚨 Emergency Testing

For urgent fixes or hotfixes:

1. **Quick Test**: Run local validation script
2. **Branch Test**: Test on feature branch first
3. **Dry Run**: Use dry-run workflow with specific packages
4. **Limited Release**: Release only changed packages
5. **Monitor**: Watch workflow execution closely

## 📝 Testing Logs

Keep track of testing results:

```bash
# Create testing log
echo "$(date): Testing workflow components" >> testing.log
./scripts/test-workflows.sh 2>&1 | tee -a testing.log
```

## 🔄 Continuous Testing

For ongoing development:

1. **Pre-commit**: Run local validation before commits
2. **PR Checks**: Ensure CI passes on all PRs
3. **Regular Dry Runs**: Test release process weekly
4. **Version Monitoring**: Track version bumps and releases

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Artifact Management](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
