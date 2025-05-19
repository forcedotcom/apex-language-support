const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  rootDir: '.',
  testMatch: ['**/test/**/*.test.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@salesforce/apex-lsp-logging$':
      '<rootDir>/../apex-lsp-logging/src/index.ts',
    '^@salesforce/apex-lsp-parser-ast$':
      '<rootDir>/../apex-parser-ast/src/index.ts',
    '^@salesforce/apex-lsp-compliant-services$':
      '<rootDir>/../lsp-compliant-services/src/index.ts',
    '^@salesforce/apex-lsp-custom-services$': '<rootDir>/src/index.ts',
    '^@salesforce/apex-ls-node$': '<rootDir>/../apex-ls-node/src/index.ts',
    '^@salesforce/apex-ls-browser$':
      '<rootDir>/../apex-ls-browser/src/index.ts',
    '^@salesforce/apex-lsp-browser-client$':
      '<rootDir>/../apex-lsp-browser-client/src/index.ts',
    '^@salesforce/apex-lsp-testbed$':
      '<rootDir>/../apex-lsp-testbed/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
