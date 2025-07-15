#!/usr/bin/env tsx

/**
 * Extension Version Bumper Script
 *
 * This script handles version bumping for VS Code extensions based on build type,
 * pre-release status, and promotion requirements.
 */

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
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

interface PackageJson {
  name: string;
  version: string;
  publisher?: string;
  displayName?: string;
}

interface VersionBumpOptions {
  dryRun: boolean;
  versionBump: string;
  selectedExtensions: string;
  preRelease: string;
  isNightly: string;
  isPromotion: string;
  promotionCommitSha?: string;
}

function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
} {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function calculateNewVersion(
  currentVersion: string,
  versionBump: string,
  isNightly: boolean,
  isPromotion: boolean,
  preRelease: boolean,
): string {
  const { major, minor, patch } = parseVersion(currentVersion);

  if (isNightly) {
    // Nightly build strategy: ensure odd minor version
    if (minor % 2 === 0) {
      // Current is even, bump to next odd
      return `${major}.${minor + 1}.0`;
    } else {
      // Current is already odd, just increment patch
      return `${major}.${minor}.${patch + 1}`;
    }
  } else if (isPromotion) {
    // Promotion strategy: bump from odd minor (nightly) to even minor (stable)
    if (minor % 2 === 1) {
      // Current is odd (nightly), bump to next even (stable)
      return `${major}.${minor + 1}.0`;
    } else {
      // Current is already even, this shouldn't happen for promotions
      console.warn(
        'Warning: Current version has even minor, expected odd for promotion',
      );
      return `${major}.${minor + 2}.0`;
    }
  } else {
    // Regular build strategy: use smart version bumping
    switch (versionBump) {
      case 'patch':
        return `${major}.${minor}.${patch + 1}`;
      case 'minor':
        if (preRelease) {
          // Pre-release: ensure odd minor version (no auto-update)
          if (minor % 2 === 0) {
            return `${major}.${minor + 1}.0`;
          } else {
            return `${major}.${minor + 2}.0`;
          }
        } else {
          // Stable release: ensure even minor version (auto-update enabled)
          if (minor % 2 === 1) {
            return `${major}.${minor + 1}.0`;
          } else {
            return `${major}.${minor + 2}.0`;
          }
        }
      case 'major':
        if (preRelease) {
          return `${major + 1}.1.0`; // Pre-release: start with odd minor
        } else {
          return `${major + 1}.0.0`; // Stable release: start with even minor
        }
      case 'auto':
      default:
        return `${major}.${minor}.${patch + 1}`;
    }
  }
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

// Note: updatePackageVersion function removed as it's not used - we use npm version instead

function bumpVersions(options: VersionBumpOptions): void {
  const {
    dryRun,
    versionBump,
    selectedExtensions,
    preRelease,
    isNightly,
    isPromotion,
    promotionCommitSha,
  } = options;

  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Version bump type: ${versionBump}`);
  console.log(`Selected extensions: ${selectedExtensions}`);
  console.log(`Pre-release mode: ${preRelease}`);
  console.log(`Is nightly build: ${isNightly}`);
  console.log(`Is promotion: ${isPromotion}`);
  console.log(`Promotion commit SHA: ${promotionCommitSha || 'N/A'}`);

  const extensions = selectedExtensions.split(',').filter(Boolean);

  for (const ext of extensions) {
    const packageDetails = getPackageDetails(ext);
    if (!packageDetails) {
      console.warn(`Skipping ${ext}: package.json not found`);
      continue;
    }

    console.log(`Processing ${ext}...`);
    console.log(`Current version: ${packageDetails.version}`);

    const newVersion = calculateNewVersion(
      packageDetails.version,
      versionBump,
      isNightly === 'true',
      isPromotion === 'true',
      preRelease === 'true',
    );

    if (dryRun) {
      console.log(
        `✅ DRY RUN: Would bump ${ext} from ${packageDetails.version} to ${newVersion}`,
      );
    } else {
      console.log(
        `🔄 LIVE: Bumping ${ext} from ${packageDetails.version} to ${newVersion}`,
      );

      // Update package.json version
      const originalDir = process.cwd();
      try {
        process.chdir(join(originalDir, 'packages', ext));
        execSync(`npm version "${newVersion}" --no-git-tag-version`, {
          stdio: 'inherit',
        });
        process.chdir(originalDir);
      } catch (error) {
        console.error(`Failed to bump version for ${ext}:`, error);
        process.chdir(originalDir);
        throw error;
      }
    }
  }

  if (dryRun) {
    console.log('✅ DRY RUN: Version bump simulation completed');
  } else {
    console.log('✅ LIVE: Version bumps applied');
  }
}

const program = new Command();

program
  .name('ext-version-bumper')
  .description('Bump versions for selected extensions')
  .option('--dry-run', 'Run in dry-run mode', false)
  .option('--version-bump <type>', 'Version bump type', 'auto')
  .option(
    '--selected-extensions <list>',
    'Comma-separated list of extensions to release',
    '',
  )
  .option('--pre-release <boolean>', 'Pre-release mode', 'false')
  .option('--is-nightly <boolean>', 'Is nightly build', 'false')
  .option('--is-promotion <boolean>', 'Is promotion', 'false')
  .option('--promotion-commit-sha <sha>', 'Promotion commit SHA')
  .action((options) => {
    bumpVersions({
      dryRun: options.dryRun,
      versionBump: options.versionBump,
      selectedExtensions: options.selectedExtensions,
      preRelease: options.preRelease,
      isNightly: options.isNightly,
      isPromotion: options.isPromotion,
      promotionCommitSha: options.promotionCommitSha,
    });
  });

program.parse();
