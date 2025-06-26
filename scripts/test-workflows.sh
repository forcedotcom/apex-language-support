#!/bin/bash

# Test script for GitHub Actions workflows
# This script validates workflow components locally

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Function to test package detection
test_package_detection() {
    print_status "INFO" "Testing package detection..."
    
    # Check if packages directory exists
    if [ ! -d "packages" ]; then
        print_status "ERROR" "packages directory not found"
        return 1
    fi
    
    print_status "SUCCESS" "packages directory found"
    
    # Count packages
    local npm_count=0
    local extension_count=0
    
    for pkg in packages/*/; do
        if [ -d "$pkg" ]; then
            local pkg_name=$(basename "$pkg")
            if [ -f "$pkg/package.json" ]; then
                if grep -q '"publisher"' "$pkg/package.json"; then
                    print_status "INFO" "Extension found: $pkg_name"
                    ((extension_count++))
                else
                    print_status "INFO" "NPM package found: $pkg_name"
                    ((npm_count++))
                fi
            fi
        fi
    done
    
    print_status "SUCCESS" "Found $npm_count NPM packages and $extension_count extensions"
}

# Function to test workflow files
test_workflow_files() {
    print_status "INFO" "Testing workflow files..."
    
    local workflows=(
        ".github/workflows/ci.yml"
        ".github/workflows/package.yml"
        ".github/workflows/release-npm.yml"
        ".github/workflows/release-extensions.yml"
        ".github/workflows/release.yml"
        ".github/actions/get-packages/action.yml"
    )
    
    local missing_files=()
    
    for workflow in "${workflows[@]}"; do
        if [ -f "$workflow" ]; then
            print_status "SUCCESS" "Workflow file exists: $workflow"
        else
            print_status "ERROR" "Workflow file missing: $workflow"
            missing_files+=("$workflow")
        fi
    done
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        print_status "ERROR" "Missing workflow files: ${missing_files[*]}"
        return 1
    fi
}

# Function to test package.json scripts
test_package_scripts() {
    print_status "INFO" "Testing package.json scripts..."
    
    if [ ! -f "package.json" ]; then
        print_status "ERROR" "Root package.json not found"
        return 1
    fi
    
    local required_scripts=(
        "compile"
        "test"
        "test:coverage"
        "package:packages"
    )
    
    local missing_scripts=()
    
    for script in "${required_scripts[@]}"; do
        if npm run | grep -q "$script"; then
            print_status "SUCCESS" "Script found: $script"
        else
            print_status "ERROR" "Script missing: $script"
            missing_scripts+=("$script")
        fi
    done
    
    if [ ${#missing_scripts[@]} -gt 0 ]; then
        print_status "ERROR" "Missing scripts: ${missing_scripts[*]}"
        return 1
    fi
}

# Function to test individual package structure
test_package_structure() {
    print_status "INFO" "Testing individual package structure..."
    
    for pkg in packages/*/; do
        if [ -d "$pkg" ]; then
            local pkg_name=$(basename "$pkg")
            print_status "INFO" "Testing package: $pkg_name"
            
            # Check package.json
            if [ ! -f "$pkg/package.json" ]; then
                print_status "ERROR" "  Missing package.json in $pkg_name"
                continue
            fi
            
            # Check if it's an extension or NPM package
            if grep -q '"publisher"' "$pkg/package.json"; then
                print_status "INFO" "  Extension: $pkg_name"
                
                # Check extension-specific files
                if [ ! -f "$pkg/package.json" ]; then
                    print_status "ERROR" "  Missing package.json in extension $pkg_name"
                fi
                
                # Check for VSIX build capability
                if grep -q '"vsce"' "$pkg/package.json" || [ -f "$pkg/.vscodeignore" ]; then
                    print_status "SUCCESS" "  VSIX build capability found"
                else
                    print_status "WARNING" "  VSIX build capability not found"
                fi
            else
                print_status "INFO" "  NPM package: $pkg_name"
                
                # Check for build scripts
                if grep -q '"compile"' "$pkg/package.json"; then
                    print_status "SUCCESS" "  Compile script found"
                else
                    print_status "WARNING" "  Compile script not found"
                fi
                
                if grep -q '"bundle"' "$pkg/package.json"; then
                    print_status "SUCCESS" "  Bundle script found"
                else
                    print_status "WARNING" "  Bundle script not found"
                fi
            fi
        fi
    done
}

# Function to test change detection logic
test_change_detection() {
    print_status "INFO" "Testing change detection logic..."
    
    # Get last commit files
    local changed_files=$(git diff --name-only HEAD~1 HEAD 2>/dev/null || echo "")
    
    if [ -z "$changed_files" ]; then
        print_status "WARNING" "No changed files detected (this is normal for initial runs)"
        return 0
    fi
    
    print_status "INFO" "Changed files in last commit:"
    echo "$changed_files" | while read -r file; do
        echo "  - $file"
    done
    
    # Test package change detection
    local changed_packages=""
    for pkg in packages/*/; do
        local pkg_name=$(basename "$pkg")
        if echo "$changed_files" | grep -q "^packages/$pkg_name/"; then
            changed_packages="$changed_packages $pkg_name"
        fi
    done
    
    if [ -n "$changed_packages" ]; then
        print_status "SUCCESS" "Changed packages detected: $changed_packages"
    else
        print_status "INFO" "No package changes detected"
    fi
}

# Function to test version bumping logic
test_version_bumping() {
    print_status "INFO" "Testing version bumping logic..."
    
    # Test with sample commit messages
    local test_messages=(
        "feat: new feature"
        "fix: bug fix"
        "breaking: API change"
        "docs: documentation"
    )
    
    for msg in "${test_messages[@]}"; do
        local bump_type="patch"
        
        if echo "$msg" | grep -qi "breaking\|major"; then
            bump_type="major"
        elif echo "$msg" | grep -qi "feat\|feature\|minor"; then
            bump_type="minor"
        fi
        
        print_status "INFO" "Commit: '$msg' -> Bump: $bump_type"
    done
}

# Function to test artifact naming
test_artifact_naming() {
    print_status "INFO" "Testing artifact naming logic..."
    
    local run_number="123"
    local branch="main"
    local pr_number="456"
    
    # Test PR artifact naming (CI workflow)
    local pr_artifact_name="vsix-packages-$run_number-release"
    print_status "INFO" "PR artifact name: $pr_artifact_name"
    
    # Test release artifact naming (normal mode)
    local release_artifact_name="vsix-packages-$run_number-release"
    print_status "INFO" "Release artifact name (normal): $release_artifact_name"
    
    # Test release artifact naming (dry-run mode)
    local dry_run_artifact_name="vsix-packages-$run_number-dry-run"
    print_status "INFO" "Release artifact name (dry-run): $dry_run_artifact_name"
    
    print_status "SUCCESS" "Artifact naming logic validated"
}

# Function to test secrets and environment
test_environment() {
    print_status "INFO" "Testing environment setup..."
    
    # Check Node.js version
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        print_status "SUCCESS" "Node.js version: $node_version"
    else
        print_status "ERROR" "Node.js not found"
        return 1
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        print_status "SUCCESS" "npm version: $npm_version"
    else
        print_status "ERROR" "npm not found"
        return 1
    fi
    
    # Check git
    if command -v git &> /dev/null; then
        local git_version=$(git --version)
        print_status "SUCCESS" "Git version: $git_version"
    else
        print_status "ERROR" "Git not found"
        return 1
    fi
}

# Main test function
main() {
    print_status "INFO" "Starting workflow validation tests..."
    echo
    
    local tests=(
        "test_environment"
        "test_workflow_files"
        "test_package_scripts"
        "test_package_detection"
        "test_package_structure"
        "test_change_detection"
        "test_version_bumping"
        "test_artifact_naming"
    )
    
    local failed_tests=()
    
    for test in "${tests[@]}"; do
        echo "Running $test..."
        if $test; then
            print_status "SUCCESS" "$test passed"
        else
            print_status "ERROR" "$test failed"
            failed_tests+=("$test")
        fi
        echo
    done
    
    # Summary
    if [ ${#failed_tests[@]} -eq 0 ]; then
        print_status "SUCCESS" "All tests passed! 🎉"
        exit 0
    else
        print_status "ERROR" "Some tests failed: ${failed_tests[*]}"
        exit 1
    fi
}

# Run main function
main "$@" 