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
jest.mock('../../src/storage/StorageImplementations', () => ({
  BrowserStorageFactory: jest.fn().mockImplementation(() => ({
    createStorage: jest.fn().mockResolvedValue({
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    }),
  })),
  NodeStorageFactory: jest.fn().mockImplementation(() => ({
    createStorage: jest.fn().mockResolvedValue({
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    }),
  })),
  WorkerStorageFactory: jest.fn().mockImplementation(() => ({
    createStorage: jest.fn().mockResolvedValue({
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    }),
  })),
}));

// Mock message connection
class MockMessageConnection {
  onRequest = jest.fn();
  onNotification = jest.fn();
  sendNotification = jest.fn();
  sendRequest = jest.fn();
  onClose = jest.fn();
  onError = jest.fn();
  listen = jest.fn();
  dispose = jest.fn();
}

describe('ApexLanguageServer', () => {
  let mockConnection: MessageConnection;
  let serverConfig: ServerConfig;

  beforeEach(() => {
    mockConnection = new MockMessageConnection() as any;
    serverConfig = {
      environment: 'browser',
      connection: mockConnection,
      storageConfig: {
        storageType: 'memory',
      },
    };
  });

  describe('Server Initialization', () => {
    it('should create server with valid configuration', async () => {
      const server = new ApexLanguageServer(serverConfig);
      expect(server).toBeDefined();
      expect(server.isInitialized()).toBe(false);
    });

    it('should initialize server with storage factory', async () => {
      const server = new ApexLanguageServer(serverConfig);
      await server.initialize();
      expect(server.isInitialized()).toBe(true);
    });

    it('should handle different environment types', async () => {
      const nodeConfig = { ...serverConfig, environment: 'node' as const };
      const server = new ApexLanguageServer(nodeConfig);
      await server.initialize();
      expect(server.isInitialized()).toBe(true);
    });
  });

  describe('Message Handling', () => {
    it('should set up connection listeners on initialization', async () => {
      const server = new ApexLanguageServer(serverConfig);
      await server.initialize();
      
      expect(mockConnection.onRequest).toHaveBeenCalled();
      expect(mockConnection.onNotification).toHaveBeenCalled();
    });

    it('should handle server lifecycle', async () => {
      const server = new ApexLanguageServer(serverConfig);
      await server.initialize();
      
      expect(() => server.start()).not.toThrow();
      expect(() => server.shutdown()).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', async () => {
      const invalidConfig = {
        environment: 'invalid' as any,
        connection: mockConnection,
      };
      
      expect(() => new ApexLanguageServer(invalidConfig)).not.toThrow();
    });

    it('should handle missing storage config', async () => {
      const configWithoutStorage = {
        environment: 'browser' as const,
        connection: mockConnection,
      };
      
      const server = new ApexLanguageServer(configWithoutStorage);
      await expect(server.initialize()).resolves.not.toThrow();
    });
  });

  describe('Connection Management', () => {
    it('should manage connection state properly', async () => {
      const server = new ApexLanguageServer(serverConfig);
      expect(server.getConnection()).toBe(mockConnection);
    });

    it('should handle connection errors', async () => {
      const server = new ApexLanguageServer(serverConfig);
      await server.initialize();
      
      expect(mockConnection.onError).toHaveBeenCalled();
      expect(mockConnection.onClose).toHaveBeenCalled();
    });
  });
});