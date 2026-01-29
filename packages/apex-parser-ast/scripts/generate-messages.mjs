/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Parse Java .properties file format
 * Handles:
 * - Key-value pairs separated by = or :
 * - Escaped characters (\n, \t, \\, \:, \=)
 * - Multi-line values (continuation with \)
 * - Unicode escapes (\uXXXX)
 * - Comments (# or !)
 */
function parseProperties(content) {
  const messages = new Map();
  const lines = content.split(/\r?\n/);
  let currentKey = null;
  let currentValue = '';
  let inContinuation = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      continue;
    }

    // Skip comments
    if (line.trim().startsWith('#') || line.trim().startsWith('!')) {
      continue;
    }

    // Check for continuation (line ends with \)
    if (line.endsWith('\\') && !line.endsWith('\\\\')) {
      line = line.slice(0, -1); // Remove trailing \
      inContinuation = true;
    } else {
      inContinuation = false;
    }

    // If we're continuing a previous line
    if (currentKey !== null) {
      currentValue += line;
      if (!inContinuation) {
        // Finish this entry
        messages.set(currentKey, unescapeValue(currentValue));
        currentKey = null;
        currentValue = '';
      }
      continue;
    }

    // Find key-value separator (= or :)
    const separatorIndex = findSeparatorIndex(line);
    if (separatorIndex === -1) {
      // No separator found, skip this line
      continue;
    }

    const key = unescapeKey(line.substring(0, separatorIndex).trim());
    let value = line.substring(separatorIndex + 1);

    if (inContinuation) {
      currentKey = key;
      currentValue = value;
    } else {
      messages.set(key, unescapeValue(value));
    }
  }

  // Handle case where file ends with continuation
  if (currentKey !== null) {
    messages.set(currentKey, unescapeValue(currentValue));
  }

  return messages;
}

/**
 * Find the index of the key-value separator (= or :), handling escaped separators
 */
function findSeparatorIndex(line) {
  let i = 0;
  while (i < line.length) {
    if (line[i] === '\\') {
      i += 2; // Skip escaped character
      continue;
    }
    if (line[i] === '=' || line[i] === ':') {
      return i;
    }
    i++;
  }
  return -1;
}

/**
 * Unescape key (handles basic escapes)
 */
function unescapeKey(key) {
  return key.replace(/\\(.)/g, (match, char) => {
    switch (char) {
      case '\\':
        return '\\';
      case ':':
        return ':';
      case '=':
        return '=';
      default:
        return match; // Keep other escapes as-is
    }
  });
}

/**
 * Unescape value (handles \n, \t, \\, \uXXXX, etc.)
 */
function unescapeValue(value) {
  // Trim leading/trailing whitespace
  value = value.trim();

  // Handle Unicode escapes (\uXXXX)
  value = value.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Handle other escapes
  value = value.replace(/\\(.)/g, (match, char) => {
    switch (char) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case 'r':
        return '\r';
      case '\\':
        return '\\';
      case ':':
        return ':';
      case '=':
        return '=';
      default:
        return match; // Keep other escapes as-is
    }
  });

  return value;
}

/**
 * Generate TypeScript module from properties Map
 */
function generateTypeScriptModule(messages) {
  const entries = Array.from(messages.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      // Escape single quotes and backslashes in value
      const escapedValue = value
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
      // Return as array literal string: ['key', 'value']
      return `  ['${key}', '${escapedValue}']`;
    });

  return `/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// This file is auto-generated during build from messages_en_US.properties
// @ts-nocheck
/* eslint-disable max-len */
// DO NOT EDIT - This file is generated automatically

/**
 * English error messages from jorje's messages_en_US.properties
 * Generated at build time for browser/web worker compatibility
 * Messages use MessageFormat-style placeholders: {0}, {1}, etc.
 */
export const messages: Map<string, string> = new Map([
${entries.join(',\n')}
]);
`;
}

/**
 * Main function to generate messages TypeScript module
 *
 * Source: The messages_en_US.properties file should be manually copied from Jorje:
 *   Source: /path/to/apex-jorje/apex-jorje-services/src/main/resources/messages_en_US.properties
 *   Destination: packages/apex-parser-ast/resources/messages_en_US.properties
 *
 * To sync with Jorje:
 *   1. Ensure apex-jorje repository is cloned locally
 *   2. Copy the file manually:
 *      cp /path/to/apex-jorje/apex-jorje-services/src/main/resources/messages_en_US.properties \
 *         packages/apex-parser-ast/resources/messages_en_US.properties
 *   3. Run this script to regenerate messages_en_US.ts in src/generated/
 *
 * Note: This script only reads from the local .properties file and generates TypeScript.
 * It does NOT automatically copy from Jorje - that must be done manually to maintain
 * control over which messages are included and to handle any necessary modifications.
 */
async function generateMessages() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageRoot = path.resolve(__dirname, '..');

    const propertiesPath = path.join(
      packageRoot,
      'src',
      'resources',
      'messages',
      'messages_en_US.properties',
    );
    const outputPath = path.join(
      packageRoot,
      'src',
      'generated',
      'messages_en_US.ts',
    );

    console.log(`Reading properties file: ${propertiesPath}`);
    console.log(
      `ℹ️  Note: This file should be manually synced from Jorje's messages_en_US.properties`,
    );
    const content = await readFile(propertiesPath, 'utf-8');

    console.log('Parsing properties file...');
    const messages = parseProperties(content);

    console.log(`Found ${messages.size} message entries`);

    console.log('Generating TypeScript module...');
    const tsContent = generateTypeScriptModule(messages);

    console.log(`Writing output file: ${outputPath}`);
    await writeFile(outputPath, tsContent, 'utf-8');

    console.log(
      `✅ Generated messages TypeScript module with ${messages.size} entries`,
    );
    console.log(`📁 Output file: ${outputPath}`);

    return messages;
  } catch (error) {
    console.error('❌ Error generating messages:', error);
    process.exit(1);
  }
}

// Run the generation
generateMessages();
