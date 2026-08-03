/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LoggerInterface,
  LSPConfigurationManager,
  ApexSettingsManager,
  Priority,
} from '@salesforce/apex-lsp-shared';
import type { FindMissingArtifactParams } from '@salesforce/apex-lsp-shared';
import { LSPQueueManager } from '../queue';
import type { Connection } from 'vscode-languageserver';
import { sanitizeMissingArtifactParams } from '../utils/missingArtifactProvenance';

/**
 * Result types for blocking resolution
 */
export type BlockingResult =
  'resolved' | 'not-found' | 'timeout' | 'cancelled' | 'unsupported';

/**
 * Configuration for missing artifact resolution
 */
export interface MissingArtifactConfig {
  readonly blockingWaitTimeoutMs: number;
  readonly indexingBarrierPollMs?: number;
}

/**
 * Service interface for missing artifact resolution
 */
export interface MissingArtifactResolutionService {
  readonly resolveBlocking: (
    params: FindMissingArtifactParams,
  ) => Promise<BlockingResult>;
  readonly resolveInBackground: (
    params: FindMissingArtifactParams,
  ) => Promise<void>;
}

/**
 * Enhanced implementation of MissingArtifactResolutionService
 * Integrates with the LSP queue system and communicates with the client
 */
export class EnhancedMissingArtifactResolutionService implements MissingArtifactResolutionService {
  private queueManager: LSPQueueManager | null = null;
  private static inFlightBlockingRequests = new Map<
    string,
    Promise<BlockingResult>
  >();
  private static recentBlockingTimeouts = new Map<string, number>();
  private static readonly BLOCKING_TIMEOUT_COOLDOWN_MS = 3000;

  /**
   * Optional proxy for sending `apex/findMissingArtifact` when no direct LSP
   * connection is available (e.g. enrichment worker). Set by the platform layer
   * via setMissingArtifactAssistanceProxy().
   */
  private static assistanceProxy:
    ((params: unknown) => Promise<unknown>) | null = null;

  static setAssistanceProxy(fn: (params: unknown) => Promise<unknown>): void {
    EnhancedMissingArtifactResolutionService.assistanceProxy = fn;
  }

  constructor(
    private readonly logger: LoggerInterface,
    private readonly config: MissingArtifactConfig,
  ) {
    // Don't initialize queueManager in constructor to avoid circular dependency
    // It will be lazily initialized when first needed
  }

  /**
   * Get queue manager with lazy initialization to avoid circular dependency
   */
  private getQueueManager(): LSPQueueManager {
    if (!this.queueManager) {
      this.queueManager = LSPQueueManager.getInstance();
    }
    return this.queueManager;
  }

  /**
   * Resolve missing artifact in blocking mode
   * Uses the queue system with HIGH priority for fast response
   */
  async resolveBlocking(
    params: FindMissingArtifactParams,
  ): Promise<BlockingResult> {
    const requestKind = params.origin?.requestKind ?? 'unknown';
    const observedRequestKinds = new Set([
      'definition',
      'signatureHelp',
      'references',
      'rename',
    ]);
    const shouldObserve = observedRequestKinds.has(requestKind);
    const startedAt = Date.now();
    if (shouldObserve) {
      this.logger.debug(
        () =>
          `[REQ-HARDEN] missingArtifact blocking start kind=${requestKind} ids=${params.identifiers.length}`,
      );
    }
    const names = params.identifiers.map((s) => s.name).join(', ');
    const normalizedIdentifiers = Array.from(
      new Set(
        params.identifiers
          .map((identifier) => {
            const provenance = identifier.provenance;
            if (!provenance) return '';
            return [
              identifier.name.trim().toLowerCase(),
              provenance.sourceUri,
              provenance.documentVersion ?? 'unknown',
              provenance.referenceIdentity,
              provenance.parseCompleteness,
            ].join('|');
          })
          .filter((identity) => identity.length > 0),
      ),
    )
      .sort()
      .join(',');
    const key = `${params.origin?.requestKind ?? 'unknown'}|${
      params.origin?.uri ?? 'unknown'
    }|${normalizedIdentifiers || names.toLowerCase()}`;
    const now = Date.now();
    const existing =
      EnhancedMissingArtifactResolutionService.inFlightBlockingRequests.get(
        key,
      );
    const recentTimeout =
      EnhancedMissingArtifactResolutionService.recentBlockingTimeouts.get(
        key,
      ) ?? 0;

    if (existing) {
      return existing;
    }

    if (
      recentTimeout > 0 &&
      now - recentTimeout <
        EnhancedMissingArtifactResolutionService.BLOCKING_TIMEOUT_COOLDOWN_MS
    ) {
      return 'timeout';
    }
    this.logger.debug(
      () => `Starting blocking resolution for identifiers: ${names}`,
    );

    // Check if missing artifact resolution is enabled in settings
    const settings = ApexSettingsManager.getInstance().getSettings();
    if (!settings.apex.findMissingArtifact.enabled) {
      this.logger.debug(
        () => 'Missing artifact resolution is disabled in settings',
      );
      return 'unsupported';
    }

    // Sanitize once and reuse for every sink (proxy + queue). Both terminate in
    // a structured-clone postMessage, and symbol-manager class instances
    // (typeReference, parentContext.*) are not cloneable — an unsanitized
    // payload throws DataCloneError and silently fails resolution.
    const safeParams = this.sanitizeParams(params);
    if (!safeParams) {
      this.logger.debug(
        () =>
          'Rejecting missing-artifact request without complete semantic provenance',
      );
      return 'not-found';
    }
    const timeoutMs = params.timeoutMsHint || this.config.blockingWaitTimeoutMs;

    const requestPromise = (async (): Promise<BlockingResult> => {
      try {
        // Worker context (enrichment/request pool): no LSP connection, so the
        // local queue can't reach the client and would resolve nothing. Forward
        // the blocking request through the coordinator assistance proxy and
        // await it — the coordinator owns the connection, drives the client to
        // open the artifact (which flows to the data-owner via didOpen), and
        // returns the result. Awaiting here means the caller's re-query sees the
        // freshly-loaded artifact.
        const proxy = EnhancedMissingArtifactResolutionService.assistanceProxy;
        if (!this.getConnection() && proxy) {
          this.logger.debug(
            () =>
              `Forwarding blocking resolution via assistance proxy for: ${names}`,
          );
          // The proxy chain (requestCoordinatorAssistance) has no self-imposed
          // rejection; without a bound, a lost/errored coordinator response
          // would hang hover/definition on the hot path forever. Race against
          // the same budget the queue path uses; a timeout throws and is
          // handled by the shared catch below (records cooldown, returns
          // 'timeout').
          const proxyResult = await this.withTimeout(
            proxy(safeParams),
            timeoutMs,
          );
          // Reaching here means the proxy resolved without throwing, so any
          // prior timeout cooldown for this key is stale — clear it.
          // (mapResultToBlockingResult only yields 'resolved'/'not-found';
          // timeouts surface as a thrown error handled by the catch below.)
          const mappedProxy = this.mapResultToBlockingResult(proxyResult);
          EnhancedMissingArtifactResolutionService.recentBlockingTimeouts.delete(
            key,
          );
          if (shouldObserve) {
            this.logger.debug(
              () =>
                `[REQ-HARDEN] missingArtifact blocking end (proxy) kind=${requestKind} ` +
                `result=${mappedProxy} durationMs=${Date.now() - startedAt}`,
            );
          }
          return mappedProxy;
        }

        // Priority tuning: keep definition responsive, but avoid starving hover/startup
        // with high-priority artifact loads during workspace churn.
        const priority =
          requestKind === 'definition' ? Priority.High : Priority.Normal;
        const result = await this.getQueueManager().submitRequest(
          'findMissingArtifact',
          safeParams,
          {
            priority,
            timeout: timeoutMs,
          },
        );

        this.logger.debug(() => `Blocking resolution completed for: ${names}`);

        // Map the result to BlockingResult. Reaching here means the queue
        // resolved without throwing, so clear any stale timeout cooldown for
        // this key. (mapResultToBlockingResult only yields
        // 'resolved'/'not-found'; queue timeouts throw and are handled below.)
        const mapped = this.mapResultToBlockingResult(result);
        EnhancedMissingArtifactResolutionService.recentBlockingTimeouts.delete(
          key,
        );
        if (shouldObserve) {
          this.logger.debug(
            () =>
              `[REQ-HARDEN] missingArtifact blocking end kind=${requestKind} ` +
              `result=${mapped} durationMs=${Date.now() - startedAt}`,
          );
        }
        return mapped;
      } catch (error) {
        this.logger.error(
          () => `Blocking resolution failed for ${names}: ${error}`,
        );

        // Return timeout if the request timed out
        if (error instanceof Error && error.message.includes('timeout')) {
          EnhancedMissingArtifactResolutionService.recentBlockingTimeouts.set(
            key,
            Date.now(),
          );
          if (shouldObserve) {
            this.logger.debug(
              () =>
                `[REQ-HARDEN] missingArtifact blocking timeout kind=${requestKind} ` +
                `durationMs=${Date.now() - startedAt}`,
            );
          }
          return 'timeout';
        }

        if (shouldObserve) {
          this.logger.debug(
            () =>
              `[REQ-HARDEN] missingArtifact blocking not-found kind=${requestKind} ` +
              `durationMs=${Date.now() - startedAt}`,
          );
        }
        return 'not-found';
      } finally {
        EnhancedMissingArtifactResolutionService.inFlightBlockingRequests.delete(
          key,
        );
      }
    })();

    EnhancedMissingArtifactResolutionService.inFlightBlockingRequests.set(
      key,
      requestPromise,
    );
    return requestPromise;
  }

  /**
   * Resolve missing artifact in background mode
   * Sends request directly to client for background processing
   */
  async resolveInBackground(params: FindMissingArtifactParams): Promise<void> {
    const names = params.identifiers.map((s) => s.name).join(', ');
    this.logger.debug(
      () => `Starting background resolution for identifiers: ${names}`,
    );

    // Check if missing artifact resolution is enabled in settings
    const settings = ApexSettingsManager.getInstance().getSettings();
    if (!settings.apex.findMissingArtifact.enabled) {
      this.logger.debug(
        () => 'Missing artifact resolution is disabled in settings',
      );
      return;
    }

    try {
      // Sanitize params before sending via postMessage (structured clone).
      const safeParams = this.sanitizeParams(params);
      if (!safeParams) {
        this.logger.debug(
          () =>
            'Rejecting missing-artifact request without complete semantic provenance',
        );
        return;
      }

      const connection = this.getConnection();
      if (!connection) {
        // No direct LSP connection — try coordinator assistance proxy (worker context).
        const proxy = EnhancedMissingArtifactResolutionService.assistanceProxy;
        if (proxy) {
          this.logger.debug(
            () =>
              `Forwarding background resolution via assistance proxy for: ${names}`,
          );
          proxy(safeParams).catch((error) => {
            this.logger.debug(
              () => `Assistance proxy resolution failed for ${names}: ${error}`,
            );
          });
          return;
        }
        this.logger.warn(
          () =>
            `No LSP connection or assistance proxy available for background resolution of: ${names}`,
        );
        return;
      }

      // Default-allow: send if capabilities are undefined (legacy client) OR
      // client explicitly advertises findMissingArtifactProvider. Gate only
      // when we KNOW the client opted out.
      try {
        const cm = LSPConfigurationManager.getInstance();
        if (cm.shouldSuppressDefaultAllow('findMissingArtifactProvider')) {
          this.logger.debug(
            () =>
              `Suppressing apex/findMissingArtifact for ${names}` +
              ' — client did not advertise findMissingArtifactProvider',
          );
          return;
        }
      } catch (e) {
        // getInstance() creates instance if absent — this only fires if the
        // constructor throws (e.g., dependency initialization failure).
        // Proceed with default-allow so notification still reaches client.
        this.logger.debug(
          () => `Capability check failed (proceeding with default-allow): ${e}`,
        );
      }

      // Send request directly to client (fire-and-forget for background mode)
      connection
        .sendRequest('apex/findMissingArtifact', safeParams)
        .catch((error) => {
          this.logger.debug(
            () => `Background resolution request failed for ${names}: ${error}`,
          );
          // Don't throw - background resolution failures shouldn't block the main flow
        });

      this.logger.debug(
        () => `Background resolution request sent for: ${names}`,
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Failed to send background resolution request for ${names}: ${error}`,
      );
      // Don't throw - background resolution failures shouldn't block the main flow
    }
  }

  /**
   * Sanitize params before sending via postMessage (structured clone).
   * Symbol manager class instances (typeReference, parentContext.*) are not
   * cloneable. Schema.decodeUnknownSync creates a new plain object containing
   * only the declared wire-schema fields, stripping all class extras. Shared by
   * every sink that forwards params across a worker boundary (proxy + queue).
   */
  private sanitizeParams(
    params: FindMissingArtifactParams,
  ): FindMissingArtifactParams | null {
    return sanitizeMissingArtifactParams(params);
  }

  /**
   * Race a promise against a timeout. Rejects with a timeout Error (matched by
   * the caller's `error.message.includes('timeout')` cooldown handling) if the
   * budget elapses first.
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () =>
          reject(new Error(`Blocking resolution timeout after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });
    return Promise.race([promise, timeout]).finally(() =>
      clearTimeout(timer),
    ) as Promise<T>;
  }

  /**
   * Map the queue result to BlockingResult
   */
  private mapResultToBlockingResult(result: any): BlockingResult {
    if (!result) {
      return 'not-found';
    }

    // Check if the result indicates success
    if (
      result.opened &&
      Array.isArray(result.opened) &&
      result.opened.length > 0
    ) {
      return 'resolved';
    }

    if (result.accepted) {
      return 'resolved'; // Background resolution accepted
    }

    if (result.notFound) {
      return 'not-found';
    }

    // Default to not found
    return 'not-found';
  }

  /**
   * Get LSP connection for client communication from configuration manager
   */
  private getConnection(): Connection | undefined {
    try {
      // Get connection from the configuration manager's runtime dependencies
      const configManager = LSPConfigurationManager.getInstance();
      const connection = configManager.getConnection();

      if (!connection) {
        this.logger.debug(
          () => 'LSP connection not available in configuration manager',
        );
      }

      return connection;
    } catch (error) {
      this.logger.error(
        () =>
          `Failed to get LSP connection from configuration manager: ${error}`,
      );
      return undefined;
    }
  }

  /**
   * Get queue statistics for monitoring
   */
  async getQueueStats() {
    return await this.getQueueManager().getStats();
  }
}

/**
 * Default configuration
 */
export const DEFAULT_MISSING_ARTIFACT_CONFIG: MissingArtifactConfig = {
  blockingWaitTimeoutMs: 2000,
  indexingBarrierPollMs: 100,
};

/**
 * Factory function to create a missing artifact resolution service
 */
export function createMissingArtifactResolutionService(
  logger: LoggerInterface,
  config: MissingArtifactConfig = DEFAULT_MISSING_ARTIFACT_CONFIG,
): MissingArtifactResolutionService {
  return new EnhancedMissingArtifactResolutionService(logger, config);
}
