/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as vscode from 'vscode';
import { logToOutputChannel } from './logging';
import {
  FindMissingArtifactParams,
  FindMissingArtifactResult,
  MissingArtifactPayload,
  WireIdentifierSpec,
  formattedError,
} from '@salesforce/apex-lsp-shared';
import * as Effect from 'effect/Effect';
import {
  OrgArtifactAdapter,
  type OrgArtifactRequest,
  type OrgArtifactSearchResult,
} from './services/org-artifact-adapter';
import {
  getOrgArtifactFileSystem,
  type OrgArtifactFileSystem,
} from './services/org-artifact-fs';
import { OrgSObjectAdapter } from './sobjects/org-sobject-adapter';
import {
  WorkspaceComponentSetAdapter,
  workspaceIdentifierKey,
  type WorkspaceComponentResolution,
} from './services/workspace-component-set-adapter';
import { emitTelemetrySpan } from './observability/extensionTracing';
import {
  isSalesforceServicesAvailable,
  SALESFORCE_SERVICES_EXTENSION_ID,
} from './services/salesforce-services-extension';

const SHOW_SALESFORCE_SERVICES = 'Show Salesforce Services';
let servicesUnavailableNotice: Promise<void> | undefined;

export async function handleFindMissingArtifact(
  params: FindMissingArtifactParams,
  _context: vscode.ExtensionContext,
  dependencies: MissingArtifactHandlerDependencies = createDefaultDependencies(),
): Promise<FindMissingArtifactResult> {
  const identifiers = dedupeByTypedIdentifier(params.identifiers);
  const names = identifiers.map((s) => s.name).join(', ');
  logToOutputChannel(
    `🔍 Handling missing artifact request for: ${names}`,
    'debug',
  );

  if (identifiers.length === 0) {
    return { notFound: true };
  }

  const servicesIdentifiers = identifiers.filter(requiresSalesforceServices);
  if (
    servicesIdentifiers.length > 0 &&
    !dependencies.servicesAvailability.isAvailable()
  ) {
    const unavailableNames = servicesIdentifiers.map(({ name }) => name);
    logToOutputChannel(
      `⚠️ Salesforce Services is unavailable; cannot resolve: ${unavailableNames.join(', ')}`,
      'warning',
    );
    dependencies.recordTelemetry?.({
      type: 'org_artifact_resolution',
      outcome: 'services-extension-unavailable',
      artifactCount: servicesIdentifiers.length,
      identifierTypes: Array.from(
        new Set(servicesIdentifiers.map(identifierType)),
      ).join(','),
    });
    if (params.mode === 'blocking') {
      await dependencies.servicesAvailability.notifyUnavailable(
        unavailableNames,
      );
    }
    return { notFound: true };
  }

  try {
    const workspace = await resolveFromWorkspace(
      params,
      identifiers,
      dependencies,
    );
    const org = await resolveFromOrg(
      workspace.unresolved,
      params.mode,
      dependencies,
    );
    const opened = Array.from(new Set([...workspace.opened, ...org.opened]));
    const artifacts = [...workspace.artifacts, ...org.artifacts];
    if (artifacts.length > 0) {
      return {
        artifacts,
        ...(opened.length > 0 && { opened }),
      };
    }
    if (opened.length > 0) {
      return { opened };
    }
    logToOutputChannel(`❌ Could not find artifact: ${names}`, 'debug');
    return { notFound: true };
  } catch (error) {
    logToOutputChannel(
      `❌ Error resolving artifact ${names}: ${formattedError(error)}`,
      'error',
    );
    return { notFound: true };
  }
}

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

function createDefaultDependencies(): MissingArtifactHandlerDependencies {
  if (defaultDependencies) {
    return defaultDependencies;
  }
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

/** Dedupe by normalized type/name; prefer specs carrying resolution hints. */
function dedupeByTypedIdentifier(
  specs: WireIdentifierSpec[],
): WireIdentifierSpec[] {
  const byName = new Map<string, WireIdentifierSpec>();
  for (const spec of specs) {
    const key = `${identifierType(spec)}:${spec.name.trim().toLowerCase()}`;
    const existing = byName.get(key);
    const hasHints =
      spec.searchHints?.length ||
      spec.typeReference ||
      spec.resolvedQualifier ||
      spec.parentContext;
    const existingHasHints =
      existing?.searchHints?.length ||
      existing?.typeReference ||
      existing?.resolvedQualifier ||
      existing?.parentContext;
    if (!existing || (hasHints && !existingHasHints)) {
      byName.set(key, spec);
    }
  }
  return Array.from(byName.values());
}

interface WorkspaceResolution {
  readonly opened: string[];
  readonly artifacts: MissingArtifactPayload[];
  readonly unresolved: WireIdentifierSpec[];
}

async function resolveFromWorkspace(
  params: FindMissingArtifactParams,
  identifiers: readonly WireIdentifierSpec[],
  dependencies: MissingArtifactHandlerDependencies,
): Promise<WorkspaceResolution> {
  const { mode } = params;

  if (identifiers.length === 0) {
    return { opened: [], artifacts: [], unresolved: [] };
  }

  let componentResolutions: ReadonlyMap<string, WorkspaceComponentResolution> =
    new Map();
  try {
    componentResolutions =
      await dependencies.workspaceComponentAdapter.resolve(identifiers);
  } catch (error) {
    logToOutputChannel(
      `⚠️ Workspace ComponentSet lookup failed: ${formattedError(error)}`,
      'debug',
    );
  }

  const opened = new Set<string>();
  const originPath = uriPath(params.origin?.uri);
  const artifacts: MissingArtifactPayload[] = [];
  const unresolved: WireIdentifierSpec[] = [];
  for (const spec of identifiers) {
    const resolution = componentResolutions.get(workspaceIdentifierKey(spec));
    if (resolution?.kind === 'sobject') {
      artifacts.push(resolution.artifact);
      continue;
    }
    if (resolution?.kind !== 'source') {
      unresolved.push(spec);
      continue;
    }
    if (originPath && resolution.uri.path === originPath) {
      unresolved.push(spec);
      continue;
    }

    if (opened.has(resolution.uri.toString())) {
      continue;
    }
    const openedForSpec = await openFiles([resolution.uri], mode);
    if (openedForSpec.length === 0) {
      unresolved.push(spec);
      continue;
    }
    openedForSpec.forEach((uri) => opened.add(uri));
  }

  return { opened: Array.from(opened), artifacts, unresolved };
}

function uriPath(uri: string | undefined): string | undefined {
  if (!uri) return undefined;
  try {
    return vscode.Uri.parse(uri).path;
  } catch {
    return undefined;
  }
}

async function resolveFromOrg(
  identifiers: readonly WireIdentifierSpec[],
  mode: 'blocking' | 'background',
  dependencies: MissingArtifactHandlerDependencies,
): Promise<{
  readonly artifacts: MissingArtifactPayload[];
  readonly opened: string[];
}> {
  const artifacts: MissingArtifactPayload[] = [];
  const opened: string[] = [];
  for (const identifier of identifiers) {
    const startedAt = Date.now();
    const generation = dependencies.fileSystem.generation;
    const request: OrgArtifactRequest = {
      kind: identifierType(identifier),
      name: identifier.name,
      generation,
    };
    const result = await Effect.runPromise(
      dependencies.orgAdapter.search(request),
    );
    if (result.kind === 'sobject-describe') {
      const adapted = dependencies.sObjectAdapter.adapt(
        result.describe,
        generation,
      );
      if (adapted.status === 'ok') {
        artifacts.push({
          identifierType: 'sobject',
          name: adapted.describe.name,
          describe: adapted.describe,
        });
      }
      recordOrgArtifactTelemetry(dependencies, {
        identifierType: request.kind,
        outcome: adapted.status === 'ok' ? 'resolved' : adapted.status,
        durationMs: Date.now() - startedAt,
        placeholderLifetimeMs: Date.now() - startedAt,
        ...(adapted.status === 'ok' && {
          fieldCount: adapted.describe.fields.length,
          serializedBytes: utf8Size(JSON.stringify(adapted.describe)),
        }),
        ...servicesCacheHit(result),
      });
      continue;
    }
    if (result.kind !== 'apex-source' && result.kind !== 'trigger-source') {
      recordOrgArtifactTelemetry(dependencies, {
        identifierType: request.kind,
        outcome: result.kind === 'unavailable' ? result.reason : result.kind,
        durationMs: Date.now() - startedAt,
        ...servicesCacheHit(result),
      });
      continue;
    }
    const uri = dependencies.fileSystem.materializeSource(
      {
        kind: result.kind === 'apex-source' ? 'apex-class' : 'trigger',
        name: result.name,
        namespace: result.namespace,
        source: result.source,
      },
      generation,
    );
    if (!uri) {
      recordOrgArtifactTelemetry(dependencies, {
        identifierType: request.kind,
        outcome: 'stale',
        durationMs: Date.now() - startedAt,
        serializedBytes: utf8Size(result.source),
        ...servicesCacheHit(result),
      });
      continue;
    }
    const openedFiles = await openFiles([uri], mode);
    opened.push(...openedFiles);
    recordOrgArtifactTelemetry(dependencies, {
      identifierType: request.kind,
      outcome: openedFiles.length > 0 ? 'resolved' : 'open-failed',
      durationMs: Date.now() - startedAt,
      serializedBytes: utf8Size(result.source),
      ...servicesCacheHit(result),
    });
  }
  return { artifacts, opened };
}

function recordOrgArtifactTelemetry(
  dependencies: MissingArtifactHandlerDependencies,
  attributes: Record<string, unknown>,
): void {
  dependencies.recordTelemetry?.({
    type: 'org_artifact_resolution',
    ...attributes,
  });
}

function servicesCacheHit(result: OrgArtifactSearchResult): {
  readonly servicesCacheHit?: boolean;
} {
  const candidate = result as OrgArtifactSearchResult & {
    readonly servicesCacheHit?: unknown;
  };
  return typeof candidate.servicesCacheHit === 'boolean'
    ? { servicesCacheHit: candidate.servicesCacheHit }
    : {};
}

function utf8Size(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function identifierType(spec: WireIdentifierSpec): OrgArtifactRequest['kind'] {
  return spec.identifierType ?? 'apex-class';
}

function requiresSalesforceServices(spec: WireIdentifierSpec): boolean {
  switch (identifierType(spec)) {
    case 'sobject':
    case 'apex-class':
    case 'trigger':
      return true;
  }
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

async function openFiles(
  files: vscode.Uri[],
  mode: 'blocking' | 'background',
): Promise<string[]> {
  const openedFiles: string[] = [];

  for (const file of files) {
    try {
      const doc = await vscode.workspace.openTextDocument(file);

      if (mode === 'blocking') {
        await vscode.window.showTextDocument(doc, { preview: false });
      }

      openedFiles.push(file.toString());
      logToOutputChannel(`✅ Opened file: ${file.toString()}`, 'debug');
    } catch (error) {
      logToOutputChannel(
        `❌ Failed to open file ${file.toString()}: ${formattedError(error)}`,
        'error',
      );
    }
  }

  return openedFiles;
}
