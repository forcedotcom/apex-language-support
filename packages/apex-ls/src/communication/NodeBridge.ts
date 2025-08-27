/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import {
  StreamMessageReader,
  StreamMessageWriter,
  SocketMessageReader,
  SocketMessageWriter,
  IPCMessageReader,
  IPCMessageWriter,
} from 'vscode-jsonrpc/node';
import * as net from 'net';
import { BaseMessageBridge } from './CoreBridge';
// Local interfaces for Node.js configuration
export interface NodeConfig {
  mode: 'stdio' | 'socket' | 'ipc';
  port?: number; // For socket mode
  host?: string; // For socket mode
  logger?: Logger;
}
import { isNodeEnvironment } from '@salesforce/apex-lsp-shared';

/**
 * Node.js-specific message bridge implementation
 * Handles communication via stdio, socket, or IPC in Node.js environments
 */
export class NodeMessageBridge extends BaseMessageBridge {
  /**
   * Creates a message connection for stdio communication
   */
  static forStdio(logger?: Logger): MessageConnection {
    const instance = new NodeMessageBridge();
    instance.checkEnvironment('Node.js');

    const reader = new StreamMessageReader(process.stdin as any);
    const writer = new StreamMessageWriter(process.stdout);

    return instance.createConnection(reader, writer, 'Stdio', logger);
  }

  /**
   * Creates a message connection for socket communication
   */
  static forSocket(
    port: number,
    host = 'localhost',
    logger?: Logger,
  ): MessageConnection {
    const instance = new NodeMessageBridge();
    instance.checkEnvironment('Node.js');

    const socket = net.createConnection({ port, host });
    const reader = new SocketMessageReader(socket as any);
    const writer = new SocketMessageWriter(socket as any);

    // Handle socket errors
    socket.on('error', (error: any) => {
      logger?.error(`Socket connection error: ${error.message}`);
    });

    return instance.createConnection(reader, writer, 'Socket', logger);
  }

  /**
   * Creates a message connection for IPC communication
   */
  static forIPC(logger?: Logger): MessageConnection {
    const instance = new NodeMessageBridge();
    instance.checkEnvironment('Node.js');

    const reader = new IPCMessageReader(process);
    const writer = new IPCMessageWriter(process);

    return instance.createConnection(reader, writer, 'IPC', logger);
  }

  /**
   * Creates a message connection based on configuration
   */
  static createConnection(config: NodeConfig): MessageConnection {
    const instance = new NodeMessageBridge();
    instance.checkEnvironment('Node.js');

    switch (config.mode) {
      case 'stdio':
        return NodeMessageBridge.forStdio(config.logger);

      case 'socket':
        if (!config.port) {
          throw new Error('Port required for socket connection');
        }
        return NodeMessageBridge.forSocket(
          config.port,
          config.host,
          config.logger,
        );

      case 'ipc':
        return NodeMessageBridge.forIPC(config.logger);

      default:
        throw new Error(`Unsupported connection mode: ${config.mode}`);
    }
  }

  /**
   * Checks if current environment is supported
   */
  protected isEnvironmentSupported(): boolean {
    return isNodeEnvironment();
  }
}

/**
 * Convenience function for creating Node.js message bridges
 */
export async function createNodeMessageBridge(
  config: NodeConfig,
): Promise<MessageConnection> {
  return NodeMessageBridge.createConnection(config);
}
