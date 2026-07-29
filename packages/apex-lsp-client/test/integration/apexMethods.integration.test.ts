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
 * Gated: requires `RUN_INTEGRATION=1` AND the server binary must exist.
 * To run locally:
 *   npm run bundle -w @salesforce/apex-ls && RUN_INTEGRATION=1 npm test -w @salesforce/apex-lsp-client
 */
const serverPath = join(__dirname, '../../../apex-ls/dist/server.node.js');
const serverAvailable = existsSync(serverPath);
const runIntegration = process.env.RUN_INTEGRATION === '1' && serverAvailable;
const describeIntegration = runIntegration ? describe : describe.skip;

/**
 * Assert an `apex/*` request completed a real protocol round-trip.
 *
 * Success path: the server returned a response, which must be defined and (when
 * `expectedProp` is given) carry that property.
 *
 * Error path: the request rejected with a JSON-RPC `ResponseError` — an `Error`
 * bearing a numeric `code`. That proves the request reached the server and was
 * processed/rejected on the wire. A client-side crash (e.g. a malformed request
 * that throws before sending) surfaces as a plain `Error`/`TypeError` with no
 * numeric `code` and fails this assertion — so these tests can no longer pass
 * unconditionally on the error path.
 */
const expectRoundTrip = async <T>(
  send: () => Promise<T>,
  expectedProp?: string,
): Promise<void> => {
  let response: T | undefined;
  let caught: unknown;
  let threw = false;
  try {
    response = await send();
  } catch (e: unknown) {
    threw = true;
    caught = e;
  }

  if (!threw) {
    expect(response).toBeDefined();
    if (expectedProp !== undefined) {
      expect(response).toHaveProperty(expectedProp);
    }
    return;
  }

  expect(caught).toBeInstanceOf(Error);
  expect(typeof (caught as { code?: unknown }).code).toBe('number');
};

describeIntegration('apex/* methods real-server integration', () => {
  let result: HeadlessClientResult | undefined;

  beforeAll(async () => {
    result = await createHeadlessClient(serverPath, {
      nodeArgs: ['--nolazy'],
      serverArgs: ['--stdio'],
    });

    await result.core.initialize(DEFAULT_APEX_SETTINGS);
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

      await expectRoundTrip(
        () =>
          result!.core.sendWorkspaceBatch({
            sessionId: 'integration-session',
            batchIndex: 0,
            totalBatches: 1,
            isLastBatch: true,
            compressedData: '',
            fileMetadata: [],
          }),
        'success',
      );
    }, 30000);

    it('processWorkspaceBatches round-trip', async () => {
      expect(result).toBeDefined();

      await expectRoundTrip(
        () =>
          result!.core.processWorkspaceBatches({
            sessionId: 'integration-session',
            totalBatches: 0,
          }),
        'success',
      );
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

      await expectRoundTrip(() => result!.core.queueState({}));
    }, 30000);

    it('graphData round-trip', async () => {
      expect(result).toBeDefined();

      await expectRoundTrip(() => result!.core.graphData({ type: 'all' }));
    }, 30000);
  });

  describe('profiling operations', () => {
    it('profilingStart round-trip', async () => {
      expect(result).toBeDefined();

      await expectRoundTrip(() => result!.core.profilingStart({}), 'success');
    }, 30000);

    it('profilingStop round-trip', async () => {
      expect(result).toBeDefined();

      await expectRoundTrip(() => result!.core.profilingStop({}), 'success');
    }, 30000);

    it('profilingStatus round-trip', async () => {
      expect(result).toBeDefined();

      await expectRoundTrip(() => result!.core.profilingStatus({}), 'enabled');
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
});
