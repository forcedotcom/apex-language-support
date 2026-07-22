/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexClientCore } from '@salesforce/apex-lsp-client';
import { DEFAULT_APEX_SETTINGS } from '@salesforce/apex-lsp-shared';

import { ApexLspTestClient } from '../../src/test-utils/ApexLspTestClient';
import { MockRpcConnection } from '../../src/test-utils/MockRpcConnection';

/**
 * Tests that verify the MockRpcConnection (which replaces direct web worker usage)
 * works correctly as a RpcConnection implementation for ApexClientCore.
 */
describe('MockRpcConnection (replaces WebWorker transport)', () => {
  let client: ApexLspTestClient;
  let core: ApexClientCore;
  let mockConn: MockRpcConnection;

  beforeEach(async () => {
    mockConn = new MockRpcConnection();
    core = await ApexClientCore.create(mockConn);
    mockConn.listen();
    const initResult = await core.initialize(DEFAULT_APEX_SETTINGS);
    client = new ApexLspTestClient(core, initResult);
  });

  afterEach(async () => {
    if (core) {
      await core.shutdown();
      await core.dispose();
    }
  });

  it('should create client with MockRpcConnection', () => {
    expect(client).toBeDefined();
    expect(client.getServerCapabilities()).toBeDefined();
  });

  it('should report listening status correctly', () => {
    expect(mockConn.isListening()).toBe(true);
  });

  it('should handle completion requests through mock connection', async () => {
    client.openTextDocument('file:///test.cls', 'public class Test {}', 'apex');
    const result = await client.completion({
      textDocument: { uri: 'file:///test.cls' },
      position: { line: 0, character: 10 },
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle hover requests through mock connection', async () => {
    client.openTextDocument('file:///test.cls', 'public class Test {}', 'apex');
    const result = await client.hover({
      textDocument: { uri: 'file:///test.cls' },
      position: { line: 0, character: 10 },
    });
    expect(result).toBeDefined();
    expect(result?.contents).toBeDefined();
  });

  it('should handle documentSymbol requests through mock connection', async () => {
    client.openTextDocument('file:///test.cls', 'public class Test {}', 'apex');
    const result = await client.documentSymbol({
      textDocument: { uri: 'file:///test.cls' },
    });
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it('should stop listening after dispose', () => {
    mockConn.dispose();
    expect(mockConn.isListening()).toBe(false);
  });
});
