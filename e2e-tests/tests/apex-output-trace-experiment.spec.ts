/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { test, expect } from '../fixtures/apexFixtures';
import {
  clearOutputChannel,
  ensureOutputPanelOpen,
  selectOutputChannel,
  waitForOutputChannelText,
} from '../shared/pages/outputChannel';

const WORKER_SERVER_OUTPUT_CHANNEL =
  'Apex Language Server Extension (Worker/Server)';

test.describe('Apex LSP Output Trace Experiment', () => {
  test.skip(
    process.env.E2E_LSP_TRACE_EXPERIMENT !== '1' ||
      process.env.VSCODE_DESKTOP !== '1',
    'Run only when investigating native LSP output tracing.',
  );

  test('records a hover request with one request-pool worker', async ({
    page,
    hoverHelper,
  }) => {
    await ensureOutputPanelOpen(page);
    await selectOutputChannel(page, WORKER_SERVER_OUTPUT_CHANNEL);
    await waitForOutputChannelText(page, {
      expectedText: 'config: poolSize=1',
    });
    await clearOutputChannel(page);

    const content = await hoverHelper.hoverOnWordWithRetry('ApexClassExample');
    expect(content).toContain('ApexClassExample');

    await waitForOutputChannelText(page, {
      expectedText: "Sending request 'textDocument/hover",
    });
  });
});
