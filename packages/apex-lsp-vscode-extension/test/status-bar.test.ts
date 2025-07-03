/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  createStatusBarItem,
  updateStatusBarReady,
  updateStatusBarStarting,
  updateStatusBarError,
  getStatusBarItem,
} from '../src/status-bar';
import {
  EXTENSION_CONSTANTS,
  STATUS_BAR_TEXT,
  STATUS_BAR_TOOLTIPS,
} from '../src/constants';

describe('Status Bar Module', () => {
  let mockContext: vscode.ExtensionContext;
  let mockStatusBarItem: vscode.StatusBarItem;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock status bar item
    mockStatusBarItem = {
      command: EXTENSION_CONSTANTS.RESTART_COMMAND_ID,
      text: STATUS_BAR_TEXT.STARTING,
      tooltip: STATUS_BAR_TOOLTIPS.STARTING,
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    } as unknown as vscode.StatusBarItem;

    // Mock vscode.window.createStatusBarItem
    jest
      .spyOn(vscode.window, 'createStatusBarItem')
      .mockReturnValue(mockStatusBarItem);

    // Create mock context
    mockContext = {
      subscriptions: [],
    } as unknown as vscode.ExtensionContext;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Reset the module's internal state by clearing the module cache
    jest.resetModules();
  });

  describe('createStatusBarItem', () => {
    it('should create status bar item and add to subscriptions', () => {
      createStatusBarItem(mockContext);

      expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(
        vscode.StatusBarAlignment.Right,
        EXTENSION_CONSTANTS.STATUS_BAR_PRIORITY,
      );
      expect(mockContext.subscriptions).toContain(mockStatusBarItem);
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });

    it('should set initial status bar properties', () => {
      createStatusBarItem(mockContext);

      expect(mockStatusBarItem.command).toBe(
        EXTENSION_CONSTANTS.RESTART_COMMAND_ID,
      );
      expect(mockStatusBarItem.text).toBe(STATUS_BAR_TEXT.STARTING);
      expect(mockStatusBarItem.tooltip).toBe(STATUS_BAR_TOOLTIPS.STARTING);
    });
  });

  describe('updateStatusBarReady', () => {
    it('should update status bar to ready state', () => {
      createStatusBarItem(mockContext);

      updateStatusBarReady();

      expect(mockStatusBarItem.text).toBe(STATUS_BAR_TEXT.READY);
      expect(mockStatusBarItem.tooltip).toBe(STATUS_BAR_TOOLTIPS.READY);
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });
  });

  describe('updateStatusBarStarting', () => {
    it('should update status bar to starting state', () => {
      createStatusBarItem(mockContext);

      updateStatusBarStarting();

      expect(mockStatusBarItem.text).toBe(STATUS_BAR_TEXT.STARTING);
      expect(mockStatusBarItem.tooltip).toBe(STATUS_BAR_TOOLTIPS.STARTING);
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });
  });

  describe('updateStatusBarError', () => {
    it('should update status bar to error state', () => {
      createStatusBarItem(mockContext);

      updateStatusBarError();

      expect(mockStatusBarItem.text).toBe(STATUS_BAR_TEXT.ERROR);
      expect(mockStatusBarItem.tooltip).toBe(STATUS_BAR_TOOLTIPS.ERROR);
      expect(mockStatusBarItem.show).toHaveBeenCalled();
    });
  });

  describe('getStatusBarItem', () => {
    it('should return status bar item after creation', () => {
      createStatusBarItem(mockContext);

      const result = getStatusBarItem();

      expect(result).toBe(mockStatusBarItem);
    });

    it('should return undefined before creation', () => {
      // Clear the module cache to reset internal state
      jest.resetModules();

      // Re-import the module to get fresh state
      const {
        getStatusBarItem: freshGetStatusBarItem,
      } = require('../src/status-bar');

      const result = freshGetStatusBarItem();

      expect(result).toBeUndefined();
    });
  });
});
