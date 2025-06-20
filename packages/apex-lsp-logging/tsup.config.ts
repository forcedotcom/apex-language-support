/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { defineConfig } from 'tsup';

import { config } from '../../tsup.config';

export default defineConfig({
  ...config,
  entry: ['src/index.ts'],
  outDir: 'dist',
  clean: true,
  dts: false,
  splitting: true,
  noExternal: [],
  external: [],
});
