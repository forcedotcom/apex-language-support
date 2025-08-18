/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Minimal path polyfill for web worker environments
 * This provides basic path functionality needed by the language server
 */

// Platform-specific path separator
const sep = '/';
const delimiter = ':';

function normalize(path: string): string {
  // Remove duplicate slashes and normalize to forward slashes
  return path.replace(/[\\\/]+/g, '/');
}

function join(...paths: string[]): string {
  return normalize(paths.filter(Boolean).join('/'));
}

function resolve(...paths: string[]): string {
  let resolvedPath = '';
  for (let path of paths) {
    path = normalize(path);
    if (path.startsWith('/')) {
      resolvedPath = path;
    } else {
      resolvedPath = resolvedPath ? join(resolvedPath, path) : path;
    }
  }
  return resolvedPath;
}

function dirname(path: string): string {
  path = normalize(path);
  const lastSlash = path.lastIndexOf('/');
  return lastSlash === -1
    ? '.'
    : lastSlash === 0
      ? '/'
      : path.slice(0, lastSlash);
}

function basename(path: string, ext?: string): string {
  path = normalize(path);
  let base = path.slice(path.lastIndexOf('/') + 1);
  if (ext && base.endsWith(ext)) {
    base = base.slice(0, -ext.length);
  }
  return base;
}

function extname(path: string): string {
  const base = basename(path);
  const lastDot = base.lastIndexOf('.');
  return lastDot === -1 || lastDot === 0 ? '' : base.slice(lastDot);
}

function isAbsolute(path: string): boolean {
  return path.startsWith('/');
}

function relative(from: string, to: string): string {
  from = normalize(from);
  to = normalize(to);

  const fromParts = from.split('/').filter(Boolean);
  const toParts = to.split('/').filter(Boolean);

  let i = 0;
  while (
    i < fromParts.length &&
    i < toParts.length &&
    fromParts[i] === toParts[i]
  ) {
    i++;
  }

  const upCount = fromParts.length - i;
  const result = [...Array(upCount).fill('..'), ...toParts.slice(i)];
  return result.join('/') || '.';
}

function parse(path: string): {
  root: string;
  dir: string;
  base: string;
  ext: string;
  name: string;
} {
  path = normalize(path);
  const root = path.startsWith('/') ? '/' : '';
  const dir = dirname(path);
  const base = basename(path);
  const ext = extname(path);
  const name = base.slice(0, base.length - ext.length);

  return { root, dir, base, ext, name };
}

function format(pathObject: {
  root?: string;
  dir?: string;
  base?: string;
  ext?: string;
  name?: string;
}): string {
  const { root = '', dir = '', base = '', ext = '', name = '' } = pathObject;

  if (base || name + ext) {
    return join(dir || root, base || name + ext);
  }

  return dir || root || '.';
}

// Export the path module interface
export const path = {
  sep,
  delimiter,
  normalize,
  join,
  resolve,
  dirname,
  basename,
  extname,
  isAbsolute,
  relative,
  parse,
  format,
  // Add posix alias for compatibility
  posix: {
    sep,
    delimiter,
    normalize,
    join,
    resolve,
    dirname,
    basename,
    extname,
    isAbsolute,
    relative,
    parse,
    format,
  },
};

// Make path available globally
declare const global: any;

if (typeof globalThis !== 'undefined') {
  (globalThis as any).path = path;
}

if (typeof global !== 'undefined') {
  global.path = path;
}

// Also make it available in the current scope
(self as any).path = path;

export default path;
