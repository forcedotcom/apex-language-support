/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Core interfaces and types
export type {
  MessageTransport,
  Disposable,
  MessageBridgeConfig,
  IMessageBridgeFactory,
  CreatePlatformMessageBridge,
  NodeConnectionConfig,
  UnifiedClientConfig,
  WebWorkerClientConfig,
  UnifiedClientInterface,
} from './interfaces';

// Base message bridge and utilities
export {
  BaseMessageBridge,
  getErrorMessage,
  createConnectionErrorHandler,
  createConnectionCloseHandler,
  createTransportMessageReader,
  createTransportMessageWriter,
} from './MessageBridge';

// Platform-specific bridges and transports
export {
  WorkerMessageTransport,
  SelfMessageTransport,
  BrowserMessageBridge,
  WorkerMessageBridge,
  createBrowserMessageBridge,
  createWorkerMessageBridge,
} from './PlatformBridges';

// Node.js-specific bridges (conditionally imported)
export type { NodeMessageBridge } from './NodePlatformBridge';

// Factory classes and functions
export {
  BrowserMessageBridgeFactory,
  NodeMessageBridgeFactory,
  WorkerMessageBridgeFactory,
  createBrowserMessageBridgeFactory,
  createNodeMessageBridgeFactory,
  createWorkerMessageBridgeFactory,
  createWorkerMessageBridgeWithScope,
  createPlatformMessageBridge,
} from './MessageBridgeFactory';

// High-level unified client
export { UnifiedClient, UnifiedClientFactory } from './UnifiedClient';
