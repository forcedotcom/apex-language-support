import { defineConfig } from 'vitest/config';

import baseConfig from './vitest.config.mts';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['test/integration/BrowserCompilationPool.browser.node.test.ts'],
    exclude: [],
    pool: 'forks',
    maxWorkers: 1,
  },
});
