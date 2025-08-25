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

// Re-export for convenience
export type { EnvironmentType, InitializeParams, InitializeResult };

// =============================================================================
// CORE INTERFACES
// =============================================================================

/**
 * Platform-agnostic message transport interface
 */
export interface MessageTransport {
  send(message: any): Promise<void>;
  listen(handler: (message: any) => void): { dispose(): void };
  onError(handler: (error: Error) => void): { dispose(): void };
  dispose(): void;
}

/**
 * Disposable interface for cleanup
 */
export interface Disposable {
  dispose(): void;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

/**
 * Base configuration for all communication components
 */
export interface BaseConfig {
  logger?: Logger;
}

/**
 * Browser-specific configuration
 */
export interface BrowserConfig extends BaseConfig {
  worker: Worker; // Required for browser contexts
}

/**
 * Node.js-specific configuration
 */
export interface NodeConfig extends BaseConfig {
  mode: 'stdio' | 'socket' | 'ipc';
  port?: number; // For socket mode
  host?: string; // For socket mode
}

/**
 * Worker-specific configuration
 */
export interface WorkerConfig extends BaseConfig {
  // Worker configuration is minimal - just needs logger
}

/**
 * Unified client configuration for cross-platform use
 */
export interface ClientConfig extends BaseConfig {
  environment: EnvironmentType;
  worker?: Worker; // Required for browser environment
}

// =============================================================================
// CLIENT INTERFACE
// =============================================================================

/**
 * Unified client interface that works across all environments
 */
export interface ClientInterface {
  initialize(params: InitializeParams): Promise<InitializeResult>;
  sendNotification(method: string, params?: any): void;
  sendRequest<T = any>(method: string, params?: any): Promise<T>;
  onNotification(method: string, handler: (params: any) => void): void;
  onRequest(method: string, handler: (params: any) => any): void;
  isDisposed(): boolean;
  dispose(): void;
}

// =============================================================================
// FACTORY INTERFACES
// =============================================================================

/**
 * Interface for message bridge factories
 */
export interface IMessageBridgeFactory {
  createMessageBridge(config: BaseConfig): Promise<MessageConnection>;
}
