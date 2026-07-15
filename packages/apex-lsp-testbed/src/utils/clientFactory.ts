/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  createHeadlessClient,
  ApexClientCore,
} from '@salesforce/apex-lsp-client';
import { DEFAULT_APEX_SETTINGS } from '@salesforce/apex-lsp-shared';

import { JsonRpcClientOptions, ServerType } from './serverUtils';
import { ApexLspTestClient } from '../test-utils/ApexLspTestClient';
import { MockRpcConnection } from '../test-utils/MockRpcConnection';

/**
 * Creates an appropriate SDK-backed client instance based on server type.
 *
 * For demo mode: uses MockRpcConnection + ApexClientCore.create
 * For real servers: uses createHeadlessClient (spawns process + creates core + listens)
 *
 * Returns an ApexLspTestClient wrapping the core.
 */
export async function createClient(
  options: JsonRpcClientOptions,
  serverType: ServerType,
): Promise<ApexLspTestClient> {
  if (serverType === 'demo') {
    // Demo mode: in-memory mock transport
    const mockConn = new MockRpcConnection();
    const core = await ApexClientCore.create(mockConn);
    mockConn.listen();
    const initResult = await core.initialize(DEFAULT_APEX_SETTINGS);
    return new ApexLspTestClient(core, initResult);
  }

  // Real server: use createHeadlessClient
  const serverPath = options.serverPath;
  const nodeArgs = options.nodeArgs || [];
  const serverArgs = options.serverArgs || [];

  const { core } = await createHeadlessClient(serverPath, {
    nodeArgs,
    serverArgs,
    env: options.env,
  });

  const initializeParams: Record<string, unknown> = {};
  if (options.initializeParams) {
    Object.assign(initializeParams, options.initializeParams);
  }

  const initResult = await core.initialize(
    DEFAULT_APEX_SETTINGS,
    initializeParams,
  );
  return new ApexLspTestClient(core, initResult);
}

module.exports = { createClient };
