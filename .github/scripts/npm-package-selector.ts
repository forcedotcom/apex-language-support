/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { log, setOutput, getExtensionInfo } from './utils';

/**
 * Get all available NPM packages
 */
export function getAvailableNpmPackages(): string {
  log.info('Getting all available NPM packages...');

  // Get all packages from the packages directory
  const packagesDir = join(process.cwd(), 'packages');
  const packages: string[] = [];

  if (!existsSync(packagesDir)) {
    log.warning('packages directory not found');
    return '[]';
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

        // Only include packages that don't have a publisher (NPM packages)
        if (!info.publisher) {
          packages.push(packageName);
          log.debug(`Found NPM package: ${packageName}`);
        } else {
          log.debug(
            `Skipping VS Code extension: ${packageName} (publisher: ${info.publisher})`,
          );
        }
      } catch (error) {
        log.warning(`Failed to read package.json for ${packageName}: ${error}`);
      }
    }
  }

  const jsonArray = JSON.stringify(packages);
  log.info(`Found ${packages.length} NPM packages: ${packages.join(', ')}`);
  log.debug(`JSON array: ${jsonArray}`);

  return jsonArray;
}

/**
 * Set GitHub Actions outputs for package discovery
 */
export function setPackageDiscoveryOutputs(npmPackages: string): void {
  setOutput('npm-packages', npmPackages);

  log.success('NPM package discovery outputs set');
}

/**
 * Main function for CLI usage
 */
export async function main(): Promise<void> {
  try {
    const npmPackages = getAvailableNpmPackages();
    setPackageDiscoveryOutputs(npmPackages);
  } catch (error) {
    log.error(`Failed to discover NPM packages: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
