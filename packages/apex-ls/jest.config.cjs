const baseConfig = require('./jest.config.base.cjs');

module.exports = {
  ...baseConfig,
  // Node.js specific configuration
  testEnvironment: 'node',
  // Global teardown to ensure scheduler is shut down after all tests
  globalTeardown: '<rootDir>/../../scripts/jest-teardown.js',
};
