/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Client } from '../../src/communication/NodeClient';
import type { Logger } from 'vscode-jsonrpc';

// Mock setup - simple and consistent
const mockConnection = {
  listen: jest.fn(),
  sendRequest: jest.fn(),
  sendNotification: jest.fn(),
  onRequest: jest.fn(),
  onNotification: jest.fn(),
  dispose: jest.fn(),
};

jest.mock('../../src/communication/NodeBridge', () => ({
  NodeMessageBridge: {
    createConnection: jest.fn(() => mockConnection),
  },
}));

// Mock logger
const mockLogger: Logger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
};

describe('Client', () => {
  let client: Client;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create client with logger config', () => {
      expect(() => new Client({ logger: mockLogger })).not.toThrow();
    });

    it('should create client without logger', () => {
      expect(() => new Client({})).not.toThrow();
    });

    it('should initialize connection on construction', () => {
      const { NodeMessageBridge } = require('../../src/communication/NodeBridge');
      new Client({ logger: mockLogger });
      
      expect(NodeMessageBridge.createConnection).toHaveBeenCalledWith({
        mode: 'stdio',
        logger: mockLogger,
      });
    });
  });

  describe('Lifecycle Management', () => {
    beforeEach(() => {
      client = new Client({ logger: mockLogger });
    });

    it('should not be disposed initially', () => {
      expect(client.isDisposed()).toBe(false);
    });

    it('should dispose properly', () => {
      client.dispose();
      expect(client.isDisposed()).toBe(true);
    });

    it('should handle multiple dispose calls', () => {
      client.dispose();
      expect(() => client.dispose()).not.toThrow();
      expect(client.isDisposed()).toBe(true);
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      client = new Client({ logger: mockLogger });
      // Allow connection to initialize
      return new Promise(resolve => setTimeout(resolve, 0));
    });

    it('should throw error when sending notification after disposal', () => {
      client.dispose();
      expect(() => client.sendNotification('test', {})).toThrow();
    });

    it('should throw error when setting up request handler after disposal', () => {
      client.dispose();
      expect(() => client.onRequest('test', () => {})).toThrow();
    });

    it('should throw error when setting up notification handler after disposal', () => {
      client.dispose();
      expect(() => client.onNotification('test', () => {})).toThrow();
    });
  });


  describe('Async Operations', () => {
    beforeEach(async () => {
      client = new Client({ logger: mockLogger });
      // Wait for connection to be established
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    it('should handle async request operations', async () => {
      const mockResult = { result: 'test' };
      mockConnection.sendRequest.mockResolvedValue(mockResult);

      const result = await client.sendRequest('test/method', { param: 'value' });
      expect(result).toBe(mockResult);
      expect(mockConnection.sendRequest).toHaveBeenCalledWith('test/method', { param: 'value' });
    });

    it('should handle initialize request', async () => {
      const mockInitializeResult = { capabilities: {} };
      mockConnection.sendRequest.mockResolvedValue(mockInitializeResult);

      const params = { processId: 1234, rootUri: '/test' };
      const result = await client.initialize(params);
      
      expect(result).toBe(mockInitializeResult);
      expect(mockConnection.sendRequest).toHaveBeenCalledWith('initialize', params);
    });
  });
});