#!/usr/bin/env node

/**
 * End-to-end build script for the Apex Language Server monorepo.
 *
 * Packages involved:
 * • packages/apex-ls-node
 * • packages/apex-lsp-vscode-extension
 *
 * Workflow summary:
 * 1. Clean and reinstall root dependencies.
 * 2. Clean both packages.
 * 3. Install & precompile the VS Code extension assets.
 * 4. Bundle apex-ls-node.
 * 5. Bundle the extension.
 * 6. Package the extension with `vsce`.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Color output for better visibility
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

/**
 * Logs a message with color formatting
 * @param {string} message - The message to log
 * @param {'info' | 'success' | 'warning' | 'error'} type - The type of message
 */
function log(message, type = 'info') {
  const colorMap = {
    info: colors.blue,
    success: colors.green,
    warning: colors.yellow,
    error: colors.red
  };
  
  const color = colorMap[type] || colors.reset;
  console.log(`${color}${colors.bright}[${type.toUpperCase()}]${colors.reset} ${message}`);
}

const ROOT_DIR = path.resolve(__dirname, '..');
const PACKAGE_DIRS = {
  apexLsNode: path.join(ROOT_DIR, 'packages', 'apex-ls-node'),
  vscodeExtension: path.join(ROOT_DIR, 'packages', 'apex-lsp-vscode-extension')
};

/**
 * Verifies that all required package directories exist.
 */
function assertWorkspaceLayout() {
  Object.entries(PACKAGE_DIRS).forEach(([name, dir]) => {
    if (!fs.existsSync(dir)) {
      log(`Required directory not found: ${dir} (${name})`, 'error');
      process.exit(1);
    }
  });
}

/**
 * Executes an arbitrary function wrapped with standardised logging/error-handling.
 * @param {() => void} fn – synchronous function representing the build step.
 * @param {string} description – human-readable description of what the step does.
 */
function runStep(fn, description) {
  log(`${description}...`, 'info');
  try {
    fn();
    log(`✅ ${description} completed successfully`, 'success');
  } catch (error) {
    log(`❌ ${description} failed`, 'error');
    log(error.message || String(error), 'error');
    process.exit(1);
  }
}

/**
 * Returns a closure that runs an arbitrary shell command with execSync.
 * @param {string} command – command to execute.
 * @param {string} cwd – working directory.
 */
const cmd = (command, cwd) => () => execSync(command, { cwd, stdio: 'inherit', encoding: 'utf8' });

/**
 * Removes the provided directory path recursively – no-op if it does not exist.
 */
const cleanDir = dir => () => {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

/**
 * Declarative list of steps executed in sequence.
 * Each entry is a tuple [description, function].
 */
const STEPS = [
  ['Cleaning root node_modules directory', cleanDir(path.join(ROOT_DIR, 'node_modules'))],
  ['Installing root dependencies', cmd('npm install', ROOT_DIR)],
  ['Cleaning apex-ls-node package', cmd('npm run clean', PACKAGE_DIRS.apexLsNode)],
  ['Cleaning apex-lsp-vscode-extension package', cmd('npm run clean', PACKAGE_DIRS.vscodeExtension)],
  ['Installing VSCode extension dependencies', cmd('npm install', PACKAGE_DIRS.vscodeExtension)],
  ['Precompiling VSCode extension assets', cmd('npm run precompile', PACKAGE_DIRS.vscodeExtension)],
  ['Bundling apex-ls-node package', cmd('npm run bundle', PACKAGE_DIRS.apexLsNode)],
  ['Bundling VSCode extension', cmd('npm run bundle', PACKAGE_DIRS.vscodeExtension)],
  ['Packaging VSCode extension', cmd('npm run package', PACKAGE_DIRS.vscodeExtension)]
];

/**
 * Entry-point orchestrating the full build.
 */
function buildAndPackage() {
  assertWorkspaceLayout();
  log('🚀 Starting build and package process', 'info');

  STEPS.forEach(([description, fn]) => runStep(fn, description));

  log('🎉 Build and package process completed successfully!', 'success');
}

// Replace old main call with refactored implementation
if (require.main === module) {
  buildAndPackage();
}

module.exports = { buildAndPackage }; 