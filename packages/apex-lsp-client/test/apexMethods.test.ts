/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  APEX_METHODS,
  type Disposable,
  type FindMissingArtifactParams,
  type FindMissingArtifactResult,
  type RequestWorkspaceLoadParams,
  type QueueStateChangedParams,
  type WorkspaceIngestionCompleteParams,
  enableConsoleLogging,
  setLogLevel,
} from '@salesforce/apex-lsp-shared';
import { ApexClientCore } from '../src/apexClientCore';
import type { RpcConnection } from '../src/rpcConnection';

/**
 * Hand-rolled `RpcConnection` mock (mirrors apexClientCore.test.ts style).
 * Captures notification and request handlers so tests can invoke them.
 */
interface MockConnection extends RpcConnection {
  readonly requestHandlers: Map<string, (params: unknown) => unknown>;
  readonly notificationHandlers: Map<string, (params: unknown) => void>;
}

const makeMockConnection = (): MockConnection => {
  const requestHandlers = new Map<string, (params: unknown) => unknown>();
  const notificationHandlers = new Map<string, (params: unknown) => void>();

  const sendRequest = jest.fn(
    (method: string, _params?: unknown): Promise<unknown> =>
      Promise.resolve(
        method === 'initialize' ? { capabilities: {} } : { success: true },
      ),
  );
  const sendNotification = jest.fn(
    (_method: string, _params?: unknown): Promise<void> => Promise.resolve(),
  );
  const onRequest = jest.fn(
    (method: string, handler: (params: unknown) => unknown): Disposable => {
      requestHandlers.set(method, handler);
      return {
        dispose: () => {
          requestHandlers.delete(method);
        },
      };
    },
  );
  const onNotification = jest.fn(
    (method: string, handler: (params: unknown) => void): Disposable => {
      notificationHandlers.set(method, handler);
      return {
        dispose: () => {
          notificationHandlers.delete(method);
        },
      };
    },
  );
  const onError = jest.fn((_handler: (e: Error) => void): Disposable => ({
    dispose: jest.fn(),
  }));
  const onClose = jest.fn((_handler: () => void): Disposable => ({
    dispose: jest.fn(),
  }));
  const dispose = jest.fn((): void => undefined);

  return {
    sendRequest,
    sendNotification,
    onRequest,
    onNotification,
    onError,
    onClose,
    dispose,
    requestHandlers,
    notificationHandlers,
  } as unknown as MockConnection;
};

describe('ApexMethods typed surface', () => {
  let connection: MockConnection;

  beforeEach(() => {
    connection = makeMockConnection();
    enableConsoleLogging();
    setLogLevel('error');
  });

  describe('typed senders dispatch correct method string + params', () => {
    it('sendWorkspaceBatch sends apex/sendWorkspaceBatch', async () => {
      const core = await ApexClientCore.create(connection);
      const params = {
        sessionId: 'test-session',
        batchIndex: 0,
        totalBatches: 1,
        isLastBatch: true,
        compressedData: 'base64==',
        fileMetadata: [],
      };

      await core.sendWorkspaceBatch(params);

      const sendReq = connection.sendRequest as jest.Mock;
      expect(sendReq).toHaveBeenCalledWith(
        APEX_METHODS.sendWorkspaceBatch.method,
        params,
      );

      await core.dispose();
    });

    it('processWorkspaceBatches sends apex/processWorkspaceBatches', async () => {
      const core = await ApexClientCore.create(connection);
      const params = { sessionId: 'test-session', totalBatches: 5 };

      await core.processWorkspaceBatches(params);

      const sendReq = connection.sendRequest as jest.Mock;
      expect(sendReq).toHaveBeenCalledWith(
        APEX_METHODS.processWorkspaceBatches.method,
        params,
      );

      await core.dispose();
    });

    it('workspaceLoadComplete sends apex/workspaceLoadComplete notification', async () => {
      const core = await ApexClientCore.create(connection);
      const params = { success: true };

      core.workspaceLoadComplete(params);

      const sendNotif = connection.sendNotification as jest.Mock;
      expect(sendNotif).toHaveBeenCalledWith(
        APEX_METHODS.workspaceLoadComplete.method,
        params,
      );

      await core.dispose();
    });

    it('workspaceLoadFailed sends apex/workspaceLoadFailed notification', async () => {
      const core = await ApexClientCore.create(connection);
      const params = { success: false, error: 'timeout' };

      core.workspaceLoadFailed(params);

      const sendNotif = connection.sendNotification as jest.Mock;
      expect(sendNotif).toHaveBeenCalledWith(
        APEX_METHODS.workspaceLoadFailed.method,
        params,
      );

      await core.dispose();
    });

    it('profilingStart sends apex/profiling/start', async () => {
      const core = await ApexClientCore.create(connection);
      const params = { type: 'cpu' as const };

      await core.profilingStart(params);

      const sendReq = connection.sendRequest as jest.Mock;
      expect(sendReq).toHaveBeenCalledWith(
        APEX_METHODS.profilingStart.method,
        params,
      );

      await core.dispose();
    });

    it('profilingStop sends apex/profiling/stop', async () => {
      const core = await ApexClientCore.create(connection);
      const params = { tag: 'test-run' };

      await core.profilingStop(params);

      const sendReq = connection.sendRequest as jest.Mock;
      expect(sendReq).toHaveBeenCalledWith(
        APEX_METHODS.profilingStop.method,
        params,
      );

      await core.dispose();
    });

    it('profilingStatus sends apex/profiling/status', async () => {
      const core = await ApexClientCore.create(connection);
      const params = {} as Record<string, never>;

      await core.profilingStatus(params);

      const sendReq = connection.sendRequest as jest.Mock;
      expect(sendReq).toHaveBeenCalledWith(
        APEX_METHODS.profilingStatus.method,
        params,
      );

      await core.dispose();
    });
  });

  describe('onFindMissingArtifact', () => {
    it('registered handler receives params and returns result', async () => {
      const core = await ApexClientCore.create(connection);

      const handler = jest.fn(
        (_params: FindMissingArtifactParams): FindMissingArtifactResult => ({
          opened: ['file:///Found.cls'],
        }),
      );
      core.onFindMissingArtifact(handler);

      // Simulate server sending the request
      const registeredHandler = connection.requestHandlers.get(
        APEX_METHODS.findMissingArtifact.method,
      );
      expect(registeredHandler).toBeDefined();

      const params: FindMissingArtifactParams = {
        identifiers: [
          {
            name: 'MyClass',
            provenance: {
              sourceUri: 'file:///Test.cls',
              referenceRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 7,
              },
              referenceIdentity: 'ref:MyClass:1:0:1:7',
              parseCompleteness: 'complete',
            },
          },
        ],
        origin: {
          uri: 'file:///Test.cls',
          requestKind: 'definition',
        },
        mode: 'blocking',
      };
      const result = await registeredHandler!(params);
      expect(result).toEqual({ opened: ['file:///Found.cls'] });

      await core.dispose();
    });

    it('unregistered falls back to { notFound: true }', async () => {
      const core = await ApexClientCore.create(connection);

      // Without registering a custom handler, the default should answer
      const handler = connection.requestHandlers.get(
        APEX_METHODS.findMissingArtifact.method,
      );
      expect(handler).toBeDefined();

      const result = await handler!({
        identifiers: [],
        origin: {},
        mode: 'blocking',
      });
      expect(result).toEqual({ notFound: true });

      await core.dispose();
    });

    it('re-registration disposes old handler and installs new', async () => {
      const core = await ApexClientCore.create(connection);

      const handler1 = jest.fn((): FindMissingArtifactResult => ({
        opened: ['file:///A.cls'],
      }));
      const handler2 = jest.fn((): FindMissingArtifactResult => ({
        opened: ['file:///B.cls'],
      }));

      core.onFindMissingArtifact(handler1);
      core.onFindMissingArtifact(handler2);

      const registeredHandler = connection.requestHandlers.get(
        APEX_METHODS.findMissingArtifact.method,
      );
      const result = await registeredHandler!({});
      // Should call handler2, not handler1
      expect(result).toEqual({ opened: ['file:///B.cls'] });

      await core.dispose();
    });

    it('disposing the registration reverts to the default fallback', async () => {
      const core = await ApexClientCore.create(connection);

      const handler = jest.fn((): FindMissingArtifactResult => ({
        opened: ['file:///X.cls'],
      }));
      const disposable = core.onFindMissingArtifact(handler);

      // Dispose reverts to default
      disposable.dispose();

      const registeredHandler = connection.requestHandlers.get(
        APEX_METHODS.findMissingArtifact.method,
      );
      const result = await registeredHandler!({});
      expect(result).toEqual({ notFound: true });

      await core.dispose();
    });
  });

  describe('onRequestWorkspaceLoad', () => {
    it('registered handler receives notification params', async () => {
      const core = await ApexClientCore.create(connection);
      const received: RequestWorkspaceLoadParams[] = [];

      core.onRequestWorkspaceLoad((params) => {
        received.push(params);
      });

      // Simulate server sending the notification
      const handler = connection.notificationHandlers.get(
        APEX_METHODS.requestWorkspaceLoad.method,
      );
      expect(handler).toBeDefined();

      const params: RequestWorkspaceLoadParams = { reason: 'implementation' };
      handler!(params);
      expect(received).toEqual([params]);

      await core.dispose();
    });

    it('dispose removes the handler', async () => {
      const core = await ApexClientCore.create(connection);
      const received: RequestWorkspaceLoadParams[] = [];

      const disposable = core.onRequestWorkspaceLoad((params) => {
        received.push(params);
      });

      disposable.dispose();

      // Handler should be gone from the connection
      const handler = connection.notificationHandlers.get(
        APEX_METHODS.requestWorkspaceLoad.method,
      );
      expect(handler).toBeUndefined();

      await core.dispose();
    });
  });

  describe('onWorkspaceIngestionComplete', () => {
    it('registered handler receives notification', async () => {
      const core = await ApexClientCore.create(connection);
      const received: WorkspaceIngestionCompleteParams[] = [];

      core.onWorkspaceIngestionComplete((params) => {
        received.push(params);
      });

      const handler = connection.notificationHandlers.get(
        APEX_METHODS.workspaceIngestionComplete.method,
      );
      expect(handler).toBeDefined();

      const params = {} as Record<string, never>;
      handler!(params);
      expect(received).toHaveLength(1);

      await core.dispose();
    });
  });

  describe('onQueueStateChanged', () => {
    it('registered handler receives notification params', async () => {
      const core = await ApexClientCore.create(connection);
      const received: QueueStateChangedParams[] = [];

      core.onQueueStateChanged((params) => {
        received.push(params);
      });

      const handler = connection.notificationHandlers.get(
        APEX_METHODS.queueStateChanged.method,
      );
      expect(handler).toBeDefined();

      const params: QueueStateChangedParams = {
        metrics: { pending: 3 },
        metadata: { timestamp: Date.now() },
      };
      handler!(params);
      expect(received).toEqual([params]);

      await core.dispose();
    });
  });
});
