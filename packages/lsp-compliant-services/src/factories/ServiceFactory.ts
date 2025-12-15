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

import { MissingArtifactProcessingService } from '../services/MissingArtifactProcessingService';
import { ExecuteCommandProcessingService } from '../services/ExecuteCommandProcessingService';

/**
 * Service dependencies interface
 */
export interface ServiceDependencies {
  logger: LoggerInterface;
  symbolManager: ISymbolManager;
  storageManager: ApexStorageManager;
  settingsManager: ApexSettingsManager;
}

/**
 * Factory for creating LSP processing services with proper dependency injection
 */
export class ServiceFactory {
  constructor(private readonly dependencies: ServiceDependencies) {}

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
    return new CompletionProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
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
    return new ReferencesProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
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
    return new DocumentSymbolProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
  }

  /**
   * Create workspace symbol processing service
   */
  createWorkspaceSymbolService(): WorkspaceSymbolProcessingService {
    return new WorkspaceSymbolProcessingService(
      this.dependencies.logger,
      this.dependencies.symbolManager,
    );
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
    return new DocumentProcessingService(this.dependencies.logger);
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
