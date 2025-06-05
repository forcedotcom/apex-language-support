#!/usr/bin/env node

/**
 * Build and Package Script
 * 
 * This script orchestrates the complete build and packaging process for:
 * - apex-ls-node package
 * - apex-lsp-vscode-extension package
 * 
 * Steps performed:
 * 1. Clean node_modules directory (root)
 * 2. Run npm install (root)
 * 3. Clean apex-ls-node package (including node_modules)
 * 4. Clean apex-lsp-vscode-extension package (including node_modules)
 * 5. Compile and build apex-ls-node package
 * 6. Run package:all script in apex-lsp-vscode-extension package
 *    (npm install for extension is handled by precompile step)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Recursively removes a directory and all its contents
 * @param {string} dirPath - Path to the directory to remove
 */
function removeDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return true;
    } catch (error) {
      // Fallback for older Node.js versions
      try {
        const rimraf = require('rimraf');
        rimraf.sync(dirPath);
        return true;
      } catch (fallbackError) {
        console.error(`Failed to remove directory ${dirPath}:`, error.message);
        return false;
      }
    }
  }
  return true;
}

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

/**
 * Executes a command with proper error handling and logging
 * @param {string} command - The command to execute
 * @param {string} cwd - The working directory
 * @param {string} description - Description of what the command does
 */
function executeCommand(command, cwd, description) {
  log(`${description}...`, 'info');
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      encoding: 'utf8'
    });
    log(`✅ ${description} completed successfully`, 'success');
  } catch (error) {
    log(`❌ Failed to ${description.toLowerCase()}`, 'error');
    log(`Error: ${error.message}`, 'error');
    process.exit(1);
  }
}

/**
 * Main build and package function
 */
function buildAndPackage() {
  const rootDir = path.resolve(__dirname, '..');
  const apexLsNodeDir = path.join(rootDir, 'packages', 'apex-ls-node');
  const apexLspVscodeExtensionDir = path.join(rootDir, 'packages', 'apex-lsp-vscode-extension');

  // Verify packages exist
  if (!fs.existsSync(apexLsNodeDir)) {
    log('apex-ls-node package directory not found', 'error');
    process.exit(1);
  }

  if (!fs.existsSync(apexLspVscodeExtensionDir)) {
    log('apex-lsp-vscode-extension package directory not found', 'error');
    process.exit(1);
  }

  log('Starting build and package process...', 'info');

  // Step 1: Clean node_modules directory
  log('Cleaning root node_modules directory...', 'info');
  const nodeModulesPath = path.join(rootDir, 'node_modules');
  if (removeDirectory(nodeModulesPath)) {
    log('✅ Cleaning root node_modules directory completed successfully', 'success');
  } else {
    log('❌ Failed to clean root node_modules directory', 'error');
    process.exit(1);
  }

  // Step 2: Run npm install
  executeCommand('npm install', rootDir, 'Installing dependencies');

  // Step 3: Clean apex-ls-node package
  executeCommand('npm run clean', apexLsNodeDir, 'Cleaning apex-ls-node package');

  // Step 4: Clean apex-lsp-vscode-extension package
  executeCommand('npm run clean', apexLspVscodeExtensionDir, 'Cleaning apex-lsp-vscode-extension package');

  // Step 5: Compile and build apex-ls-node package
  executeCommand('npm run compile', apexLsNodeDir, 'Compiling apex-ls-node package');
  executeCommand('npm run bundle', apexLsNodeDir, 'Building apex-ls-node package');

  // Step 6: Run package:all script in apex-lsp-vscode-extension (npm install handled by precompile step)
  executeCommand('npm run package:all', apexLspVscodeExtensionDir, 'Packaging apex-lsp-vscode-extension');

  log('🎉 Build and package process completed successfully!', 'success');
}

// Run the build and package process
if (require.main === module) {
  buildAndPackage();
}

module.exports = { buildAndPackage }; 