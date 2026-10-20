/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  workspaceIdentifierKey,
  type FindMissingArtifactParams,
  type FindMissingArtifactResult,
  type MissingArtifactIdentifierType,
  type MissingArtifactPayload,
  type SObjectDescribe,
  type WireIdentifierSpec,
} from '@salesforce/apex-lsp-shared';

export type OrgArtifactRequest =
  | {
      readonly kind: 'sobject';
      readonly name: string;
      readonly generation?: number;
    }
  | {
      readonly kind: 'apex-class';
      readonly name: string;
      readonly generation?: number;
    }
  | {
      readonly kind: 'trigger';
      readonly name: string;
      readonly generation?: number;
    };

export type OrgArtifactSearchResult =
  | {
      readonly kind: 'sobject-describe';
      readonly name: string;
      readonly describe: unknown;
    }
  | {
      readonly kind: 'apex-source' | 'trigger-source';
      readonly id: string;
      readonly name: string;
      readonly namespace?: string;
      readonly source: string;
    }
  | {
      readonly kind: 'not-found';
      readonly artifactKind: MissingArtifactIdentifierType;
      readonly name: string;
    }
  | {
      readonly kind: 'unavailable';
      readonly artifactKind: MissingArtifactIdentifierType;
      readonly name: string;
      readonly reason:
        | 'services-extension-unavailable'
        | 'no-active-org'
        | 'authorization-failed'
        | 'protected-source'
        | 'request-failed';
      readonly message?: string;
    };

export type WorkspaceArtifactResolution =
  | { readonly kind: 'sobject'; readonly artifact: MissingArtifactPayload }
  | { readonly kind: 'source'; readonly uri: string };

export type SObjectAdaptationResult =
  | { readonly status: 'ok'; readonly describe: SObjectDescribe }
  | { readonly status: 'too-large' | 'invalid' | 'stale' };

export interface OrgArtifactResolverProvider {
  readonly isAvailable: () => boolean;
  readonly resolveWorkspace: (
    identifiers: readonly WireIdentifierSpec[],
  ) => Promise<ReadonlyMap<string, WorkspaceArtifactResolution>>;
  readonly searchOrg: (
    request: OrgArtifactRequest,
  ) => Promise<OrgArtifactSearchResult>;
  readonly adaptSObject: (
    describe: unknown,
    generation: number,
  ) => SObjectAdaptationResult;
  readonly materializeSource: (
    input: {
      readonly kind: 'apex-class' | 'trigger';
      readonly name: string;
      readonly namespace?: string;
      readonly source: string;
    },
    generation: number,
  ) => string | undefined;
  readonly openDocument: (
    uri: string,
    mode: FindMissingArtifactParams['mode'],
  ) => Promise<boolean>;
  readonly generation: () => number;
  readonly sameDocument?: (left: string, right: string) => boolean;
  readonly onUnavailable?: (
    identifiers: readonly WireIdentifierSpec[],
    mode: FindMissingArtifactParams['mode'],
  ) => Promise<void>;
  readonly onError?: (error: unknown) => void;
  readonly onOrgResult?: (
    request: OrgArtifactRequest,
    result: OrgArtifactSearchResult,
    outcome:
      | 'resolved'
      | 'too-large'
      | 'invalid'
      | 'stale'
      | 'open-failed'
      | 'not-found'
      | string,
    details: {
      readonly durationMs: number;
      readonly serializedBytes?: number;
      readonly fieldCount?: number;
    },
  ) => void;
}

export async function resolveMissingArtifacts(
  params: FindMissingArtifactParams,
  provider: OrgArtifactResolverProvider,
): Promise<FindMissingArtifactResult> {
  const identifiers = dedupeByTypedIdentifier(params.identifiers);
  if (identifiers.length === 0 || !provider.isAvailable()) {
    if (identifiers.length > 0) {
      await provider.onUnavailable?.(identifiers, params.mode);
    }
    return { notFound: true };
  }

  try {
    const workspace = await resolveFromWorkspace(params, identifiers, provider);
    const org = await resolveFromOrg(
      workspace.unresolved,
      params.mode,
      provider,
    );
    const opened = Array.from(new Set([...workspace.opened, ...org.opened]));
    const artifacts = [...workspace.artifacts, ...org.artifacts];
    if (artifacts.length > 0)
      return { artifacts, ...(opened.length > 0 && { opened }) };
    return opened.length > 0 ? { opened } : { notFound: true };
  } catch (error) {
    provider.onError?.(error);
    return { notFound: true };
  }
}

function dedupeByTypedIdentifier(
  specs: readonly WireIdentifierSpec[],
): WireIdentifierSpec[] {
  const byName = new Map<string, WireIdentifierSpec>();
  for (const spec of specs) {
    const key = workspaceIdentifierKey(spec);
    const existing = byName.get(key);
    const hasHints = Boolean(
      spec.searchHints?.length ||
      spec.typeReference ||
      spec.resolvedQualifier ||
      spec.parentContext,
    );
    const existingHasHints = Boolean(
      existing?.searchHints?.length ||
      existing?.typeReference ||
      existing?.resolvedQualifier ||
      existing?.parentContext,
    );
    if (!existing || (hasHints && !existingHasHints)) byName.set(key, spec);
  }
  return Array.from(byName.values());
}

async function resolveFromWorkspace(
  params: FindMissingArtifactParams,
  identifiers: readonly WireIdentifierSpec[],
  provider: OrgArtifactResolverProvider,
): Promise<{
  readonly opened: string[];
  readonly artifacts: MissingArtifactPayload[];
  readonly unresolved: WireIdentifierSpec[];
}> {
  let resolutions: ReadonlyMap<string, WorkspaceArtifactResolution> = new Map();
  try {
    resolutions = await provider.resolveWorkspace(identifiers);
  } catch (error) {
    provider.onError?.(error);
  }

  const opened = new Set<string>();
  const artifacts: MissingArtifactPayload[] = [];
  const unresolved: WireIdentifierSpec[] = [];
  for (const identifier of identifiers) {
    const resolution = resolutions.get(workspaceIdentifierKey(identifier));
    if (resolution?.kind === 'sobject') {
      artifacts.push(resolution.artifact);
      continue;
    }
    if (resolution?.kind === 'source' && opened.has(resolution.uri)) {
      continue;
    }
    if (
      resolution?.kind !== 'source' ||
      (params.origin &&
        provider.sameDocument?.(resolution.uri, params.origin.uri)) ||
      !(await provider.openDocument(resolution.uri, params.mode))
    ) {
      unresolved.push(identifier);
      continue;
    }
    opened.add(resolution.uri);
  }
  return { opened: Array.from(opened), artifacts, unresolved };
}

async function resolveFromOrg(
  identifiers: readonly WireIdentifierSpec[],
  mode: FindMissingArtifactParams['mode'],
  provider: OrgArtifactResolverProvider,
): Promise<{
  readonly artifacts: MissingArtifactPayload[];
  readonly opened: string[];
}> {
  const artifacts: MissingArtifactPayload[] = [];
  const opened: string[] = [];
  const results = await Promise.allSettled(
    identifiers.map(async (identifier) => {
      const generation = provider.generation();
      const request: OrgArtifactRequest = {
        kind: identifierType(identifier),
        name: identifier.name,
        generation,
      };
      return {
        generation,
        request,
        startedAt: Date.now(),
        result: await provider.searchOrg(request),
      };
    }),
  );
  for (const settled of results) {
    if (settled.status === 'rejected') {
      provider.onError?.(settled.reason);
      continue;
    }
    const { generation, request, startedAt, result } = settled.value;
    if (result.kind === 'sobject-describe') {
      const adapted = provider.adaptSObject(result.describe, generation);
      if (adapted.status === 'ok') {
        artifacts.push({
          identifierType: 'sobject',
          name: adapted.describe.name,
          describe: adapted.describe,
        });
      }
      provider.onOrgResult?.(
        request,
        result,
        adapted.status === 'ok' ? 'resolved' : adapted.status,
        {
          durationMs: Date.now() - startedAt,
          ...(adapted.status === 'ok' && {
            fieldCount: adapted.describe.fields.length,
            serializedBytes: utf8Size(JSON.stringify(adapted.describe)),
          }),
        },
      );
      continue;
    }
    if (result.kind !== 'apex-source' && result.kind !== 'trigger-source') {
      provider.onOrgResult?.(
        request,
        result,
        result.kind === 'unavailable' ? result.reason : result.kind,
        {
          durationMs: Date.now() - startedAt,
        },
      );
      continue;
    }
    const uri = provider.materializeSource(
      {
        kind: result.kind === 'apex-source' ? 'apex-class' : 'trigger',
        name: result.name,
        namespace: result.namespace,
        source: result.source,
      },
      generation,
    );
    const openedDocument = uri && (await provider.openDocument(uri, mode));
    if (openedDocument) opened.push(uri);
    provider.onOrgResult?.(
      request,
      result,
      uri ? (openedDocument ? 'resolved' : 'open-failed') : 'stale',
      {
        durationMs: Date.now() - startedAt,
        serializedBytes: utf8Size(result.source),
      },
    );
  }
  return { artifacts, opened };
}

function identifierType(
  identifier: WireIdentifierSpec,
): MissingArtifactIdentifierType {
  return identifier.identifierType ?? 'apex-class';
}

function utf8Size(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
