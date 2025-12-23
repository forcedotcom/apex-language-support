/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { BuildOptions } from 'esbuild';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs';
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
 * Post-build hook for consistent resource structure and bundled package.json
 * Both compile and bundle use the same 'out/resources/' directory
 */
function postBuild(): void {
  console.log('✅ Using consistent resource directory: out/resources/');
  copyResourcesToDist();
  copyTypesToDist();
  createBundledPackageJson();
}

/**
 * Copies resources from out/resources/ to dist/resources/ for bundled package
 */
function copyResourcesToDist(): void {
  try {
    const sourceResourcesDir = 'out/resources';
    const distResourcesDir = 'dist/resources';

    if (existsSync(sourceResourcesDir)) {
      mkdirSync(distResourcesDir, { recursive: true });
      const files = readdirSync(sourceResourcesDir);

      for (const file of files) {
        const sourcePath = join(sourceResourcesDir, file);
        const destPath = join(distResourcesDir, file);
        copyFileSync(sourcePath, destPath);
      }

      console.log(`✅ Copied resources to ${distResourcesDir}`);
    } else {
      console.log(
        `⚠️  Source resources directory not found: ${sourceResourcesDir}`,
      );
    }
  } catch (error) {
    console.error('❌ Failed to copy resources to dist:', error);
  }
}

/**
 * Copies type definitions from out/ to dist/ for bundled package
 */
function copyTypesToDist(): void {
  try {
    const sourceTypesDir = 'out';
    const distTypesDir = 'dist';

    if (existsSync(join(sourceTypesDir, 'index.d.ts'))) {
      const sourceTypeFile = join(sourceTypesDir, 'index.d.ts');
      const destTypeFile = join(distTypesDir, 'index.d.ts');
      copyFileSync(sourceTypeFile, destTypeFile);

      const sourceTypeMapFile = join(sourceTypesDir, 'index.d.ts.map');
      if (existsSync(sourceTypeMapFile)) {
        const destTypeMapFile = join(distTypesDir, 'index.d.ts.map');
        copyFileSync(sourceTypeMapFile, destTypeMapFile);
      }

      console.log(`✅ Copied type definitions to ${distTypesDir}`);
    } else {
      console.log(
        `⚠️  Source type definitions not found: ${sourceTypesDir}/index.d.ts`,
      );
    }
  } catch (error) {
    console.error('❌ Failed to copy type definitions to dist:', error);
  }
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
