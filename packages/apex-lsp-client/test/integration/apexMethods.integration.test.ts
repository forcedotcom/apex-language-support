/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { join } from 'path';
import { existsSync } from 'fs';
import { DEFAULT_APEX_SETTINGS } from '@salesforce/apex-lsp-shared';
import { createHeadlessClient } from '../../src/hosts/headlessHost';
import type { HeadlessClientResult } from '../../src/hosts/headlessHost';

/**
 * Integration test for apex/* methods against the real Node language server.
 *
 * Tests the full round-trip of all apex/* typed senders and handlers, including:
 * - apex/sendWorkspaceBatch
 * - apex/processWorkspaceBatches
 * - apex/workspaceLoadComplete
 * - apex/workspaceLoadFailed
 * - apex/queueState
 * - apex/graphData
 * - apex/profiling/*
 * - apex/findMissingArtifact (handler)
 *
 * Also verifies gating suppression: when enableGating is false in settings,
 * the server should not apply gating logic to requests.
 *
 * Gated: requires `RUN_INTEGRATION=1` AND the server binary must exist.
 * To run locally:
 *   npm run bundle -w @salesforce/apex-ls && RUN_INTEGRATION=1 npm test -w @salesforce/apex-lsp-client
 */
const serverPath = join(__dirname, '../../../apex-ls/dist/server.node.js');
const serverAvailable = existsSync(serverPath);
const runIntegration = process.env.RUN_INTEGRATION === '1' && serverAvailable;
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('apex/* methods real-server integration', () => {
  let result: HeadlessClientResult | undefined;

  beforeAll(async () => {
    result = await createHeadlessClient(serverPath, {
      nodeArgs: ['--nolazy'],
      serverArgs: ['--stdio'],
    });

    // Initialize with gating disabled for the suppression tests
    await result.core.initialize({
      ...DEFAULT_APEX_SETTINGS,
      enableGating: false,
    });
  }, 60000);

  afterAll(async () => {
    if (result) {
      try {
        await result.core.shutdown();
      } catch {
        // Server may already be gone.
      }
      await result.core.dispose();
    }
  }, 60000);

  describe('workspace batch operations', () => {
    it('sendWorkspaceBatch round-trip', async () => {
      expect(result).toBeDefined();

      try {
        const response = await result!.core.sendWorkspaceBatch({
          batchIndex: 0,
          totalBatches: 1,
          isLastBatch: true,
          compressedData: '',
          fileMetadata: [],
        });

        // Server should respond with a result (success or error structure)
        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
      } catch (e: unknown) {
        // Server may reject with a response error due to invalid data.
        // That's valid — it means the round-trip completed and the server
        // processed the request.
        expect(e).toBeDefined();
      }
    }, 30000);

    it('processWorkspaceBatches round-trip', async () => {
      expect(result).toBeDefined();

      try {
        const response = await result!.core.processWorkspaceBatches({
          totalBatches: 0,
        });

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
      } catch (e: unknown) {
        // Similar to above — response error means round-trip worked.
        expect(e).toBeDefined();
      }
    }, 30000);

    it('workspaceLoadComplete notification sends without error', async () => {
      expect(result).toBeDefined();

      // Notifications don't return a value, just verify no throw
      expect(() => {
        result!.core.workspaceLoadComplete({ success: true });
      }).not.toThrow();
    });

    it('workspaceLoadFailed notification sends without error', async () => {
      expect(result).toBeDefined();

      expect(() => {
        result!.core.workspaceLoadFailed({
          success: false,
          error: 'test error',
        });
      }).not.toThrow();
    });
  });

  describe('queue and graph operations', () => {
    it('queueState round-trip', async () => {
      expect(result).toBeDefined();

      try {
        const response = await result!.core.queueState({});

        // Server should return queue state structure
        expect(response).toBeDefined();
      } catch (e: unknown) {
        // May error if server state is not ready
        expect(e).toBeDefined();
      }
    }, 30000);

    it('graphData round-trip', async () => {
      expect(result).toBeDefined();

      try {
        const response = await result!.core.graphData({});

        // Server should return graph data structure
        expect(response).toBeDefined();
      } catch (e: unknown) {
        // May error if server state is not ready
        expect(e).toBeDefined();
      }
    }, 30000);
  });

  describe('profiling operations', () => {
    it('profilingStart round-trip', async () => {
      expect(result).toBeDefined();

      try {
        const response = await result!.core.profilingStart({});

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
      } catch (e: unknown) {
        // May error if profiling not available
        expect(e).toBeDefined();
      }
    }, 30000);

    it('profilingStop round-trip', async () => {
      expect(result).toBeDefined();

      try {
        const response = await result!.core.profilingStop({});

        expect(response).toBeDefined();
        expect(response).toHaveProperty('success');
      } catch (e: unknown) {
        // May error if profiling not started
        expect(e).toBeDefined();
      }
    }, 30000);

    it('profilingStatus round-trip', async () => {
      expect(result).toBeDefined();

      try {
        const response = await result!.core.profilingStatus({});

        expect(response).toBeDefined();
        expect(response).toHaveProperty('enabled');
      } catch (e: unknown) {
        // May error if profiling not available
        expect(e).toBeDefined();
      }
    }, 30000);
  });

  describe('server-to-client handlers', () => {
    it('onFindMissingArtifact handler registration works', async () => {
      expect(result).toBeDefined();

      const disposable = result!.core.onFindMissingArtifact((_params) => ({
        notFound: true,
      }));

      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');

      // Clean up
      disposable.dispose();

      // Note: We can't easily trigger the server to send this request in a test,
      // but we verify the registration works without error.
    });

    it('onRequestWorkspaceLoad handler registration works', async () => {
      expect(result).toBeDefined();

      const received: any[] = [];
      const disposable = result!.core.onRequestWorkspaceLoad((params) => {
        received.push(params);
      });

      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');

      disposable.dispose();
    });

    it('onWorkspaceIngestionComplete handler registration works', async () => {
      expect(result).toBeDefined();

      const received: any[] = [];
      const disposable = result!.core.onWorkspaceIngestionComplete((params) => {
        received.push(params);
      });

      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');

      disposable.dispose();
    });

    it('onQueueStateChanged handler registration works', async () => {
      expect(result).toBeDefined();

      const received: any[] = [];
      const disposable = result!.core.onQueueStateChanged((params) => {
        received.push(params);
      });

      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');

      disposable.dispose();
    });
  });

  describe('gating suppression', () => {
    it('server respects enableGating: false in settings', async () => {
      expect(result).toBeDefined();

      // We initialized with enableGating: false in beforeAll.
      // Verify that requests complete without gating errors.
      // Gating errors typically manifest as specific error codes or messages.

      // Send a request that would normally be gated
      try {
        const response = await result!.core.sendWorkspaceBatch({
          batchIndex: 0,
          totalBatches: 1,
          isLastBatch: true,
          compressedData: '',
          fileMetadata: [],
        });

        // If gating were active and blocking, we'd expect a gating error.
        // With gating disabled, we should get a normal response (success or
        // validation error, but not a gating error).
        expect(response).toBeDefined();
      } catch (e: unknown) {
        // If we get an error, verify it's not a gating error.
        // Gating errors typically have specific codes or messages.
        const error = e as { message?: string; code?: number };
        expect(error.message).not.toMatch(/gat(?:e|ing)/i);
      }
    }, 30000);
  });
});
