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
import { determineBuildType, setBuildTypeOutputs } from './ext-build-type.js';
import {
  findPromotionCandidate,
  setPromotionOutputs,
} from './ext-promotion-finder.js';
import {
  determineChanges,
  setChangeDetectionOutputs,
} from './ext-change-detector.js';
import {
  detectNpmChanges,
  setNpmChangeDetectionOutputs,
} from './npm-change-detector.js';
import {
  selectNpmPackages,
  setPackageSelectionOutputs,
} from './npm-package-selector.js';
import {
  extractPackageDetails,
  setPackageDetailsOutputs,
} from './npm-package-details.js';
import { generateReleasePlan, displayReleasePlan } from './npm-release-plan.js';
import { displayExtensionReleasePlan } from './ext-release-plan.js';
import { bumpVersions } from './ext-version-bumper.js';
import { determinePublishMatrix } from './ext-publish-matrix.js';
import { createGitHubReleases } from './ext-github-releases.js';
import { logAuditEvent } from './audit-logger.js';
import { sendSlackNotification } from './slack-notifier.js';
import { log } from './utils.js';

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
  .option('--branch <branch>', 'Branch to release from', 'main')
  .option(
    '--build-type <type>',
    'Build type (workflow_dispatch, schedule, etc.)',
    'workflow_dispatch',
  )
  .option('--is-nightly <boolean>', 'Is nightly build', 'false')
  .option('--version-bump <type>', 'Version bump type', 'auto')
  .option('--registries <list>', 'Registries to publish to', 'all')
  .option('--pre-release <boolean>', 'Pre-release mode', 'false')
  .option(
    '--selected-extensions <list>',
    'Comma-separated list of extensions to release',
    '',
  )
  .action(async (options) => {
    try {
      displayExtensionReleasePlan(options);
    } catch (error) {
      log.error(`Failed to display release plan: ${error}`);
      process.exit(1);
    }
  });

program
  .command('slack-notifier')
  .description('Send Slack notifications for release operations')
  .option('--webhook-url <url>', 'Slack webhook URL', '')
  .option('--status <status>', 'Status (success, failure, dry-run)', 'success')
  .option('--type <type>', 'Type (extension, npm)', 'extension')
  .option('--repository <repo>', 'Repository name', '')
  .option('--branch <branch>', 'Branch name', '')
  .option('--workflow <workflow>', 'Workflow name', '')
  .option('--run-id <id>', 'Workflow run ID', '')
  .option('--actor <actor>', 'Actor performing the action', '')
  .option('--details <json>', 'Details as JSON string', '{}')
  .action(async (options) => {
    try {
      sendSlackNotification({
        webhookUrl: options.webhookUrl,
        status: options.status as 'success' | 'failure' | 'dry-run',
        type: options.type as 'extension' | 'npm',
        repository: options.repository,
        branch: options.branch,
        workflow: options.workflow,
        runId: options.runId,
        actor: options.actor,
        details: options.details,
      });
    } catch (error) {
      log.error(`Failed to send Slack notification: ${error}`);
      process.exit(1);
    }
  });

program
  .command('audit-logger')
  .description('Log audit events for release operations')
  .option('--action <action>', 'Action being performed', '')
  .option('--actor <actor>', 'Actor performing the action', '')
  .option('--repository <repo>', 'Repository name', '')
  .option('--branch <branch>', 'Branch name', '')
  .option('--workflow <workflow>', 'Workflow name', '')
  .option('--run-id <id>', 'Workflow run ID', '')
  .option('--details <json>', 'Details as JSON string', '{}')
  .option('--log-file <path>', 'Custom log file path')
  .action(async (options) => {
    try {
      logAuditEvent({
        action: options.action,
        actor: options.actor,
        repository: options.repository,
        branch: options.branch,
        workflow: options.workflow,
        runId: options.runId,
        details: options.details,
        logFile: options.logFile,
      });
    } catch (error) {
      log.error(`Failed to log audit event: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-github-releases')
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
  .action(async (options) => {
    try {
      createGitHubReleases({
        dryRun: options.dryRun,
        preRelease: options.preRelease,
        versionBump: options.versionBump,
        selectedExtensions: options.selectedExtensions,
        isNightly: options.isNightly,
        vsixArtifactsPath: options.vsixArtifactsPath,
      });
    } catch (error) {
      log.error(`Failed to create GitHub releases: ${error}`);
      process.exit(1);
    }
  });

program
  .command('ext-publish-matrix')
  .description('Determine publish matrix for extensions')
  .option('--registries <list>', 'Registries to publish to', 'all')
  .option(
    '--selected-extensions <list>',
    'Comma-separated list of extensions to release',
    '',
  )
  .action(async (options) => {
    try {
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
  .action(async (options) => {
    try {
      bumpVersions({
        dryRun: options.dryRun,
        versionBump: options.versionBump,
        selectedExtensions: options.selectedExtensions,
        preRelease: options.preRelease,
        isNightly: options.isNightly,
        isPromotion: options.isPromotion,
        promotionCommitSha: options.promotionCommitSha,
      });
    } catch (error) {
      log.error(`Failed to bump versions: ${error}`);
      process.exit(1);
    }
  });

program
  .command('version-bumper')
  .description('Bump versions for selected extensions')
  .option('--dry-run', 'Run in dry-run mode')
  .action(async (options) => {
    try {
      log.info('Version bumper not yet implemented');
      // TODO: Implement version bumper
    } catch (error) {
      log.error(`Failed to bump versions: ${error}`);
      process.exit(1);
    }
  });

program
  .command('release-plan')
  .description('Generate release plan')
  .option('--dry-run', 'Run in dry-run mode')
  .action(async (options) => {
    try {
      log.info('Release planner not yet implemented');
      // TODO: Implement release planner
    } catch (error) {
      log.error(`Failed to generate release plan: ${error}`);
      process.exit(1);
    }
  });

// Show help if no command provided
if (process.argv.length === 2) {
  program.help();
}

program.parse();
