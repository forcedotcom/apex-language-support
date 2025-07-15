# Workflow Migration Progress: Bash to Node.js

This document tracks the progress of migrating bash steps in GitHub workflows to Node.js scripts.

## Migration Overview

We are migrating complex bash logic in GitHub workflows to TypeScript/Node.js scripts for better maintainability, type safety, and debugging capabilities.

## ✅ Completed Migrations

### 1. determine-build-type

- **File**: `.github/workflows/release-extensions.yml`
- **Script**: `ext-build-type.ts`
- **Status**: ✅ Complete
- **Command**: `npx tsx .github/scripts/index.ts ext-build-type`

### 2. find-promotion-candidate

- **File**: `.github/workflows/release-extensions.yml`
- **Script**: `ext-promotion-finder.ts`
- **Status**: ✅ Complete
- **Command**: `npx tsx .github/scripts/index.ts ext-promotion-finder`

### 3. determine-changes

- **File**: `.github/workflows/release-extensions.yml`
- **Script**: `ext-change-detector.ts`
- **Status**: ✅ Complete
- **Command**: `npx tsx .github/scripts/index.ts ext-change-detector`

### 4. display-release-plan

- **File**: `.github/workflows/release-extensions.yml`
- **Script**: `ext-release-plan.ts`
- **Status**: ✅ Complete
- **Command**: `npx tsx .github/scripts/index.ts ext-release-plan`

## 🔄 In Progress

### 5. bump-versions

- **File**: `.github/workflows/release-extensions.yml`
- **Script**: `ext-version-bumper.ts` (needs implementation)
- **Status**: 🔄 TODO Comment Added
- **Command**: `npx tsx .github/scripts/index.ts ext-version-bumper`

### 6. determine-publish-matrix

- **File**: `.github/workflows/release-extensions.yml`
- **Script**: `ext-publish-matrix.ts` (needs implementation)
- **Status**: 🔄 TODO Comment Added
- **Command**: `npx tsx .github/scripts/index.ts ext-publish-matrix`

## 📋 Remaining Work

### 7. create-github-releases

- **File**: `.github/workflows/release-extensions.yml`
- **Script**: `ext-github-releases.ts` (needs creation)
- **Status**: 📋 Not Started
- **Complexity**: High - involves GitHub API calls, release creation, file uploads

### 8. publish (audit steps)

- **File**: `.github/workflows/release-extensions.yml`
- **Script**: `ext-publish-audit.ts` (needs creation)
- **Status**: 📋 Not Started
- **Complexity**: Medium - audit logging and validation

### 9. slack-notify

- **File**: `.github/workflows/release-extensions.yml`
- **Script**: `ext-slack-notify.ts` (needs creation)
- **Status**: 📋 Not Started
- **Complexity**: Low - notification formatting

## Implementation Notes

### Script Structure

All scripts follow this pattern:

1. Use Commander.js for CLI argument parsing
2. Export main functions for use in other modules
3. Include proper error handling and logging
4. Use TypeScript interfaces for type safety
5. Follow the existing code style and patterns

### Workflow Integration

- Scripts are called via `npx tsx .github/scripts/index.ts <command>`
- Environment variables are passed as command-line arguments
- Outputs are set using `console.log("key=value")` format
- Error handling includes proper exit codes

### Testing

- Scripts can be tested locally with sample data
- Use `--dry-run` flags where appropriate
- Validate outputs match expected GitHub Actions format

## Next Steps

1. **Complete ext-version-bumper implementation**
   - Implement version calculation logic
   - Add npm version command execution
   - Handle promotion scenarios

2. **Complete ext-publish-matrix implementation**
   - Implement matrix generation logic
   - Add proper JSON output formatting
   - Test with various registry combinations

3. **Create ext-github-releases script**
   - Implement GitHub API integration
   - Handle release note generation
   - Manage VSIX file uploads

4. **Create remaining scripts**
   - ext-publish-audit
   - ext-slack-notify

5. **Update workflow files**
   - Replace remaining bash steps
   - Add proper error handling
   - Update documentation

## Benefits of Migration

- **Type Safety**: TypeScript provides compile-time error checking
- **Maintainability**: Easier to read, debug, and modify
- **Reusability**: Scripts can be used in multiple workflows
- **Testing**: Unit tests can be written for individual functions
- **Documentation**: Better IDE support and JSDoc comments
- **Error Handling**: More robust error handling and logging
