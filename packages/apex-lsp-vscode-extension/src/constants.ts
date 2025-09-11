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
  /** Output channel name */
  EXTENSION_OUTPUT_CHANNEL_NAME: 'Apex Language Extension (Typescript)',
  /** Status bar priority */
  STATUS_BAR_PRIORITY: 100,
  /** Client output channel name */
  CLIENT_OUTPUT_CHANNEL_NAME: 'Apex Language Server Extension (Client)',
  /** Worker/Server output channel name */
  WORKER_SERVER_OUTPUT_CHANNEL_NAME:
    'Apex Language Server Extension (Worker/Server)',
  /** Restart command ID */
  RESTART_COMMAND_ID: 'apex-ls-ts.restart.server',
  /** Restart command ID (alternative for web compatibility) */
  WEB_RESTART_COMMAND_ID: 'apex.restart.server',
  /** Configuration section name */
  CONFIG_SECTION: 'apex-ls-ts',
} as const;

/**
 * Debug configuration constants
 */
export const DEBUG_CONFIG = {
  /** Inspect mode for debugging */
  INSPECT_MODE: 'inspect',
  /** Inspect break mode for debugging with break on first line */
  INSPECT_BRK_MODE: 'inspect-brk',
  /** No lazy flag for Node.js debugging */
  NOLAZY_FLAG: '--nolazy',
} as const;
