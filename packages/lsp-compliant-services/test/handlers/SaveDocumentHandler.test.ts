/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { processOnSaveDocument } from '../../src/handlers/DidSaveDocumentHandler';

describe('SaveDocumentHandler', () => {
  it('should be defined', () => {
    expect(processOnSaveDocument).toBeDefined();
    expect(typeof processOnSaveDocument).toBe('function');
  });

  it('should handle document save with valid parameters', () => {
    const mockConnection = {
      console: {
        info: jest.fn(),
      },
    } as any;

    const params = {
      textDocument: {
        uri: 'file:///test.apex',
      },
    };

    expect(() => processOnSaveDocument(params, mockConnection)).not.toThrow();
    expect(mockConnection.console.info).toHaveBeenCalled();
  });
});
