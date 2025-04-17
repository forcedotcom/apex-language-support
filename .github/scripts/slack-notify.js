module.exports = async ({ github, context, core }) => {
  const axios = require('axios');

  try {
    const repoName = context.repo.repo;
    const owner = context.repo.owner;
    const runId = context.runId;
    const runNumber = context.runNumber;
    const workflowName = context.workflow;
    const sha = context.sha;
    const ref = context.ref;
    const eventName = context.eventName;

    const isSuccess = context.job === 'success';
    const status = isSuccess ? 'Success' : 'Failure';
    const color = isSuccess ? '#36a64f' : '#ff0000';

    const commitMessage = await github.rest.repos
      .getCommit({
        owner,
        repo: repoName,
        ref: sha,
      })
      .then((res) => res.data.commit.message.split('\n')[0]);

    const runUrl = `https://github.com/${owner}/${repoName}/actions/runs/${runId}`;

    const payload = {
      attachments: [
        {
          color,
          fallback: `${repoName} publish ${status}: ${runUrl}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${repoName}* publish *${status}*`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Workflow:*\n${workflowName}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Run:*\n<${runUrl}|#${runNumber}>`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Branch:*\n${ref.replace('refs/heads/', '')}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Event:*\n${eventName}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Commit:*\n${sha.substring(0, 7)}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Message:*\n${commitMessage}`,
                },
              ],
            },
          ],
        },
      ],
    };

    await axios.post(process.env.SLACK_WEBHOOK_URL, payload);
  } catch (error) {
    core.setFailed(`Slack notification failed: ${error.message}`);
  }
};
