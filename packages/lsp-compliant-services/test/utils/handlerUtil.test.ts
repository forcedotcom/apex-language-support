/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dispatch } from '../../src/utils/handlerUtil';
import { getLogger } from '@salesforce/apex-lsp-logging';
jest.mock('@salesforce/apex-lsp-logging');

describe('handlerUtil', () => {
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    (getLogger as jest.Mock).mockReturnValue(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('dispatch', () => {
    it('should return successful operation result', async () => {
      const result = 'test result';
      const operation = Promise.resolve(result);
      const errorMessage = 'Test error message';

      const dispatchResult = await dispatch(operation, errorMessage);

      expect(dispatchResult).toBe(result);
      expect(mockLogger.log).not.toHaveBeenCalled();
    });

    it('should log error and rethrow when operation fails', async () => {
      const error = new Error('fail');
      const operation = Promise.reject(error);
      const errorMessage = 'Failed operation';

      await expect(dispatch(operation, errorMessage)).rejects.toThrow(error);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(Number),
        expect.stringContaining('Error in dispatch'),
      );
    });

    it('should handle non-Error objects in catch', async () => {
      const error = 'fail';
      const operation = Promise.reject(error);
      const errorMessage = 'Failed operation';

      await expect(dispatch(operation, errorMessage)).rejects.toBe(error);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.any(Number),
        expect.stringContaining('Error in dispatch'),
      );
    });

    it('should handle complex return types', async () => {
      const result = { data: 'test', count: 42 };
      const operation = Promise.resolve(result);
      const errorMessage = 'Test error message';

      const dispatchResult = await dispatch(operation, errorMessage);

      expect(dispatchResult).toEqual(result);
      expect(mockLogger.log).not.toHaveBeenCalled();
    });
  });
});
