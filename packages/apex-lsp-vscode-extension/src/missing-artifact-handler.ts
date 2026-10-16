/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as vscode from 'vscode';
import {
  resolveMissingArtifacts,
  type OrgArtifactResolverProvider,
} from '@salesforce/apex-lsp-client';
import {
  type FindMissingArtifactParams,
  type FindMissingArtifactResult,
  formattedError,
} from '@salesforce/apex-lsp-shared';
import * as Effect from 'effect/Effect';
import { logToOutputChannel } from './logging';
import { OrgArtifactAdapter } from './services/org-artifact-adapter';
import {
  getOrgArtifactFileSystem,
  type OrgArtifactFileSystem,
} from './services/org-artifact-fs';
import { OrgSObjectAdapter } from './sobjects/org-sobject-adapter';
import { WorkspaceComponentSetAdapter } from './services/workspace-component-set-adapter';
import { emitTelemetrySpan } from './observability/extensionTracing';
import {
  isSalesforceServicesAvailable,
  SALESFORCE_SERVICES_EXTENSION_ID,
} from './services/salesforce-services-extension';

const SHOW_SALESFORCE_SERVICES = 'Show Salesforce Services';
let servicesUnavailableNotice: Promise<void> | undefined;

export interface MissingArtifactHandlerDependencies {
  readonly orgAdapter: Pick<OrgArtifactAdapter, 'search'>;
  readonly sObjectAdapter: Pick<OrgSObjectAdapter, 'adapt'>;
  readonly fileSystem: Pick<
    OrgArtifactFileSystem,
    'generation' | 'materializeSource'
  >;
  readonly workspaceComponentAdapter: Pick<
    WorkspaceComponentSetAdapter,
    'resolve'
  >;
  readonly servicesAvailability: {
    readonly isAvailable: () => boolean;
    readonly notifyUnavailable: (
      artifactNames: readonly string[],
    ) => Promise<void>;
  };
  readonly recordTelemetry?: (event: Record<string, unknown>) => void;
}

let defaultDependencies: MissingArtifactHandlerDependencies | undefined;

export async function handleFindMissingArtifact(
  params: FindMissingArtifactParams,
  _context: vscode.ExtensionContext,
  dependencies: MissingArtifactHandlerDependencies = createDefaultDependencies(),
): Promise<FindMissingArtifactResult> {
  const names = params.identifiers.map(({ name }) => name).join(', ');
  logToOutputChannel(
    `🔍 Handling missing artifact request for: ${names}`,
    'debug',
  );
  return resolveMissingArtifacts(params, createResolverProvider(dependencies));
}

function createDefaultDependencies(): MissingArtifactHandlerDependencies {
  if (defaultDependencies) return defaultDependencies;
  const fileSystem = getOrgArtifactFileSystem();
  defaultDependencies = {
    orgAdapter: new OrgArtifactAdapter(),
    sObjectAdapter: new OrgSObjectAdapter(fileSystem),
    fileSystem,
    workspaceComponentAdapter: new WorkspaceComponentSetAdapter(),
    servicesAvailability: {
      isAvailable: isSalesforceServicesAvailable,
      notifyUnavailable: notifySalesforceServicesUnavailable,
    },
    recordTelemetry: emitTelemetrySpan,
  };
  return defaultDependencies;
}

function createResolverProvider(
  dependencies: MissingArtifactHandlerDependencies,
): OrgArtifactResolverProvider {
  return {
    isAvailable: dependencies.servicesAvailability.isAvailable,
    resolveWorkspace: async (identifiers) => {
      const resolutions =
        await dependencies.workspaceComponentAdapter.resolve(identifiers);
      return new Map(
        Array.from(resolutions, ([key, resolution]) => [
          key,
          resolution.kind === 'source'
            ? { kind: 'source' as const, uri: resolution.uri.toString() }
            : resolution,
        ]),
      );
    },
    searchOrg: (request) =>
      Effect.runPromise(dependencies.orgAdapter.search(request)),
    adaptSObject: (describe, generation) =>
      dependencies.sObjectAdapter.adapt(describe, generation),
    materializeSource: (input, generation) =>
      dependencies.fileSystem.materializeSource(input, generation)?.toString(),
    openDocument: (uri, mode) => openDocument(vscode.Uri.parse(uri), mode),
    generation: () => dependencies.fileSystem.generation,
    sameDocument: (left, right) => {
      try {
        return vscode.Uri.parse(left).path === vscode.Uri.parse(right).path;
      } catch {
        return false;
      }
    },
    onUnavailable: async (identifiers, mode) => {
      const artifactNames = identifiers.map(({ name }) => name);
      dependencies.recordTelemetry?.({
        type: 'org_artifact_resolution',
        outcome: 'services-extension-unavailable',
        artifactCount: artifactNames.length,
        identifierTypes: Array.from(
          new Set(
            identifiers.map(
              (identifier) => identifier.identifierType ?? 'apex-class',
            ),
          ),
        ).join(','),
      });
      if (mode === 'blocking') {
        await dependencies.servicesAvailability.notifyUnavailable(
          artifactNames,
        );
      }
    },
    onError: (error) =>
      logToOutputChannel(
        `❌ Error resolving artifact: ${formattedError(error)}`,
        'error',
      ),
    onOrgResult: (request, result, outcome, details) => {
      dependencies.recordTelemetry?.({
        type: 'org_artifact_resolution',
        identifierType: request.kind,
        outcome,
        ...details,
        ...(request.kind === 'sobject' && {
          placeholderLifetimeMs: details.durationMs,
        }),
        ...servicesCacheHit(result),
      });
    },
  };
}

function servicesCacheHit(result: unknown): {
  readonly servicesCacheHit?: boolean;
} {
  if (
    typeof result === 'object' &&
    result !== null &&
    'servicesCacheHit' in result &&
    typeof result.servicesCacheHit === 'boolean'
  ) {
    return { servicesCacheHit: result.servicesCacheHit };
  }
  return {};
}

async function notifySalesforceServicesUnavailable(
  artifactNames: readonly string[],
): Promise<void> {
  if (!servicesUnavailableNotice) {
    servicesUnavailableNotice = Promise.resolve(
      vscode.window.showWarningMessage(
        `Salesforce Services is required to resolve ${artifactNames.join(', ')}. ` +
          'Install or enable the Salesforce Services extension and try again.',
        SHOW_SALESFORCE_SERVICES,
      ),
    )
      .then(async (selection) => {
        if (selection === SHOW_SALESFORCE_SERVICES) {
          await vscode.commands.executeCommand(
            'workbench.extensions.search',
            `@id:${SALESFORCE_SERVICES_EXTENSION_ID}`,
          );
        }
      })
      .finally(() => {
        servicesUnavailableNotice = undefined;
      });
  }
  await servicesUnavailableNotice;
}

async function openDocument(
  uri: vscode.Uri,
  mode: FindMissingArtifactParams['mode'],
): Promise<boolean> {
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    if (mode === 'blocking') {
      await vscode.window.showTextDocument(document, { preview: false });
    }
    logToOutputChannel(`✅ Opened file: ${uri.toString()}`, 'debug');
    return true;
  } catch (error) {
    logToOutputChannel(
      `❌ Failed to open file ${uri.toString()}: ${formattedError(error)}`,
      'error',
    );
    return false;
  }
}
