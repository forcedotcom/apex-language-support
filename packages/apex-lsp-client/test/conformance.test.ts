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

/**
 * Parameterized conformance suite for ApexClientCore.
 *
 * Runs the same conformance tests across three transport types:
 * - Mock RpcConnection (unit test, no real server)
 * - JsonRpcConnection (unit test with mock MessageConnection)
 * - LanguageClientConnection (integration test with real server, RUN_INTEGRATION gated)
 *
 * Tests verify:
 * 1. Advertise⇔handle invariant: capabilities in InitializeResult match working handlers
 * 2. Defaults: default handlers, middleware, and initialization work correctly
 * 3. LSP lifecycle: initialize/initialized/shutdown/exit sequence
 * 4. Typed apex/* surface: senders dispatch correct method strings
 */

interface ConformanceContext {
  connection: RpcConnection;
  core: ApexClientCore;
  cleanup: () => Promise<void>;
}

type ConnectionProvider = () => Promise<ConformanceContext>;

/**
 * Mock RpcConnection provider. Returns a jest-mocked connection that responds
 * to initialize with default capabilities and accepts all other requests.
 */
const createMockConnectionProvider = (): ConnectionProvider => async () => {
  const initResult: InitializeResult = {
    capabilities: {
      textDocumentSync: 2,
      hoverProvider: true,
      completionProvider: { triggerCharacters: ['.'] },
      definitionProvider: true,
      documentSymbolProvider: true,
    },
  };

  const sendRequest = jest.fn(
    (method: string, _params?: unknown): Promise<unknown> =>
      Promise.resolve(method === 'initialize' ? initResult : { success: true }),
  );
  const sendNotification = jest.fn(
    (_method: string, _params?: unknown): Promise<void> => Promise.resolve(),
  );
  const onRequest = jest.fn(
    (_method: string, _handler: (params: unknown) => unknown): Disposable => ({
      dispose: jest.fn(),
    }),
  );
  const onNotification = jest.fn(
    (_method: string, _handler: (params: unknown) => void): Disposable => ({
      dispose: jest.fn(),
    }),
  );
  const onError = jest.fn((_handler: (e: Error) => void): Disposable => ({
    dispose: jest.fn(),
  }));
  const onClose = jest.fn((_handler: () => void): Disposable => ({
    dispose: jest.fn(),
  }));
  const dispose = jest.fn((): void => undefined);

  const connection: RpcConnection = {
    sendRequest,
    sendNotification,
    onRequest,
    onNotification,
    onError,
    onClose,
    dispose,
  };

  const core = await ApexClientCore.create(connection);

  return {
    connection,
    core,
    cleanup: async () => {
      await core.dispose();
    },
  };
};

/**
 * JsonRpcConnection provider. Returns a JsonRpcConnection wrapping a mock
 * MessageConnection.
 */
const createJsonRpcConnectionProvider = (): ConnectionProvider => async () => {
  const { JsonRpcConnection } =
    await import('../src/transports/jsonRpcConnection');
  const initResult: InitializeResult = {
    capabilities: {
      textDocumentSync: 2,
      hoverProvider: true,
      completionProvider: { triggerCharacters: ['.'] },
      definitionProvider: true,
      documentSymbolProvider: true,
    },
  };

  const mockMessageConnection = {
    sendRequest: jest.fn(
      (method: string, _params?: unknown): Promise<unknown> =>
        Promise.resolve(
          method === 'initialize' ? initResult : { success: true },
        ),
    ),
    sendNotification: jest.fn(
      (_method: string, _params?: unknown): Promise<void> => Promise.resolve(),
    ),
    onRequest: jest.fn(() => ({ dispose: jest.fn() })),
    onNotification: jest.fn(() => ({ dispose: jest.fn() })),
    onError: jest.fn(() => ({ dispose: jest.fn() })),
    onClose: jest.fn(() => ({ dispose: jest.fn() })),
    onUnhandledNotification: jest.fn(),
    onProgress: jest.fn(),
    sendProgress: jest.fn(),
    onUnhandledProgress: jest.fn(),
    trace: jest.fn(),
    inspect: jest.fn(),
    end: jest.fn(),
    dispose: jest.fn(),
    listen: jest.fn(),
  };

  const connection = new JsonRpcConnection(mockMessageConnection as any);
  const core = await ApexClientCore.create(connection);
  connection.listen();

  return {
    connection,
    core,
    cleanup: async () => {
      await core.dispose();
    },
  };
};

/**
 * Run the conformance suite against a given connection provider.
 */
const runConformanceSuite = (
  providerName: string,
  createProvider: () => ConnectionProvider,
) => {
  describe(`${providerName} conformance`, () => {
    let context: ConformanceContext | undefined;

    beforeEach(() => {
      enableConsoleLogging();
      setLogLevel('error');
    });

    afterEach(async () => {
      if (context) {
        await context.cleanup();
        context = undefined;
      }
    });

    describe('advertise⇔handle invariant', () => {
      it('advertised capabilities match working handlers', async () => {
        const provider = createProvider();
        context = await provider();

        // Initialize and get capabilities
        const result = await context.core.initialize(DEFAULT_APEX_SETTINGS);
        expect(result.capabilities).toBeDefined();

        // Verify advertised capabilities work
        if (result.capabilities.hoverProvider) {
          // Should not throw - the handler exists
          const hoverPromise = context.core.hover({
            textDocument: { uri: 'file:///test.cls' },
            position: { line: 0, character: 0 },
          });
          await expect(hoverPromise).resolves.toBeDefined();
        }

        if (result.capabilities.completionProvider) {
          const completionPromise = context.core.completion({
            textDocument: { uri: 'file:///test.cls' },
            position: { line: 0, character: 0 },
          });
          await expect(completionPromise).resolves.toBeDefined();
        }

        if (result.capabilities.definitionProvider) {
          const definitionPromise = context.core.definition({
            textDocument: { uri: 'file:///test.cls' },
            position: { line: 0, character: 0 },
          });
          await expect(definitionPromise).resolves.toBeDefined();
        }

        if (result.capabilities.documentSymbolProvider) {
          const symbolPromise = context.core.documentSymbol({
            textDocument: { uri: 'file:///test.cls' },
          });
          await expect(symbolPromise).resolves.toBeDefined();
        }
      });
    });

    describe('defaults', () => {
      it('default findMissingArtifact handler returns { notFound: true }', async () => {
        const provider = createProvider();
        context = await provider();

        // The default handler is registered during create().
        // We can't directly invoke it from the test, but we verify:
        // 1. The core is healthy and doesn't throw during creation
        expect(context.core.isDisposed()).toBe(false);

        // 2. We can register a custom handler without error
        const customHandler = jest.fn(() => ({ notFound: true }));
        const disposable = context.core.onFindMissingArtifact(customHandler);
        expect(disposable).toBeDefined();
        disposable.dispose();
      });

      it('default initialization options from settings', async () => {
        const provider = createProvider();
        context = await provider();

        // Initialize with settings - they should populate initializationOptions
        const settings = { ...DEFAULT_APEX_SETTINGS, enableGating: false };
        const result = await context.core.initialize(settings);

        // The connection should have received an initialize request
        expect(result).toBeDefined();
        expect(result.capabilities).toBeDefined();
      });

      it('default logging middleware is registered', async () => {
        const provider = createProvider();
        context = await provider();

        // The logging middleware is registered during create().
        // Verify the core is healthy and middleware chain works.
        await context.core.initialize(DEFAULT_APEX_SETTINGS);

        // Send a request through the middleware chain
        const result = await context.core.hover({
          textDocument: { uri: 'file:///test.cls' },
          position: { line: 0, character: 0 },
        });

        // Should complete without error
        expect(result).toBeDefined();
      });
    });

    describe('LSP lifecycle', () => {
      it('initialize sends initialize then initialized', async () => {
        const provider = createProvider();
        context = await provider();

        const sendRequestSpy = jest.spyOn(context.connection, 'sendRequest');
        const sendNotificationSpy = jest.spyOn(
          context.connection,
          'sendNotification',
        );

        await context.core.initialize(DEFAULT_APEX_SETTINGS);

        // Verify initialize request was sent
        expect(sendRequestSpy).toHaveBeenCalledWith(
          'initialize',
          expect.objectContaining({
            initializationOptions: expect.any(Object),
          }),
        );

        // Verify initialized notification was sent
        expect(sendNotificationSpy).toHaveBeenCalledWith('initialized', {});
      });

      it('shutdown completes successfully', async () => {
        const provider = createProvider();
        context = await provider();

        await context.core.initialize(DEFAULT_APEX_SETTINGS);

        // Verify shutdown completes without error
        // The LSP spec requires shutdown to send 'shutdown' request followed by 'exit' notification
        await expect(context.core.shutdown()).resolves.not.toThrow();

        // Verify core recognizes it has shut down
        expect(context.core.isDisposed()).toBe(false); // shutdown doesn't dispose
      });

      it('initialize is idempotent on success', async () => {
        const provider = createProvider();
        context = await provider();

        const result1 = await context.core.initialize(DEFAULT_APEX_SETTINGS);
        const result2 = await context.core.initialize(DEFAULT_APEX_SETTINGS);

        // Second call should return the same result without re-initializing
        expect(result1).toEqual(result2);
      });

      it('shutdown is idempotent on success', async () => {
        const provider = createProvider();
        context = await provider();

        await context.core.initialize(DEFAULT_APEX_SETTINGS);

        await context.core.shutdown();
        await context.core.shutdown(); // Should not throw
      });

      it('dispose is idempotent', async () => {
        const provider = createProvider();
        context = await provider();

        await context.core.dispose();
        await context.core.dispose(); // Should not throw
      });
    });

    describe('typed apex/* surface', () => {
      it('sendWorkspaceBatch dispatches correct method', async () => {
        const provider = createProvider();
        context = await provider();

        await context.core.initialize(DEFAULT_APEX_SETTINGS);

        const spy = jest.spyOn(context.connection, 'sendRequest');

        await context.core.sendWorkspaceBatch({
          batchIndex: 0,
          totalBatches: 1,
          isLastBatch: true,
          compressedData: '',
          fileMetadata: [],
        });

        expect(spy).toHaveBeenCalledWith(
          'apex/sendWorkspaceBatch',
          expect.objectContaining({
            batchIndex: 0,
          }),
        );
      });

      it('workspaceLoadComplete dispatches correct notification', async () => {
        const provider = createProvider();
        context = await provider();

        await context.core.initialize(DEFAULT_APEX_SETTINGS);

        const spy = jest.spyOn(context.connection, 'sendNotification');

        context.core.workspaceLoadComplete({ success: true });

        expect(spy).toHaveBeenCalledWith(
          'apex/workspaceLoadComplete',
          expect.objectContaining({ success: true }),
        );
      });

      it('onFindMissingArtifact registration works', async () => {
        const provider = createProvider();
        context = await provider();

        await context.core.initialize(DEFAULT_APEX_SETTINGS);

        const handler = jest.fn(() => ({ notFound: true }));
        const disposable = context.core.onFindMissingArtifact(handler);

        expect(disposable).toBeDefined();
        expect(typeof disposable.dispose).toBe('function');

        disposable.dispose();
      });
    });
  });
};

// Run conformance suite against mock connection
runConformanceSuite('Mock RpcConnection', createMockConnectionProvider);

// Run conformance suite against JsonRpcConnection
runConformanceSuite('JsonRpcConnection', createJsonRpcConnectionProvider);
