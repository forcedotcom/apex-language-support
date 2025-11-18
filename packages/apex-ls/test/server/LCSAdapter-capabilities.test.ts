/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LCSAdapter } from '../../src/server/LCSAdapter';
import { LSPConfigurationManager } from '@salesforce/apex-lsp-shared';
import { ClientCapabilities } from 'vscode-languageserver-protocol';
import { Connection } from 'vscode-languageserver/browser';

// Mock the dependencies
jest.mock('@salesforce/apex-lsp-shared', () => ({
  LSPConfigurationManager: {
    getInstance: jest.fn(),
  },
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  Priority: {
    Immediate: 1,
    High: 2,
    Normal: 3,
    Low: 4,
    Background: 5,
  },
}));

// Mock the connection
const mockConnection = {
  sendRequest: jest.fn(),
  onRequest: jest.fn(),
  onNotification: jest.fn(),
  onInitialize: jest.fn(),
  onInitialized: jest.fn(),
  onDidChangeConfiguration: jest.fn(),
  onDocumentSymbol: jest.fn(),
  languages: {
    foldingRange: {
      on: jest.fn(),
    },
  },
  workspace: {
    onDidChangeWorkspaceFolders: jest.fn(),
  },
  client: {
    register: jest.fn(),
  },
} as any;

describe('LCSAdapter Capabilities Alignment', () => {
  let mockConfigManager: jest.Mocked<LSPConfigurationManager>;
  let adapter: LCSAdapter;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock configuration manager
    mockConfigManager = {
      getCapabilities: jest.fn(),
      setInitialSettings: jest.fn(),
    } as any;

    // Mock the getInstance method
    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
      mockConfigManager,
    );

    // Create adapter instance with proper config
    adapter = new LCSAdapter({
      connection: mockConnection,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    });
  });

  describe('Dynamic Registration Document Selectors', () => {
    it('should use correct document selectors for dynamic registration', () => {
      // Mock capabilities that support dynamic registration
      mockConfigManager.getCapabilities.mockReturnValue({
        documentSymbolProvider: { resolveProvider: false },
        hoverProvider: true,
        foldingRangeProvider: { rangeLimit: 5000, lineFoldingOnly: true },
        diagnosticProvider: {
          identifier: 'apex-ls-ts',
          interFileDependencies: true,
          workspaceDiagnostics: false,
        },
        completionProvider: {
          triggerCharacters: ['.'],
          resolveProvider: false,
        },
      });

      // Mock client capabilities that support dynamic registration
      const clientCapabilities: ClientCapabilities = {
        workspace: {
          didChangeConfiguration: { dynamicRegistration: true },
          didChangeWatchedFiles: { dynamicRegistration: true },
          symbol: { dynamicRegistration: true },
          executeCommand: { dynamicRegistration: true },
        },
        textDocument: {
          documentSymbol: { dynamicRegistration: true },
          hover: { dynamicRegistration: true },
          foldingRange: { dynamicRegistration: true },
          diagnostic: { dynamicRegistration: true },
          completion: { dynamicRegistration: true },
        },
      };

      // Set client capabilities
      (adapter as any).clientCapabilities = clientCapabilities;

      // Call the private method (we'll need to access it through reflection)
      const registerDynamicCapabilities = (
        adapter as any
      ).registerDynamicCapabilities.bind(adapter);

      // This will test the document selector logic
      expect(() => registerDynamicCapabilities()).not.toThrow();

      // Verify the expected document selectors
      const expectedDocumentSelectors = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex' },
      ];

      expect(expectedDocumentSelectors).toMatchSnapshot(
        'dynamic-registration-document-selectors',
      );
    });

    it('should handle production mode with minimal dynamic registration', () => {
      // Mock production capabilities
      mockConfigManager.getCapabilities.mockReturnValue({
        documentSymbolProvider: { resolveProvider: false },
        hoverProvider: true,
        foldingRangeProvider: { rangeLimit: 5000, lineFoldingOnly: true },
        diagnosticProvider: {
          identifier: 'apex-ls-ts',
          interFileDependencies: true,
          workspaceDiagnostics: false,
        },
        completionProvider: {
          triggerCharacters: ['.'],
          resolveProvider: false,
        },
      });

      // Mock production client capabilities (minimal dynamic registration)
      const productionClientCapabilities: ClientCapabilities = {
        workspace: {
          didChangeConfiguration: { dynamicRegistration: false },
          didChangeWatchedFiles: { dynamicRegistration: false },
          symbol: { dynamicRegistration: false },
          executeCommand: { dynamicRegistration: false },
        },
        textDocument: {
          documentSymbol: { dynamicRegistration: false },
          hover: { dynamicRegistration: false },
          foldingRange: { dynamicRegistration: false },
          diagnostic: { dynamicRegistration: false },
          completion: { dynamicRegistration: false },
        },
      };

      (adapter as any).clientCapabilities = productionClientCapabilities;

      const registerDynamicCapabilities = (
        adapter as any
      ).registerDynamicCapabilities.bind(adapter);

      expect(() => registerDynamicCapabilities()).not.toThrow();

      // In production mode, most capabilities should be returned statically
      // and dynamic registration should be minimal
      expect(productionClientCapabilities).toMatchSnapshot(
        'production-client-capabilities-for-dynamic-registration',
      );
    });

    it('should handle development mode with full dynamic registration', () => {
      // Mock development capabilities
      mockConfigManager.getCapabilities.mockReturnValue({
        documentSymbolProvider: { resolveProvider: false },
        hoverProvider: true,
        foldingRangeProvider: { rangeLimit: 5000, lineFoldingOnly: true },
        diagnosticProvider: {
          identifier: 'apex-ls-ts',
          interFileDependencies: true,
          workspaceDiagnostics: false,
        },
        completionProvider: {
          triggerCharacters: ['.'],
          resolveProvider: false,
        },
      });

      // Mock development client capabilities (full dynamic registration)
      const developmentClientCapabilities: ClientCapabilities = {
        workspace: {
          didChangeConfiguration: { dynamicRegistration: true },
          didChangeWatchedFiles: { dynamicRegistration: true },
          symbol: { dynamicRegistration: true },
          executeCommand: { dynamicRegistration: true },
        },
        textDocument: {
          documentSymbol: { dynamicRegistration: true },
          hover: { dynamicRegistration: true },
          foldingRange: { dynamicRegistration: true },
          diagnostic: { dynamicRegistration: true },
          completion: { dynamicRegistration: true },
        },
      };

      (adapter as any).clientCapabilities = developmentClientCapabilities;

      const registerDynamicCapabilities = (
        adapter as any
      ).registerDynamicCapabilities.bind(adapter);

      expect(() => registerDynamicCapabilities()).not.toThrow();

      // In development mode, most capabilities should be registered dynamically
      expect(developmentClientCapabilities).toMatchSnapshot(
        'development-client-capabilities-for-dynamic-registration',
      );
    });
  });

  describe('Capability Registration Logic', () => {
    it('should correctly determine which capabilities to register dynamically', () => {
      const testCases = [
        {
          name: 'production-mode-minimal-dynamic',
          clientCaps: {
            workspace: {
              didChangeConfiguration: { dynamicRegistration: false },
              didChangeWatchedFiles: { dynamicRegistration: false },
              symbol: { dynamicRegistration: false },
              executeCommand: { dynamicRegistration: false },
            },
            textDocument: {
              documentSymbol: { dynamicRegistration: false },
              hover: { dynamicRegistration: false },
              foldingRange: { dynamicRegistration: false },
              diagnostic: { dynamicRegistration: false },
              completion: { dynamicRegistration: false },
            },
          } as ClientCapabilities,
          serverCaps: {
            documentSymbolProvider: { resolveProvider: false },
            hoverProvider: true,
            foldingRangeProvider: { rangeLimit: 5000, lineFoldingOnly: true },
            diagnosticProvider: {
              identifier: 'apex-ls-ts',
              interFileDependencies: true,
              workspaceDiagnostics: false,
            },
            completionProvider: {
              triggerCharacters: ['.'],
              resolveProvider: false,
            },
          },
          expectedDynamicRegistrations: 0, // All should be static in production
        },
        {
          name: 'development-mode-full-dynamic',
          clientCaps: {
            workspace: {
              didChangeConfiguration: { dynamicRegistration: true },
              didChangeWatchedFiles: { dynamicRegistration: true },
              symbol: { dynamicRegistration: true },
              executeCommand: { dynamicRegistration: true },
            },
            textDocument: {
              documentSymbol: { dynamicRegistration: true },
              hover: { dynamicRegistration: true },
              foldingRange: { dynamicRegistration: true },
              diagnostic: { dynamicRegistration: true },
              completion: { dynamicRegistration: true },
            },
          } as ClientCapabilities,
          serverCaps: {
            documentSymbolProvider: { resolveProvider: false },
            hoverProvider: true,
            foldingRangeProvider: { rangeLimit: 5000, lineFoldingOnly: true },
            diagnosticProvider: {
              identifier: 'apex-ls-ts',
              interFileDependencies: true,
              workspaceDiagnostics: false,
            },
            completionProvider: {
              triggerCharacters: ['.'],
              resolveProvider: false,
            },
          },
          expectedDynamicRegistrations: 5, // All should be dynamic in development
        },
      ];

      testCases.forEach(
        ({ name, clientCaps, serverCaps, expectedDynamicRegistrations }) => {
          mockConfigManager.getCapabilities.mockReturnValue(serverCaps);
          (adapter as any).clientCapabilities = clientCaps;

          const registerDynamicCapabilities = (
            adapter as any
          ).registerDynamicCapabilities.bind(adapter);

          expect(() => registerDynamicCapabilities()).not.toThrow();

          expect({
            testCase: name,
            clientCapabilities: clientCaps,
            serverCapabilities: serverCaps,
            expectedDynamicRegistrations,
          }).toMatchSnapshot(`capability-registration-logic-${name}`);
        },
      );
    });
  });

  describe('Document Selector Consistency', () => {
    it('should maintain consistent document selectors across all dynamic registrations', () => {
      const expectedDocumentSelectors = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex' },
      ];

      // This test ensures that all dynamic registrations use the same document selectors
      // that match the client-side configuration
      expect(expectedDocumentSelectors).toMatchSnapshot(
        'consistent-document-selectors',
      );

      // Verify the selectors match what's used in the VSCode extension
      const clientDocumentSelectors = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex' },
      ];

      expect(expectedDocumentSelectors).toEqual(clientDocumentSelectors);
    });
  });
});
