/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ProgressToken } from 'vscode-languageserver';

/**
 * Abstraction over the workspace-load coordination path.
 *
 * Direct LSP-connection callers (coordinator thread) wrap
 * ensureWorkspaceLoaded directly. Worker callers route through the
 * coordinator via the assistance bus, since enrichment workers do not
 * have an LSP connection of their own.
 *
 * Both implementations are fire-and-forget at the LSP layer — they
 * trigger the coordinator-side notification and return immediately.
 * Callers then proceed with whatever workspace state is available and
 * accept partial results if loading is still in progress.
 */
export interface IWorkspaceLoadCoordinator {
  /**
   * Ask the LSP client to ensure the workspace is loaded. Returns
   * after the request has been dispatched, not after load completes.
   *
   * @param workDoneToken Optional progress token from the originating
   *   LSP request, forwarded to the client to scope progress reports
   *   to that request.
   */
  ensureLoaded(workDoneToken?: ProgressToken): Promise<void>;
}

/**
 * No-op implementation. Used when no coordinator is wired (legacy code
 * paths and tests that do not exercise workspace-load behavior).
 */
export class NoopWorkspaceLoadCoordinator implements IWorkspaceLoadCoordinator {
  async ensureLoaded(_workDoneToken?: ProgressToken): Promise<void> {
    // intentionally empty
  }
}
