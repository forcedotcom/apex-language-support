/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export the test utilities
export * from './RequestResponseCapturingMiddleware';
export * from './LspTestFixture';
export * from './LspTestRunner';

// Export types for test scripts
export interface LspTestStepBase {
  description: string;
  method: string;
  params: any;
}

// Helper functions for creating test scripts

/**
 * Create a standard initialize request for testing
 * @param rootUri The root URI of the workspace
 * @param capabilities Client capabilities to include
 */
export function createInitializeParams(
  rootUri: string,
  capabilities?: any,
): any {
  return {
    processId: null,
    clientInfo: {
      name: 'Apex LSP Test Client',
      version: '1.0.0',
    },
    rootUri,
    capabilities: capabilities || {
      textDocument: {
        synchronization: {
          didSave: true,
          dynamicRegistration: true,
        },
        completion: {
          dynamicRegistration: true,
          completionItem: {
            snippetSupport: true,
          },
        },
        hover: {
          dynamicRegistration: true,
        },
        definition: {
          dynamicRegistration: true,
        },
        documentSymbol: {
          dynamicRegistration: true,
        },
      },
      workspace: {
        applyEdit: true,
      },
    },
  };
}

/**
 * Create a didOpen request for testing
 * @param uri The document URI
 * @param text The document text
 * @param languageId The document language ID
 */
export function createDidOpenParams(
  uri: string,
  text: string,
  languageId = 'apex',
): any {
  return {
    textDocument: {
      uri,
      languageId,
      version: 1,
      text,
    },
  };
}

/**
 * Create a position parameter for text document methods
 * @param uri The document URI
 * @param line The line number (0-based)
 * @param character The character position (0-based)
 */
export function createPositionParams(
  uri: string,
  line: number,
  character: number,
): any {
  return {
    textDocument: {
      uri,
    },
    position: {
      line,
      character,
    },
  };
}

/**
 * Create a standard shutdown sequence steps for a test script
 */
export function createShutdownSequence(): LspTestStepBase[] {
  return [
    {
      description: 'Shutdown the server',
      method: 'shutdown',
      params: {},
    },
    {
      description: 'Exit the server',
      method: 'exit',
      params: {},
    },
  ];
}
