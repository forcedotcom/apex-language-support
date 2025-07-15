/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { simpleGit } from 'simple-git';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { BuildContext, ChangeDetectionResult, ExtensionInfo } from './types';
import { log, setOutput, getExtensionInfo } from './utils';

/**
 * Get all available extensions
 */
function getAvailableExtensions(): ExtensionInfo[] {
  const extensions: ExtensionInfo[] = [];
  const packagesDir = join(process.cwd(), 'packages');

  if (!existsSync(packagesDir)) {
    log.warning('packages directory not found');
    return extensions;
  }

  const packageDirs = readdirSync(packagesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  for (const packageName of packageDirs) {
    const packagePath = join(packagesDir, packageName);
    const packageJsonPath = join(packagePath, 'package.json');

    if (existsSync(packageJsonPath)) {
      try {
        const info = getExtensionInfo(packagePath);
        extensions.push({
          name: packageName,
          path: packagePath,
          currentVersion: info.version,
          publisher: info.publisher,
          displayName: info.displayName,
        });
      } catch (error) {
        log.warning(`Failed to read package.json for ${packageName}: ${error}`);
      }
    }
  }

  return extensions;
}

/**
 * Check if extension has changes since last release
 */
async function hasExtensionChanges(
  git: any,
  extensionPath: string,
  lastTag: string | null,
): Promise<boolean> {
  if (!lastTag) {
    // No previous tag, check if extension has any files
    const files = readdirSync(extensionPath, { recursive: true });
    return files.length > 0;
  }

  try {
    // Check for changes since the last release tag
    const diff = await git.diff([lastTag, 'HEAD', '--', extensionPath]);
    return diff.trim().length > 0;
  } catch (error) {
    log.warning(`Failed to check changes for ${extensionPath}: ${error}`);
    return false;
  }
}

/**
 * Find the last release tag
 */
async function findLastReleaseTag(git: any): Promise<string | null> {
  try {
    const tags = await git.tags();
    const versionTags = tags.all
      .filter((tag: string) => tag.startsWith('v'))
      .sort((a: string, b: string) => {
        // Simple version comparison (could be improved with semver)
        const versionA = a.substring(1);
        const versionB = b.substring(1);
        return versionB.localeCompare(versionA, undefined, { numeric: true });
      });

    return versionTags.length > 0 ? versionTags[0] : null;
  } catch (error) {
    log.warning(`Failed to get tags: ${error}`);
    return null;
  }
}

/**
 * Determine which extensions need releases
 */
export async function determineChanges(
  buildContext: BuildContext,
  promotionCommitSha?: string,
): Promise<ChangeDetectionResult> {
  log.info('Determining changes and version bumps...');
  log.debug(`Build context: ${JSON.stringify(buildContext)}`);
  log.debug(`Promotion commit SHA: ${promotionCommitSha || 'none'}`);

  const git = simpleGit();
  const extensions = getAvailableExtensions();
  const selectedExtensions: string[] = [];
  let versionBumps = buildContext.versionBump;

  log.info(
    `Found ${extensions.length} extensions: ${extensions.map((e) => e.name).join(', ')}`,
  );

  // For nightly builds, always include all extensions
  if (buildContext.isNightly) {
    log.info('Nightly build detected - including all extensions');
    selectedExtensions.push(...extensions.map((e) => e.name));
  }
  // For promotions, always include all extensions
  else if (buildContext.isPromotion) {
    log.info('Promotion detected - including all extensions');
    selectedExtensions.push(...extensions.map((e) => e.name));
  }
  // For regular builds, check for actual changes
  else {
    log.info('Regular build - checking for changes...');
    const lastTag = await findLastReleaseTag(git);

    if (lastTag) {
      log.info(`Comparing against last release tag: ${lastTag}`);
    } else {
      log.info('No previous release tag found - treating as first release');
    }

    for (const extension of extensions) {
      log.debug(`Checking extension: ${extension.name}`);

      const hasChanges = await hasExtensionChanges(
        git,
        extension.path,
        lastTag,
      );

      if (hasChanges) {
        log.info(`Found changes in ${extension.name} - including in release`);
        selectedExtensions.push(extension.name);
      } else {
        log.info(`No changes found in ${extension.name} - skipping release`);
      }
    }
  }

  log.info(`Selected extensions: ${selectedExtensions.join(', ')}`);
  log.info(`Version bump type: ${versionBumps}`);

  return {
    selectedExtensions,
    versionBumps,
    promotionCommitSha,
  };
}

/**
 * Set GitHub Actions outputs for change detection
 */
export function setChangeDetectionOutputs(result: ChangeDetectionResult): void {
  setOutput('selected-extensions', result.selectedExtensions.join(','));
  setOutput('version-bumps', result.versionBumps);
  if (result.promotionCommitSha) {
    setOutput('promotion-commit-sha', result.promotionCommitSha);
  }

  log.success('Change detection outputs set');
}

/**
 * Main function for CLI usage
 */
export async function main(): Promise<void> {
  try {
    // For CLI usage, we need to parse the build context from environment
    // This would typically come from the previous job's outputs
    const isNightly = process.env.IS_NIGHTLY === 'true';
    const versionBump = (process.env.VERSION_BUMP as any) || 'auto';
    const preRelease = process.env.PRE_RELEASE === 'true';
    const isPromotion = process.env.IS_PROMOTION === 'true';
    const promotionCommitSha = process.env.PROMOTION_COMMIT_SHA;

    const buildContext: BuildContext = {
      isNightly,
      versionBump,
      preRelease,
      isPromotion,
      promotionCommitSha,
    };

    const result = await determineChanges(buildContext, promotionCommitSha);
    setChangeDetectionOutputs(result);
  } catch (error) {
    log.error(`Failed to determine changes: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
