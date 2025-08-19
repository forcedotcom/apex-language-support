/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * URL polyfill for web worker environments
 * Provides basic URL parsing functionality for browser compatibility
 */

export function parse(urlString: string): any {
  try {
    const url = new URL(urlString);
    return {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      host: url.host,
      origin: url.origin,
      href: url.href
    };
  } catch (error) {
    return {
      protocol: '',
      hostname: '',
      port: '',
      pathname: '',
      search: '',
      hash: '',
      host: '',
      origin: '',
      href: urlString
    };
  }
}

export function format(urlObject: any): string {
  if (!urlObject) return '';
  
  const protocol = urlObject.protocol || '';
  const hostname = urlObject.hostname || '';
  const port = urlObject.port ? `:${urlObject.port}` : '';
  const pathname = urlObject.pathname || '';
  const search = urlObject.search || '';
  const hash = urlObject.hash || '';
  
  return `${protocol}//${hostname}${port}${pathname}${search}${hash}`;
}

export function resolve(from: string, to: string): string {
  try {
    return new URL(to, from).href;
  } catch (error) {
    return to;
  }
}

export function fileURLToPath(url: string): string {
  if (url.startsWith('file://')) {
    return url.substring(7);
  }
  return url;
}

export function pathToFileURL(path: string): string {
  return `file://${path}`;
}

// Default export for compatibility
const url = {
  parse,
  format,
  resolve,
  fileURLToPath,
  pathToFileURL,
  URL: globalThis.URL,
  URLSearchParams: globalThis.URLSearchParams,
};

export default url;

// Make it available globally for browser environments
if (typeof globalThis !== 'undefined') {
  (globalThis as any).url = url;
}