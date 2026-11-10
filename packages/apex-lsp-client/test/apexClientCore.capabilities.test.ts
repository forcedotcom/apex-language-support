/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_APEX_SETTINGS,
  enableConsoleLogging,
  setLogLevel,
  type ApexLanguageServerSettings,
  type Disposable,
  type InitializeParams,
} from '@salesforce/apex-lsp-shared';
import { ApexClientCore } from '../src/apexClientCore';
import type { RpcConnection } from '../src/rpcConnection';

/**
 * Captures the initialize params so we can inspect capabilities.
 */
const makeMockConnection = (
  captureInitParams: (params: InitializeParams) => void,
  initializeResult: unknown = { capabilities: {} },
): RpcConnection => {
  const sendRequest = vi.fn(
    (method: string, params?: unknown): Promise<unknown> => {
      if (method === 'initialize') {
        captureInitParams(params as InitializeParams);
        return Promise.resolve(initializeResult);
      }
      return Promise.resolve(undefined);
    },
  );
  const sendNotification = vi.fn(
    (_method: string, _params?: unknown): Promise<void> => Promise.resolve(),
  );
  const onRequest = vi.fn(
    (_method: string, _handler: (params: unknown) => unknown): Disposable => ({
      dispose: vi.fn(),
    }),
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
  } as unknown as RpcConnection;
};

describe('ApexClientCore capability advertisement', () => {
  beforeEach(() => {
    enableConsoleLogging();
    setLogLevel('error');
  });

  it('initialize with mode=production merges correct experimental keys', async () => {
    let captured: InitializeParams | undefined;
    const connection = makeMockConnection((params) => {
      captured = params;
    });

    const core = await ApexClientCore.create(connection);
    await core.initialize(DEFAULT_APEX_SETTINGS);

    expect(captured).toBeDefined();
    const experimental = captured!.capabilities.experimental as Record<
      string,
      unknown
    >;
    expect(experimental.findMissingArtifactProvider).toEqual({
      enabled: true,
      supportedModes: ['blocking', 'background'],
    });
    expect(experimental.workspaceIngestionProvider).toEqual({ enabled: true });
    expect(experimental.requestWorkspaceLoadProvider).toEqual({
      enabled: true,
    });
    expect(captured!.capabilities.textDocument?.semanticTokens).toMatchObject({
      requests: { full: true },
      formats: ['relative'],
    });

    await core.dispose();
  });

  it('initialize with mode=development merges queueStateProvider additionally', async () => {
    let captured: InitializeParams | undefined;
    const connection = makeMockConnection((params) => {
      captured = params;
    });

    const devSettings: ApexLanguageServerSettings = {
      apex: {
        ...DEFAULT_APEX_SETTINGS.apex,
        environment: {
          ...DEFAULT_APEX_SETTINGS.apex.environment,
          serverMode: 'development',
        },
      },
    };

    const core = await ApexClientCore.create(connection);
    await core.initialize(devSettings);

    expect(captured).toBeDefined();
    const experimental = captured!.capabilities.experimental as Record<
      string,
      unknown
    >;
    expect(experimental.findMissingArtifactProvider).toEqual({
      enabled: true,
      supportedModes: ['blocking', 'background'],
    });
    expect(experimental.workspaceIngestionProvider).toEqual({ enabled: true });
    expect(experimental.requestWorkspaceLoadProvider).toEqual({
      enabled: true,
    });
    expect(experimental.queueStateProvider).toEqual({ enabled: true });

    await core.dispose();
  });

  it('findMissingArtifactProvider is present in both modes', async () => {
    // Production
    let capturedProd: InitializeParams | undefined;
    const connProd = makeMockConnection((params) => {
      capturedProd = params;
    });
    const coreProd = await ApexClientCore.create(connProd);
    await coreProd.initialize(DEFAULT_APEX_SETTINGS);
    const expProd = capturedProd!.capabilities.experimental as Record<
      string,
      unknown
    >;
    expect(expProd.findMissingArtifactProvider).toBeDefined();
    await coreProd.dispose();

    // Development
    let capturedDev: InitializeParams | undefined;
    const connDev = makeMockConnection((params) => {
      capturedDev = params;
    });
    const coreDev = await ApexClientCore.create(connDev);
    const devSettings: ApexLanguageServerSettings = {
      apex: {
        ...DEFAULT_APEX_SETTINGS.apex,
        environment: {
          ...DEFAULT_APEX_SETTINGS.apex.environment,
          serverMode: 'development',
        },
      },
    };
    await coreDev.initialize(devSettings);
    const expDev = capturedDev!.capabilities.experimental as Record<
      string,
      unknown
    >;
    expect(expDev.findMissingArtifactProvider).toBeDefined();
    await coreDev.dispose();
  });

  it('profilingProvider is NOT in client capabilities (server-side only)', async () => {
    let captured: InitializeParams | undefined;
    const connection = makeMockConnection((params) => {
      captured = params;
    });

    const devSettings: ApexLanguageServerSettings = {
      apex: {
        ...DEFAULT_APEX_SETTINGS.apex,
        environment: {
          ...DEFAULT_APEX_SETTINGS.apex.environment,
          serverMode: 'development',
        },
      },
    };

    const core = await ApexClientCore.create(connection);
    await core.initialize(devSettings);

    const experimental = captured!.capabilities.experimental as Record<
      string,
      unknown
    >;
    // profilingProvider is a SERVER capability, not client
    expect(experimental.profilingProvider).toBeUndefined();

    await core.dispose();
  });

  it('returns false/false before initialize and for unknown feature names', async () => {
    const core = await ApexClientCore.create(makeMockConnection(() => {}));

    expect(core.getFeatureState('hover')).toEqual({
      supported: false,
      enabled: false,
    });
    await core.initialize(DEFAULT_APEX_SETTINGS);
    expect(core.getFeatureState('not-a-server-feature')).toEqual({
      supported: false,
      enabled: false,
    });

    await core.dispose();
  });

  it('retains server-reported supported and enabled feature states', async () => {
    const core = await ApexClientCore.create(
      makeMockConnection(() => {}, {
        capabilities: {
          experimental: {
            featureStateProvider: {
              hover: { supported: true, enabled: false },
              codeLens: { supported: true, enabled: true },
            },
          },
        },
      }),
    );

    await core.initialize(DEFAULT_APEX_SETTINGS);

    expect(core.getFeatureState('hover')).toEqual({
      supported: true,
      enabled: false,
    });
    expect(core.getFeatureState('codeLens')).toEqual({
      supported: true,
      enabled: true,
    });

    await core.dispose();
  });

  it('accepts feature states from a host-owned initialization handshake', async () => {
    const core = await ApexClientCore.create(makeMockConnection(() => {}));

    core.setFeatureStatesFromInitializeResult({
      capabilities: {
        experimental: {
          featureStateProvider: {
            codeLens: { supported: true, enabled: true },
          },
        },
      },
    });

    expect(core.getFeatureState('codeLens')).toEqual({
      supported: true,
      enabled: true,
    });

    await core.dispose();
  });

  it('preserves a caller semantic-token capability object', async () => {
    let captured: InitializeParams | undefined;
    const core = await ApexClientCore.create(
      makeMockConnection((params) => {
        captured = params;
      }),
    );

    await core.initialize(DEFAULT_APEX_SETTINGS, {
      capabilities: {
        textDocument: {
          semanticTokens: {
            requests: { full: { delta: true } },
            tokenTypes: ['custom'],
            tokenModifiers: ['generated'],
            formats: ['relative'],
          },
        },
      },
    });

    expect(captured!.capabilities.textDocument?.semanticTokens).toEqual({
      requests: { full: { delta: true } },
      tokenTypes: ['custom'],
      tokenModifiers: ['generated'],
      formats: ['relative'],
    });

    await core.dispose();
  });
});
