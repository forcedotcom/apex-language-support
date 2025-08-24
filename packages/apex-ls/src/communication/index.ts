/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export type {
  // Core interfaces
  MessageTransport,
  Disposable,
  ClientInterface,
  IMessageBridgeFactory,

  // Configuration types
  MessageBridgeConfig,
  BrowserConfig,
  NodeConfig,
  WorkerConfig,
  ClientConfig,

  // LSP types re-exports
  InitializeParams,
  InitializeResult,
  EnvironmentType,
} from './types';

// =============================================================================
// TRANSPORT IMPLEMENTATIONS
// =============================================================================

export { WorkerMessageTransport, SelfMessageTransport } from './transports';

// =============================================================================
// BRIDGE IMPLEMENTATIONS
// =============================================================================

export { BrowserMessageBridge, WorkerMessageBridge } from './bridges';

// Legacy export for existing code (from MessageBridge.ts)
export {
  BaseMessageBridge,
  getErrorMessage,
  createConnectionErrorHandler,
  createConnectionCloseHandler,
  createTransportMessageReader,
  createTransportMessageWriter,
} from './MessageBridge';

// =============================================================================
// CLIENT IMPLEMENTATION
// =============================================================================

export { Client, ClientFactory } from './Client';

// =============================================================================
// FACTORY
// =============================================================================

export { MessageBridgeFactory } from './factory.browser';

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

// Re-export Node-specific bridge for environments that need it
export type { NodeMessageBridge } from './NodePlatformBridge';

// Legacy factory functions (deprecated - use MessageBridgeFactory instead)
// Removed - files no longer exist after consolidation
