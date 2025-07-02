/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Extension constants
 */
export const EXTENSION_CONSTANTS = {
  /** Maximum number of server start retries */
  MAX_RETRIES: 3,
  /** Cooldown period between retry cycles in milliseconds */
  COOLDOWN_PERIOD_MS: 30000, // 30 seconds
  /** Minimum delay between restart attempts in milliseconds */
  MIN_RESTART_DELAY_MS: 5000,
  /** Status bar priority */
  STATUS_BAR_PRIORITY: 100,
  /** Output channel name */
  OUTPUT_CHANNEL_NAME: 'Apex Language Server (Typescript)',
  /** Restart command ID */
  RESTART_COMMAND_ID: 'apex.restart.server',
  /** Configuration section name */
  CONFIG_SECTION: 'apex',
} as const;

/**
 * Status bar text constants
 */
export const STATUS_BAR_TEXT = {
  STARTING: '$(sync~spin) Starting Apex Server',
  READY: '$(check) Apex Server Ready',
  STOPPED: '$(error) Apex Server Stopped',
  ERROR: '$(error) Apex Server Error',
  WARNING: '$(warning) Apex Server Stopped',
} as const;

/**
 * Status bar tooltip constants
 */
export const STATUS_BAR_TOOLTIPS = {
  STARTING: 'Apex Language Server is starting',
  READY: 'Apex Language Server is running',
  STOPPED: 'Click to restart the Apex Language Server',
  ERROR: 'Click to restart the Apex Language Server',
} as const;

/**
 * Debug configuration constants
 */
export const DEBUG_CONFIG = {
  DEFAULT_PORT: 6009,
  DEFAULT_MODE: 'off',
  INSPECT_MODE: 'inspect',
  INSPECT_BRK_MODE: 'inspect-brk',
  NOLAZY_FLAG: '--nolazy',
} as const;
