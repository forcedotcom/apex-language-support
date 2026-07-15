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

import { parseArgs, printHelp, createClientOptions } from './utils/serverUtils';
import {
  prepareWorkspace,
  registerWorkspaceCleanup,
} from './utils/workspaceUtils';
import { ApexLspTestClient } from './test-utils/ApexLspTestClient';
import { MockRpcConnection } from './test-utils/MockRpcConnection';

/**
 * Run node server tests
 */
async function runNodeServerTests(client: ApexLspTestClient): Promise<void> {
  console.log('Starting Node Apex Language Server tests...');

  // Get server capabilities
  const capabilities = client.getServerCapabilities();
  console.log(`Server capabilities: ${JSON.stringify(capabilities, null, 2)}`);

  // Run basic document test
  await testBasicDocument(client);

  // Run completion test
  await testCompletion(client);

  // Run hover test
  await testHover(client);

  console.log('All tests completed successfully');
}

/**
 * Test basic document operations
 */
async function testBasicDocument(client: ApexLspTestClient): Promise<void> {
  console.log('===== Testing Basic Document Operations =====');

  const testDocumentUri = 'file:///test.cls';
  const documentContent = `
public class TestClass {
    private Integer count;
    private String name;

    public TestClass() {
        this.count = 0;
        this.name = 'Test';
    }

    public void incrementCount() {
        this.count++;
    }
}`;

  // Open document
  console.log(`Opening document: ${testDocumentUri}`);
  client.openTextDocument(testDocumentUri, documentContent, 'apex');

  // Update document
  console.log('Updating document content');
  const updatedContent = documentContent.replace(
    'this.count++;',
    'this.count += 2;',
  );
  client.updateTextDocument(testDocumentUri, updatedContent, 2);

  // Close document
  console.log('Closing document');
  client.closeTextDocument(testDocumentUri);

  console.log('Basic document operations completed successfully\n');
}

/**
 * Test completion requests
 */
async function testCompletion(client: ApexLspTestClient): Promise<void> {
  console.log('===== Testing Completion Requests =====');

  const testDocumentUri = 'file:///completion-test.cls';
  const documentContent = `
public class CompletionTest {
    public void testMethod() {
        this.
    }
}`;

  // Open document
  client.openTextDocument(testDocumentUri, documentContent, 'apex');

  // Request completion
  console.log('Requesting completion at line 3, character 13');
  const completionResult = await client.completion({
    textDocument: { uri: testDocumentUri },
    position: { line: 3, character: 13 },
  });

  // Log completion results
  if (
    completionResult &&
    Array.isArray(completionResult) &&
    completionResult.length > 0
  ) {
    console.log(`Received ${completionResult.length} completion items`);
    completionResult.forEach((item: any) => {
      console.log(` - ${item.label} (${item.kind})`);
    });
  } else {
    console.log('No completion items received');
  }

  // Close document
  client.closeTextDocument(testDocumentUri);

  console.log('Completion test completed\n');
}

/**
 * Test hover requests
 */
async function testHover(client: ApexLspTestClient): Promise<void> {
  console.log('===== Testing Hover Requests =====');

  const testDocumentUri = 'file:///hover-test.cls';
  const documentContent = `
public class HoverTest {
    private Integer count;

    public void testMethod() {
        this.count = 10;
    }
}`;

  // Open document
  client.openTextDocument(testDocumentUri, documentContent, 'apex');

  // Request hover
  console.log('Requesting hover at line 5, character 14');
  const hoverResult = await client.hover({
    textDocument: { uri: testDocumentUri },
    position: { line: 5, character: 14 },
  });

  // Log hover results
  if (hoverResult && hoverResult.contents) {
    const contents = hoverResult.contents;
    if (typeof contents === 'string') {
      console.log(`Hover content: ${contents}`);
    } else if ('kind' in contents && 'value' in contents) {
      console.log(`Hover content (${contents.kind}):`);
      console.log(contents.value);
    } else {
      console.log(`Hover content: ${JSON.stringify(contents)}`);
    }
  } else {
    console.log('No hover information received');
  }

  // Close document
  client.closeTextDocument(testDocumentUri);

  console.log('Hover test completed\n');
}

/**
 * Main function
 */
async function main(): Promise<void> {
  let core: ApexClientCore | undefined;
  try {
    // Parse command line arguments
    const options = parseArgs();

    // If help was requested, print help and exit
    if (options.showHelp) {
      printHelp();
      process.exit(0);
    }

    if (options.verbose) {
      console.log(
        `Starting Apex Language Server Testbed with ${options.serverType} server`,
      );
    }

    // Prepare workspace if specified
    const workspace = options.workspace
      ? await prepareWorkspace(options.workspace)
      : undefined;

    if (workspace) {
      console.log(`Using workspace at: ${workspace.rootPath}`);
      console.log(`Workspace URI: ${workspace.rootUri}`);
      if (workspace.isTemporary) {
        console.log(
          'This is a temporary cloned workspace that will be deleted on exit',
        );
        registerWorkspaceCleanup(workspace);
      }
    }

    let client: ApexLspTestClient;

    if (options.serverType === 'demo') {
      // Demo mode: use MockRpcConnection
      const mockConn = new MockRpcConnection();
      core = await ApexClientCore.create(mockConn);
      mockConn.listen();
      const initResult = await core.initialize(DEFAULT_APEX_SETTINGS);
      client = new ApexLspTestClient(core, initResult);
    } else {
      // Real server: use createHeadlessClient
      const clientOptions = await createClientOptions(
        options.serverType,
        options.verbose,
        workspace,
        options.suspend,
      );

      const result = await createHeadlessClient(clientOptions.serverPath, {
        nodeArgs: clientOptions.nodeArgs,
        serverArgs: clientOptions.serverArgs,
        env: clientOptions.env,
      });
      core = result.core;

      const initializeParams: Record<string, unknown> = {};
      if (clientOptions.initializeParams) {
        Object.assign(initializeParams, clientOptions.initializeParams);
      }

      const initResult = await core.initialize(
        DEFAULT_APEX_SETTINGS,
        initializeParams,
      );
      client = new ApexLspTestClient(core, initResult);
    }

    console.log(
      `Connected to ${options.serverType} language server successfully`,
    );

    // Register exit handler
    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      await core!.shutdown();
      await core!.dispose();
      process.exit(0);
    });

    // Handle different modes
    if (options.interactive) {
      console.log(
        'Interactive mode is no longer supported. Showing capabilities instead.',
      );
      const capabilities = client.getServerCapabilities();
      console.log(
        'Server capabilities:',
        JSON.stringify(capabilities, null, 2),
      );
      await core.shutdown();
      await core.dispose();
      console.log('Server stopped');
      process.exit(0);
    } else if (
      options.serverType === 'nodeServer' ||
      options.serverType === 'webServer'
    ) {
      await runNodeServerTests(client);
      await core.shutdown();
      await core.dispose();
      console.log('Tests completed and server stopped');
      process.exit(0);
    } else {
      // Non-interactive mode: show capabilities and exit
      const capabilities = client.getServerCapabilities();
      console.log(
        'Server capabilities:',
        JSON.stringify(capabilities, null, 2),
      );

      // Wait a moment before shutting down
      setTimeout(() => {
        (async () => {
          try {
            await core!.shutdown();
            await core!.dispose();
            console.log('Server stopped');
          } catch (shutdownError) {
            console.error('Error during shutdown:', shutdownError);
          }
          process.exit(0);
        })();
      }, 1000);
    }
  } catch (error) {
    console.error('Error:', error);
    // Clean up the server process if it was initialized
    if (core) {
      try {
        await core.shutdown();
      } catch {
        // Ignore shutdown errors during error cleanup
      }
      try {
        await core.dispose();
      } catch {
        // Ignore dispose errors during error cleanup
      }
    }
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
