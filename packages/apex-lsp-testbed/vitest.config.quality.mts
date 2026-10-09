import { defineConfig } from 'vitest/config';

import baseConfig from './vitest.config.mts';

export default defineConfig({
  ...baseConfig,
  test: { ...baseConfig.test, include: ['test/**/*.quality.ts'], hookTimeout: 60_000 },
});
