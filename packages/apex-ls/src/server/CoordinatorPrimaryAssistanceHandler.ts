/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Primary assistance handler for the coordinator's
 * {@link CoordinatorAssistanceMediator}.
 *
 * Extracted from `LCSAdapter.initializeWorkerTopology` so the production
 * branching logic — `apex/findMissingArtifact`, `coordinator:*`,
 * `resourceLoader:*`, the LSP catch-all — can be exercised directly by
 * unit tests, instead of being duplicated in a test fixture.
 */

import { Effect } from 'effect';
import type { Connection } from 'vscode-languageserver/browser';
import {
  ensureWorkspaceLoaded,
  LSPQueueManager,
} from '@salesforce/apex-lsp-compliant-services';
import type {
  FindMissingArtifactParams,
  LoggerInterface,
} from '@salesforce/apex-lsp-shared';
import type { AssistanceHandler } from './CoordinatorAssistanceMediator';
import type { ResourceLoaderProxy } from './ResourceLoaderProxy';

export interface PrimaryAssistanceHandlerDeps {
  /** LSP Connection used for the catch-all `connection.sendRequest` and
   *  for firing the workspace-load notification. */
  readonly connection: Pick<Connection, 'sendRequest' | 'sendNotification'>;
  readonly logger: LoggerInterface;
  /** Optional resource-loader proxy. When absent, `resourceLoader:*`
   *  branches return safe empties matching the pre-extraction behaviour. */
  readonly getResourceLoaderProxy: () => ResourceLoaderProxy | undefined;
}

/**
 * Build the primary assistance handler used by the mediator on the
 * coordinator side. Branch order is load-bearing:
 *
 *   1. `apex/findMissingArtifact` — queue manager.
 *   2. `coordinator:EnsureWorkspaceLoaded` — fire the LSP notification,
 *      gated by the local load state machine.
 *   3. `resourceLoader:*` — proxy methods.
 *   4. catch-all — forward to the LSP client over the wire.
 *
 * Each `coordinator:*` and `resourceLoader:*` branch must be placed
 * before the catch-all; otherwise the unrecognised method name would
 * be sent to the LSP client and surface as a "Method not found" error.
 */
export const createPrimaryAssistanceHandler = (
  deps: PrimaryAssistanceHandlerDeps,
): AssistanceHandler => {
  const { connection, logger, getResourceLoaderProxy } = deps;
  return async (method, params) => {
    if (method === 'apex/findMissingArtifact') {
      return LSPQueueManager.getInstance().submitFindMissingArtifactRequest(
        params as FindMissingArtifactParams,
      );
    }
    if (method === 'coordinator:EnsureWorkspaceLoaded') {
      // Workers (enrichment / data-owner) have no LSP Connection of
      // their own. They forward the workspace-load notification request
      // through the assistance bus; the coordinator owns the Connection
      // and delegates to ensureWorkspaceLoaded (which itself respects
      // the local load-state machine).
      const p = params as { workDoneToken?: string | number };
      await Effect.runPromise(
        ensureWorkspaceLoaded(
          connection as Connection,
          logger,
          p.workDoneToken,
        ),
      );
      return undefined;
    }
    if (method === 'resourceLoader:resolveClass') {
      const p = params as { name: string };
      const proxy = getResourceLoaderProxy();
      if (!proxy) return null;
      return proxy.resolveStandardClassFqn(p.name);
    }
    if (method === 'resourceLoader:getSymbolTable') {
      const p = params as { classPath: string };
      const proxy = getResourceLoaderProxy();
      if (!proxy) return null;
      return proxy.getSymbolTable(p.classPath);
    }
    if (method === 'resourceLoader:getFile') {
      const p = params as { path: string };
      const proxy = getResourceLoaderProxy();
      if (!proxy) return undefined;
      return proxy.getFile(p.path);
    }
    if (method === 'resourceLoader:getStandardNamespaces') {
      const proxy = getResourceLoaderProxy();
      if (!proxy) return {};
      return proxy.getStandardNamespaces();
    }
    return connection.sendRequest(method, params);
  };
};
