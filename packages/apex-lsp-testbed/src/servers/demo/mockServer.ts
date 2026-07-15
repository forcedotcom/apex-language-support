/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexClientCore } from '@salesforce/apex-lsp-client';
import { DEFAULT_APEX_SETTINGS } from '@salesforce/apex-lsp-shared';

import { ApexLspTestClient } from '../../test-utils/ApexLspTestClient';
import { MockRpcConnection } from '../../test-utils/MockRpcConnection';

/**
 * Simple console logger for the mock server
 */
class ConsoleLogger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  info(message: string): void {
    console.log(`[${this.prefix}] ${message}`);
  }

  error(message: string): void {
    console.error(`[${this.prefix}] ERROR: ${message}`);
  }
}

/**
 * Mock server for the Apex Language Server using the SDK.
 * Uses MockRpcConnection + ApexClientCore for demo/test mode.
 */
export class ApexLanguageServerMock {
  private client: ApexLspTestClient | undefined;
  private core: ApexClientCore | undefined;
  private logger: ConsoleLogger;

  /**
   * Creates a new mock server
   */
  constructor() {
    this.logger = new ConsoleLogger('ApexLspMockServer');
  }

  /**
   * Initialize the SDK client in demo mode
   */
  private async initializeClient(): Promise<void> {
    const mockConn = new MockRpcConnection();
    this.core = await ApexClientCore.create(mockConn);
    mockConn.listen();
    const initResult = await this.core.initialize(DEFAULT_APEX_SETTINGS);
    this.client = new ApexLspTestClient(this.core, initResult);
  }

  /**
   * Run tests against the language server
   */
  async runTests(): Promise<void> {
    try {
      this.logger.info('Starting Apex Language Server tests...');
      this.logger.info('====================================');
      this.logger.info('Running in demonstration mode');
      this.logger.info('Using MockRpcConnection with SDK');
      this.logger.info('====================================\n');

      // Initialize the client
      await this.initializeClient();

      // Get server capabilities
      const capabilities = this.client!.getServerCapabilities();
      this.logger.info(
        `Server capabilities: ${JSON.stringify(capabilities, null, 2)}`,
      );

      // Run tests
      await this.testBasicDocument();
      await this.testCompletion();
      await this.testHover();
      await this.testDocumentSymbols();

      // Shutdown
      await this.core!.shutdown();
      await this.core!.dispose();

      this.logger.info('====================================');
      this.logger.info('Demonstration completed successfully');
      this.logger.info('====================================');
    } catch (error) {
      this.logger.error(`Test failed: ${error}`);

      // Ensure client is stopped
      try {
        if (this.core) {
          await this.core.shutdown();
          await this.core.dispose();
        }
      } catch (_) {
        // Ignore errors during shutdown
      }

      process.exit(1);
    }
  }

  /**
   * Test basic document operations
   */
  private async testBasicDocument(): Promise<void> {
    this.logger.info('Testing basic document operations...');

    const uri = 'file:///test.cls';
    const content = `
public class TestClass {
    private String name;

    public TestClass(String name) {
        this.name = name;
    }

    public void sayHello() {
        System.debug('Hello, ' + this.name);
    }
}`.trim();

    // Open document
    this.client!.openTextDocument(uri, content, 'apex');

    // Update document
    const updatedContent = content.replace('Hello,', 'Hi,');
    this.client!.updateTextDocument(uri, updatedContent, 2);

    // Close document
    this.client!.closeTextDocument(uri);

    this.logger.info('Basic document operations test passed');
  }

  /**
   * Test code completion
   */
  private async testCompletion(): Promise<void> {
    this.logger.info('Testing code completion...');

    const uri = 'file:///completion-test.cls';
    const content = `
public class CompletionTest {
    public void testMethod() {
        System.
    }
}`.trim();

    // Open document
    this.client!.openTextDocument(uri, content, 'apex');

    // Request completion
    const completionResult = await this.client!.completion({
      textDocument: { uri },
      position: { line: 2, character: 16 },
    });

    // Log completion results
    if (completionResult && Array.isArray(completionResult)) {
      this.logger.info(`Completion items: ${completionResult.length}`);
      if (completionResult.length > 0) {
        this.logger.info(
          `First completion item: ${JSON.stringify(completionResult[0])}`,
        );
      }
    } else {
      this.logger.info('Completion items: 0');
    }

    // Close document
    this.client!.closeTextDocument(uri);

    this.logger.info('Completion test completed');
  }

  /**
   * Test hover information
   */
  private async testHover(): Promise<void> {
    this.logger.info('Testing hover information...');

    const uri = 'file:///hover-test.cls';
    const content = `
public class HoverTest {
    public void testMethod() {
        System.debug('Hello');
    }
}`.trim();

    // Open document
    this.client!.openTextDocument(uri, content, 'apex');

    // Request hover at 'System.debug'
    const hoverResult = await this.client!.hover({
      textDocument: { uri },
      position: { line: 2, character: 10 },
    });

    // Log hover results
    this.logger.info(`Hover result: ${JSON.stringify(hoverResult)}`);

    // Close document
    this.client!.closeTextDocument(uri);

    this.logger.info('Hover test completed');
  }

  /**
   * Test document symbols
   */
  private async testDocumentSymbols(): Promise<void> {
    this.logger.info('Testing document symbols...');

    const uri = 'file:///symbols-test.cls';
    const content = `
public class SymbolsTest {
    private String name;
    private Integer count;

    public SymbolsTest() {
        this.name = 'Test';
        this.count = 0;
    }

    public void incrementCount() {
        this.count++;
    }

    public Integer getCount() {
        return this.count;
    }
}`.trim();

    // Open document
    this.client!.openTextDocument(uri, content, 'apex');

    // Request document symbols
    const symbolsResult = await this.client!.documentSymbol({
      textDocument: { uri },
    });

    // Log symbol results
    if (symbolsResult && Array.isArray(symbolsResult)) {
      this.logger.info(`Document symbols: ${symbolsResult.length}`);
      if (symbolsResult.length > 0) {
        const symbolNames = symbolsResult.map((s: any) => s.name).join(', ');
        this.logger.info(`Symbol names: ${symbolNames}`);
      }
    } else {
      this.logger.info('Document symbols: 0');
    }

    // Close document
    this.client!.closeTextDocument(uri);

    this.logger.info('Document symbols test completed');
  }
}

// Export a function to create and run the mock server
export function createMockServer(): ApexLanguageServerMock {
  return new ApexLanguageServerMock();
}

// Main entry point when run directly
export function main(): void {
  const mockServer = createMockServer();
  mockServer.runTests().catch((error) => {
    console.error('Failed to run mock server:', error);
    process.exit(1);
  });
}

// If this file is run directly, execute the main function
if (require.main === module) {
  main();
}
