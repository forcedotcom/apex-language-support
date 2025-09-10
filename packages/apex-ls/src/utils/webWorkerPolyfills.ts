/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Web Worker polyfills for Node.js APIs
 *
 * This module provides polyfills for Node.js APIs that are needed in web worker environments.
 * These polyfills ensure compatibility when running language server code in browser contexts.
 */

/**
 * Set up process polyfill for web worker environment
 *
 * Many Node.js packages expect a global `process` object with specific properties.
 * This polyfill provides the minimal interface needed for compatibility.
 */
export function setupProcessPolyfill(): void {
  if (typeof globalThis.process === 'undefined') {
    // Process polyfill for web worker environment
    globalThis.process = {
      env: { NODE_ENV: 'production' },
      nextTick: (fn: Function) => setTimeout(fn, 0),
      cwd: () => '/',
      platform: 'browser',
      version: 'v16.0.0',
      versions: { node: '16.0.0' },
      browser: true,
      argv: [],
      pid: 1,
    } as any;
    console.log('[APEX-WORKER] Process polyfill loaded for web worker');
  }
}

/**
 * Set up Buffer polyfill for web worker environment
 *
 * Attempts to use the bundled Buffer polyfill first, falling back to a minimal
 * implementation if the full polyfill is not available.
 */
export function setupBufferPolyfill(): void {
  if (typeof globalThis.Buffer === 'undefined') {
    try {
      // Try to use the bundled Buffer polyfill
      const { Buffer } = require('buffer');
      globalThis.Buffer = Buffer;
      console.log('[APEX-WORKER] Buffer polyfill loaded successfully');
    } catch (_error) {
      // Create a minimal Buffer polyfill if the full one fails
      globalThis.Buffer = {
        from: (data: any) => new Uint8Array(data),
        isBuffer: (obj: any) => obj instanceof Uint8Array,
      } as any;
      console.log('[APEX-WORKER] Minimal Buffer polyfill loaded');
    }
  }
}

/**
 * Initialize all web worker polyfills
 *
 * Call this function early in your web worker to set up all necessary polyfills
 * for Node.js APIs that may be required by the language server components.
 */
export function setupWebWorkerPolyfills(): void {
  setupProcessPolyfill();
  setupBufferPolyfill();
}
