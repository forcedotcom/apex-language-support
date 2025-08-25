/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

declare const require: any;

// Import critical polyfills first and set them globally immediately
import processPolyfill from 'process';
import { Buffer as BufferPolyfill } from 'buffer';

// Create completely isolated polyfills - NO GLOBAL MODIFICATIONS
const createIsolatedProcess = () => {
  return {
    ...processPolyfill,
    stdout: {
      write: (data: any) => {
        // Avoid infinite loop with VSCode console interception - just return true
        return true;
      },
      isTTY: false
    },
    stderr: {
      write: (data: any) => {
        // Avoid infinite loop with VSCode console interception - just return true  
        return true;
      },
      isTTY: false
    },
    chdir: (directory: string) => {
      // VSCode extensions can't change working directory - this is a no-op
      // but we provide it to avoid "not supported" errors
      return;
    }
  };
};

// CRITICAL: Store the original globals to restore them later
const originalProcess = (globalThis as any).process;
const originalBuffer = (globalThis as any).Buffer;
const originalGlobal = (globalThis as any).global;

// Apply our polyfills temporarily, only during our extension's initialization
const applyTemporaryPolyfills = () => {
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).process = createIsolatedProcess();
    (globalThis as any).global = globalThis;
    (globalThis as any).Buffer = BufferPolyfill;
  }
  
  if (typeof window !== 'undefined') {
    (window as any).process = createIsolatedProcess();
    (window as any).global = window;
    (window as any).Buffer = BufferPolyfill;
  }
};

// Restore original globals after our extension is loaded
const restoreOriginalGlobals = () => {
  if (typeof globalThis !== 'undefined') {
    if (originalProcess) {
      (globalThis as any).process = originalProcess;
    }
    if (originalBuffer) {
      (globalThis as any).Buffer = originalBuffer;
    }
    if (originalGlobal) {
      (globalThis as any).global = originalGlobal;
    }
  }
  
  if (typeof window !== 'undefined') {
    if (originalProcess && (window as any).process === (globalThis as any).process) {
      (window as any).process = originalProcess;
    }
    if (originalBuffer && (window as any).Buffer === (globalThis as any).Buffer) {
      (window as any).Buffer = originalBuffer;
    }
    if (originalGlobal && (window as any).global === (globalThis as any).global) {
      (window as any).global = originalGlobal;
    }
  }
};

// Apply polyfills temporarily
applyTemporaryPolyfills();

// Schedule restoration after our extension loads (but before other extensions)
// Use setTimeout to restore globals after current call stack completes
setTimeout(() => {
  restoreOriginalGlobals();
  console.log('[APEX-EXT] Polyfills restored - other extensions protected');
}, 0);

import events from 'events';
import { fs } from 'memfs';

// Use the util polyfill that has inherits function
const util = require('util');

// Ensure util.inherits is available - fallback implementation if needed
if (!util.inherits) {
  util.inherits = (constructor: any, superConstructor: any) => {
    if (superConstructor) {
      constructor.super_ = superConstructor;
      constructor.prototype = Object.create(superConstructor.prototype, {
        constructor: {
          value: constructor,
          enumerable: false,
          writable: true,
          configurable: true,
        },
      });
    }
  };
}

// Import polyfills with require to avoid TypeScript errors
// Note: crypto is handled via esbuild alias, not global polyfill
const stream = require('stream-browserify');
const path = require('path-browserify');

// Use a simple assert implementation instead of external file
const assert = (condition: any, message?: string) => {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
};

// NOTE: No longer setting global polyfills to avoid affecting other extensions
// Our dependencies should use the bundled polyfills from esbuild instead
// If specific modules need these, they will be provided by the bundler's polyfill system

// Verify critical polyfills are available
console.log(
  '[POLYFILLS] Process polyfill loaded:',
  typeof (globalThis as any).process,
);
console.log(
  '[POLYFILLS] Buffer polyfill loaded:',
  typeof (globalThis as any).Buffer,
);
