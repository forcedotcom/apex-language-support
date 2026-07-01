/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { MessageConnection } from 'vscode-jsonrpc';
import type { Disposable } from '@salesforce/apex-lsp-shared';
import { JsonRpcConnection } from '../../src/transports/jsonRpcConnection';

/**
 * Unit tests for `JsonRpcConnection`. Each test verifies 1:1 delegation to the
 * underlying `MessageConnection` mock, including the `onError` tuple-flattening.
 */
describe('JsonRpcConnection', () => {
  let mockConn: jest.Mocked<MessageConnection>;
  let adapter: JsonRpcConnection;

  beforeEach(() => {
    const disposable: Disposable = { dispose: jest.fn() };

    mockConn = {
      sendRequest: jest.fn<MessageConnection['sendRequest']>(),
      sendNotification: jest.fn<MessageConnection['sendNotification']>(),
      onRequest: jest.fn().mockReturnValue(disposable),
      onNotification: jest.fn().mockReturnValue(disposable),
      onError: jest.fn().mockReturnValue(disposable),
      onClose: jest.fn().mockReturnValue(disposable),
      onUnhandledNotification: jest.fn(),
      onProgress: jest.fn(),
      sendProgress: jest.fn(),
      onUnhandledProgress: jest.fn(),
      trace: jest.fn(),
      inspect: jest.fn(),
      end: jest.fn(),
      dispose: jest.fn(),
      listen: jest.fn(),
    } as unknown as jest.Mocked<MessageConnection>;

    adapter = new JsonRpcConnection(mockConn);
  });

  describe('sendRequest', () => {
    it('delegates to the underlying connection', async () => {
      const expected = { capabilities: {} };
      (mockConn.sendRequest as jest.Mock<any>).mockResolvedValue(expected);

      const result = await adapter.sendRequest('initialize', { processId: 1 });

      expect(mockConn.sendRequest).toHaveBeenCalledWith('initialize', {
        processId: 1,
      });
      expect(result).toBe(expected);
    });
  });

  describe('sendNotification', () => {
    it('delegates to the underlying connection', async () => {
      (mockConn.sendNotification as jest.Mock<any>).mockResolvedValue(
        undefined,
      );

      await adapter.sendNotification('initialized', {});

      expect(mockConn.sendNotification).toHaveBeenCalledWith('initialized', {});
    });
  });

  describe('onRequest', () => {
    it('registers a handler and returns a Disposable', () => {
      const handler = jest.fn();
      const disposable = adapter.onRequest('apex/findMissingArtifact', handler);

      expect(mockConn.onRequest).toHaveBeenCalledWith(
        'apex/findMissingArtifact',
        handler,
      );
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('onNotification', () => {
    it('registers a handler and returns a Disposable', () => {
      const handler = jest.fn();
      const disposable = adapter.onNotification('window/logMessage', handler);

      expect(mockConn.onNotification).toHaveBeenCalledWith(
        'window/logMessage',
        handler,
      );
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('onError', () => {
    it('flattens the tuple and passes only the Error to the handler', () => {
      // Capture the listener callback that the adapter passes to mockConn.onError
      let capturedListener: (e: [Error, unknown, unknown]) => void = () => {};
      (mockConn.onError as jest.Mock<any>).mockImplementation(
        (listener: (e: [Error, unknown, unknown]) => void) => {
          capturedListener = listener;
          return { dispose: jest.fn() };
        },
      );

      const handler = jest.fn();
      adapter.onError(handler);

      // Simulate the underlying connection emitting an error tuple.
      const error = new Error('connection broken');
      capturedListener([error, undefined, undefined]);

      expect(handler).toHaveBeenCalledWith(error);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('returns a Disposable', () => {
      const handler = jest.fn();
      const disposable = adapter.onError(handler);

      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('onClose', () => {
    it('delegates to the underlying connection', () => {
      const handler = jest.fn();
      const disposable = adapter.onClose(handler);

      expect(mockConn.onClose).toHaveBeenCalledWith(handler);
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('dispose', () => {
    it('delegates to the underlying connection', () => {
      adapter.dispose();

      expect(mockConn.dispose).toHaveBeenCalledTimes(1);
    });
  });

  describe('listen', () => {
    it('delegates to the underlying connection', () => {
      adapter.listen();

      expect(mockConn.listen).toHaveBeenCalledTimes(1);
    });
  });
});
