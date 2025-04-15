/**
 * Jest configuration for apex-parser-ast package
 */
module.exports = {
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)x?$': [
      'babel-jest',
      {
        // Point to the package-specific Babel config
        configFile: './babel.config.cjs',
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Map imports with .js extension to their TypeScript source
    '(.+)\\.js': '$1',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|@apexdevtools|antlr4ts)).+\\.js$',
  ],
  testMatch: ['**/test/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
