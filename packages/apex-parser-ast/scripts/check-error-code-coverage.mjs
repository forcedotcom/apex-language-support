#!/usr/bin/env node
/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Extract error code keys from generated messages file
 */
async function extractMessageKeys() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageRoot = path.resolve(__dirname, '..');
  const messagesPath = path.join(
    packageRoot,
    'src',
    'generated',
    'messages_en_US.ts',
  );

  const content = await readFile(messagesPath, 'utf-8');

  // Extract keys from the ErrorCodeKey type definition
  const typeMatch = content.match(/export type ErrorCodeKey\s*=\s*([\s\S]*?);/);
  if (!typeMatch) {
    throw new Error('Could not find ErrorCodeKey type definition');
  }

  const typeContent = typeMatch[1];
  // Extract all quoted strings (error code keys)
  const keyMatches = typeContent.matchAll(/'([^']+)'/g);
  const keys = Array.from(keyMatches, (match) => match[1]);

  return new Set(keys);
}

/**
 * Find which error code keys are actually used in the codebase
 * Searches for direct string literal usage of error codes
 */
async function findUsedErrorCodes(messageKeys) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageRoot = path.resolve(__dirname, '..');
  const srcPath = path.join(packageRoot, 'src');

  const files = await findTypeScriptFiles(srcPath);
  const usedKeys = new Set();

  // Search for usage patterns:
  // - Direct string literals: 'error.code.key'
  // - Template literals: `error.code.key`
  // - getLabelTyped('error.code.key', ...)
  // - code: ErrorCodeKey = 'error.code.key'
  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf-8');
      
      // Check each message key for usage
      for (const key of messageKeys) {
        // Pattern: 'error.code.key' or "error.code.key" or `error.code.key`
        const literalPattern = new RegExp(
          `['"\`]${key.replace(/\./g, '\\.')}['"\`]`,
          'g',
        );
        if (literalPattern.test(content)) {
          usedKeys.add(key);
        }
      }
    } catch (error) {
      // Skip files that can't be read
      console.warn(`Warning: Could not read ${filePath}: ${error.message}`);
    }
  }

  return usedKeys;
}

/**
 * Recursively find all TypeScript files in a directory
 */
async function findTypeScriptFiles(dir, fileList = []) {
  const files = await readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      // Skip node_modules, out, dist, coverage, .git, etc.
      if (
        !file.name.startsWith('.') &&
        file.name !== 'node_modules' &&
        file.name !== 'out' &&
        file.name !== 'dist' &&
        file.name !== 'coverage' &&
        file.name !== '.wireit'
      ) {
        await findTypeScriptFiles(filePath, fileList);
      }
    } else if (file.name.endsWith('.ts') && !file.name.endsWith('.d.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}


/**
 * Generate coverage report
 */
function generateReport(messageKeys, usedKeys) {
  const unusedKeys = new Set(
    [...messageKeys].filter((key) => !usedKeys.has(key)),
  );

  const totalMessages = messageKeys.size;
  const totalUsed = usedKeys.size;
  const coveragePercent = ((totalUsed / totalMessages) * 100).toFixed(1);

  console.log('\n📊 Error Code Coverage Report\n');
  console.log('═'.repeat(60));
  console.log(`Total error codes available:     ${totalMessages}`);
  console.log(`Error codes used in codebase:     ${totalUsed}`);
  console.log(`Coverage:                        ${coveragePercent}%`);
  console.log('═'.repeat(60));

  if (unusedKeys.size > 0) {
    console.log(`\n⚠️  Unused error codes (${unusedKeys.size}):`);
    console.log('─'.repeat(60));
    console.log(
      '  These are in messages_en_US.ts but not used anywhere in the codebase:',
    );
    const sortedUnused = [...unusedKeys].sort();
    sortedUnused.forEach((key) => {
      console.log(`  • ${key}`);
    });
  }

  if (unusedKeys.size === 0) {
    console.log('\n✅ All error codes are being used!');
  }

  console.log('\n');
}

/**
 * Main function
 */
async function checkCoverage() {
  try {
    console.log('🔍 Checking error code coverage...\n');

    const messageKeys = await extractMessageKeys();
    
    console.log('🔎 Searching for error code usage in codebase...');
    const usedKeys = await findUsedErrorCodes(messageKeys);

    generateReport(messageKeys, usedKeys);
  } catch (error) {
    console.error('❌ Error checking coverage:', error);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkCoverage();
}

export { checkCoverage };
