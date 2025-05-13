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
    it('should execute successful operation without logging', async () => {
      const operation = Promise.resolve();
      const errorMessage = 'Test error message';

      await dispatch(operation, errorMessage);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log error when operation fails', async () => {
      const error = new Error('Test error');
      const operation = Promise.reject(error);
      const errorMessage = 'Test error message';

      await dispatch(operation, errorMessage);

      // Wait for the next tick to allow the catch handler to execute
      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${errorMessage}: ${error}`);
    });

    it('should handle non-Error objects in catch', async () => {
      const error = 'String error';
      const operation = Promise.reject(error);
      const errorMessage = 'Test error message';

      await dispatch(operation, errorMessage);

      // Wait for the next tick to allow the catch handler to execute
      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${errorMessage}: ${error}`);
    });

    it('should not block on error handling', async () => {
      const error = new Error('Test error');
      const operation = Promise.reject(error);
      const errorMessage = 'Test error message';

      const dispatchPromise = dispatch(operation, errorMessage);

      // The dispatch function should resolve immediately
      await expect(dispatchPromise).resolves.toBeUndefined();

      // Wait for the next tick to allow the catch handler to execute
      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`${errorMessage}: ${error}`);
    });

    it('should handle multiple errors in sequence', async () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');
      const operation1 = Promise.reject(error1);
      const operation2 = Promise.reject(error2);
      const errorMessage = 'Test error message';

      await dispatch(operation1, errorMessage);
      await dispatch(operation2, errorMessage);

      // Wait for the next tick to allow the catch handlers to execute
      await new Promise(process.nextTick);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(
        1,
        `${errorMessage}: ${error1}`,
      );
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(
        2,
        `${errorMessage}: ${error2}`,
      );
    });
  });
});
