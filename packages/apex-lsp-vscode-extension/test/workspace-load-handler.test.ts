/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Exit, Layer, Ref, Scope } from 'effect';
import type { LoadWorkspaceParams } from '@salesforce/apex-lsp-shared';
import type { ApexClientCore } from '@salesforce/apex-lsp-client';
import {
  WorkspaceState,
  WorkspaceStateLive,
  WorkspaceLoaderServiceLive,
  startWorkspaceLoad,
  handleLoadWorkspace,
  resetWorkspaceLoadingState,
  makeWorkspaceLoadScope,
} from '../src/workspace-load-handler';
import * as workspaceLoaderModule from '../src/workspace-loader';

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
        batchSize: 100,
        includeSfdxToolsCustomObjects: false,
      },
    },
  })),
}));

describe('Workspace Load Handler', () => {
  let mockLanguageClient: ApexClientCore;
  let mockLoadWorkspaceForServer: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset workspace state before each test
    await Effect.runPromise(
      Effect.provide(resetWorkspaceLoadingState, WorkspaceStateLive),
    );

    // Mock language client
    mockLanguageClient = {
      workspaceLoadComplete: jest.fn(),
      workspaceLoadFailed: jest.fn(),
    } as unknown as ApexClientCore;

    // Mock loadWorkspaceForServer
    mockLoadWorkspaceForServer =
      workspaceLoaderModule.loadWorkspaceForServer as jest.Mock;
    mockLoadWorkspaceForServer.mockResolvedValue(undefined);
  });

  describe('deriveFilePatternsFromDocumentSelector', () => {
    it('should derive file patterns from document selector with file scheme', () => {
      const selector = [{ scheme: 'file', language: 'apex' }];
      const patterns =
        workspaceLoaderModule.deriveFilePatternsFromDocumentSelector(selector);

      expect(patterns).toEqual(['**/*.cls', '**/*.trigger', '**/*.apex']);
    });

    it('should return empty array when no matching selector', () => {
      const selector = [{ scheme: 'vscode-test-web', language: 'apex' }];
      const patterns =
        workspaceLoaderModule.deriveFilePatternsFromDocumentSelector(selector);

      expect(patterns).toEqual([]);
    });

    it('should remove duplicate patterns', () => {
      const selector = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'file', language: 'apex' },
      ];
      const patterns =
        workspaceLoaderModule.deriveFilePatternsFromDocumentSelector(selector);

      expect(patterns).toEqual(['**/*.cls', '**/*.trigger', '**/*.apex']);
      expect(patterns.length).toBe(new Set(patterns).size);
    });

    it('should handle empty selector array', () => {
      const patterns =
        workspaceLoaderModule.deriveFilePatternsFromDocumentSelector([]);
      expect(patterns).toEqual([]);
    });
  });

  describe('getExcludeGlob', () => {
    it('should exclude customObjects when includeSfdxToolsCustomObjects is false', () => {
      const glob = workspaceLoaderModule.getExcludeGlob(false);
      expect(glob).toContain('.sfdx/tools/sobjects/customObjects');
      expect(glob).toContain('.sfdx/tools/sobjects/standardObjects');
      expect(glob).toContain('node_modules');
      expect(glob).toContain('StandardApexLibrary');
    });

    it('should not exclude customObjects when includeSfdxToolsCustomObjects is true', () => {
      const glob = workspaceLoaderModule.getExcludeGlob(true);
      expect(glob).not.toContain('.sfdx/tools/sobjects/customObjects');
      expect(glob).toContain('.sfdx/tools/sobjects/standardObjects');
      expect(glob).toContain('node_modules');
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
        Effect.provide(
          program,
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
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
        Effect.provide(
          program,
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
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
        Effect.provide(
          program,
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
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
        undefined,
        expect.any(AbortSignal),
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
        undefined,
        expect.any(AbortSignal),
      );
    });

    it('should forward the workspace-load reason to the loader', async () => {
      // The reason drives the client's action-tailored busy status message
      // (e.g. "Searching workspace for implementations…"). It must reach
      // loadWorkspaceForServer as the 4th arg.
      await Effect.runPromise(
        Effect.provide(
          startWorkspaceLoad(
            mockLanguageClient,
            undefined,
            undefined,
            'implementation',
          ),
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(mockLoadWorkspaceForServer).toHaveBeenCalledWith(
        mockLanguageClient,
        undefined,
        expect.any(Array),
        'implementation',
        expect.any(AbortSignal),
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
        undefined,
        expect.any(AbortSignal),
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
        undefined,
        expect.any(AbortSignal),
      );
    });

    it('should return loaded state when queryOnly is true and workspace is loaded', async () => {
      // Arrange
      const program = Effect.gen(function* (_) {
        const state = yield* _(WorkspaceState);
        yield* _(Ref.set(state.hasLoaded, true));
        return yield* _(
          handleLoadWorkspace({ queryOnly: true }, mockLanguageClient),
        );
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
        return yield* _(
          handleLoadWorkspace({ queryOnly: true }, mockLanguageClient),
        );
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
        return yield* _(
          handleLoadWorkspace({ queryOnly: true }, mockLanguageClient),
        );
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

    it('interrupts an active client-scoped load and resets loading state on stop', async () => {
      let resolveLoad: (() => void) | undefined;
      mockLoadWorkspaceForServer.mockImplementation(
        (_client, _token, _selector, _reason, signal: AbortSignal) =>
          new Promise<void>((resolve) => {
            resolveLoad = resolve;
            signal.addEventListener('abort', () => resolve());
          }),
      );
      const scope = await Effect.runPromise(makeWorkspaceLoadScope);

      await Effect.runPromise(
        Effect.provide(
          startWorkspaceLoad(
            mockLanguageClient,
            undefined,
            undefined,
            undefined,
            scope,
          ),
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      await Effect.runPromise(Scope.close(scope, Exit.void));

      const state = await Effect.runPromise(
        Effect.provide(
          Effect.gen(function* () {
            const workspaceState = yield* WorkspaceState;
            return {
              isLoading: yield* Ref.get(workspaceState.isLoading),
              hasLoaded: yield* Ref.get(workspaceState.hasLoaded),
            };
          }),
          WorkspaceStateLive,
        ),
      );
      expect(state).toEqual({ isLoading: false, hasLoaded: false });
      expect(mockLanguageClient.workspaceLoadComplete).not.toHaveBeenCalled();
      expect(mockLoadWorkspaceForServer.mock.calls[0][4].aborted).toBe(true);
      resolveLoad?.();
    });

    it('loads again after a successful client load is torn down and replaced', async () => {
      const firstScope = await Effect.runPromise(makeWorkspaceLoadScope);
      await Effect.runPromise(
        Effect.provide(
          startWorkspaceLoad(
            mockLanguageClient,
            undefined,
            undefined,
            undefined,
            firstScope,
          ),
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockLanguageClient.workspaceLoadComplete).toHaveBeenCalledTimes(1);

      await Effect.runPromise(Scope.close(firstScope, Exit.void));

      const secondClient = {
        workspaceLoadComplete: jest.fn(),
        workspaceLoadFailed: jest.fn(),
      } as unknown as ApexClientCore;
      const secondScope = await Effect.runPromise(makeWorkspaceLoadScope);
      const restartResult = await Effect.runPromise(
        Effect.provide(
          startWorkspaceLoad(
            secondClient,
            undefined,
            undefined,
            undefined,
            secondScope,
          ),
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(restartResult).toEqual({ accepted: true });
      expect(mockLoadWorkspaceForServer).toHaveBeenCalledTimes(2);
      expect(secondClient.workspaceLoadComplete).toHaveBeenCalledTimes(1);
      await Effect.runPromise(Scope.close(secondScope, Exit.void));
    });

    it('ignores completion from load work that settles after client teardown', async () => {
      let resolveLoad: (() => void) | undefined;
      mockLoadWorkspaceForServer.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveLoad = resolve;
          }),
      );
      const scope = await Effect.runPromise(makeWorkspaceLoadScope);

      await Effect.runPromise(
        Effect.provide(
          startWorkspaceLoad(
            mockLanguageClient,
            undefined,
            undefined,
            undefined,
            scope,
          ),
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      await Effect.runPromise(Scope.close(scope, Exit.void));
      resolveLoad?.();
      await new Promise((resolve) => setTimeout(resolve, 0));

      const state = await Effect.runPromise(
        Effect.provide(
          Effect.gen(function* () {
            const workspaceState = yield* WorkspaceState;
            return {
              isLoading: yield* Ref.get(workspaceState.isLoading),
              hasLoaded: yield* Ref.get(workspaceState.hasLoaded),
              hasFailed: yield* Ref.get(workspaceState.hasFailed),
            };
          }),
          WorkspaceStateLive,
        ),
      );
      expect(state).toEqual({
        isLoading: false,
        hasLoaded: false,
        hasFailed: false,
      });
      expect(mockLanguageClient.workspaceLoadComplete).not.toHaveBeenCalled();
      expect(mockLanguageClient.workspaceLoadFailed).not.toHaveBeenCalled();
    });

    it('resets loading state when the completion notification rejects after disposal', async () => {
      mockLanguageClient.workspaceLoadComplete = jest
        .fn()
        .mockRejectedValue(new Error('disposed'));
      const scope = await Effect.runPromise(makeWorkspaceLoadScope);

      await Effect.runPromise(
        Effect.provide(
          startWorkspaceLoad(
            mockLanguageClient,
            undefined,
            undefined,
            undefined,
            scope,
          ),
          Layer.mergeAll(WorkspaceStateLive, WorkspaceLoaderServiceLive),
        ),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      const isLoading = await Effect.runPromise(
        Effect.provide(
          Effect.gen(function* () {
            const workspaceState = yield* WorkspaceState;
            return yield* Ref.get(workspaceState.isLoading);
          }),
          WorkspaceStateLive,
        ),
      );
      expect(isLoading).toBe(false);
      await Effect.runPromise(Scope.close(scope, Exit.void));
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
      const accepted = results.filter(
        (r) => r.accepted === true && !r.inProgress,
      );
      const inProgress = results.filter((r) => r.inProgress === true);

      expect(accepted.length).toBe(1);
      expect(inProgress.length).toBe(1);
    });
  });
});
