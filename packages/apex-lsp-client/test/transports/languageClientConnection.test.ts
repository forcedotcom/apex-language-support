/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { BaseLanguageClient, State } from 'vscode-languageclient';
import type { Disposable } from '@salesforce/apex-lsp-shared';
import { LanguageClientConnection } from '../../src/transports/languageClientConnection';

/**
 * Unit tests for `LanguageClientConnection`. Each test verifies 1:1 delegation
 * to the underlying `BaseLanguageClient` mock, including the synthesized
 * `onError`/`onClose` events via `onDidChangeState`.
 */
describe('LanguageClientConnection', () => {
  let mockClient: jest.Mocked<
    Pick<
      BaseLanguageClient,
      | 'sendRequest'
      | 'sendNotification'
      | 'onRequest'
      | 'onNotification'
      | 'isRunning'
      | 'stop'
      | 'onDidChangeState'
    >
  >;
  let adapter: LanguageClientConnection;

  beforeEach(() => {
    const disposable: Disposable = { dispose: jest.fn() };

    mockClient = {
      sendRequest: jest.fn<any>(),
      sendNotification: jest.fn<any>().mockResolvedValue(undefined),
      onRequest: jest.fn<any>().mockReturnValue(disposable),
      onNotification: jest.fn<any>().mockReturnValue(disposable),
      isRunning: jest.fn<any>().mockReturnValue(true),
      stop: jest.fn<any>().mockResolvedValue(undefined),
      onDidChangeState: jest.fn<any>().mockReturnValue(disposable),
    };

    adapter = new LanguageClientConnection(
      mockClient as unknown as BaseLanguageClient,
    );
  });

  describe('sendRequest', () => {
    it('delegates to the underlying client', async () => {
      const expected = { capabilities: {} };
      mockClient.sendRequest.mockResolvedValue(expected);

      const result = await adapter.sendRequest('initialize', { processId: 1 });

      expect(mockClient.sendRequest).toHaveBeenCalledWith('initialize', {
        processId: 1,
      });
      expect(result).toBe(expected);
    });
  });

  describe('sendNotification', () => {
    it('delegates to the underlying client with params', async () => {
      await adapter.sendNotification('initialized', {});

      expect(mockClient.sendNotification).toHaveBeenCalledWith(
        'initialized',
        {},
      );
    });

    it('delegates to the underlying client without params', async () => {
      await adapter.sendNotification('initialized');

      expect(mockClient.sendNotification).toHaveBeenCalledWith('initialized');
    });
  });

  describe('onRequest', () => {
    it('registers a handler and returns a Disposable', () => {
      const handler = jest.fn();
      const disposable = adapter.onRequest('apex/findMissingArtifact', handler);

      expect(mockClient.onRequest).toHaveBeenCalledWith(
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

      expect(mockClient.onNotification).toHaveBeenCalledWith(
        'window/logMessage',
        handler,
      );
      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('onError', () => {
    it('fires handler with Error when state transitions to Stopped', () => {
      let capturedListener:
        ((event: { oldState: State; newState: State }) => void) | undefined;
      mockClient.onDidChangeState.mockImplementation((listener: any) => {
        capturedListener = listener;
        return { dispose: jest.fn() };
      });

      const handler = jest.fn();
      adapter.onError(handler);

      expect(capturedListener).toBeDefined();

      // Simulate transition from Running (4) to Stopped (1).
      capturedListener!({ oldState: 4 as State, newState: 1 as State });

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(expect.any(Error));
      expect(handler.mock.calls[0][0].message).toBe(
        'Language client stopped unexpectedly',
      );
    });

    it('does not fire when state stays Stopped', () => {
      let capturedListener:
        ((event: { oldState: State; newState: State }) => void) | undefined;
      mockClient.onDidChangeState.mockImplementation((listener: any) => {
        capturedListener = listener;
        return { dispose: jest.fn() };
      });

      const handler = jest.fn();
      adapter.onError(handler);

      // Simulate Stopped→Stopped (no change).
      capturedListener!({ oldState: 1 as State, newState: 1 as State });

      expect(handler).not.toHaveBeenCalled();
    });

    it('returns a Disposable', () => {
      const handler = jest.fn();
      const disposable = adapter.onError(handler);

      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('onClose', () => {
    it('fires handler when state transitions to Stopped', () => {
      let capturedListener:
        ((event: { oldState: State; newState: State }) => void) | undefined;
      mockClient.onDidChangeState.mockImplementation((listener: any) => {
        capturedListener = listener;
        return { dispose: jest.fn() };
      });

      const handler = jest.fn();
      adapter.onClose(handler);

      expect(capturedListener).toBeDefined();

      // Simulate transition from Running (4) to Stopped (1).
      capturedListener!({ oldState: 4 as State, newState: 1 as State });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not fire when transitioning from Stopped to Starting', () => {
      let capturedListener:
        ((event: { oldState: State; newState: State }) => void) | undefined;
      mockClient.onDidChangeState.mockImplementation((listener: any) => {
        capturedListener = listener;
        return { dispose: jest.fn() };
      });

      const handler = jest.fn();
      adapter.onClose(handler);

      // Simulate Stopped→Starting (not a close event).
      capturedListener!({ oldState: 1 as State, newState: 3 as State });

      expect(handler).not.toHaveBeenCalled();
    });

    it('returns a Disposable', () => {
      const handler = jest.fn();
      const disposable = adapter.onClose(handler);

      expect(disposable).toBeDefined();
      expect(typeof disposable.dispose).toBe('function');
    });
  });

  describe('isListening', () => {
    it('returns true when client is running', () => {
      mockClient.isRunning.mockReturnValue(true);

      expect(adapter.isListening()).toBe(true);
    });

    it('returns false when client is not running', () => {
      mockClient.isRunning.mockReturnValue(false);

      expect(adapter.isListening()).toBe(false);
    });
  });

  describe('dispose', () => {
    it('calls stop() on the underlying client', async () => {
      await adapter.dispose();

      expect(mockClient.stop).toHaveBeenCalledTimes(1);
    });
  });
});
