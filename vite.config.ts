/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

// Automatically detect and build all packages in the monorepo
const packages = fs
  .readdirSync('./packages')
  .filter((dir) => fs.statSync(`./packages/${dir}`).isDirectory())
  .filter((dir) => fs.existsSync(`./packages/${dir}/package.json`));

export default defineConfig({
  // Common Vite configuration for all packages can go here
  build: {
    sourcemap: true,
    minify: false,
  },
  optimizeDeps: {
    include: ['@apexdevtools/apex-parser', 'antlr4ts'],
  },
  esbuild: {
    target: 'es2020',
  },
});
