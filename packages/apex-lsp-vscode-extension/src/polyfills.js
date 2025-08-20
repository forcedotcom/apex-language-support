// Browser polyfills for Node.js built-in modules
// util is provided by vscode-jsonrpc/lib/browser/ril
import { Buffer } from 'buffer';
import events from 'events';
import crypto from 'crypto-browserify';
import process from 'process';
import stream from 'stream-browserify';
import assert from '../apex-ls/src/polyfills/assert-polyfill';
import path from 'path-browserify';
import { fs } from 'memfs';
import util from 'util';

// Make them globally available for modules that use require()
if (typeof globalThis !== 'undefined') {
  (globalThis as any).util = util;
  (globalThis as any).Buffer = Buffer;
  (globalThis as any).events = events;
  (globalThis as any).crypto = crypto;
  (globalThis as any).process = process;
  (globalThis as any).stream = stream;
  (globalThis as any).assert = assert;
  (globalThis as any).path = path;
  (globalThis as any).fs = fs;
}
