const baseConfig = require('./jest.config.base.cjs');

module.exports = {
  ...baseConfig,
  // Node.js specific configuration
  testEnvironment: 'node',
};
