/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LoggerInterface,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { HoverProcessingService } from '../services/HoverProcessingService';
import { CompletionProcessingService } from '../services/CompletionProcessingService';
import { DefinitionProcessingService } from '../services/DefinitionProcessingService';
import { ReferencesProcessingService } from '../services/ReferencesProcessingService';
import { CodeActionProcessingService } from '../services/CodeActionProcessingService';
import { SignatureHelpProcessingService } from '../services/SignatureHelpProcessingService';
import { RenameProcessingService } from '../services/RenameProcessingService';
import { DiagnosticProcessingService } from '../services/DiagnosticProcessingService';
import { DocumentSymbolProcessingService } from '../services/DocumentSymbolProcessingService';
import { DocumentProcessingService } from '../services/DocumentProcessingService';
import { DocumentLoadProcessingService } from '../services/DocumentLoadProcessingService';
import { WorkspaceSymbolProcessingService } from '../services/WorkspaceSymbolProcessingService';
import { ImplementationProcessingService } from '../services/ImplementationProcessingService';
import { CodeLensProcessingService } from '../services/CodeLensProcessingService';
import { FoldingRangeProcessingService } from '../services/FoldingRangeProcessingService';
import { LayerEnrichmentService } from '../services/LayerEnrichmentService';

import { MissingArtifactProcessingService } from '../services/MissingArtifactProcessingService';
import { ExecuteCommandProcessingService } from '../services/ExecuteCommandProcessingService';
import { PrerequisiteEnrichmentService } from '../services/PrerequisiteEnrichmentService';
import {
  IWorkspaceLoadCoordinator,
  LocalWorkspaceLoadCoordinator,
} from '../services/WorkspaceLoadCoordinator';
import { Connection } from 'vscode-languageserver';

/**
 * Service dependencies interface
 */
export interface ServiceDependencies {
  logger: LoggerInterface;
  symbolManager: ISymbolManager;
  storageManager: ApexStorageManager;
  settingsManager: ApexSettingsManager;
  connection?: Connection; // Optional connection for progress reporting
  /**
   * Optional injected workspace-load coordinator. When omitted, a local
   * coordinator is built from `connection` when available. Worker bootstraps
   * supply a Remote coordinator here that forwards over the assistance bus.
   */
  workspaceLoadCoordinator?: IWorkspaceLoadCoordinator;
}

/**
 * Factory for creating LSP processing services with proper dependency injection
 */
export class ServiceFactory {
  private layerEnrichmentService: LayerEnrichmentService | null = null;
  private workspaceLoadCoordinator: IWorkspaceLoadCoordinator | null = null;

  constructor(private readonly dependencies: ServiceDependencies) {}

  /**
   * Get or create the layer enrichment service (singleton per factory)
   */
  private getLayerEnrichmentService(): LayerEnrichmentService {
    if (!this.layerEnrichmentService) {
      this.layerEnrichmentService = new LayerEnrichmentService(
        this.dependencies.logger,
        this.dependencies.symbolManager,
      );
      if (this.dependencies.connection) {
        this.layerEnrichmentService.setConnection(this.dependencies.connection);
      }
    }
    return this.layerEnrichmentService;
  }

  /**
   * Get or create the workspace load coordinator (singleton per factory).
   * Defaults to {@link LocalWorkspaceLoadCoordinator} when a Connection is
   * available; returns undefined otherwise. Worker bootstraps that need a
   * remote coordinator should inject it via the dedicated dependency rather
   * than relying on this default.
   *
   * Returns `undefined` (not `null`) so the value flows straight into the
   * `ReferencesProcessingService` constructor's optional parameter without a
   * `?? undefined` bridge at the call site. The cache field stays `| null`
   * to match the sibling lazy-init pattern (e.g. `layerEnrichmentService`).
   */
  private getWorkspaceLoadCoordinator(): IWorkspaceLoadCoordinator | undefined {
    if (this.workspaceLoadCoordinator) {
      return this.workspaceLoadCoordinator;
    }
    if (this.dependencies.workspaceLoadCoordinator) {
      this.workspaceLoadCoordinator =
        this.dependencies.workspaceLoadCoordinator;
      return this.workspaceLoadCoordinator;
    }
    if (this.dependencies.connection) {
      this.workspaceLoadCoordinator = new LocalWorkspaceLoadCoordinator(
        this.dependencies.connection,
        this.dependencies.logger,
      );
      return this.workspaceLoadCoordinator;
    }
    return undefined;
  }

  /**
   * Create hover processing service
   */
  createHoverService(): HoverProcessingService {
    const service = new HoverProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
      // No need to create MissingArtifactResolutionService - MissingArtifactUtils will create it on-demand
    );
    service.setLayerEnrichmentService(this.getLayerEnrichmentService());
    return service;
  }

  /**
   * Create completion processing service
   */
  createCompletionService(): CompletionProcessingService {
    const service = new CompletionProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
    service.setLayerEnrichmentService(this.getLayerEnrichmentService());
    return service;
  }

  /**
   * Create definition processing service
   */
  createDefinitionService(): DefinitionProcessingService {
    const service = new DefinitionProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
    service.setLayerEnrichmentService(this.getLayerEnrichmentService());
    return service;
  }

  /**
   * Create references processing service
   */
  createReferencesService(): ReferencesProcessingService {
    const service = new ReferencesProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
      this.getWorkspaceLoadCoordinator(),
    );
    service.setLayerEnrichmentService(this.getLayerEnrichmentService());
    return service;
  }

  /**
   * Create code action processing service
   */
  createCodeActionService(): CodeActionProcessingService {
    return new CodeActionProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
  }

  /**
   * Create signature help processing service
   */
  createSignatureHelpService(): SignatureHelpProcessingService {
    const service = new SignatureHelpProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
    service.setLayerEnrichmentService(this.getLayerEnrichmentService());
    return service;
  }

  /**
   * Create rename processing service
   */
  createRenameService(): RenameProcessingService {
    const service = new RenameProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
    service.setLayerEnrichmentService(this.getLayerEnrichmentService());
    return service;
  }

  /**
   * Create diagnostic processing service
   */
  createDiagnosticService(): DiagnosticProcessingService {
    return new DiagnosticProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
  }

  /**
   * Create document symbol processing service
   */
  createDocumentSymbolService(): DocumentSymbolProcessingService {
    const service = new DocumentSymbolProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
    service.setLayerEnrichmentService(this.getLayerEnrichmentService());
    return service;
  }

  /**
   * Create workspace symbol processing service
   */
  createWorkspaceSymbolService(): WorkspaceSymbolProcessingService {
    const service = new WorkspaceSymbolProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
    service.setLayerEnrichmentService(this.getLayerEnrichmentService());
    return service;
  }

  createImplementationService(): ImplementationProcessingService {
    return new ImplementationProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
  }

  createCodeLensService(): CodeLensProcessingService {
    return new CodeLensProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
  }

  createFoldingRangeService(): FoldingRangeProcessingService {
    return new FoldingRangeProcessingService(this.dependencies.logger);
  }

  /**
   * Create missing artifact processing service
   */
  createMissingArtifactService(): MissingArtifactProcessingService {
    return new MissingArtifactProcessingService(this.dependencies.logger);
  }

  /**
   * Create document processing service
   */
  createDocumentProcessingService(): DocumentProcessingService {
    const service = new DocumentProcessingService(this.dependencies.logger);
    service.setLayerEnrichmentService(this.getLayerEnrichmentService());
    return service;
  }

  /**
   * Create document load processing service
   */
  createDocumentLoadService(): DocumentLoadProcessingService {
    const service = new DocumentLoadProcessingService(this.dependencies.logger);
    if (this.dependencies.connection) {
      service.setConnection(this.dependencies.connection);
    }
    return service;
  }

  /**
   * Create execute command processing service
   */
  createExecuteCommandService(): ExecuteCommandProcessingService {
    return new ExecuteCommandProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
  }

  /**
   * Create prerequisite enrichment processing service
   */
  createPrerequisiteEnrichmentService(): PrerequisiteEnrichmentService {
    return new PrerequisiteEnrichmentService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
      this.getLayerEnrichmentService(),
    );
  }
}
