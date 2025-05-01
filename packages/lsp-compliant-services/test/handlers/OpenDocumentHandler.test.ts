/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { processOnOpenDocument } from '../../src/handlers/DidOpenDocumentHandler';

describe('OpenDocumentHandler', () => {
  it('should be defined', () => {
    expect(processOnOpenDocument).toBeDefined();
    expect(typeof processOnOpenDocument).toBe('function');
  });

  it('should handle document open with valid parameters', () => {
    const mockConnection = {
      console: {
        info: jest.fn(),
      },
    } as any;

    const params = {
      textDocument: {
        uri: 'file:///test.apex',
        languageId: 'apex',
        version: 1,
        text: 'class Test {}',
      },
    };

    expect(() => processOnOpenDocument(params, mockConnection)).not.toThrow();
    expect(mockConnection.console.info).toHaveBeenCalled();
  });
});
