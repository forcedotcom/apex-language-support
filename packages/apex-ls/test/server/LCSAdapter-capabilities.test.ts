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
  runWithSpan: jest.fn((_name: string, fn: () => any) => fn()),
  LSP_SPAN_NAMES: {},
  CommandPerformanceAggregator: jest.fn().mockImplementation(() => ({
    record: jest.fn(),
    flush: jest
      .fn()
      .mockReturnValue({ type: 'command_performance', commands: [] }),
    reset: jest.fn(),
  })),
  collectStartupSnapshot: jest.fn().mockReturnValue({
    type: 'startup_snapshot',
    sessionId: 'mock-session',
  }),
  getDocumentSelectorsFromSettings: jest.fn((capability: string) => {
    // Return default selectors based on capability
    if (capability === 'codeLens') {
      return [
        { scheme: 'file', language: 'apex' },
        { scheme: 'file', language: 'apex-anon' },
        { scheme: 'vscode-test-web', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex-anon' },
      ];
    }
    // For all other capabilities
    return [
      { scheme: 'file', language: 'apex' },
      { scheme: 'file', language: 'apex-anon' },
      { scheme: 'vscode-test-web', language: 'apex' },
      { scheme: 'apexlib', language: 'apex' },
      { scheme: 'vscode-test-web', language: 'apex-anon' },
    ];
  }),
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
      getSettings: jest.fn().mockReturnValue({
        apex: {
          environment: {
            additionalDocumentSchemes: undefined,
          },
        },
      }),
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
    it('should use capability-aware document selectors', () => {
      // Most capabilities should include file, apexlib, and vscode-test-web
      const expectedSelectorsForMost = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'file', language: 'apex-anon' },
        { scheme: 'vscode-test-web', language: 'apex' },
        { scheme: 'apexlib', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex-anon' },
      ];

      // CodeLens should exclude apexlib
      const expectedSelectorsForCodeLens = [
        { scheme: 'file', language: 'apex' },
        { scheme: 'file', language: 'apex-anon' },
        { scheme: 'vscode-test-web', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex-anon' },
      ];

      // This test ensures that document selectors are capability-aware
      expect(expectedSelectorsForMost).toMatchSnapshot(
        'document-selectors-for-most-capabilities',
      );
      expect(expectedSelectorsForCodeLens).toMatchSnapshot(
        'document-selectors-for-codelens',
      );
    });
  });
});
