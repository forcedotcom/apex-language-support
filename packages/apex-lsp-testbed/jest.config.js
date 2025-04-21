module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Exclude test-artifacts directory which contains cloned repositories
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/test-artifacts/',
  ],

  // Mock modules that might cause issues
  moduleNameMapper: {
    vscode: '<rootDir>/test/__mocks__/vscode.js',
  },
};
