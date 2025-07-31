/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import { TelemetryTrace, TelemetryMetric, TelemetryLog } from './schemas';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Alert definition
 */
export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  timestamp: string;
  metadata: Record<string, unknown>;
}

/**
 * Alert rule configuration
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  check: (
    traces: TelemetryTrace[],
    metrics: TelemetryMetric[],
    logs: TelemetryLog[],
  ) => Alert[];
}

/**
 * Monitoring Alert System
 *
 * Demonstrates how to build monitoring alerts from Effect.ts telemetry data
 */
export class MonitoringAlerts {
  private workspaceRoot: string;
  private telemetryDir: string;

  constructor() {
    this.workspaceRoot =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
    this.telemetryDir = path.join(this.workspaceRoot, '.telemetry');
  }

  /**
   * Load telemetry data from files
   */
  private async loadTelemetryData(): Promise<{
    traces: TelemetryTrace[];
    metrics: TelemetryMetric[];
    logs: TelemetryLog[];
  }> {
    try {
      const [tracesData, metricsData, logsData] = await Promise.all([
        this.loadJsonLines<TelemetryTrace>(
          path.join(this.telemetryDir, 'traces.jsonl'),
        ),
        this.loadJsonLines<TelemetryMetric>(
          path.join(this.telemetryDir, 'metrics.jsonl'),
        ),
        this.loadJsonLines<TelemetryLog>(
          path.join(this.telemetryDir, 'logs.jsonl'),
        ),
      ]);

      return {
        traces: tracesData,
        metrics: metricsData,
        logs: logsData,
      };
    } catch (error) {
      console.warn('[MONITORING] Could not load telemetry data:', error);
      return { traces: [], metrics: [], logs: [] };
    }
  }

  /**
   * Load JSON Lines file
   */
  private async loadJsonLines<T>(filePath: string): Promise<T[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as T);
    } catch (error) {
      console.warn(`[MONITORING] Could not load ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Pre-defined alert rules
   */
  private getAlertRules(): AlertRule[] {
    return [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Detect when error rate exceeds 20%',
        check: (traces, metrics, logs) => {
          const alerts: Alert[] = [];

          // Count total vs error operations
          const totalOps = traces.filter(
            (t) => t.name === 'restart-language-server',
          ).length;
          const errorOps = traces.filter(
            (t) => t.name === 'restart-language-server' && t.status === 'ERROR',
          ).length;

          if (totalOps > 0) {
            const errorRate = (errorOps / totalOps) * 100;

            if (errorRate > 20) {
              alerts.push({
                id: 'error-rate-high',
                title: 'High Error Rate Detected',
                message: `Language server restart error rate is ${errorRate.toFixed(1)}% (${errorOps}/${totalOps} operations failed)`,
                severity: errorRate > 50 ? 'critical' : 'warning',
                timestamp: new Date().toISOString(),
                metadata: { errorRate, totalOps, errorOps },
              });
            }
          }

          return alerts;
        },
      },

      {
        id: 'slow-operations',
        name: 'Slow Operations',
        description: 'Detect operations taking longer than 20ms',
        check: (traces, metrics, logs) => {
          const alerts: Alert[] = [];

          const slowTraces = traces.filter(
            (t) =>
              t.name === 'restart-language-server' &&
              t.duration > 20 &&
              t.status === 'OK',
          );

          if (slowTraces.length > 0) {
            const avgDuration =
              slowTraces.reduce((sum, t) => sum + t.duration, 0) /
              slowTraces.length;

            alerts.push({
              id: 'slow-operations',
              title: 'Slow Operations Detected',
              message: `${slowTraces.length} restart operations took longer than 20ms (avg: ${avgDuration.toFixed(2)}ms)`,
              severity: avgDuration > 50 ? 'warning' : 'info',
              timestamp: new Date().toISOString(),
              metadata: {
                slowOperationsCount: slowTraces.length,
                averageDuration: avgDuration,
                threshold: 20,
              },
            });
          }

          return alerts;
        },
      },

      {
        id: 'error-spike',
        name: 'Error Spike',
        description: 'Detect rapid succession of errors',
        check: (traces, metrics, logs) => {
          const alerts: Alert[] = [];

          // Look for errors in the last 5 minutes
          const now = new Date();
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

          const recentErrors = logs.filter(
            (log) =>
              log.level === 'error' && new Date(log.timestamp) > fiveMinutesAgo,
          );

          if (recentErrors.length >= 3) {
            alerts.push({
              id: 'error-spike',
              title: 'Error Spike Alert',
              message: `${recentErrors.length} errors detected in the last 5 minutes`,
              severity: 'critical',
              timestamp: new Date().toISOString(),
              metadata: {
                errorCount: recentErrors.length,
                timeWindow: '5 minutes',
                errors: recentErrors.map((e) => ({
                  message: e.message,
                  timestamp: e.timestamp,
                })),
              },
            });
          }

          return alerts;
        },
      },

      {
        id: 'missing-telemetry',
        name: 'Missing Telemetry',
        description: 'Detect when no telemetry has been generated recently',
        check: (traces, metrics, logs) => {
          const alerts: Alert[] = [];

          if (
            traces.length === 0 &&
            metrics.length === 0 &&
            logs.length === 0
          ) {
            alerts.push({
              id: 'no-telemetry',
              title: 'No Telemetry Data',
              message:
                'No telemetry data found - observability may not be functioning',
              severity: 'warning',
              timestamp: new Date().toISOString(),
              metadata: { reason: 'empty-telemetry-files' },
            });
            return alerts;
          }

          // Check for recent telemetry
          const now = new Date();
          const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

          const recentTraces = traces.filter(
            (t) => new Date(t.startTime) > tenMinutesAgo,
          );

          if (traces.length > 0 && recentTraces.length === 0) {
            alerts.push({
              id: 'stale-telemetry',
              title: 'Stale Telemetry Data',
              message: 'No recent telemetry data found in the last 10 minutes',
              severity: 'info',
              timestamp: new Date().toISOString(),
              metadata: {
                totalTraces: traces.length,
                recentTraces: 0,
                timeWindow: '10 minutes',
              },
            });
          }

          return alerts;
        },
      },
    ];
  }

  /**
   * Run all alert rules and return any triggered alerts
   */
  async checkAlerts(): Promise<Alert[]> {
    console.log('[MONITORING] Running alert checks...');

    const telemetryData = await this.loadTelemetryData();
    const rules = this.getAlertRules();
    const alerts: Alert[] = [];

    for (const rule of rules) {
      try {
        const ruleAlerts = rule.check(
          telemetryData.traces,
          telemetryData.metrics,
          telemetryData.logs,
        );
        alerts.push(...ruleAlerts);

        if (ruleAlerts.length > 0) {
          console.log(
            `[MONITORING] Rule "${rule.name}" triggered ${ruleAlerts.length} alerts`,
          );
        }
      } catch (error) {
        console.error(`[MONITORING] Error in rule "${rule.name}":`, error);
      }
    }

    return alerts;
  }

  /**
   * Format alerts for display
   */
  formatAlerts(alerts: Alert[]): string {
    if (alerts.length === 0) {
      return '✅ No alerts triggered - all systems normal';
    }

    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🚨',
    };

    return alerts
      .map(
        (alert) =>
          `${severityEmoji[alert.severity]} **${alert.title}**\n` +
          `   ${alert.message}\n` +
          `   Time: ${alert.timestamp}\n`,
      )
      .join('\n');
  }

  /**
   * Save alerts to file for external processing
   */
  async saveAlerts(alerts: Alert[]): Promise<void> {
    if (alerts.length === 0) return;

    const alertsFilePath = path.join(this.telemetryDir, 'alerts.jsonl');
    const alertsData =
      alerts.map((alert) => JSON.stringify(alert)).join('\n') + '\n';

    await fs.appendFile(alertsFilePath, alertsData);
    console.log(
      `[MONITORING] Saved ${alerts.length} alerts to ${alertsFilePath}`,
    );
  }
}

/**
 * Global monitoring instance
 */
export const monitoringAlerts = new MonitoringAlerts();
