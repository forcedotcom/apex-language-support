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

// Mock embedded ZIP buffer
const mockEmbeddedZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP magic bytes

// Mock the apex-parser-ast package with embedded ZIP support
jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
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
  getEmbeddedStandardLibraryZip: jest.fn(() => mockEmbeddedZip),
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
}));

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
        onDidChangeWorkspaceFolders: jest.fn(),
        onDidDeleteFiles: jest.fn(),
        onDidCreateFiles: jest.fn(),
        onDidRenameFiles: jest.fn(),
      },
      client: {
        register: jest.fn(),
      },
    } as any;

    // Create mock settings manager
    const mockSettingsManager = {
      getResourceLoadMode: jest.fn().mockReturnValue('lazy'),
    };

    // Create mock capabilities manager
    const mockCapabilitiesManager = {
      getMode: jest.fn().mockReturnValue('production'),
    };

    // Create mock configuration manager
    mockConfigManager = {
      getCapabilities: jest.fn(),
      getExtendedServerCapabilities: jest.fn().mockReturnValue({
        experimental: {
          profilingProvider: { enabled: false },
        },
      }),
      setInitialSettings: jest.fn(),
      getSettingsManager: jest.fn().mockReturnValue(mockSettingsManager),
      getCapabilitiesManager: jest
        .fn()
        .mockReturnValue(mockCapabilitiesManager),
      getRuntimePlatform: jest.fn().mockReturnValue('desktop'),
      getSettings: jest.fn().mockReturnValue({
        apex: {
          environment: {
            profilingMode: 'none',
            profilingType: 'cpu',
          },
        },
      }),
    } as any;

    // Mock the getInstance method
    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
      mockConfigManager,
    );

    // Create adapter instance
    adapter = new LCSAdapter({
      connection: mockConnection as Connection,
      logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      },
    });
  });

  describe('initializeResourceLoader with embedded ZIP', () => {
    it('should use embedded ZIP without requesting from client', async () => {
      // Call the private method using reflection
      await (adapter as any).initializeResourceLoader();

      // Verify that NO sendRequest was made (ZIP is embedded, not transferred)
      expect(mockConnection.sendRequest).not.toHaveBeenCalledWith(
        'apex/provideStandardLibrary',
        expect.anything(),
      );

      // Verify that ResourceLoader was initialized with the embedded ZIP
      const { ResourceLoader } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );
      expect(ResourceLoader.getInstance).toHaveBeenCalledWith({
        loadMode: 'lazy',
        preloadStdClasses: true,
      });
    });

    it('should call setZipBuffer with embedded ZIP data', async () => {
      const { ResourceLoader } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );
      const mockResourceLoader = {
        setZipBuffer: jest.fn(),
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 100,
          namespaces: ['System'],
        })),
        initialize: jest.fn().mockResolvedValue(undefined),
      };

      (ResourceLoader.getInstance as jest.Mock).mockReturnValue(
        mockResourceLoader,
      );

      await (adapter as any).initializeResourceLoader();

      // Verify setZipBuffer was called with the embedded Uint8Array
      expect(mockResourceLoader.setZipBuffer).toHaveBeenCalled();
      const callArg = mockResourceLoader.setZipBuffer.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(Uint8Array);
      expect(callArg).toEqual(mockEmbeddedZip);
    });

    it('should handle missing embedded ZIP gracefully', async () => {
      const { getEmbeddedStandardLibraryZip } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );

      // Mock the function to return undefined
      (getEmbeddedStandardLibraryZip as jest.Mock).mockReturnValueOnce(
        undefined,
      );

      // Call the private method - should not throw
      await expect(
        (adapter as any).initializeResourceLoader(),
      ).resolves.not.toThrow();
    });

    it('should call initialize on ResourceLoader after setting ZIP buffer', async () => {
      const { ResourceLoader } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );
      const mockResourceLoader = {
        setZipBuffer: jest.fn(),
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 100,
          namespaces: ['System'],
        })),
        initialize: jest.fn().mockResolvedValue(undefined),
      };

      (ResourceLoader.getInstance as jest.Mock).mockReturnValue(
        mockResourceLoader,
      );

      await (adapter as any).initializeResourceLoader();

      // Verify the sequence of calls
      expect(mockResourceLoader.setZipBuffer).toHaveBeenCalled();
      expect(mockResourceLoader.getDirectoryStatistics).toHaveBeenCalled();
      expect(mockResourceLoader.initialize).toHaveBeenCalled();
    });

    it('should log statistics after successful ZIP loading', async () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const adapterWithLogger = new LCSAdapter({
        connection: mockConnection as Connection,
        logger: mockLogger,
      });

      await (adapterWithLogger as any).initializeResourceLoader();

      // Verify that success was logged with statistics
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.any(Function), // Logger uses function for lazy evaluation
      );

      // Verify the actual logged message contains statistics
      const debugCall = mockLogger.debug.mock.calls.find((call: any[]) => {
        const logFn = call[0];
        return (
          typeof logFn === 'function' &&
          logFn().includes('Standard library resources loaded successfully')
        );
      });

      expect(debugCall).toBeDefined();
    });

    it('should log message about using embedded ZIP', async () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const adapterWithLogger = new LCSAdapter({
        connection: mockConnection as Connection,
        logger: mockLogger,
      });

      await (adapterWithLogger as any).initializeResourceLoader();

      // Verify the embedded ZIP message was logged
      const debugCall = mockLogger.debug.mock.calls.find((call: any[]) => {
        const logFn = call[0];
        return (
          typeof logFn === 'function' &&
          logFn().includes('Using embedded Standard Apex Library ZIP')
        );
      });

      expect(debugCall).toBeDefined();
    });
  });

  describe('Integration with LCSAdapter lifecycle', () => {
    it('should call initializeResourceLoader during handleInitialized', async () => {
      // Mock the capabilities to avoid errors in registerDynamicCapabilities
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

      // Spy on the private method
      const initResourceLoaderSpy = jest.spyOn(
        adapter as any,
        'initializeResourceLoader',
      );

      // Trigger the initialized event
      const onInitializedHandler =
        mockConnection.onInitialized.mock.calls[0][0];
      await onInitializedHandler();

      // Verify initializeResourceLoader was called
      expect(initResourceLoaderSpy).toHaveBeenCalled();
    });
  });
});
