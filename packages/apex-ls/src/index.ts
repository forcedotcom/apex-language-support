/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Main entry point for Apex Language Server
 *
 * This entry point provides environment-agnostic exports and
 * automatically detects the runtime environment to provide
 * appropriate functionality.
 */

// Core exports
export { ServerConfigFactory } from './core/ServerConfig';
export type {
  ServerConfig,
  BrowserServerConfig,
  WorkerServerConfig,
  NodeServerConfig,
} from './core/ServerConfig';

// Unified connection factory
export { UnifiedConnectionFactory as ConnectionFactory } from './communication/ConnectionFactory';

// Storage interfaces
export type {
  IStorage,
  StorageConfig,
  StorageProvider,
  StorageFactory,
} from './storage/StorageInterface';

// Communication interfaces
export type { IMessageBridgeFactory } from './communication/Interfaces';
export type { NodeClientConfig } from './communication/NodeClient';

// Environment-specific re-exports
export * from './entry-points/browser';
export * from './entry-points/worker';
export * from './entry-points/node';
