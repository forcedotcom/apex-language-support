/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, afterAll } from '@jest/globals';
import { join } from 'path';
import { existsSync } from 'fs';
import { DEFAULT_APEX_SETTINGS } from '@salesforce/apex-lsp-shared';
import { createHeadlessClient } from '../../src/hosts/headlessHost';
import type { HeadlessClientResult } from '../../src/hosts/headlessHost';

/**
 * Integration test for the headless host wiring. Spawns the real Node language
 * server (`packages/apex-ls/dist/server.node.js`) over stdio, performs the LSP
 * initialize handshake, and asserts a clean shutdown/dispose cycle.
 *
 * This is a process-level integration test, NOT a Playwright e2e spec. It
 * validates adapter wiring, spawn lifecycle, and protocol round-trip.
 *
 * Gated: requires `RUN_INTEGRATION=1` AND the server binary must exist.
 * To run locally: `npm run bundle -w @salesforce/apex-ls && RUN_INTEGRATION=1 npm test -w @salesforce/apex-lsp-client`
 */
const serverPath = join(__dirname, '../../../apex-ls/dist/server.node.js');
const serverAvailable = existsSync(serverPath);
const runIntegration = process.env.RUN_INTEGRATION === '1' && serverAvailable;
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('headlessHost integration', () => {
  let result: HeadlessClientResult | undefined;

  afterAll(async () => {
    if (result) {
      try {
        await result.core.shutdown();
      } catch {
        // Server may already be gone.
      }
      await result.core.dispose();
    }
  });

  it('spawns server, initializes, and shuts down cleanly', async () => {
    result = await createHeadlessClient(serverPath, {
      nodeArgs: ['--nolazy'],
      serverArgs: ['--stdio'],
    });

    // Initialize with default Apex settings.
    const initResult = await result.core.initialize(DEFAULT_APEX_SETTINGS, {
      rootUri: `file://${process.cwd()}`,
    });

    // The server should return capabilities.
    expect(initResult).toBeDefined();
    expect(initResult.capabilities).toBeDefined();

    // Shutdown + dispose.
    await result.core.shutdown();
    await result.core.dispose();

    expect(result.core.isDisposed()).toBe(true);

    // Prevent afterAll from double-disposing.
    result = undefined;
  }, 120_000);
});
