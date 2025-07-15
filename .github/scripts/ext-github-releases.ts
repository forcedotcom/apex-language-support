#!/usr/bin/env tsx
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Command } from 'commander';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

interface PackageJson {
  name: string;
  version: string;
  publisher?: string;
  displayName?: string;
}

interface GitHubReleaseOptions {
  dryRun: boolean;
  preRelease: string;
  versionBump: string;
  selectedExtensions: string;
  isNightly: string;
  vsixArtifactsPath: string;
}

function getPackageDetails(extensionPath: string): PackageJson | null {
  try {
    const packageJsonPath = join(
      process.cwd(),
      'packages',
      extensionPath,
      'package.json',
    );
    const content = readFileSync(packageJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(
      `Warning: Could not read package.json for ${extensionPath}:`,
      error,
    );
    return null;
  }
}

function findVsixFiles(extension: string, artifactsPath: string): string[] {
  try {
    // Map extension names to their actual VSIX file patterns
    let vsixPattern: string;
    switch (extension) {
      case 'apex-lsp-vscode-extension':
        vsixPattern = '*apex-language-server-extension*.vsix';
        break;
      case 'apex-lsp-vscode-extension-web':
        vsixPattern = '*apex-language-server-extension-web*.vsix';
        break;
      default:
        vsixPattern = `*${extension}*.vsix`;
    }

    const pattern = join(artifactsPath, vsixPattern);
    return glob.sync(pattern);
  } catch (error) {
    console.warn(`Warning: Could not find VSIX files for ${extension}:`, error);
    return [];
  }
}

function generateReleaseNotes(
  extension: string,
  currentVersion: string,
  isNightly: string,
  preRelease: string,
): string {
  let releaseNotes = `## ${extension} v${currentVersion}\n\n`;
  releaseNotes += '### Changes\n\n';

  try {
    // Find the last release tag for this extension
    const lastTag = execSync(
      'git tag --sort=-version:refname | grep "^v" | head -1',
      { encoding: 'utf8' },
    ).trim();

    if (lastTag) {
      // Get commits since the last release
      const recentCommits = execSync(
        `git log --oneline "${lastTag}"..HEAD -- "packages/${extension}/"`,
        { encoding: 'utf8' },
      ).trim();
      if (recentCommits) {
        const commits = recentCommits.split('\n').filter(Boolean);
        commits.forEach((commit) => {
          releaseNotes += `- ${commit}\n`;
        });
      } else {
        releaseNotes += '- General improvements and bug fixes\n';
      }
    } else {
      // First release - get all commits for this extension
      const allCommits = execSync(
        `git log --oneline -- "packages/${extension}/"`,
        { encoding: 'utf8' },
      ).trim();
      if (allCommits) {
        const commits = allCommits.split('\n').filter(Boolean);
        commits.forEach((commit) => {
          releaseNotes += `- ${commit}\n`;
        });
      } else {
        releaseNotes += '- Initial release\n';
      }
    }
  } catch (error) {
    console.warn(
      `Warning: Could not generate release notes for ${extension}:`,
      error,
    );
    releaseNotes += '- General improvements and bug fixes\n';
  }

  releaseNotes += '\n### Installation\n\n';
  releaseNotes += 'Download the VSIX file and install via:\n';
  releaseNotes += '- VS Code: Install from VSIX...\n';
  releaseNotes += '- Command line: `code --install-extension <vsix-file>`\n';

  if (preRelease === 'true') {
    releaseNotes += '\n⚠️ **This is a pre-release version**\n';
  }

  if (isNightly === 'true') {
    const nightlyDate = new Date()
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '');
    releaseNotes += `\n🌙 **This is a nightly build from ${nightlyDate}**\n`;
    releaseNotes += '\n### Nightly Build Information\n';
    releaseNotes += `- **Build Date**: ${nightlyDate}\n`;
    releaseNotes += `- **Version**: ${currentVersion} (odd minor for pre-release)\n`;
    releaseNotes += '- **Type**: Nightly pre-release for testing\n';
  }

  return releaseNotes;
}

function createGitHubRelease(
  extension: string,
  currentVersion: string,
  releaseNotes: string,
  vsixFiles: string[],
  isNightly: string,
  preRelease: string,
  dryRun: boolean,
): void {
  // Create release tag
  let releaseTag = `v${currentVersion}`;
  let releaseTitle = `${extension} v${currentVersion}`;

  // For nightly builds, add timestamp to tag and title
  if (isNightly === 'true') {
    const nightlyDate = new Date()
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '');
    releaseTag = `v${currentVersion}-nightly.${nightlyDate}`;
    releaseTitle = `${extension} v${currentVersion} (Nightly ${nightlyDate})`;
  }

  if (dryRun) {
    console.log('✅ DRY RUN: Would create GitHub release:');
    console.log(`  - Tag: ${releaseTag}`);
    console.log(`  - Title: ${releaseTitle}`);
    console.log(`  - Pre-release: ${preRelease}`);
    console.log(`  - VSIX files: ${vsixFiles.join(', ')}`);
    console.log('  - Release notes preview:');
    console.log(releaseNotes.split('\n').slice(0, 20).join('\n'));
    console.log('  ... (truncated)');
  } else {
    console.log('🔄 LIVE: Creating GitHub release...');
    console.log(`Creating release: ${releaseTitle}`);
    console.log(`Tag: ${releaseTag}`);
    console.log(`Pre-release: ${preRelease}`);

    try {
      // Create release using GitHub CLI
      const vsixArgs = vsixFiles.map((file) => `"${file}"`).join(' ');
      const command =
        `gh release create "${releaseTag}" --title "${releaseTitle}" ` +
        `--notes "${releaseNotes}" --prerelease="${preRelease}" ` +
        `--repo "${process.env.GITHUB_REPOSITORY}" ${vsixArgs}`;

      execSync(command, { stdio: 'inherit' });
      console.log(`✅ Release created for ${extension}`);
    } catch (error) {
      console.error(`Failed to create release for ${extension}:`, error);
      throw error;
    }
  }
}

function createGitHubReleases(options: GitHubReleaseOptions): void {
  const {
    dryRun,
    preRelease,
    versionBump,
    selectedExtensions,
    isNightly,
    vsixArtifactsPath,
  } = options;

  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('Creating GitHub releases...');
  console.log(`Pre-release: ${preRelease}`);
  console.log(`Version bump: ${versionBump}`);
  console.log(`Extensions: ${selectedExtensions}`);

  const extensions = selectedExtensions.split(',').filter(Boolean);

  for (const ext of extensions) {
    const packageDetails = getPackageDetails(ext);
    if (!packageDetails) {
      console.warn(`Skipping ${ext}: package.json not found`);
      continue;
    }

    console.log(`Processing extension: ${ext}`);
    console.log(`Current version: ${packageDetails.version}`);

    const vsixFiles = findVsixFiles(ext, vsixArtifactsPath);
    if (vsixFiles.length === 0) {
      console.warn(`No VSIX files found for ${ext} in ${vsixArtifactsPath}`);
      continue;
    }

    const releaseNotes = generateReleaseNotes(
      ext,
      packageDetails.version,
      isNightly,
      preRelease,
    );

    createGitHubRelease(
      ext,
      packageDetails.version,
      releaseNotes,
      vsixFiles,
      isNightly,
      preRelease,
      dryRun,
    );
  }

  if (dryRun) {
    console.log('✅ DRY RUN: GitHub release simulation completed');
  } else {
    console.log('✅ LIVE: GitHub releases created');
  }
}

// Export for use in other modules
export { createGitHubReleases };

const program = new Command();

program
  .name('ext-github-releases')
  .description('Create GitHub releases for extensions')
  .option('--dry-run', 'Run in dry-run mode', false)
  .option('--pre-release <boolean>', 'Pre-release mode', 'false')
  .option('--version-bump <type>', 'Version bump type', 'auto')
  .option(
    '--selected-extensions <list>',
    'Comma-separated list of extensions to release',
    '',
  )
  .option('--is-nightly <boolean>', 'Is nightly build', 'false')
  .option(
    '--vsix-artifacts-path <path>',
    'Path to VSIX artifacts',
    './vsix-artifacts',
  )
  .action((options) => {
    createGitHubReleases({
      dryRun: options.dryRun,
      preRelease: options.preRelease,
      versionBump: options.versionBump,
      selectedExtensions: options.selectedExtensions,
      isNightly: options.isNightly,
      vsixArtifactsPath: options.vsixArtifactsPath,
    });
  });

program.parse();
