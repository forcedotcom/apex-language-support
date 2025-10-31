/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LSPRequestType, RequestPriority } from '../queue/LSPRequestQueue';

/**
 * Service configuration interface
 */
export interface ServiceConfig {
  requestType: LSPRequestType;
  priority: RequestPriority;
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
    priority: 'IMMEDIATE',
    timeout: 100,
    maxRetries: 0,
    serviceFactory: (deps) => deps.serviceFactory.createHoverService(),
  },
  {
    requestType: 'completion',
    priority: 'IMMEDIATE',
    timeout: 100,
    maxRetries: 0,
    serviceFactory: (deps) => deps.serviceFactory.createCompletionService(),
  },
  {
    requestType: 'signatureHelp',
    priority: 'IMMEDIATE',
    timeout: 100,
    maxRetries: 0,
    serviceFactory: (deps) => deps.serviceFactory.createSignatureHelpService(),
  },
  {
    requestType: 'definition',
    priority: 'HIGH',
    timeout: 1000,
    maxRetries: 1,
    serviceFactory: (deps) => deps.serviceFactory.createDefinitionService(),
  },
  {
    requestType: 'documentSymbol',
    priority: 'HIGH',
    timeout: 1000,
    maxRetries: 1,
    serviceFactory: (deps) => deps.serviceFactory.createDocumentSymbolService(),
  },
  {
    requestType: 'documentOpen',
    priority: 'HIGH',
    timeout: 1000,
    maxRetries: 1,
    serviceFactory: (deps) => deps.serviceFactory.createDocumentProcessingService(),
  },

  {
    requestType: 'findMissingArtifact',
    priority: 'LOW',
    timeout: 30000,
    maxRetries: 1,
    serviceFactory: (deps) =>
      deps.serviceFactory.createMissingArtifactService(),
  },
  {
    requestType: 'references',
    priority: 'NORMAL',
    timeout: 5000,
    maxRetries: 2,
    serviceFactory: (deps) => deps.serviceFactory.createReferencesService(),
  },
  {
    requestType: 'diagnostics',
    priority: 'NORMAL',
    timeout: 5000,
    maxRetries: 2,
    serviceFactory: (deps) => deps.serviceFactory.createDiagnosticService(),
  },
  {
    requestType: 'workspaceSymbol',
    priority: 'NORMAL',
    timeout: 5000,
    maxRetries: 2,
    serviceFactory: (deps) =>
      deps.serviceFactory.createWorkspaceSymbolService(),
  },
  {
    requestType: 'documentSave',
    priority: 'NORMAL',
    timeout: 5000,
    maxRetries: 2,
    serviceFactory: (deps) => deps.serviceFactory.createDocumentSymbolService(),
  },
  {
    requestType: 'documentChange',
    priority: 'NORMAL',
    timeout: 5000,
    maxRetries: 2,
    serviceFactory: (deps) => deps.serviceFactory.createDocumentSymbolService(),
  },
  {
    requestType: 'codeAction',
    priority: 'LOW',
    timeout: 30000,
    maxRetries: 3,
    serviceFactory: (deps) => deps.serviceFactory.createCodeActionService(),
  },
  {
    requestType: 'rename',
    priority: 'LOW',
    timeout: 30000,
    maxRetries: 3,
    serviceFactory: (deps) => deps.serviceFactory.createRenameService(),
  },
  {
    requestType: 'documentClose',
    priority: 'IMMEDIATE',
    timeout: 100,
    maxRetries: 0,
    serviceFactory: (deps) => deps.serviceFactory.createDocumentSymbolService(),
  },
];
