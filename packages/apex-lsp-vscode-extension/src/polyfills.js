// Browser polyfills for Node.js built-in modules
// util is provided by vscode-jsonrpc/lib/browser/ril
import { Buffer } from 'buffer';
import events from 'events';
import crypto from 'crypto-browserify';
import process from 'process';
import stream from 'stream-browserify';
import assert from 'assert';
import path from 'path-browserify';
import { fs } from 'memfs';

// Make them globally available for modules that use require()
if (typeof globalThis !== 'undefined') {
  globalThis.util = util;
  globalThis.Buffer = Buffer;
  globalThis.events = events;
  globalThis.crypto = crypto;
  globalThis.process = process;
  globalThis.stream = stream;
  globalThis.assert = assert;
  globalThis.path = path;
  globalThis.fs = fs;
}
