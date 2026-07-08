/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ChildProcess } from 'child_process';
import { ApexClientCore, type ApexClientCoreOptions } from '../apexClientCore';
import {
  createNodeStdioConnection,
  type NodeStdioConnectionOptions,
} from '../transports/createNodeStdioConnection';
import type { JsonRpcConnection } from '../transports/jsonRpcConnection';

/**
 * Options for {@link createHeadlessClient}.
 */
export interface HeadlessClientOptions extends NodeStdioConnectionOptions {
  /** Options forwarded to `ApexClientCore.create`. */
  readonly coreOptions?: ApexClientCoreOptions;
}

/**
 * Result of {@link createHeadlessClient}.
 */
export interface HeadlessClientResult {
  /** The initialized `ApexClientCore` instance. */
  readonly core: ApexClientCore;
  /** The underlying `JsonRpcConnection` (for advanced use / testing). */
  readonly connection: JsonRpcConnection;
  /** The spawned server child process (for advanced use / testing). */
  readonly process: ChildProcess;
}

/**
 * Create a headless (no-VS-Code) Apex LSP client over Node stdio.
 *
 * Encapsulates the correct ordering:
 * 1. Spawn the server via `createNodeStdioConnection`
 * 2. Build `ApexClientCore.create(connection)` — registers default handlers
 * 3. Call `connection.listen()` — traffic starts
 *
 * The caller is responsible for calling `core.initialize(settings)` after this
 * returns, then `core.shutdown()` + `core.dispose()` when done.
 */
export async function createHeadlessClient(
  serverPath: string,
  options: HeadlessClientOptions = {},
): Promise<HeadlessClientResult> {
  const { coreOptions, ...connectionOptions } = options;

  const { connection, process: child } = createNodeStdioConnection(
    serverPath,
    connectionOptions,
  );

  let core: ApexClientCore;
  try {
    core = await ApexClientCore.create(connection, coreOptions);
  } catch (err) {
    connection.dispose();
    throw err;
  }

  connection.listen();

  return { core, connection, process: child };
}
