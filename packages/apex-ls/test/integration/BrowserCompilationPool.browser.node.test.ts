/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import { build, type BuildOptions, type Plugin } from 'esbuild';
import { chromium } from 'playwright';

const stubApexParserCheckPlugin: Plugin = {
  name: 'stub-apex-parser-check',
  setup(esbuild) {
    esbuild.onResolve({ filter: /[\\/.]Check\.(js|cjs)$/ }, (args) =>
      args.importer?.includes('apex-parser')
        ? { path: 'stub-check', namespace: 'stub-check' }
        : undefined,
    );
    esbuild.onLoad({ filter: /.*/, namespace: 'stub-check' }, () => ({
      contents: 'export function check() {} export function checkProject() {}',
      loader: 'js',
    }));
  },
};

const NODE_POLYFILLS = {
  path: 'path-browserify',
  'node:path': 'path-browserify',
  stream: 'stream-browserify',
  fs: 'memfs-browser',
  'node:fs': 'memfs-browser',
  'node:fs/promises': 'memfs-browser',
  url: 'url-browserify',
  os: 'os-browserify/browser',
  events: 'events',
  assert: 'assert',
  util: 'util',
  'node:util': 'util',
  buffer: 'buffer',
  process: 'process/browser',
} as const;

const PROCESS_BANNER =
  'if(typeof process==="undefined"){' +
  'self.process={' +
  'env:{NODE_ENV:"production"},argv:[],version:"v18.0.0",versions:{},' +
  'platform:"browser",exit:function(){},' +
  'nextTick:function(fn){queueMicrotask(fn)},' +
  'hrtime:function(){return[0,0]},pid:0,' +
  'cwd:function(){return"/"},chdir:function(){}' +
  '}}';

async function bundle(entryPoint: string): Promise<string> {
  const options: BuildOptions = {
    entryPoints: [entryPoint],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    target: 'es2022',
    conditions: ['browser', 'worker', 'import', 'module', 'default'],
    mainFields: ['browser', 'module', 'main'],
    loader: { '.zip': 'dataurl', '.gz': 'dataurl' },
    banner: { js: PROCESS_BANNER },
    alias: NODE_POLYFILLS,
    plugins: [stubApexParserCheckPlugin],
  };
  const result = await build(options);
  const output = result.outputFiles?.[0];
  if (!output) throw new Error(`No browser bundle generated for ${entryPoint}`);
  return output.text;
}

describe('browser Effect compilation pool', () => {
  it('compiles through real nested Web Workers', async () => {
    const [workerSource, harnessSource] = await Promise.all([
      bundle(path.resolve(__dirname, '../../src/worker.platform.web.ts')),
      bundle(
        path.resolve(__dirname, '../fixtures/browserCompilationPoolHarness.ts'),
      ),
    ]);
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();
      const response = await page.evaluate(
        ({ workerSource, harnessSource }) =>
          new Promise<{
            ok: boolean;
            error?: string;
            results?: Array<{
              uri: string;
              version: number;
              symbolCount: number;
            }>;
          }>((resolve, reject) => {
            const harnessUrl = URL.createObjectURL(
              new Blob([harnessSource], { type: 'application/javascript' }),
            );
            const worker = new Worker(harnessUrl);
            const timeout = setTimeout(
              () => reject(new Error('Nested compiler workers timed out')),
              30_000,
            );
            worker.onmessage = (event) => {
              clearTimeout(timeout);
              worker.terminate();
              URL.revokeObjectURL(harnessUrl);
              resolve(event.data);
            };
            worker.onerror = (event) => {
              clearTimeout(timeout);
              worker.terminate();
              URL.revokeObjectURL(harnessUrl);
              reject(new Error(event.message));
            };
            worker.postMessage({ workerSource });
          }),
        { workerSource, harnessSource },
      );

      expect(response).toEqual({
        ok: true,
        results: [
          expect.objectContaining({
            uri: 'file:///browser/BrowserOne.cls',
            version: 1,
            symbolCount: expect.any(Number),
          }),
          expect.objectContaining({
            uri: 'file:///browser/BrowserTwo.cls',
            version: 1,
            symbolCount: expect.any(Number),
          }),
        ],
      });
      expect(response.results?.every((result) => result.symbolCount > 0)).toBe(
        true,
      );
    } finally {
      await browser.close();
    }
  }, 120_000);
});
