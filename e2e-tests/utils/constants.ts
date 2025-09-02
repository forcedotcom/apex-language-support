/**
 * Constants for e2e test configuration and timing.
 * 
 * Centralizes all magic numbers and configuration values following
 * TypeScript best practices from .cursor guidelines.
 */

import type { TestTimeouts, BrowserArgs, ErrorFilterPattern } from '../types/test.types';

/**
 * Test timing configuration in milliseconds.
 */
export const TEST_TIMEOUTS: TestTimeouts = {
  VS_CODE_STARTUP: 12_000,
  LSP_INITIALIZATION: 8_000,
  SELECTOR_WAIT: 30_000,
  ACTION_TIMEOUT: 15_000,
  OUTLINE_GENERATION: 5_000,
} as const;

/**
 * Browser launch arguments for VS Code Web testing.
 */
export const BROWSER_ARGS: BrowserArgs = [
  '--disable-web-security',
  '--disable-features=VizDisplayCompositor',
  '--enable-logging=stderr',
  '--log-level=0',
  '--v=1',
] as const;

/**
 * Patterns for filtering out non-critical console errors.
 */
export const NON_CRITICAL_ERROR_PATTERNS: readonly ErrorFilterPattern[] = [
  'favicon.ico',
  'sourcemap',
  'webPackagePaths.js',
  'workbench.web.main.nls.js',
  'Long running operations during shutdown',
  'lifecycle',
  'hostname could not be found',
] as const;

/**
 * CSS selectors used in tests.
 */
export const SELECTORS = {
  WORKBENCH: '.monaco-workbench',
  EXPLORER: '[id="workbench.view.explorer"]',
  EDITOR_PART: '[id="workbench.parts.editor"]',
  MONACO_EDITOR: '[id="workbench.parts.editor"] .monaco-editor',
  SIDEBAR: '[id="workbench.parts.sidebar"]',
  STATUSBAR: '[id="workbench.parts.statusbar"]',
  EXTENSIONS_VIEW: '[id*="workbench.view.extensions"], .extensions-viewlet',
  APEX_FILE_ICON: '.cls-ext-file-icon, .apex-lang-file-icon',
  CLS_FILE_ICON: '.cls-ext-file-icon',
  OUTLINE_TREE: '.outline-tree, .monaco-tree, .tree-explorer',
  SYMBOL_ICONS: '.codicon-symbol-class, .codicon-symbol-method, .codicon-symbol-field',
} as const;

/**
 * Test assertion thresholds.
 */
export const ASSERTION_THRESHOLDS = {
  MAX_CRITICAL_ERRORS: 5,
  MAX_NETWORK_FAILURES: 3,
  MIN_FILE_COUNT: 0,
} as const;

/**
 * Outline view selectors for testing.
 */
export const OUTLINE_SELECTORS = [
  'text=OUTLINE',
  '.pane-header[aria-label*="Outline"]',
  '[id*="outline"]',
  '.outline-tree',
] as const;

/**
 * Apex-specific terms to look for in outline view.
 */
export const APEX_TERMS = [
  'HelloWorld',
  'public',
  'class',
  'sayHello',
  'add',
] as const;