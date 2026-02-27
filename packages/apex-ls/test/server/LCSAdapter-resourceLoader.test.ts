/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LCSAdapter } from '../../src/server/LCSAdapter';
import { LSPConfigurationManager } from '@salesforce/apex-lsp-shared';
import { Connection } from 'vscode-languageserver/browser';
import { ServerCapabilities } from 'vscode-languageserver-protocol';
import { ResourceLoader } from '@salesforce/apex-lsp-parser-ast';

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
  UniversalLoggerFactory: {
    getInstance: jest.fn(() => ({
      createLogger: jest.fn(() => ({
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      })),
    })),
  },
  ApexSettingsManager: {
    getInstance: jest.fn(() => ({})),
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
}));

// Mock the apex-parser-ast package with embedded ZIP support
// Only mock what's necessary for testing ResourceLoader initialization
jest.mock('@salesforce/apex-lsp-parser-ast', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-parser-ast');
  // Create mock ZIP buffer (ZIP magic bytes)
  const mockZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  return {
    ...actual, // Use real implementations for everything else
    ResourceLoader: {
      getInstance: jest.fn(() => ({
        setZipBuffer: jest.fn(),
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 100,
          namespaces: ['System', 'Database', 'Schema'],
        })),
        initialize: jest.fn().mockResolvedValue(undefined),
      })),
    },
    getEmbeddedStandardLibraryZip: jest.fn(() => mockZip),
    ApexSymbolManager: class MockApexSymbolManager {},
    ApexSymbolProcessingManager: class MockApexSymbolProcessingManager {
      static getInstance() {
        return new MockApexSymbolProcessingManager();
      }
      getSymbolManager() {
        return new (jest.requireMock(
          '@salesforce/apex-lsp-parser-ast',
        ).ApexSymbolManager)();
      }
    },
    // initializeValidators uses the real implementation from actual
  };
});

describe('LCSAdapter ResourceLoader Initialization', () => {
  let mockConnection: any;
  let mockConfigManager: jest.Mocked<LSPConfigurationManager>;
  let adapter: LCSAdapter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock connection
    mockConnection = {
      sendRequest: jest.fn(),
      onRequest: jest.fn(),
      onNotification: jest.fn(),
      onInitialize: jest.fn(),
      onInitialized: jest.fn(),
      onDidChangeConfiguration: jest.fn(),
      onDocumentSymbol: jest.fn(),
      onHover: jest.fn(),
      onCompletion: jest.fn(),
      languages: {
        foldingRange: {
          on: jest.fn(),
        },
        diagnostics: {
          on: jest.fn(),
        },
      },
      workspace: {
        getConfiguration: jest.fn().mockResolvedValue({}),
        onDidChangeWorkspaceFolders: jest.fn(),
        onDidDeleteFiles: jest.fn(),
      },
      console: {
        log: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    };

    // Mock LSPConfigurationManager
    mockConfigManager = {
      getInstance: jest.fn(),
      getSettingsManager: jest.fn(() => ({})),
      getCapabilities: jest.fn(),
      getSettings: jest.fn(() => ({})),
      getCapabilitiesManager: jest.fn(() => ({
        getMode: jest.fn(() => 'production'),
      })),
      getExtendedServerCapabilities: jest.fn(() => ({})),
    } as unknown as jest.Mocked<LSPConfigurationManager>;

    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
      mockConfigManager,
    );

    // Create adapter instance
    // @ts-expect-error - LCSAdapter is not exported from the package
    adapter = new LCSAdapter({
      connection: mockConnection as Connection,
    });
  });

  describe('initializeResourceLoader', () => {
    it('should initialize ResourceLoader with protobuf cache', async () => {
      const mockResourceLoader = {
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 100,
          namespaces: ['System', 'Database', 'Schema'],
        })),
        initialize: jest.fn().mockResolvedValue(undefined),
        isStandardLibrarySymbolDataLoaded: jest.fn(() => true),
      };

      (ResourceLoader.getInstance as jest.Mock).mockReturnValue(
        mockResourceLoader,
      );

      await (adapter as any).initializeResourceLoader();

      // Verify ResourceLoader.getInstance was called
      expect(ResourceLoader.getInstance).toHaveBeenCalled();
    });

    it('should call initialize on ResourceLoader', async () => {
      const mockResourceLoader = {
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 100,
          namespaces: ['System'],
        })),
        initialize: jest.fn().mockResolvedValue(undefined),
        isStandardLibrarySymbolDataLoaded: jest.fn(() => true),
      };

      (ResourceLoader.getInstance as jest.Mock).mockReturnValue(
        mockResourceLoader,
      );

      await (adapter as any).initializeResourceLoader();

      // Verify initialize was called (it handles both protobuf cache and ZIP loading internally)
      expect(mockResourceLoader.initialize).toHaveBeenCalled();
    });

    it('should log statistics after successful initialization', async () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      // @ts-expect-error - LCSAdapter is not exported from the package
      const adapterWithLogger = new LCSAdapter({
        connection: mockConnection as Connection,
        logger: mockLogger,
      });

      const mockResourceLoader = {
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 100,
          namespaces: ['System', 'Database'],
        })),
        initialize: jest.fn().mockResolvedValue(undefined),
        isStandardLibrarySymbolDataLoaded: jest.fn(() => true),
      };

      (ResourceLoader.getInstance as jest.Mock).mockReturnValue(
        mockResourceLoader,
      );

      await (adapterWithLogger as any).initializeResourceLoader();

      // Verify debug logs were called (accepting either string or function)
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      // @ts-expect-error - LCSAdapter is not exported from the package
      const adapterWithLogger = new LCSAdapter({
        connection: mockConnection as Connection,
        logger: mockLogger,
      });

      const mockResourceLoader = {
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 0,
          namespaces: [],
        })),
        initialize: jest
          .fn()
          .mockRejectedValue(
            new Error('Standard library symbol data cache not available'),
          ),
        isStandardLibrarySymbolDataLoaded: jest.fn(() => false),
      };

      (ResourceLoader.getInstance as jest.Mock).mockReturnValue(
        mockResourceLoader,
      );

      // Should not throw, but should log warning
      await expect(
        (adapterWithLogger as any).initializeResourceLoader(),
      ).resolves.not.toThrow();

      // Verify warning was logged
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('Integration with LCSAdapter lifecycle', () => {
    it('should call initializeResourceLoader during handleInitialized', async () => {
      // Mock the capabilities to avoid errors in registerDynamicCapabilities
      // Using Partial<ServerCapabilities> since we're only providing a subset for testing
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
      } as Partial<ServerCapabilities> as ServerCapabilities);

      // Spy on the private method
      const initResourceLoaderSpy = jest.spyOn(
        adapter as any,
        'initializeResourceLoader',
      );

      // Trigger the initialized event handler
      const onInitializedHandler =
        mockConnection.onInitialized.mock.calls[0][0];
      await onInitializedHandler();

      // Verify initializeResourceLoader was called
      expect(initResourceLoaderSpy).toHaveBeenCalled();
    });

    it('should handle ResourceLoader initialization successfully', async () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      // @ts-expect-error - LCSAdapter is not exported from the package
      const adapterWithLogger = new LCSAdapter({
        connection: mockConnection as Connection,
        logger: mockLogger,
      });

      const mockResourceLoader = {
        initialize: jest.fn().mockResolvedValue(undefined),
      };

      (ResourceLoader.getInstance as jest.Mock).mockReturnValue(
        mockResourceLoader,
      );

      // Should not throw - ResourceLoader handles all artifact loading internally
      await expect(
        (adapterWithLogger as any).initializeResourceLoader(),
      ).resolves.not.toThrow();

      // Initialize was called (handles both protobuf cache and ZIP loading internally)
      expect(mockResourceLoader.initialize).toHaveBeenCalled();
    });
  });
});
