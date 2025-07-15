#!/usr/bin/env tsx

/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// eslint-disable-next-line header/header
import { Command } from 'commander';
import { determineBuildType, setBuildTypeOutputs } from './ext-build-type';
import {
  findPromotionCandidate,
  setPromotionOutputs,
} from './ext-promotion-finder';
import {
  determineChanges,
  setChangeDetectionOutputs,
} from './ext-change-detector';
import {
  detectNpmChanges,
  setNpmChangeDetectionOutputs,
} from './npm-change-detector';
import {
  selectNpmPackages,
  setPackageSelectionOutputs,
} from './npm-package-selector';
import {
  extractPackageDetails,
  setPackageDetailsOutputs,
} from './npm-package-details';
import { generateReleasePlan, displayReleasePlan } from './npm-release-plan';
import { displayExtensionReleasePlan } from './ext-release-plan';
import { bumpVersions } from './ext-version-bumper';
import { determinePublishMatrix } from './ext-publish-matrix';
import { createGitHubReleases } from './ext-github-releases';
import { publishVsix } from './ext-publish-vsix';
import { logAuditEvent } from './audit-logger';

import { log } from './utils';

const program = new Command();

program
  .name('release-scripts')
  .description('Release automation scripts for VS Code extensions')
  .version('1.0.0');

program
  .command('ext-build-type')
  .description('Determine build type (nightly/promotion/regular)')
  .action(async () => {
    try {
      const buildContext = determineBuildType();
      setBuildTypeOutputs(buildContext);
    } catch (error) {
      log.error(`Failed to determine build type: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-promotion-finder')
  .description('Find promotion candidates for nightly builds')
  .action(async () => {
    try {
      const candidate = await findPromotionCandidate();
      setPromotionOutputs(candidate);
    } catch (error) {
      log.error(`Failed to find promotion candidate: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-change-detector')
  .description('Detect changes in extensions')
  .action(async () => {
    try {
      // Parse build context from environment variables
      const isNightly = process.env.IS_NIGHTLY === 'true';
      const versionBump = (process.env.VERSION_BUMP as any) || 'auto';
      const preRelease = process.env.PRE_RELEASE === 'true';
      const isPromotion = process.env.IS_PROMOTION === 'true';
      const promotionCommitSha = process.env.PROMOTION_COMMIT_SHA;

      const buildContext = {
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
  });

program
  .command('npm-change-detector')
  .description('Detect changes in NPM packages')
  .action(async () => {
    try {
      const baseBranch = process.env.INPUT_BASE_BRANCH || 'main';
      const result = await detectNpmChanges(baseBranch);
      setNpmChangeDetectionOutputs(result);
    } catch (error) {
      log.error(`Failed to detect NPM changes: ${error}`);
      process.exit(1);
    }
  });

program
  .command('npm-package-selector')
  .description('Select NPM packages for release')
  .action(async () => {
    try {
      const selectedPackage = process.env.SELECTED_PACKAGE || '';
      const availablePackages = process.env.AVAILABLE_PACKAGES || '';
      const changedPackages = process.env.CHANGED_PACKAGES || '';

      const selectedPackages = selectNpmPackages(
        selectedPackage,
        availablePackages,
        changedPackages,
      );
      setPackageSelectionOutputs(selectedPackages);
    } catch (error) {
      log.error(`Failed to select packages: ${error}`);
      process.exit(1);
    }
  });

program
  .command('npm-package-details')
  .description('Extract NPM package details for notifications')
  .action(async () => {
    try {
      const selectedPackagesJson = process.env.SELECTED_PACKAGES || '[]';
      const versionBump = process.env.VERSION_BUMP || 'patch';

      const details = extractPackageDetails(
        selectedPackagesJson,
        versionBump as any,
      );
      setPackageDetailsOutputs(details);
    } catch (error) {
      log.error(`Failed to extract package details: ${error}`);
      process.exit(1);
    }
  });

program
  .command('npm-release-plan')
  .description('Generate NPM release plan')
  .action(async () => {
    try {
      const packageName = process.env.MATRIX_PACKAGE;
      const versionBump = process.env.VERSION_BUMP || 'patch';
      const dryRun = process.env.DRY_RUN === 'true';

      if (!packageName) {
        log.error('MATRIX_PACKAGE environment variable is required');
        process.exit(1);
      }

      const plan = generateReleasePlan(packageName, versionBump as any, dryRun);
      if (plan) {
        displayReleasePlan(plan);
      } else {
        log.error('Failed to generate release plan');
        process.exit(1);
      }
    } catch (error) {
      log.error(`Failed to generate release plan: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-release-plan')
  .description('Display extension release plan for dry runs')
  .action(async () => {
    try {
      const options = {
        branch: process.env.BRANCH || 'main',
        buildType: process.env.BUILD_TYPE || 'workflow_dispatch',
        isNightly: process.env.IS_NIGHTLY || 'false',
        versionBump: process.env.VERSION_BUMP || 'auto',
        registries: process.env.REGISTRIES || 'all',
        preRelease: process.env.PRE_RELEASE || 'false',
        selectedExtensions: process.env.SELECTED_EXTENSIONS || '',
      };
      displayExtensionReleasePlan(options);
    } catch (error) {
      log.error(`Failed to display release plan: ${error}`);
      process.exit(1);
    }
  });

program
  .command('audit-logger')
  .description('Log audit events for release operations')
  .action(async () => {
    try {
      logAuditEvent({
        action: process.env.ACTION || '',
        actor: process.env.ACTOR || '',
        repository: process.env.REPOSITORY || '',
        branch: process.env.BRANCH || '',
        workflow: process.env.WORKFLOW || '',
        runId: process.env.RUN_ID || '',
        details: process.env.DETAILS || '{}',
        logFile: process.env.LOG_FILE,
      });
    } catch (error) {
      log.error(`Failed to log audit event: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-github-releases')
  .description('Create GitHub releases for extensions')
  .action(async () => {
    try {
      createGitHubReleases({
        dryRun: process.env.DRY_RUN === 'true',
        preRelease: process.env.PRE_RELEASE || 'false',
        versionBump: process.env.VERSION_BUMP || 'auto',
        selectedExtensions: process.env.SELECTED_EXTENSIONS || '',
        isNightly: process.env.IS_NIGHTLY || 'false',
        vsixArtifactsPath:
          process.env.VSIX_ARTIFACTS_PATH || './vsix-artifacts',
      });
    } catch (error) {
      log.error(`Failed to create GitHub releases: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-publish-matrix')
  .description('Determine publish matrix for extensions')
  .action(async () => {
    try {
      const options = {
        registries: process.env.REGISTRIES || 'all',
        selectedExtensions: process.env.SELECTED_EXTENSIONS || '',
      };
      const matrix = determinePublishMatrix(options);
      // Output in GitHub Actions format
      console.log(`matrix=${JSON.stringify(matrix)}`);
    } catch (error) {
      log.error(`Failed to determine publish matrix: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-version-bumper')
  .description('Bump versions for selected extensions')
  .action(async () => {
    try {
      bumpVersions({
        dryRun: process.env.DRY_RUN === 'true',
        versionBump: process.env.VERSION_BUMP || 'auto',
        selectedExtensions: process.env.SELECTED_EXTENSIONS || '',
        preRelease: process.env.PRE_RELEASE || 'false',
        isNightly: process.env.IS_NIGHTLY || 'false',
        isPromotion: process.env.IS_PROMOTION || 'false',
        promotionCommitSha: process.env.PROMOTION_COMMIT_SHA,
      });
    } catch (error) {
      log.error(`Failed to bump versions: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-publish-vsix')
  .description('Publish VSIX file to VS Code Marketplace')
  .action(async () => {
    try {
      publishVsix({
        packageDir: process.env.PACKAGE_DIR || '',
        vsceToken: process.env.VSCE_PERSONAL_ACCESS_TOKEN || '',
        isPreRelease: process.env.PRE_RELEASE === 'true',
        dryRun: process.env.DRY_RUN === 'true',
      });
    } catch (error) {
      log.error(`Failed to publish VSIX: ${error}`);
      process.exit(1);
    }
  });

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

program.parse();
