#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Script to generate Apex .cls files from API stub JSON.
 *
 * This reads the JSON files fetched by fetch-api-stubs.mjs and converts
 * them to Apex source files using apexStubGenerator.js.
 *
 * Usage:
 *   npm run generate:api-stubs
 *   node scripts/generate-api-stubs.mjs
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { generateApexStubs } from './apexStubGenerator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Configuration
const INPUT_DIR = join(projectRoot, 'build', 'api-stubs');
const OUTPUT_DIR = join(projectRoot, 'src', 'resources', 'StandardApexLibrary');
const BUILTINS_DIR = join(projectRoot, 'src', 'resources', 'builtins');
const METADATA_FILE = join(INPUT_DIR, 'fetch-metadata.json');
const GENERATION_METADATA_FILE = join(INPUT_DIR, 'generation-metadata.json');

// Embedded namespaces - only these generate .cls files
// All other namespaces go into non-bundled-types.json (type awareness only)
const TARGET_NAMESPACES = new Set([
  'ApexPages',
  'AppLauncher',
  'Approval',
  'Auth',
  'Cache',
  'Canvas',
  'ChatterAnswers',
  'CommerceBuyGrp',
  'CommerceExtension',
  'CommercePayments',
  'CommerceTax',
  'Compression',
  'DataSource',
  'DataWeave',
  'Database',
  'Datacloud',
  'Dom',
  'EventBus',
  'Flow',
  'FormulaEval',
  'Functions',
  'Invocable',
  'IsvPartners',
  'KbManagement',
  'LxScheduler',
  'Messaging',
  'Metadata',
  'Pref_center',
  'Process',
  'QuickAction',
  'Reports',
  'RichMessaging',
  'Schema',
  'Search',
  'Sfc',
  'Sfdc_Checkout',
  'Sfdc_Enablement',
  'Sfdc_Surveys',
  'Site',
  'Slack',
  'Support',
  'System',
  'TerritoryMgmt',
  'TxnSecurity',
  'UserProvisioning',
  'VisualEditor',
  'Wave',
  'embeddedai',
  'flowuiruntime',
  'fsccashflow',
  'industriesNlpSvc',
  'ise_bots_apex',
  'setup_flow_performance',
]);

// List of builtin classes that should NOT be overwritten
// These are hand-crafted and live in src/resources/builtins/
// W-23491682: List/Map/Set returned with generic parameters from API,
// but hand-crafted versions are needed for correct symbol resolution
// Url.cls: API returns "Url" but hand-crafted uses "URL" casing (case-insensitive FS issue)
// String.cls: API version has toString() which breaks inheritance tests
// Exception.cls: API returns "Exception extends Exception" (circular inheritance)
const BUILTIN_CLASSES = new Set([
  'Blob.cls',
  'Integer.cls',
  'Long.cls',
  'Object.cls',
  'Continuation.cls',
  'RestContext.cls',
  'RestResponse.cls',
  'List.cls',
  'Map.cls',
  'Set.cls',
  'System.cls',
  'Url.cls',
  'String.cls',
  'Exception.cls',
]);

// Builtin classes in non-System namespaces
const BUILTIN_NAMESPACED_CLASSES = new Map([
  ['DMLOptions.cls', 'Database'],
  ['DescribeSObjectResult.cls', 'Schema'],
]);


/**
 * Check if a file should be skipped (is a builtin)
 */
function shouldSkipFile(filename, namespace) {
  // Skip if it's a System namespace builtin
  if (namespace === 'System' && BUILTIN_CLASSES.has(filename)) {
    return true;
  }

  // Skip if it's a namespaced builtin
  const builtinNamespace = BUILTIN_NAMESPACED_CLASSES.get(filename);
  if (builtinNamespace !== undefined && namespace === builtinNamespace) {
    return true;
  }

  return false;
}

/**
 * Load fetch metadata
 */
function loadFetchMetadata() {
  if (!existsSync(METADATA_FILE)) {
    throw new Error(
      'Fetch metadata not found. Run fetch-api-stubs.mjs first.',
    );
  }

  const content = readFileSync(METADATA_FILE, 'utf8');
  return JSON.parse(content);
}

/**
 * Generate .cls files for a namespace
 */
function generateNamespace(namespace, jsonFilePath) {
  console.log(`\n   Namespace: ${namespace}`);

  // Load JSON
  const jsonContent = readFileSync(jsonFilePath, 'utf8');
  const jsonData = JSON.parse(jsonContent);

  if (!jsonData.typeStubs || jsonData.typeStubs.length === 0) {
    console.log(`   ⚠️  No type stubs found in ${jsonFilePath}`);
    return { generated: 0, skipped: 0 };
  }

  // Generate stubs
  const stubs = generateApexStubs(jsonData);

  // Create namespace directory
  const namespaceDir = join(OUTPUT_DIR, namespace);
  if (!existsSync(namespaceDir)) {
    mkdirSync(namespaceDir, { recursive: true });
  }

  let generated = 0;
  let skipped = 0;

  // Write .cls files
  for (const stub of stubs) {
    // Check if this is a builtin that should be skipped
    if (shouldSkipFile(stub.filename, namespace)) {
      console.log(`   ⊘ Skipping builtin: ${stub.filename}`);
      skipped++;
      continue;
    }

    const outputPath = join(namespaceDir, stub.filename);
    writeFileSync(outputPath, stub.source, 'utf8');
    generated++;
  }

  console.log(`   ✓ Generated ${generated} files (skipped ${skipped} builtins)`);

  return { generated, skipped };
}

/**
 * Main function
 */
async function main() {
  const startTime = Date.now();

  console.log('=== Apex Stub Generator (from API JSON) ===');
  console.log(`Input: ${INPUT_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // Load fetch metadata
  console.log('\n1. Loading fetch metadata...');
  const fetchMetadata = loadFetchMetadata();
  console.log(`   Fetched at: ${fetchMetadata.fetchedAt}`);
  console.log(`   Total types: ${fetchMetadata.totalTypes}`);
  console.log(`   Namespaces: ${Object.keys(fetchMetadata.namespaces).length}`);

  // Generate stubs for TARGET_NAMESPACES only
  console.log('\n2. Generating .cls files for embedded namespaces...');
  console.log(`   Target namespaces: ${TARGET_NAMESPACES.size}`);

  const generationMetadata = {
    generatedAt: new Date().toISOString(),
    sourceChecksum: fetchMetadata.totalTypes,
    namespaces: {},
    totalGenerated: 0,
    totalSkipped: 0,
  };

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalExcluded = 0;

  for (const [namespace, info] of Object.entries(fetchMetadata.namespaces)) {
    // Skip namespaces not in TARGET_NAMESPACES (embedded set)
    if (!TARGET_NAMESPACES.has(namespace)) {
      totalExcluded++;
      continue;
    }

    if (info.error) {
      console.log(`\n   Namespace: ${namespace}`);
      console.log(`   ⚠️  Skipping due to fetch error: ${info.error}`);
      continue;
    }

    const jsonFilePath = join(INPUT_DIR, info.filename);
    if (!existsSync(jsonFilePath)) {
      console.log(`\n   Namespace: ${namespace}`);
      console.log(`   ⚠️  JSON file not found: ${jsonFilePath}`);
      continue;
    }

    try {
      const result = generateNamespace(namespace, jsonFilePath);
      generationMetadata.namespaces[namespace] = {
        generated: result.generated,
        skipped: result.skipped,
      };
      totalGenerated += result.generated;
      totalSkipped += result.skipped;
    } catch (error) {
      console.error(`   ❌ Failed to generate namespace ${namespace}: ${error.message}`);
      generationMetadata.namespaces[namespace] = {
        error: error.message,
      };
    }
  }

  generationMetadata.totalGenerated = totalGenerated;
  generationMetadata.totalSkipped = totalSkipped;

  // Write generation metadata
  console.log('\n3. Writing generation metadata...');
  writeFileSync(
    GENERATION_METADATA_FILE,
    JSON.stringify(generationMetadata, null, 2),
    'utf8',
  );
  console.log(`   ✓ ${GENERATION_METADATA_FILE}`);
  console.log(`   Excluded ${totalExcluded} non-embedded namespaces`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Generation Complete ===');
  console.log(`   Generated: ${totalGenerated} files`);
  console.log(`   Skipped: ${totalSkipped} builtins`);
  console.log(`   Namespaces: ${Object.keys(generationMetadata.namespaces).length}`);
  console.log(`   Time: ${elapsed}s`);
  console.log(`   Output: ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error('\n❌ Generation failed:', error);
  process.exit(1);
});
