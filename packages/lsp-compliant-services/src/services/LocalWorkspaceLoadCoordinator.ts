/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, ProgressToken } from 'vscode-languageserver';
import { Effect } from 'effect';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { IWorkspaceLoadCoordinator } from './IWorkspaceLoadCoordinator';
import { ensureWorkspaceLoaded } from './WorkspaceLoadCoordinator';

/**
 * Coordinator-thread implementation: wraps the existing
 * ensureWorkspaceLoaded Effect that talks to the LSP client directly.
 *
 * Used by services running in the LCSAdapter (coordinator) where an
 * LSP Connection is available. The Effect is fire-and-forget at the
 * LSP layer — it sends the workspace-load notification and resolves
 * immediately. Workspace state coherence is tracked in
 * WorkspaceLoadCoordinator's per-thread Refs.
 */
export class LocalWorkspaceLoadCoordinator implements IWorkspaceLoadCoordinator {
  constructor(
    private readonly connection: Connection,
    private readonly logger: LoggerInterface,
  ) {}

  async ensureLoaded(workDoneToken?: ProgressToken): Promise<void> {
    await Effect.runPromise(
      ensureWorkspaceLoaded(this.connection, this.logger, workDoneToken),
    );
  }
}
