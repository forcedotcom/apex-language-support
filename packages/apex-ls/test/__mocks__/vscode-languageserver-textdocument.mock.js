// Mock VSCode Language Server TextDocument implementation for Jest testing

module.exports = {
  TextDocument: {
    create: jest.fn((uri, languageId, version, content) => ({
      uri,
      languageId,
      version,
      getText: () => content,
      positionAt: jest.fn(() => ({ line: 0, character: 0 })),
      offsetAt: jest.fn(() => 0),
      lineCount: content ? content.split('\n').length : 1,
    })),
  },
};