/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Mock, Mocked } from 'vitest';
import { vi } from 'vitest';
import { LCSAdapter } from '../../src/server/LCSAdapter';
import { LSPConfigurationManager } from '@salesforce/apex-lsp-shared';
import { Connection } from 'vscode-languageserver/browser';
import { ServerCapabilities } from 'vscode-languageserver-protocol';
import { ResourceLoader } from '@salesforce/apex-lsp-parser-ast';

// Mock the dependencies
vi.mock('@salesforce/apex-lsp-shared', () => ({
  LSPConfigurationManager: {
    getInstance: vi.fn(),
  },
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
  Priority: {
    Immediate: 1,
    High: 2,
    Normal: 3,
    Low: 4,
    Background: 5,
  },
  UniversalLoggerFactory: {
    getInstance: vi.fn(() => ({
      createLogger: vi.fn(() => ({
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      })),
    })),
  },
  ApexSettingsManager: {
    getInstance: vi.fn(() => ({})),
  },
  runWithSpan: vi.fn((_name: string, fn: () => any) => fn()),
  LSP_SPAN_NAMES: {},
  CommandPerformanceAggregator: class {
    record = vi.fn();
    flush = vi
      .fn()
      .mockReturnValue({ type: 'command_performance', commands: [] });
    reset = vi.fn();
  },
  collectStartupSnapshot: vi.fn().mockReturnValue({
    type: 'startup_snapshot',
    sessionId: 'mock-session',
  }),
}));

// Mock the apex-parser-ast package with embedded ZIP support
// Only mock what's necessary for testing ResourceLoader initialization
vi.mock('@salesforce/apex-lsp-parser-ast', async () => {
  const actual = await vi.importActual('@salesforce/apex-lsp-parser-ast');
  // Create mock ZIP buffer (ZIP magic bytes)
  const mockZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
  return {
    ...actual, // Use real implementations for everything else
    ResourceLoader: {
      getInstance: vi.fn(() => ({
        setZipBuffer: vi.fn(),
        getDirectoryStatistics: vi.fn(() => ({
          totalFiles: 100,
          namespaces: ['System', 'Database', 'Schema'],
        })),
        initialize: vi.fn().mockResolvedValue(undefined),
      })),
    },
    getEmbeddedStandardLibraryZip: vi.fn(() => mockZip),
    ApexSymbolManager: class MockApexSymbolManager {},
    ApexSymbolProcessingManager: class MockApexSymbolProcessingManager {
      static getInstance() {
        return new MockApexSymbolProcessingManager();
      }
      getSymbolManager() {
        return {};
      }
    },
    // initializeValidators uses the real implementation from actual
  };
});

describe('LCSAdapter ResourceLoader Initialization', () => {
  let mockConnection: any;
  let mockConfigManager: Mocked<LSPConfigurationManager>;
  let adapter: LCSAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock connection
    mockConnection = {
      sendRequest: vi.fn(),
      onRequest: vi.fn(),
      onNotification: vi.fn(),
      onInitialize: vi.fn(),
      onInitialized: vi.fn(),
      onDidChangeConfiguration: vi.fn(),
      onDocumentSymbol: vi.fn(),
      onHover: vi.fn(),
      onCompletion: vi.fn(),
      languages: {
        foldingRange: {
          on: vi.fn(),
        },
        diagnostics: {
          on: vi.fn(),
        },
      },
      workspace: {
        getConfiguration: vi.fn().mockResolvedValue({}),
        onDidChangeWorkspaceFolders: vi.fn(),
        onDidDeleteFiles: vi.fn(),
      },
      console: {
        log: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
    };

    // Mock LSPConfigurationManager
    mockConfigManager = {
      getInstance: vi.fn(),
      getSettingsManager: vi.fn(() => ({})),
      getCapabilities: vi.fn(),
      getSettings: vi.fn(() => ({})),
      getCapabilitiesManager: vi.fn(() => ({
        getMode: vi.fn(() => 'production'),
      })),
      getExtendedServerCapabilities: vi.fn(() => ({})),
    } as unknown as Mocked<LSPConfigurationManager>;

    (LSPConfigurationManager.getInstance as Mock).mockReturnValue(
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
        getDirectoryStatistics: vi.fn(() => ({
          totalFiles: 100,
          namespaces: ['System', 'Database', 'Schema'],
        })),
        initialize: vi.fn().mockResolvedValue(undefined),
        isStandardLibrarySymbolDataLoaded: vi.fn(() => true),
      };

      (ResourceLoader.getInstance as Mock).mockReturnValue(mockResourceLoader);

      await (adapter as any).initializeResourceLoader();

      // Verify ResourceLoader.getInstance was called
      expect(ResourceLoader.getInstance).toHaveBeenCalled();
    });

    it('should call initialize on ResourceLoader', async () => {
      const mockResourceLoader = {
        getDirectoryStatistics: vi.fn(() => ({
          totalFiles: 100,
          namespaces: ['System'],
        })),
        initialize: vi.fn().mockResolvedValue(undefined),
        isStandardLibrarySymbolDataLoaded: vi.fn(() => true),
      };

      (ResourceLoader.getInstance as Mock).mockReturnValue(mockResourceLoader);

      await (adapter as any).initializeResourceLoader();

      // Verify initialize was called (it handles both protobuf cache and ZIP loading internally)
      expect(mockResourceLoader.initialize).toHaveBeenCalled();
    });

    it('should log statistics after successful initialization', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      // @ts-expect-error - LCSAdapter is not exported from the package
      const adapterWithLogger = new LCSAdapter({
        connection: mockConnection as Connection,
        logger: mockLogger,
      });

      const mockResourceLoader = {
        getDirectoryStatistics: vi.fn(() => ({
          totalFiles: 100,
          namespaces: ['System', 'Database'],
        })),
        initialize: vi.fn().mockResolvedValue(undefined),
        isStandardLibrarySymbolDataLoaded: vi.fn(() => true),
      };

      (ResourceLoader.getInstance as Mock).mockReturnValue(mockResourceLoader);

      await (adapterWithLogger as any).initializeResourceLoader();

      // Verify debug logs were called (accepting either string or function)
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      // @ts-expect-error - LCSAdapter is not exported from the package
      const adapterWithLogger = new LCSAdapter({
        connection: mockConnection as Connection,
        logger: mockLogger,
      });

      const mockResourceLoader = {
        getDirectoryStatistics: vi.fn(() => ({
          totalFiles: 0,
          namespaces: [],
        })),
        initialize: vi
          .fn()
          .mockRejectedValue(
            new Error('Standard library symbol data cache not available'),
          ),
        isStandardLibrarySymbolDataLoaded: vi.fn(() => false),
      };

      (ResourceLoader.getInstance as Mock).mockReturnValue(mockResourceLoader);

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
      const initResourceLoaderSpy = vi.spyOn(
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

    it('should initialize the local ResourceLoader before local graph preloading', async () => {
      mockConfigManager.getCapabilities.mockReturnValue({
        documentSymbolProvider: { resolveProvider: false },
      } as Partial<ServerCapabilities> as ServerCapabilities);

      let releaseInitialization!: () => void;
      const initializationPending = new Promise<void>((resolve) => {
        releaseInitialization = resolve;
      });
      const initResourceLoaderSpy = vi
        .spyOn(adapter as any, 'initializeResourceLoader')
        .mockReturnValue(initializationPending);
      const prePopulateSpy = vi
        .spyOn(adapter as any, 'prePopulateSymbolGraph')
        .mockResolvedValue(undefined);

      const onInitializedHandler =
        mockConnection.onInitialized.mock.calls[0][0];
      await onInitializedHandler();

      expect(initResourceLoaderSpy).toHaveBeenCalledTimes(1);
      expect(prePopulateSpy).not.toHaveBeenCalled();

      releaseInitialization();
      await initializationPending;
      await Promise.resolve();

      expect(prePopulateSpy).toHaveBeenCalledTimes(1);
    });

    it('should not initialize coordinator-local stdlib when worker topology is active', async () => {
      mockConfigManager.getCapabilities.mockReturnValue({
        documentSymbolProvider: { resolveProvider: false },
      } as Partial<ServerCapabilities> as ServerCapabilities);
      (adapter as any).workerDispatcher = {};
      const initResourceLoaderSpy = vi.spyOn(
        adapter as any,
        'initializeResourceLoader',
      );
      const prePopulateSpy = vi.spyOn(adapter as any, 'prePopulateSymbolGraph');

      const onInitializedHandler =
        mockConnection.onInitialized.mock.calls[0][0];
      await onInitializedHandler();

      expect(initResourceLoaderSpy).not.toHaveBeenCalled();
      expect(prePopulateSpy).not.toHaveBeenCalled();
    });

    it('should handle ResourceLoader initialization successfully', async () => {
      const mockLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      // @ts-expect-error - LCSAdapter is not exported from the package
      const adapterWithLogger = new LCSAdapter({
        connection: mockConnection as Connection,
        logger: mockLogger,
      });

      const mockResourceLoader = {
        initialize: vi.fn().mockResolvedValue(undefined),
      };

      (ResourceLoader.getInstance as Mock).mockReturnValue(mockResourceLoader);

      // Should not throw - ResourceLoader handles all artifact loading internally
      await expect(
        (adapterWithLogger as any).initializeResourceLoader(),
      ).resolves.not.toThrow();

      // Initialize was called (handles both protobuf cache and ZIP loading internally)
      expect(mockResourceLoader.initialize).toHaveBeenCalled();
    });
  });
});
