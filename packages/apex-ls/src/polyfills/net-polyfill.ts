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
import type { AddressInfo, SocketConnectOpts } from 'node:net';
import { Readable } from 'node:stream';
import type { Writable } from 'node:stream';
// Buffer is not actively used in this polyfill context

type BufferEncoding =
  | 'ascii'
  | 'utf8'
  | 'utf-8'
  | 'utf16le'
  | 'ucs2'
  | 'ucs-2'
  | 'base64'
  | 'base64url'
  | 'latin1'
  | 'binary'
  | 'hex';

declare global {
  namespace NodeJS {
    interface ReadStream extends ReadableStream {
      isTTY?: boolean;
      fd: number;
    }

    interface WriteStream extends WritableStream {
      isTTY?: boolean;
      fd: number;
    }

    interface ReadableStream {
      readable: boolean;
      readableAborted: boolean;
      destroyed: boolean;
      compose<T extends ReadableStream>(
        stream:
          | T
          | ((source: ReadableStream) => ReadableStream)
          | Iterable<T>
          | AsyncIterable<T>,
        options?: { signal: AbortSignal },
      ): T;
      [Symbol.asyncIterator](): AsyncIterator<any>;
    }

    interface WritableStream {
      writable: boolean;
    }

    interface AsyncIterator<T> {
      next(): Promise<IteratorResult<T>>;
      return?(): Promise<IteratorResult<T>>;
      throw?(e?: any): Promise<IteratorResult<T>>;
      [Symbol.asyncIterator](): AsyncIterator<T>;
      [Symbol.asyncDispose](): Promise<void>;
    }
  }
}

// type ComposeFnParam = (source: Readable) => Readable;

interface ArrayOptions {
  signal?: AbortSignal;
}

type SocketReadyState =
  | 'opening'
  | 'open'
  | 'readOnly'
  | 'writeOnly'
  | 'closed';

class Socket extends EventEmitter {
  private _readable = new Readable();
  get readable(): boolean {
    return this._readable.readable;
  }

  get readableAborted(): boolean {
    return this._readable.readableAborted;
  }

  get destroyed(): boolean {
    return this._readable.destroyed;
  }

  get readableDidRead(): boolean {
    return this._readable.readableDidRead;
  }

  get readableEncoding(): BufferEncoding | null {
    const encoding = this._readable.readableEncoding;
    // Fix utf-16le vs utf16le naming inconsistency
    if (encoding === 'utf-16le') {
      return 'utf16le' as BufferEncoding;
    }
    return encoding as BufferEncoding | null;
  }

  get readableEnded(): boolean {
    return this._readable.readableEnded;
  }

  get readableFlowing(): boolean | null {
    return this._readable.readableFlowing;
  }

  get readableHighWaterMark(): number {
    return this._readable.readableHighWaterMark;
  }

  get readableLength(): number {
    return this._readable.readableLength;
  }

  get readableObjectMode(): boolean {
    return this._readable.readableObjectMode;
  }

  get closed(): boolean {
    return this._readable.closed;
  }

  get errored(): Error | null {
    return this._readable.errored;
  }
  // Stream methods
  push(chunk: any, encoding?: BufferEncoding): boolean {
    return this._readable.push(chunk, encoding);
  }

  [Symbol.asyncIterator](): NodeJS.AsyncIterator<any> {
    return this._readable[Symbol.asyncIterator]();
  }

  iterator(options?: { destroyOnReturn?: boolean }): NodeJS.AsyncIterator<any> {
    return this._readable.iterator(options);
  }

  [Symbol.iterator](): Iterator<any> {
    // Check if the iterator method exists before calling it
    if (typeof (this._readable as any)[Symbol.iterator] === 'function') {
      return (this._readable as any)[Symbol.iterator]();
    }
    // Provide a fallback iterator implementation
    return {
      next(): IteratorResult<any> {
        return { done: true, value: undefined };
      },
    };
  }

  [Symbol.asyncDispose](): Promise<void> {
    return this._readable[Symbol.asyncDispose]();
  }

  toArray(options?: Pick<ArrayOptions, 'signal'>): Promise<any[]> {
    return this._readable.toArray(options);
  }

  flatMap<T>(
    fn: (data: any, options?: Pick<ArrayOptions, 'signal'>) => T | Promise<T>,
    options?: ArrayOptions,
  ): Readable {
    return this._readable.flatMap(fn, options);
  }

  drop(limit: number, options?: Pick<ArrayOptions, 'signal'>): Readable {
    return this._readable.drop(limit, options);
  }

  take(limit: number, options?: Pick<ArrayOptions, 'signal'>): Readable {
    return this._readable.take(limit, options);
  }

  asIndexedPairs(options?: Pick<ArrayOptions, 'signal'>): Readable {
    return this._readable.asIndexedPairs(options);
  }

  reduce<T = any>(
    fn: (previous: any, data: any, options?: Pick<ArrayOptions, 'signal'>) => T,
    initial?: undefined,
    options?: Pick<ArrayOptions, 'signal'>,
  ): Promise<T>;
  reduce<T = any>(
    fn: (previous: T, data: any, options?: Pick<ArrayOptions, 'signal'>) => T,
    initial: T,
    options?: Pick<ArrayOptions, 'signal'>,
  ): Promise<T> {
    return this._readable.reduce(fn, initial, options);
  }

  some(
    fn: (
      data: any,
      options?: Pick<ArrayOptions, 'signal'>,
    ) => boolean | Promise<boolean>,
    options?: ArrayOptions,
  ): Promise<boolean> {
    return this._readable.some(fn, options);
  }

  every(
    fn: (
      data: any,
      options?: Pick<ArrayOptions, 'signal'>,
    ) => boolean | Promise<boolean>,
    options?: ArrayOptions,
  ): Promise<boolean> {
    return this._readable.every(fn, options);
  }

  find<T>(
    fn: (data: any, options?: Pick<ArrayOptions, 'signal'>) => data is T,
    options?: ArrayOptions,
  ): Promise<T | undefined>;
  find(
    fn: (
      data: any,
      options?: Pick<ArrayOptions, 'signal'>,
    ) => boolean | Promise<boolean>,
    options?: ArrayOptions,
  ): Promise<any | undefined> {
    return this._readable.find(fn, options);
  }

  forEach(
    fn: (
      data: any,
      options?: Pick<ArrayOptions, 'signal'>,
    ) => void | Promise<void>,
    options?: ArrayOptions,
  ): Promise<void> {
    return this._readable.forEach(fn, options);
  }

  map(
    fn: (data: any, options?: Pick<ArrayOptions, 'signal'>) => any,
    options?: ArrayOptions,
  ): Readable {
    return this._readable.map(fn, options);
  }

  filter(
    fn: (
      data: any,
      options?: Pick<ArrayOptions, 'signal'>,
    ) => boolean | Promise<boolean>,
    options?: ArrayOptions,
  ): Readable {
    return this._readable.filter(fn, options);
  }

  isPaused(): boolean {
    return this._readable.isPaused();
  }

  unpipe(destination?: Writable): this {
    this._readable.unpipe(destination);
    return this;
  }

  unshift(chunk: string | Uint8Array, encoding?: BufferEncoding): void {
    this._readable.unshift(chunk, encoding);
  }

  wrap(stream: NodeJS.ReadableStream): this {
    this._readable.wrap(stream);
    return this;
  }
  // Stream properties
  private _readableDidRead = false;
  private _readableEncoding: BufferEncoding | null = null;
  private _readableEnded = false;
  private _readableFlowing = true;
  private _readableHighWaterMark = 16384;
  private _readableLength = 0;
  private _readableObjectMode = false;
  private _writableCorked = 0;
  private _writableEnded = false;
  private _writableFinished = false;
  private _writableHighWaterMark = 16384;
  private _writableLength = 0;
  private _writableObjectMode = false;
  private _writableNeedDrain = false;
  private _writableAborted = false;
  private _closed = false;
  private _errored: Error | null = null;
  private _writableBuffer: any[] = [];
  private _connecting = false;
  private _destroyed = false;
  private _writableState = { ended: false };
  private _readableState = { ended: false };
  private _allowHalfOpen = false;
  private _buffer: Buffer[] = [];
  private _isReadable = true;
  private _writable = true;
  private _autoSelectFamilyAttemptedAddresses: string[] = [];
  private _pipe = false;
  private _compose = false;
  private _readableAborted = false;
  private _events: Record<string, any> = {};
  private _eventsCount = 0;
  private _maxListeners = 10;
  private _sockname: AddressInfo | null = null;
  private _peername: AddressInfo | null = null;
  private _pendingData: Buffer | null = null;
  private _pendingEncoding: BufferEncoding | null = null;
  private _handle: any = null;
  private _parent: any = null;
  private _host: string | null = null;

  get writableCorked(): number {
    return this._writableCorked;
  }
  get writableEnded(): boolean {
    return this._writableEnded;
  }
  get writableFinished(): boolean {
    return this._writableFinished;
  }
  get writableHighWaterMark(): number {
    return this._writableHighWaterMark;
  }
  get writableLength(): number {
    return this._writableLength;
  }
  get writableObjectMode(): boolean {
    return this._writableObjectMode;
  }
  get writableNeedDrain(): boolean {
    return this._writableNeedDrain;
  }
  get writableAborted(): boolean {
    return this._writableAborted;
  }
  get writableBuffer(): any[] {
    return this._writableBuffer;
  }

  constructor(options?: SocketConnectOpts) {
    super();
    this._allowHalfOpen = false;
    if (options) {
      this._connecting = false;
    }
    this._isReadable = true;
    this._destroyed = false;
  }

  read(size?: number): string | any {
    if (this._buffer.length === 0) {
      return '';
    }
    const chunk = this._buffer.shift();
    return chunk || '';
  }

  write(
    buffer: string | Uint8Array,
    callback?: (error?: Error | null) => void,
  ): boolean;
  write(
    str: string | Uint8Array,
    encoding?: BufferEncoding,
    callback?: (error?: Error | null) => void,
  ): boolean;
  write(
    data: string | Uint8Array,
    encodingOrCallback?: BufferEncoding | ((error?: Error | null) => void),
    callback?: (error?: Error | null) => void,
  ): boolean {
    // In browser environment, writing is not supported
    const error = new Error('Socket writing not supported in browser');
    if (typeof encodingOrCallback === 'function') {
      encodingOrCallback(error);
    } else if (callback) {
      callback(error);
    }
    return false;
  }

  destroySoon(): void {
    this.end();
    this.destroy();
  }

  setEncoding(encoding: BufferEncoding): this {
    this._isReadable = true;
    return this;
  }

  setDefaultEncoding(encoding: BufferEncoding): this {
    // No-op in browser environment
    return this;
  }

  cork(): void {
    // No-op in browser environment
  }

  uncork(): void {
    // No-op in browser environment
  }

  pause(): this {
    this._isReadable = false;
    return this;
  }

  resume(): this {
    this._isReadable = true;
    return this;
  }

  resetAndDestroy(): this {
    this.destroy();
    return this;
  }

  address(): AddressInfo | {} {
    return {};
  }

  unref(): this {
    return this;
  }

  ref(): this {
    return this;
  }

  get bufferSize(): number {
    return 0;
  }

  get bytesRead(): number {
    return 0;
  }

  get bytesWritten(): number {
    return 0;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get pending(): boolean {
    return !this.connecting;
  }

  get localAddress(): string | undefined {
    return undefined;
  }

  get localPort(): number | undefined {
    return undefined;
  }

  get localFamily(): string | undefined {
    return undefined;
  }

  get readyState(): SocketReadyState {
    if (this.connecting) {
      return 'opening';
    }
    if (this._readableState.ended && this._writableState.ended) {
      return 'closed';
    }
    if (this._readableState.ended) {
      return 'writeOnly';
    }
    if (this._writableState.ended) {
      return 'readOnly';
    }
    return 'open';
  }

  get remoteAddress(): string | undefined {
    return undefined;
  }

  get remoteFamily(): string | undefined {
    return undefined;
  }

  get remotePort(): number | undefined {
    return undefined;
  }

  get timeout(): number | undefined {
    return undefined;
  }

  get autoSelectFamilyAttemptedAddresses(): string[] {
    return this._autoSelectFamilyAttemptedAddresses;
  }

  get allowHalfOpen(): boolean {
    return this._allowHalfOpen;
  }

  pipe<T extends NodeJS.WritableStream>(
    destination: T,
    options?: { end?: boolean },
  ): T {
    // No-op in browser environment
    return destination;
  }

  compose<T extends NodeJS.ReadableStream>(
    stream:
      | T
      | ((source: NodeJS.ReadableStream) => T)
      | Iterable<T>
      | AsyncIterable<T>,
    options?: { signal: AbortSignal },
  ): T {
    // No-op in browser environment
    if (typeof stream === 'function') {
      const result = stream(this as NodeJS.ReadableStream);
      if (!result) {
        throw new Error('Stream function must return a Readable');
      }
      return result;
    }
    if (Symbol.iterator in stream || Symbol.asyncIterator in stream) {
      return stream as T;
    }
    return stream;
  }

  connect(options: SocketConnectOpts, connectionListener?: () => void): this;
  connect(port: number, host: string, connectionListener?: () => void): this;
  connect(port: number, connectionListener?: () => void): this;
  connect(path: string, connectionListener?: () => void): this;
  connect(
    options: SocketConnectOpts | number | string,
    hostOrListener?: string | (() => void),
    connectionListener?: () => void,
  ): this {
    if (typeof options === 'number') {
      // Port number provided
      if (typeof hostOrListener === 'string') {
        // Host and port provided
        this.emit(
          'error',
          new Error('Socket connections not supported in browser'),
        );
      } else {
        // Only port provided
        this.emit(
          'error',
          new Error('Socket connections not supported in browser'),
        );
      }
    } else if (typeof options === 'string') {
      // Path provided
      this.emit(
        'error',
        new Error('Socket connections not supported in browser'),
      );
    } else {
      // Options object provided
      this.emit(
        'error',
        new Error('Socket connections not supported in browser'),
      );
    }
    return this;
  }

  end(): this;
  end(callback?: () => void): this;
  end(buffer: string | Uint8Array, callback?: () => void): this;
  end(
    str: string | Uint8Array,
    encoding?: BufferEncoding,
    callback?: () => void,
  ): this;
  end(
    data?: any,
    encodingOrCallback?: BufferEncoding | (() => void),
    callback?: () => void,
  ): this {
    this._writableState.ended = true;
    this.emit('end');
    if (typeof encodingOrCallback === 'function') {
      encodingOrCallback();
    } else if (callback) {
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

  get writable(): boolean {
    return !this._writableState.ended;
  }

  // Additional required methods from NodeSocket
  addListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    super.addListener(event, listener);
    return this;
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    return super.emit(event, ...args);
  }

  on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  once(event: string | symbol, listener: (...args: any[]) => void): this {
    super.once(event, listener);
    return this;
  }

  prependListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    super.prependListener(event, listener);
    return this;
  }

  prependOnceListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    super.prependOnceListener(event, listener);
    return this;
  }

  removeListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    super.removeListener(event, listener);
    return this;
  }

  off(event: string | symbol, listener: (...args: any[]) => void): this {
    super.off(event, listener);
    return this;
  }

  removeAllListeners(event?: string | symbol): this {
    super.removeAllListeners(event);
    return this;
  }

  setMaxListeners(n: number): this {
    super.setMaxListeners(n);
    return this;
  }

  getMaxListeners(): number {
    return super.getMaxListeners();
  }

  listeners(event: string | symbol): Function[] {
    return super.listeners(event);
  }

  rawListeners(event: string | symbol): Function[] {
    return super.rawListeners(event);
  }

  eventNames(): Array<string | symbol> {
    return super.eventNames();
  }

  listenerCount(event: string | symbol): number {
    return super.listenerCount(event);
  }

  // Additional required methods from stream.Duplex
  _read(size: number): void {
    // No-op in browser environment
  }

  _write(
    chunk: any,
    encoding: string,
    callback: (error?: Error | null) => void,
  ): void {
    // No-op in browser environment
    callback();
  }

  _writev?(
    chunks: Array<{ chunk: any; encoding: string }>,
    callback: (error?: Error | null) => void,
  ): void {
    // No-op in browser environment
    callback();
  }

  _destroy(error: Error | null, callback: (error: Error | null) => void): void {
    callback(error);
  }

  _final(callback: (error?: Error | null) => void): void {
    callback();
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
  options: SocketConnectOpts,
  connectionListener?: () => void,
): Socket;
function connect(
  port: number,
  host: string,
  connectionListener?: () => void,
): Socket;
function connect(port: number, connectionListener?: () => void): Socket;
function connect(path: string, connectionListener?: () => void): Socket;
function connect(
  options: SocketConnectOpts | number | string,
  hostOrListener?: string | (() => void),
  connectionListener?: () => void,
): Socket {
  const socket = new Socket();
  if (typeof options === 'number') {
    if (typeof hostOrListener === 'string') {
      socket.connect(
        { port: options, host: hostOrListener },
        connectionListener,
      );
    } else {
      socket.connect({ port: options }, hostOrListener);
    }
  } else if (typeof options === 'string') {
    socket.connect({ path: options }, hostOrListener as () => void);
  } else {
    socket.connect(options, hostOrListener as () => void);
  }
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
