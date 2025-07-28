const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@salesforce/apex-lsp-shared$':
      '<rootDir>/../apex-lsp-shared/src/index.ts',
    '^@salesforce/apex-lsp-parser-ast$':
      '<rootDir>/../apex-parser-ast/src/index.ts',
    '^@salesforce/apex-lsp-compliant-services$': '<rootDir>/src/index.ts',
    '^@salesforce/apex-lsp-custom-services$':
      '<rootDir>/../custom-services/src/index.ts',
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
