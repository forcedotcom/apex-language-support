/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { BuildContext, VersionBumpType } from './types.js';
import {
  parseEnvironment,
  setOutput,
  log,
  booleanString,
  versionBumpType,
} from './utils.js';

/**
 * Determine the build context based on GitHub event and inputs
 */
export function determineBuildType(): BuildContext {
  const env = parseEnvironment();

  log.info('Determining build type...');
  log.debug(`GitHub event: ${env.githubEventName}`);
  log.debug(`Pre-release input: ${env.inputs.preRelease}`);
  log.debug(`Version bump input: ${env.inputs.versionBump}`);

  // Check if this is a scheduled nightly build
  const isNightly = env.githubEventName === 'schedule';

  // Determine version bump type
  let versionBump: VersionBumpType = 'auto';
  if (isNightly) {
    versionBump = 'patch';
  } else {
    const inputBump = env.inputs.versionBump || 'auto';
    try {
      versionBump = versionBumpType.parse(inputBump);
    } catch {
      log.warning(
        `Invalid version bump type: ${inputBump}, defaulting to 'auto'`,
      );
      versionBump = 'auto';
    }
  }

  // Determine pre-release status
  let preRelease = false;
  if (isNightly) {
    preRelease = true;
  } else {
    const inputPreRelease = env.inputs.preRelease || 'false';
    try {
      preRelease = booleanString.parse(inputPreRelease);
    } catch {
      log.warning(
        `Invalid pre-release value: ${inputPreRelease}, defaulting to false`,
      );
      preRelease = false;
    }
  }

  // Determine if this is a promotion (stable release)
  const isPromotion = !preRelease && !isNightly;

  const buildContext: BuildContext = {
    isNightly,
    versionBump,
    preRelease,
    isPromotion,
  };

  log.info('Build type determined:');
  log.info(`  Is nightly: ${isNightly}`);
  log.info(`  Version bump: ${versionBump}`);
  log.info(`  Pre-release: ${preRelease}`);
  log.info(`  Is promotion: ${isPromotion}`);

  return buildContext;
}

/**
 * Set GitHub Actions outputs for build type
 */
export function setBuildTypeOutputs(buildContext: BuildContext): void {
  setOutput('is-nightly', buildContext.isNightly.toString());
  setOutput('version-bump', buildContext.versionBump);
  setOutput('pre-release', buildContext.preRelease.toString());
  setOutput('is-promotion', buildContext.isPromotion.toString());

  log.success('Build type outputs set');
}

/**
 * Main function for CLI usage
 */
export async function main(): Promise<void> {
  try {
    const buildContext = determineBuildType();
    setBuildTypeOutputs(buildContext);
  } catch (error) {
    log.error(`Failed to determine build type: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
