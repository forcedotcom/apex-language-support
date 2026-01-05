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
import { WorkspaceSymbolProcessingService } from '../services/WorkspaceSymbolProcessingService';
import { LayerEnrichmentService } from '../services/LayerEnrichmentService';

import { MissingArtifactProcessingService } from '../services/MissingArtifactProcessingService';
import { ExecuteCommandProcessingService } from '../services/ExecuteCommandProcessingService';
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
}

/**
 * Factory for creating LSP processing services with proper dependency injection
 */
export class ServiceFactory {
  private layerEnrichmentService: LayerEnrichmentService | null = null;

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
   * Create hover processing service
   */
  createHoverService(): HoverProcessingService {
    return new HoverProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
      // No need to create MissingArtifactResolutionService - MissingArtifactUtils will create it on-demand
    );
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
    return new DefinitionProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
  }

  /**
   * Create references processing service
   */
  createReferencesService(): ReferencesProcessingService {
    const service = new ReferencesProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
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
    return new SignatureHelpProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
  }

  /**
   * Create rename processing service
   */
  createRenameService(): RenameProcessingService {
    return new RenameProcessingService(this.dependencies.logger);
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
   * Create execute command processing service
   */
  createExecuteCommandService(): ExecuteCommandProcessingService {
    return new ExecuteCommandProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
  }
}
