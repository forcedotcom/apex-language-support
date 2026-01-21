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
    getInstance: jest.fn(() => ({
      getResourceLoadMode: jest.fn(() => 'full'),
    })),
  },
}));

// Mock embedded ZIP buffer
const mockEmbeddedZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04]); // ZIP magic bytes

// Mock the apex-parser-ast package with protobuf cache support
jest.mock('@salesforce/apex-lsp-parser-ast', () => ({
  ResourceLoader: {
    getInstance: jest.fn(() => ({
      getDirectoryStatistics: jest.fn(() => ({
        totalFiles: 100,
        namespaces: ['System', 'Database', 'Schema'],
      })),
      initialize: jest.fn().mockResolvedValue(undefined),
      setZipBuffer: jest.fn(),
      isProtobufCacheLoaded: jest.fn(() => true),
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
        getConfiguration: jest.fn().mockResolvedValue({}),
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
      getSettingsManager: jest.fn(() => ({
        getResourceLoadMode: jest.fn(() => 'full'),
      })),
    } as unknown as jest.Mocked<LSPConfigurationManager>;

    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue(
      mockConfigManager,
    );

    // Create adapter instance (using any to access private constructor)
    adapter = new (LCSAdapter as any)({
      connection: mockConnection as Connection,
    });
  });

  describe('initializeResourceLoader', () => {
    it('should initialize ResourceLoader with protobuf cache', async () => {
      const { ResourceLoader } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );
      const mockResourceLoader = {
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 100,
          namespaces: ['System', 'Database', 'Schema'],
        })),
        initialize: jest.fn().mockResolvedValue(undefined),
        isProtobufCacheLoaded: jest.fn(() => true),
      };

      (ResourceLoader.getInstance as jest.Mock).mockReturnValue(
        mockResourceLoader,
      );

      await (adapter as any).initializeResourceLoader();

      // Verify ResourceLoader.getInstance was called with correct options
      expect(ResourceLoader.getInstance).toHaveBeenCalledWith({
        loadMode: 'full',
        preloadStdClasses: true,
      });
    });

    it('should call initialize and setZipBuffer on ResourceLoader', async () => {
      const { ResourceLoader } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );
      const mockResourceLoader = {
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 100,
          namespaces: ['System'],
        })),
        initialize: jest.fn().mockResolvedValue(undefined),
        setZipBuffer: jest.fn(),
        isProtobufCacheLoaded: jest.fn(() => true),
      };

      (ResourceLoader.getInstance as jest.Mock).mockReturnValue(
        mockResourceLoader,
      );

      await (adapter as any).initializeResourceLoader();

      // Verify initialize was called for protobuf cache
      expect(mockResourceLoader.initialize).toHaveBeenCalled();
      // Verify setZipBuffer was called for source content
      expect(mockResourceLoader.setZipBuffer).toHaveBeenCalled();
      expect(mockResourceLoader.getDirectoryStatistics).toHaveBeenCalled();
    });

    it('should log statistics after successful initialization', async () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const adapterWithLogger = new (LCSAdapter as any)({
        connection: mockConnection as Connection,
        logger: mockLogger,
      });

      const { ResourceLoader } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );
      const mockResourceLoader = {
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 100,
          namespaces: ['System', 'Database'],
        })),
        initialize: jest.fn().mockResolvedValue(undefined),
        isProtobufCacheLoaded: jest.fn(() => true),
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

      const adapterWithLogger = new (LCSAdapter as any)({
        connection: mockConnection as Connection,
        logger: mockLogger,
      });

      const { ResourceLoader } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );
      const mockResourceLoader = {
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 0,
          namespaces: [],
        })),
        initialize: jest
          .fn()
          .mockRejectedValue(new Error('Protobuf cache not available')),
        isProtobufCacheLoaded: jest.fn(() => false),
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

    it('should respect loadMode from settings', async () => {
      // Update mock to return 'lazy' mode
      mockConfigManager.getSettingsManager = jest.fn(() => ({
        getResourceLoadMode: jest.fn(() => 'lazy'),
      }));

      const { ResourceLoader } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );
      const mockResourceLoader = {
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 100,
          namespaces: ['System'],
        })),
        initialize: jest.fn().mockResolvedValue(undefined),
        isProtobufCacheLoaded: jest.fn(() => true),
      };

      (ResourceLoader.getInstance as jest.Mock).mockReturnValue(
        mockResourceLoader,
      );

      await (adapter as any).initializeResourceLoader();

      // Verify ResourceLoader was called with lazy mode
      expect(ResourceLoader.getInstance).toHaveBeenCalledWith({
        loadMode: 'lazy',
        preloadStdClasses: true,
      });
    });

    it('should continue with protobuf symbols even if ZIP loading fails', async () => {
      const mockLogger = {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };

      const adapterWithLogger = new (LCSAdapter as any)({
        connection: mockConnection as Connection,
        logger: mockLogger,
      });

      const { ResourceLoader } = await import(
        '@salesforce/apex-lsp-parser-ast'
      );
      const mockResourceLoader = {
        getDirectoryStatistics: jest.fn(() => ({
          totalFiles: 100,
          namespaces: ['System'],
        })),
        initialize: jest.fn().mockResolvedValue(undefined),
        setZipBuffer: jest.fn().mockImplementation(() => {
          throw new Error('ZIP extraction failed');
        }),
        isProtobufCacheLoaded: jest.fn(() => true),
      };

      (ResourceLoader.getInstance as jest.Mock).mockReturnValue(
        mockResourceLoader,
      );

      // Should not throw - ZIP failure should be isolated
      await expect(
        (adapterWithLogger as any).initializeResourceLoader(),
      ).resolves.not.toThrow();

      // Protobuf cache was loaded
      expect(mockResourceLoader.initialize).toHaveBeenCalled();
      expect(mockResourceLoader.isProtobufCacheLoaded).toHaveBeenCalled();

      // ZIP loading was attempted but failed
      expect(mockResourceLoader.setZipBuffer).toHaveBeenCalled();

      // Warning was logged about ZIP failure
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });
});
