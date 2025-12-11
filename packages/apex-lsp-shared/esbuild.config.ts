/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { BuildOptions } from 'esbuild';
import { nodeBaseConfig } from '../../build-config/esbuild.shared';
import { runBuilds } from '../../build-config/esbuild.presets';

const builds: BuildOptions[] = [
  {
    ...nodeBaseConfig,
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'cjs',
    outExtension: { '.js': '.js' },
  },
  {
    ...nodeBaseConfig,
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
  },
];

async function run(watch = false): Promise<void> {
  await runBuilds(builds, {
    watch,
    afterBuild: () => {
      console.log('✅ esbuild build complete for apex-lsp-shared');
    },
  });
}

run(process.argv.includes('--watch')).catch((error) => {
  console.error(error);
  process.exit(1);
});
