const baseConfig = require('./jest.config.base.cjs');

module.exports = {
  ...baseConfig,
  // Browser/Web specific configuration
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Setup files  
  setupFilesAfterEnv: ['<rootDir>/test/setup-web.js'],
  
  // Additional module name mappings for web environment
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // VSCode Language Server mocks for browser environment
    '^vscode-languageserver/browser$': '<rootDir>/test/__mocks__/vscode-languageserver-browser.mock.js',
    '^vscode-languageserver$': '<rootDir>/test/__mocks__/vscode-languageserver.mock.js',
    '^vscode-languageserver-textdocument$': '<rootDir>/test/__mocks__/vscode-languageserver-textdocument.mock.js',
  },
  
  // Transform ignore patterns - include vscode packages for ESM support
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|@apexdevtools|antlr4ts|vscode-languageserver|vscode-languageserver-protocol|vscode-languageserver-types)).+\\.js$',
  ],
  
  // Test environment-specific configuration
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
};