#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Script to generate a minimal index of non-bundled namespace types.
 *
 * This extracts just the type names and kinds from the API stub JSON files
 * for namespaces NOT in TARGET_NAMESPACES. The resulting file is tracked
 * in git and used during the normal build process to populate TypeRegistry
 * with api-only type entries.
 *
 * This separates the manual stub capture phase (which requires API access)
 * from the automatic build phase (which works from tracked artifacts).
 *
 * Usage:
 *   npm run generate:non-bundled-index
 *   node scripts/generate-non-bundled-index.mjs
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Configuration
const INPUT_DIR = join(projectRoot, 'build', 'api-stubs');
const OUTPUT_FILE = join(projectRoot, 'src', 'resources', 'non-bundled-types.json');
const METADATA_FILE = join(INPUT_DIR, 'fetch-metadata.json');

// TARGET_NAMESPACES: bundled namespaces that generate .cls files
// Duplicated from fetch-api-stubs.mjs and generate-stdlib-cache.mjs
// These are excluded from the non-bundled index
const TARGET_NAMESPACES = [
  'System',
  'Database',
  'Schema',
  'ApexPages',
  'Auth',
  'Cache',
  'Canvas',
  'ChatterAnswers',
  'DataSource',
  'Dom',
  'Flow',
  'KbManagement',
  'Messaging',
  'Process',
  'QuickAction',
  'Reports',
  'Search',
  'Site',
  'Support',
  'UserProvisioning',
  'Approval',
  'EventBus',
  'Metadata',
  'TerritoryMgmt',
  'TxnSecurity',
  'AppLauncher',
  'AuraEnabled',
  'Datacloud',
  'FeatureManagement',
  'LxScheduler',
  'Slack',
  'Wave',
  'Workflow',
  'NetworksConnect',
  'PredictionService',
  'Sage',
  'SObjectType',
  'TimeZone',
  'Trigger',
  'UserInfo',
  'Limits',
  'Version',
  'PageReference',
  'SelectOption',
  'Test',
  'Type',
  'Organization',
  'Pattern',
  'Matcher',
  'Crypto',
  'EncodingUtil',
  'Math',
  'JSON',
];

/**
 * Extract minimal type information from API stub JSON
 */
function extractTypeInfo(stub) {
  const kind = stub.kind;
  if (!kind || !['CLASS', 'INTERFACE', 'ENUM'].includes(kind)) {
    return null;
  }

  const name = stub.name;
  if (!name) {
    return null;
  }

  return { name, kind };
}

/**
 * Main function
 */
function main() {
  console.log('=== Non-Bundled Type Index Generator ===');
  console.log(`Input: ${INPUT_DIR}`);
  console.log(`Output: ${OUTPUT_FILE}`);

  // Check that input directory exists
  if (!existsSync(INPUT_DIR)) {
    console.error('\n❌ Error: API stubs directory not found');
    console.error(`   Expected: ${INPUT_DIR}`);
    console.error('   Run "npm run fetch:api-stubs" first');
    process.exit(1);
  }

  // Read metadata if it exists
  let metadata = null;
  if (existsSync(METADATA_FILE)) {
    try {
      metadata = JSON.parse(readFileSync(METADATA_FILE, 'utf8'));
    } catch (error) {
      console.warn(`\n⚠️  Warning: Could not read metadata: ${error.message}`);
    }
  }

  // Read all JSON files
  console.log('\n1. Scanning API stub files...');
  const files = readdirSync(INPUT_DIR).filter(
    (f) => f.endsWith('.json') && f !== 'fetch-metadata.json' && f !== 'generation-metadata.json'
  );
  console.log(`   Found ${files.length} namespace files`);

  // Process non-bundled namespaces
  console.log('\n2. Extracting type information...');
  const namespaces = {};
  let totalTypes = 0;
  let skippedNamespaces = 0;

  for (const file of files) {
    const namespace = basename(file, '.json');

    // Skip if in TARGET_NAMESPACES (bundled)
    if (TARGET_NAMESPACES.includes(namespace)) {
      skippedNamespaces++;
      continue;
    }

    try {
      const jsonPath = join(INPUT_DIR, file);
      const jsonContent = readFileSync(jsonPath, 'utf8');
      const data = JSON.parse(jsonContent);

      if (!data.typeStubs || !Array.isArray(data.typeStubs)) {
        console.warn(`   ⚠️  Skipping ${namespace}: no typeStubs array`);
        continue;
      }

      const types = [];
      for (const stub of data.typeStubs) {
        const typeInfo = extractTypeInfo(stub);
        if (typeInfo) {
          types.push(typeInfo);
        }
      }

      if (types.length > 0) {
        namespaces[namespace] = types;
        totalTypes += types.length;
        console.log(`   ✓ ${namespace}: ${types.length} types`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to process ${namespace}: ${error.message}`);
    }
  }

  // Build output
  const output = {
    apiVersion: metadata?.apiVersion || 'unknown',
    generatedAt: new Date().toISOString(),
    description: 'Minimal type index for non-bundled Salesforce platform namespaces. ' +
                 'Used to populate TypeRegistry with api-only entries during build.',
    namespaces,
    stats: {
      totalNamespaces: Object.keys(namespaces).length,
      totalTypes,
    },
  };

  // Write output
  console.log('\n3. Writing non-bundled index...');
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
  console.log(`   ✓ ${OUTPUT_FILE}`);

  console.log('\n=== Generation Complete ===');
  console.log(`   Non-bundled namespaces: ${output.stats.totalNamespaces}`);
  console.log(`   Total types: ${output.stats.totalTypes}`);
  console.log(`   Excluded (bundled) namespaces: ${skippedNamespaces}`);
  console.log(`   File size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
}

main();
