/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// --- Mocks ---

const mockKill = jest.fn();
const mockStdout = { on: jest.fn(), readable: true };
const mockStdin = { on: jest.fn(), writable: true };
const mockStderr = { on: jest.fn() };

const mockOn = jest.fn();
const mockEmit = jest.fn();

const mockChildProcess = {
  stdout: mockStdout,
  stdin: mockStdin,
  stderr: mockStderr,
  killed: false,
  kill: mockKill,
  pid: 12345,
  on: mockOn,
  emit: mockEmit,
};

jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue(mockChildProcess),
}));

const mockDispose = jest.fn();
const mockListen = jest.fn();
const mockMessageConnection = {
  sendRequest: jest.fn(),
  sendNotification: jest.fn(),
  onRequest: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  onNotification: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  onError: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  onClose: jest.fn().mockReturnValue({ dispose: jest.fn() }),
  dispose: mockDispose,
  listen: mockListen,
};

jest.mock('vscode-jsonrpc', () => ({
  createMessageConnection: jest.fn().mockReturnValue(mockMessageConnection),
}));

jest.mock('vscode-jsonrpc/node', () => ({
  StreamMessageReader: jest.fn(),
  StreamMessageWriter: jest.fn(),
}));

import { spawn } from 'child_process';
import { createNodeStdioConnection } from '../../src/transports/createNodeStdioConnection';

describe('createNodeStdioConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(mockChildProcess, 'killed', {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  it('spawns a child process with the correct arguments', () => {
    createNodeStdioConnection('/path/to/server.js', {
      nodePath: '/usr/local/bin/node',
      nodeArgs: ['--nolazy'],
      serverArgs: ['--stdio'],
      env: { FOO: 'bar' },
      cwd: '/workspace',
    });

    expect(spawn).toHaveBeenCalledWith(
      '/usr/local/bin/node',
      ['--nolazy', '/path/to/server.js', '--stdio'],
      expect.objectContaining({
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: '/workspace',
      }),
    );

    // Env should merge process.env with custom env.
    const spawnCall = (spawn as jest.Mock).mock.calls[0] as any[];
    expect(spawnCall[2].env.FOO).toBe('bar');
  });

  it('returns a JsonRpcConnection and the child process', () => {
    const result = createNodeStdioConnection('/path/to/server.js');

    expect(result.connection).toBeDefined();
    expect(result.process).toBe(mockChildProcess);
  });

  it('does NOT call listen() on creation', () => {
    createNodeStdioConnection('/path/to/server.js');

    expect(mockListen).not.toHaveBeenCalled();
  });

  it('dispose kills the child process', () => {
    const result = createNodeStdioConnection('/path/to/server.js');

    result.connection.dispose();

    expect(mockDispose).toHaveBeenCalledTimes(1);
    expect(mockKill).toHaveBeenCalledTimes(1);
  });

  it('dispose does not kill an already-killed process', () => {
    Object.defineProperty(mockChildProcess, 'killed', {
      value: true,
      writable: true,
      configurable: true,
    });

    const result = createNodeStdioConnection('/path/to/server.js');
    result.connection.dispose();

    expect(mockDispose).toHaveBeenCalledTimes(1);
    expect(mockKill).not.toHaveBeenCalled();
  });

  it('uses process.execPath when nodePath is not provided', () => {
    createNodeStdioConnection('/path/to/server.js');

    const spawnCall = (spawn as jest.Mock).mock.calls[0] as any[];
    expect(spawnCall[0]).toBe(process.execPath);
  });
});
