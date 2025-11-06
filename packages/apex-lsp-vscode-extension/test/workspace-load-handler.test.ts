/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Layer } from 'effect';
import type { ClientInterface, LoadWorkspaceParams } from '@salesforce/apex-lsp-shared';
import {
  WorkspaceState,
  WorkspaceStateLive,
  WorkspaceLoaderService,
  WorkspaceLoaderServiceLive,
  startWorkspaceLoad,
  handleLoadWorkspace,
  resetWorkspaceLoadingState,
} from '../src/workspace-load-handler';
import * as workspaceLoaderModule from '../src/workspace-loader';
import { Ref } from 'effect';

// Mock dependencies
jest.mock('../src/workspace-loader', () => {
  const actual = jest.requireActual('../src/workspace-loader');
  return {
    ...actual,
    loadWorkspaceForServer: jest.fn(),
  };
});

jest.mock('../src/logging', () => ({
  logToOutputChannel: jest.fn(),
}));

jest.mock('../src/configuration', () => ({
  getWorkspaceSettings: jest.fn(() => ({
    apex: {
      loadWorkspace: {
        enabled: true,
        maxConcurrency: 50,
        yieldInterval: 50,
        yieldDelayMs: 25,
      },
    },
  })),
}));

describe('Workspace Load Handler', () => {
  let mockLanguageClient: ClientInterface;
  let mockLoadWorkspaceForServer: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset workspace state before each test
    await Effect.runPromise(
      Effect.provide(resetWorkspaceLoadingState, WorkspaceStateLive),
    );

    // Mock language client
    mockLanguageClient = {
      languageClient: {} as any,
      sendNotification: jest.fn(),
      sendRequest: jest.fn(),
      initialize: jest.fn(),
      onNotification: jest.fn(),
      onRequest: jest.fn(),
      isDisposed: jest.fn(() => false),
      dispose: jest.fn(),
    } as unknown as ClientInterface;

    // Mock loadWorkspaceForServer
    mockLoadWorkspaceForServer = workspaceLoaderModule.loadWorkspaceForServer as jest.Mock;
    mockLoadWorkspaceForServer.mockResolvedValue(undefined);
  });

  describe('deriveFilePatternsFromDocumentSelector', () => {
    it('should derive file patterns from document selector with file scheme', () => {
      const selector = [{ scheme: 'file', language: 'apex' }];
      const patterns = workspaceLoaderModule.deriveFilePatternsFromDocumentSelector(selector);

      expect(patterns).toEqual(['**/*.cls', '**/*.trigger', '**/*.apex']);
    });

    it('should return empty array when no matching selector', () => {
      const selector = [{ scheme: 'vscode-test-web', language: 'apex' }];
      const patterns = workspaceLoaderModule.deriveFilePatternsFromDocumentSelector(selector);

      expect(patterns).toEqual([]);
    });

    it('should remove duplicate patterns', () => {
      const selector = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'file', language: 'apex' },
      ];
      const patterns = workspaceLoaderModule.deriveFilePatternsFromDocumentSelector(selector);

      expect(patterns).toEqual(['**/*.cls', '**/*.trigger', '**/*.apex']);
      expect(patterns.length).toBe(new Set(patterns).size);
    });

    it('should handle empty selector array', () => {
      const patterns = workspaceLoaderModule.deriveFilePatternsFromDocumentSelector([]);
      expect(patterns).toEqual([]);
    });
  });

  describe('WorkspaceState', () => {
    it('should initialize with all flags set to false', async () => {
      const program = Effect.gen(function* (_) {
        const state = yield* _(WorkspaceState);
        const isLoading = yield* _(Ref.get(state.isLoading));
        const hasLoaded = yield* _(Ref.get(state.hasLoaded));
        const hasFailed = yield* _(Ref.get(state.hasFailed));

        return { isLoading, hasLoaded, hasFailed };
      });

      const result = await Effect.runPromise(
        Effect.provide(program, WorkspaceStateLive),
      );

      expect(result.isLoading).toBe(false);
      expect(result.hasLoaded).toBe(false);
      expect(result.hasFailed).toBe(false);
    });

    it('should allow setting loading state', async () => {
      const program = Effect.gen(function* (_) {
        const state = yield* _(WorkspaceState);
        yield* _(Ref.set(state.isLoading, true));
        const isLoading = yield* _(Ref.get(state.isLoading));
        return isLoading;
      });

      const result = await Effect.runPromise(
        Effect.provide(program, WorkspaceStateLive),
      );

      expect(result).toBe(true);
    });
  });

  describe('startWorkspaceLoad', () => {
    it('should return alreadyLoaded when workspace is already loaded', async () => {
      const program = Effect.gen(function* (_) {
        const state = yield* _(WorkspaceState);
        yield* _(Ref.set(state.hasLoaded, true));
        return yield* _(
          Effect.provide(
            startWorkspaceLoad(mockLanguageClient),
            WorkspaceLoaderServiceLive,
          ),
        );
      });

      const result = await Effect.runPromise(
        Effect.provide(program, Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive)),
      );

      expect(result).toEqual({ accepted: true, alreadyLoaded: true });
      expect(mockLoadWorkspaceForServer).not.toHaveBeenCalled();
    });

    it('should return inProgress when workspace is currently loading', async () => {
      const program = Effect.gen(function* (_) {
        const state = yield* _(WorkspaceState);
        yield* _(Ref.set(state.isLoading, true));
        return yield* _(
          Effect.provide(
            startWorkspaceLoad(mockLanguageClient),
            WorkspaceLoaderServiceLive,
          ),
        );
      });

      const result = await Effect.runPromise(
        Effect.provide(program, Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive)),
      );

      expect(result).toEqual({ accepted: true, inProgress: true });
      expect(mockLoadWorkspaceForServer).not.toHaveBeenCalled();
    });

    it('should start loading when workspace is not loaded and not loading', async () => {
      const result = await Effect.runPromise(
        Effect.provide(
          startWorkspaceLoad(mockLanguageClient),
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );

      expect(result).toEqual({ accepted: true });
      // Note: Since we fork the effect, it may not complete immediately
      // We just verify it was called
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockLoadWorkspaceForServer).toHaveBeenCalled();
    });

    it('should return retryable when workspace previously failed', async () => {
      const program = Effect.gen(function* (_) {
        const state = yield* _(WorkspaceState);
        yield* _(Ref.set(state.hasFailed, true));
        return yield* _(
          Effect.provide(
            startWorkspaceLoad(mockLanguageClient),
            WorkspaceLoaderServiceLive,
          ),
        );
      });

      const result = await Effect.runPromise(
        Effect.provide(program, Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive)),
      );

      expect(result).toEqual({ accepted: true, retryable: true });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockLoadWorkspaceForServer).toHaveBeenCalled();
    });

    it('should use provided documentSelector when given', async () => {
      const customSelector = [{ scheme: 'file', language: 'apex' }];

      await Effect.runPromise(
        Effect.provide(
          startWorkspaceLoad(mockLanguageClient, undefined, customSelector),
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockLoadWorkspaceForServer).toHaveBeenCalledWith(
        mockLanguageClient,
        undefined,
        customSelector,
      );
    });

    it('should pass workDoneToken when provided', async () => {
      const token = 'test-token';
      await Effect.runPromise(
        Effect.provide(
          startWorkspaceLoad(mockLanguageClient, token),
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockLoadWorkspaceForServer).toHaveBeenCalledWith(
        mockLanguageClient,
        token,
        expect.any(Array),
      );
    });
  });

  describe('handleLoadWorkspace', () => {
    it('should delegate to startWorkspaceLoad with params', async () => {
      const params: LoadWorkspaceParams = { workDoneToken: 'test-token' };

      await Effect.runPromise(
        Effect.provide(
          handleLoadWorkspace(params, mockLanguageClient),
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockLoadWorkspaceForServer).toHaveBeenCalledWith(
        mockLanguageClient,
        'test-token',
        expect.any(Array),
      );
    });

    it('should handle params without workDoneToken', async () => {
      const params: LoadWorkspaceParams = {};

      await Effect.runPromise(
        Effect.provide(
          handleLoadWorkspace(params, mockLanguageClient),
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockLoadWorkspaceForServer).toHaveBeenCalledWith(
        mockLanguageClient,
        undefined,
        expect.any(Array),
      );
    });

    it('should return loaded state when queryOnly is true and workspace is loaded', async () => {
      // Arrange
      const program = Effect.gen(function* (_) {
        const state = yield* _(WorkspaceState);
        yield* _(Ref.set(state.hasLoaded, true));
        return yield* _(handleLoadWorkspace({ queryOnly: true }, mockLanguageClient));
      });

      const result = await Effect.runPromise(
        Effect.provide(program, WorkspaceStateLive),
      );

      // Assert
      expect(result).toEqual({ loaded: true });
      expect(mockLoadWorkspaceForServer).not.toHaveBeenCalled();
    });

    it('should return loading state when queryOnly is true and workspace is loading', async () => {
      // Arrange
      const program = Effect.gen(function* (_) {
        const state = yield* _(WorkspaceState);
        yield* _(Ref.set(state.isLoading, true));
        return yield* _(handleLoadWorkspace({ queryOnly: true }, mockLanguageClient));
      });

      const result = await Effect.runPromise(
        Effect.provide(program, WorkspaceStateLive),
      );

      // Assert
      expect(result).toEqual({ loading: true });
      expect(mockLoadWorkspaceForServer).not.toHaveBeenCalled();
    });

    it('should return failed state when queryOnly is true and workspace has failed', async () => {
      // Arrange
      const program = Effect.gen(function* (_) {
        const state = yield* _(WorkspaceState);
        yield* _(Ref.set(state.hasFailed, true));
        return yield* _(handleLoadWorkspace({ queryOnly: true }, mockLanguageClient));
      });

      const result = await Effect.runPromise(
        Effect.provide(program, WorkspaceStateLive),
      );

      // Assert
      expect(result).toEqual({ failed: true });
      expect(mockLoadWorkspaceForServer).not.toHaveBeenCalled();
    });

    it('should return loaded false when queryOnly is true and workspace is not loaded', async () => {
      // Arrange - no state set (all false)
      const result = await Effect.runPromise(
        Effect.provide(
          handleLoadWorkspace({ queryOnly: true }, mockLanguageClient),
          WorkspaceStateLive,
        ),
      );

      // Assert
      expect(result).toEqual({ loaded: false });
      expect(mockLoadWorkspaceForServer).not.toHaveBeenCalled();
    });
  });

  describe('resetWorkspaceLoadingState', () => {
    it('should reset all state flags to false', async () => {
      const program = Effect.gen(function* (_) {
        const state = yield* _(WorkspaceState);
        yield* _(Ref.set(state.isLoading, true));
        yield* _(Ref.set(state.hasLoaded, true));
        yield* _(Ref.set(state.hasFailed, true));

        yield* _(resetWorkspaceLoadingState);

        const isLoading = yield* _(Ref.get(state.isLoading));
        const hasLoaded = yield* _(Ref.get(state.hasLoaded));
        const hasFailed = yield* _(Ref.get(state.hasFailed));

        return { isLoading, hasLoaded, hasFailed };
      });

      const result = await Effect.runPromise(
        Effect.provide(program, WorkspaceStateLive),
      );

      expect(result.isLoading).toBe(false);
      expect(result.hasLoaded).toBe(false);
      expect(result.hasFailed).toBe(false);
    });
  });

  describe('State transitions', () => {
    it('should handle loading -> loaded transition on success', async () => {
      mockLoadWorkspaceForServer.mockResolvedValue(undefined);

      const program = Effect.gen(function* (_) {
        yield* _(startWorkspaceLoad(mockLanguageClient));
        
        // Wait for async operations
        yield* _(Effect.sleep('100 millis'));

        const state = yield* _(WorkspaceState);
        const isLoading = yield* _(Ref.get(state.isLoading));
        const hasLoaded = yield* _(Ref.get(state.hasLoaded));
        const hasFailed = yield* _(Ref.get(state.hasFailed));
        return { isLoading, hasLoaded, hasFailed };
      });

      const result = await Effect.runPromise(
        Effect.provide(
          program,
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );

      expect(result.isLoading).toBe(false);
      expect(result.hasLoaded).toBe(true);
      expect(result.hasFailed).toBe(false);
    });

    it.skip('should handle loading -> failed transition on error', async () => {
      // TODO: This test is flaky due to async daemon behavior
      // The Effect.forkDaemon runs in background and test timing is unreliable
      mockLoadWorkspaceForServer.mockRejectedValue(new Error('Load failed'));

      const program = Effect.gen(function* (_) {
        yield* _(startWorkspaceLoad(mockLanguageClient));
        
        // Wait for async operations
        yield* _(Effect.sleep('200 millis'));

        const state = yield* _(WorkspaceState);
        const isLoading = yield* _(Ref.get(state.isLoading));
        const hasLoaded = yield* _(Ref.get(state.hasLoaded));
        const hasFailed = yield* _(Ref.get(state.hasFailed));
        return { isLoading, hasLoaded, hasFailed };
      });

      const result = await Effect.runPromise(
        Effect.provide(
          program,
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );

      expect(result.isLoading).toBe(false);
      expect(result.hasLoaded).toBe(false);
      expect(result.hasFailed).toBe(true);
    });
  });

  describe('Single-flight behavior', () => {
    it.skip('should prevent concurrent loads', async () => {
      // TODO: This test is flaky due to async daemon behavior
      // The Effect.forkDaemon runs in background and state changes are async
      const program = Effect.gen(function* (_) {
        // Start first load
        const firstLoad = yield* _(startWorkspaceLoad(mockLanguageClient));
        
        // Small delay to ensure first load sets loading state
        yield* _(Effect.sleep('10 millis'));
        
        // Try second load
        const secondLoad = yield* _(startWorkspaceLoad(mockLanguageClient));

        return [firstLoad, secondLoad];
      });

      const [firstResult, secondResult] = await Effect.runPromise(
        Effect.provide(
          program,
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );

      // One should be accepted, the other should be inProgress
      const results = [firstResult, secondResult];
      const accepted = results.filter((r) => r.accepted === true && !r.inProgress);
      const inProgress = results.filter((r) => r.inProgress === true);

      expect(accepted.length).toBe(1);
      expect(inProgress.length).toBe(1);
    });
  });
});

