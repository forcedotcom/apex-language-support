/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Worker entry point for Apex Language Server
 *
 * This entry point provides worker-specific exports for running
 * the LSP server in web worker environments.
 */

// Core exports
export { ServerConfigFactory } from '../core/ServerConfig';
export type { WorkerServerConfig } from '../core/ServerConfig';

// Worker-specific server
export { startApexWebWorker } from '../environments/worker/WorkerServer';

// Worker-specific connection
export { WorkerConnectionFactory } from '../environments/worker/WorkerConnection';

// Communication layer
export { WorkerMessageBridge } from '../communication/PlatformBridges.worker';
export { SelfMessageTransport } from '../communication/MessageTransport';

// Storage
export { WorkerStorageFactory } from '../storage/MemoryStorage';

// Server implementations
export { LazyLSPServer } from '../server/LazyLSPServer';
export { LCSAdapter } from '../server/LCSAdapter';

// Utilities
export {
  getWorkerSelf,
  isWorkerPostMessageAvailable,
} from '../utils/EnvironmentUtils';
