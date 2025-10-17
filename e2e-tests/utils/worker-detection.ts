/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Page } from '@playwright/test';

/**
 * Worker information interface.
 */
export interface WorkerInfo {
  readonly detected: boolean;
  readonly bundleSize?: number;
  readonly url?: string;
}

/**
 * Performance resource entry interface.
 */
export interface PerformanceResourceEntry {
  readonly name: string;
  readonly transferSize?: number;
}

/**
 * LCS integration detection result.
 */
export interface LCSDetectionResult {
  readonly lcsIntegrationActive: boolean;
  readonly workerDetected: boolean;
  readonly bundleSize?: number;
  readonly hasLCSMessages: boolean;
  readonly hasStubFallback: boolean;
  readonly hasErrorIndicators: boolean;
  readonly summary: string;
}

/**
 * Worker detection service for managing LCS worker detection.
 */
export class WorkerDetectionService {
  private static readonly detectionStore: WeakMap<Page, WorkerInfo> =
    new WeakMap();

  /**
   * Checks if a URL is a worker URL.
   */
  private static isWorkerUrl(url: string): boolean {
    return (
      (url.includes('worker.js') ||
        url.includes('worker.global.js') ||
        url.includes('server-bundle')) &&
      (url.includes('devextensions') ||
        url.includes('static') ||
        url.includes('extension'))
    );
  }

  /**
   * Sets up early response hook to capture worker bundle fetch.
   */
  static setupResponseHook(page: Page): void {
    const initial: WorkerInfo = { detected: false };
    this.detectionStore.set(page, initial);

    page.on('response', async (response) => {
      const url = response.url();
      if (!this.isWorkerUrl(url)) return;

      try {
        const buffer = await response.body();
        const workerInfo: WorkerInfo = {
          detected: true,
          bundleSize: buffer.length,
          url,
        };
        this.detectionStore.set(page, workerInfo);
      } catch (_error) {
        // Ignore size measurement errors
        const workerInfo: WorkerInfo = { detected: true, url };
        this.detectionStore.set(page, workerInfo);
      }
    });
  }

  /**
   * Detects worker from Performance API.
   */
  static async detectFromPerformanceAPI(page: Page): Promise<WorkerInfo> {
    try {
      const perfWorker = await page.evaluate(() => {
        const entries = performance.getEntriesByType(
          'resource',
        ) as PerformanceResourceEntry[];
        const workerEntry = entries.find(
          (e) =>
            (e.name.includes('worker.js') ||
              e.name.includes('worker.global.js') ||
              e.name.includes('server-bundle')) &&
            (e.name.includes('devextensions') ||
              e.name.includes('static') ||
              e.name.includes('extension')),
        );
        return workerEntry
          ? { url: workerEntry.name, size: workerEntry.transferSize || 0 }
          : null;
      });

      if (perfWorker) {
        return {
          detected: true,
          bundleSize: perfWorker.size,
          url: perfWorker.url,
        };
      }

      // Additional check: Look for large extension files
      const extensionWorkers = await page.evaluate(() => {
        const entries = performance.getEntriesByType(
          'resource',
        ) as PerformanceResourceEntry[];
        return entries
          .filter(
            (e) =>
              e.name.includes('extension') &&
              (e.name.includes('.js') || e.name.includes('.mjs')) &&
              (e.transferSize || 0) > 1000000, // Large files are likely worker bundles (>1MB)
          )
          .map((e) => ({ url: e.name, size: e.transferSize || 0 }));
      });

      if (extensionWorkers.length > 0) {
        return {
          detected: true,
          bundleSize: extensionWorkers[0].size,
          url: extensionWorkers[0].url,
        };
      }

      return { detected: false };
    } catch (_error) {
      return { detected: false };
    }
  }

  /**
   * Gets worker detection result for a page.
   */
  static getDetectionResult(page: Page): WorkerInfo {
    return this.detectionStore.get(page) || { detected: false };
  }

  /**
   * Comprehensive worker detection combining multiple strategies.
   */
  static async detectWorker(page: Page): Promise<WorkerInfo> {
    // Check early hook store first
    const early = this.getDetectionResult(page);
    if (early.detected) {
      return early;
    }

    // Fallback to Performance API detection
    return this.detectFromPerformanceAPI(page);
  }
}

/**
 * Detects LCS integration status by analyzing console messages and worker behavior.
 * Consolidates LCS detection logic from multiple test files.
 *
 * @param page - Playwright page instance
 * @returns LCS detection results
 */
export const detectLCSIntegration = async (
  page: Page,
): Promise<LCSDetectionResult> => {
  const consoleMessages: string[] = [];
  const lcsMessages: string[] = [];
  const workerMessages: string[] = [];

  // Enhanced console monitoring for LCS detection
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);

    if (text.includes('LCS') || text.includes('LSP-Compliant-Services')) {
      lcsMessages.push(text);
    }

    if (text.includes('Worker') || text.includes('worker')) {
      workerMessages.push(text);
    }
  });

  // Wait for LCS initialization by checking for worker messages or console indicators
  await page
    .waitForFunction(
      () => {
        const entries = performance.getEntriesByType(
          'resource',
        ) as PerformanceResourceEntry[];
        const messages = entries.some(
          (entry) =>
            (entry.name.includes('worker.js') ||
              entry.name.includes('worker.global.js') ||
              entry.name.includes('server-bundle')) &&
            (entry.name.includes('devextensions') ||
              entry.name.includes('static') ||
              entry.name.includes('extension')),
        );
        return messages || window.console;
      },
      { timeout: 8000 },
    )
    .catch(() => {
      // If function-based wait fails, continue - this is informational
    });

  // Analyze console messages for LCS indicators
  const hasStubFallback = consoleMessages.some(
    (msg) =>
      msg.includes('stub mode') ||
      msg.includes('fallback') ||
      msg.includes('Stub implementation'),
  );

  const hasLCSSuccess = consoleMessages.some(
    (msg) =>
      msg.includes('LCS Adapter') ||
      msg.includes('LCS integration') ||
      msg.includes('✅ Apex Language Server Worker with LCS ready'),
  );

  const hasErrorIndicators = consoleMessages.some(
    (msg) =>
      msg.includes('❌ Failed to start LCS') ||
      msg.includes('🔄 Falling back to stub'),
  );

  // Check for worker detection using the service
  const workerInfo = await WorkerDetectionService.detectWorker(page);
  const workerDetected = workerInfo.detected;
  const bundleSize = workerInfo.bundleSize;

  const lcsIntegrationActive =
    hasLCSSuccess || (!hasStubFallback && !hasErrorIndicators);

  const bundleSizeMB = bundleSize
    ? `${Math.round((bundleSize / 1024 / 1024) * 100) / 100} MB`
    : 'Unknown';

  let summary = '🔍 LCS Integration Analysis:\n';
  summary += `   - LCS Integration: ${lcsIntegrationActive ? '✅ ACTIVE' : '❌ INACTIVE'}\n`;
  summary += `   - Worker Detected: ${workerDetected ? '✅ YES' : '❌ NO'}\n`;
  summary += `   - Bundle Size: ${bundleSizeMB}\n`;
  summary += `   - LCS Messages: ${lcsMessages.length}\n`;
  summary += `   - Stub Fallback: ${hasStubFallback ? '⚠️ YES' : '✅ NO'}\n`;
  summary += `   - Error Indicators: ${hasErrorIndicators ? '❌ YES' : '✅ NO'}`;

  return {
    lcsIntegrationActive,
    workerDetected,
    bundleSize,
    hasLCSMessages: lcsMessages.length > 0,
    hasStubFallback,
    hasErrorIndicators,
    summary,
  };
};

/**
 * Install an early response hook to capture worker bundle fetch before navigation.
 */
export const setupWorkerResponseHook = (page: Page): void => {
  WorkerDetectionService.setupResponseHook(page);
};
