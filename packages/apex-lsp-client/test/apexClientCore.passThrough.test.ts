/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  const sendRequest = vi.fn(
    (_method: string, _params?: unknown): Promise<unknown> =>
      Promise.resolve({ mocked: true }),
  );
  const sendNotification = vi.fn(
    (_method: string, _params?: unknown): void => undefined,
  );
  const onRequest = vi.fn(
    (method: string, handler: (params: unknown) => unknown): Disposable => {
      requestHandlers.set(method, handler);
      return { dispose: vi.fn() };
    },
  );
  const onNotification = vi.fn(
    (_method: string, _handler: (params: unknown) => void): Disposable => ({
      dispose: vi.fn(),
    }),
  );
  const onError = vi.fn((_handler: (e: Error) => void): Disposable => ({
    dispose: vi.fn(),
  }));
  const onClose = vi.fn((_handler: () => void): Disposable => ({
    dispose: vi.fn(),
  }));
  const dispose = vi.fn((): void => undefined);

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

      const sendReq = connection.sendRequest as Mock;
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

      const sendNotif = connection.sendNotification as Mock;
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

      const sendReq = connection.sendRequest as Mock;
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

      const sendReq = connection.sendRequest as Mock;
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

      const sendReq = connection.sendRequest as Mock;
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

      const sendReq = connection.sendRequest as Mock;
      expect(sendReq).toHaveBeenCalledWith('textDocument/documentSymbol', {
        textDocument: { uri: 'file:///z.cls' },
      });

      await core.dispose();
    });
  });

  describe('semanticTokens()', () => {
    it('does not send a request before a full provider is negotiated', async () => {
      const core = await ApexClientCore.create(connection);

      await expect(
        core.semanticTokens({ textDocument: { uri: 'file:///x.cls' } }),
      ).resolves.toBeUndefined();
      expect(connection.sendRequest).not.toHaveBeenCalledWith(
        'textDocument/semanticTokens/full',
        expect.anything(),
      );

      await core.dispose();
    });

    it('sends the full request and decodes against the negotiated legend', async () => {
      const sendRequest = connection.sendRequest as Mock;
      sendRequest.mockResolvedValueOnce({ data: [0, 4, 3, 1, 1] });
      const core = await ApexClientCore.create(connection);
      core.setFeatureStatesFromInitializeResult({
        capabilities: {
          semanticTokensProvider: {
            legend: {
              tokenTypes: ['keyword', 'class'],
              tokenModifiers: ['declaration'],
            },
            full: true,
          },
        },
      });

      await expect(
        core.semanticTokens({ textDocument: { uri: 'file:///x.cls' } }),
      ).resolves.toEqual([
        {
          line: 0,
          character: 4,
          length: 3,
          tokenType: 'class',
          tokenModifiers: ['declaration'],
        },
      ]);
      expect(sendRequest).toHaveBeenCalledWith(
        'textDocument/semanticTokens/full',
        { textDocument: { uri: 'file:///x.cls' } },
      );

      await core.dispose();
    });

    it('supports a full provider that also advertises delta support', async () => {
      const sendRequest = connection.sendRequest as Mock;
      sendRequest.mockResolvedValueOnce({ data: [] });
      const core = await ApexClientCore.create(connection);
      core.setFeatureStatesFromInitializeResult({
        capabilities: {
          semanticTokensProvider: {
            legend: { tokenTypes: ['class'], tokenModifiers: [] },
            full: { delta: true },
          },
        },
      });

      await expect(
        core.semanticTokens({ textDocument: { uri: 'file:///x.cls' } }),
      ).resolves.toEqual([]);
      expect(sendRequest).toHaveBeenCalledWith(
        'textDocument/semanticTokens/full',
        { textDocument: { uri: 'file:///x.cls' } },
      );

      await core.dispose();
    });

    it('rejects after disposal even when semantic tokens are unavailable', async () => {
      const core = await ApexClientCore.create(connection);
      await core.dispose();

      await expect(
        core.semanticTokens({ textDocument: { uri: 'file:///x.cls' } }),
      ).rejects.toThrow(ApexClientDisposedError);
    });

    it('does not forward partial-result tokens it cannot consume', async () => {
      const sendRequest = connection.sendRequest as Mock;
      sendRequest.mockResolvedValueOnce({ data: [] });
      const core = await ApexClientCore.create(connection);
      core.setFeatureStatesFromInitializeResult({
        capabilities: {
          semanticTokensProvider: {
            legend: { tokenTypes: ['class'], tokenModifiers: [] },
            full: true,
          },
        },
      });

      await core.semanticTokens({
        textDocument: { uri: 'file:///x.cls' },
        partialResultToken: 'unsupported',
      });

      expect(sendRequest).toHaveBeenCalledWith(
        'textDocument/semanticTokens/full',
        { textDocument: { uri: 'file:///x.cls' } },
      );
      await core.dispose();
    });

    it('discards a response when the negotiated provider changes in flight', async () => {
      let resolveResponse: ((response: unknown) => void) | undefined;
      const sendRequest = connection.sendRequest as Mock;
      sendRequest.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveResponse = resolve;
          }),
      );
      const core = await ApexClientCore.create(connection);
      core.setFeatureStatesFromInitializeResult({
        capabilities: {
          semanticTokensProvider: {
            legend: { tokenTypes: ['class'], tokenModifiers: [] },
            full: true,
          },
        },
      });

      const pending = core.semanticTokens({
        textDocument: { uri: 'file:///x.cls' },
      });
      core.setFeatureStatesFromInitializeResult(undefined);
      resolveResponse?.({ data: [0, 0, 1, 0, 0] });

      await expect(pending).resolves.toBeUndefined();
      await core.dispose();
    });

    it('invalidates an existing provider when a replacement is malformed', async () => {
      const core = await ApexClientCore.create(connection);
      core.setFeatureStatesFromInitializeResult({
        capabilities: {
          semanticTokensProvider: {
            legend: { tokenTypes: ['class'], tokenModifiers: [] },
            full: true,
          },
        },
      });
      core.setFeatureStatesFromInitializeResult({
        capabilities: { semanticTokensProvider: null as never },
      });

      await expect(
        core.semanticTokens({ textDocument: { uri: 'file:///x.cls' } }),
      ).resolves.toBeUndefined();
      expect(connection.sendRequest).not.toHaveBeenCalledWith(
        'textDocument/semanticTokens/full',
        expect.anything(),
      );
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
