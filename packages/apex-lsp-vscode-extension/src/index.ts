/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export main extension functions
export { activate, deactivate } from './extension';

// Export types
export type { ExtensionState, WorkspaceSettings, DebugConfig } from './types';

// Export constants
export {
  EXTENSION_CONSTANTS,
  STATUS_BAR_TEXT,
  STATUS_BAR_TOOLTIPS,
  DEBUG_CONFIG,
} from './constants';

// Export logging utilities
export {
  initializeExtensionLogging as initializeLogging,
  logToOutputChannel,
  updateLogLevel,
  getClientOutputChannel,
} from './logging';

// Export status bar utilities
export {
  updateLogLevelStatusItems,
  registerApexLanguageStatusMenu,
  createApexServerStatusItem,
  updateApexServerStatusStarting,
  updateApexServerStatusReady,
  updateApexServerStatusStopped,
  updateApexServerStatusError,
} from './status-bar';

// Export command utilities
export {
  initializeCommandState,
  registerRestartCommand,
  registerLogLevelCommands,
  setRestartHandler,
  setStartingFlag,
  getStartingFlag,
  getServerStartRetries,
  incrementServerStartRetries,
  resetServerStartRetries,
  getLastRestartTime,
  setLastRestartTime,
  getGlobalContext,
} from './commands';

// Export configuration utilities
export {
  getWorkspaceSettings,
  getDebugConfig,
  getTraceServerConfig,
  registerConfigurationChangeListener,
  sendInitialConfiguration,
} from './configuration';

// Export server configuration utilities
export {
  getDebugOptions,
  createServerOptions,
  createClientOptions,
} from './server-config';

// Export error handling utilities
export {
  handleAutoRestart,
  handleMaxRetriesExceeded,
  handleClientClosed,
  handleClientError,
} from './error-handling';

// Export language server utilities
export {
  createAndStartClient,
  startLanguageServer,
  restartLanguageServer,
  stopLanguageServer,
  getClient,
} from './language-server';

// Export workspace loader utilities
export {
  deriveFilePatternsFromDocumentSelector,
  EXCLUDE_GLOB,
} from './workspace-loader';
