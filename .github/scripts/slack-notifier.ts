#!/usr/bin/env tsx

/**
 * Slack Notifier Script
 *
 * This script handles Slack notifications for release operations,
 * providing real-time updates on release status and results.
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

interface SlackNotificationOptions {
  webhookUrl: string;
  status: 'success' | 'failure' | 'dry-run';
  type: 'extension' | 'npm';
  repository: string;
  branch: string;
  workflow: string;
  runId: string;
  actor: string;
  details: string;
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  elements?: Array<{
    type: string;
    text: string;
  }>;
}

function createSlackPayload(options: SlackNotificationOptions): any {
  const { status, type, repository, branch, workflow, runId, actor, details } =
    options;

  let emoji: string;
  let title: string;

  switch (status) {
    case 'success':
      emoji = '✅';
      title = `${type === 'extension' ? 'VS Code Extensions' : 'NPM Packages'} Released Successfully!`;
      break;
    case 'failure':
      emoji = '❌';
      title = `${type === 'extension' ? 'VS Code Extension' : 'NPM Package'} Release Failed!`;
      break;
    case 'dry-run':
      emoji = '🧪';
      title = `${type === 'extension' ? 'VS Code Extension' : 'NPM Package'} Release Dry Run Completed`;
      break;
    default:
      emoji = 'ℹ️';
      title = 'Release Status Update';
  }

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${title}`,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Repository:*\n${repository}`,
        },
        {
          type: 'mrkdwn',
          text: `*Branch:*\n${branch}`,
        },
        {
          type: 'mrkdwn',
          text: `*Workflow:*\n${workflow}`,
        },
        {
          type: 'mrkdwn',
          text: `*Actor:*\n${actor}`,
        },
      ],
    },
  ];

  // Add details if provided
  if (details) {
    try {
      const parsedDetails = JSON.parse(details);
      if (parsedDetails.packages) {
        blocks.push({
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*${type === 'extension' ? 'Extensions' : 'Packages'}:*\n${parsedDetails.packages}`,
            },
            {
              type: 'mrkdwn',
              text: `*Versions:*\n${parsedDetails.versions || 'N/A'}`,
            },
          ],
        });
      }
    } catch (error) {
      console.warn('Could not parse details JSON:', error);
    }
  }

  // Add workflow run link
  const runUrl = `https://github.com/${repository}/actions/runs/${runId}`;
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Workflow Run:* <${runUrl}|View Details>`,
    },
  });

  // Add context for failures
  if (status === 'failure') {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: 'Please check the workflow logs for detailed error information.',
        },
      ],
    });
  }

  return {
    text: `${emoji} ${title}`,
    blocks,
  };
}

function sendSlackNotification(options: SlackNotificationOptions): void {
  const { webhookUrl, status, type, repository, branch, workflow, actor } =
    options;

  console.log('Sending Slack notification...');
  console.log(`Status: ${status}`);
  console.log(`Type: ${type}`);
  console.log(`Repository: ${repository}`);
  console.log(`Branch: ${branch}`);
  console.log(`Workflow: ${workflow}`);
  console.log(`Actor: ${actor}`);

  try {
    const payload = createSlackPayload(options);

    // Send to Slack webhook
    const curlCommand =
      "curl -X POST -H 'Content-type: application/json' " +
      `--data '${JSON.stringify(payload)}' ${webhookUrl}`;

    const result = execSync(curlCommand, { encoding: 'utf8' });

    if (result.includes('ok')) {
      console.log('✅ Slack notification sent successfully');
    } else {
      console.warn(
        '⚠️ Slack notification may not have been delivered:',
        result,
      );
    }
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    throw error;
  }
}

// Export for use in other modules
export { sendSlackNotification };

const program = new Command();

program
  .name('slack-notifier')
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
  .action((options) => {
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
  });

program.parse();
