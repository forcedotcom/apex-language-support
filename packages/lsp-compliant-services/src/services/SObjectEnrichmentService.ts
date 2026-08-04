/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  FindMissingArtifactParams,
  IdentifierSpec,
  LoggerInterface,
  MissingArtifactPayload,
} from '@salesforce/apex-lsp-shared';
import {
  composeSObjectPlaceholderSymbolTable,
  composeSObjectSymbolTable,
  ownerUriForSObject,
  type ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
import {
  type BlockingResult,
  type MissingArtifactResolutionService,
} from './MissingArtifactResolutionService';
import { classifyMissingArtifactIdentifier } from './PrerequisiteHelpers';
import { getDiagnosticRefreshService } from './DiagnosticRefreshService';

export interface SObjectEnrichmentOptions {
  readonly isCoordinator?: () => boolean;
  readonly signalDiagnosticRefresh?: () => Promise<void>;
}

interface SObjectEnrichmentCoordinationState {
  readonly inFlightByIdentifier: Map<string, Promise<BlockingResult>>;
  readonly placeholderInFlight: Map<string, Promise<void>>;
  readonly latestVersionByName: Map<string, number>;
}

const coordinationStateBySymbolManager = new WeakMap<
  ISymbolManager,
  SObjectEnrichmentCoordinationState
>();

function coordinationStateFor(
  symbolManager: ISymbolManager,
): SObjectEnrichmentCoordinationState {
  const existing = coordinationStateBySymbolManager.get(symbolManager);
  if (existing) {
    return existing;
  }
  const created: SObjectEnrichmentCoordinationState = {
    inFlightByIdentifier: new Map(),
    placeholderInFlight: new Map(),
    latestVersionByName: new Map(),
  };
  coordinationStateBySymbolManager.set(symbolManager, created);
  return created;
}

function isMainThreadCoordinator(): boolean {
  try {
    return require('node:worker_threads').isMainThread;
  } catch {
    return true;
  }
}

function identifierKey(identifier: IdentifierSpec): string {
  return `${identifier.identifierType ?? 'apex-class'}:${identifier.name
    .trim()
    .toLowerCase()}`;
}

/**
 * Coordinator-owned bridge from typed missing-artifact results to native
 * sObject symbol tables.
 */
export class SObjectEnrichmentService {
  private readonly inFlightByIdentifier: Map<string, Promise<BlockingResult>>;
  private readonly placeholderInFlight: Map<string, Promise<void>>;
  private readonly latestVersionByName: Map<string, number>;
  private readonly isCoordinator: () => boolean;
  private readonly signalDiagnosticRefresh: () => Promise<void>;

  constructor(
    private readonly logger: LoggerInterface,
    private readonly symbolManager: ISymbolManager,
    private readonly artifactResolutionService: MissingArtifactResolutionService,
    options: SObjectEnrichmentOptions = {},
  ) {
    const coordinationState = coordinationStateFor(symbolManager);
    this.inFlightByIdentifier = coordinationState.inFlightByIdentifier;
    this.placeholderInFlight = coordinationState.placeholderInFlight;
    this.latestVersionByName = coordinationState.latestVersionByName;
    this.isCoordinator = options.isCoordinator ?? isMainThreadCoordinator;
    this.signalDiagnosticRefresh =
      options.signalDiagnosticRefresh ??
      (() =>
        Effect.runPromise(
          getDiagnosticRefreshService().signalEnrichmentComplete(),
        ));
  }

  async resolveBlocking(
    params: FindMissingArtifactParams,
  ): Promise<BlockingResult> {
    const normalizedParams = this.normalizeParams(params);
    const joined = new Set<Promise<BlockingResult>>();
    const fresh: IdentifierSpec[] = [];

    for (const identifier of normalizedParams.identifiers) {
      const existing = this.inFlightByIdentifier.get(identifierKey(identifier));
      if (existing) {
        joined.add(existing);
      } else {
        fresh.push(identifier);
      }
    }

    if (fresh.length > 0) {
      const freshParams: FindMissingArtifactParams = {
        ...normalizedParams,
        identifiers: fresh,
        mode: 'blocking',
      };
      const request = this.executeRequest(freshParams);
      for (const identifier of fresh) {
        this.inFlightByIdentifier.set(identifierKey(identifier), request);
      }
      joined.add(request);
      const cleanup = () => {
        for (const identifier of fresh) {
          const key = identifierKey(identifier);
          if (this.inFlightByIdentifier.get(key) === request) {
            this.inFlightByIdentifier.delete(key);
          }
        }
      };
      void request.then(cleanup, cleanup);
    }

    const outcome = mergeBlockingResults(await Promise.all(joined));
    if (
      this.isCoordinator() &&
      outcome.status === 'resolved' &&
      (outcome.artifacts?.length ?? 0) > 0
    ) {
      await Effect.runPromise(
        this.symbolManager.resolveCrossFileReferencesForFile(
          normalizedParams.origin.uri,
        ),
      );
    }
    return outcome;
  }

  /**
   * Install placeholders before returning, then continue resolution without
   * blocking the diagnostic/request path.
   */
  async resolveInBackground(params: FindMissingArtifactParams): Promise<void> {
    const normalizedParams = this.normalizeParams(params);
    const sObjects = normalizedParams.identifiers.filter(
      (identifier) => identifier.identifierType === 'sobject',
    );
    const apexArtifacts = normalizedParams.identifiers.filter(
      (identifier) => identifier.identifierType !== 'sobject',
    );

    if (apexArtifacts.length > 0) {
      await this.artifactResolutionService.resolveInBackground({
        ...normalizedParams,
        identifiers: apexArtifacts,
        mode: 'background',
      });
    }
    if (sObjects.length === 0) {
      return;
    }

    await this.ensurePlaceholders(sObjects);
    void this.resolveBlocking({
      ...normalizedParams,
      identifiers: sObjects,
      mode: 'blocking',
    })
      .then(async (outcome) => {
        if (
          outcome.status === 'resolved' &&
          (outcome.artifacts?.length ?? 0) > 0
        ) {
          await this.signalDiagnosticRefresh();
        }
      })
      .catch((error: unknown) => {
        this.logger.debug(
          () => `Background sObject enrichment failed: ${error}`,
        );
      });
  }

  /**
   * Apply versioned artifact payloads. Exposed for coordinator ingestion and
   * deterministic stale-version tests.
   */
  async applyArtifacts(
    artifacts: readonly MissingArtifactPayload[],
    versions: ReadonlyMap<string, number>,
  ): Promise<number> {
    if (!this.isCoordinator()) {
      this.logger.debug(
        () => 'Skipping sObject graph mutation outside the coordinator',
      );
      return 0;
    }

    let applied = 0;
    for (const artifact of artifacts) {
      const normalizedName = artifact.name.trim().toLowerCase();
      const version = versions.get(normalizedName);
      if (version === undefined) {
        continue;
      }
      const latest = this.latestVersionByName.get(normalizedName) ?? 0;
      if (version < latest) {
        continue;
      }
      this.latestVersionByName.set(normalizedName, version);
      const table = composeSObjectSymbolTable(artifact.describe, version);
      await Effect.runPromise(
        this.symbolManager.addSymbolTable(
          table,
          ownerUriForSObject(artifact.name),
          version,
          false,
        ),
      );
      applied++;
    }
    return applied;
  }

  private async executeRequest(
    params: FindMissingArtifactParams,
  ): Promise<BlockingResult> {
    await this.ensurePlaceholders(params.identifiers);
    const versions = this.reserveArtifactVersions(params.identifiers);
    const outcome =
      await this.artifactResolutionService.resolveBlocking(params);
    if (outcome.status === 'resolved' && outcome.artifacts) {
      await this.applyArtifacts(outcome.artifacts, versions);
    }
    return outcome;
  }

  private normalizeParams(
    params: FindMissingArtifactParams,
  ): FindMissingArtifactParams {
    const byKey = new Map<string, IdentifierSpec>();
    for (const identifier of params.identifiers) {
      const normalized: IdentifierSpec = {
        ...identifier,
        identifierType:
          identifier.identifierType ??
          classifyMissingArtifactIdentifier(identifier),
      };
      byKey.set(identifierKey(normalized), normalized);
    }
    return {
      ...params,
      identifiers: Array.from(byKey.values()),
    };
  }

  private async ensurePlaceholders(
    identifiers: readonly IdentifierSpec[],
  ): Promise<void> {
    if (!this.isCoordinator()) {
      return;
    }
    await Promise.all(
      identifiers
        .filter((identifier) => identifier.identifierType === 'sobject')
        .map((identifier) => this.ensurePlaceholder(identifier.name)),
    );
  }

  private ensurePlaceholder(name: string): Promise<void> {
    const normalizedName = name.trim().toLowerCase();
    const existingRequest = this.placeholderInFlight.get(normalizedName);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      const ownerUri = ownerUriForSObject(name);
      const existing = await this.symbolManager.getSymbolTableForFile(ownerUri);
      const existingVersion = existing?.getMetadata().documentVersion ?? 0;
      const currentVersion = Math.max(
        this.latestVersionByName.get(normalizedName) ?? 0,
        existingVersion,
      );
      this.latestVersionByName.set(normalizedName, currentVersion);

      if (existing) {
        return;
      }

      const placeholderVersion = currentVersion + 1;
      this.latestVersionByName.set(normalizedName, placeholderVersion);
      const placeholder = composeSObjectPlaceholderSymbolTable(
        name,
        placeholderVersion,
      );
      await Effect.runPromise(
        this.symbolManager.addSymbolTable(
          placeholder,
          ownerUri,
          placeholderVersion,
          false,
        ),
      );
    })();
    this.placeholderInFlight.set(normalizedName, request);
    return request.finally(() => {
      if (this.placeholderInFlight.get(normalizedName) === request) {
        this.placeholderInFlight.delete(normalizedName);
      }
    });
  }

  private reserveArtifactVersions(
    identifiers: readonly IdentifierSpec[],
  ): ReadonlyMap<string, number> {
    const versions = new Map<string, number>();
    for (const identifier of identifiers) {
      if (identifier.identifierType !== 'sobject') {
        continue;
      }
      const normalizedName = identifier.name.trim().toLowerCase();
      const nextVersion =
        (this.latestVersionByName.get(normalizedName) ?? 0) + 1;
      this.latestVersionByName.set(normalizedName, nextVersion);
      versions.set(normalizedName, nextVersion);
    }
    return versions;
  }
}

function mergeBlockingResults(
  results: readonly BlockingResult[],
): BlockingResult {
  const artifacts = new Map<string, MissingArtifactPayload>();
  const opened = new Set<string>();
  for (const result of results) {
    if (result.status !== 'resolved') {
      continue;
    }
    result.artifacts?.forEach((artifact) =>
      artifacts.set(artifact.name.trim().toLowerCase(), artifact),
    );
    result.opened?.forEach((uri) => opened.add(uri));
  }
  if (artifacts.size > 0 || opened.size > 0) {
    return {
      status: 'resolved',
      ...(artifacts.size > 0 && {
        artifacts: Array.from(artifacts.values()),
      }),
      ...(opened.size > 0 && { opened: Array.from(opened) }),
    };
  }
  if (results.some((result) => result.status === 'timeout')) {
    return { status: 'timeout' };
  }
  if (results.some((result) => result.status === 'unsupported')) {
    return { status: 'unsupported' };
  }
  if (results.some((result) => result.status === 'cancelled')) {
    return { status: 'cancelled' };
  }
  return { status: 'not-found' };
}
