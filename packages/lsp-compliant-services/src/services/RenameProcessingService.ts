/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { RenameParams, WorkspaceEdit } from 'vscode-languageserver-protocol';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import { PrerequisiteOrchestrationService } from './PrerequisiteOrchestrationService';
import { LayerEnrichmentService } from './LayerEnrichmentService';
import type { WorkerAssistancePort } from './assistance/WorkerAssistancePort';
import type { RenameReq, PositionReq } from './cursor/requestTypes';
import type { SymbolManagerHost } from './cursor/cursorResolution';
import type {
  RenameErrorResult,
  WorkspaceEditResult,
} from './rename/renameTypes';
import {
  resolveLocalRename,
  resolvePrepareRenameForLocal,
} from './rename/localRename';
import {
  resolveFieldRename,
  resolvePrepareRenameForField,
} from './rename/fieldRename';
import {
  resolveMethodRename,
  resolvePrepareRenameForMethod,
} from './rename/methodRename';

/**
 * Interface for rename processing functionality
 */
export interface IRenameProcessor {
  /**
   * Process a rename request
   * @param params The rename parameters
   * @returns Workspace edit for the rename operation
   */
  processRename(params: RenameParams): Promise<WorkspaceEdit | null>;
}

/** Result of a worker-side prepareRename: the identifier range + placeholder. */
export type PrepareRenameResult = NonNullable<
  Awaited<ReturnType<typeof resolvePrepareRenameForLocal>>
>;

/**
 * Service for processing rename requests
 */
export class RenameProcessingService implements IRenameProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private prerequisiteOrchestrationService: PrerequisiteOrchestrationService | null =
    null;
  private assistancePort: WorkerAssistancePort | null = null;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  /** Inject the worker's data-owner assistance port (cross-file rename kinds). */
  public setAssistancePort(port: WorkerAssistancePort): void {
    this.assistancePort = port;
  }

  private get symbolHost(): SymbolManagerHost {
    return { symbolManager: this.symbolManager };
  }

  /**
   * Resolve a rename in the request-pool worker: local variable/parameter
   * (single-file, from the live cursor text) → field → method. The first kind
   * that claims the cursor wins; only a `null` ("not my kind") falls through,
   * so a `RenameErrorResult` from a field/method conflict is never retried as
   * another kind. Field and method renames need the data owner, so without an
   * assistance port (coordinator-local path) they return `null`.
   */
  public async resolveRename(
    req: RenameReq,
  ): Promise<WorkspaceEditResult | RenameErrorResult | null> {
    const local = await resolveLocalRename(req);
    if (local !== null) return local;
    const port = this.assistancePort;
    if (!port) {
      this.logger.debug(
        () => 'Cross-file rename unavailable: no worker assistance port',
      );
      return null;
    }
    const field = await resolveFieldRename(this.symbolHost, port, req);
    if (field !== null) return field;
    return resolveMethodRename(this.symbolHost, port, req);
  }

  /**
   * prepareRename mirrors {@link resolveRename}: local → field → method, each
   * returning the identifier range + placeholder for its kind or `null` to fall
   * through. Type prepareRename (renameType) is the extension seam here.
   */
  public async resolvePrepareRename(
    req: PositionReq,
  ): Promise<PrepareRenameResult | null> {
    const local = await resolvePrepareRenameForLocal(req);
    if (local !== null) return local;
    const port = this.assistancePort;
    if (!port) return null;
    return (
      (await resolvePrepareRenameForField(this.symbolHost, port, req)) ??
      (await resolvePrepareRenameForMethod(this.symbolHost, port, req))
    );
  }

  public setLayerEnrichmentService(service: LayerEnrichmentService): void {
    if (!this.prerequisiteOrchestrationService) {
      this.prerequisiteOrchestrationService =
        new PrerequisiteOrchestrationService(
          this.logger,
          this.symbolManager,
          service,
        );
    }
  }

  /**
   * Process a rename request
   * @param params The rename parameters
   * @returns Workspace edit for the rename operation
   */
  public async processRename(
    params: RenameParams,
  ): Promise<WorkspaceEdit | null> {
    this.logger.debug(
      () => `Processing rename request for: ${params.textDocument.uri}`,
    );

    if (this.prerequisiteOrchestrationService) {
      try {
        await this.prerequisiteOrchestrationService.runPrerequisitesForLspRequestType(
          'rename',
          params.textDocument.uri,
        );
      } catch (error) {
        this.logger.debug(
          () =>
            `Error running prerequisites for rename ${params.textDocument.uri}: ${error}`,
        );
      }
    }

    try {
      // TODO: Implement rename functionality
      // For now, return null to indicate no changes
      this.logger.debug(() => 'Rename functionality not yet implemented');
      return null;
    } catch (error) {
      this.logger.error(() => `Error processing rename: ${error}`);
      return null;
    }
  }
}
