/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Node.js entry point for Apex Language Server
 *
 * This entry point provides Node.js-specific exports for running
 * the LSP server in Node.js environments.
 */

// Core exports
export { ServerConfigFactory } from '../core/ServerConfig';
export type { NodeServerConfig } from '../core/ServerConfig';

// Node-specific server
export { startApexNodeServer } from '../environments/node/NodeServer';

// Node-specific connection
export { NodeConnectionFactory } from '../environments/node/NodeConnection';

// Communication layer
export { NodeMessageBridge } from '../communication/NodeBridge';

// Server implementations
export { LCSAdapter } from '../server/LCSAdapter';

// Storage (Node.js typically uses file system or memory storage)
export { WorkerStorageFactory as NodeStorageFactory } from '../storage/MemoryStorage';

// Utilities
export { isNodeEnvironment } from '@salesforce/apex-lsp-shared';
