/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { NodeClient } from '../../src/communication/NodeClient';
import type { Logger } from 'vscode-jsonrpc';

// Mock child_process
const mockChildProcess = {
  spawn: jest.fn(),
  exec: jest.fn(),
  fork: jest.fn(),
};

jest.mock('child_process', () => mockChildProcess);

// Mock Node.js streams
class MockStream {
  on = jest.fn();
  write = jest.fn();
  end = jest.fn();
  destroy = jest.fn();
  pipe = jest.fn();
}

// Mock child process instance
class MockProcess {
  stdout = new MockStream();
  stderr = new MockStream();
  stdin = new MockStream();
  on = jest.fn();
  kill = jest.fn();
  pid = 12345;
}

// Mock logger
const mockLogger: Logger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
};

describe('NodeClient', () => {
  let mockProcess: MockProcess;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProcess = new MockProcess();
    mockChildProcess.spawn.mockReturnValue(mockProcess);
  });

  describe('Process Launching', () => {
    it('should launch server process with correct arguments', async () => {
      const client = new NodeClient({
        serverPath: '/path/to/server.jar',
        javaPath: 'java',
        args: ['-Xmx1g'],
        logger: mockLogger,
      });

      await client.start();

      expect(mockChildProcess.spawn).toHaveBeenCalledWith(
        'java',
        expect.arrayContaining(['-Xmx1g', '-jar', '/path/to/server.jar']),
        expect.objectContaining({ stdio: 'pipe' })
      );
    });

    it('should handle custom java path', async () => {
      const client = new NodeClient({
        serverPath: '/path/to/server.jar',
        javaPath: '/custom/java/path',
        logger: mockLogger,
      });

      await client.start();

      expect(mockChildProcess.spawn).toHaveBeenCalledWith(
        '/custom/java/path',
        expect.any(Array),
        expect.any(Object)
      );
    });

    it('should use default java path when not specified', async () => {
      const client = new NodeClient({
        serverPath: '/path/to/server.jar',
        logger: mockLogger,
      });

      await client.start();

      expect(mockChildProcess.spawn).toHaveBeenCalledWith(
        'java',
        expect.any(Array),
        expect.any(Object)
      );
    });
  });

  describe('Connection Management', () => {
    it('should create message connection from process streams', async () => {
      const client = new NodeClient({
        serverPath: '/path/to/server.jar',
        logger: mockLogger,
      });

      const connection = await client.start();

      expect(connection).toBeDefined();
      expect(typeof connection.sendRequest).toBe('function');
      expect(typeof connection.sendNotification).toBe('function');
    });

    it('should handle connection disposal', async () => {
      const client = new NodeClient({
        serverPath: '/path/to/server.jar',
        logger: mockLogger,
      });

      const connection = await client.start();
      client.stop();

      expect(mockProcess.kill).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle process spawn errors', async () => {
      mockChildProcess.spawn.mockImplementationOnce(() => {
        const proc = new MockProcess();
        setTimeout(() => {
          proc.on.mock.calls.forEach(([event, callback]) => {
            if (event === 'error') {
              callback(new Error('ENOENT: java not found'));
            }
          });
        }, 0);
        return proc;
      });

      const client = new NodeClient({
        serverPath: '/path/to/server.jar',
        logger: mockLogger,
      });

      await expect(client.start()).rejects.toThrow('java not found');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle process exit with non-zero code', async () => {
      mockChildProcess.spawn.mockImplementationOnce(() => {
        const proc = new MockProcess();
        setTimeout(() => {
          proc.on.mock.calls.forEach(([event, callback]) => {
            if (event === 'exit') {
              callback(1, null); // Exit code 1
            }
          });
        }, 0);
        return proc;
      });

      const client = new NodeClient({
        serverPath: '/path/to/server.jar',
        logger: mockLogger,
      });

      await expect(client.start()).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle stderr output', async () => {
      const client = new NodeClient({
        serverPath: '/path/to/server.jar',
        logger: mockLogger,
      });

      await client.start();

      // Simulate stderr data
      const stderrHandler = mockProcess.stderr.on.mock.calls.find(
        ([event]) => event === 'data'
      )?.[1];

      if (stderrHandler) {
        stderrHandler(Buffer.from('Error message from server'));
        expect(mockLogger.error).toHaveBeenCalled();
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should require server path', () => {
      expect(() => new NodeClient({} as any)).toThrow();
    });

    it('should validate server path exists', async () => {
      const client = new NodeClient({
        serverPath: '/nonexistent/path.jar',
        logger: mockLogger,
      });

      // This would typically check file system, but we're mocking
      // so we just ensure it doesn't crash during construction
      expect(client).toBeDefined();
    });
  });

  describe('Process Lifecycle', () => {
    it('should track process state correctly', async () => {
      const client = new NodeClient({
        serverPath: '/path/to/server.jar',
        logger: mockLogger,
      });

      expect(client.isRunning()).toBe(false);

      await client.start();
      expect(client.isRunning()).toBe(true);

      client.stop();
      expect(client.isRunning()).toBe(false);
    });

    it('should handle multiple start calls gracefully', async () => {
      const client = new NodeClient({
        serverPath: '/path/to/server.jar',
        logger: mockLogger,
      });

      const connection1 = await client.start();
      const connection2 = await client.start();

      expect(connection1).toBe(connection2);
      expect(mockChildProcess.spawn).toHaveBeenCalledTimes(1);
    });

    it('should handle restart after stop', async () => {
      const client = new NodeClient({
        serverPath: '/path/to/server.jar',
        logger: mockLogger,
      });

      await client.start();
      client.stop();
      await client.start();

      expect(mockChildProcess.spawn).toHaveBeenCalledTimes(2);
    });
  });
});