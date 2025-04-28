module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.tsx?$': ['babel-jest'],
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: [],

  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/test-artifacts/',
  ],

  moduleNameMapper: {
    vscode: '<rootDir>/test/__mocks__/vscode.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@salesforce/apex-lsp-testbed/src/servers/jorje/javaServerLauncher\\.js$':
      '<rootDir>/test/__mocks__/javaServerLauncher.ts',
  },

  // transformIgnorePatterns: [
  //   'node_modules/(?!(vscode-jsonrpc|vscode-languageserver-types|vscode-languageserver-protocol|vscode-languageserver-textdocument|vscode-languageserver)/)',
  // ],

  // globals: {
  //   'ts-jest': {
  //     useESM: false,
  //   },
  // },
};
