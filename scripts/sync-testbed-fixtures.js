#!/usr/bin/env node
/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Sync validation test fixtures from parser-ast to testbed
 *
 * This script copies all fixture classes from:
 *   packages/apex-parser-ast/test/fixtures/validation/
 * to:
 *   packages/apex-lsp-testbed/test/fixtures/i-have-problems/force-app/main/default/classes/
 *
 * Maintains directory structure. Excludes "Valid" fixtures by default.
 *
 * Usage:
 *   node scripts/sync-testbed-fixtures.js
 *   npm run sync:testbed-fixtures
 */

const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

const PARSER_AST_FIXTURES_ROOT = path.join(
  __dirname,
  '../packages/apex-parser-ast/test/fixtures/validation',
);

const TESTBED_FIXTURES_ROOT = path.join(
  __dirname,
  '../packages/apex-lsp-testbed/test/fixtures/i-have-problems/force-app/main/default/classes',
);

/**
 * Check if a file should be excluded from syncing
 */
function shouldExcludeFile(filename) {
  // Exclude "Valid" fixtures (they don't demonstrate errors)
  return filename.toLowerCase().startsWith('valid');
}

/**
 * Recursively copy fixtures from source to destination
 */
function copyFixturesRecursive(sourceDir, destDir, relativePath = '') {
  let copiedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  if (!fs.existsSync(sourceDir)) {
    return { copiedCount: 0, skippedCount: 0, errorCount: 0 };
  }

  // Ensure destination directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    const displayPath = relativePath
      ? `${relativePath}/${entry.name}`
      : entry.name;

    try {
      if (entry.isDirectory()) {
        // Recursively copy subdirectories
        const result = copyFixturesRecursive(
          sourcePath,
          destPath,
          displayPath,
        );
        copiedCount += result.copiedCount;
        skippedCount += result.skippedCount;
        errorCount += result.errorCount;
      } else if (entry.isFile() && entry.name.endsWith('.cls')) {
        // Skip "Valid" fixtures
        if (shouldExcludeFile(entry.name)) {
          skippedCount++;
          continue;
        }

        // Check if file already exists and is identical
        if (fs.existsSync(destPath)) {
          const sourceContent = fs.readFileSync(sourcePath, 'utf8');
          const destContent = fs.readFileSync(destPath, 'utf8');
          if (sourceContent === destContent) {
            skippedCount++;
            continue;
          }
        }

        // Copy file
        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ Copied: ${displayPath}`);
        copiedCount++;
      }
    } catch (error) {
      console.error(`❌ Error copying ${displayPath}:`, error.message);
      errorCount++;
    }
  }

  return { copiedCount, skippedCount, errorCount };
}

/**
 * Clean the testbed fixtures directory
 */
function cleanTestbedFixtures() {
  if (!fs.existsSync(TESTBED_FIXTURES_ROOT)) {
    return;
  }
  const entries = fs.readdirSync(TESTBED_FIXTURES_ROOT, {
    withFileTypes: true,
  });
  for (const entry of entries) {
    const entryPath = path.join(TESTBED_FIXTURES_ROOT, entry.name);
    try {
      if (entry.isDirectory()) {
        shell.rm('-rf', entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.cls')) {
        shell.rm('-f', entryPath);
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        continue; // Path vanished or unreadable (e.g. broken symlink); ok for cleanup
      }
      console.error(`Error removing ${entryPath}:`, error.message);
      throw error;
    }
  }
}

/**
 * Sync fixtures from parser-ast to testbed
 */
function syncFixtures() {
  console.log('Syncing validation fixtures to testbed...\n');

  // Clean existing fixtures first
  console.log('Cleaning existing fixtures...');
  cleanTestbedFixtures();

  const result = copyFixturesRecursive(
    PARSER_AST_FIXTURES_ROOT,
    TESTBED_FIXTURES_ROOT,
  );

  console.log('\n' + '='.repeat(50));
  console.log(`Summary:`);
  console.log(`  ✅ Copied: ${result.copiedCount} files`);
  console.log(`  ⏭️  Skipped (unchanged/excluded): ${result.skippedCount} files`);
  if (result.errorCount > 0) {
    console.log(`  ❌ Errors: ${result.errorCount} files`);
  }
  console.log('='.repeat(50));
}

// Run sync
if (require.main === module) {
  syncFixtures();
}

module.exports = { syncFixtures };
