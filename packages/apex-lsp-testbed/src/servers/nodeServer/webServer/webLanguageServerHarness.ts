/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  ApexJsonRpcClient,
  ConsoleLogger,
  JsonRpcClientOptions,
} from '../../../client/ApexJsonRpcClient';
import { RequestResponseCapturingMiddleware } from '../../../test-utils/RequestResponseCapturingMiddleware';
import { ServerType } from '../../../utils/serverUtils';

// Determine project root directory
const findProjectRoot = () => {
  // Start from current working directory
  let currentDir = process.cwd();

  // Look for package.json to identify project root
  while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
    const parentDir = path.dirname(currentDir);

    // If we've reached the filesystem root, stop searching
    if (parentDir === currentDir) {
      return process.cwd(); // Fallback to CWD if we can't find package.json
    }

    currentDir = parentDir;
  }

  return currentDir;
};

/**
 * Harness for testing the Node.js web-apex-ls language server
 */
export class WebLanguageServerHarness {
  private client: ApexJsonRpcClient;
  private logger: ConsoleLogger;
  private middleware: RequestResponseCapturingMiddleware;
  private projectRoot: string;

  /**
   * Creates a new harness for the web-apex-ls language server
   */
  constructor() {
    this.logger = new ConsoleLogger('WebLanguageServerHarness');
    this.middleware = new RequestResponseCapturingMiddleware();
    this.projectRoot = findProjectRoot();

    // Find the server module path
    const serverPath = this.findServerPath();

    // Configure the client
    const clientOptions: JsonRpcClientOptions = {
      serverPath,
      nodeArgs: ['--nolazy'],
      env: process.env,
      serverType: 'webServer' as ServerType,
    };

    // Create the client
    this.client = new ApexJsonRpcClient(clientOptions, this.logger);

    // Install the middleware
    this.middleware.installOnClient(this.client);
  }

  /**
   * Find the path to the web-apex-ls language server module
   * @returns Path to the server module
   */
  private findServerPath(): string {
    // First, check if path is provided via environment variable
    if (process.env.WEB_LS_SERVER_PATH) {
      this.logger.info(
        `Using server path from environment: ${process.env.WEB_LS_SERVER_PATH}`,
      );
      return process.env.WEB_LS_SERVER_PATH;
    }

    // Look for the built server module in the web-apex-ls package
    const webLsPackagePath = path.join(
      this.projectRoot,
      'packages',
      'apex-ls-browser',
    );

    const distPath = path.join(webLsPackagePath, 'dist', 'src', 'index.js');

    if (fs.existsSync(distPath)) {
      this.logger.info(`Found apex-ls-browser server at: ${distPath}`);
      return distPath;
    }

    // If we couldn't find the server, throw an error
    throw new Error(
      'Could not find apex-ls-browser server. ' +
        'Please ensure the package is built by running "npm run build" in the project root.',
    );
  }

  /**
   * Run tests against the language server
   */
  async runTests(): Promise<void> {
    try {
      this.logger.info('Starting Web Apex Language Server tests...');

      // Start the client
      await this.client.start();

      // Get server capabilities
      const capabilities = this.client.getServerCapabilities();
      this.logger.info(
        `Server capabilities: ${JSON.stringify(capabilities, null, 2)}`,
      );

      // Run basic document test
      await this.testBasicDocument();

      // Run completion test
      await this.testCompletion();

      // Run hover test
      await this.testHover();

      // Stop the client
      await this.client.stop();

      this.logger.info('All tests completed successfully');
    } catch (error) {
      this.logger.error(`Test failed: ${error}`);

      // Ensure client is stopped
      try {
        await this.client.stop();
      } catch (_) {
        // Ignore errors during shutdown
      }

      process.exit(1);
    } finally {
      // Uninstall the middleware
      this.middleware.uninstall();
    }
  }

  /**
   * Test basic document operations
   */
  private async testBasicDocument(): Promise<void> {
    this.logger.info('===== Testing Basic Document Operations =====');

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
    this.logger.info(`Opening document: ${testDocumentUri}`);
    this.client.openTextDocument(testDocumentUri, documentContent, 'apex');

    // Update document
    this.logger.info('Updating document content');
    const updatedContent = documentContent.replace(
      'this.count++;',
      'this.count += 2;',
    );
    this.client.updateTextDocument(testDocumentUri, updatedContent, 2);

    // Close document
    this.logger.info('Closing document');
    this.client.closeTextDocument(testDocumentUri);

    this.logger.info('Basic document operations completed successfully\n');
  }

  /**
   * Test completion requests
   */
  private async testCompletion(): Promise<void> {
    this.logger.info('===== Testing Completion Requests =====');

    // Sample Apex class content with completion point
    const testDocumentUri = 'file:///completion-test.cls';
    const documentContent = `
public class CompletionTest {
    public void testMethod() {
        this.
    }
}`;

    // Open document
    this.client.openTextDocument(testDocumentUri, documentContent, 'apex');

    // Request completion
    this.logger.info('Requesting completion at line 3, character 13');
    const completionResult = await this.client.completion(
      testDocumentUri,
      3,
      13,
    );

    // Log completion results
    if (
      completionResult &&
      completionResult.items &&
      completionResult.items.length > 0
    ) {
      this.logger.info(
        `Received ${completionResult.items.length} completion items`,
      );
      completionResult.items.forEach((item: any) => {
        this.logger.info(` - ${item.label} (${item.kind})`);
      });
    } else {
      this.logger.info('No completion items received');
    }

    // Close document
    this.client.closeTextDocument(testDocumentUri);

    this.logger.info('Completion test completed\n');
  }

  /**
   * Test hover requests
   */
  private async testHover(): Promise<void> {
    this.logger.info('===== Testing Hover Requests =====');

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
    this.client.openTextDocument(testDocumentUri, documentContent, 'apex');

    // Request hover
    this.logger.info('Requesting hover at line 5, character 14');
    const hoverResult = await this.client.hover(testDocumentUri, 5, 14);

    // Log hover results
    if (hoverResult && hoverResult.contents) {
      if (typeof hoverResult.contents === 'string') {
        this.logger.info(`Hover content: ${hoverResult.contents}`);
      } else if (hoverResult.contents.kind && hoverResult.contents.value) {
        this.logger.info(`Hover content (${hoverResult.contents.kind}):`);
        this.logger.info(hoverResult.contents.value);
      } else {
        this.logger.info(
          `Hover content: ${JSON.stringify(hoverResult.contents)}`,
        );
      }
    } else {
      this.logger.info('No hover information received');
    }

    // Close document
    this.client.closeTextDocument(testDocumentUri);

    this.logger.info('Hover test completed\n');
  }
}

/**
 * Create and return a new harness instance
 */
export function createWebLanguageServerHarness(): WebLanguageServerHarness {
  return new WebLanguageServerHarness();
}

/**
 * Main entry point when running this harness directly
 */
export function main(): void {
  const harness = createWebLanguageServerHarness();
  harness.runTests().catch((error) => {
    console.error('Failed to run tests:', error);
    process.exit(1);
  });
}

// Only run the main function if this file is being executed directly
if (require.main === module) {
  main();
}
