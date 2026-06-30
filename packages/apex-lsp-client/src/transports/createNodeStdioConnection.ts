/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { spawn, type ChildProcess } from 'child_process';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import { createMessageConnection } from 'vscode-jsonrpc';
import { JsonRpcConnection } from './jsonRpcConnection';

/**
 * Options for {@link createNodeStdioConnection}.
 */
export interface NodeStdioConnectionOptions {
  /** Path to the Node.js executable (defaults to `process.execPath`). */
  readonly nodePath?: string;
  /** Extra arguments passed to the Node process before the server path. */
  readonly nodeArgs?: readonly string[];
  /** Arguments appended after the server path. */
  readonly serverArgs?: readonly string[];
  /** Environment variables merged onto `process.env` for the child. */
  readonly env?: Readonly<NodeJS.ProcessEnv>;
  /** Working directory for the child process (defaults to `process.cwd()`). */
  readonly cwd?: string;
}

/**
 * Result of {@link createNodeStdioConnection}.
 */
export interface NodeStdioConnectionResult {
  /** The `JsonRpcConnection` wrapping the stdio-based `MessageConnection`. */
  readonly connection: JsonRpcConnection;
  /** The spawned child process; exposed so callers can observe exit/errors. */
  readonly process: ChildProcess;
}

/**
 * Spawn a Node child process running the server at `serverPath` and create a
 * `JsonRpcConnection` over its stdio pipes.
 *
 * Lifted from the testbed's `ApexJsonRpcClient.startChildProcess` pattern but
 * stripped to the essentials — no retry logic, no initialization; that is owned
 * by `ApexClientCore`/`createHeadlessClient`.
 *
 * The returned connection is NOT yet listening. Caller must:
 * 1. Build the core: `ApexClientCore.create(result.connection)`
 * 2. Start traffic: `result.connection.listen()`
 *
 * Disposing the connection also kills the child process.
 */
export function createNodeStdioConnection(
  serverPath: string,
  options: NodeStdioConnectionOptions = {},
): NodeStdioConnectionResult {
  const {
    nodePath = process.execPath,
    nodeArgs = [],
    serverArgs = [],
    env,
    cwd,
  } = options;

  const child = spawn(nodePath, [...nodeArgs, serverPath, ...serverArgs], {
    env: { ...process.env, ...env },
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd,
  });

  if (!child.stdout || !child.stdin) {
    throw new Error(
      'createNodeStdioConnection: child process lacks stdio pipes',
    );
  }

  const reader = new StreamMessageReader(child.stdout);
  const writer = new StreamMessageWriter(child.stdin);
  const messageConnection = createMessageConnection(reader, writer);

  const connection = new JsonRpcConnection(messageConnection);

  // Override dispose to also kill the child process.
  const originalDispose = connection.dispose.bind(connection);
  connection.dispose = (): void => {
    originalDispose();
    if (!child.killed) {
      child.kill();
    }
  };

  return { connection, process: child };
}
