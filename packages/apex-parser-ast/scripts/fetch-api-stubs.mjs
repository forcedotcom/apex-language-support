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
 * Usage:
 *   npm run fetch:api-stubs
 *   node scripts/fetch-api-stubs.mjs [--org <alias>] [--api-version <version>]
 *
 * Options:
 *   --org <alias>         Salesforce org alias (default: $APEX_STUBS_ORG or 'gus')
 *   --api-version <ver>   API version to use (default: v67.0)
 *   --namespace <ns>      Fetch only specific namespace (default: all)
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
  readFileSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Configuration
const OUTPUT_DIR = join(projectRoot, 'src', 'resources', 'ApiStubs');
const METADATA_FILE = join(OUTPUT_DIR, 'fetch-metadata.json');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    org: process.env.APEX_STUBS_ORG || 'gus',
     apiVersion: 'latest',
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
 * Execute sf api request rest command
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
 * Discover all unique namespaces by fetching all classes
 */
async function discoverNamespaces(config) {
  console.log('\n1. Discovering namespaces...');
  const allStubs = await fetchSymbols(config, 'CLASS');

  const namespaces = new Set();
  for (const stub of allStubs) {
    // Extract namespace from the stub
    // Could be in stub.namespace or inferred from stub.name
    let ns = 'System'; // default
    if (stub.namespace) {
      ns = stub.namespace;
    } else if (stub.name && stub.name.includes('.')) {
      // Handle names like "ConnectApi.Something"
      ns = stub.name.split('.')[0];
    }
    namespaces.add(ns);
  }

  const nsList = Array.from(namespaces).sort();
  console.log(`   Found ${nsList.length} namespaces: ${nsList.slice(0, 10).join(', ')}${nsList.length > 10 ? '...' : ''}`);
  return nsList;
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

  // Discover namespaces if not specified
  const namespaces = config.namespace
    ? [config.namespace]
    : await discoverNamespaces(config);

  console.log(`\n2. Fetching stubs for ${namespaces.length} namespace(s)...`);

  const metadata = {
    fetchedAt: new Date().toISOString(),
    org: config.org,
    apiVersion: config.apiVersion,
    category: config.category,
    namespaces: {},
    totalTypes: 0,
  };

  let totalTypes = 0;

  for (const namespace of namespaces) {
    try {
      console.log(`\n   Namespace: ${namespace}`);
      const stubs = await fetchSymbols(config, config.category, namespace);

      if (stubs.length === 0) {
        console.log(`   ⚠️  No types found in namespace ${namespace}`);
        continue;
      }

      console.log(`   ✓ Fetched ${stubs.length} types`);

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
      console.error(`   ❌ Failed to fetch namespace ${namespace}: ${error.message}`);
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
