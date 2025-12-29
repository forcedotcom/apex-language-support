/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { BuildOptions } from 'esbuild';
import { copy } from 'esbuild-plugin-copy';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { nodeBaseConfig, runBuilds } from '@salesforce/esbuild-presets';

const builds: BuildOptions[] = [
  {
    ...nodeBaseConfig,
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'cjs',
    sourcemap: true,
    outExtension: { '.js': '.js' },
    external: [],
    // Bundle the Standard Apex Library ZIP as a base64 data URL
    loader: {
      '.zip': 'dataurl',
    },
    plugins: [
      copy({
        resolveFrom: 'cwd',
        assets: [
          // Copy resources from out/resources/ to dist/resources/
          {
            from: ['out/resources/**/*'],
            to: ['./dist/resources'],
          },
          // Copy type definitions from out/ to dist/
          {
            from: ['out/index.d.ts', 'out/index.d.ts.map'],
            to: ['./dist'],
          },
        ],
        watch: true,
        verbose: true,
      }),
    ],
  },
  {
    ...nodeBaseConfig,
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'esm',
    sourcemap: true,
    outExtension: { '.js': '.mjs' },
    external: [],
    // Bundle the Standard Apex Library ZIP as a base64 data URL
    loader: {
      '.zip': 'dataurl',
    },
  },
];

/**
 * Post-build hook for creating bundled package.json
 * Note: File copying (resources and types) is handled by esbuild-plugin-copy
 */
function postBuild(): void {
  createBundledPackageJson();
}

/**
 * Creates a package.json for the bundled artifacts that points to dist/ instead of out/
 */
function createBundledPackageJson(): void {
  try {
    const originalPackageJson = JSON.parse(
      readFileSync('package.json', 'utf-8'),
    );

    const bundledPackageJson = {
      ...originalPackageJson,
      name: originalPackageJson.name,
      version: originalPackageJson.version,
      description: originalPackageJson.description,
      main: 'index.js',
      module: 'index.mjs',
      types: 'index.d.ts',
      exports: {
        '.': {
          import: './index.mjs',
          require: './index.js',
          types: './index.d.ts',
        },
      },
      files: ['.', 'README.md'],
      scripts: {
        test: originalPackageJson.scripts?.test || 'echo "No test script"',
      },
      devDependencies: {},
      license: originalPackageJson.license,
      repository: originalPackageJson.repository,
      keywords: originalPackageJson.keywords || [],
      author: originalPackageJson.author,
      sideEffects: originalPackageJson.sideEffects,
    };

    writeFileSync(
      join('dist', 'package.json'),
      JSON.stringify(bundledPackageJson, null, 2) + '\n',
    );

    console.log('✅ Created bundled package.json in dist/');
  } catch (error) {
    console.error('❌ Failed to create bundled package.json:', error);
  }
}

async function run(watch = false): Promise<void> {
  await runBuilds(builds, {
    watch,
    afterBuild: postBuild,
    onError: (error) => {
      console.error('❌ Rebuild failed', error);
    },
    label: 'apex-parser-ast',
    logWatchStart: true,
  });
}

run(process.argv.includes('--watch')).catch((error) => {
  console.error(error);
  process.exit(1);
});
