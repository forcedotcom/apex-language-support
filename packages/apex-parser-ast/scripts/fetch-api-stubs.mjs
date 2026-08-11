#!/usr/bin/env node
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Script to fetch Apex type stubs from the Salesforce Symbol Table API.
 *
 * This uses `sf api request rest` to authenticate and fetch stub definitions
 * in JSON format from the Tooling API.
 *
 * DESIGN DECISION: Fetch All, Filter During Generation
 * -----------------------------------------------------
 * This script fetches ALL available namespaces from the API by discovering
 * them dynamically (no namespace filter in API call). The TARGET_NAMESPACES
 * constant is used during generation, not fetch:
 * - generate-api-stubs.mjs: Creates .cls files only for TARGET_NAMESPACES
 * - generate-stdlib-cache.mjs: Includes bundled types (from .cls) +
 *   non-bundled types (from JSON) in TypeRegistry
 *
 * This two-tier approach provides:
 * - Full symbol data for 53 bundled namespaces (TARGET_NAMESPACES)
 * - Type awareness for all other namespaces (e.g., ConnectApi)
 * - Predictable bundle size (only TARGET_NAMESPACES generate .cls files)
 *
 * Usage:
 *   npm run fetch:api-stubs
 *   node scripts/fetch-api-stubs.mjs [--org <alias>] [--api-version <version>]
 *
 * Options:
 *   --org <alias>         Salesforce org alias (default: $APEX_STUBS_ORG or 'gus')
 *   --api-version <ver>   API version to use (default: v67.0)
 *   --namespace <ns>      Fetch only specific namespace (skips discovery)
 *   --category <cat>      Category filter: BUILTIN, DATABASE, DYNAMIC (default: BUILTIN)
 *
 * Environment:
 *   APEX_STUBS_ORG        Default org alias (overridden by --org flag)
 */

import { spawn } from 'child_process';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Configuration
const OUTPUT_DIR = join(projectRoot, 'build', 'api-stubs');
const METADATA_FILE = join(OUTPUT_DIR, 'fetch-metadata.json');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    org: process.env.APEX_STUBS_ORG || 'gus',
    apiVersion: 'v67.0',
    namespace: null,
    category: 'BUILTIN', // Valid values: BUILTIN, DATABASE, DYNAMIC
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--org' && i + 1 < args.length) {
      config.org = args[++i];
    } else if (args[i] === '--api-version' && i + 1 < args.length) {
      config.apiVersion = args[++i];
    } else if (args[i] === '--namespace' && i + 1 < args.length) {
      config.namespace = args[++i];
    } else if (args[i] === '--category' && i + 1 < args.length) {
      config.category = args[++i];
    }
  }

  return config;
}

/**
 * Execute sf api request rest command with streaming
 */
function sfApiRequest(url, orgAlias) {
  return new Promise((resolve, reject) => {
    console.log(`  Fetching: ${url}`);

    const child = spawn('sf', ['api', 'request', 'rest', url, '-o', orgAlias], {
      stdio: ['ignore', 'pipe', 'pipe'], // collect stderr for error diagnostics
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        console.error(`  ❌ Failed to fetch: ${url}`);
        console.error(`     Error: ${stderr || `Command exited with code ${code}`}`);
        reject(new Error(stderr || `Command exited with code ${code}`));
        return;
      }

      // Success: parse JSON from stdout (stderr warnings are ignored on exit code 0)
      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        console.error(`  ❌ Failed to parse JSON response`);
        console.error(`     Error: ${error.message}`);
        reject(error);
      }
    });

    child.on('error', (error) => {
      console.error(`  ❌ Failed to spawn sf command`);
      console.error(`     Error: ${error.message}`);
      reject(error);
    });
  });
}

/**
 * Fetch symbols for a specific category and optional namespace
 */
async function fetchSymbols(config, category, namespace = null) {
  let query = `category=${category}`;
  if (namespace !== null) {
    query += `&namespace=${encodeURIComponent(namespace)}`;
  }

  const url = `/services/data/${config.apiVersion}/tooling/symbols?${query}`;
  const response = await sfApiRequest(url, config.org);

  return response.typeStubs || [];
}

/**
 * Extract namespace from a type stub
 */
function extractNamespace(stub) {
  if (stub.namespace) {
    return stub.namespace;
  } else if (stub.namespacePrefix) {
    return stub.namespacePrefix;
  } else if (stub.name && stub.name.includes('.')) {
    return stub.name.split('.')[0];
  }
  return 'System'; // default
}

/**
 * Fetch all stubs and group by namespace
 */
async function fetchAndGroupByNamespace(config) {
  console.log('\n1. Fetching all stubs from API...');

  // If specific namespace requested, fetch only that one
  if (config.namespace) {
    console.log(`   Fetching specific namespace: ${config.namespace}`);
    const stubs = await fetchSymbols(config, config.category, config.namespace);
    return { [config.namespace]: stubs };
  }

  // Otherwise fetch all namespaces in one call
  const allStubs = await fetchSymbols(config, config.category);
  console.log(`   ✓ Fetched ${allStubs.length} total types`);

  // Group by namespace
  const grouped = {};
  for (const stub of allStubs) {
    const ns = extractNamespace(stub);
    if (!grouped[ns]) {
      grouped[ns] = [];
    }
    grouped[ns].push(stub);
  }

  const namespaceList = Object.keys(grouped).sort();
  console.log(`   Found ${namespaceList.length} namespaces: ${namespaceList.slice(0, 10).join(', ')}${namespaceList.length > 10 ? '...' : ''}`);

  return grouped;
}

/**
 * Fetch all stubs organized by namespace
 */
async function fetchAllStubs(config) {
  const startTime = Date.now();

  console.log('=== Apex Symbol Table API Stub Fetcher ===');
  console.log(`Org: ${config.org}`);
  console.log(`API Version: ${config.apiVersion}`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Fetch all stubs in one API call and group by namespace
  const groupedStubs = await fetchAndGroupByNamespace(config);

  console.log('\n2. Writing namespace files...');

  const metadata = {
    fetchedAt: new Date().toISOString(),
    org: config.org,
    apiVersion: config.apiVersion,
    category: config.category,
    namespaces: {},
    totalTypes: 0,
  };

  let totalTypes = 0;

  for (const [namespace, stubs] of Object.entries(groupedStubs)) {
    try {
      if (stubs.length === 0) {
        console.log(`   ⚠️  No types found in namespace ${namespace}`);
        continue;
      }

      console.log(`   ${namespace}: ${stubs.length} types`);

      // Save to file
      const filename = `${namespace}.json`;
      const filepath = join(OUTPUT_DIR, filename);
      const content = JSON.stringify({ typeStubs: stubs }, null, 2);
      writeFileSync(filepath, content, 'utf8');

      // Calculate checksum
      const checksum = createHash('sha256').update(content).digest('hex');

      metadata.namespaces[namespace] = {
        filename,
        typeCount: stubs.length,
        checksum: checksum.substring(0, 16),
      };

      totalTypes += stubs.length;
    } catch (error) {
      console.error(`   ❌ Failed to write namespace ${namespace}: ${error.message}`);
      metadata.namespaces[namespace] = {
        error: error.message,
      };
    }
  }

  metadata.totalTypes = totalTypes;

  // Write metadata file
  console.log('\n3. Writing metadata...');
  writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2), 'utf8');
  console.log(`   ✓ ${METADATA_FILE}`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Fetch Complete ===');
  console.log(`   Total types: ${totalTypes}`);
  console.log(`   Namespaces: ${Object.keys(metadata.namespaces).length}`);
  console.log(`   Time: ${elapsed}s`);
  console.log(`   Output: ${OUTPUT_DIR}`);
}

/**
 * Main function
 */
async function main() {
  try {
    const config = parseArgs();
    await fetchAllStubs(config);
  } catch (error) {
    console.error('\n❌ Fetch failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
