/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  BrowserMessageReader,
  BrowserMessageWriter,
  createMessageConnection,
} from 'vscode-jsonrpc/browser';
import { JsonRpcConnection } from './jsonRpcConnection';

/**
 * Create a `JsonRpcConnection` over a Web Worker's message channel.
 *
 * Uses `BrowserMessageReader`/`BrowserMessageWriter` from `vscode-jsonrpc/browser`
 * which communicate via the Worker's `postMessage`/`onmessage` interface.
 *
 * The returned connection is NOT yet listening. Caller must:
 * 1. Build the core: `ApexClientCore.create(connection)`
 * 2. Start traffic: `connection.listen()`
 *
 * Full browser integration testing is deferred to WI 5.1.
 */
export function createWebWorkerConnection(worker: Worker): JsonRpcConnection {
  const reader = new BrowserMessageReader(worker);
  const writer = new BrowserMessageWriter(worker);
  const messageConnection = createMessageConnection(reader, writer);
  return new JsonRpcConnection(messageConnection);
}
