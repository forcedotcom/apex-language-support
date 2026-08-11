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
  unlinkSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { generateApexStubs } from './apexStubGenerator.js';
import { TARGET_NAMESPACES } from './api-stub-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Configuration
const INPUT_DIR = join(projectRoot, 'build', 'api-stubs');
const OUTPUT_DIR = join(projectRoot, 'src', 'resources', 'StandardApexLibrary');
const BUILTINS_DIR = join(projectRoot, 'src', 'resources', 'builtins');
const METADATA_FILE = join(INPUT_DIR, 'fetch-metadata.json');
const GENERATION_METADATA_FILE = join(INPUT_DIR, 'generation-metadata.json');

export const targetNamespaces = TARGET_NAMESPACES;
const SAFE_PATH_COMPONENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

// List of builtin classes that should NOT be overwritten
// These are hand-crafted overrides. Most live in src/resources/builtins/;
// several System overrides remain in StandardApexLibrary/System.
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
  if (
    namespace === 'System' &&
    [...BUILTIN_CLASSES].some(
      (builtin) => builtin.toLowerCase() === filename.toLowerCase(),
    )
  ) {
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

export function validateCapture(metadata, inputDir, targetNamespaces = TARGET_NAMESPACES) {
  const invalidNamespaces = [];

  for (const namespace of targetNamespaces) {
    const info = metadata.namespaces?.[namespace];
    if (!SAFE_PATH_COMPONENT.test(namespace)) {
      invalidNamespaces.push(`${namespace} (invalid namespace)`);
    } else if (!info) {
      invalidNamespaces.push(`${namespace} (missing metadata)`);
    } else if (info.error) {
      invalidNamespaces.push(`${namespace} (${info.error})`);
    } else if (!info.filename || !existsSync(join(inputDir, info.filename))) {
      invalidNamespaces.push(`${namespace} (missing input file)`);
    }
  }

  if (invalidNamespaces.length > 0) {
    throw new Error(
      `Capture is incomplete; refusing destructive regeneration: ${invalidNamespaces.join(', ')}`,
    );
  }
}

export function cleanNamespaceDirectory(outputDir, namespace) {
  const namespaceDir = join(outputDir, namespace);
  if (!existsSync(namespaceDir)) return 0;

  let removed = 0;
  for (const entry of readdirSync(namespaceDir, { withFileTypes: true })) {
    if (entry.isFile() && !shouldSkipFile(entry.name, namespace)) {
      unlinkSync(join(namespaceDir, entry.name));
      removed++;
    }
  }
  return removed;
}

function loadNamespaceStubs(namespace, jsonFilePath) {
  const jsonData = JSON.parse(readFileSync(jsonFilePath, 'utf8'));
  if (!Array.isArray(jsonData.typeStubs) || jsonData.typeStubs.length === 0) {
    throw new Error(`No type stubs found in ${jsonFilePath}`);
  }

  return generateApexStubs(jsonData)
    .filter((stub) => !shouldSkipFile(stub.filename, namespace))
    .map((stub) => {
      if (!SAFE_PATH_COMPONENT.test(stub.filename.replace(/\.cls$/, ''))) {
        throw new Error(`Invalid generated filename: ${stub.filename}`);
      }
      return stub;
    });
}

/**
 * Generate .cls files for a namespace
 */
function generateNamespace(namespace, stubs) {
  console.log(`\n   Namespace: ${namespace}`);

  // Create namespace directory
  const namespaceDir = join(OUTPUT_DIR, namespace);
  if (!existsSync(namespaceDir)) {
    mkdirSync(namespaceDir, { recursive: true });
  }

  let generated = 0;
  // Write .cls files
  for (const stub of stubs) {
    const outputPath = join(namespaceDir, stub.filename);
    writeFileSync(outputPath, stub.source, 'utf8');
    generated++;
  }

  console.log(`   ✓ Generated ${generated} files`);

  return { generated };
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
  validateCapture(fetchMetadata, INPUT_DIR);
  console.log(`   Fetched at: ${fetchMetadata.fetchedAt}`);
  console.log(`   Total types: ${fetchMetadata.totalTypes}`);
  console.log(`   Namespaces: ${Object.keys(fetchMetadata.namespaces).length}`);

  const generatedStubs = new Map();
  for (const namespace of TARGET_NAMESPACES) {
    const info = fetchMetadata.namespaces[namespace];
    generatedStubs.set(
      namespace,
      loadNamespaceStubs(namespace, join(INPUT_DIR, info.filename)),
    );
  }

  // Clean generated files only from namespaces this capture replaces.
  console.log('\n2. Cleaning existing namespace directories...');
  if (existsSync(OUTPUT_DIR)) {
    let removed = 0;
    for (const namespace of TARGET_NAMESPACES) {
      removed += cleanNamespaceDirectory(OUTPUT_DIR, namespace);
    }
    console.log(`   ✓ Removed ${removed} generated files`);
  } else {
    console.log(`   ⊘ Output directory does not exist yet`);
  }

  // Generate stubs for TARGET_NAMESPACES only
  console.log('\n3. Generating .cls files for embedded namespaces...');
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

  for (const [namespace, stubs] of generatedStubs) {
    const result = generateNamespace(namespace, stubs);
    generationMetadata.namespaces[namespace] = { generated: result.generated };
    totalGenerated += result.generated;
  }

  totalExcluded = Object.keys(fetchMetadata.namespaces).filter(
    (namespace) => !TARGET_NAMESPACES.has(namespace),
  ).length;

  generationMetadata.totalGenerated = totalGenerated;
  generationMetadata.totalSkipped = totalSkipped;

  // Write generation metadata
  console.log('\n4. Writing generation metadata...');
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('\n❌ Generation failed:', error);
    process.exit(1);
  });
}
