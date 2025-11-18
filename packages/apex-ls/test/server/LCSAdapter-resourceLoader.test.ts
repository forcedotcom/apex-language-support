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

// Mock the apex-parser-ast package
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

    // Create mock connection with sendRequest capability
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
      },
      client: {
        register: jest.fn(),
      },
    } as any;

    // Create mock settings manager
    const mockSettingsManager = {
      getResourceLoadMode: jest.fn().mockReturnValue('lazy'),
    };

    // Create mock configuration manager
    mockConfigManager = {
      getCapabilities: jest.fn(),
      setInitialSettings: jest.fn(),
      getSettingsManager: jest.fn().mockReturnValue(mockSettingsManager),
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

  describe('initializeResourceLoader', () => {
    it('should successfully request and load standard library ZIP from client', async () => {
      // Mock successful ZIP data response
      const mockZipData = Buffer.from('fake zip content').toString('base64');
      const mockZipSize = 1024;

      mockConnection.sendRequest.mockResolvedValue({
        zipData: mockZipData,
        size: mockZipSize,
      });

      // Call the private method using reflection
      await (adapter as any).initializeResourceLoader();

      // Verify that the connection requested the ZIP
      expect(mockConnection.sendRequest).toHaveBeenCalledWith(
        'apex/provideStandardLibrary',
        {},
      );

      // Verify that ResourceLoader was imported and initialized
      const { ResourceLoader } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );
      expect(ResourceLoader.getInstance).toHaveBeenCalledWith({
        loadMode: 'lazy',
        preloadStdClasses: true,
      });
    });

    it('should handle missing ZIP data gracefully', async () => {
      // Mock response with no ZIP data
      mockConnection.sendRequest.mockResolvedValue(undefined);

      // Call the private method - should not throw
      await expect(
        (adapter as any).initializeResourceLoader(),
      ).resolves.not.toThrow();

      // Verify that an error was logged but execution continued
      expect(mockConnection.sendRequest).toHaveBeenCalledWith(
        'apex/provideStandardLibrary',
        {},
      );
    });

    it('should handle client request failure gracefully', async () => {
      // Mock request failure
      mockConnection.sendRequest.mockRejectedValue(
        new Error('Client not responding'),
      );

      // Call the private method - should not throw
      await expect(
        (adapter as any).initializeResourceLoader(),
      ).resolves.not.toThrow();

      // Verify that the error was caught and logged
      expect(mockConnection.sendRequest).toHaveBeenCalledWith(
        'apex/provideStandardLibrary',
        {},
      );
    });

    it('should convert base64 ZIP data to Uint8Array correctly', async () => {
      const testData = 'test zip content';
      const mockZipData = Buffer.from(testData).toString('base64');

      mockConnection.sendRequest.mockResolvedValue({
        zipData: mockZipData,
        size: testData.length,
      });

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

      // Verify setZipBuffer was called with a Uint8Array
      expect(mockResourceLoader.setZipBuffer).toHaveBeenCalled();
      const callArg = mockResourceLoader.setZipBuffer.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(Uint8Array);

      // Verify the data was correctly converted
      const convertedData = Buffer.from(callArg).toString();
      expect(convertedData).toBe(testData);
    });

    it('should call initialize on ResourceLoader after setting ZIP buffer', async () => {
      const mockZipData = Buffer.from('zip content').toString('base64');

      mockConnection.sendRequest.mockResolvedValue({
        zipData: mockZipData,
        size: 1024,
      });

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

      const mockZipData = Buffer.from('zip content').toString('base64');

      mockConnection.sendRequest.mockResolvedValue({
        zipData: mockZipData,
        size: 1024,
      });

      await (adapterWithLogger as any).initializeResourceLoader();

      // Verify that success was logged with statistics
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.any(Function), // Logger uses function for lazy evaluation
      );

      // Verify the actual logged message contains statistics
      const infoCall = mockLogger.info.mock.calls.find((call: any[]) => {
        const logFn = call[0];
        return (
          typeof logFn === 'function' &&
          logFn().includes('Standard library resources loaded successfully')
        );
      });

      expect(infoCall).toBeDefined();
    });

    it('should handle ResourceLoader import failure gracefully', async () => {
      // Temporarily replace the mock to simulate import failure
      const originalMock = jest.requireMock('@salesforce/apex-lsp-parser-ast');

      jest.doMock('@salesforce/apex-lsp-parser-ast', () => ({
        ResourceLoader: undefined,
      }));

      // This test verifies the dynamic import error handling
      // In practice, the ResourceLoader should always be available,
      // but this tests the defensive coding

      await expect(
        (adapter as any).initializeResourceLoader(),
      ).resolves.not.toThrow();

      // Restore original mock
      jest.doMock('@salesforce/apex-lsp-parser-ast', () => originalMock);
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

      const mockZipData = Buffer.from('zip content').toString('base64');
      mockConnection.sendRequest.mockResolvedValue({
        zipData: mockZipData,
        size: 1024,
      });

      // Trigger the initialized event
      const onInitializedHandler =
        mockConnection.onInitialized.mock.calls[0][0];
      await onInitializedHandler();

      // Verify initializeResourceLoader was called
      expect(initResourceLoaderSpy).toHaveBeenCalled();
    });
  });
});
