/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  getLogger,
  LSPConfigurationManager,
} from '@salesforce/apex-lsp-shared';
import {
  LocalWorkspaceLoadCoordinator,
  RemoteWorkspaceLoadCoordinator,
  reset as resetWorkspaceLoadState,
} from '../../src/services/WorkspaceLoadCoordinator';

// The load-state Refs (isLoadedRef / isLoadingRef) are module-level
// singletons shared by every coordinator instance — by design, since the
// coordinator process owns one true workspace-load lifecycle. Neither
// coordinator clears isLoadingRef once set (the worker keeps it latched
// until a coordinator load-complete broadcast, a follow-up story), so each
// test must reset() to start from a known unloaded state; otherwise the
// "already loading" guard from a prior test would leak across cases.
describe('LocalWorkspaceLoadCoordinator', () => {
  beforeEach(() => {
    resetWorkspaceLoadState();
  });

  it('sends apex/requestWorkspaceLoad notification on first call', async () => {
    const sendNotification = jest.fn();
    const connection = { sendNotification } as any;
    const coord = new LocalWorkspaceLoadCoordinator(connection, getLogger());

    await Effect.runPromise(coord.ensureLoaded('token-1'));

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledWith('apex/requestWorkspaceLoad', {
      workDoneToken: 'token-1',
    });
  });

  it('skips notification when already loading', async () => {
    const sendNotification = jest.fn();
    const connection = { sendNotification } as any;
    const coord = new LocalWorkspaceLoadCoordinator(connection, getLogger());

    await Effect.runPromise(coord.ensureLoaded());
    await Effect.runPromise(coord.ensureLoaded());

    expect(sendNotification).toHaveBeenCalledTimes(1);
  });
});

describe('RemoteWorkspaceLoadCoordinator', () => {
  beforeEach(() => {
    resetWorkspaceLoadState();
  });

  it('forwards to coordinator:EnsureWorkspaceLoaded over the assistance proxy', async () => {
    const proxy = jest.fn().mockResolvedValue(undefined);
    const coord = new RemoteWorkspaceLoadCoordinator(proxy, getLogger());

    await Effect.runPromise(coord.ensureLoaded(42));

    expect(proxy).toHaveBeenCalledWith(
      'coordinator:EnsureWorkspaceLoaded',
      { workDoneToken: 42 },
      true,
    );
  });

  it('skips the assistance round-trip on subsequent calls while loading', async () => {
    // Simulates the hot-path on a worker: many references requests come in
    // before the coordinator finishes loading. Only the first should hit
    // the assistance bus; the rest read worker-local state and no-op.
    const proxy = jest.fn().mockResolvedValue(undefined);
    const coord = new RemoteWorkspaceLoadCoordinator(proxy, getLogger());

    await Effect.runPromise(coord.ensureLoaded());
    await Effect.runPromise(coord.ensureLoaded());
    await Effect.runPromise(coord.ensureLoaded());

    expect(proxy).toHaveBeenCalledTimes(1);
  });

  it('swallows proxy failures so the worker can continue with partial results', async () => {
    const proxy = jest
      .fn()
      .mockRejectedValue(new Error('coordinator unreachable'));
    const coord = new RemoteWorkspaceLoadCoordinator(proxy, getLogger());

    await expect(
      Effect.runPromise(coord.ensureLoaded()),
    ).resolves.toBeUndefined();
    expect(proxy).toHaveBeenCalledTimes(1);
  });
});

describe('LocalWorkspaceLoadCoordinator — capability gating', () => {
  beforeEach(() => {
    resetWorkspaceLoadState();
    LSPConfigurationManager.resetInstance();
  });

  afterEach(() => {
    LSPConfigurationManager.resetInstance();
  });

  it('sends when clientCapabilities is undefined (legacy — default-allow)', async () => {
    // Ensure LSPConfigurationManager exists but has no client caps
    LSPConfigurationManager.getInstance();

    const sendNotification = jest.fn();
    const connection = { sendNotification } as any;
    const coord = new LocalWorkspaceLoadCoordinator(connection, getLogger());

    await Effect.runPromise(coord.ensureLoaded('tok'));

    expect(sendNotification).toHaveBeenCalledWith(
      'apex/requestWorkspaceLoad',
      expect.objectContaining({ workDoneToken: 'tok' }),
    );
  });

  it('sends when client advertises requestWorkspaceLoadProvider', async () => {
    const cm = LSPConfigurationManager.getInstance();
    cm.setClientCapabilities({
      experimental: { requestWorkspaceLoadProvider: { enabled: true } },
    } as any);

    const sendNotification = jest.fn();
    const connection = { sendNotification } as any;
    const coord = new LocalWorkspaceLoadCoordinator(connection, getLogger());

    await Effect.runPromise(coord.ensureLoaded());

    expect(sendNotification).toHaveBeenCalledWith(
      'apex/requestWorkspaceLoad',
      expect.any(Object),
    );
  });

  it('suppresses when caps present but key absent', async () => {
    const cm = LSPConfigurationManager.getInstance();
    cm.setClientCapabilities({
      experimental: {},
    } as any);

    const sendNotification = jest.fn();
    const connection = { sendNotification } as any;
    const coord = new LocalWorkspaceLoadCoordinator(connection, getLogger());

    await Effect.runPromise(coord.ensureLoaded());

    expect(sendNotification).not.toHaveBeenCalled();
  });
});
