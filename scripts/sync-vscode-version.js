#!/usr/bin/env node

/**
 * Manages the VS Code version used by this repo, pinned to match Code Builder Web.
 *
 * The canonical version lives in a local `.vscode-version` file at the repo root.
 * That file is committed and used as-is in CI.
 *
 * When run locally (without --check), fetches the latest value from the
 * code-builder-web repo (via `gh api`), writes it to `.vscode-version`,
 * and syncs package.json files.
 *
 * Updates:
 *   - engines.vscode (e.g. "^1.108.0")
 *   - devDependencies["@types/vscode"] (e.g. "^1.108.0")
 *
 * Usage: node scripts/sync-vscode-version.js [--check]
 *
 *   --check   Report drift without writing changes (useful in CI).
 *             Reads the committed `.vscode-version` file only.
 *
 *   (default) Fetches the latest version from the Code Builder Web repo,
 *             writes it to `.vscode-version`, and updates package.json files.
 *
 * Other scripts can import `readLocalVSCodeVersion` to read the pinned version.
 *
 * Source: https://github.com/forcedotcom/code-builder-web/blob/main/.vscode-version
 */

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const ROOT = join(__dirname, '..');
const VERSION_FILE = join(ROOT, '.vscode-version');
const CHECK_ONLY = process.argv.includes('--check');
const IS_CI = Boolean(process.env.CI);

const PACKAGE_JSONS = [
  'packages/apex-lsp-vscode-extension/package.json',
  'packages/apex-ls/package.json',
];

/**
 * Reads the VS Code version from the local `.vscode-version` file.
 * @returns {string} The version string (e.g. '1.108.0') or 'stable' if missing/invalid
 */
function readLocalVSCodeVersion() {
  try {
    const content = readFileSync(VERSION_FILE, 'utf-8').trim();

    if (/^\d+\.\d+\.\d+$/.test(content)) {
      return content;
    }

    console.warn(
      `Unexpected .vscode-version content: "${content}", falling back to 'stable'`,
    );
    return 'stable';
  } catch (error) {
    console.warn(`Could not read .vscode-version: ${error.message}`);
    return 'stable';
  }
}

/**
 * Fetches the VS Code version from the Code Builder Web repo and writes
 * it to the local `.vscode-version` file.
 *
 * Falls back to the existing local value on failure.
 *
 * @returns {Promise<string>} The resolved version string
 */
async function updateVSCodeVersionFromCBWeb() {
  try {
    const { stdout } = await execAsync(
      'gh api repos/forcedotcom/code-builder-web/contents/.vscode-version --jq .content',
    );

    const content = Buffer.from(stdout.trim(), 'base64')
      .toString('utf-8')
      .trim();

    if (/^\d+\.\d+\.\d+$/.test(content)) {
      writeFileSync(VERSION_FILE, content + '\n', 'utf-8');
      console.log(
        `Pinned VS Code version to ${content} (from code-builder-web/.vscode-version)`,
      );
      return content;
    }

    console.warn(
      `Unexpected .vscode-version content from cbweb: "${content}"`,
    );
    return readLocalVSCodeVersion();
  } catch (error) {
    console.warn(
      `Failed to fetch .vscode-version via gh CLI: ${error.message}`,
    );
    console.warn(`Ensure 'gh' is installed and authenticated (gh auth login)`);
    console.warn(`Falling back to local .vscode-version`);
    return readLocalVSCodeVersion();
  }
}

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
  let version;

  if (CHECK_ONLY || IS_CI) {
    version = readLocalVSCodeVersion();
  } else {
    version = await updateVSCodeVersionFromCBWeb();
  }

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

if (require.main === module) {
  main().catch((err) => {
    console.error(`Unexpected error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { readLocalVSCodeVersion };
