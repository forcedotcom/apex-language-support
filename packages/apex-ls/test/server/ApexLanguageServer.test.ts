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

  describe('Constructor and Environment Validation', () => {
    it('should create server with valid configuration', () => {
      const server = new ApexLanguageServer(serverConfig);
      expect(server).toBeDefined();
    });

    it('should validate browser environment', () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      expect(() => new ApexLanguageServer(serverConfig)).not.toThrow();
      expect(isBrowserEnvironment).toHaveBeenCalled();
    });

    it('should validate node environment', () => {
      const { isNodeEnvironment } = require('@salesforce/apex-lsp-shared');
      isNodeEnvironment.mockReturnValue(true);

      const nodeConfig = { ...serverConfig, environment: 'node' as const };
      expect(() => new ApexLanguageServer(nodeConfig)).not.toThrow();
      expect(isNodeEnvironment).toHaveBeenCalled();
    });

    it('should validate worker environment', () => {
      const { isWorkerEnvironment } = require('@salesforce/apex-lsp-shared');
      isWorkerEnvironment.mockReturnValue(true);

      const workerConfig = { ...serverConfig, environment: 'webworker' as const };
      expect(() => new ApexLanguageServer(workerConfig)).not.toThrow();
      expect(isWorkerEnvironment).toHaveBeenCalled();
    });

    it('should throw error for invalid environment configuration', () => {
      const invalidConfig = {
        environment: 'invalid' as any,
        connection: mockConnection,
      };
      
      expect(() => new ApexLanguageServer(invalidConfig)).toThrow('Unknown environment: invalid');
    });

    it('should throw error when environment validation fails', () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(false);

      expect(() => new ApexLanguageServer(serverConfig))
        .toThrow('Browser server can only run in browser environment');
    });
  });

  describe('Server Initialization', () => {
    it('should initialize server successfully', async () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      const server = new ApexLanguageServer(serverConfig);
      await expect(server.initialize()).resolves.not.toThrow();
    });

    it('should initialize with different environments', async () => {
      const { isNodeEnvironment } = require('@salesforce/apex-lsp-shared');
      isNodeEnvironment.mockReturnValue(true);

      const nodeConfig = { ...serverConfig, environment: 'node' as const };
      const server = new ApexLanguageServer(nodeConfig);
      
      await server.initialize();
      expect(mockConnection.listen).toHaveBeenCalled();
    });

    it('should handle worker environment initialization', async () => {
      const { isWorkerEnvironment } = require('@salesforce/apex-lsp-shared');
      isWorkerEnvironment.mockReturnValue(true);

      const workerConfig = { ...serverConfig, environment: 'webworker' as const };
      const server = new ApexLanguageServer(workerConfig);
      
      await server.initialize();
      // Workers don't call connection.listen() explicitly
      expect(mockConnection.listen).not.toHaveBeenCalled();
    });

    it('should handle storage factory creation', async () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      const server = new ApexLanguageServer(serverConfig);
      await server.initialize();

      expect(mockCreateStorage).toHaveBeenCalled();
    });

    it('should handle missing storage config', async () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      const configWithoutStorage = {
        environment: 'browser' as const,
        connection: mockConnection,
      };
      
      const server = new ApexLanguageServer(configWithoutStorage);
      await expect(server.initialize()).resolves.not.toThrow();
    });
  });

  describe('Storage Configuration', () => {
    it('should use memory storage for worker environment', async () => {
      const { isWorkerEnvironment } = require('@salesforce/apex-lsp-shared');
      isWorkerEnvironment.mockReturnValue(true);

      const workerConfig = { 
        ...serverConfig, 
        environment: 'webworker' as const,
        storageConfig: { storageType: 'indexeddb' }
      };
      
      const server = new ApexLanguageServer(workerConfig);
      await server.initialize();

      expect(mockCreateStorage).toHaveBeenCalledWith(
        expect.objectContaining({ useMemoryStorage: true })
      );
    });

    it('should preserve storage config for non-worker environments', async () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      const browserConfig = {
        ...serverConfig,
        environment: 'browser' as const,
        storageConfig: { 
          storageType: 'memory' as const,
          useMemoryStorage: false 
        }
      };

      const server = new ApexLanguageServer(browserConfig);
      await server.initialize();

      expect(mockCreateStorage).toHaveBeenCalledWith(
        expect.objectContaining({ 
          storageType: 'memory',
          useMemoryStorage: false 
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle storage creation errors', async () => {
      const { isBrowserEnvironment } = require('@salesforce/apex-lsp-shared');
      isBrowserEnvironment.mockReturnValue(true);

      mockCreateStorage.mockRejectedValueOnce(new Error('Storage creation failed'));

      const server = new ApexLanguageServer(serverConfig);
      await expect(server.initialize()).rejects.toThrow('Storage creation failed');
    });
  });
});