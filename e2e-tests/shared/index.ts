/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 *
 * Shared utilities copied from monorepo playwright-vscode-ext for migration parity.
 * When this repo joins the monorepo, change imports to @playwright-vscode-ext.
 */

export {
  setupConsoleMonitoring,
  setupNetworkMonitoring,
  filterErrors,
  filterNetworkErrors,
  waitForVSCodeWorkbench,
  assertWelcomeTabExists,
  closeWelcomeTabs,
  closeSettingsTab,
  waitForWorkspaceReady,
  typingSpeed,
  isDesktop,
  isMacDesktop,
  isWindowsDesktop,
  validateNoCriticalErrors,
  ensureSecondarySideBarHidden,
  disableMonacoAutoClosing,
  enableMonacoAutoClosing,
} from './utils/helpers';

export {
  createFileWithContents,
  openFileByName,
  editAndSaveOpenFile as editOpenFile,
} from './utils/fileHelpers';

export {
  WORKBENCH,
  EDITOR,
  EDITOR_WITH_URI,
  DIRTY_EDITOR,
  QUICK_INPUT_WIDGET,
  QUICK_INPUT_LIST_ROW,
  TAB,
  TAB_CLOSE_BUTTON,
  STATUS_BAR_ITEM_LABEL,
  NOTIFICATION_LIST_ITEM,
  SETTINGS_SEARCH_INPUT,
  CONTEXT_MENU,
} from './utils/locators';

export { upsertSettings, openSettingsUI } from './pages/settings';

export {
  executeCommandWithCommandPalette,
  openCommandPalette,
  verifyCommandExists,
  verifyCommandDoesNotExist,
  waitForCommandToBeAvailable,
} from './pages/commands';

export {
  executeEditorContextMenuCommand,
  executeExplorerContextMenuCommand,
} from './pages/contextMenu';

export {
  ensureOutputPanelOpen,
  selectOutputChannel,
  clearOutputChannel,
  waitForOutputChannelText,
  outputChannelContains,
  captureOutputChannelDetails,
} from './pages/outputChannel';

export { saveScreenshot } from './screenshotUtils';

export { createWebConfig } from './config/createWebConfig';
export { createDesktopConfig } from './config/createDesktopConfig';
