/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  DEFAULT_APEX_SETTINGS,
  enableConsoleLogging,
  setLogLevel,
  type Disposable,
  type InitializeResult,
} from '@salesforce/apex-lsp-shared';
import { ApexClientCore } from '../src/apexClientCore';
import type { RpcConnection } from '../src/rpcConnection';
import type { ApexClientMiddleware } from '../src/apexClientMiddleware';

const FIND_MISSING_ARTIFACT_METHOD = 'apex/findMissingArtifact';

const INIT_RESULT: InitializeResult = {
  capabilities: {},
};

/**
 * Hand-rolled `RpcConnection` mock. Each method is a `jest.fn` so call order can
 * be asserted via `mock.invocationCallOrder`. `onRequest` records the registered
 * handler so the test can invoke it directly (simulating a server→client
 * request) and returns a spy-tracked `Disposable`.
 */
interface MockConnection extends RpcConnection {
  readonly requestHandlers: Map<string, (params: unknown) => unknown>;
  readonly onRequestDisposeSpy: jest.Mock<() => void>;
}

const makeMockConnection = (
  sendRequestImpl?: (method: string, params?: unknown) => Promise<unknown>,
): MockConnection => {
  const requestHandlers = new Map<string, (params: unknown) => unknown>();
  const onRequestDisposeSpy = jest.fn<() => void>();

  const sendRequest = jest.fn(
    (method: string, params?: unknown): Promise<unknown> =>
      sendRequestImpl
        ? sendRequestImpl(method, params)
        : Promise.resolve(method === 'initialize' ? INIT_RESULT : undefined),
  );
  const sendNotification = jest.fn(
    (_method: string, _params?: unknown): Promise<void> => Promise.resolve(),
  );
  const onRequest = jest.fn(
    (method: string, handler: (params: unknown) => unknown): Disposable => {
      requestHandlers.set(method, handler);
      return { dispose: onRequestDisposeSpy };
    },
  );
  const onNotification = jest.fn(
    (_method: string, _handler: (params: unknown) => void): Disposable => ({
      dispose: jest.fn(),
    }),
  );
  const onError = jest.fn(
    (_handler: (e: Error) => void): Disposable => ({ dispose: jest.fn() }),
  );
  const onClose = jest.fn(
    (_handler: () => void): Disposable => ({ dispose: jest.fn() }),
  );
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
    onRequestDisposeSpy,
  } as unknown as MockConnection;
};

describe('ApexClientCore', () => {
  let connection: MockConnection;

  beforeEach(() => {
    connection = makeMockConnection();
    enableConsoleLogging();
    setLogLevel('error');
  });

  describe('defaults registered at construction', () => {
    it('registers the findMissingArtifact responder before any traffic', async () => {
      const core = await ApexClientCore.create(connection);

      const onReqSpy = connection.onRequest as jest.Mock;
      // onRequest('apex/findMissingArtifact', ...) was called during create().
      expect(onReqSpy).toHaveBeenCalledWith(
        FIND_MISSING_ARTIFACT_METHOD,
        expect.any(Function),
      );
      // No request has flowed yet — sendRequest must not have run.
      expect(connection.sendRequest as jest.Mock).not.toHaveBeenCalled();

      await core.dispose();
    });

    it('handler-before-traffic: onRequest fires before the first sendRequest(initialize)', async () => {
      const core = await ApexClientCore.create(connection);
      await core.initialize();

      const onReqOrder = (connection.onRequest as jest.Mock).mock
        .invocationCallOrder[0];
      const sendReqOrder = (connection.sendRequest as jest.Mock).mock
        .invocationCallOrder[0];
      expect(onReqOrder).toBeLessThan(sendReqOrder);

      await core.dispose();
    });

    it('default findMissingArtifact handler returns { notFound: true }', async () => {
      const core = await ApexClientCore.create(connection);

      const handler = connection.requestHandlers.get(
        FIND_MISSING_ARTIFACT_METHOD,
      );
      expect(handler).toBeDefined();
      await expect(handler!({ uri: 'file:///x.cls' })).resolves.toEqual({
        notFound: true,
      });

      await core.dispose();
    });
  });

  describe('initialize (Concern 1 lifecycle)', () => {
    it('sends initialize then initialized, in order, after the result resolves', async () => {
      const core = await ApexClientCore.create(connection);
      const result = await core.initialize();

      expect(result).toEqual(INIT_RESULT);

      const sendReq = connection.sendRequest as jest.Mock;
      const sendNotif = connection.sendNotification as jest.Mock;

      expect(sendReq).toHaveBeenCalledWith('initialize', expect.any(Object));
      expect(sendNotif).toHaveBeenCalledWith('initialized', {});

      // initialize request resolves strictly before the initialized notification.
      const initReqOrder = sendReq.mock.invocationCallOrder[0];
      const initNotifOrder = sendNotif.mock.invocationCallOrder[0];
      expect(initReqOrder).toBeLessThan(initNotifOrder);

      await core.dispose();
    });

    it('passes settings as initializationOptions (default DEFAULT_APEX_SETTINGS)', async () => {
      const core = await ApexClientCore.create(connection);
      await core.initialize();

      const sendReq = connection.sendRequest as jest.Mock;
      const [, params] = sendReq.mock.calls[0] as [
        string,
        { initializationOptions: unknown },
      ];
      expect(params.initializationOptions).toEqual(DEFAULT_APEX_SETTINGS);

      await core.dispose();
    });

    it('does NOT send initialized if the initialize request rejects', async () => {
      const failing = makeMockConnection((method) =>
        method === 'initialize'
          ? Promise.reject(new Error('initialize failed'))
          : Promise.resolve(undefined),
      );
      const core = await ApexClientCore.create(failing);

      await expect(core.initialize()).rejects.toThrow('initialize failed');

      const sendNotif = failing.sendNotification as jest.Mock;
      expect(sendNotif).not.toHaveBeenCalledWith('initialized', {});

      await core.dispose();
    });

    it('is idempotent: a second initialize returns the memoized result and re-sends nothing', async () => {
      const core = await ApexClientCore.create(connection);
      const first = await core.initialize();
      const second = await core.initialize();

      expect(second).toEqual(first);

      const sendReq = connection.sendRequest as jest.Mock;
      const initCalls = sendReq.mock.calls.filter(([m]) => m === 'initialize');
      expect(initCalls).toHaveLength(1);

      const sendNotif = connection.sendNotification as jest.Mock;
      const initializedCalls = sendNotif.mock.calls.filter(
        ([m]) => m === 'initialized',
      );
      expect(initializedCalls).toHaveLength(1);

      await core.dispose();
    });
  });

  describe('shutdown (Concern 1 lifecycle)', () => {
    it('sends shutdown then exit, in order', async () => {
      const core = await ApexClientCore.create(connection);
      await core.shutdown();

      const sendReq = connection.sendRequest as jest.Mock;
      const sendNotif = connection.sendNotification as jest.Mock;

      expect(sendReq).toHaveBeenCalledWith('shutdown');
      expect(sendNotif).toHaveBeenCalledWith('exit');

      const shutdownOrder = sendReq.mock.invocationCallOrder[0];
      const exitOrder = sendNotif.mock.invocationCallOrder[0];
      expect(shutdownOrder).toBeLessThan(exitOrder);

      await core.dispose();
    });

    it('is idempotent: a second shutdown sends nothing more', async () => {
      const core = await ApexClientCore.create(connection);
      await core.shutdown();
      await core.shutdown();

      const sendReq = connection.sendRequest as jest.Mock;
      const shutdownCalls = sendReq.mock.calls.filter(
        ([m]) => m === 'shutdown',
      );
      expect(shutdownCalls).toHaveLength(1);

      const sendNotif = connection.sendNotification as jest.Mock;
      const exitCalls = sendNotif.mock.calls.filter(([m]) => m === 'exit');
      expect(exitCalls).toHaveLength(1);

      await core.dispose();
    });
  });

  describe('dispose', () => {
    it('disposes handler Disposables BEFORE connection.dispose (LIFO ordering)', async () => {
      const core = await ApexClientCore.create(connection);
      await core.dispose();

      const handlerDisposeOrder =
        connection.onRequestDisposeSpy.mock.invocationCallOrder[0];
      const connectionDisposeOrder = (connection.dispose as jest.Mock).mock
        .invocationCallOrder[0];

      expect(handlerDisposeOrder).toBeDefined();
      expect(connectionDisposeOrder).toBeDefined();
      expect(handlerDisposeOrder).toBeLessThan(connectionDisposeOrder);
    });

    it('isDisposed() is true after dispose', async () => {
      const core = await ApexClientCore.create(connection);
      expect(core.isDisposed()).toBe(false);

      await core.dispose();
      expect(core.isDisposed()).toBe(true);
    });

    it('is idempotent: a second dispose does not tear the connection down twice', async () => {
      const core = await ApexClientCore.create(connection);
      await core.dispose();
      await core.dispose();

      expect((connection.dispose as jest.Mock).mock.calls).toHaveLength(1);
    });
  });

  describe('use(mw)', () => {
    it('returns a Disposable that removes the middleware from the registered set', async () => {
      const core = await ApexClientCore.create(connection);

      const mw: ApexClientMiddleware = {
        sendRequest: (_method, params, next) => next(params),
      };
      const disposable = core.use(mw);
      expect(typeof disposable.dispose).toBe('function');

      // Disposing must not throw (it removes the entry from the Ref-backed set).
      expect(() => disposable.dispose()).not.toThrow();

      await core.dispose();
    });
  });
});
