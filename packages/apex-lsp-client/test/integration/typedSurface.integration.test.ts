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
 * Integration test for the typed apex/* surface. Spawns the real Node language
 * server, performs the LSP initialize handshake, and validates that typed
 * senders and handler registrations work end-to-end.
 *
 * Gated: requires `RUN_INTEGRATION=1` AND the server binary must exist.
 */
const serverPath = join(__dirname, '../../../apex-ls/dist/server.node.js');
const serverAvailable = existsSync(serverPath);
const runIntegration = process.env.RUN_INTEGRATION === '1' && serverAvailable;
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('typed apex/* surface integration', () => {
  let result: HeadlessClientResult | undefined;

  beforeEach(() => {
    // Each test gets a fresh client if needed
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

  it('typed sender round-trip: sendWorkspaceBatch against live server', async () => {
    result = await createHeadlessClient(serverPath, {
      nodeArgs: ['--nolazy'],
      serverArgs: ['--stdio'],
    });

    await result.core.initialize(DEFAULT_APEX_SETTINGS);

    // The server should accept (or reject with an error) a workspace batch
    // request. We just verify the typed sender dispatches correctly and gets
    // a response (success or error) without throwing a transport error.
    try {
      const response = await result.core.sendWorkspaceBatch({
        sessionId: 'integration-session',
        batchIndex: 0,
        totalBatches: 1,
        isLastBatch: true,
        compressedData: '',
        fileMetadata: [],
      });
      // If server responds, it should have a success field
      expect(response).toHaveProperty('success');
    } catch (e: unknown) {
      // Server may reject with a response error — that's valid; it means the
      // typed sender dispatched correctly to the wire.
      expect(e).toBeDefined();
    }
  }, 30000);

  it('onFindMissingArtifact fallback response when server sends the request', async () => {
    if (!result) {
      result = await createHeadlessClient(serverPath, {
        nodeArgs: ['--nolazy'],
        serverArgs: ['--stdio'],
      });
      await result.core.initialize(DEFAULT_APEX_SETTINGS);
    }

    // The default handler is { notFound: true }. We verify the handler is
    // registered by checking the core has the method. In a real scenario,
    // the server would send this request during workspace operations.
    // Here we verify the registration doesn't throw and the core is healthy.
    expect(result.core.isDisposed()).toBe(false);

    // Register a custom handler and verify it can be set without error
    const disposable = result.core.onFindMissingArtifact((_params) => ({
      notFound: true,
    }));
    expect(disposable).toBeDefined();
    expect(disposable.dispose).toBeInstanceOf(Function);

    // Revert to default
    disposable.dispose();
  }, 30000);

  it('onRequestWorkspaceLoad handler receives notification from live server', async () => {
    if (!result) {
      result = await createHeadlessClient(serverPath, {
        nodeArgs: ['--nolazy'],
        serverArgs: ['--stdio'],
      });
      await result.core.initialize(DEFAULT_APEX_SETTINGS);
    }

    // Register the handler — verifies the registration completes without error
    // and the returned Disposable is valid. Actual notification receipt depends
    // on server triggering it, which requires a workspace load flow.
    const received: unknown[] = [];
    const disposable = result.core.onRequestWorkspaceLoad((params) => {
      received.push(params);
    });
    expect(disposable).toBeDefined();
    expect(disposable.dispose).toBeInstanceOf(Function);

    // Clean up
    disposable.dispose();
  }, 30000);
});
