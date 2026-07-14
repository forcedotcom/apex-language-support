/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, afterAll } from '@jest/globals';
import { join } from 'path';
import { existsSync } from 'fs';
import { DEFAULT_APEX_SETTINGS } from '@salesforce/apex-lsp-shared';
import { LanguageClientConnection } from '../../src/transports/languageClientConnection';
import { ApexClientCore } from '../../src/apexClientCore';

/**
 * Integration test for `LanguageClientConnection`. Wraps a real
 * `LanguageClient` (from `vscode-languageclient/node`) configured with a stdio
 * `ServerOptions` pointing at the real server binary, then exercises the full
 * LSP initialize/shutdown/dispose cycle via `ApexClientCore`.
 *
 * This proves the adapter code path end-to-end against a real server, not just
 * mocked delegation.
 *
 * Gated: requires `RUN_INTEGRATION=1` AND the server binary must exist.
 * To run locally:
 *   npm run bundle -w @salesforce/apex-ls && RUN_INTEGRATION=1 npm test -w @salesforce/apex-lsp-client
 */
const serverPath = join(__dirname, '../../../apex-ls/dist/server.node.js');
const serverAvailable = existsSync(serverPath);
const runIntegration = process.env.RUN_INTEGRATION === '1' && serverAvailable;
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('LanguageClientConnection integration', () => {
  let connection: LanguageClientConnection | undefined;
  let core: ApexClientCore | undefined;

  afterAll(async () => {
    if (core) {
      try {
        await core.shutdown();
      } catch {
        // Server may already be gone.
      }
      await core.dispose();
    }
  });

  it('initializes, communicates, and shuts down cleanly via adapter', async () => {
    // Dynamic import to avoid pulling vscode-languageclient/node at module
    // level when the test is skipped.
    const { LanguageClient } = await import('vscode-languageclient/node');

    const client = new LanguageClient(
      'apex-lsp-integration-test',
      'Apex LSP Integration Test',
      {
        run: { module: serverPath, args: ['--stdio'] },
        debug: { module: serverPath, args: ['--stdio'] },
      },
      {
        documentSelector: [{ language: 'apex', scheme: 'file' }],
      },
    );

    // Start the client (this launches the server).
    await client.start();

    // Wrap in our adapter.
    connection = new LanguageClientConnection(client);

    // The client should be running.
    expect(connection.isListening()).toBe(true);

    // Create the core on the adapter. Since the LanguageClient manages its own
    // lifecycle (already listening), we pass it directly — ApexClientCore.create
    // will detect `isListening() === true` and skip the precondition check
    // because LanguageClientConnection is already running.
    core = await ApexClientCore.create(connection);

    // Initialize with default Apex settings.
    const initResult = await core.initialize(DEFAULT_APEX_SETTINGS, {
      rootUri: `file://${process.cwd()}`,
    });

    // The server should return capabilities.
    expect(initResult).toBeDefined();
    expect(initResult.capabilities).toBeDefined();

    // Adapter still reports running.
    expect(connection.isListening()).toBe(true);

    // Shutdown + dispose.
    await core.shutdown();
    await core.dispose();

    // After dispose, the client should have stopped.
    expect(connection.isListening()).toBe(false);

    // Prevent afterAll from double-disposing.
    core = undefined;
    connection = undefined;
  }, 120_000);
});
