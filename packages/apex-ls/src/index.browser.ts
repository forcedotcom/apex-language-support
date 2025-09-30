/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Browser-specific entry point for Apex Language Server
 *
 * This entry point provides only browser-compatible exports,
 * ensuring no Node.js-specific code is included in browser bundles.
 */

// Re-export everything from browser entry point
export * from './entry-points/browser';

// Legacy compatibility
export type { ClientConfig } from './communication/Interfaces';
