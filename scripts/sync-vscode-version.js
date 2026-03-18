#!/usr/bin/env node

/**
 * Manages the VS Code version used by this repo, pinned to match Code Builder Web.
 *
 * The canonical version lives in a local `.vscode-version` file at the repo root.
 * That file is committed and used as-is in CI.
 *
 * When run locally (without --check), fetches the latest value from the
 * code-builder-web repo (via `gh api`) and writes it to `.vscode-version`.
 *
 * Note: Neither engines.vscode nor @types/vscode are synced here. Both must
 * be set independently based on actual requirements. The script only validates
 * that engines.vscode minimum does not exceed the test harness version.
 *
 * Usage: node scripts/sync-vscode-version.js [--check]
 *
 *   --check   Report drift without writing changes (useful in CI).
 *             Reads the committed `.vscode-version` file only.
 *
 *   (default) Fetches the latest version from the Code Builder Web repo
 *             and writes it to `.vscode-version`.
 *
 * Other scripts can import `readLocalVSCodeVersion` to read the pinned version.
 *
 * Source: https://github.com/forcedotcom/code-builder-web/blob/main/.vscode-version
 */

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const semver = require('semver');

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
 * Emit a warning or CI error for a version that exceeds the test harness version.
 * @param {string} label   - Human-readable field name for the message
 * @param {string} version - The version string to check (e.g. "^1.110.0" or "1.110.0")
 * @param {string} target  - Test harness version (e.g. "1.108.0")
 * @param {string} relPath - Package path, for context in the message
 */
function guardVersion(label, version, target, relPath) {
  const minVersion = semver.minVersion(version)?.version;
  if (minVersion && semver.gt(minVersion, target)) {
    const msg =
      `${relPath}: ${label} (${minVersion}) exceeds the test harness version (${target}). ` +
      `Lower ${label} or update .vscode-version.`;
    if (CHECK_ONLY) {
      console.error(`ERROR: ${msg}`);
      process.exitCode = 1;
    } else {
      console.warn(`WARNING: ${msg}`);
    }
  }
}

/**
 * Guard: warn (or error in CI/--check) if engines.vscode or @types/vscode
 * exceed the test harness version. Does not modify any files.
 * @param {string} relPath - Relative path from repo root
 * @param {string} target  - Test harness version (e.g. "1.108.0")
 */
function checkPackageJson(relPath, target) {
  const filePath = join(ROOT, relPath);
  const pkg = JSON.parse(readFileSync(filePath, 'utf-8'));

  if (pkg.engines?.vscode) {
    guardVersion('engines.vscode', pkg.engines.vscode, target, relPath);
  }

  if (pkg.devDependencies?.['@types/vscode']) {
    guardVersion('@types/vscode', pkg.devDependencies['@types/vscode'], target, relPath);
  }
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

  for (const relPath of PACKAGE_JSONS) {
    checkPackageJson(relPath, version);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Unexpected error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { readLocalVSCodeVersion };
