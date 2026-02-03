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
 * Extract error code keys from ErrorCodes.ts namespace object
 */
async function extractErrorCodesKeys() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageRoot = path.resolve(__dirname, '..');
  const errorCodesPath = path.join(
    packageRoot,
    'src',
    'generated',
    'ErrorCodes.ts',
  );

  const content = await readFile(errorCodesPath, 'utf-8');

  // Extract keys from the ErrorCodes object: export const ErrorCodes = { KEY_NAME, ... }
  // Match the object literal and extract property names
  const objectMatch = content.match(
    /export const ErrorCodes\s*=\s*\{([\s\S]*?)\}\s*as\s*const;/,
  );
  if (!objectMatch) {
    throw new Error('Could not find ErrorCodes object definition');
  }

  const objectContent = objectMatch[1];
  // Extract property names (shorthand properties: KEY_NAME,)
  const keyMatches = objectContent.matchAll(/^\s+([A-Z_][A-Z0-9_]*),/gm);
  const keys = Array.from(keyMatches, (match) => match[1]);

  return new Set(keys);
}

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
 * Find which ErrorCodes keys are actually used in the codebase
 * Searches for ErrorCodes.KEY_NAME usage patterns
 */
async function findUsedErrorCodesKeys(errorCodesKeys) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const packageRoot = path.resolve(__dirname, '..');
  const srcPath = path.join(packageRoot, 'src');
  const testPath = path.join(packageRoot, 'test');

  const allFiles = [
    ...(await findTypeScriptFiles(srcPath)),
    ...(await findTypeScriptFiles(testPath)),
  ];
  // Exclude ErrorCodes.ts itself - it's the definition file, not usage
  const files = allFiles.filter(
    (file) => !file.includes('ErrorCodes.ts'),
  );
  const usedKeys = new Set();

  // Search for usage patterns:
  // - ErrorCodes.KEY_NAME (dot notation)
  // - ErrorCodes['KEY_NAME'] (bracket notation)
  // - const { KEY_NAME } = ErrorCodes (destructuring)
  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf-8');
      
      // Check each ErrorCodes key for usage
      for (const key of errorCodesKeys) {
        // Pattern: ErrorCodes.KEY_NAME
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const dotNotationPattern = new RegExp(
          `ErrorCodes\\.${escapedKey}\\b`,
        );
        // Pattern: ErrorCodes['KEY_NAME'] or ErrorCodes["KEY_NAME"]
        const bracketNotationPattern = new RegExp(
          `ErrorCodes\\[['"]${escapedKey}['"]\\]`,
        );
        // Pattern: const { KEY_NAME } = ErrorCodes or const { KEY_NAME: alias } = ErrorCodes
        const destructuringPattern = new RegExp(
          `\\{[^}]*\\b${escapedKey}\\b[^}]*\\}\\s*=\\s*ErrorCodes`,
        );
        
        if (
          dotNotationPattern.test(content) ||
          bracketNotationPattern.test(content) ||
          destructuringPattern.test(content)
        ) {
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
 * Generate coverage report for ErrorCodes keys
 */
function generateErrorCodesReport(errorCodesKeys, usedKeys) {
  const unusedKeys = new Set(
    [...errorCodesKeys].filter((key) => !usedKeys.has(key)),
  );

  const totalKeys = errorCodesKeys.size;
  const totalUsed = usedKeys.size;
  const coveragePercent = ((totalUsed / totalKeys) * 100).toFixed(1);

  console.log('\n📊 ErrorCodes Key Usage Report\n');
  console.log('═'.repeat(60));
  console.log(`Total ErrorCodes keys defined:    ${totalKeys}`);
  console.log(`ErrorCodes keys used:             ${totalUsed}`);
  console.log(`Coverage:                        ${coveragePercent}%`);
  console.log('═'.repeat(60));

  if (unusedKeys.size > 0) {
    console.log(`\n⚠️  Unused ErrorCodes keys (${unusedKeys.size}):`);
    console.log('─'.repeat(60));
    console.log(
      '  These ErrorCodes keys are defined but never used (may indicate unimplemented validations):',
    );
    const sortedUnused = [...unusedKeys].sort();
    sortedUnused.forEach((key) => {
      console.log(`  • ${key}`);
    });
    console.log('\n');
    return false; // Return false to indicate unused keys found
  }

  if (unusedKeys.size === 0) {
    console.log('\n✅ All ErrorCodes keys are being used!');
    console.log('\n');
  }

  return true; // Return true if all keys are used
}

/**
 * Generate coverage report for string literal error codes
 */
function generateReport(messageKeys, usedKeys) {
  const unusedKeys = new Set(
    [...messageKeys].filter((key) => !usedKeys.has(key)),
  );

  const totalMessages = messageKeys.size;
  const totalUsed = usedKeys.size;
  const coveragePercent = ((totalUsed / totalMessages) * 100).toFixed(1);

  console.log('\n📊 Error Code Coverage Report (String Literals)\n');
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
    console.log('🔍 Checking ErrorCodes key usage...\n');

    // Check ErrorCodes.KEY_NAME usage
    console.log('📋 Extracting ErrorCodes keys...');
    const errorCodesKeys = await extractErrorCodesKeys();
    
    console.log('🔎 Searching for ErrorCodes.KEY_NAME usage in codebase...');
    const usedErrorCodesKeys = await findUsedErrorCodesKeys(errorCodesKeys);

    const allErrorCodesUsed = generateErrorCodesReport(
      errorCodesKeys,
      usedErrorCodesKeys,
    );

    // Exit with error code if unused ErrorCodes keys found
    if (!allErrorCodesUsed) {
      process.exit(1);
    }
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
