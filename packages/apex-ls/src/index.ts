/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export package-specific types only
export type { IMessageBridgeFactory } from './communication/Interfaces';
export type { NodeClientConfig } from './communication/NodeClient';

// Export environment-specific utilities and factories
export { isNodeEnvironment } from '@salesforce/apex-lsp-shared';
