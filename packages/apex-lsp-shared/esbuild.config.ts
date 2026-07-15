/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { BuildOptions } from 'esbuild';
import { nodeBaseConfig, runBuilds } from '@salesforce/esbuild-presets';

const builds: BuildOptions[] = [
  {
    ...nodeBaseConfig,
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'cjs',
    outExtension: { '.js': '.js' },
    external: [
      ...(nodeBaseConfig.external || []),
      // Mark async_hooks as external (Node.js built-in)
      'async_hooks',
      // Mark all OTEL packages as external - they depend on Node.js built-ins
      // and should be resolved at runtime, not bundled
      '@opentelemetry/api',
      '@opentelemetry/context-async-hooks',
      '@opentelemetry/core',
      '@opentelemetry/exporter-trace-otlp-http',
      '@opentelemetry/resources',
      '@opentelemetry/sdk-trace-base',
      '@opentelemetry/sdk-trace-node',
      '@opentelemetry/sdk-node',
      '@effect/opentelemetry',
    ],
  },
  {
    ...nodeBaseConfig,
    entryPoints: ['src/index.ts'],
    outdir: 'dist',
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    external: [
      ...(nodeBaseConfig.external || []),
      // Mark async_hooks as external (Node.js built-in)
      'async_hooks',
      // Mark all OTEL packages as external - they depend on Node.js built-ins
      // and should be resolved at runtime, not bundled
      '@opentelemetry/api',
      '@opentelemetry/context-async-hooks',
      '@opentelemetry/core',
      '@opentelemetry/exporter-trace-otlp-http',
      '@opentelemetry/resources',
      '@opentelemetry/sdk-trace-base',
      '@opentelemetry/sdk-trace-node',
      '@opentelemetry/sdk-node',
      '@effect/opentelemetry',
    ],
  },
];

async function run(watch = false): Promise<void> {
  await runBuilds(builds, {
    watch,
    label: 'apex-lsp-shared',
    logWatchStart: true,
  });
}

run(process.argv.includes('--watch')).catch((error) => {
  console.error(error);
  process.exit(1);
});
