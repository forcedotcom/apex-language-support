const baseConfig = require('./jest.config.base.cjs');

module.exports = {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/test/jest-setup.ts'],
  // Node.js specific configuration
  testEnvironment: 'node',
  // This suite launches a real Chromium instance. Keep it out of the ordinary
  // Node matrix, where browser downloads are intentionally disabled, and run it
  // in the dedicated browser-compilation CI job instead.
  testPathIgnorePatterns: [
    ...(baseConfig.testPathIgnorePatterns ?? []),
    'BrowserCompilationPool\\.browser\\.node\\.test\\.ts$',
  ],
  // Test environments own the instances they create; teardown in a separate
  // Jest environment cannot clean those instances and starts a second module
  // graph during shutdown.
  globalTeardown: undefined,
  // Keep leaked handles visible instead of masking them with Jest force-exit.
  forceExit: false,
};
