/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import type {
  EnvironmentType,
  InitializeParams,
  InitializeResult,
} from '../types';

/**
 * Platform-agnostic message transport interface
 *
 * This interface defines the contract for sending and receiving messages
 * between different contexts (browser ↔ worker, client ↔ server, etc.)
 */
export interface MessageTransport {
  /**
   * Sends a message to the target
   */
  send(message: any): Promise<void>;

  /**
   * Sets up message listening
   */
  listen(handler: (message: any) => void): { dispose(): void };

  /**
   * Sets up error handling
   */
  onError(handler: (error: Error) => void): { dispose(): void };

  /**
   * Disposes the transport
   */
  dispose(): void;
}

/**
 * Disposable interface for cleanup
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Base configuration for creating message bridges
 */
export interface MessageBridgeConfig {
  environment?: EnvironmentType;
  logger?: Logger;
  worker?: any; // Optional worker for browser contexts (typed as any for cross-platform compatibility)
}

/**
 * Interface for environment-specific message bridge factories
 */
export interface IMessageBridgeFactory {
  /**
   * Creates a message bridge for the specific environment
   */
  createMessageBridge(config: MessageBridgeConfig): Promise<MessageConnection>;
}

/**
 * Convenience function type for creating platform-appropriate message bridges
 */
export type CreatePlatformMessageBridge = (
  config?: MessageBridgeConfig,
) => Promise<MessageConnection>;

/**
 * Unified client interface that works across all environments
 */
export interface UnifiedClientInterface {
  /**
   * Initializes the language server
   */
  initialize(params: InitializeParams): Promise<InitializeResult>;

  /**
   * Sends a notification to the server
   */
  sendNotification(method: string, params?: any): void;

  /**
   * Sends a request to the server
   */
  sendRequest<T = any>(method: string, params?: any): Promise<T>;

  /**
   * Registers a notification handler
   */
  onNotification(method: string, handler: (params: any) => void): void;

  /**
   * Registers a request handler
   */
  onRequest(method: string, handler: (params: any) => any): void;

  /**
   * Checks if the client is disposed
   */
  isDisposed(): boolean;

  /**
   * Disposes the client
   */
  dispose(): void;
}

/**
 * Node.js-specific connection configuration
 */
export interface NodeConnectionConfig {
  mode: 'stdio' | 'socket' | 'ipc';
  port?: number; // For socket mode
  host?: string; // For socket mode
  logger?: Logger;
}

/**
 * Unified client configuration for all environments
 */
export interface UnifiedClientConfig {
  environment: EnvironmentType;
  logger?: Logger;
  worker?: any; // Typed as any for cross-platform compatibility
}

/**
 * Web worker client configuration
 */
export interface WebWorkerClientConfig {
  context: any;
  logger?: Logger;
  workerFileName: string;
}
