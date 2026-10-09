import { defineConfig } from 'vitest/config';

import baseConfig from './vitest.config.mts';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['test/**/*.perf.ts', 'test/performance/server-comparison.test.ts'],
    exclude: ['test/integration/**', 'test/accuracy/semantic-errors.test.ts'],
    hookTimeout: 60_000,
    benchmark: {
      include: ['test/**/*.perf.ts', 'test/performance/server-comparison.test.ts'],
    },
  },
});
