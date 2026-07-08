/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, afterAll, beforeEach } from '@jest/globals';
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
  const errors: Error[] = [];
  const closeEvents: string[] = [];

  beforeEach(() => {
    errors.length = 0;
    closeEvents.length = 0;
  });

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

    // Register error and close handlers for observability.
    result.connection.onError((err) => {
      errors.push(err);
    });

    result.connection.onClose(() => {
      closeEvents.push('connection closed');
    });

    // Verify process health before initialization.
    expect(result.connection.isProcessAlive()).toBe(true);
    expect(result.process.pid).toBeGreaterThan(0);
    expect(result.process.killed).toBe(false);

    // Initialize with default Apex settings.
    const initResult = await result.core.initialize(DEFAULT_APEX_SETTINGS, {
      rootUri: `file://${process.cwd()}`,
    });

    // The server should return capabilities.
    expect(initResult).toBeDefined();
    expect(initResult.capabilities).toBeDefined();
    expect(initResult.capabilities.textDocumentSync).toBeDefined();

    // Verify process still healthy after initialization.
    expect(result.connection.isProcessAlive()).toBe(true);
    expect(errors).toHaveLength(0);

    // Shutdown + dispose.
    await result.core.shutdown();
    await result.core.dispose();

    // Verify clean disposal.
    expect(result.core.isDisposed()).toBe(true);
    expect(result.process.killed).toBe(true);
    expect(errors).toHaveLength(0);

    // Prevent afterAll from double-disposing.
    result = undefined;
  }, 120_000);

  it('handles precondition violation - already listening connection', async () => {
    result = await createHeadlessClient(serverPath, {
      nodeArgs: ['--nolazy'],
      serverArgs: ['--stdio'],
    });

    // Connection is already listening after createHeadlessClient.
    expect(result.connection.isListening()).toBe(true);

    // Attempting to create core with already-listening connection should throw.
    await expect(async () => {
      const { ApexClientCore } = await import('../../src/apexClientCore');
      await ApexClientCore.create(result!.connection);
    }).rejects.toThrow(/already listening/);

    // Clean up.
    await result.core.shutdown();
    await result.core.dispose();
    result = undefined;
  }, 120_000);

  it('process exits cleanly after dispose', async () => {
    result = await createHeadlessClient(serverPath, {
      nodeArgs: ['--nolazy'],
      serverArgs: ['--stdio'],
    });

    const pid = result.process.pid;
    expect(pid).toBeGreaterThan(0);

    // Initialize to ensure server is fully running.
    await result.core.initialize(DEFAULT_APEX_SETTINGS, {
      rootUri: `file://${process.cwd()}`,
    });

    // Dispose without shutdown (abrupt termination).
    await result.core.dispose();

    // Process should be killed and exit code set.
    expect(result.process.killed).toBe(true);
    expect(
      result.process.exitCode !== null || result.process.signalCode !== null,
    ).toBe(true);
    expect(result.connection.isProcessAlive()).toBe(false);

    result = undefined;
  }, 120_000);
});
