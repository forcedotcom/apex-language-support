/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Connection } from 'vscode-languageserver/browser';
import type { EnvironmentType } from '../types';

/**
 * Configuration for creating connections
 */
export interface ConnectionConfig {
  environment: EnvironmentType;
  commandLineArgs?: string[];
}

/**
 * Factory for creating appropriate LSP connections based on environment
 */
export class ConnectionFactory {
  /**
   * Creates a connection appropriate for the given environment
   */
  static async createConnection(config: ConnectionConfig): Promise<Connection> {
    const { environment, commandLineArgs = [] } = config;

    switch (environment) {
      case 'node':
        return this.createNodeConnection(commandLineArgs);

      case 'webworker':
        return this.createWebWorkerConnection();

      case 'browser':
        throw new Error(
          'Browser environment should use web worker for language server',
        );

      default:
        throw new Error(`Unsupported environment: ${environment}`);
    }
  }

  /**
   * Creates a Node.js connection based on command line arguments
   */
  private static async createNodeConnection(
    args: string[],
  ): Promise<Connection> {
    // Only available in Node.js environments
    if (typeof process === 'undefined') {
      throw new Error(
        'Node.js connection can only be created in Node.js environment',
      );
    }

    // Dynamically import Node.js modules to avoid issues in web environments
    const { createConnection, ProposedFeatures, createServerSocketTransport } =
      await import('vscode-languageserver/node');

    let connection: Connection;

    if (args.includes('--stdio')) {
      connection = createConnection(process.stdin, process.stdout);
    } else if (args.includes('--node-ipc')) {
      connection = createConnection(ProposedFeatures.all);
    } else if (args.includes('--socket')) {
      const socketIndex = args.indexOf('--socket');
      const port = parseInt(args[socketIndex + 1], 10);
      // Create a socket connection using the proper transport
      const [reader, writer] = createServerSocketTransport(port);
      connection = createConnection(reader, writer);
    } else {
      throw new Error(
        'Connection type not specified. Use --stdio, --node-ipc, or --socket={number}',
      );
    }

    return connection;
  }

  /**
   * Creates a web worker connection using browser APIs
   */
  private static async createWebWorkerConnection(): Promise<Connection> {
    const { createConnection, BrowserMessageReader, BrowserMessageWriter } =
      await import('vscode-languageserver/browser');

    return createConnection(
      new BrowserMessageReader(self as any),
      new BrowserMessageWriter(self as any),
    );
  }

  /**
   * Detects the current environment
   */
  static detectEnvironment(): EnvironmentType {
    // Check for web worker environment
    if (
      typeof self !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof window === 'undefined'
    ) {
      return 'webworker';
    }

    // Check for browser environment
    if (typeof window !== 'undefined') {
      return 'browser';
    }

    // Default to Node.js
    return 'node';
  }

  /**
   * Auto-creates a connection based on detected environment
   */
  static async createAutoConnection(commandLineArgs?: string[]): Promise<{
    connection: Connection;
    environment: EnvironmentType;
  }> {
    const environment = this.detectEnvironment();
    const connection = await this.createConnection({
      environment,
      commandLineArgs,
    });

    return { connection, environment };
  }
}
