/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dispatch } from '../../src/utils/handlerUtil';

describe('handlerUtil', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
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
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log error and rethrow when operation fails', async () => {
      const error = new Error('Test error');
      const operation = Promise.reject(error);
      const errorMessage = 'Test error message';

      await expect(dispatch(operation, errorMessage)).rejects.toThrow(error);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${errorMessage}: ${error}`);
    });

    it('should handle non-Error objects in catch', async () => {
      const error = 'String error';
      const operation = Promise.reject(error);
      const errorMessage = 'Test error message';

      await expect(dispatch(operation, errorMessage)).rejects.toBe(error);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${errorMessage}: ${error}`);
    });

    it('should handle complex return types', async () => {
      const result = { data: 'test', count: 42 };
      const operation = Promise.resolve(result);
      const errorMessage = 'Test error message';

      const dispatchResult = await dispatch(operation, errorMessage);

      expect(dispatchResult).toEqual(result);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
