/**
 * Jest setup file for web/browser testing environment
 * Sets up DOM globals and polyfills needed for browser-like testing
 */

// Setup browser environment globals for environment detection
global.window = global.window || {};
global.document = global.document || { createElement: () => ({}) };

// Setup Worker API
global.Worker = class MockWorker {
  constructor(url) {
    this.url = url;
    this.onmessage = null;
    this.onerror = null;
  }
  
  postMessage(message) {
    // Mock implementation
    if (this.onmessage) {
      this.onmessage({ data: { type: 'mock-response', original: message } });
    }
  }
  
  terminate() {
    // Mock implementation
  }
};

global.MessageChannel = class MockMessageChannel {
  constructor() {
    this.port1 = new MockMessagePort();
    this.port2 = new MockMessagePort();
  }
};

global.MessagePort = class MockMessagePort {
  constructor() {
    this.onmessage = null;
  }
  
  postMessage(message) {
    if (this.onmessage) {
      this.onmessage({ data: message });
    }
  }
  
  start() {}
  close() {}
};

// Mock IndexedDB for storage tests
if (!global.indexedDB) {
  global.indexedDB = {
    open: jest.fn(() => ({
      onsuccess: null,
      onerror: null,
      result: {
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            add: jest.fn(),
            get: jest.fn(),
            put: jest.fn(),
            delete: jest.fn(),
          })),
        })),
      },
    })),
  };
}

// Mock crypto.randomUUID if not available
if (!global.crypto) {
  global.crypto = {};
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

// Mock console methods to avoid noise in tests
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};