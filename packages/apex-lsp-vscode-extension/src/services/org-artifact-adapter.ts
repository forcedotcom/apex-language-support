/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { SalesforceVSCodeServicesApi } from '@salesforce/vscode-services';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as Stream from 'effect/Stream';
import { getSalesforceServicesExtension } from './salesforce-services-extension';

export const MAX_CONCURRENT_ORG_ARTIFACT_SEARCHES = 4;
export const ORG_ARTIFACT_NOT_FOUND_TTL_MS = 3_000;

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
      readonly kind: 'apex-source';
      readonly id: string;
      readonly name: string;
      readonly namespace?: string;
      readonly source: string;
    }
  | {
      readonly kind: 'trigger-source';
      readonly id: string;
      readonly name: string;
      readonly namespace?: string;
      readonly source: string;
    }
  | {
      readonly kind: 'not-found';
      readonly artifactKind: OrgArtifactRequest['kind'];
      readonly name: string;
    }
  | {
      readonly kind: 'unavailable';
      readonly artifactKind: OrgArtifactRequest['kind'];
      readonly name: string;
      readonly reason:
        | 'services-extension-unavailable'
        | 'no-active-org'
        | 'authorization-failed'
        | 'protected-source'
        | 'request-failed';
      readonly message?: string;
    };

interface ToolingQueryResult<T> {
  readonly records: readonly T[];
}

interface ToolingConnection {
  readonly tooling: {
    readonly query: <T>(query: string) => Promise<ToolingQueryResult<T>>;
  };
}

interface SourceRecord {
  readonly Id: string;
  readonly Name: string;
  readonly NamespacePrefix?: string | null;
  readonly Body?: string | null;
}

/**
 * The deliberately narrow subset of the services API used by this adapter.
 * Keeping this local contract small makes the later sf-org-data migration a
 * provider swap rather than a search-result rewrite.
 */
export interface OrgArtifactServicesApi {
  readonly services: {
    readonly prebuiltServicesDependencies: Context.Context<unknown>;
    readonly MetadataDescribeService: {
      readonly describeCustomObject: (
        name: string,
      ) => Effect.Effect<unknown, unknown, unknown>;
    };
    readonly ComponentSetService: {
      readonly getComponentSetFromProjectDirectories: (options?: {
        readonly metadataMembers?: readonly {
          readonly type: string;
          readonly fullName: string;
        }[];
      }) => Effect.Effect<unknown, unknown, unknown>;
    };
    readonly ConnectionService: {
      readonly getConnection: () => Effect.Effect<
        ToolingConnection,
        unknown,
        unknown
      >;
    };
    readonly TargetOrgRef?: () => Effect.Effect<
      { readonly changes: Stream.Stream<unknown, unknown> },
      unknown,
      unknown
    >;
  };
}

export interface ServicesApiProvider {
  readonly getServicesApi: () => Effect.Effect<OrgArtifactServicesApi, unknown>;
}

/**
 * Compile-time seam against the published services API type.
 *
 * The published package intentionally exposes many more services; the adapter
 * narrows it immediately to the two stable search services it consumes.
 */
export function narrowServicesApi(
  api: SalesforceVSCodeServicesApi,
): OrgArtifactServicesApi {
  return api as unknown as OrgArtifactServicesApi;
}

export const vscodeServicesApiProvider: ServicesApiProvider = {
  getServicesApi: () =>
    Effect.gen(function* () {
      const extension = yield* Effect.sync(() =>
        getSalesforceServicesExtension(),
      );
      if (!extension) {
        return yield* Effect.fail(
          new Error('Salesforce services extension is not installed'),
        );
      }
      const api = extension.isActive
        ? extension.exports
        : yield* Effect.tryPromise(() => extension.activate());
      return narrowServicesApi(api);
    }),
};

export class OrgArtifactAdapter {
  private readonly inFlight = new Map<
    string,
    Promise<OrgArtifactSearchResult>
  >();
  private readonly notFoundUntil = new Map<string, number>();
  private readonly limiter: AsyncRequestLimiter;

  constructor(
    private readonly provider: ServicesApiProvider = vscodeServicesApiProvider,
    maxConcurrentSearches = MAX_CONCURRENT_ORG_ARTIFACT_SEARCHES,
  ) {
    this.limiter = new AsyncRequestLimiter(maxConcurrentSearches);
  }

  search(request: OrgArtifactRequest): Effect.Effect<OrgArtifactSearchResult> {
    return Effect.promise(() => this.getOrStartSearch(request));
  }

  private getOrStartSearch(
    request: OrgArtifactRequest,
  ): Promise<OrgArtifactSearchResult> {
    const normalizedRequest: OrgArtifactRequest = {
      kind: request.kind,
      name: request.name.trim(),
      generation: request.generation,
    };
    const normalizedName = normalizedRequest.name.toLowerCase();
    const key = `${normalizedRequest.generation ?? 0}:${normalizedRequest.kind}:${normalizedName}`;
    const now = Date.now();
    for (const [cachedKey, expiresAt] of this.notFoundUntil) {
      if (expiresAt <= now) {
        this.notFoundUntil.delete(cachedKey);
      }
    }
    const cachedUntil = this.notFoundUntil.get(key);
    if (cachedUntil !== undefined) {
      if (cachedUntil > now) {
        return Promise.resolve({
          kind: 'not-found',
          artifactKind: normalizedRequest.kind,
          name: normalizedRequest.name,
        });
      }
      this.notFoundUntil.delete(key);
    }
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing;
    }
    const started = this.limiter.run(() =>
      Effect.runPromise(this.executeSearch(normalizedRequest)),
    );
    this.inFlight.set(key, started);
    void started.then(
      (result) => {
        if (result.kind === 'not-found') {
          this.notFoundUntil.set(
            key,
            Date.now() + ORG_ARTIFACT_NOT_FOUND_TTL_MS,
          );
        }
      },
      () => undefined,
    );
    void started.finally(() => {
      if (this.inFlight.get(key) === started) {
        this.inFlight.delete(key);
      }
    });
    return started;
  }

  private executeSearch(
    request: OrgArtifactRequest,
  ): Effect.Effect<OrgArtifactSearchResult> {
    return this.provider.getServicesApi().pipe(
      Effect.flatMap((api) =>
        request.kind === 'sobject'
          ? this.describeSObject(api, request)
          : this.querySource(api, request),
      ),
      Effect.catchAll((error) =>
        Effect.succeed(
          unavailableResult(request, classifyUnavailableReason(error), error),
        ),
      ),
    );
  }

  private describeSObject(
    api: OrgArtifactServicesApi,
    request: Extract<OrgArtifactRequest, { kind: 'sobject' }>,
  ): Effect.Effect<OrgArtifactSearchResult> {
    return provideServices(
      api,
      api.services.MetadataDescribeService.describeCustomObject(request.name),
    ).pipe(
      Effect.map((describe): OrgArtifactSearchResult => ({
        kind: 'sobject-describe',
        name: request.name,
        describe,
      })),
      Effect.catchAll((error) =>
        Effect.succeed(
          isNotFoundError(error)
            ? notFoundResult(request)
            : unavailableResult(
                request,
                classifyUnavailableReason(error),
                error,
              ),
        ),
      ),
    );
  }

  private querySource(
    api: OrgArtifactServicesApi,
    request: Exclude<OrgArtifactRequest, { kind: 'sobject' }>,
  ): Effect.Effect<OrgArtifactSearchResult> {
    const entityName =
      request.kind === 'apex-class' ? 'ApexClass' : 'ApexTrigger';
    const { baseName, namespace } = splitQualifiedName(request.name);
    const namespacePredicate = namespace
      ? `NamespacePrefix = '${escapeSoqlLiteral(namespace)}'`
      : 'NamespacePrefix = null';
    const query =
      `SELECT Id, Name, Body, NamespacePrefix FROM ${entityName} ` +
      `WHERE Name = '${escapeSoqlLiteral(baseName)}' AND ` +
      `${namespacePredicate} LIMIT 1`;

    return provideServices(
      api,
      api.services.ConnectionService.getConnection(),
    ).pipe(
      Effect.flatMap((connection) =>
        Effect.tryPromise(() => connection.tooling.query<SourceRecord>(query)),
      ),
      Effect.map((result): OrgArtifactSearchResult => {
        const record = result.records[0];
        if (!record) {
          return notFoundResult(request);
        }
        if (!record.Body || record.Body.includes('(hidden)')) {
          return unavailableResult(request, 'protected-source');
        }
        const recordNamespace = record.NamespacePrefix?.trim() || undefined;
        return {
          kind:
            request.kind === 'apex-class' ? 'apex-source' : 'trigger-source',
          id: record.Id,
          name: record.Name,
          namespace: recordNamespace,
          source: record.Body,
        };
      }),
      Effect.catchAll((error) =>
        Effect.succeed(
          unavailableResult(request, classifyUnavailableReason(error), error),
        ),
      ),
    );
  }
}

class AsyncRequestLimiter {
  private active = 0;
  private readonly waiters: (() => void)[] = [];

  constructor(private readonly maximum: number) {
    if (!Number.isInteger(maximum) || maximum < 1) {
      throw new Error('maxConcurrentSearches must be a positive integer');
    }
  }

  async run<A>(operation: () => Promise<A>): Promise<A> {
    await this.acquire();
    try {
      return await operation();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.maximum) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  private release(): void {
    this.active--;
    this.waiters.shift()?.();
  }
}

function provideServices<A>(
  api: OrgArtifactServicesApi,
  effect: Effect.Effect<A, unknown, unknown>,
): Effect.Effect<A, unknown> {
  return effect.pipe(
    Effect.provide(
      api.services.prebuiltServicesDependencies as Context.Context<never>,
    ),
  ) as Effect.Effect<A, unknown>;
}

export function escapeSoqlLiteral(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "''");
}

function splitQualifiedName(name: string): {
  readonly baseName: string;
  readonly namespace?: string;
} {
  const trimmed = name.trim();
  const separator = trimmed.lastIndexOf('.');
  if (separator <= 0 || separator === trimmed.length - 1) {
    return { baseName: trimmed };
  }
  return {
    namespace: trimmed.slice(0, separator),
    baseName: trimmed.slice(separator + 1),
  };
}

function notFoundResult(request: OrgArtifactRequest): OrgArtifactSearchResult {
  return {
    kind: 'not-found',
    artifactKind: request.kind,
    name: request.name,
  };
}

function unavailableResult(
  request: OrgArtifactRequest,
  reason: Extract<OrgArtifactSearchResult, { kind: 'unavailable' }>['reason'],
  error?: unknown,
): OrgArtifactSearchResult {
  return {
    kind: 'unavailable',
    artifactKind: request.kind,
    name: request.name,
    reason,
    message: errorMessage(error),
  };
}

function isNotFoundError(error: unknown): boolean {
  return /not.?found|invalid.?type|does not exist/i.test(errorMessage(error));
}

function classifyUnavailableReason(
  error: unknown,
): Extract<OrgArtifactSearchResult, { kind: 'unavailable' }>['reason'] {
  const message = errorMessage(error);
  if (/not installed|extension.*unavailable/i.test(message)) {
    return 'services-extension-unavailable';
  }
  if (/no target org|no active org|target-org/i.test(message)) {
    return 'no-active-org';
  }
  if (
    /auth|token|session|unauthorized|forbidden|insufficient.?access|access denied/i.test(
      message,
    )
  ) {
    return 'authorization-failed';
  }
  return 'request-failed';
}

function errorMessage(error: unknown): string {
  if (error === undefined) {
    return '';
  }
  if (error instanceof Error) {
    const cause =
      'cause' in error && error.cause !== undefined
        ? errorMessage(error.cause)
        : '';
    return [error.message, cause].filter(Boolean).join(': ');
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    const cause =
      'cause' in error && error.cause !== undefined
        ? errorMessage(error.cause)
        : '';
    return [error.message, cause].filter(Boolean).join(': ');
  }
  return String(error);
}
