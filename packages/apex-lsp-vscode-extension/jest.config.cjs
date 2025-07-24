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
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|@apexdevtools|antlr4ts|vscode-languageclient)).+\\.js$',
  ],
  collectCoverageFrom: ['src/**/*.ts', '!**/*.d.ts'],
};
