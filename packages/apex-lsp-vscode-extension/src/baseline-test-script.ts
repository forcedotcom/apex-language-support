/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { baselineCollector } from './baseline-measurement';
import { saveBaselineStats } from './language-server';
import { enableBaselineTesting, disableBaselineTesting } from './commands';
import { runSimulatedErrorRestart } from './observability/instrumented-restart';
import { monitoringAlerts } from './observability/monitoring-alerts';

export interface BaselineTestConfig {
  numberOfTests: number;
  delayBetweenTests: number; // milliseconds
  saveAfterEachTest: boolean;
}

export class BaselineTestRunner {
  private isRunning = false;
  private context?: vscode.ExtensionContext;

  /**
   * Runs baseline performance tests
   */
  async runBaselineTests(config: BaselineTestConfig): Promise<void> {
    if (this.isRunning) {
      vscode.window.showWarningMessage('Baseline tests are already running');
      return;
    }

    this.isRunning = true;

    try {
      // Enable baseline testing mode (disables restart cooldown)
      enableBaselineTesting();

      // Check if extension is active
      console.log('[BASELINE TEST] Checking if Apex extension is active...');
      const allCommands = await vscode.commands.getCommands();
      const apexCommands = allCommands.filter((cmd) => cmd.startsWith('apex.'));
      console.log('[BASELINE TEST] Available Apex commands:', apexCommands);

      // Clear previous results
      baselineCollector.clear();

      vscode.window.showInformationMessage(
        `Starting baseline performance tests: ${config.numberOfTests} restart operations`,
      );

      for (let i = 1; i <= config.numberOfTests; i++) {
        console.log(
          `[BASELINE TEST] Running test ${i}/${config.numberOfTests}`,
        );

        try {
          // Execute restart command and wait for completion
          console.log('[BASELINE TEST] Executing restart command...');
          const restartCommandExists = apexCommands.includes(
            'apex-ls-ts.restart.server',
          );
          console.log(
            '[BASELINE TEST] Restart command exists:',
            restartCommandExists,
          );
          await vscode.commands.executeCommand('apex-ls-ts.restart.server');

          // Wait a bit longer for the restart to fully complete and be measured
          console.log('[BASELINE TEST] Waiting for restart to complete...');
          await this.delay(1000); // Extra 1 second for restart to complete

          if (config.saveAfterEachTest) {
            console.log('[BASELINE TEST] Saving intermediate stats...');
            const context = this.getContext();
            if (context) {
              await saveBaselineStats(context);
            }
          }

          // Wait between tests (except for the last one)
          if (i < config.numberOfTests) {
            console.log(
              `[BASELINE TEST] Waiting ${config.delayBetweenTests}ms before next test...`,
            );
            await this.delay(config.delayBetweenTests);
          }
        } catch (error) {
          console.error(`[BASELINE TEST] Test ${i} failed:`, error);
          // Continue with remaining tests
        }
      }

      // Save final results
      const context = this.getContext();
      if (context) {
        await saveBaselineStats(context);
      }

      const stats = baselineCollector.generateStats();
      console.log('[BASELINE TEST] Final stats:', stats);
      vscode.window.showInformationMessage(
        `Baseline tests completed! ${stats.totalSamples} samples, ` +
          `${stats.averageDuration}ms average, ${stats.successRate}% success rate`,
      );
    } finally {
      // Disable baseline testing mode (re-enable cooldown)
      disableBaselineTesting();
      this.isRunning = false;
    }
  }

  /**
   * Creates a delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sets the extension context for saving stats
   */
  setContext(context: vscode.ExtensionContext): void {
    this.context = context;
  }

  /**
   * Gets the extension context
   */
  private getContext(): vscode.ExtensionContext | undefined {
    return this.context;
  }

  /**
   * Checks if tests are currently running
   */
  isTestRunning(): boolean {
    return this.isRunning;
  }
}

// Global test runner instance
export const baselineTestRunner = new BaselineTestRunner();

/**
 * Register baseline testing commands
 */
export const registerBaselineTestCommands = (
  context: vscode.ExtensionContext,
): void => {
  // Set context in test runner
  baselineTestRunner.setContext(context);

  // Quick test command (5 restarts)
  const quickTestCommand = vscode.commands.registerCommand(
    'apex.baseline.quickTest',
    async () => {
      await baselineTestRunner.runBaselineTests({
        numberOfTests: 5,
        delayBetweenTests: 2000, // 2 seconds between tests
        saveAfterEachTest: false,
      });
      await saveBaselineStats(context);
    },
  );

  // Full test command (15 restarts)
  const fullTestCommand = vscode.commands.registerCommand(
    'apex.baseline.fullTest',
    async () => {
      await baselineTestRunner.runBaselineTests({
        numberOfTests: 15,
        delayBetweenTests: 3000, // 3 seconds between tests
        saveAfterEachTest: false,
      });
      await saveBaselineStats(context);
    },
  );

  // Save stats command
  const saveStatsCommand = vscode.commands.registerCommand(
    'apex.baseline.saveStats',
    async () => {
      await saveBaselineStats(context);
      vscode.window.showInformationMessage(
        'Baseline stats saved to baselineStats.json',
      );
    },
  );

  // Clear stats command
  const clearStatsCommand = vscode.commands.registerCommand(
    'apex.baseline.clearStats',
    () => {
      baselineCollector.clear();
      vscode.window.showInformationMessage('Baseline stats cleared');
    },
  );

  // Effect.ts observability toggle commands
  const enableEffectCommand = vscode.commands.registerCommand(
    'apex.observability.enableEffect',
    async () => {
      const config = vscode.workspace.getConfiguration('apex-ls-ts');
      await config.update(
        'observability.useEffect',
        true,
        vscode.ConfigurationTarget.Workspace,
      );
      vscode.window.showInformationMessage(
        'Effect.ts observability enabled! Restart commands will now use Effect.ts instrumentation.',
      );
    },
  );

  const disableEffectCommand = vscode.commands.registerCommand(
    'apex.observability.disableEffect',
    async () => {
      const config = vscode.workspace.getConfiguration('apex-ls-ts');
      await config.update(
        'observability.useEffect',
        false,
        vscode.ConfigurationTarget.Workspace,
      );
      vscode.window.showInformationMessage(
        'Effect.ts observability disabled! Restart commands will use baseline measurement.',
      );
    },
  );

  // Error simulation command
  const simulateErrorCommand = vscode.commands.registerCommand(
    'apex.observability.simulateError',
    async () => {
      // Ensure Effect.ts observability is enabled
      const config = vscode.workspace.getConfiguration('apex-ls-ts');
      const isEffectEnabled = config.get<boolean>(
        'observability.useEffect',
        false,
      );

      if (!isEffectEnabled) {
        const enableResult = await vscode.window.showWarningMessage(
          'Effect.ts observability must be enabled to demonstrate error handling. Enable it now?',
          'Enable & Run',
          'Cancel',
        );

        if (enableResult === 'Enable & Run') {
          await config.update(
            'observability.useEffect',
            true,
            vscode.ConfigurationTarget.Workspace,
          );
        } else {
          return;
        }
      }

      try {
        vscode.window.showInformationMessage(
          'Running error simulation to demonstrate Effect.ts error handling...',
        );

        // Run the simulated error restart
        await runSimulatedErrorRestart(context, async () => {
          // Dummy restart handler for simulation
          console.log('[ERROR SIMULATION] Simulated restart handler called');
        });

        // This shouldn't execute due to the error
        vscode.window.showInformationMessage(
          'Unexpected: Error simulation completed successfully',
        );
      } catch (error) {
        // This is expected - show the error handling worked
        vscode.window.showErrorMessage(
          `Error handling demonstration complete! Check telemetry files for error traces. Error: ${error instanceof Error ? error.message : String(error)}`,
        );

        console.log('[ERROR SIMULATION] Demonstrated error handling:', error);
      }
    },
  );

  // Monitoring alerts command
  const checkAlertsCommand = vscode.commands.registerCommand(
    'apex.observability.checkAlerts',
    async () => {
      try {
        vscode.window.showInformationMessage(
          'Running monitoring alert checks...',
        );

        const alerts = await monitoringAlerts.checkAlerts();
        const formattedAlerts = monitoringAlerts.formatAlerts(alerts);

        if (alerts.length === 0) {
          vscode.window.showInformationMessage(
            '✅ No alerts triggered - all systems normal',
          );
        } else {
          // Save alerts to file
          await monitoringAlerts.saveAlerts(alerts);

          // Show alert summary
          const criticalCount = alerts.filter(
            (a) => a.severity === 'critical',
          ).length;
          const warningCount = alerts.filter(
            (a) => a.severity === 'warning',
          ).length;
          const infoCount = alerts.filter((a) => a.severity === 'info').length;

          let alertSummary = `🚨 ${alerts.length} alerts triggered: `;
          if (criticalCount > 0) alertSummary += `${criticalCount} critical `;
          if (warningCount > 0) alertSummary += `${warningCount} warning `;
          if (infoCount > 0) alertSummary += `${infoCount} info`;

          if (criticalCount > 0) {
            vscode.window.showErrorMessage(alertSummary);
          } else if (warningCount > 0) {
            vscode.window.showWarningMessage(alertSummary);
          } else {
            vscode.window.showInformationMessage(alertSummary);
          }

          // Show detailed alerts in output channel
          console.log('[MONITORING ALERTS]');
          console.log('==================');
          console.log(formattedAlerts);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to check alerts: ${error}`);
        console.error('[MONITORING] Alert check failed:', error);
      }
    },
  );

  context.subscriptions.push(
    quickTestCommand,
    fullTestCommand,
    saveStatsCommand,
    clearStatsCommand,
    enableEffectCommand,
    disableEffectCommand,
    simulateErrorCommand,
    checkAlertsCommand,
  );
};
