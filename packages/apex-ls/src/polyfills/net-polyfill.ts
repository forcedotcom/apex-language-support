/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Minimal net polyfill for web worker environments
 * This provides basic net functionality needed by the language server
 */

import { EventEmitter } from 'events';

// Socket class that extends EventEmitter
class Socket extends EventEmitter {
  private connecting = false;
  private _destroyed = false;
  private _writableState = { ended: false };
  private _readableState = { ended: false };

  constructor(options?: any) {
    super();
    if (options) {
      // Initialize with options if provided
      this.connecting = false;
    }
  }

  connect(
    options: { port: number; host: string } | number,
    host?: string,
    connectionListener?: () => void,
  ): this {
    // In browser environment, connections are not supported
    this.emit(
      'error',
      new Error('Socket connections not supported in browser'),
    );
    return this;
  }

  end(data?: any, encoding?: string, callback?: () => void): this {
    this._writableState.ended = true;
    this.emit('end');
    if (callback) {
      callback();
    }
    return this;
  }

  destroy(error?: Error): this {
    if (!this._destroyed) {
      this._destroyed = true;
      if (error) {
        this.emit('error', error);
      }
      this.emit('close', !!error);
    }
    return this;
  }

  write(
    data: any,
    encoding?: string | ((error: Error | null | undefined) => void),
    callback?: (error: Error | null | undefined) => void,
  ): boolean {
    // In browser environment, writing is not supported
    if (typeof encoding === 'function') {
      encoding(new Error('Socket writing not supported in browser'));
    } else if (callback) {
      callback(new Error('Socket writing not supported in browser'));
    }
    return false;
  }

  setKeepAlive(enable?: boolean, initialDelay?: number): this {
    // No-op in browser environment
    return this;
  }

  setNoDelay(noDelay?: boolean): this {
    // No-op in browser environment
    return this;
  }

  setTimeout(timeout: number, callback?: () => void): this {
    // No-op in browser environment
    return this;
  }

  // Read-only properties
  get destroyed(): boolean {
    return this._destroyed;
  }

  get readable(): boolean {
    return !this._readableState.ended;
  }

  get writable(): boolean {
    return !this._writableState.ended;
  }
}

// Server class that extends EventEmitter
class Server extends EventEmitter {
  private _connections = 0;
  private _handle: any = null;

  constructor(options?: any, connectionListener?: (socket: Socket) => void) {
    super();
    if (connectionListener) {
      this.on('connection', connectionListener);
    }
  }

  listen(
    port?: number,
    hostname?: string,
    backlog?: number,
    listeningListener?: () => void,
  ): this {
    // In browser environment, listening is not supported
    this.emit('error', new Error('Server listening not supported in browser'));
    return this;
  }

  close(callback?: (err?: Error) => void): this {
    this._handle = null;
    if (callback) {
      callback();
    }
    return this;
  }

  address(): { port: number; family: string; address: string } | null {
    // Return null in browser environment
    return null;
  }

  getConnections(cb: (error: Error | null, count: number) => void): void {
    cb(null, this._connections);
  }

  ref(): this {
    return this;
  }

  unref(): this {
    return this;
  }
}

// Create server function
function createServer(
  options?: any,
  connectionListener?: (socket: Socket) => void,
): Server {
  return new Server(options, connectionListener);
}

// Connect function
function connect(
  options: { port: number; host: string } | number,
  host?: string,
  connectionListener?: () => void,
): Socket {
  const socket = new Socket();
  if (connectionListener) {
    socket.on('connect', connectionListener);
  }
  socket.connect(options, host as string);
  return socket;
}

// Export the net module interface
export const net = {
  Socket,
  Server,
  createServer,
  connect,
  // Alias for connect
  createConnection: connect,
};

export default net;
