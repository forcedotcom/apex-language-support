/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { processOnCloseDocument } from '../../src/handlers/DidCloseDocumentHandler';

describe('CloseDocumentHandler', () => {
  it('should be defined', () => {
    expect(processOnCloseDocument).toBeDefined();
    expect(typeof processOnCloseDocument).toBe('function');
  });

  it('should handle document close with valid parameters', () => {
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

    expect(() => processOnCloseDocument(params, mockConnection)).not.toThrow();
    expect(mockConnection.console.info).toHaveBeenCalled();
  });
});
