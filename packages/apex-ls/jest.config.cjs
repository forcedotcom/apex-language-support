const baseConfig = require('./jest.config.base.cjs');

module.exports = {
  ...baseConfig,
  // Node.js specific configuration
  testEnvironment: 'node',
  // Global teardown to ensure scheduler is shut down after all tests
  globalTeardown: '<rootDir>/../../scripts/jest-teardown.js',
  // Force exit after tests complete to prevent hanging on open handles
  // NOTE: This is a workaround - the warning will still appear, allowing us to track the issue
  // The warning appears before forceExit takes effect, so we don't lose visibility
  // Can be disabled with JEST_FORCE_EXIT=false if needed for debugging
  forceExit: process.env.JEST_FORCE_EXIT !== 'false', // Default to true, can disable with JEST_FORCE_EXIT=false
};
