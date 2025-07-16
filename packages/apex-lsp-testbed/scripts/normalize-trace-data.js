#!/usr/bin/env node

/**
 * Utility script to normalize LSP trace data for portable testing.
 *
 * This script takes LSP trace data and normalizes all file URIs to use
 * relative paths instead of absolute paths, making the data portable
 * across different environments and contributors.
 *
 * Usage:
 *   node scripts/normalize-trace-data.js input.json output.json
 */

const fs = require('fs');
const path = require('path');

/**
 * Normalizes URIs in the trace data to use relative paths instead of absolute paths.
 * @param {Object} data - The trace data to normalize
 * @returns {Object} Normalized trace data
 */
function normalizeTraceData(data) {
  const normalizedData = JSON.parse(JSON.stringify(data));

  // Find the workspace root from the initialize request
  let workspaceRoot = '';
  for (const entry of Object.values(normalizedData)) {
    if (entry.type === 'request' && entry.method === 'initialize') {
      workspaceRoot = entry.params?.rootUri || entry.params?.rootPath || '';
      break;
    }
  }

  if (!workspaceRoot) {
    console.warn('No workspace root found in trace data');
    return normalizedData;
  }

  // Extract the workspace name from the root path
  const workspaceName =
    workspaceRoot.split('/').pop()?.replace('.git', '') || '';
  console.log(`Found workspace: ${workspaceName}`);
  console.log(`Original root: ${workspaceRoot}`);

  // Normalize all URIs in the trace data
  const normalizeUri = (uri) => {
    if (uri.startsWith('file://') && uri.includes(workspaceName)) {
      // Replace the absolute path with a relative path from the workspace root
      const relativePath = uri.split(workspaceName)[1] || '';
      const normalized = `file:///workspace${relativePath}`;
      console.log(`  ${uri} -> ${normalized}`);
      return normalized;
    }
    return uri;
  };

  // Recursively normalize URIs in the data
  const normalizeObject = (obj) => {
    if (typeof obj === 'string') {
      return normalizeUri(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(normalizeObject);
    } else if (obj && typeof obj === 'object') {
      const normalized = {};
      for (const [key, value] of Object.entries(obj)) {
        normalized[key] = normalizeObject(value);
      }
      return normalized;
    }
    return obj;
  };

  return normalizeObject(normalizedData);
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error(
      'Usage: node scripts/normalize-trace-data.js <input.json> <output.json>',
    );
    console.error('');
    console.error(
      'This script normalizes LSP trace data to make it portable across environments.',
    );
    console.error(
      'It replaces absolute file paths with relative paths using /workspace as the root.',
    );
    process.exit(1);
  }

  const [inputFile, outputFile] = args;

  try {
    // Read input file
    console.log(`Reading trace data from: ${inputFile}`);
    const inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

    // Normalize the data
    console.log('Normalizing trace data...');
    const normalizedData = normalizeTraceData(inputData);

    // Write output file
    console.log(`Writing normalized data to: ${outputFile}`);
    fs.writeFileSync(outputFile, JSON.stringify(normalizedData, null, 2));

    console.log('✅ Trace data normalized successfully!');
    console.log('');
    console.log(
      'The normalized data uses /workspace as the root path, making it portable',
    );
    console.log('across different environments and contributors.');
    console.log('');
    console.log('To use this data in tests:');
    console.log('1. Copy the normalized file to test/fixtures/');
    console.log('2. Update the import in your test file');
    console.log(
      '3. The test framework will automatically denormalize paths at runtime',
    );
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { normalizeTraceData };
