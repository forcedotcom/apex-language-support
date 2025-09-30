/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Browser entry point for Apex Language Server
 *
 * This entry point provides browser-specific exports for creating
 * and managing LSP connections in browser environments.
 */

// Core exports
export { ServerConfigFactory } from '../core/ServerConfig';
export type { BrowserServerConfig } from '../core/ServerConfig';

// Browser-specific server
export {
  BrowserServer,
  createBrowserServer,
} from '../environments/browser/BrowserServer';

// Browser-specific connection
export { ConnectionFactory } from '../environments/browser/BrowserConnection';

// Communication layer
export { BrowserMessageBridge } from '../communication/PlatformBridges.browser';
export { WorkerMessageTransport } from '../communication/MessageTransport';

// Storage
export { BrowserStorageFactory } from '../storage/BrowserStorage';

// Utilities
export { isBrowserMainThread } from '../utils/EnvironmentUtils';

// Legacy compatibility exports
export { UniversalExtensionClient } from '../client/UniversalExtensionClient';
export { WorkerLauncher } from '../launcher/WorkerLauncher';
export type { WorkerLaunchResult } from '../launcher/WorkerLauncher';
