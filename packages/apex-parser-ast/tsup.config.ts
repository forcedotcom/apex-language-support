/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';
import { nodeBaseConfig } from '../../build-config/tsup.shared';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
  readdirSync,
} from 'fs';
import { join } from 'path';

/**
 * Post-build hook for consistent resource structure and bundled package.json
 * Both compile and bundle use the same 'out/resources/' directory
 */
function postBuild() {
  console.log(`✅ Using consistent resource directory: out/resources/`);

  // Copy resources to dist folder
  copyResourcesToDist();

  // Copy type definitions to dist folder
  copyTypesToDist();

  // Create a package.json for the bundled artifacts
  createBundledPackageJson();
}

/**
 * Copies resources from out/resources/ to dist/resources/ for bundled package
 */
function copyResourcesToDist() {
  try {
    const sourceResourcesDir = 'out/resources';
    const distResourcesDir = 'dist/resources';

    if (existsSync(sourceResourcesDir)) {
      // Ensure dist/resources directory exists
      mkdirSync(distResourcesDir, { recursive: true });

      // Copy all files from out/resources to dist/resources
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
function copyTypesToDist() {
  try {
    const sourceTypesDir = 'out';
    const distTypesDir = 'dist';

    if (existsSync(join(sourceTypesDir, 'index.d.ts'))) {
      // Copy main type definition file
      const sourceTypeFile = join(sourceTypesDir, 'index.d.ts');
      const destTypeFile = join(distTypesDir, 'index.d.ts');
      copyFileSync(sourceTypeFile, destTypeFile);

      // Copy type definition map if it exists
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
function createBundledPackageJson() {
  try {
    // Read the original package.json
    const originalPackageJson = JSON.parse(
      readFileSync('package.json', 'utf-8'),
    );

    // Create bundled package.json with updated paths
    const bundledPackageJson = {
      ...originalPackageJson,
      name: originalPackageJson.name,
      version: originalPackageJson.version,
      description: originalPackageJson.description,
      main: 'index.js',
      module: 'index.mjs',
      types: 'index.d.ts', // Use bundled types from dist/ (relative to dist/)
      exports: {
        '.': {
          import: './index.mjs',
          require: './index.js',
          types: './index.d.ts', // Use bundled types from dist/ (relative to dist/)
        },
      },
      files: ['.', 'README.md'], // All files relative to dist/ directory (includes resources/ subdirectory)
      // Remove scripts and dev dependencies for production bundle
      scripts: {
        test: originalPackageJson.scripts?.test || 'echo "No test script"',
      },
      devDependencies: {},
      // Keep only essential metadata
      license: originalPackageJson.license,
      repository: originalPackageJson.repository,
      keywords: originalPackageJson.keywords || [],
      author: originalPackageJson.author,
      sideEffects: originalPackageJson.sideEffects,
    };

    // Write the bundled package.json
    writeFileSync(
      join('dist', 'package.json'),
      JSON.stringify(bundledPackageJson, null, 2) + '\n',
    );

    console.log('✅ Created bundled package.json in dist/');
  } catch (error) {
    console.error('❌ Failed to create bundled package.json:', error);
  }
}

export default defineConfig({
  ...nodeBaseConfig,
  name: 'parser-ast',
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.js',
    };
  },
  sourcemap: true,
  dts: false, // Disable DTS generation - will copy from out/
  noExternal: [],
  external: [],
  onSuccess: postBuild,
});
