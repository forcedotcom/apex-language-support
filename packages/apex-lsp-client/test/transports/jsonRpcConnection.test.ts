/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock, Mocked } from 'vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MessageConnection } from 'vscode-jsonrpc';
import type { Disposable } from '@salesforce/apex-lsp-shared';
import { JsonRpcConnection } from '../../src/transports/jsonRpcConnection';

/**
 * Unit tests for `JsonRpcConnection`. Each test verifies 1:1 delegation to the
 * underlying `MessageConnection` mock, including the `onError` tuple-flattening.
 */
describe('JsonRpcConnection', () => {
  let mockConn: Mocked<MessageConnection>;
  let adapter: JsonRpcConnection;

  beforeEach(() => {
    const disposable: Disposable = { dispose: vi.fn() };

    mockConn = {
      sendRequest: vi.fn<MessageConnection['sendRequest']>(),
      sendNotification: vi.fn<MessageConnection['sendNotification']>(),
      onRequest: vi.fn().mockReturnValue(disposable),
      onNotification: vi.fn().mockReturnValue(disposable),
      onError: vi.fn().mockReturnValue(disposable),
      onClose: vi.fn().mockReturnValue(disposable),
      onUnhandledNotification: vi.fn(),
      onProgress: vi.fn(),
      sendProgress: vi.fn(),
      onUnhandledProgress: vi.fn(),
      trace: vi.fn(),
      inspect: vi.fn(),
      end: vi.fn(),
      dispose: vi.fn(),
      listen: vi.fn(),
    } as unknown as Mocked<MessageConnection>;

    adapter = new JsonRpcConnection(mockConn);
  });

  describe('sendRequest', () => {
    it('delegates to the underlying connection', async () => {
      const expected = { capabilities: {} };
      (
        mockConn.sendRequest as Mock<() => Promise<typeof expected>>
      ).mockResolvedValue(expected);

      const result = await adapter.sendRequest('initialize', { processId: 1 });

      expect(mockConn.sendRequest).toHaveBeenCalledWith('initialize', {
        processId: 1,
      });
      expect(result).toBe(expected);
    });
  });

  describe('sendNotification', () => {
    it('delegates to the underlying connection', async () => {
      (
        mockConn.sendNotification as Mock<() => Promise<void>>
      ).mockResolvedValue(undefined);

      await adapter.sendNotification('initialized', {});

      expect(mockConn.sendNotification).toHaveBeenCalledWith('initialized', {});
    });
  });

  describe('onRequest', () => {
    it('registers a handler and returns a Disposable', () => {
      const handler = vi.fn();
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
      const handler = vi.fn();
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
      (mockConn.onError as Mock).mockImplementation((listener: unknown) => {
        if (typeof listener !== 'function') return { dispose: vi.fn() };
        const typedListener = listener as (
          e: [Error, unknown, unknown],
        ) => void;
        capturedListener = typedListener;
        return { dispose: vi.fn() };
      });

      const handler = vi.fn();
      adapter.onError(handler);

      // Simulate the underlying connection emitting an error tuple.
      const error = new Error('connection broken');
      capturedListener([error, undefined, undefined]);

      expect(handler).toHaveBeenCalledWith(error);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('returns a Disposable', () => {
      const handler = vi.fn();
      const disposable = adapter.onError(handler);

      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('onClose', () => {
    it('delegates to the underlying connection', () => {
      const handler = vi.fn();
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
