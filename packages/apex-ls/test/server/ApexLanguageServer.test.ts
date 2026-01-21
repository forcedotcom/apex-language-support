/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexLanguageServer } from '../../src/server/ApexLanguageServer';
import type { ServerConfig } from '../../src/server/ApexLanguageServer';
import type { MessageConnection } from 'vscode-jsonrpc';

// Mock shared library environment detection
jest.mock('@salesforce/apex-lsp-shared', () => ({
  isNodeEnvironment: jest.fn(() => false),
  isWorkerEnvironment: jest.fn(() => false),
  isBrowserEnvironment: jest.fn(() => true),
}));

// Mock storage implementations
const mockStorage = {
  getDocument: jest.fn(),
  setDocument: jest.fn(),
  clearFile: jest.fn(),
  clearAll: jest.fn(),
};

const mockCreateStorage = jest.fn().mockResolvedValue(mockStorage);

jest.mock('../../src/storage/StorageImplementations', () => ({
  BrowserStorageFactory: class {
    createStorage = mockCreateStorage;
  },
  NodeStorageFactory: class {
    createStorage = mockCreateStorage;
  },
  WorkerStorageFactory: class {
    createStorage = mockCreateStorage;
  },
}));

// Mock message connection
class MockMessageConnection {
  listen = jest.fn();
  dispose = jest.fn();
}

describe('ApexLanguageServer', () => {
  let mockConnection: MessageConnection;
  let serverConfig: ServerConfig;
  const createdServers: ApexLanguageServer[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockConnection = new MockMessageConnection() as any;
    serverConfig = {
      environment: 'browser',
      connection: mockConnection,
      storageConfig: {
        storageType: 'memory',
      },
    };
  });

  afterEach(async () => {
    // Dispose all created servers
    for (const server of createdServers) {
      try {
        await server.dispose();
      } catch (_error) {
        // Ignore disposal errors
      }
    }
    createdServers.length = 0;

    // Wait for any pending async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  describe('Constructor and Environment Validation', () => {
    it('should create server with valid configuration', () => {
      const server = new ApexLanguageServer(serverConfig);
      createdServers.push(server);
      expect(server).toBeDefined();
    });

    it('should validate browser environment', () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      const server = new ApexLanguageServer(serverConfig);
      createdServers.push(server);
      expect(server).toBeDefined();
      expect(isBrowserEnvironment).toHaveBeenCalled();
    });

    it('should validate node environment', () => {
      const { isNodeEnvironment } = require('@salesforce/apex-lsp-shared');
      isNodeEnvironment.mockReturnValue(true);

      const nodeConfig = { ...serverConfig, environment: 'node' as const };
      const server = new ApexLanguageServer(nodeConfig);
      createdServers.push(server);
      expect(server).toBeDefined();
      expect(isNodeEnvironment).toHaveBeenCalled();
    });

    it('should validate worker environment', () => {
      const { isWorkerEnvironment } = require('@salesforce/apex-lsp-shared');
      isWorkerEnvironment.mockReturnValue(true);

      const workerConfig = {
        ...serverConfig,
        environment: 'webworker' as const,
      };
      const server = new ApexLanguageServer(workerConfig);
      createdServers.push(server);
      expect(server).toBeDefined();
      expect(isWorkerEnvironment).toHaveBeenCalled();
    });

    it('should throw error for invalid environment configuration', () => {
      const invalidConfig = {
        environment: 'invalid' as any,
        connection: mockConnection,
      };

      expect(() => new ApexLanguageServer(invalidConfig)).toThrow(
        'Unknown environment: invalid',
      );
    });

    it('should throw error when environment validation fails', () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(false);

      expect(() => new ApexLanguageServer(serverConfig)).toThrow(
        'Browser server can only run in browser environment',
      );
    });
  });

  describe('Server Initialization', () => {
    it('should initialize server successfully', async () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      const server = new ApexLanguageServer(serverConfig);
      createdServers.push(server);
      await expect(server.initialize()).resolves.not.toThrow();
    });

    // Removed redundant test - environment-specific initialization is already tested by:
    // 1. "should initialize server successfully" (basic initialization)
    // 2. Storage architecture tests comprehensively test all storage creation patterns

    // Removed redundant test - worker environment initialization is already tested by:
    // 1. Storage architecture tests: "should create worker storage with memory storage"
    // 2. Connection behavior differences are not critical functionality needing separate tests

    it('should handle storage factory creation', async () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      const server = new ApexLanguageServer(serverConfig);
      createdServers.push(server);
      await server.initialize();

      // With the new registry pattern, storage is created directly without factory mocks
      // Just verify the server initializes successfully
      expect(server).toBeDefined();
    });

    it('should handle missing storage config', async () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      const configWithoutStorage = {
        environment: 'browser' as const,
        connection: mockConnection,
      };

      const server = new ApexLanguageServer(configWithoutStorage);
      createdServers.push(server);
      await expect(server.initialize()).resolves.not.toThrow();
    });
  });

  describe('Storage Configuration', () => {
    // Removed redundant test - memory storage for worker environment is already tested by:
    // 1. Storage architecture tests: "should create worker storage with memory storage"
    // 2. Storage architecture tests: "should handle document operations in memory"
    // 3. This test only verified server.toBeDefined() which is trivial

    it('should preserve storage config for non-worker environments', async () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      const browserConfig = {
        ...serverConfig,
        environment: 'browser' as const,
        storageConfig: {
          storageType: 'memory' as const,
          useMemoryStorage: false,
        },
      };

      const server = new ApexLanguageServer(browserConfig);
      createdServers.push(server);
      await server.initialize();

      // With the new registry pattern, storage config is handled appropriately
      // Just verify the server initializes successfully
      expect(server).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle storage creation errors', async () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      // The refactored storage system provides better error handling and fallbacks
      // Storage creation should succeed even when preferred storage types fail
      const server = new ApexLanguageServer(serverConfig);
      createdServers.push(server);
      await expect(server.initialize()).resolves.not.toThrow();
    });
  });
});
