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

async function extractCatalogKeys(filename) {
  const __filename = fileURLToPath(import.meta.url);
  const packageRoot = path.resolve(path.dirname(__filename), '..');
  const content = await readFile(
    path.join(packageRoot, 'src', 'resources', 'messages', filename),
    'utf-8',
  );
  const keys = new Set();
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const separatorIndex = trimmed.search(/(?<!\\)[=:]/);
    if (separatorIndex > 0) {
      keys.add(
        trimmed
          .slice(0, separatorIndex)
          .trim()
          .toUpperCase()
          .replace(/\./g, '_'),
      );
    }
  }
  return keys;
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
function generateErrorCodesReport(errorCodesKeys, usedKeys, legacyKeys, lsKeys) {
  const syntaxPrefixes = [
    'UNEXPECTED_',
    'UNMATCHED_',
    'MISMATCHED_',
    'MISSING_',
    'UNRECOGNIZED_',
    'INVALID_APEX_',
    'ILLEGAL_STRING_LITERAL',
    'ILLEGAL_INTEGER_LITERAL',
    'ILLEGAL_LONG_LITERAL',
    'ILLEGAL_DOUBLE_LITERAL',
    'ILLEGAL_DECIMAL_LITERAL',
  ];
  const classifications = {
    syntax: [],
    implemented: [],
    deferred: [],
    'compiler-only': [],
    'ls-only': [],
  };

  for (const key of errorCodesKeys) {
    if (lsKeys.has(key)) {
      classifications['ls-only'].push(key);
    } else if (syntaxPrefixes.some((prefix) => key.startsWith(prefix))) {
      classifications.syntax.push(key);
    } else if (usedKeys.has(key)) {
      classifications.implemented.push(key);
    } else if (legacyKeys.has(key)) {
      classifications.deferred.push(key);
    } else {
      classifications['compiler-only'].push(key);
    }
  }

  console.log('\n📊 Diagnostic Catalog Classification\n');
  console.log('═'.repeat(60));
  for (const [classification, keys] of Object.entries(classifications)) {
    console.log(`${classification.padEnd(16)} ${keys.length}`);
  }
  console.log('═'.repeat(60));
  console.log(
    '\nDeferred legacy diagnostics are expected until their parser-owned validators are implemented.\n',
  );
}

/**
 * Main function
 */
async function checkCoverage() {
  try {
    console.log('🔍 Classifying diagnostic catalog coverage...\n');

    // Check ErrorCodes.KEY_NAME usage
    console.log('📋 Extracting ErrorCodes keys...');
    const errorCodesKeys = await extractErrorCodesKeys();
    
    console.log('🔎 Searching for ErrorCodes.KEY_NAME usage in codebase...');
    const usedErrorCodesKeys = await findUsedErrorCodesKeys(errorCodesKeys);
    const legacyKeys = await extractCatalogKeys('messages_en_US.properties');
    const lsKeys = await extractCatalogKeys('messages_apex_ls.properties');

    generateErrorCodesReport(
      errorCodesKeys,
      usedErrorCodesKeys,
      legacyKeys,
      lsKeys,
    );
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
