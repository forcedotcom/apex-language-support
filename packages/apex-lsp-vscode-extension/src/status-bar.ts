/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  EXTENSION_CONSTANTS,
  STATUS_BAR_TEXT,
  STATUS_BAR_TOOLTIPS,
} from './constants';

/**
 * Global status bar item
 */
let statusBarItem: vscode.StatusBarItem;

/**
 * Creates and initializes the status bar item for the Apex Language Server
 * @param context The extension context
 * @returns The created status bar item
 */
export const createStatusBarItem = (
  context: vscode.ExtensionContext,
): vscode.StatusBarItem => {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    EXTENSION_CONSTANTS.STATUS_BAR_PRIORITY,
  );
  statusBarItem.text = STATUS_BAR_TEXT.STARTING;
  statusBarItem.tooltip = STATUS_BAR_TOOLTIPS.STARTING;
  statusBarItem.command = EXTENSION_CONSTANTS.RESTART_COMMAND_ID;
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  return statusBarItem;
};

/**
 * Updates the status bar to show the server is starting
 */
export const updateStatusBarStarting = (): void => {
  if (statusBarItem) {
    statusBarItem.text = STATUS_BAR_TEXT.STARTING;
    statusBarItem.tooltip = STATUS_BAR_TOOLTIPS.STARTING;
  }
};

/**
 * Updates the status bar to show the server is ready
 */
export const updateStatusBarReady = (): void => {
  if (statusBarItem) {
    statusBarItem.text = STATUS_BAR_TEXT.READY;
    statusBarItem.tooltip = STATUS_BAR_TOOLTIPS.READY;
  }
};

/**
 * Updates the status bar to show the server has stopped
 */
export const updateStatusBarStopped = (): void => {
  if (statusBarItem) {
    statusBarItem.text = STATUS_BAR_TEXT.STOPPED;
    statusBarItem.tooltip = STATUS_BAR_TOOLTIPS.STOPPED;
  }
};

/**
 * Updates the status bar to show an error state
 */
export const updateStatusBarError = (): void => {
  if (statusBarItem) {
    statusBarItem.text = STATUS_BAR_TEXT.ERROR;
    statusBarItem.tooltip = STATUS_BAR_TOOLTIPS.ERROR;
  }
};

/**
 * Gets the current status bar item
 * @returns The status bar item
 */
export const getStatusBarItem = (): vscode.StatusBarItem | undefined =>
  statusBarItem;
