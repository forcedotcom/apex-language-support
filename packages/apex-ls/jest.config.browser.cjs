const baseConfig = require('./jest.config.base.cjs');

module.exports = {
  ...baseConfig,
  // Browser/Web specific configuration
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // Setup files - runs BEFORE each test file is executed (polyfills must be here)
  setupFiles: ['<rootDir>/test/setup-web.js'],

  // Additional module name mappings for web environment
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // VSCode Language Server mocks for browser environment
    '^vscode-languageserver/browser$':
      '<rootDir>/test/__mocks__/vscode-languageserver-browser.mock.js',
    '^vscode-languageserver$':
      '<rootDir>/test/__mocks__/vscode-languageserver.mock.js',
    '^vscode-languageserver-textdocument$':
      '<rootDir>/test/__mocks__/vscode-languageserver-textdocument.mock.js',
    // Map ESM exports from vscode-languageserver-types to CJS
    '^vscode-languageserver-types$':
      '<rootDir>/../../node_modules/vscode-languageserver-types/lib/umd/main.js',
    // Mock Node.js-specific OpenTelemetry packages for web tests
    // These packages use ESM exports that Jest cannot handle in browser environment
    '^@azure/monitor-opentelemetry-exporter$':
      '<rootDir>/test/__mocks__/@azure/monitor-opentelemetry-exporter.mock.js',
  },

  // Transform ignore patterns - include vscode packages for ESM support
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|@apexdevtools|antlr4ts|vscode-languageserver|vscode-languageserver-protocol|vscode-languageserver-types)).+\\.js$',
  ],

  // Test environment-specific configuration
  testEnvironmentOptions: {
    url: 'http://localhost',
  },

  // Global teardown to ensure scheduler is shut down after all tests
  globalTeardown: '<rootDir>/../../scripts/jest-teardown.js',
  // Force exit after tests complete to prevent hanging on open handles
  // NOTE: This is a workaround - the warning will still appear, allowing us to track the issue
  // The warning appears before forceExit takes effect, so we don't lose visibility
  // Can be disabled with JEST_FORCE_EXIT=false if needed for debugging
  forceExit: process.env.JEST_FORCE_EXIT !== 'false', // Default to true, can disable with JEST_FORCE_EXIT=false
};