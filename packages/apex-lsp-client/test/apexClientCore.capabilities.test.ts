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
): RpcConnection => {
  const sendRequest = jest.fn(
    (method: string, params?: unknown): Promise<unknown> => {
      if (method === 'initialize') {
        captureInitParams(params as InitializeParams);
        return Promise.resolve({ capabilities: {} });
      }
      return Promise.resolve(undefined);
    },
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
});
