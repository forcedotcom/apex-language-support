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

// Set process and Buffer globally as early as possible
if (typeof globalThis !== 'undefined') {
  (globalThis as any).process = processPolyfill;
  (globalThis as any).global = globalThis;
  (globalThis as any).Buffer = BufferPolyfill;
}

// Also set it on window if available (some modules check window.process/Buffer)
if (typeof window !== 'undefined') {
  (window as any).process = processPolyfill;
  (window as any).global = window;
  (window as any).Buffer = BufferPolyfill;
}

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

// Make all polyfills globally available for modules that use require()
if (typeof globalThis !== 'undefined') {
  (globalThis as any).util = util;
  (globalThis as any).Buffer = BufferPolyfill;
  (globalThis as any).events = events;
  // Skip crypto - let esbuild handle it via module aliasing to avoid WebWorker conflicts
  (globalThis as any).process = processPolyfill;
  (globalThis as any).stream = stream;
  (globalThis as any).assert = assert;
  (globalThis as any).path = path;
  (globalThis as any).fs = fs;
}

// Also set on window for compatibility
if (typeof window !== 'undefined') {
  (window as any).util = util;
  (window as any).Buffer = BufferPolyfill;
  (window as any).events = events;
  // Skip crypto - let esbuild handle it via module aliasing to avoid WebWorker conflicts
  (window as any).process = processPolyfill;
  (window as any).stream = stream;
  (window as any).assert = assert;
  (window as any).path = path;
  (window as any).fs = fs;
}

// Verify critical polyfills are available
console.log(
  '[POLYFILLS] Process polyfill loaded:',
  typeof (globalThis as any).process,
);
console.log(
  '[POLYFILLS] Buffer polyfill loaded:',
  typeof (globalThis as any).Buffer,
);
