/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Language Server Module Tests
 */

// The shared vscode mock omits env/UIKind; provide them for environment detection.
jest.mock('vscode', () => ({
  ...jest.requireActual('vscode'),
  env: { uiKind: 1, language: 'en' },
  UIKind: { Desktop: 1, Web: 2 },
}));

// vscode-languageclient pulls in browser/node globals that are absent under Jest;
// stub the surface language-server.ts touches at import time.
jest.mock('vscode-languageclient', () => ({
  Trace: { Off: 0, Messages: 1, Verbose: 2 },
  State: { Stopped: 1, Starting: 2, Running: 3 },
}));
jest.mock('vscode-languageclient/node', () => ({
  Trace: { Off: 0, Messages: 1, Verbose: 2 },
  State: { Stopped: 1, Starting: 2, Running: 3 },
  LanguageClient: class {},
}));

jest.mock('../src/logging', () => ({
  logToOutputChannel: jest.fn(),
  createSafeOutputChannel: jest.fn(),
  getWorkerServerOutputChannel: jest.fn(),
}));

const coreCreate = jest.fn();
const connectionConstructor = jest.fn();
const apexLibInitialize = jest.fn();

jest.mock('@salesforce/apex-lsp-client', () => ({
  ApexClientCore: { create: coreCreate },
  LanguageClientConnection: class {
    constructor(client: unknown) {
      connectionConstructor(client);
    }
  },
}));

jest.mock('@salesforce/apex-lsp-client/browser', () => ({
  ApexClientCore: { create: coreCreate },
  LanguageClientConnection: class {
    constructor(client: unknown) {
      connectionConstructor(client);
    }
  },
}));

jest.mock('@salesforce/apex-lsp-compliant-services', () => ({
  createApexLibManager: jest.fn(() => ({ initialize: apexLibInitialize })),
}));

import * as vscode from 'vscode';
import { Effect, Exit, Scope } from 'effect';
import { DEFAULT_APEX_SETTINGS } from '@salesforce/apex-lsp-shared';
import {
  completeClientStart,
  createWebClientOptions,
  createClientState,
  createWebDocumentSelector,
  detectEnvironment,
  disposeClientState,
  initializeApexLib,
  logDesktopServerStartStatus,
  restartAfterStrictStop,
} from '../src/language-server';

describe('createClientState', () => {
  beforeEach(() => {
    coreCreate.mockReset();
    connectionConstructor.mockReset();
  });

  it('constructs the core before starting the raw language client without a second handshake', async () => {
    const events: string[] = [];
    const rawClient = {
      start: jest.fn(async () => {
        events.push('start');
      }),
    };
    const core = {
      initialize: jest.fn(),
      shutdown: jest.fn(),
      dispose: jest.fn(),
    };
    coreCreate.mockImplementation(async () => {
      events.push('core');
      return core;
    });

    const state = await createClientState(rawClient as never, 'desktop', () => {
      events.push('handlers');
    });

    expect(connectionConstructor).toHaveBeenCalledWith(rawClient);
    expect(events).toEqual(['core', 'handlers', 'start']);
    expect(core.initialize).not.toHaveBeenCalled();
    expect(core.shutdown).not.toHaveBeenCalled();
    expect(state).toEqual({
      rawClient,
      core,
      workspaceLoadScope: expect.any(Object),
    });
    await Effect.runPromise(Scope.close(state.workspaceLoadScope!, Exit.void));
  });

  it('clears client state before propagating a disposal failure', async () => {
    const events: string[] = [];
    const state = {
      rawClient: {} as never,
      core: {
        dispose: jest.fn(async () => {
          events.push('dispose');
          throw new Error('stop failed');
        }),
      } as never,
    };

    await expect(
      disposeClientState(state, () => events.push('clear')),
    ).rejects.toThrow('stop failed');

    expect(events).toEqual(['clear', 'dispose']);
  });

  it('attempts every cleanup stage when multiple stages fail', async () => {
    const events: string[] = [];
    const workspaceLoadScope = await Effect.runPromise(Scope.make());
    await Effect.runPromise(
      Scope.addFinalizer(
        workspaceLoadScope,
        Effect.sync(() => {
          events.push('scope');
          throw new Error('scope failed');
        }),
      ),
    );
    const state = {
      rawClient: {} as never,
      configurationListener: {
        dispose: jest.fn(() => {
          events.push('listener');
          throw new Error('listener failed');
        }),
      },
      apexLibResources: [
        {
          dispose: jest.fn(() => {
            events.push('resource-one');
            throw new Error('resource one failed');
          }),
        },
        { dispose: jest.fn(() => events.push('resource-two')) },
      ],
      workspaceLoadScope,
      core: {
        dispose: jest.fn(async () => {
          events.push('core');
          throw new Error('core failed');
        }),
      } as never,
    };

    await expect(
      disposeClientState(state, () => events.push('clear')),
    ).rejects.toThrow('listener failed');

    expect(events).toEqual([
      'clear',
      'listener',
      'resource-one',
      'resource-two',
      'scope',
      'core',
    ]);
  });

  it('disposes the core when the raw language client fails to start', async () => {
    const rawClient = {
      start: jest.fn().mockRejectedValue(new Error('start failed')),
    };
    const core = {
      dispose: jest.fn().mockResolvedValue(undefined),
    };
    coreCreate.mockResolvedValue(core);

    await expect(
      createClientState(rawClient as never, 'web', jest.fn()),
    ).rejects.toThrow('start failed');

    expect(core.dispose).toHaveBeenCalledTimes(1);
  });

  it('preserves the raw client startup error when cleanup also fails', async () => {
    const startupError = new Error('start failed');
    const rawClient = { start: jest.fn().mockRejectedValue(startupError) };
    const core = {
      dispose: jest.fn().mockRejectedValue(new Error('dispose failed')),
    };
    coreCreate.mockResolvedValue(core);

    await expect(
      createClientState(rawClient as never, 'desktop', jest.fn()),
    ).rejects.toBe(startupError);

    const { logToOutputChannel } = jest.requireMock('../src/logging');
    expect(logToOutputChannel).toHaveBeenCalledWith(
      expect.stringContaining('dispose failed'),
      'warning',
    );
  });
});

describe('restartAfterStrictStop', () => {
  it('does not start a replacement when stopping the old client fails', async () => {
    const stop = jest.fn().mockRejectedValue(new Error('stop failed'));
    const start = jest.fn().mockResolvedValue(undefined);

    await expect(restartAfterStrictStop(stop, start)).rejects.toThrow(
      'stop failed',
    );

    expect(start).not.toHaveBeenCalled();
  });
});

describe('completeClientStart', () => {
  beforeEach(() => {
    (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
      get: jest.fn((_key: string, defaultValue: unknown) => defaultValue),
    });
  });

  it('disposes the candidate core when setting trace fails after raw start', async () => {
    const dispose = jest.fn().mockResolvedValue(undefined);
    const state = {
      rawClient: {
        setTrace: jest.fn().mockRejectedValue(new Error('trace failed')),
      },
      core: { dispose },
    } as never;

    await expect(
      completeClientStart(state, {
        registerConfigurationListener: jest.fn(),
        sendConfiguration: jest.fn(),
        loadWorkspace: jest.fn(),
        shouldLoadWorkspace: false,
      }),
    ).rejects.toThrow('trace failed');

    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes the listener and candidate core when workspace loading fails', async () => {
    const listener = { dispose: jest.fn() };
    const apexLibResource = { dispose: jest.fn() };
    const dispose = jest.fn().mockResolvedValue(undefined);
    const state = {
      rawClient: { setTrace: jest.fn().mockResolvedValue(undefined) },
      core: { dispose },
    } as never;

    await expect(
      completeClientStart(state, {
        registerConfigurationListener: jest.fn().mockReturnValue(listener),
        initializeApexLib: jest.fn().mockResolvedValue([apexLibResource]),
        sendConfiguration: jest.fn(),
        loadWorkspace: jest.fn().mockRejectedValue(new Error('load failed')),
        shouldLoadWorkspace: true,
      }),
    ).rejects.toThrow('load failed');

    expect(listener.dispose).toHaveBeenCalledTimes(1);
    expect(apexLibResource.dispose).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('preserves a post-start failure while attempting every candidate cleanup stage', async () => {
    const startupError = new Error('load failed');
    const events: string[] = [];
    const workspaceLoadScope = await Effect.runPromise(Scope.make());
    await Effect.runPromise(
      Scope.addFinalizer(
        workspaceLoadScope,
        Effect.sync(() => {
          events.push('scope');
          throw new Error('scope failed');
        }),
      ),
    );
    const state = {
      rawClient: { setTrace: jest.fn().mockResolvedValue(undefined) },
      workspaceLoadScope,
      core: {
        dispose: jest.fn(async () => {
          events.push('core');
          throw new Error('core failed');
        }),
      },
    } as never;

    await expect(
      completeClientStart(state, {
        registerConfigurationListener: jest.fn().mockReturnValue({
          dispose: () => {
            events.push('listener');
            throw new Error('listener failed');
          },
        }),
        initializeApexLib: jest.fn().mockResolvedValue([
          {
            dispose: () => {
              events.push('resource-one');
              throw new Error('resource failed');
            },
          },
          { dispose: () => events.push('resource-two') },
        ]),
        sendConfiguration: jest.fn(),
        loadWorkspace: jest.fn().mockRejectedValue(startupError),
        shouldLoadWorkspace: true,
      }),
    ).rejects.toBe(startupError);

    expect(events).toEqual([
      'listener',
      'resource-one',
      'resource-two',
      'scope',
      'core',
    ]);
  });

  it('initializes ApexLib after raw start and disposes its resources before the client core', async () => {
    const events: string[] = [];
    const listener = { dispose: jest.fn(() => events.push('listener')) };
    const apexLibResource = {
      dispose: jest.fn(() => events.push('apexlib')),
    };
    const state = {
      rawClient: {
        setTrace: jest.fn(async () => events.push('trace')),
      },
      core: {
        dispose: jest.fn(async () => {
          events.push('core');
        }),
      },
    } as never;
    const completed = await completeClientStart(state, {
      registerConfigurationListener: jest.fn().mockReturnValue(listener),
      initializeApexLib: jest.fn(async () => {
        events.push('apexlib-init');
        return [apexLibResource];
      }),
      sendConfiguration: jest.fn(),
      loadWorkspace: jest.fn(),
      shouldLoadWorkspace: false,
    });

    await disposeClientState(completed, jest.fn());

    expect(events).toEqual([
      'trace',
      'apexlib-init',
      'listener',
      'apexlib',
      'core',
    ]);
  });
});

describe('initializeApexLib', () => {
  beforeEach(() => {
    apexLibInitialize.mockReset();
  });

  it('cleans all partial resources and preserves initialization errors', async () => {
    const initializationError = new Error('ApexLib initialization failed');
    const events: string[] = [];
    apexLibInitialize.mockImplementation(async (editorContext) => {
      editorContext.disposables.push(
        {
          dispose: () => {
            events.push('resource-one');
            throw new Error('resource one cleanup failed');
          },
        },
        { dispose: () => events.push('resource-two') },
      );
      throw initializationError;
    });

    await expect(
      initializeApexLib({} as never, {} as vscode.ExtensionContext),
    ).rejects.toBe(initializationError);

    expect(events).toEqual(['resource-one', 'resource-two']);
    const { logToOutputChannel } = jest.requireMock('../src/logging');
    expect(logToOutputChannel).toHaveBeenCalledWith(
      expect.stringContaining('resource one cleanup failed'),
      'warning',
    );
  });
});

describe('logDesktopServerStartStatus', () => {
  it('reports confirmed post-start client status without observing private process state', () => {
    logDesktopServerStartStatus({ isRunning: () => true });

    const { logToOutputChannel } = jest.requireMock('../src/logging');
    expect(logToOutputChannel).toHaveBeenCalledWith(
      '🟢 Node language server start completed (client running: true)',
      'debug',
    );
  });
});

describe('detectEnvironment', () => {
  const originalUiKind = vscode.env.uiKind;

  afterEach(() => {
    (vscode.env as { uiKind: number }).uiKind = originalUiKind;
    delete (globalThis as Record<string, unknown>).__APEX_LS_TARGET__;
  });

  describe('when a bundle target is injected (esbuild define)', () => {
    it("returns 'desktop' for the Node bundle even when the UI is a browser (code-server)", () => {
      // code-server: Node extension host (Node bundle) but browser-rendered UI.
      (globalThis as Record<string, unknown>).__APEX_LS_TARGET__ = 'desktop';
      (vscode.env as { uiKind: number }).uiKind = vscode.UIKind.Web;

      expect(detectEnvironment()).toBe('desktop');
    });

    it("returns 'web' for the browser bundle (vscode.dev web-worker host)", () => {
      (globalThis as Record<string, unknown>).__APEX_LS_TARGET__ = 'web';
      (vscode.env as { uiKind: number }).uiKind = vscode.UIKind.Web;

      expect(detectEnvironment()).toBe('web');
    });
  });

  describe('fallback when no bundle target is injected (unbundled/tsc)', () => {
    it("returns 'web' when uiKind is Web", () => {
      (vscode.env as { uiKind: number }).uiKind = vscode.UIKind.Web;
      expect(detectEnvironment()).toBe('web');
    });

    it("returns 'desktop' when uiKind is Desktop", () => {
      (vscode.env as { uiKind: number }).uiKind = vscode.UIKind.Desktop;
      expect(detectEnvironment()).toBe('desktop');
    });
  });
});

describe('createWebDocumentSelector', () => {
  it('adds only the temporary Apex class and trigger documents', () => {
    const selectors = createWebDocumentSelector(DEFAULT_APEX_SETTINGS);
    const orgSelectors = selectors.filter(
      (selector) => selector.scheme === 'apex-org-artifact',
    );

    expect(orgSelectors).toEqual([
      {
        scheme: 'apex-org-artifact',
        language: 'apex',
        pattern: '**/*.cls',
      },
      {
        scheme: 'apex-org-artifact',
        language: 'apex',
        pattern: '**/*.trigger',
      },
    ]);
  });

  it('uses shared hover middleware in web clients', async () => {
    const options = createWebClientOptions(DEFAULT_APEX_SETTINGS);
    const provideHover = options.middleware!.provideHover! as unknown as (
      document: unknown,
      position: unknown,
      token: {
        isCancellationRequested: boolean;
        onCancellationRequested: jest.Mock;
      },
      next: () => Promise<unknown>,
    ) => Promise<unknown>;
    const token = {
      isCancellationRequested: false,
      onCancellationRequested: jest.fn(),
    };
    const document = { uri: 'file:///Test.cls' };
    const position = { line: 0, character: 0 };

    const slow = provideHover(
      document,
      position,
      token,
      () => new Promise(() => {}),
    );
    const fast = provideHover(document, position, token, async () => ({
      contents: 'fast',
    }));

    await expect(slow).resolves.toBeNull();
    await expect(fast).resolves.toEqual({ contents: 'fast' });

    await expect(
      provideHover(
        document,
        position,
        {
          isCancellationRequested: true,
          onCancellationRequested: jest.fn(),
        },
        () => new Promise(() => {}),
      ),
    ).resolves.toBeNull();

    const sendRequest = options.middleware!.sendRequest!;
    const next = jest.fn().mockResolvedValue({ contents: 'hover result' });
    await expect(
      sendRequest(
        'textDocument/hover',
        {
          textDocument: { uri: 'file:///Test.cls' },
          position: { line: 2, character: 4 },
        },
        undefined,
        next,
      ),
    ).resolves.toEqual({ contents: 'hover result' });

    const { logToOutputChannel } = jest.requireMock('../src/logging');
    expect(logToOutputChannel).toHaveBeenCalledWith(
      expect.stringContaining(
        'Hover request initiated: file:///Test.cls at 2:4',
      ),
      'debug',
    );
  });
});
