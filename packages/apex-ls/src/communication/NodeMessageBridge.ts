/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  MessageConnection,
  MessageReader,
  MessageWriter,
  Logger,
} from 'vscode-jsonrpc';
import {
  createMessageConnection,
  ResponseError,
  ErrorCodes,
} from 'vscode-jsonrpc';
import {
  StreamMessageReader,
  StreamMessageWriter,
  SocketMessageReader,
  SocketMessageWriter,
  IPCMessageReader,
  IPCMessageWriter,
} from 'vscode-jsonrpc/node';
import * as net from 'net';
import { isNodeEnvironment } from '../utils/EnvironmentDetector';

/**
 * Node.js connection configuration
 */
export interface NodeConnectionConfig {
  mode: 'stdio' | 'socket' | 'ipc';
  port?: number; // For socket mode
  host?: string; // For socket mode
  logger?: Logger;
}

/**
 * Node.js-specific message bridge implementation
 * Handles communication via stdio, socket, or IPC in Node.js environments
 */
export class NodeMessageBridge {
  /**
   * Creates a message connection for stdio communication
   */
  static forStdio(logger?: Logger): MessageConnection {
    if (!isNodeEnvironment()) {
      throw new Error('Stdio connection only available in Node.js environment');
    }

    const reader = new StreamMessageReader(process.stdin);
    const writer = new StreamMessageWriter(process.stdout);
    const connection = createMessageConnection(reader, writer, logger);

    // Handle connection errors
    connection.onError((error) => {
      const errorMessage = Array.isArray(error) 
        ? error[0]?.message || 'Unknown error' 
        : error.message || 'Unknown error';
      logger?.error(`Stdio message connection error: ${errorMessage}`);
    });

    return connection;
  }

  /**
   * Creates a message connection for socket communication
   */
  static forSocket(port: number, host = 'localhost', logger?: Logger): MessageConnection {
    if (!isNodeEnvironment()) {
      throw new Error('Socket connection only available in Node.js environment');
    }

    const socket = net.createConnection({ port, host });
    const reader = new SocketMessageReader(socket);
    const writer = new SocketMessageWriter(socket);
    const connection = createMessageConnection(reader, writer, logger);

    // Handle socket errors
    socket.on('error', (error) => {
      logger?.error(`Socket connection error: ${error.message}`);
    });

    // Handle connection errors
    connection.onError((error) => {
      const errorMessage = Array.isArray(error) 
        ? error[0]?.message || 'Unknown error' 
        : error.message || 'Unknown error';
      logger?.error(`Socket message connection error: ${errorMessage}`);
    });

    return connection;
  }

  /**
   * Creates a message connection for IPC communication
   */
  static forIPC(logger?: Logger): MessageConnection {
    if (!isNodeEnvironment()) {
      throw new Error('IPC connection only available in Node.js environment');
    }

    const reader = new IPCMessageReader(process);
    const writer = new IPCMessageWriter(process);
    const connection = createMessageConnection(reader, writer, logger);

    // Handle connection errors
    connection.onError((error) => {
      const errorMessage = Array.isArray(error) 
        ? error[0]?.message || 'Unknown error' 
        : error.message || 'Unknown error';
      logger?.error(`IPC message connection error: ${errorMessage}`);
    });

    return connection;
  }

  /**
   * Creates a message connection based on configuration
   */
  static createConnection(config: NodeConnectionConfig): MessageConnection {
    switch (config.mode) {
      case 'stdio':
        return NodeMessageBridge.forStdio(config.logger);
      
      case 'socket':
        if (!config.port) {
          throw new Error('Port required for socket connection');
        }
        return NodeMessageBridge.forSocket(config.port, config.host, config.logger);
      
      case 'ipc':
        return NodeMessageBridge.forIPC(config.logger);
      
      default:
        throw new Error(`Unsupported connection mode: ${config.mode}`);
    }
  }

  /**
   * Detects if current environment is Node.js
   */
  static isNodeEnvironment(): boolean {
    return isNodeEnvironment();
  }
}

/**
 * Convenience function for creating Node.js message bridges
 */
export function createNodeMessageBridge(config: NodeConnectionConfig): MessageConnection {
  return NodeMessageBridge.createConnection(config);
}