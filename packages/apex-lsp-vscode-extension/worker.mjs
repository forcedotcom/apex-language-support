var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// <define:process.versions>
var define_process_versions_default;
var init_define_process_versions = __esm({
  "<define:process.versions>"() {
    define_process_versions_default = {};
  }
});

// src/utils/EnvironmentDetector.ts
function safeTypeOf(name) {
  try {
    return typeof globalThis[name];
  } catch {
    return "undefined";
  }
}
function detectEnvironment() {
  if (typeof process !== "undefined" && define_process_versions_default && define_process_versions_default.node) {
    return "node";
  }
  if (safeTypeOf("self") !== "undefined" && safeTypeOf("window") === "undefined" && safeTypeOf("document") === "undefined" && safeTypeOf("importScripts") !== "undefined") {
    return "webworker";
  }
  if (safeTypeOf("self") !== "undefined" && safeTypeOf("window") === "undefined" && safeTypeOf("document") === "undefined" && safeTypeOf("importScripts") === "undefined") {
    return "webworker";
  }
  if (safeTypeOf("window") !== "undefined" && safeTypeOf("document") !== "undefined") {
    return "browser";
  }
  return "node";
}
function isWorkerEnvironment() {
  return detectEnvironment() === "webworker";
}
function isBrowserEnvironment() {
  return detectEnvironment() === "browser";
}
function isNodeEnvironment() {
  return detectEnvironment() === "node";
}
var init_EnvironmentDetector = __esm({
  "src/utils/EnvironmentDetector.ts"() {
    "use strict";
    init_define_process_versions();
  }
});

// src/communication/TransportMessageHandlers.ts
import { ResponseError, ErrorCodes } from "vscode-jsonrpc";
function createTransportMessageReader(transport, logger) {
  let messageListener;
  let errorListener;
  let closeHandler;
  let partialMessageHandler;
  return {
    listen: (callback) => {
      messageListener = transport.listen((data) => {
        try {
          if (typeof data === "string" && data.length >= 1e6) {
            if (partialMessageHandler) {
              partialMessageHandler({ messageToken: 1, waitingTime: 0 });
            }
          }
          callback(data);
        } catch (error) {
          logger?.error(
            `Error processing message: ${error instanceof Error ? error.message : "Unknown error"}`
          );
          if (error instanceof Error) {
            const errorHandler = (err) => {
              logger?.error(`Transport error: ${err.message}`);
            };
            transport.onError(errorHandler);
          }
        }
      });
      return messageListener;
    },
    onError: (listener) => {
      errorListener = transport.onError((error) => {
        listener(error);
      });
      return errorListener;
    },
    onClose: (listener) => {
      closeHandler = listener;
      return {
        dispose: () => {
          closeHandler = void 0;
        }
      };
    },
    onPartialMessage: (listener) => {
      partialMessageHandler = listener;
      return {
        dispose: () => {
          partialMessageHandler = void 0;
        }
      };
    },
    dispose: () => {
      messageListener?.dispose();
      errorListener?.dispose();
      if (closeHandler) {
        closeHandler();
      }
    }
  };
}
function createTransportMessageWriter(transport, logger) {
  let errorHandler;
  let closeHandler;
  let writePending = false;
  return {
    write: async (msg) => {
      try {
        if (writePending) {
          throw new ResponseError(
            ErrorCodes.MessageWriteError,
            "Write operation already in progress"
          );
        }
        writePending = true;
        await transport.send(msg);
        writePending = false;
      } catch (error) {
        writePending = false;
        logger?.error(
          `Error writing message: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        if (errorHandler) {
          errorHandler([
            error instanceof Error ? error : new Error("Unknown error"),
            msg,
            void 0
          ]);
        }
        throw error;
      }
    },
    onError: (listener) => {
      errorHandler = listener;
      return transport.onError((error) => {
        if (errorHandler) {
          errorHandler([error, void 0, void 0]);
        }
      });
    },
    onClose: (listener) => {
      closeHandler = listener;
      return {
        dispose: () => {
          closeHandler = void 0;
        }
      };
    },
    end: () => {
      if (closeHandler) {
        closeHandler();
      }
    },
    dispose: () => {
      transport.dispose();
    }
  };
}
var init_TransportMessageHandlers = __esm({
  "src/communication/TransportMessageHandlers.ts"() {
    "use strict";
    init_define_process_versions();
  }
});

// src/communication/WorkerMessageBridge.ts
import {
  createMessageConnection
} from "vscode-jsonrpc";
var SelfMessageTransport, WorkerMessageBridge;
var init_WorkerMessageBridge = __esm({
  "src/communication/WorkerMessageBridge.ts"() {
    "use strict";
    init_define_process_versions();
    init_TransportMessageHandlers();
    SelfMessageTransport = class {
      constructor(self2) {
        this.self = self2;
      }
      async send(message) {
        this.self.postMessage(message);
      }
      listen(handler) {
        const messageHandler = (event) => {
          handler(event.data);
        };
        this.self.addEventListener("message", messageHandler);
        return {
          dispose: () => {
            this.self.removeEventListener("message", messageHandler);
          }
        };
      }
      onError(handler) {
        const errorHandler = (event) => {
          const error = new Error(event.message || "Self error");
          handler(error);
        };
        this.self.addEventListener("error", errorHandler);
        return {
          dispose: () => {
            this.self.removeEventListener("error", errorHandler);
          }
        };
      }
      dispose() {
      }
    };
    WorkerMessageBridge = class {
      /**
       * Creates a message bridge for worker server communication
       */
      static forWorkerServer(workerScope, logger) {
        const transport = new SelfMessageTransport(workerScope);
        const reader = createTransportMessageReader(transport, logger);
        const writer = createTransportMessageWriter(transport, logger);
        const connection = createMessageConnection(reader, writer, logger);
        connection.onError((error) => {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          logger?.error(`Worker message connection error: ${errorMessage}`);
        });
        connection.onClose(() => {
          logger?.info("Worker message connection closed");
          transport.dispose();
        });
        return connection;
      }
      /**
       * Detects if current environment is web worker
       */
      static isWorkerEnvironment() {
        return typeof self !== "undefined" && typeof importScripts !== "undefined";
      }
    };
  }
});

// src/communication/WorkerMessageBridgeFactory.ts
var WorkerMessageBridgeFactory_exports = {};
__export(WorkerMessageBridgeFactory_exports, {
  WorkerMessageBridgeFactory: () => WorkerMessageBridgeFactory,
  createWorkerMessageBridge: () => createWorkerMessageBridge,
  createWorkerMessageBridgeWithScope: () => createWorkerMessageBridgeWithScope
});
async function createWorkerMessageBridge(config = {}) {
  const factory = new WorkerMessageBridgeFactory();
  return factory.createMessageBridge(config);
}
async function createWorkerMessageBridgeWithScope(workerScope, config = {}) {
  return WorkerMessageBridge.forWorkerServer(
    workerScope,
    config.logger
  );
}
var WorkerMessageBridgeFactory;
var init_WorkerMessageBridgeFactory = __esm({
  "src/communication/WorkerMessageBridgeFactory.ts"() {
    "use strict";
    init_define_process_versions();
    init_WorkerMessageBridge();
    WorkerMessageBridgeFactory = class {
      /**
       * Creates a worker-specific message bridge
       */
      async createMessageBridge(config) {
        const workerScope = this.getWorkerGlobalScope();
        if (!workerScope) {
          throw new Error("Worker global scope not available");
        }
        return WorkerMessageBridge.forWorkerServer(
          workerScope,
          config.logger
        );
      }
      getWorkerGlobalScope() {
        try {
          if (typeof self !== "undefined" && typeof window === "undefined") {
            return self;
          }
        } catch {
        }
        return null;
      }
    };
  }
});

// src/server/WorkerConnectionFactory.ts
var WorkerConnectionFactory_exports = {};
__export(WorkerConnectionFactory_exports, {
  WorkerConnectionFactory: () => WorkerConnectionFactory,
  createWorkerConnection: () => createWorkerConnection
});
async function createWorkerConnection(config) {
  const factory = new WorkerConnectionFactory();
  return factory.createConnection(config);
}
var WorkerConnectionFactory;
var init_WorkerConnectionFactory = __esm({
  "src/server/WorkerConnectionFactory.ts"() {
    "use strict";
    init_define_process_versions();
    WorkerConnectionFactory = class {
      /**
       * Creates a worker-specific connection
       */
      async createConnection(config) {
        if (config?.workerScope) {
          const { createWorkerMessageBridgeWithScope: createWorkerMessageBridgeWithScope2 } = await Promise.resolve().then(() => (init_WorkerMessageBridgeFactory(), WorkerMessageBridgeFactory_exports));
          return createWorkerMessageBridgeWithScope2(config.workerScope, { logger: config?.logger });
        } else {
          const { createWorkerMessageBridge: createWorkerMessageBridge2 } = await Promise.resolve().then(() => (init_WorkerMessageBridgeFactory(), WorkerMessageBridgeFactory_exports));
          return createWorkerMessageBridge2({ logger: config?.logger });
        }
      }
    };
  }
});

// src/storage/WorkerStorageFactory.ts
var WorkerStorageFactory_exports = {};
__export(WorkerStorageFactory_exports, {
  WorkerStorageFactory: () => WorkerStorageFactory,
  createWorkerStorage: () => createWorkerStorage
});
async function createWorkerStorage(config) {
  const factory = new WorkerStorageFactory();
  return factory.createStorage(config);
}
var WorkerStorage, WorkerStorageFactory;
var init_WorkerStorageFactory = __esm({
  "src/storage/WorkerStorageFactory.ts"() {
    "use strict";
    init_define_process_versions();
    WorkerStorage = class {
      constructor(config = {}) {
        this.config = config;
        __publicField(this, "documents");
        this.documents = /* @__PURE__ */ new Map();
      }
      async initialize() {
        this.config.logger?.info("Worker storage initialized");
      }
      async getDocument(uri) {
        const document = this.documents.get(uri);
        this.config.logger?.info(
          document ? `Document found in worker storage: ${uri}` : `Document not found in worker storage: ${uri}`
        );
        return document;
      }
      async setDocument(uri, document) {
        this.documents.set(uri, document);
        this.config.logger?.info(`Document stored in worker storage: ${uri}`);
      }
      async clearFile(uri) {
        this.documents.delete(uri);
        this.config.logger?.info(`File cleared from worker storage: ${uri}`);
      }
      async clearAll() {
        this.documents.clear();
        this.config.logger?.info("All files cleared from worker storage");
      }
    };
    WorkerStorageFactory = class {
      /**
       * Creates a worker-specific storage implementation
       */
      async createStorage(config) {
        const storage = new WorkerStorage(config);
        await storage.initialize();
        return storage;
      }
    };
  }
});

// src/storage/BrowserStorageFactory.ts
var BrowserStorageFactory_exports = {};
__export(BrowserStorageFactory_exports, {
  BrowserStorageFactory: () => BrowserStorageFactory,
  createBrowserStorage: () => createBrowserStorage
});
async function createBrowserStorage(config) {
  const factory = new BrowserStorageFactory();
  return factory.createStorage(config);
}
var BrowserStorage, BrowserStorageFactory;
var init_BrowserStorageFactory = __esm({
  "src/storage/BrowserStorageFactory.ts"() {
    "use strict";
    init_define_process_versions();
    BrowserStorage = class {
      constructor(config = {}) {
        this.config = config;
        __publicField(this, "db");
        __publicField(this, "DB_NAME");
        __publicField(this, "STORE_NAME", "documents");
        this.DB_NAME = config.storagePrefix || "apex-ls-storage";
      }
      async initialize() {
        if (this.db) {
          return;
        }
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(this.DB_NAME, 1);
          request.onerror = () => {
            this.config.logger?.error("Failed to open IndexedDB");
            reject(new Error("Failed to open IndexedDB"));
          };
          request.onsuccess = () => {
            this.db = request.result;
            this.config.logger?.info("IndexedDB initialized successfully");
            resolve();
          };
          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(this.STORE_NAME)) {
              db.createObjectStore(this.STORE_NAME);
              this.config.logger?.info("Created document store in IndexedDB");
            }
          };
        });
      }
      async getDocument(uri) {
        if (!this.db) {
          throw new Error("Storage not initialized");
        }
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([this.STORE_NAME], "readonly");
          const store = transaction.objectStore(this.STORE_NAME);
          const request = store.get(uri);
          request.onerror = () => {
            this.config.logger?.error(
              `Failed to get document from IndexedDB: ${uri}`
            );
            reject(new Error("Failed to get document from IndexedDB"));
          };
          request.onsuccess = () => {
            resolve(request.result);
          };
        });
      }
      async setDocument(uri, document) {
        if (!this.db) {
          throw new Error("Storage not initialized");
        }
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([this.STORE_NAME], "readwrite");
          const store = transaction.objectStore(this.STORE_NAME);
          const request = store.put(document, uri);
          request.onerror = () => {
            this.config.logger?.error(
              `Failed to store document in IndexedDB: ${uri}`
            );
            reject(new Error("Failed to store document in IndexedDB"));
          };
          request.onsuccess = () => {
            this.config.logger?.info(`Document stored in IndexedDB: ${uri}`);
            resolve();
          };
        });
      }
      async clearFile(uri) {
        if (!this.db) {
          throw new Error("Storage not initialized");
        }
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([this.STORE_NAME], "readwrite");
          const store = transaction.objectStore(this.STORE_NAME);
          const request = store.delete(uri);
          request.onerror = () => {
            this.config.logger?.error(
              `Failed to clear file from IndexedDB: ${uri}`
            );
            reject(new Error("Failed to clear file from IndexedDB"));
          };
          request.onsuccess = () => {
            this.config.logger?.info(`File cleared from IndexedDB: ${uri}`);
            resolve();
          };
        });
      }
      async clearAll() {
        if (!this.db) {
          throw new Error("Storage not initialized");
        }
        return new Promise((resolve, reject) => {
          const transaction = this.db.transaction([this.STORE_NAME], "readwrite");
          const store = transaction.objectStore(this.STORE_NAME);
          const request = store.clear();
          request.onerror = () => {
            this.config.logger?.error("Failed to clear all files from IndexedDB");
            reject(new Error("Failed to clear all files from IndexedDB"));
          };
          request.onsuccess = () => {
            this.config.logger?.info("All files cleared from IndexedDB");
            resolve();
          };
        });
      }
    };
    BrowserStorageFactory = class {
      /**
       * Creates a browser-specific storage implementation
       */
      async createStorage(config) {
        const storage = new BrowserStorage(config);
        await storage.initialize();
        return storage;
      }
    };
  }
});

// src/storage/NodeStorageFactory.ts
var NodeStorageFactory_exports = {};
__export(NodeStorageFactory_exports, {
  createNodeStorage: () => createNodeStorage
});
async function createNodeStorage(config) {
  return createWorkerStorage(config);
}
var init_NodeStorageFactory = __esm({
  "src/storage/NodeStorageFactory.ts"() {
    "use strict";
    init_define_process_versions();
    init_WorkerStorageFactory();
  }
});

// src/storage/UnifiedStorageFactory.ts
var _UnifiedStorageFactory, UnifiedStorageFactory;
var init_UnifiedStorageFactory = __esm({
  "src/storage/UnifiedStorageFactory.ts"() {
    "use strict";
    init_define_process_versions();
    init_EnvironmentDetector();
    _UnifiedStorageFactory = class _UnifiedStorageFactory {
      /**
       * Creates a storage implementation appropriate for the current environment
       */
      static async createStorage(config) {
        if (_UnifiedStorageFactory.instance) {
          return _UnifiedStorageFactory.instance;
        }
        if (isWorkerEnvironment()) {
          const { createWorkerStorage: createWorkerStorage2 } = await Promise.resolve().then(() => (init_WorkerStorageFactory(), WorkerStorageFactory_exports));
          _UnifiedStorageFactory.instance = await createWorkerStorage2(config);
          return _UnifiedStorageFactory.instance;
        }
        if (isBrowserEnvironment()) {
          const { createBrowserStorage: createBrowserStorage2 } = await Promise.resolve().then(() => (init_BrowserStorageFactory(), BrowserStorageFactory_exports));
          _UnifiedStorageFactory.instance = await createBrowserStorage2(config);
          return _UnifiedStorageFactory.instance;
        }
        if (isNodeEnvironment()) {
          const { createNodeStorage: createNodeStorage2 } = await Promise.resolve().then(() => (init_NodeStorageFactory(), NodeStorageFactory_exports));
          _UnifiedStorageFactory.instance = await createNodeStorage2(config);
          return _UnifiedStorageFactory.instance;
        }
        throw new Error("Unsupported environment");
      }
    };
    __publicField(_UnifiedStorageFactory, "instance");
    UnifiedStorageFactory = _UnifiedStorageFactory;
  }
});

// src/server/UnifiedApexLanguageServer.ts
var UnifiedApexLanguageServer_exports = {};
__export(UnifiedApexLanguageServer_exports, {
  UnifiedApexLanguageServer: () => UnifiedApexLanguageServer
});
var UnifiedApexLanguageServer;
var init_UnifiedApexLanguageServer = __esm({
  "src/server/UnifiedApexLanguageServer.ts"() {
    "use strict";
    init_define_process_versions();
    init_UnifiedStorageFactory();
    init_EnvironmentDetector();
    UnifiedApexLanguageServer = class {
      constructor(config) {
        __publicField(this, "environment");
        __publicField(this, "connection");
        __publicField(this, "storageConfig");
        this.environment = config.environment;
        this.connection = config.connection;
        this.storageConfig = config.storageConfig;
      }
      /**
       * Initializes the server
       */
      async initialize() {
        const storage = await UnifiedStorageFactory.createStorage({
          ...this.storageConfig,
          useMemoryStorage: isWorkerEnvironment()
        });
      }
    };
  }
});

// src/worker-unified.ts
init_define_process_versions();
init_EnvironmentDetector();

// src/server/index.worker.ts
init_define_process_versions();
init_EnvironmentDetector();

// src/server/ConnectionFactory.ts
init_define_process_versions();
init_EnvironmentDetector();
var ConnectionFactory = class {
  /**
   * Creates a connection appropriate for the current environment
   */
  static async createConnection(config) {
    if (isWorkerEnvironment()) {
      const { createWorkerConnection: createWorkerConnection2 } = await Promise.resolve().then(() => (init_WorkerConnectionFactory(), WorkerConnectionFactory_exports));
      return createWorkerConnection2(config);
    }
    if (isBrowserEnvironment()) {
      throw new Error("Browser implementation not available in worker build");
    }
    throw new Error("Unsupported environment");
  }
  /**
   * Creates a worker-specific connection
   */
  static async createWorkerConnection(config) {
    const { createWorkerConnection: createWorkerConnection2 } = await Promise.resolve().then(() => (init_WorkerConnectionFactory(), WorkerConnectionFactory_exports));
    return createWorkerConnection2(config);
  }
};

// src/server/index.worker.ts
async function createUnifiedLanguageServer(connection) {
  const serverConnection = connection || await createEnvironmentConnection();
  const { UnifiedApexLanguageServer: UnifiedApexLanguageServer2 } = await Promise.resolve().then(() => (init_UnifiedApexLanguageServer(), UnifiedApexLanguageServer_exports));
  const config = {
    environment: "webworker",
    connection: serverConnection
  };
  const server = new UnifiedApexLanguageServer2(config);
  await server.initialize();
}
async function createEnvironmentConnection() {
  if (!isWorkerEnvironment()) {
    throw new Error("Worker server can only run in worker environment");
  }
  return ConnectionFactory.createWorkerConnection();
}

// src/worker-unified.ts
function initializeWorker() {
  try {
    console.log("[WORKER-UNIFIED] Initializing worker...");
    if (!isWorkerEnvironment()) {
      console.log("[WORKER-UNIFIED] Not in worker environment, skipping initialization");
      return;
    }
    if (typeof self === "undefined") {
      console.log("[WORKER-UNIFIED] Self is not available, cannot initialize worker");
      return;
    }
    console.log("[WORKER-UNIFIED] Worker environment detected, starting language server...");
    createUnifiedLanguageServer().then(() => {
      console.log("[WORKER-UNIFIED] Language server started successfully");
      if (typeof self.postMessage === "function") {
        self.postMessage({
          type: "apex-worker-ready",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          server: "unified-apex-ls"
        });
      }
    }).catch((error) => {
      console.error("[WORKER-UNIFIED] Failed to start language server:", error);
      if (typeof self.postMessage === "function") {
        self.postMessage({
          type: "apex-worker-error",
          error: error.message,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    });
  } catch (error) {
    console.error("[WORKER-UNIFIED] Initialization error:", error);
  }
}
if (typeof process === "undefined" || true) {
  initializeWorker();
}
export {
  initializeWorker
};
//# sourceMappingURL=worker.mjs.map