/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  PLACEHOLDER_WORKER_BASE,
  resolveWebWorkerUrl,
  WEB_WORKER_SCRIPT,
} from '../../src/server/WebWorkerUrlResolver';

describe('resolveWebWorkerUrl', () => {
  const INJECTED =
    'https://cdn.example.com/ext/apex/dist/worker.platform.web.js';
  const BLOB_UNUSABLE = 'blob:https://cdn.example.com/deadbeef';

  describe('usable location.href base', () => {
    it('resolves same-origin relative to an https bundle href', () => {
      const url = resolveWebWorkerUrl({
        locationHref: 'https://cdn.example.com/ext/apex/dist/server.web.js',
        injectedWorkerUrl: INJECTED,
      });
      expect(url).toBe(
        `https://cdn.example.com/ext/apex/dist/${WEB_WORKER_SCRIPT}`,
      );
    });

    it('prefers the bundle origin over the injected URL when href is usable', () => {
      const url = resolveWebWorkerUrl({
        locationHref: 'https://a.example.com/dist/server.web.js',
        injectedWorkerUrl: 'https://b.example.com/other/worker.platform.web.js',
      });
      expect(url).toBe(`https://a.example.com/dist/${WEB_WORKER_SCRIPT}`);
    });
  });

  describe('blob: base regression (VS Code Web)', () => {
    // The original defect: VS Code Web serves the server bundle from a `blob:`
    // URL. `new URL('./worker.platform.web.js', blobHref)` throws
    // "Failed to construct 'URL': Invalid URL", which aborted worker-topology
    // init and dropped the entire pool. These guard that the resolver never
    // throws on a blob base and falls back correctly.
    const BLOB_HREF =
      'blob:https://cdn.web-ide-qa.platform.salesforce.com/8f0a-abcd';

    it('does NOT throw on a blob: href', () => {
      expect(() =>
        resolveWebWorkerUrl({
          locationHref: BLOB_HREF,
          injectedWorkerUrl: INJECTED,
        }),
      ).not.toThrow();
    });

    it('falls back to the injected worker URL when href is a blob: URL', () => {
      const url = resolveWebWorkerUrl({
        locationHref: BLOB_HREF,
        injectedWorkerUrl: INJECTED,
      });
      expect(url).toBe(INJECTED);
    });

    it('documents that the pre-fix expression threw on a blob: base', () => {
      // Proves the regression is real: building directly off the blob base is
      // exactly what the old inline code did and what the resolver now avoids.
      expect(() => new URL(`./${WEB_WORKER_SCRIPT}`, BLOB_HREF).href).toThrow();
    });
  });

  describe('placeholder fallback', () => {
    it('uses the file:// placeholder when href is a blob and no URL is injected', () => {
      const url = resolveWebWorkerUrl({ locationHref: BLOB_UNUSABLE });
      expect(url).toBe(`file:///${WEB_WORKER_SCRIPT}`);
      expect(url.startsWith('file://')).toBe(true);
    });

    it('treats an empty-string href as unusable and falls back to injected URL', () => {
      const url = resolveWebWorkerUrl({
        locationHref: '',
        injectedWorkerUrl: INJECTED,
      });
      expect(url).toBe(INJECTED);
    });

    it('treats a non-string href as unusable and falls back to injected URL', () => {
      const url = resolveWebWorkerUrl({
        locationHref: undefined,
        injectedWorkerUrl: INJECTED,
      });
      expect(url).toBe(INJECTED);
    });

    it('treats an empty-string injected URL as unusable and falls back to placeholder', () => {
      // `||` (not `??`) semantics: empty string must fall through.
      const url = resolveWebWorkerUrl({
        locationHref: undefined,
        injectedWorkerUrl: '',
      });
      expect(url).toBe(`file:///${WEB_WORKER_SCRIPT}`);
    });

    it('never throws even with no inputs at all', () => {
      expect(() => resolveWebWorkerUrl({})).not.toThrow();
      expect(resolveWebWorkerUrl({})).toBe(`file:///${WEB_WORKER_SCRIPT}`);
    });

    it('exposes a syntactically valid placeholder base', () => {
      expect(() => new URL(PLACEHOLDER_WORKER_BASE)).not.toThrow();
    });
  });

  describe('custom fileName', () => {
    it('honors a custom worker script file name', () => {
      const url = resolveWebWorkerUrl({
        locationHref: 'https://cdn.example.com/dist/server.web.js',
        fileName: 'other.worker.js',
      });
      expect(url).toBe('https://cdn.example.com/dist/other.worker.js');
    });
  });
});
