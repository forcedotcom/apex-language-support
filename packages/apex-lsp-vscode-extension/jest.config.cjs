const path = require('path');
const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  rootDir: '.',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^vscode$': path.join(__dirname, 'test', 'mocks', 'vscode.ts'),
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|@apexdevtools|antlr4ts|vscode-languageclient)).+\\.js$',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/node_modules/**',
    '!**/out/**',
    '!**/test/**',
    '!**/*.d.ts',
    '!**/index.ts',
    '!**/middleware/**',
  ],
  testPathIgnorePatterns: ['/node_modules/', '!**/out/**'],
};
