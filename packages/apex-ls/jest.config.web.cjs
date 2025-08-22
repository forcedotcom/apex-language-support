const baseConfig = require('../../jest.config.cjs');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/test/setup-web.js'],
  
  // Test file patterns
  testMatch: ['**/test/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  rootDir: '.',
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module name mappings including polyfills and local dependencies
  moduleNameMapper: {
    // VSCode Language Server mocks for browser environment
    '^vscode-languageserver/browser$': '<rootDir>/test/__mocks__/vscode-languageserver-browser.mock.js',
    '^vscode-languageserver$': '<rootDir>/test/__mocks__/vscode-languageserver.mock.js',
    '^vscode-languageserver-textdocument$': '<rootDir>/test/__mocks__/vscode-languageserver-textdocument.mock.js',
    
    // Salesforce packages
    '^@salesforce/apex-lsp-shared$': '<rootDir>/../apex-lsp-shared/src/index.ts',
    '^@salesforce/apex-lsp-parser-ast$': '<rootDir>/../apex-parser-ast/src/index.ts',
    '^@salesforce/apex-lsp-compliant-services$': '<rootDir>/../lsp-compliant-services/src/index.ts',
    '^@salesforce/apex-lsp-custom-services$': '<rootDir>/../custom-services/src/index.ts',
    '^@salesforce/apex-ls$': '<rootDir>/src/index.ts',
    
    // File extensions
    '^(\\.{1,2}/.*)\\.js$': '$1',
    
    // Mock worker files
    '^(\\.{1,2}/.*)\\.worker\\.ts$': '<rootDir>/test/__mocks__/worker.mock.ts',
    '^(\\.{1,2}/.*)\\.worker-esm\\.ts$': '<rootDir>/test/__mocks__/worker.mock.ts',
  },
  
  // Transform ignore patterns - include vscode packages for ESM support
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|@apexdevtools|antlr4ts|vscode-languageserver|vscode-languageserver-protocol|vscode-languageserver-types)).+\\.js$',
  ],
  
  // Test environment-specific configuration
  testEnvironmentOptions: {
    url: 'http://localhost',
  },
  
  // Coverage
  collectCoverage: false,
};