const path = require('path');
const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^vscode$': path.join(__dirname, 'test', 'mocks', 'vscode.ts'),
    '^@salesforce/apex-lsp-shared$': path.resolve(
      __dirname,
      '../apex-lsp-shared/out/index.js',
    ),
    '^@salesforce/apex-ls$': path.resolve(
      __dirname,
      '../apex-ls/src/index.ts',
    ),
    '^\\./unified-language-server$': path.join(__dirname, 'test', 'mocks', 'unified-language-server.ts'),
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|@apexdevtools|antlr4ts|vscode-languageclient)).+\\.js$',
  ],
  collectCoverageFrom: ['src/**/*.ts', '!**/*.d.ts'],
};
