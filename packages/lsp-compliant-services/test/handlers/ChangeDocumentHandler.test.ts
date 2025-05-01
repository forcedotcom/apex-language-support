/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { processOnChangeDocument } from '../../src/handlers/DidChangeDocumentHandler';

describe('ChangeDocumentHandler', () => {
  it('should be defined', () => {
    expect(processOnChangeDocument).toBeDefined();
    expect(typeof processOnChangeDocument).toBe('function');
  });

  it('should handle document change with valid parameters', () => {
    const mockConnection = {
      console: {
        info: jest.fn(),
      },
    } as any;

    const params = {
      textDocument: {
        uri: 'file:///test.apex',
        version: 2,
      },
      contentChanges: [
        {
          text: 'class Test { public void method() {} }',
        },
      ],
    };

    expect(() => processOnChangeDocument(params, mockConnection)).not.toThrow();
    expect(mockConnection.console.info).toHaveBeenCalled();
  });
});
