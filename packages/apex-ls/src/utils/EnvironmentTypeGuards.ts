/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Type guard for Node.js process
 */
export interface NodeProcess {
  versions: {
    node: string;
  };
}

/**
 * Type guard for browser window
 */
export interface BrowserWindow {
  document: any;
}

/**
 * Type guard for web worker self
 */
export interface WebWorkerSelf {
  postMessage: (message: any, transfer?: any[]) => void;
  addEventListener: (type: string, listener: (event: any) => void) => void;
  removeEventListener: (type: string, listener: (event: any) => void) => void;
  importScripts?: (...urls: string[]) => void;
}

/**
 * Type guard for Node.js environment
 */
export function isNodeProcess(obj: unknown): obj is NodeProcess {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'versions' in obj &&
    typeof (obj as any).versions === 'object' &&
    (obj as any).versions !== null &&
    'node' in (obj as any).versions &&
    typeof (obj as any).versions.node === 'string'
  );
}

/**
 * Type guard for browser window
 */
export function isBrowserWindow(obj: unknown): obj is BrowserWindow {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'document' in obj &&
    typeof (obj as any).document === 'object' &&
    (obj as any).document !== null &&
    'createElement' in (obj as any).document
  );
}

/**
 * Type guard for web worker self
 */
export function isWebWorkerSelf(obj: unknown): obj is WebWorkerSelf {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'self' in globalThis &&
    'postMessage' in obj &&
    typeof (obj as any).postMessage === 'function'
  );
}
