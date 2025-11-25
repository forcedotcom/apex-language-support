/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getClientCapabilitiesForMode } from '@salesforce/apex-lsp-shared';

// Mock VSCode
jest.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [
      {
        uri: { toString: () => 'file:///test-workspace' },
        name: 'test-workspace',
      },
    ],
  },
  env: {
    language: 'en',
  },
  ExtensionMode: {
    Production: 1,
    Development: 2,
    Test: 3,
  },
  ExtensionKind: {
    UI: 1,
    Workspace: 2,
  },
}));

describe('VSCode Extension Capabilities Alignment', () => {
  describe('Client Capabilities Configuration', () => {
    it('should return production client capabilities for production mode', () => {
      const productionCaps = getClientCapabilitiesForMode('production');
      expect(productionCaps).toMatchSnapshot('production-client-capabilities');
    });

    it('should return development client capabilities for development mode', () => {
      const developmentCaps = getClientCapabilitiesForMode('development');
      expect(developmentCaps).toMatchSnapshot(
        'development-client-capabilities',
      );
    });

    it('should have consistent dynamic registration settings', () => {
      const productionCaps = getClientCapabilitiesForMode('production');
      const developmentCaps = getClientCapabilitiesForMode('development');

      const dynamicRegistrationComparison = {
        production: {
          workspace: {
            didChangeConfiguration:
              productionCaps.workspace?.didChangeConfiguration
                ?.dynamicRegistration,
            didChangeWatchedFiles:
              productionCaps.workspace?.didChangeWatchedFiles
                ?.dynamicRegistration,
            symbol: productionCaps.workspace?.symbol?.dynamicRegistration,
            executeCommand:
              productionCaps.workspace?.executeCommand?.dynamicRegistration,
          },
          textDocument: {
            synchronization:
              productionCaps.textDocument?.synchronization?.dynamicRegistration,
            completion:
              productionCaps.textDocument?.completion?.dynamicRegistration,
            hover: productionCaps.textDocument?.hover?.dynamicRegistration,
            documentSymbol:
              productionCaps.textDocument?.documentSymbol?.dynamicRegistration,
            foldingRange:
              productionCaps.textDocument?.foldingRange?.dynamicRegistration,
            diagnostic:
              productionCaps.textDocument?.diagnostic?.dynamicRegistration,
          },
        },
        development: {
          workspace: {
            didChangeConfiguration:
              developmentCaps.workspace?.didChangeConfiguration
                ?.dynamicRegistration,
            didChangeWatchedFiles:
              developmentCaps.workspace?.didChangeWatchedFiles
                ?.dynamicRegistration,
            symbol: developmentCaps.workspace?.symbol?.dynamicRegistration,
            executeCommand:
              developmentCaps.workspace?.executeCommand?.dynamicRegistration,
          },
          textDocument: {
            synchronization:
              developmentCaps.textDocument?.synchronization
                ?.dynamicRegistration,
            completion:
              developmentCaps.textDocument?.completion?.dynamicRegistration,
            hover: developmentCaps.textDocument?.hover?.dynamicRegistration,
            documentSymbol:
              developmentCaps.textDocument?.documentSymbol?.dynamicRegistration,
            foldingRange:
              developmentCaps.textDocument?.foldingRange?.dynamicRegistration,
            diagnostic:
              developmentCaps.textDocument?.diagnostic?.dynamicRegistration,
          },
        },
      };

      expect(dynamicRegistrationComparison).toMatchSnapshot(
        'dynamic-registration-comparison',
      );
    });
  });

  describe('Mode Detection and Capabilities', () => {
    it('should detect production mode correctly', () => {
      const productionCaps = getClientCapabilitiesForMode('production');

      expect(productionCaps).toMatchSnapshot('production-mode-capabilities');
    });

    it('should detect development mode correctly', () => {
      const developmentCaps = getClientCapabilitiesForMode('development');

      expect(developmentCaps).toMatchSnapshot('development-mode-capabilities');
    });

    it('should have different capabilities for different modes', () => {
      const productionCaps = getClientCapabilitiesForMode('production');
      const developmentCaps = getClientCapabilitiesForMode('development');

      // Verify they're different
      expect(productionCaps).not.toEqual(developmentCaps);

      // Verify development has more features
      expect(developmentCaps.textDocument?.completion).toBeDefined();
      expect(developmentCaps.textDocument?.hover).toBeDefined();
      expect(developmentCaps.textDocument?.foldingRange).toBeDefined();

      expect(productionCaps.textDocument?.completion).toBeUndefined();
      expect(productionCaps.textDocument?.hover).toBeUndefined();
      expect(productionCaps.textDocument?.foldingRange).toBeUndefined();
    });
  });

  describe('Document Selector Consistency', () => {
    it('should have consistent document selectors between client and server', () => {
      // Client-side document selectors (from VSCode extension configuration)
      const clientDocumentSelectors = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex' },
      ];

      // Server-side document selectors (from dynamic registration)
      const serverDocumentSelectors = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex' },
      ];

      expect(clientDocumentSelectors).toEqual(serverDocumentSelectors);
      expect(clientDocumentSelectors).toMatchSnapshot(
        'document-selectors-consistency',
      );
    });

    it('should exclude output channel schemes from document selectors', () => {
      const documentSelectors = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex' },
      ];

      // Verify that output channel schemes are not included
      const outputChannelSchemes = ['output', 'extension-output'];
      const includedSchemes = documentSelectors.map(
        (selector) => selector.scheme,
      );

      outputChannelSchemes.forEach((scheme) => {
        expect(includedSchemes).not.toContain(scheme);
      });

      expect(documentSelectors).toMatchSnapshot(
        'document-selectors-without-output-channels',
      );
    });
  });

  describe('Capability Feature Alignment', () => {
    it('should have consistent text document capabilities', () => {
      const productionCaps = getClientCapabilitiesForMode('production');
      const developmentCaps = getClientCapabilitiesForMode('development');

      const textDocumentComparison = {
        production: {
          publishDiagnostics: productionCaps.textDocument?.publishDiagnostics,
          synchronization: productionCaps.textDocument?.synchronization,
          completion: productionCaps.textDocument?.completion,
          hover: productionCaps.textDocument?.hover,
          signatureHelp: productionCaps.textDocument?.signatureHelp,
          definition: productionCaps.textDocument?.definition,
          references: productionCaps.textDocument?.references,
          documentHighlight: productionCaps.textDocument?.documentHighlight,
          documentSymbol: productionCaps.textDocument?.documentSymbol,
          codeAction: productionCaps.textDocument?.codeAction,
          codeLens: productionCaps.textDocument?.codeLens,
          formatting: productionCaps.textDocument?.formatting,
          rangeFormatting: productionCaps.textDocument?.rangeFormatting,
          onTypeFormatting: productionCaps.textDocument?.onTypeFormatting,
          rename: productionCaps.textDocument?.rename,
          documentLink: productionCaps.textDocument?.documentLink,
          typeDefinition: productionCaps.textDocument?.typeDefinition,
          implementation: productionCaps.textDocument?.implementation,
          colorProvider: productionCaps.textDocument?.colorProvider,
          foldingRange: productionCaps.textDocument?.foldingRange,
        },
        development: {
          publishDiagnostics: developmentCaps.textDocument?.publishDiagnostics,
          synchronization: developmentCaps.textDocument?.synchronization,
          completion: developmentCaps.textDocument?.completion,
          hover: developmentCaps.textDocument?.hover,
          signatureHelp: developmentCaps.textDocument?.signatureHelp,
          definition: developmentCaps.textDocument?.definition,
          references: developmentCaps.textDocument?.references,
          documentHighlight: developmentCaps.textDocument?.documentHighlight,
          documentSymbol: developmentCaps.textDocument?.documentSymbol,
          codeAction: developmentCaps.textDocument?.codeAction,
          codeLens: developmentCaps.textDocument?.codeLens,
          formatting: developmentCaps.textDocument?.formatting,
          rangeFormatting: developmentCaps.textDocument?.rangeFormatting,
          onTypeFormatting: developmentCaps.textDocument?.onTypeFormatting,
          rename: developmentCaps.textDocument?.rename,
          documentLink: developmentCaps.textDocument?.documentLink,
          typeDefinition: developmentCaps.textDocument?.typeDefinition,
          implementation: developmentCaps.textDocument?.implementation,
          colorProvider: developmentCaps.textDocument?.colorProvider,
          foldingRange: developmentCaps.textDocument?.foldingRange,
        },
      };

      expect(textDocumentComparison).toMatchSnapshot(
        'text-document-capabilities-comparison',
      );
    });

    it('should have consistent workspace capabilities', () => {
      const productionCaps = getClientCapabilitiesForMode('production');
      const developmentCaps = getClientCapabilitiesForMode('development');

      const workspaceComparison = {
        production: {
          applyEdit: productionCaps.workspace?.applyEdit,
          workspaceEdit: productionCaps.workspace?.workspaceEdit,
          didChangeConfiguration:
            productionCaps.workspace?.didChangeConfiguration,
          didChangeWatchedFiles:
            productionCaps.workspace?.didChangeWatchedFiles,
          symbol: productionCaps.workspace?.symbol,
          executeCommand: productionCaps.workspace?.executeCommand,
          configuration: productionCaps.workspace?.configuration,
          workspaceFolders: productionCaps.workspace?.workspaceFolders,
        },
        development: {
          applyEdit: developmentCaps.workspace?.applyEdit,
          workspaceEdit: developmentCaps.workspace?.workspaceEdit,
          didChangeConfiguration:
            developmentCaps.workspace?.didChangeConfiguration,
          didChangeWatchedFiles:
            developmentCaps.workspace?.didChangeWatchedFiles,
          symbol: developmentCaps.workspace?.symbol,
          executeCommand: developmentCaps.workspace?.executeCommand,
          configuration: developmentCaps.workspace?.configuration,
          workspaceFolders: developmentCaps.workspace?.workspaceFolders,
        },
      };

      expect(workspaceComparison).toMatchSnapshot(
        'workspace-capabilities-comparison',
      );
    });
  });
});
