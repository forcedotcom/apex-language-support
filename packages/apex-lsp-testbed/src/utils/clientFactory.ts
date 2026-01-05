/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
import {
  ApexJsonRpcClient,
  ConsoleLogger,
  JsonRpcClientOptions,
} from '../client/ApexJsonRpcClient';
import { ServerType } from './serverUtils';

/**
 * Creates an appropriate client instance based on server type
 */
export function createClient(
  options: JsonRpcClientOptions,
  serverType: ServerType,
  logger?: ConsoleLogger,
): ApexJsonRpcClient {
  if (!logger) {
    logger = new ConsoleLogger();
  }

  if (serverType === 'demo') {
    return new MockApexJsonRpcClient(options, logger);
  } else {
    return new ApexJsonRpcClient(options, logger);
  }
}

/**
 * Mock implementation of ApexJsonRpcClient for demo mode
 * This simulates responses without starting a real server
 */
export class MockApexJsonRpcClient extends ApexJsonRpcClient {
  private documentContents: HashMap<string, string> = new HashMap();
  private isStarted = false;
  private mockCapabilities = {
    textDocumentSync: {
      openClose: true,
      change: 1, // full content sync
    },
    completionProvider: {
      resolveProvider: false,
      triggerCharacters: ['.'],
    },
    hoverProvider: true,
    documentSymbolProvider: true,
    documentFormattingProvider: true,
  };

  constructor(options: JsonRpcClientOptions, logger?: ConsoleLogger) {
    super(options, logger || new ConsoleLogger('MockApexJsonRpcClient'));
  }

  /**
   * Mock start method - doesn't actually start a server
   */
  public async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    this.isStarted = true;
    // No need to call super.start() as we're not starting a real server
  }

  /**
   * Mock stop method
   */
  public async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    this.isStarted = false;
    // No need to call super.stop() as we didn't start a real server
  }

  /**
   * Mock getServerCapabilities method
   */
  public getServerCapabilities(): any {
    return this.mockCapabilities;
  }

  /**
   * Mock sendRequest method
   */
  public async sendRequest<T>(method: string, params: any): Promise<T> {
    if (!this.isStarted) {
      throw new Error('Client not initialized');
    }

    // Return mock responses based on the request method
    switch (method) {
      case 'textDocument/completion':
        return this.mockCompletion(params) as unknown as T;
      case 'textDocument/hover':
        return this.mockHover(params) as unknown as T;
      case 'textDocument/documentSymbol':
        return this.mockDocumentSymbol(params) as unknown as T;
      case 'textDocument/formatting':
        return this.mockFormatting(params) as unknown as T;
      default:
        return {} as T;
    }
  }

  /**
   * Mock sendNotification method
   */
  public sendNotification(method: string, params: any): void {
    if (!this.isStarted) {
      throw new Error('Client not initialized');
    }

    // Handle document notifications
    switch (method) {
      case 'textDocument/didOpen':
        this.documentContents.set(
          params.textDocument.uri,
          params.textDocument.text,
        );
        break;
      case 'textDocument/didChange':
        this.documentContents.set(
          params.textDocument.uri,
          params.contentChanges[0].text,
        );
        break;
      case 'textDocument/didClose':
        this.documentContents.delete(params.textDocument.uri);
        break;
    }
  }

  /**
   * Mock completion request
   */

  private mockCompletion(params: any): any {
    return [
      {
        label: 'getName',
        kind: 2, // Method
        detail: 'String getName()',
        documentation: 'Gets the name of the instance.',
      },
      {
        label: 'setName',
        kind: 2, // Method
        detail: 'void setName(String name)',
        documentation: 'Sets the name of the instance.',
      },
      {
        label: 'count',
        kind: 7, // Property
        detail: 'Integer',
        documentation: 'The count property.',
      },
      {
        label: 'isActive',
        kind: 7, // Property
        detail: 'Boolean',
        documentation: 'Indicates if the instance is active.',
      },
    ];
  }

  /**
   * Mock hover request
   */

  private mockHover(params: any): any {
    return {
      contents: {
        kind: 'markdown',
        value: [
          '**Apex Demo Server**',
          '',
          'This is a hover information example from the mock client.',
          '',
          '```apex',
          'public String getGreeting() {',
          '    return "Hello from Apex Mock Client!";',
          '}',
          '```',
        ].join('\n'),
      },
    };
  }

  /**
   * Mock document symbol request
   */

  private mockDocumentSymbol(params: any): any {
    return [
      {
        name: 'TestClass',
        kind: 5, // Class
        range: {
          start: { line: 1, character: 0 },
          end: { line: 12, character: 1 },
        },
        selectionRange: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 18 },
        },
        children: [
          {
            name: 'name',
            kind: 8, // Property
            range: {
              start: { line: 2, character: 4 },
              end: { line: 2, character: 24 },
            },
            selectionRange: {
              start: { line: 2, character: 12 },
              end: { line: 2, character: 16 },
            },
          },
          {
            name: 'TestClass',
            kind: 9, // Constructor
            range: {
              start: { line: 4, character: 4 },
              end: { line: 6, character: 5 },
            },
            selectionRange: {
              start: { line: 4, character: 4 },
              end: { line: 4, character: 13 },
            },
          },
          {
            name: 'getName',
            kind: 6, // Method
            range: {
              start: { line: 8, character: 4 },
              end: { line: 10, character: 5 },
            },
            selectionRange: {
              start: { line: 8, character: 4 },
              end: { line: 8, character: 11 },
            },
          },
        ],
      },
    ];
  }

  /**
   * Mock formatting request
   */
  private mockFormatting(params: any): any {
    const content = this.documentContents.get(params.textDocument.uri);
    if (!content) {
      return [];
    }

    // Simple formatting simulation
    return [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 999, character: 999 },
        },
        newText: content
          .split('\n')
          .map((line) => line.trim()) // Remove existing whitespace
          .join('\n')
          .replace(/\{/g, ' {') // Add space before braces
          .replace(/;/g, ';\n') // Add newline after semicolons
          .replace(/\}/g, '}\n') // Add newline after closing braces
          .replace(/\s*\n\s*/g, '\n'), // Clean up extra whitespace
      },
    ];
  }
}

module.exports = { createClient, MockApexJsonRpcClient };
