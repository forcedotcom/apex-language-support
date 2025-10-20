/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ClientCapabilities } from 'vscode-languageserver-protocol';
import { ClientCapabilitiesConfiguration } from '../capabilities/ApexLanguageServerCapabilities';

/**
 * Base client capabilities shared across all modes
 */
const BASE_CLIENT_CAPABILITIES: ClientCapabilities = {
  workspace: {
    applyEdit: true,
    workspaceEdit: {
      documentChanges: true,
      resourceOperations: ['create', 'rename', 'delete'],
      failureHandling: 'textOnlyTransactional',
    },
    didChangeConfiguration: {
      dynamicRegistration: true,
    },
    didChangeWatchedFiles: {
      dynamicRegistration: true,
    },
    symbol: {
      dynamicRegistration: true,
      symbolKind: {
        valueSet: [
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
          21, 22, 23, 24, 25, 26,
        ],
      },
    },
    executeCommand: {
      dynamicRegistration: true,
    },
    configuration: true,
    workspaceFolders: true,
  },
  textDocument: {
    publishDiagnostics: {
      relatedInformation: true,
      versionSupport: false,
      tagSupport: { valueSet: [1, 2] },
    },
    synchronization: {
      dynamicRegistration: true,
      willSave: true,
      willSaveWaitUntil: true,
      didSave: true,
    },
  },
  window: {
    workDoneProgress: true,
  },
  general: {
    regularExpressions: { engine: 'ECMAScript', version: 'ES2020' },
    markdown: { parser: 'marked', version: '1.1.0' },
  },
};

/**
 * Production client capabilities - only advertise dynamic registration
 * for capabilities that are enabled in production mode
 */
export const PRODUCTION_CLIENT_CAPABILITIES: ClientCapabilities = {
  ...BASE_CLIENT_CAPABILITIES,
  textDocument: {
    ...BASE_CLIENT_CAPABILITIES.textDocument,
    // Document symbols - enabled in production
    documentSymbol: {
      dynamicRegistration: true,
      symbolKind: {
        valueSet: [
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
          21, 22, 23, 24, 25, 26,
        ],
      },
      hierarchicalDocumentSymbolSupport: true,
    },
    // Diagnostics - enabled in production
    diagnostic: {
      dynamicRegistration: true,
    },
    // Folding - disabled in production, don't advertise
    // Hover - disabled in production, don't advertise
    // Completion - disabled in production, don't advertise
  },
};

/**
 * Development client capabilities - advertise dynamic registration
 * for all implemented capabilities
 */
export const DEVELOPMENT_CLIENT_CAPABILITIES: ClientCapabilities = {
  ...BASE_CLIENT_CAPABILITIES,
  textDocument: {
    ...BASE_CLIENT_CAPABILITIES.textDocument,
    // Document symbols
    documentSymbol: {
      dynamicRegistration: true,
      symbolKind: {
        valueSet: [
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
          21, 22, 23, 24, 25, 26,
        ],
      },
      hierarchicalDocumentSymbolSupport: true,
    },
    // Diagnostics
    diagnostic: {
      dynamicRegistration: true,
    },
    // Folding ranges
    foldingRange: {
      dynamicRegistration: true,
      rangeLimit: 5000,
      lineFoldingOnly: true,
    },
    // Hover
    hover: {
      dynamicRegistration: true,
      contentFormat: ['markdown', 'plaintext'],
    },
    // Completion
    completion: {
      dynamicRegistration: true,
      contextSupport: true,
      completionItem: {
        snippetSupport: true,
        commitCharactersSupport: true,
        documentationFormat: ['markdown', 'plaintext'],
        deprecatedSupport: true,
        preselectSupport: true,
      },
      completionItemKind: {
        valueSet: [
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
          21, 22, 23, 24, 25,
        ],
      },
    },
  },
};

/**
 * Complete client capability configuration
 */
export const CLIENT_CAPABILITIES_CONFIGURATION: ClientCapabilitiesConfiguration =
  {
    production: PRODUCTION_CLIENT_CAPABILITIES,
    development: DEVELOPMENT_CLIENT_CAPABILITIES,
  };

/**
 * Get client capabilities for a specific server mode
 */
export const getClientCapabilitiesForMode = (
  mode: 'production' | 'development',
): ClientCapabilities => CLIENT_CAPABILITIES_CONFIGURATION[mode];
