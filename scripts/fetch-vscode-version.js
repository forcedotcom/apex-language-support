#!/usr/bin/env node

/**
 * Fetches the pinned VS Code version from the Code Builder Web repo.
 *
 * Uses `gh api` (GitHub CLI) which relies on existing authentication.
 * Falls back to 'stable' if the fetch fails.
 *
 * Source: https://github.com/forcedotcom/code-builder-web/blob/main/.vscode-version
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * @returns {Promise<string>} The VS Code version string (e.g. '1.108.0') or 'stable'
 */
async function fetchCodeBuilderVSCodeVersion() {
  try {
    const { stdout } = await execAsync(
      'gh api repos/forcedotcom/code-builder-web/contents/.vscode-version --jq .content',
    );

    const content = Buffer.from(stdout.trim(), 'base64')
      .toString('utf-8')
      .trim();

    if (/^\d+\.\d+\.\d+$/.test(content)) {
      console.log(
        `📌 Pinning VS Code version to ${content} (from code-builder-web/.vscode-version)`,
      );
      return content;
    }

    console.warn(
      `⚠️  Unexpected .vscode-version content: "${content}", falling back to 'stable'`,
    );
    return 'stable';
  } catch (error) {
    console.warn(
      `⚠️  Failed to fetch .vscode-version via gh CLI: ${error.message}`,
    );
    console.warn(
      `   Ensure 'gh' is installed and authenticated (gh auth login)`,
    );
    console.warn(`   Falling back to 'stable'`);
    return 'stable';
  }
}

module.exports = { fetchCodeBuilderVSCodeVersion };
