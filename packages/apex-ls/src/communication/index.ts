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
  BaseConfig,
  BrowserConfig,
  NodeConfig,
  WorkerConfig,
  ClientConfig,

  // LSP types re-exports
  InitializeParams,
  InitializeResult,
  EnvironmentType,
} from './Interfaces';

// =============================================================================
// TRANSPORT IMPLEMENTATIONS
// =============================================================================

export {
  WorkerMessageTransport,
  SelfMessageTransport,
} from './MessageTransports';

// =============================================================================
// BRIDGE IMPLEMENTATIONS
// =============================================================================

export { BrowserMessageBridge, WorkerMessageBridge } from './PlatformBridges';
export { NodeMessageBridge } from './NodeBridge';

// Core bridge utilities
export {
  BaseMessageBridge,
  getErrorMessage,
  createConnectionErrorHandler,
  createConnectionCloseHandler,
  createTransportMessageReader,
  createTransportMessageWriter,
} from './CoreBridge';

// =============================================================================
// CLIENT IMPLEMENTATIONS
// =============================================================================

export {
  Client as NodeClient,
  ClientFactory as NodeClientFactory,
} from './NodeClient';
export {
  Client as BrowserClient,
  ClientFactory as BrowserClientFactory,
} from './BrowserClient';
