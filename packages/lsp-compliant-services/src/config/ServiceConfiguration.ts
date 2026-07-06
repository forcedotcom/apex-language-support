/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LSPRequestType } from '../queue';
import { Priority } from '@salesforce/apex-lsp-shared';

/**
 * Service configuration interface
 */
export interface ServiceConfig {
  requestType: LSPRequestType;
  priority: Priority;
  timeout: number;
  maxRetries: number;
  serviceFactory: (dependencies: any) => any;
}

/**
 * Default service configuration
 */
export const DEFAULT_SERVICE_CONFIG: ServiceConfig[] = [
  {
    requestType: 'hover',
    priority: Priority.Immediate,
    timeout: 5000,
    maxRetries: 0,
    serviceFactory: (deps) => deps.serviceFactory.createHoverService(),
  },
  {
    requestType: 'completion',
    priority: Priority.Immediate,
    timeout: 100,
    maxRetries: 0,
    serviceFactory: (deps) => deps.serviceFactory.createCompletionService(),
  },
  {
    requestType: 'signatureHelp',
    priority: Priority.Immediate,
    timeout: 1000,
    maxRetries: 0,
    serviceFactory: (deps) => deps.serviceFactory.createSignatureHelpService(),
  },
  {
    requestType: 'definition',
    priority: Priority.High,
    timeout: 1000,
    maxRetries: 1,
    serviceFactory: (deps) => deps.serviceFactory.createDefinitionService(),
  },
  {
    requestType: 'documentSymbol',
    priority: Priority.High,
    timeout: 5000,
    maxRetries: 1,
    serviceFactory: (deps) => deps.serviceFactory.createDocumentSymbolService(),
  },
  {
    requestType: 'documentOpen',
    priority: Priority.High,
    timeout: 1000,
    maxRetries: 1,
    serviceFactory: (deps) =>
      deps.serviceFactory.createDocumentProcessingService(),
  },
  {
    requestType: 'documentLoad',
    priority: Priority.High,
    timeout: 2000,
    maxRetries: 1,
    serviceFactory: (deps) => deps.serviceFactory.createDocumentLoadService(),
  },
  {
    requestType: 'findMissingArtifact',
    priority: Priority.Low,
    timeout: 30000,
    maxRetries: 1,
    serviceFactory: (deps) =>
      deps.serviceFactory.createMissingArtifactService(),
  },
  {
    requestType: 'references',
    priority: Priority.Low,
    // Find All References runs a workspace-wide two-phase search: a lexical
    // prefilter on the data-owner, then a FULL-detail recompile of every
    // candidate file on the request-pool worker so in-body call edges resolve.
    // That recompile is intrinsically heavier than the old public-api path
    // (~6-10s on dreamhouse-lwc's GeocodingServiceTest, dominated by
    // addSymbolTable's finalResolve/sameFileRefs phases — W-23272674). The
    // former 5s budget fired mid-recompile and discarded a correct result;
    // 15s matches the diagnostics budget, the comparable heavy cross-file
    // operation. maxRetries is 0: a timeout here means the recompile genuinely
    // needs more than the budget, and re-running the same deterministic work
    // only multiplies the cost (the wasted 3x recompiles seen in traces). The
    // addSymbolTable phase-trim that would let this drop back toward 5s is
    // tracked separately (project-findreferences-addtable-bottleneck).
    timeout: 15000,
    maxRetries: 0,
    serviceFactory: (deps) => deps.serviceFactory.createReferencesService(),
  },
  {
    requestType: 'diagnostics',
    priority: Priority.Normal,
    timeout: 15000,
    maxRetries: 2,
    serviceFactory: (deps) => deps.serviceFactory.createDiagnosticService(),
  },
  {
    requestType: 'workspaceSymbol',
    priority: Priority.Normal,
    timeout: 5000,
    maxRetries: 2,
    serviceFactory: (deps) =>
      deps.serviceFactory.createWorkspaceSymbolService(),
  },
  {
    requestType: 'documentSave',
    priority: Priority.Normal,
    timeout: 5000,
    maxRetries: 2,
    serviceFactory: (deps) =>
      deps.serviceFactory.createDocumentSaveProcessingService(),
  },
  {
    requestType: 'documentChange',
    priority: Priority.Normal,
    timeout: 5000,
    maxRetries: 2,
    serviceFactory: (deps) =>
      deps.serviceFactory.createDocumentChangeProcessingService(),
  },
  {
    requestType: 'implementation',
    priority: Priority.High,
    timeout: 1000,
    maxRetries: 1,
    serviceFactory: (deps) => deps.serviceFactory.createImplementationService(),
  },
  {
    requestType: 'foldingRange',
    priority: Priority.Low,
    timeout: 5000,
    maxRetries: 0,
    serviceFactory: (deps) => deps.serviceFactory.createFoldingRangeService(),
  },
  {
    requestType: 'codeLens',
    priority: Priority.Low,
    timeout: 5000,
    maxRetries: 0,
    serviceFactory: (deps) => deps.serviceFactory.createCodeLensService(),
  },
  {
    requestType: 'codeAction',
    priority: Priority.Low,
    timeout: 30000,
    maxRetries: 3,
    serviceFactory: (deps) => deps.serviceFactory.createCodeActionService(),
  },
  {
    requestType: 'rename',
    priority: Priority.Low,
    timeout: 30000,
    maxRetries: 3,
    serviceFactory: (deps) => deps.serviceFactory.createRenameService(),
  },
  {
    requestType: 'documentClose',
    priority: Priority.Immediate,
    timeout: 100,
    maxRetries: 0,
    serviceFactory: (deps) => deps.serviceFactory.createDocumentSymbolService(),
  },
  {
    requestType: 'executeCommand',
    priority: Priority.Normal,
    timeout: 5000,
    maxRetries: 1,
    serviceFactory: (deps) => deps.serviceFactory.createExecuteCommandService(),
  },
  {
    requestType: 'prerequisiteEnrichment',
    priority: Priority.Background,
    timeout: 60000,
    maxRetries: 0,
    serviceFactory: (deps) =>
      deps.serviceFactory.createPrerequisiteEnrichmentService(),
  },
];
