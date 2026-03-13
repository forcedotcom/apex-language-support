#!/usr/bin/env node

/**
 * Syncs VS Code version references across all package.json files to match
 * the pinned version in the Code Builder Web repo (.vscode-version).
 *
 * Updates:
 *   - engines.vscode (e.g. "^1.108.0")
 *   - devDependencies["@types/vscode"] (e.g. "^1.108.0")
 *
 * Usage: node scripts/sync-vscode-version.js [--check]
 *
 *   --check   Report drift without writing changes (useful in CI)
 */

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const { fetchCodeBuilderVSCodeVersion } = require('./fetch-vscode-version');

const ROOT = join(__dirname, '..');
const CHECK_ONLY = process.argv.includes('--check');

const PACKAGE_JSONS = [
  'packages/apex-lsp-vscode-extension/package.json',
  'packages/apex-ls/package.json',
];

/**
 * Update a single package.json, returning a list of fields that changed.
 * @param {string} relPath - Relative path from repo root
 * @param {string} target  - Target version (e.g. "1.108.0")
 * @returns {string[]} List of changed field descriptions
 */
function syncPackageJson(relPath, target) {
  const filePath = join(ROOT, relPath);
  const raw = readFileSync(filePath, 'utf-8');
  const pkg = JSON.parse(raw);
  const caretTarget = `^${target}`;
  const changes = [];

  if (pkg.engines?.vscode && pkg.engines.vscode !== caretTarget) {
    changes.push(`engines.vscode: ${pkg.engines.vscode} -> ${caretTarget}`);
    pkg.engines.vscode = caretTarget;
  }

  if (pkg.devDependencies?.['@types/vscode'] && pkg.devDependencies['@types/vscode'] !== caretTarget) {
    changes.push(`@types/vscode: ${pkg.devDependencies['@types/vscode']} -> ${caretTarget}`);
    pkg.devDependencies['@types/vscode'] = caretTarget;
  }

  if (changes.length > 0 && !CHECK_ONLY) {
    writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  }

  return changes;
}

async function main() {
  const version = await fetchCodeBuilderVSCodeVersion();

  if (version === 'stable') {
    console.error('Could not resolve a concrete version — aborting sync.');
    process.exit(1);
  }

  console.log(`Target VS Code version: ${version}`);
  console.log(CHECK_ONLY ? '(check-only mode — no files will be written)\n' : '');

  let totalChanges = 0;

  for (const relPath of PACKAGE_JSONS) {
    const changes = syncPackageJson(relPath, version);
    if (changes.length > 0) {
      console.log(`${relPath}:`);
      for (const c of changes) {
        console.log(`  ${c}`);
      }
      totalChanges += changes.length;
    } else {
      console.log(`${relPath}: up to date`);
    }
  }

  console.log('');

  if (totalChanges === 0) {
    console.log('All VS Code versions are in sync.');
  } else if (CHECK_ONLY) {
    console.error(`${totalChanges} version(s) out of sync. Run "npm run sync:vscode-version" to fix.`);
    process.exit(1);
  } else {
    console.log(`Updated ${totalChanges} version reference(s).`);
    console.log('Run "npm install" to update the lockfile.');
  }
}

main().catch((err) => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
