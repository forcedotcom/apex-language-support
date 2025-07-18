/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface PackageJson {
  name: string;
  version: string;
  publisher?: string;
  displayName?: string;
}

interface PublishVsixOptions {
  packageDir: string;
  vsceToken: string;
  isPreRelease: boolean;
  dryRun: boolean;
}

function getPackageDetails(packageDir: string): PackageJson {
  try {
    const packageJsonPath = join(packageDir, 'package.json');
    const content = readFileSync(packageJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read package.json from ${packageDir}: ${error}`);
  }
}

function findVsixFile(packageDir: string, version: string): string {
  try {
    const files = readdirSync(packageDir);
    const vsixFiles = files.filter((file) => file.endsWith(`-${version}.vsix`));

    if (vsixFiles.length === 0) {
      throw new Error(
        `No VSIX found in ${packageDir} matching version ${version}`,
      );
    }

    if (vsixFiles.length > 1) {
      console.warn(
        `Multiple VSIX files found for version ${version}, using first: ${vsixFiles[0]}`,
      );
    }

    return join(packageDir, vsixFiles[0]);
  } catch (error) {
    throw new Error(`Failed to find VSIX file: ${error}`);
  }
}

function publishVsix(options: PublishVsixOptions): void {
  const { packageDir, vsceToken, isPreRelease, dryRun } = options;

  console.log(`Publishing VSIX from: ${packageDir}`);
  console.log(`Pre-release mode: ${isPreRelease}`);
  console.log(`Dry run mode: ${dryRun}`);

  try {
    // Get package details
    const packageDetails = getPackageDetails(packageDir);
    console.log(`Package: ${packageDetails.name}`);
    console.log(`Version: ${packageDetails.version}`);

    // Find VSIX file
    const vsixPath = findVsixFile(packageDir, packageDetails.version);
    console.log(`VSIX file: ${vsixPath}`);

    if (dryRun) {
      console.log('✅ DRY RUN: Would publish VSIX with command:');
      const preReleaseFlag = isPreRelease ? '--pre-release' : '';
      const command =
        `npx vsce publish --pat ${vsceToken} --packagePath ${vsixPath} ` +
        `--skip-duplicate ${preReleaseFlag}`;
      console.log(`  ${command}`);
      console.log(`  Pre-release: ${isPreRelease}`);
      return;
    }

    // Publish VSIX
    const preReleaseFlag = isPreRelease ? '--pre-release' : '';
    const command = `npx vsce publish --pat ${vsceToken} --packagePath ${vsixPath} --skip-duplicate ${preReleaseFlag}`;

    console.log('🔄 Publishing VSIX...');
    execSync(command, { stdio: 'inherit' });

    console.log(
      `✅ Successfully published ${vsixPath}${isPreRelease ? ' as pre-release' : ''}`,
    );
  } catch (error) {
    console.error(`❌ Error publishing VSIX: ${error}`);
    throw error;
  }
}

// Export for use in other modules
export { publishVsix };
