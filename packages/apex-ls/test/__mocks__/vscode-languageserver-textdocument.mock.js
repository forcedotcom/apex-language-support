/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Mock VSCode Language Server TextDocument implementation for Jest testing

module.exports = {
  TextDocument: {
    create: vi.fn((uri, languageId, version, content) => ({
      uri,
      languageId,
      version,
      getText: () => content,
      positionAt: vi.fn(() => ({ line: 0, character: 0 })),
      offsetAt: vi.fn(() => 0),
      lineCount: content ? content.split('\n').length : 1,
    })),
  },
};