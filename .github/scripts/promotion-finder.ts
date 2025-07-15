/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { simpleGit, SimpleGit } from 'simple-git';
import { PromotionCandidate, GitTag } from './types.js';
import { log, setOutput, isStableVersion } from './utils.js';

/**
 * Get all git tags with metadata
 */
async function getAllTags(git: SimpleGit): Promise<GitTag[]> {
  const tags = await git.tags();
  const tagList: GitTag[] = [];

  for (const tagName of tags.all) {
    try {
      // Get commit info for this tag
      const logResult = await git.log({
        from: tagName,
        to: tagName,
        maxCount: 1,
      });
      if (logResult.latest) {
        const commit = logResult.latest;
        const commitDate = new Date(commit.date).getTime() / 1000; // Convert to Unix timestamp

        // Parse version from tag name
        let version: string | undefined;
        let isStable = false;
        let isNightly = false;

        if (tagName.startsWith('v')) {
          const versionPart = tagName.substring(1);
          if (versionPart.includes('-nightly')) {
            isNightly = true;
            version = versionPart.replace('-nightly', '');
          } else {
            isStable = true;
            version = versionPart;
          }
        }

        tagList.push({
          name: tagName,
          commitSha: commit.hash,
          commitDate,
          isStable,
          isNightly,
          version,
        });
      }
    } catch (error) {
      log.warning(`Failed to get info for tag ${tagName}: ${error}`);
    }
  }

  // Sort by commit date (newest first)
  return tagList.sort((a, b) => b.commitDate - a.commitDate);
}

/**
 * Find the last stable release tag
 */
function findLastStableTag(tags: GitTag[]): GitTag | null {
  for (const tag of tags) {
    if (tag.isStable && tag.version) {
      try {
        if (isStableVersion(tag.version)) {
          return tag;
        }
      } catch {
        // Skip tags with invalid version format
        continue;
      }
    }
  }
  return null;
}

/**
 * Find the most recent nightly build
 */
function findMostRecentNightly(tags: GitTag[]): GitTag | null {
  for (const tag of tags) {
    if (tag.isNightly) {
      return tag;
    }
  }
  return null;
}

/**
 * Find promotion candidates based on criteria
 */
function findPromotionCandidates(
  tags: GitTag[],
  lastStableTag: GitTag | null,
  mostRecentNightly: GitTag | null,
): PromotionCandidate[] {
  const candidates: PromotionCandidate[] = [];
  const now = Math.floor(Date.now() / 1000);
  const sevenDaysInSeconds = 7 * 24 * 60 * 60;

  for (const tag of tags) {
    if (!tag.isNightly || !tag.version) {
      continue;
    }

    let isCandidate = false;

    if (lastStableTag && mostRecentNightly) {
      // Check if this nightly meets both criteria:
      // 1. Within 7 days after the last stable release
      // 2. At least 7 days older than the most recent nightly
      const sevenDaysAfterStable =
        lastStableTag.commitDate + sevenDaysInSeconds;
      const sevenDaysBeforeRecent =
        mostRecentNightly.commitDate - sevenDaysInSeconds;

      isCandidate =
        tag.commitDate >= lastStableTag.commitDate &&
        tag.commitDate <= sevenDaysAfterStable &&
        tag.commitDate <= sevenDaysBeforeRecent;
    } else if (mostRecentNightly) {
      // For first promotion, check if nightly is:
      // 1. Within last 7 days from now
      // 2. At least 7 days older than the most recent nightly
      const sevenDaysAgo = now - sevenDaysInSeconds;
      const sevenDaysBeforeRecent =
        mostRecentNightly.commitDate - sevenDaysInSeconds;

      isCandidate =
        tag.commitDate >= sevenDaysAgo &&
        tag.commitDate <= sevenDaysBeforeRecent;
    }

    if (isCandidate) {
      candidates.push({
        tag: tag.name,
        commitSha: tag.commitSha,
        commitDate: tag.commitDate,
        version: tag.version,
      });
    }
  }

  return candidates;
}

/**
 * Find the best promotion candidate
 */
export async function findPromotionCandidate(): Promise<PromotionCandidate | null> {
  log.info('Finding nightly build to promote...');

  const git = simpleGit();

  try {
    // Get all tags
    const tags = await getAllTags(git);
    log.debug(`Found ${tags.length} tags`);

    // Find last stable release
    const lastStableTag = findLastStableTag(tags);
    if (lastStableTag) {
      log.info(
        `Last stable release: ${lastStableTag.name} (${new Date(lastStableTag.commitDate * 1000).toISOString()})`,
      );
    } else {
      log.info(
        'No previous stable release found - this will be the first promotion',
      );
    }

    // Find most recent nightly
    const mostRecentNightly = findMostRecentNightly(tags);
    if (mostRecentNightly) {
      log.info(
        `Most recent nightly: ${mostRecentNightly.name} (${new Date(mostRecentNightly.commitDate * 1000).toISOString()})`,
      );
    }

    // Find promotion candidates
    const candidates = findPromotionCandidates(
      tags,
      lastStableTag,
      mostRecentNightly,
    );

    if (candidates.length === 0) {
      log.warning('No suitable nightly builds found for promotion');
      return null;
    }

    // Select the most recent candidate
    const selectedCandidate = candidates[0]; // Already sorted by date (newest first)

    log.success(`Selected nightly for promotion: ${selectedCandidate.tag}`);
    log.info(`Commit SHA: ${selectedCandidate.commitSha}`);
    log.info(
      `Commit date: ${new Date(selectedCandidate.commitDate * 1000).toISOString()}`,
    );

    return selectedCandidate;
  } catch (error) {
    log.error(`Failed to find promotion candidate: ${error}`);
    throw error;
  }
}

/**
 * Set GitHub Actions outputs for promotion candidate
 */
export function setPromotionOutputs(
  candidate: PromotionCandidate | null,
): void {
  if (candidate) {
    setOutput('commit-sha', candidate.commitSha);
    setOutput('nightly-tag', candidate.tag);
  } else {
    setOutput('commit-sha', '');
    setOutput('nightly-tag', '');
  }

  log.success('Promotion outputs set');
}

/**
 * Main function for CLI usage
 */
export async function main(): Promise<void> {
  try {
    const candidate = await findPromotionCandidate();
    setPromotionOutputs(candidate);
  } catch (error) {
    log.error(`Failed to find promotion candidate: ${error}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
