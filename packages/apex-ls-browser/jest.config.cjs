const baseConfig = require('../../jest.config.cjs');

module.exports = {
  ...baseConfig,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@salesforce/apex-lsp-shared$':
      '<rootDir>/../apex-lsp-shared/src/index.ts',
    '^@salesforce/apex-lsp-parser-ast$':
      '<rootDir>/../apex-parser-ast/src/index.ts',
    '^@salesforce/apex-lsp-compliant-services$':
      '<rootDir>/../lsp-compliant-services/src/index.ts',
    '^@salesforce/apex-lsp-custom-services$':
      '<rootDir>/../custom-services/src/index.ts',
    '^@salesforce/apex-ls-node$': '<rootDir>/../apex-ls-node/src/index.ts',
    '^@salesforce/apex-ls-browser$': '<rootDir>/src/index.ts',
    '^@salesforce/apex-lsp-browser-client$':
      '<rootDir>/../apex-lsp-browser-client/src/index.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Mock worker files that contain import.meta (not supported in Jest Node.js environment)
    '^(\\.{1,2}/.*)\\.worker\\.ts$': '<rootDir>/test/__mocks__/worker.mock.ts',
    '^(\\.{1,2}/.*)\\.worker-esm\\.ts$':
      '<rootDir>/test/__mocks__/worker.mock.ts',
  },
};
