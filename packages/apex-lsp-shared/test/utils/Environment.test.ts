/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  isNodeEnvironment,
  isBrowserEnvironment,
  isWorkerEnvironment,
  detectEnvironment,
  supportsFeature,
  getGlobal,
} from '../../src/utils/Environment';

describe('Environment Detection', () => {
  // Store original globals to restore later
  const originalWindow = (global as any).window;
  const originalDocument = (global as any).document;
  const originalProcess = (global as any).process;
  const originalSelf = (global as any).self;
  const originalImportScripts = (global as any).importScripts;

  beforeEach(() => {
    // Clean up all environment globals
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).process;
    delete (global as any).self;
    delete (global as any).importScripts;
  });

  afterAll(() => {
    // Restore original globals
    if (originalWindow) (global as any).window = originalWindow;
    if (originalDocument) (global as any).document = originalDocument;
    if (originalProcess) (global as any).process = originalProcess;
    if (originalSelf) (global as any).self = originalSelf;
    if (originalImportScripts) (global as any).importScripts = originalImportScripts;
  });

  describe('isNodeEnvironment', () => {
    it('should return true in Node.js environment', () => {
      (global as any).process = {
        versions: { node: '16.0.0' },
        exit: jest.fn(),
        cwd: jest.fn(),
      };

      expect(isNodeEnvironment()).toBe(true);
    });

    it('should return false without process.versions.node', () => {
      (global as any).process = { env: {} };
      expect(isNodeEnvironment()).toBe(false);
    });

    it('should return false without process object', () => {
      expect(isNodeEnvironment()).toBe(false);
    });
  });

  describe('isBrowserEnvironment', () => {
    it('should return true in browser environment', () => {
      (global as any).window = {
        document: {},
        location: {},
        navigator: {},
      };

      expect(isBrowserEnvironment()).toBe(true);
    });

    it('should return false without window object', () => {
      delete (global as any).window;
      expect(isBrowserEnvironment()).toBe(false);
    });

    it('should return true with partial window object (fallback)', () => {
      (global as any).window = {}; // Partial window, but still detected by fallback
      expect(isBrowserEnvironment()).toBe(true);
    });

    it('should return false in clean environment', () => {
      expect(isBrowserEnvironment()).toBe(false);
    });
  });

  describe('isWorkerEnvironment', () => {
    it('should return true in web worker environment', () => {
      (global as any).self = {
        importScripts: jest.fn(),
      };
      delete (global as any).window; // Ensure no window object

      expect(isWorkerEnvironment()).toBe(true);
    });

    it('should return false without self object', () => {
      delete (global as any).self;
      (global as any).importScripts = jest.fn();
      expect(isWorkerEnvironment()).toBe(false);
    });

    it('should return false without importScripts function', () => {
      (global as any).self = {};
      expect(isWorkerEnvironment()).toBe(false);
    });

    it('should return false in clean environment', () => {
      expect(isWorkerEnvironment()).toBe(false);
    });
  });

  describe('detectEnvironment', () => {
    it('should detect node environment', () => {
      (global as any).process = {
        versions: { node: '16.0.0' },
        exit: jest.fn(),
        cwd: jest.fn(),
      };

      expect(detectEnvironment()).toBe('node');
    });

    it('should detect browser environment', () => {
      (global as any).window = {
        document: {},
        location: {},
        navigator: {},
      };

      expect(detectEnvironment()).toBe('browser');
    });

    it('should detect worker environment', () => {
      (global as any).self = {
        importScripts: jest.fn(),
        postMessage: jest.fn(),
        constructor: { name: 'DedicatedWorkerGlobalScope' },
      };

      expect(detectEnvironment()).toBe('webworker');
    });

    it('should throw error for unrecognized environment', () => {
      expect(() => detectEnvironment()).toThrow('Unable to determine environment');
    });

    it('should prioritize node over browser detection', () => {
      (global as any).process = {
        versions: { node: '16.0.0' },
        exit: jest.fn(),
        cwd: jest.fn(),
      };
      (global as any).window = {
        document: {},
        location: {},
        navigator: {},
      };

      expect(detectEnvironment()).toBe('node');
    });
  });

  describe('supportsFeature', () => {
    it('should detect localStorage support in browser', () => {
      (global as any).window = {
        document: {},
        location: {},
        navigator: {},
        localStorage: {},
      };

      expect(supportsFeature('localStorage')).toBe(true);
    });

    it('should detect indexedDB support in browser', () => {
      (global as any).window = {
        document: {},
        location: {},
        navigator: {},
        indexedDB: {},
      };

      expect(supportsFeature('indexedDB')).toBe(true);
    });

    it('should detect worker support in browser', () => {
      (global as any).window = {
        document: {},
        location: {},
        navigator: {},
        Worker: jest.fn(),
      };

      expect(supportsFeature('worker')).toBe(true);
    });

    it('should throw error for unsupported environment', () => {
      // Clean environment should throw error in supportsFeature
      expect(() => supportsFeature('localStorage')).toThrow('Environment detection failed');
    });
  });

  describe('getGlobal', () => {
    it('should return globalThis for node environment', () => {
      (global as any).process = {
        versions: { node: '16.0.0' },
        exit: jest.fn(),
        cwd: jest.fn(),
      };

      expect(getGlobal()).toBe(globalThis);
    });

    it('should return window for browser environment', () => {
      (global as any).window = {
        document: {},
        location: {},
        navigator: {},
      };

      expect(getGlobal()).toBe((global as any).window);
    });
  });

  describe('Edge Cases', () => {
    it('should handle partial process object', () => {
      (global as any).process = {}; // No versions property
      expect(isNodeEnvironment()).toBe(false);
    });

    it('should handle self object without importScripts', () => {
      (global as any).self = {};
      expect(isWorkerEnvironment()).toBe(false);
    });

    it('should handle multiple environment indicators', () => {
      // Simulate an environment with both browser and worker globals
      (global as any).window = {
        document: {},
        location: {},
        navigator: {},
      };
      (global as any).self = {
        importScripts: jest.fn(),
        postMessage: jest.fn(),
        constructor: { name: 'DedicatedWorkerGlobalScope' },
      };

      // Should prefer worker over browser based on implementation
      expect(detectEnvironment()).toBe('webworker');
    });
  });
});