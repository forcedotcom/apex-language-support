/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { Effect, Exit, Layer, Scope } from 'effect';
import type {
  ApexLanguageServerSettings,
  FindMissingArtifactParams,
  RequestWorkspaceLoadParams,
  RuntimePlatform,
} from '@salesforce/apex-lsp-shared';
import {
  formattedError,
  getClientCapabilitiesForMode,
  getDocumentSelectorsFromSettings,
  WORKSPACE_LOAD_REASON_MESSAGE,
} from '@salesforce/apex-lsp-shared';
import type { ApexClientCore } from '@salesforce/apex-lsp-client';
import type {
  InitializeParams,
  TextDocumentFilter,
} from 'vscode-languageserver-protocol';
import type {
  BaseLanguageClient,
  LanguageClientOptions,
} from 'vscode-languageclient';
import { Trace } from 'vscode-languageclient';
import { setStartingFlag, resetServerStartRetries } from './commands';
import {
  getTraceServerConfig,
  getWorkspaceSettings,
  registerConfigurationChangeListener,
  sendInitialConfiguration,
} from './configuration';
import { EXTENSION_CONSTANTS } from './constants';
import { handleFindMissingArtifact } from './missing-artifact-handler';
import {
  createSafeOutputChannel,
  getWorkerServerOutputChannel,
  logToOutputChannel,
} from './logging';
import {
  emitTelemetrySpan,
  getSpanCollectorUrl,
} from './observability/extensionTracing';
import { getOrgArtifactSourceDocumentSelectors } from './services/org-artifact-fs';
import {
  clearIngestionTimeout,
  updateApexServerStatusError,
  updateApexServerStatusLoading,
  updateApexServerStatusReady,
  updateApexServerStatusStarting,
  updateApexServerStatusStopped,
} from './status-bar';
import {
  detectEnvironment,
  determineServerMode,
  getStdApexClassesPathFromContext,
  ServerMode,
} from './utils/serverUtils';
import {
  startWorkspaceLoad,
  makeWorkspaceLoadScope,
  WorkspaceLoaderServiceLive,
  WorkspaceStateLive,
} from './workspace-load-handler';
import { createHoverMiddleware } from './hoverMiddleware';

export { detectEnvironment };

export interface ClientState {
  readonly rawClient: BaseLanguageClient;
  readonly core: ApexClientCore;
  readonly configurationListener?: vscode.Disposable;
  readonly apexLibResources?: readonly vscode.Disposable[];
  readonly workspaceLoadScope?: Scope.CloseableScope;
}

type CleanupStage = readonly [
  name: string,
  cleanup: () => void | Promise<void>,
];

let clientState: ClientState | undefined;
let lifecycleQueue: Promise<void> = Promise.resolve();

const sharedWorkspaceLoadLayer = Layer.mergeAll(
  WorkspaceLoaderServiceLive,
  WorkspaceStateLive,
);

const cleanupClientState = async (
  state: ClientState,
  logFailures: boolean,
): Promise<void> => {
  const stages: readonly CleanupStage[] = [
    ['configuration listener', () => state.configurationListener?.dispose()],
    ...(state.apexLibResources ?? []).map((resource, index): CleanupStage => [
      `ApexLib resource ${index + 1}`,
      () => resource.dispose(),
    ]),
    [
      'workspace load scope',
      () =>
        state.workspaceLoadScope
          ? Effect.runPromise(Scope.close(state.workspaceLoadScope, Exit.void))
          : undefined,
    ],
    ['client core and raw transport', () => state.core.dispose()],
  ];
  let firstError: unknown;

  for (const [name, cleanup] of stages) {
    try {
      await cleanup();
    } catch (error) {
      firstError ??= error;
      if (logFailures) {
        logToOutputChannel(
          `⚠️ Failed to dispose ${name}: ${formattedError(error)}`,
          'warning',
        );
      }
    }
  }

  if (firstError !== undefined) {
    throw firstError;
  }
};

const cleanupAfterStartupFailure = async (
  state: ClientState,
  startupError: unknown,
): Promise<never> => {
  try {
    await cleanupClientState(state, true);
  } catch {
    // Each cleanup error was logged by cleanupClientState. The startup error is
    // the operation's primary failure and must remain observable to the caller.
  }
  throw startupError;
};

export function createWebDocumentSelector(
  initializationOptions: ApexLanguageServerSettings,
): TextDocumentFilter[] {
  const selectors = getDocumentSelectorsFromSettings(
    'all',
    initializationOptions,
  ) as TextDocumentFilter[];
  return [...selectors, ...getOrgArtifactSourceDocumentSelectors()];
}

const createEnhancedInitializationOptions = async (
  context: vscode.ExtensionContext,
  runtimePlatform: RuntimePlatform,
  serverMode: ServerMode,
): Promise<ApexLanguageServerSettings> => {
  const settings = getWorkspaceSettings();
  return {
    apex: {
      ...settings.apex,
      environment: {
        ...settings.apex.environment,
        runtimePlatform,
        serverMode,
        vscodeVersion: vscode.version,
        extensionVersion:
          (context.extension.packageJSON?.version as string) ?? '0.0.0',
        workerPlatformWebUrl:
          runtimePlatform === 'web'
            ? vscode.Uri.joinPath(
                context.extensionUri,
                'dist',
                'worker.platform.web.js',
              ).toString()
            : undefined,
        spanCollectorUrl: getSpanCollectorUrl(),
      },
      resources: {
        ...settings.apex.resources,
        standardApexLibraryPath:
          getStdApexClassesPathFromContext(context)?.toString(),
      },
    },
  };
};

export const createInitializeParams = async (
  context: vscode.ExtensionContext,
  environment: 'desktop' | 'web',
  serverMode: ServerMode,
): Promise<InitializeParams> => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  return {
    processId: environment === 'web' ? null : process.pid,
    clientInfo: {
      name: 'Apex Language Server Extension',
      version: (context.extension.packageJSON?.version as string) ?? '0.0.0',
    },
    locale: vscode.env.language,
    rootPath:
      environment === 'web'
        ? null
        : (workspaceFolders?.[0]?.uri.fsPath ?? null),
    rootUri: workspaceFolders?.[0]?.uri.toString() ?? null,
    capabilities: getClientCapabilitiesForMode(serverMode),
    initializationOptions: await createEnhancedInitializationOptions(
      context,
      environment,
      serverMode,
    ),
    workspaceFolders:
      workspaceFolders?.map((folder) => ({
        uri: folder.uri.toString(),
        name: folder.name,
      })) ?? null,
  };
};

export async function createClientState(
  rawClient: BaseLanguageClient,
  environment: 'desktop' | 'web',
  registerHandlers: (
    core: ApexClientCore,
    workspaceLoadScope: Scope.CloseableScope,
  ) => void | Promise<void>,
): Promise<ClientState> {
  const sdk =
    environment === 'web'
      ? await import('@salesforce/apex-lsp-client/browser')
      : await import('@salesforce/apex-lsp-client');
  const core = await sdk.ApexClientCore.create(
    new sdk.LanguageClientConnection(rawClient),
  );
  const workspaceLoadScope = await Effect.runPromise(makeWorkspaceLoadScope);
  try {
    await registerHandlers(core, workspaceLoadScope);
    await rawClient.start();
    return { rawClient, core, workspaceLoadScope };
  } catch (error) {
    return cleanupAfterStartupFailure(
      { rawClient, core, workspaceLoadScope },
      error,
    );
  }
}

export async function disposeClientState(
  state: ClientState | undefined,
  clearState: () => void,
): Promise<void> {
  clearState();
  if (state) {
    await cleanupClientState(state, true);
  }
}

interface ClientStartOperations {
  readonly registerConfigurationListener: () => vscode.Disposable;
  readonly initializeApexLib?: () => Promise<readonly vscode.Disposable[]>;
  readonly sendConfiguration: () => void;
  readonly loadWorkspace: () => Promise<void>;
  readonly shouldLoadWorkspace: boolean;
  readonly markReady?: () => void;
}

export const completeClientStart = async (
  state: ClientState,
  operations: ClientStartOperations,
): Promise<ClientState> => {
  let configurationListener: vscode.Disposable | undefined;
  let apexLibResources: readonly vscode.Disposable[] = [];
  try {
    await state.rawClient.setTrace(traceLevel());
    apexLibResources = (await operations.initializeApexLib?.()) ?? [];
    configurationListener = operations.registerConfigurationListener();
    operations.sendConfiguration();
    if (operations.shouldLoadWorkspace) {
      await operations.loadWorkspace();
    } else {
      operations.markReady?.();
    }
    return { ...state, configurationListener, apexLibResources };
  } catch (error) {
    return cleanupAfterStartupFailure(
      { ...state, configurationListener, apexLibResources },
      error,
    );
  }
};

const runWorkspaceLoad = async (
  core: ApexClientCore,
  scope: Scope.CloseableScope,
  params?: RequestWorkspaceLoadParams,
): Promise<void> => {
  await Effect.runPromise(
    Effect.provide(
      startWorkspaceLoad(
        core,
        params?.workDoneToken,
        undefined,
        params?.reason,
        scope,
      ),
      sharedWorkspaceLoadLayer,
    ),
  );
};

const registerCoreHandlers = async (
  core: ApexClientCore,
  workspaceLoadScope: Scope.CloseableScope,
  context: vscode.ExtensionContext,
): Promise<void> => {
  core.onFindMissingArtifact(async (params: FindMissingArtifactParams) => {
    const identifiers = params.identifiers
      .map((identifier) => identifier.name)
      .join(', ');
    logToOutputChannel(
      `📨 Received apex/findMissingArtifact request for: ${identifiers}`,
      'debug',
    );
    try {
      const result = await handleFindMissingArtifact(params, context);
      logToOutputChannel(
        'notFound' in result
          ? `❌ Could not resolve missing artifact: ${identifiers}`
          : `✅ Resolved missing artifact: ${identifiers}`,
        'debug',
      );
      return result;
    } catch (error) {
      logToOutputChannel(
        `❌ Failed to resolve missing artifact ${identifiers}: ${formattedError(error)}`,
        'error',
      );
      return { notFound: true };
    }
  });
  core.onRequestWorkspaceLoad((params) => {
    if (params.reason && WORKSPACE_LOAD_REASON_MESSAGE[params.reason]) {
      updateApexServerStatusLoading(
        WORKSPACE_LOAD_REASON_MESSAGE[params.reason],
      );
    }
    runWorkspaceLoad(core, workspaceLoadScope, params).catch((error) => {
      logToOutputChannel(
        `❌ Failed to handle workspace load notification: ${formattedError(error)}`,
        'error',
      );
    });
  });
  core.onWorkspaceIngestionComplete(() => {
    clearIngestionTimeout();
    updateApexServerStatusReady();
  });
};

export const initializeApexLib = async (
  core: ApexClientCore,
  context: vscode.ExtensionContext,
): Promise<readonly vscode.Disposable[]> => {
  const { createApexLibManager } =
    await import('@salesforce/apex-lsp-compliant-services');
  const { VSCodeEditorContextAdapter, VSCodeLanguageClientAdapter } =
    await import('./apexlib/vscode-adapters');
  const editorContext = new VSCodeEditorContextAdapter(context);
  try {
    await createApexLibManager(
      new VSCodeLanguageClientAdapter(core),
      'apex',
      'apexlib',
      'cls',
    ).initialize(editorContext);
    return editorContext.disposables;
  } catch (error) {
    for (const [index, resource] of editorContext.disposables.entries()) {
      try {
        resource.dispose();
      } catch (cleanupError) {
        logToOutputChannel(
          `⚠️ Failed to dispose ApexLib resource ${index + 1} ` +
            `after initialization failure: ${formattedError(cleanupError)}`,
          'warning',
        );
      }
    }
    throw error;
  }
};

const traceLevel = (): Trace => {
  const trace = getTraceServerConfig();
  return trace === 'verbose'
    ? Trace.Verbose
    : trace === 'messages'
      ? Trace.Messages
      : Trace.Off;
};

const observeRawClient = (rawClient: BaseLanguageClient): void => {
  rawClient.onTelemetry((event: unknown) => {
    emitTelemetrySpan(event as Record<string, unknown>);
  });
  rawClient.onDidChangeState((event) => {
    logToOutputChannel(
      `🔄 Language client state changed: ${event.oldState} -> ${event.newState}`,
      'info',
    );
  });
};

export const logDesktopServerStartStatus = (
  rawClient: Pick<BaseLanguageClient, 'isRunning'>,
): void => {
  logToOutputChannel(
    `🟢 Node language server start completed (client running: ${rawClient.isRunning()})`,
    'debug',
  );
};

const startConfiguredClient = async (
  rawClient: BaseLanguageClient,
  environment: 'desktop' | 'web',
  context: vscode.ExtensionContext,
): Promise<ClientState> => {
  const state = await createClientState(
    rawClient,
    environment,
    (core, workspaceLoadScope) =>
      registerCoreHandlers(core, workspaceLoadScope, context),
  );
  observeRawClient(rawClient);
  return state;
};

export const createWebClientOptions = (
  initializationOptions: ApexLanguageServerSettings,
): LanguageClientOptions => ({
  documentSelector: createWebDocumentSelector(initializationOptions),
  synchronize: {
    configurationSection: EXTENSION_CONSTANTS.APEX_LS_CONFIG_SECTION,
  },
  middleware: createHoverMiddleware(),
  initializationOptions,
  outputChannel: (() => {
    const channel = getWorkerServerOutputChannel();
    return channel ? createSafeOutputChannel(channel) : undefined;
  })(),
});

const createWebLanguageClient = async (
  context: vscode.ExtensionContext,
): Promise<ClientState> => {
  const [{ default: Worker }, { LanguageClient }] = await Promise.all([
    import('web-worker'),
    import('vscode-languageclient/browser'),
  ]);
  const initializationOptions = await createEnhancedInitializationOptions(
    context,
    'web',
    determineServerMode(context),
  );
  const options = createWebClientOptions(initializationOptions);
  const workerUri = vscode.Uri.joinPath(
    context.extensionUri,
    'dist',
    'server.web.js',
  );
  const rawClient = new LanguageClient(
    'apex-language-server',
    'Apex Language Server Extension (Worker/Server)',
    options,
    new Worker(workerUri.toString(), { type: 'classic' }),
  );
  return startConfiguredClient(rawClient, 'web', context);
};

const createDesktopLanguageClient = async (
  context: vscode.ExtensionContext,
): Promise<ClientState> => {
  const [serverConfig, { LanguageClient }] = await Promise.all([
    import('./server-config'),
    import('vscode-languageclient/lib/node/main'),
  ]);
  const serverMode = determineServerMode(context);
  const rawClient = new LanguageClient(
    'apexLanguageServer',
    'Apex Language Server Extension (Node.js)',
    serverConfig.createServerOptions(context, serverMode),
    serverConfig.createClientOptions(
      await createEnhancedInitializationOptions(context, 'desktop', serverMode),
    ),
  );
  const state = await startConfiguredClient(rawClient, 'desktop', context);
  logDesktopServerStartStatus(rawClient);
  return state;
};

export const createAndStartClient = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  if (clientState) return;
  setStartingFlag(true);
  updateApexServerStatusStarting();
  try {
    const environment = detectEnvironment();
    const candidateState =
      environment === 'web'
        ? await createWebLanguageClient(context)
        : await createDesktopLanguageClient(context);
    clientState = await completeClientStart(candidateState, {
      registerConfigurationListener: () =>
        registerConfigurationChangeListener(
          candidateState.core,
          candidateState.rawClient,
        ),
      initializeApexLib: () => initializeApexLib(candidateState.core, context),
      sendConfiguration: () => sendInitialConfiguration(candidateState.core),
      loadWorkspace: () =>
        runWorkspaceLoad(
          candidateState.core,
          candidateState.workspaceLoadScope!,
        ),
      shouldLoadWorkspace: getWorkspaceSettings().apex.loadWorkspace.enabled,
      markReady: () => {
        resetServerStartRetries();
        updateApexServerStatusReady();
      },
    });
  } catch (error) {
    clientState = undefined;
    updateApexServerStatusError();
    throw error;
  } finally {
    setStartingFlag(false);
  }
};

function enqueueLifecycleOperation(
  operation: () => Promise<void>,
): Promise<void> {
  const result = lifecycleQueue.then(operation, operation);
  lifecycleQueue = result.catch(() => undefined);
  return result;
}

export function startLanguageServer(
  context: vscode.ExtensionContext,
): Promise<void> {
  return enqueueLifecycleOperation(() => createAndStartClient(context));
}

export function restartLanguageServer(
  context: vscode.ExtensionContext,
): Promise<void> {
  return enqueueLifecycleOperation(async () => {
    await restartAfterStrictStop(
      () => stopLanguageServerNow(true),
      () => createAndStartClient(context),
    );
  });
}

export const restartAfterStrictStop = async (
  stop: () => Promise<void>,
  start: () => Promise<void>,
): Promise<void> => {
  await stop();
  await start();
};

async function stopLanguageServerNow(strict = false): Promise<void> {
  clearIngestionTimeout();
  const state = clientState;
  try {
    await disposeClientState(state, () => {
      clientState = undefined;
    });
  } catch (error) {
    logToOutputChannel(
      `⚠️ Error stopping language server: ${formattedError(error)}`,
      'warning',
    );
    if (strict) {
      throw error;
    }
  } finally {
    updateApexServerStatusStopped();
  }
}

export function stopLanguageServer(): Promise<void> {
  return enqueueLifecycleOperation(stopLanguageServerNow);
}

export function getClient(): ApexClientCore | undefined {
  return clientState?.core;
}

export function getLanguageClient(): BaseLanguageClient | undefined {
  return clientState?.rawClient;
}
