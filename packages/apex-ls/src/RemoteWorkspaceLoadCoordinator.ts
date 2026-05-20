/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ProgressToken } from 'vscode-languageserver';
import { IWorkspaceLoadCoordinator } from '@salesforce/apex-lsp-compliant-services';

/**
 * Worker-side IWorkspaceLoadCoordinator. Routes the workspace-load
 * request through the assistance bus to the coordinator's primary
 * AssistanceHandler, which in turn invokes the existing
 * ensureWorkspaceLoaded Effect against the LSP Connection.
 *
 * The constructor takes the assistance-proxy function as a parameter
 * (rather than importing it directly) so this class stays free of
 * platform-specific globals — both the Node and browser worker
 * platforms inject their own copy of requestCoordinatorAssistancePromise.
 */
export class RemoteWorkspaceLoadCoordinator implements IWorkspaceLoadCoordinator {
  constructor(
    private readonly requestAssistance: (
      method: string,
      params: unknown,
      blocking: boolean,
    ) => Promise<unknown>,
  ) {}

  async ensureLoaded(workDoneToken?: ProgressToken): Promise<void> {
    // blocking=true so the worker's processReferences awaits the
    // coordinator-side dispatch (i.e. the notification has been sent),
    // not just the queueing. The Effect itself is fast — it only sends
    // a fire-and-forget LSP notification — so this round trip is cheap.
    await this.requestAssistance(
      'coordinator:EnsureWorkspaceLoaded',
      { workDoneToken },
      true,
    );
  }
}
