/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  enableConsoleLogging,
  setLogLevel,
  type Disposable,
} from '@salesforce/apex-lsp-shared';
import { ApexClientCore, ApexClientDisposedError } from '../src/apexClientCore';
import type { RpcConnection } from '../src/rpcConnection';
import type { ApexClientMiddleware } from '../src/apexClientMiddleware';

interface MockConnection extends RpcConnection {
  readonly requestHandlers: Map<string, (params: unknown) => unknown>;
}

const makeMockConnection = (): MockConnection => {
  const requestHandlers = new Map<string, (params: unknown) => unknown>();

  const sendRequest = jest.fn(
    (_method: string, _params?: unknown): Promise<unknown> =>
      Promise.resolve({ mocked: true }),
  );
  const sendNotification = jest.fn(
    (_method: string, _params?: unknown): void => undefined,
  );
  const onRequest = jest.fn(
    (method: string, handler: (params: unknown) => unknown): Disposable => {
      requestHandlers.set(method, handler);
      return { dispose: jest.fn() };
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
  } as unknown as MockConnection;
};

describe('ApexClientCore pass-through methods', () => {
  let connection: MockConnection;

  beforeEach(() => {
    connection = makeMockConnection();
    enableConsoleLogging();
    setLogLevel('error');
  });

  describe('request() escape hatch', () => {
    it('sends method + params through the chain to connection.sendRequest', async () => {
      const core = await ApexClientCore.create(connection);
      const result = await core.request<{ mocked: boolean }>('custom/method', {
        foo: 'bar',
      });

      const sendReq = connection.sendRequest as jest.Mock;
      expect(sendReq).toHaveBeenCalledWith('custom/method', { foo: 'bar' });
      expect(result).toEqual({ mocked: true });

      await core.dispose();
    });

    it('rejects with ApexClientDisposedError after dispose', async () => {
      const core = await ApexClientCore.create(connection);
      await core.dispose();

      await expect(core.request('custom/method')).rejects.toThrow(
        ApexClientDisposedError,
      );
    });
  });

  describe('notify()', () => {
    it('sends method + params through the chain to connection.sendNotification', async () => {
      const core = await ApexClientCore.create(connection);
      core.notify('custom/notification', { data: 1 });

      const sendNotif = connection.sendNotification as jest.Mock;
      expect(sendNotif).toHaveBeenCalledWith('custom/notification', {
        data: 1,
      });

      await core.dispose();
    });

    it('throws ApexClientDisposedError after dispose', async () => {
      const core = await ApexClientCore.create(connection);
      await core.dispose();

      expect(() => core.notify('custom/notification')).toThrow(
        ApexClientDisposedError,
      );
    });
  });

  describe('hover()', () => {
    it('sends textDocument/hover with correct params', async () => {
      const core = await ApexClientCore.create(connection);
      await core.hover({
        textDocument: { uri: 'file:///x.cls' },
        position: { line: 0, character: 5 },
      });

      const sendReq = connection.sendRequest as jest.Mock;
      expect(sendReq).toHaveBeenCalledWith('textDocument/hover', {
        textDocument: { uri: 'file:///x.cls' },
        position: { line: 0, character: 5 },
      });

      await core.dispose();
    });
  });

  describe('completion()', () => {
    it('sends textDocument/completion with correct params', async () => {
      const core = await ApexClientCore.create(connection);
      await core.completion({
        textDocument: { uri: 'file:///x.cls' },
        position: { line: 1, character: 10 },
      });

      const sendReq = connection.sendRequest as jest.Mock;
      expect(sendReq).toHaveBeenCalledWith('textDocument/completion', {
        textDocument: { uri: 'file:///x.cls' },
        position: { line: 1, character: 10 },
      });

      await core.dispose();
    });
  });

  describe('definition()', () => {
    it('sends textDocument/definition with correct params', async () => {
      const core = await ApexClientCore.create(connection);
      await core.definition({
        textDocument: { uri: 'file:///y.cls' },
        position: { line: 5, character: 3 },
      });

      const sendReq = connection.sendRequest as jest.Mock;
      expect(sendReq).toHaveBeenCalledWith('textDocument/definition', {
        textDocument: { uri: 'file:///y.cls' },
        position: { line: 5, character: 3 },
      });

      await core.dispose();
    });
  });

  describe('documentSymbol()', () => {
    it('sends textDocument/documentSymbol with correct params', async () => {
      const core = await ApexClientCore.create(connection);
      await core.documentSymbol({
        textDocument: { uri: 'file:///z.cls' },
      });

      const sendReq = connection.sendRequest as jest.Mock;
      expect(sendReq).toHaveBeenCalledWith('textDocument/documentSymbol', {
        textDocument: { uri: 'file:///z.cls' },
      });

      await core.dispose();
    });
  });

  describe('middleware integration', () => {
    it('middleware registered via use() intercepts typed pass-throughs', async () => {
      const intercepted: string[] = [];
      const mw: ApexClientMiddleware = {
        sendRequest: (method, params, next) => {
          intercepted.push(method);
          return next(params);
        },
      };

      const core = await ApexClientCore.create(connection);
      core.use(mw);

      await core.hover({
        textDocument: { uri: 'file:///x.cls' },
        position: { line: 0, character: 0 },
      });
      await core.completion({
        textDocument: { uri: 'file:///x.cls' },
        position: { line: 0, character: 0 },
      });

      expect(intercepted).toContain('textDocument/hover');
      expect(intercepted).toContain('textDocument/completion');

      await core.dispose();
    });

    it('disposed middleware no longer intercepts', async () => {
      const intercepted: string[] = [];
      const mw: ApexClientMiddleware = {
        sendRequest: (method, params, next) => {
          intercepted.push(method);
          return next(params);
        },
      };

      const core = await ApexClientCore.create(connection);
      const disposable = core.use(mw);

      await core.hover({
        textDocument: { uri: 'file:///x.cls' },
        position: { line: 0, character: 0 },
      });
      expect(intercepted).toHaveLength(1);

      disposable.dispose();

      await core.hover({
        textDocument: { uri: 'file:///x.cls' },
        position: { line: 0, character: 0 },
      });
      // Still just 1 — the middleware was removed.
      expect(intercepted).toHaveLength(1);

      await core.dispose();
    });
  });
});
