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

describe('ApexLspTestClient', () => {
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
    await core.shutdown();
    await core.dispose();
  });

  describe('initialization', () => {
    it('should create a client from ApexClientCore', () => {
      expect(client).toBeDefined();
    });

    it('should return server capabilities after initialization', () => {
      const capabilities = client.getServerCapabilities();
      expect(capabilities).toBeDefined();
      expect(capabilities?.hoverProvider).toBe(true);
      expect(capabilities?.completionProvider).toBeDefined();
    });

    it('should report healthy after initialization', () => {
      expect(client.isHealthy()).toBe(true);
    });
  });

  describe('document operations', () => {
    it('should open a text document without throwing', () => {
      expect(() => {
        client.openTextDocument(
          'file:///test.cls',
          'public class Test {}',
          'apex',
        );
      }).not.toThrow();
    });

    it('should update a text document without throwing', () => {
      client.openTextDocument(
        'file:///test.cls',
        'public class Test {}',
        'apex',
      );
      expect(() => {
        client.updateTextDocument(
          'file:///test.cls',
          'public class Test { void m() {} }',
          2,
        );
      }).not.toThrow();
    });

    it('should close a text document without throwing', () => {
      client.openTextDocument(
        'file:///test.cls',
        'public class Test {}',
        'apex',
      );
      expect(() => {
        client.closeTextDocument('file:///test.cls');
      }).not.toThrow();
    });
  });

  describe('LSP methods', () => {
    it('should send completion requests', async () => {
      client.openTextDocument(
        'file:///test.cls',
        'public class Test { public void m() { this. } }',
        'apex',
      );
      const result = await client.completion({
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 42 },
      });
      expect(result).toBeDefined();
    });

    it('should send hover requests', async () => {
      client.openTextDocument(
        'file:///test.cls',
        'public class Test {}',
        'apex',
      );
      const result = await client.hover({
        textDocument: { uri: 'file:///test.cls' },
        position: { line: 0, character: 10 },
      });
      expect(result).toBeDefined();
    });

    it('should send documentSymbol requests', async () => {
      client.openTextDocument(
        'file:///test.cls',
        'public class Test {}',
        'apex',
      );
      const result = await client.documentSymbol({
        textDocument: { uri: 'file:///test.cls' },
      });
      expect(result).toBeDefined();
    });

    it('should send generic requests via sendRequest', async () => {
      const result = await client.sendRequest('$/ping');
      expect(result).toBeDefined();
    });
  });

  describe('lifecycle', () => {
    it('should report not healthy after dispose', async () => {
      const tempConn = new MockRpcConnection();
      const tempCore = await ApexClientCore.create(tempConn);
      tempConn.listen();
      const tempInit = await tempCore.initialize(DEFAULT_APEX_SETTINGS);
      const tempClient = new ApexLspTestClient(tempCore, tempInit);

      expect(tempClient.isHealthy()).toBe(true);

      await tempCore.shutdown();
      await tempCore.dispose();

      expect(tempClient.isHealthy()).toBe(false);
      expect(tempClient.isDisposed()).toBe(true);
    });

    it('should expose getCore for advanced usage', () => {
      expect(client.getCore()).toBe(core);
    });
  });
});
