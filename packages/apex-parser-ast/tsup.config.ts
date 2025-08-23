/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';

import { config } from '../../tsup.config';

export default defineConfig([
  // Default build (Node.js)
  {
    ...config,
    entry: {
      index: 'src/index.ts',
      node: 'src/node.ts',
    },
    outDir: 'dist',
    clean: true,
    dts: false,
    splitting: false,
    noExternal: [],
    external: [],
  },
  // Web build (excludes antlr4ts dependencies)
  {
    ...config,
    entry: {
      web: 'src/web.ts',
    },
    outDir: 'dist',
    clean: false,
    dts: false,
    splitting: false,
    noExternal: [],
    external: [
      '@apexdevtools/apex-parser',
      'antlr4ts',
    ],
  },
]);
