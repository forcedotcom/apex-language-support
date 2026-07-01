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
  exitCode: null,
  signalCode: null,
  kill: mockKill,
  pid: 12345,
  on: mockOn,
  once: jest.fn(),
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
    Object.defineProperty(mockChildProcess, 'exitCode', {
      value: null,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(mockChildProcess, 'signalCode', {
      value: null,
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

  it('returns a NodeStdioJsonRpcConnection and the child process', () => {
    const result = createNodeStdioConnection('/path/to/server.js');

    expect(result.connection).toBeDefined();
    expect(result.connection.isProcessAlive).toBeDefined();
    expect(result.process).toBe(mockChildProcess);
  });

  it('does NOT call listen() on creation', () => {
    createNodeStdioConnection('/path/to/server.js');

    expect(mockListen).not.toHaveBeenCalled();
  });

  it('dispose kills the child process and waits for exit', async () => {
    const result = createNodeStdioConnection('/path/to/server.js');

    // Mock 'once' to immediately call the callback (simulating immediate exit).
    (mockChildProcess.once as jest.Mock).mockImplementation(
      (event, callback) => {
        if (event === 'exit') {
          callback();
        }
      },
    );

    await result.connection.dispose();

    expect(mockDispose).toHaveBeenCalledTimes(1);
    expect(mockKill).toHaveBeenCalledTimes(1);
    expect(mockChildProcess.once).toHaveBeenCalledWith(
      'exit',
      expect.any(Function),
    );
  });

  it('dispose does not kill an already-killed process', async () => {
    Object.defineProperty(mockChildProcess, 'killed', {
      value: true,
      writable: true,
      configurable: true,
    });

    const result = createNodeStdioConnection('/path/to/server.js');
    await result.connection.dispose();

    expect(mockDispose).toHaveBeenCalledTimes(1);
    expect(mockKill).not.toHaveBeenCalled();
  });

  it('uses process.execPath when nodePath is not provided', () => {
    createNodeStdioConnection('/path/to/server.js');

    const spawnCall = (spawn as jest.Mock).mock.calls[0] as any[];
    expect(spawnCall[0]).toBe(process.execPath);
  });

  it('filters NODE_OPTIONS to remove inspect flags', () => {
    createNodeStdioConnection('/path/to/server.js', {
      env: { NODE_OPTIONS: '--inspect=9229 --max-old-space-size=4096' },
    });

    const spawnCall = (spawn as jest.Mock).mock.calls[0] as any[];
    // --inspect should be filtered out, but --max-old-space-size preserved.
    expect(spawnCall[2].env.NODE_OPTIONS).toBe('--max-old-space-size=4096');
  });

  it('deletes NODE_OPTIONS if only inspect flags present', () => {
    createNodeStdioConnection('/path/to/server.js', {
      env: { NODE_OPTIONS: '--inspect-brk=9229' },
    });

    const spawnCall = (spawn as jest.Mock).mock.calls[0] as any[];
    // NODE_OPTIONS should be deleted entirely when only inspect flags present.
    expect(spawnCall[2].env.NODE_OPTIONS).toBeUndefined();
  });

  it('captures stderr output', () => {
    createNodeStdioConnection('/path/to/server.js');

    // Verify stderr listener was registered.
    expect(mockStderr.on).toHaveBeenCalledWith('data', expect.any(Function));
  });

  it('isProcessAlive returns true for running process', () => {
    const result = createNodeStdioConnection('/path/to/server.js');

    expect(result.connection.isProcessAlive()).toBe(true);
  });

  it('isProcessAlive returns false when process has exitCode', () => {
    Object.defineProperty(mockChildProcess, 'exitCode', {
      value: 0,
      writable: true,
      configurable: true,
    });

    const result = createNodeStdioConnection('/path/to/server.js');

    expect(result.connection.isProcessAlive()).toBe(false);
  });

  it('dispose waits if process already exited', async () => {
    Object.defineProperty(mockChildProcess, 'exitCode', {
      value: 0,
      writable: true,
      configurable: true,
    });

    const result = createNodeStdioConnection('/path/to/server.js');
    await result.connection.dispose();

    expect(mockKill).toHaveBeenCalledTimes(1);
    // Should not wait for 'exit' event since exitCode is already set.
    expect(mockChildProcess.once).not.toHaveBeenCalled();
  });
});
