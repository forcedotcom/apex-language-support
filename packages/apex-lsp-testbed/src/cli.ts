/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const { ConsoleLogger } = require('./client/ApexJsonRpcClient');
const {
  parseArgs,
  printHelp,
  createClientOptions,
} = require('./utils/serverUtils');
const {
  prepareWorkspace,
  registerWorkspaceCleanup,
} = require('./utils/workspaceUtils');
const { createClient } = require('./utils/clientFactory');

/**
 * Run node server tests
 */
async function runNodeServerTests(client: any, logger: any): Promise<void> {
  try {
    logger.info('Starting Node Apex Language Server tests...');

    // Get server capabilities
    const capabilities = client.getServerCapabilities();
    logger.info(
      `Server capabilities: ${JSON.stringify(capabilities, null, 2)}`,
    );

    // Run basic document test
    await testBasicDocument(client, logger);

    // Run completion test
    await testCompletion(client, logger);

    // Run hover test
    await testHover(client, logger);

    logger.info('All tests completed successfully');
  } catch (error) {
    logger.error(`Test failed: ${error}`);
    throw error;
  }
}

/**
 * Test basic document operations
 */
async function testBasicDocument(client: any, logger: any): Promise<void> {
  logger.info('===== Testing Basic Document Operations =====');

  // Sample Apex class content
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
  logger.info(`Opening document: ${testDocumentUri}`);
  await client.openTextDocument(testDocumentUri, documentContent, 'apex');

  // Update document
  logger.info('Updating document content');
  const updatedContent = documentContent.replace(
    'this.count++;',
    'this.count += 2;',
  );
  await client.updateTextDocument(testDocumentUri, updatedContent, 2);

  // Close document
  logger.info('Closing document');
  await client.closeTextDocument(testDocumentUri);

  logger.info('Basic document operations completed successfully\n');
}

/**
 * Test completion requests
 */
async function testCompletion(client: any, logger: any): Promise<void> {
  logger.info('===== Testing Completion Requests =====');

  // Sample Apex class content with completion point
  const testDocumentUri = 'file:///completion-test.cls';
  const documentContent = `
public class CompletionTest {
    public void testMethod() {
        this.
    }
}`;

  // Open document
  await client.openTextDocument(testDocumentUri, documentContent, 'apex');

  // Request completion
  logger.info('Requesting completion at line 3, character 13');
  const completionResult = await client.completion(testDocumentUri, 3, 13);

  // Log completion results
  if (
    completionResult &&
    completionResult.items &&
    completionResult.items.length > 0
  ) {
    logger.info(`Received ${completionResult.items.length} completion items`);
    completionResult.items.forEach((item: any) => {
      logger.info(` - ${item.label} (${item.kind})`);
    });
  } else {
    logger.info('No completion items received');
  }

  // Close document
  await client.closeTextDocument(testDocumentUri);

  logger.info('Completion test completed\n');
}

/**
 * Test hover requests
 */
async function testHover(client: any, logger: any): Promise<void> {
  logger.info('===== Testing Hover Requests =====');

  // Sample Apex class content with hover point
  const testDocumentUri = 'file:///hover-test.cls';
  const documentContent = `
public class HoverTest {
    private Integer count;
    
    public void testMethod() {
        this.count = 10;
    }
}`;

  // Open document
  await client.openTextDocument(testDocumentUri, documentContent, 'apex');

  // Request hover
  logger.info('Requesting hover at line 5, character 14');
  const hoverResult = await client.hover(testDocumentUri, 5, 14);

  // Log hover results
  if (hoverResult && hoverResult.contents) {
    if (typeof hoverResult.contents === 'string') {
      logger.info(`Hover content: ${hoverResult.contents}`);
    } else if (hoverResult.contents.kind && hoverResult.contents.value) {
      logger.info(`Hover content (${hoverResult.contents.kind}):`);
      logger.info(hoverResult.contents.value);
    } else {
      logger.info(`Hover content: ${JSON.stringify(hoverResult.contents)}`);
    }
  } else {
    logger.info('No hover information received');
  }

  // Close document
  await client.closeTextDocument(testDocumentUri);

  logger.info('Hover test completed\n');
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const options = parseArgs();

    // If help was requested, print help and exit
    if (options.showHelp) {
      printHelp();
      process.exit(0);
    }

    // Create logger with appropriate verbosity
    const logger = new ConsoleLogger();
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

        // Register cleanup handler for temporary workspace
        registerWorkspaceCleanup(workspace);
      }
    }

    // Create client options with workspace configuration
    const clientOptions = await createClientOptions(
      options.serverType,
      options.verbose,
      workspace,
      options.suspend,
    );

    // Create either a real or mock client based on server type
    const client = createClient(clientOptions, options.serverType, logger);

    // Start client
    await client.start();
    console.log(
      `Connected to ${options.serverType} language server successfully`,
    );

    // Register exit handler
    process.on('SIGINT', async () => {
      console.log('\nShutting down server...');
      await client.stop();
      process.exit(0);
    });

    // Handle different server types and modes
    if (options.serverType === 'nodeServer' && options.interactive) {
      // Interactive mode removed - use non-interactive mode instead
      console.log(
        'Interactive mode is no longer supported. Running tests instead.',
      );
      await runNodeServerTests(client, logger);
      await client.stop();
      console.log('Node server tests completed and server stopped');
      process.exit(0);
    } else if (options.serverType === 'nodeServer' && !options.interactive) {
      // Run node server tests in non-interactive mode
      await runNodeServerTests(client, logger);

      // Stop the client after tests complete
      await client.stop();
      console.log('Node server tests completed and server stopped');
      process.exit(0);
    } else if (options.interactive) {
      // Interactive mode removed - show capabilities instead
      console.log(
        'Interactive mode is no longer supported. Showing capabilities instead.',
      );
      const capabilities = client.getServerCapabilities();
      console.log(
        'Server capabilities:',
        JSON.stringify(capabilities, null, 2),
      );
      await client.stop();
      console.log('Server stopped');
      process.exit(0);
    } else {
      // Non-interactive mode: Just show server capabilities and exit
      const capabilities = client.getServerCapabilities();
      console.log(
        'Server capabilities:',
        JSON.stringify(capabilities, null, 2),
      );

      // Wait a moment before shutting down to ensure all messages are processed
      setTimeout(async () => {
        await client.stop();
        console.log('Server stopped');
        process.exit(0);
      }, 1000);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
