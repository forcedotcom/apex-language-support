/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { spawn, type ChildProcess } from 'child_process';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import {
  createMessageConnection,
  type MessageConnection,
} from 'vscode-jsonrpc';
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
  /** The `NodeStdioJsonRpcConnection` managing the child process lifecycle. */
  readonly connection: NodeStdioJsonRpcConnection;
  /** The spawned child process; exposed so callers can observe exit/errors. */
  readonly process: ChildProcess;
}

/**
 * `JsonRpcConnection` subclass that manages a Node child process lifecycle.
 * Overrides `dispose()` to kill the child process and wait for clean exit.
 */
class NodeStdioJsonRpcConnection extends JsonRpcConnection {
  constructor(
    connection: MessageConnection,
    private readonly child: ChildProcess,
  ) {
    super(connection);
  }

  /**
   * Check if the child process is still alive.
   */
  isProcessAlive(): boolean {
    return this.child.exitCode === null && this.child.signalCode === null;
  }

  /**
   * Dispose the connection and kill the child process, waiting for clean exit.
   */
  override async dispose(): Promise<void> {
    await super.dispose();
    if (!this.child.killed) {
      this.child.kill();
      // Wait for child to exit to ensure cleanup completes.
      await new Promise<void>((resolve) => {
        if (this.child.exitCode !== null || this.child.signalCode !== null) {
          resolve();
        } else {
          this.child.once('exit', () => resolve());
        }
      });
    }
  }
}

/**
 * Filter NODE_OPTIONS to remove debugger flags that would cause port conflicts.
 * Prevents child processes from inheriting --inspect/--inspect-brk when spawned
 * from debugged parent processes (e.g., Jest tests under VS Code debugger).
 */
function cleanNodeOptions(options: string | undefined): string | undefined {
  if (!options) return undefined;
  const cleaned = options
    .replace(/--inspect(?:-brk)?(?:=[\w:.-]+)?/g, '')
    .trim();
  return cleaned || undefined;
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

  // Filter NODE_OPTIONS to prevent debugger port conflicts.
  const filteredEnv: NodeJS.ProcessEnv = { ...process.env, ...env };
  if (filteredEnv.NODE_OPTIONS) {
    const cleaned = cleanNodeOptions(filteredEnv.NODE_OPTIONS);
    if (cleaned) {
      filteredEnv.NODE_OPTIONS = cleaned;
    } else {
      delete filteredEnv.NODE_OPTIONS;
    }
  }

  const child = spawn(nodePath, [...nodeArgs, serverPath, ...serverArgs], {
    env: filteredEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd,
  });

  // Capture and log stderr for diagnostics.
  // Server warnings, errors, and stack traces written to stderr are otherwise lost.
  child.stderr?.on('data', (data: Buffer) => {
    const output = data.toString();
    // Log to console.error so stderr is visible; callers can suppress via stdio redirect.
    console.error(`[apex-lsp-client stderr] ${output}`);
  });

  // Surface spawn failures (ENOENT, EACCES) synchronously.
  child.on('error', (err: Error) => {
    const wrapped = new Error(
      `createNodeStdioConnection: child process error: ${err.message}`,
      { cause: err },
    );
    // Re-throw as unhandled error since nothing can catch it at this point.
    throw wrapped;
  });

  if (!child.stdout || !child.stdin) {
    throw new Error(
      'createNodeStdioConnection: child process lacks stdio pipes',
    );
  }

  const reader = new StreamMessageReader(child.stdout);
  const writer = new StreamMessageWriter(child.stdin);
  const messageConnection = createMessageConnection(reader, writer);

  const connection = new NodeStdioJsonRpcConnection(messageConnection, child);

  return { connection, process: child };
}
