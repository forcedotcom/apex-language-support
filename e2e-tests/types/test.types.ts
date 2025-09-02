/**
 * Type definitions for e2e test utilities and interfaces.
 * 
 * Provides strong typing for test-related data structures and configurations
 * following TypeScript best practices from .cursor guidelines.
 */

/**
 * Console error information captured during testing.
 */
export interface ConsoleError {
  /** Error message text */
  readonly text: string;
  /** URL where the error occurred, if available */
  readonly url?: string;
}

/**
 * Test execution metrics for validation.
 */
export interface TestMetrics {
  /** Number of critical console errors */
  readonly criticalErrors: number;
  /** Number of network failures */
  readonly networkFailures: number;
  /** Number of files found in workspace */
  readonly fileCount: number;
}

/**
 * Configuration for test timeouts in milliseconds.
 */
export interface TestTimeouts {
  /** Time to wait for VS Code Web to start */
  readonly VS_CODE_STARTUP: number;
  /** Time to wait for LSP server initialization */
  readonly LSP_INITIALIZATION: number;
  /** Time to wait for selectors to appear */
  readonly SELECTOR_WAIT: number;
  /** Time to wait for actions to complete */
  readonly ACTION_TIMEOUT: number;
  /** Time for file parsing and outline generation */
  readonly OUTLINE_GENERATION: number;
}

/**
 * Test environment configuration.
 */
export interface TestEnvironment {
  /** Number of test retries on CI */
  readonly retries: number;
  /** Number of parallel workers */
  readonly workers: number | undefined;
  /** Test timeout in milliseconds */
  readonly timeout: number;
  /** Whether running in CI environment */
  readonly isCI: boolean;
}

/**
 * Sample file configuration for test fixtures.
 */
export interface SampleFile {
  /** File name with extension */
  readonly filename: string;
  /** File content */
  readonly content: string;
  /** File description */
  readonly description?: string;
}

/**
 * Browser launch configuration arguments.
 */
export type BrowserArgs = readonly string[];

/**
 * Pattern used for filtering non-critical console errors.
 */
export type ErrorFilterPattern = string;