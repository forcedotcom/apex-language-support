/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import type {
  SymbolTable,
  CompilationResult,
} from '@salesforce/apex-lsp-parser-ast';
import { SymbolKind, ApexSymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';

/**
 * Memory usage snapshot with timestamp
 */
export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  rssMB: number;
}

/**
 * Compilation metrics for a single file
 */
export interface FileCompilationMetrics {
  fileName: string;
  compileTimeMs: number;
  symbolCount: number;
  referenceCount: number;
  scopeCount: number;
  errorCount: number;
  warningCount: number;
  fileSizeBytes: number;
}

/**
 * Overall performance metrics
 */
export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  totalTimeMs: number;
  initialMemory: MemorySnapshot;
  peakMemory: MemorySnapshot;
  finalMemory: MemorySnapshot;
  fileMetrics: FileCompilationMetrics[];
  totalFiles: number;
  totalSymbols: number;
  totalReferences: number;
  totalScopes: number;
  totalErrors: number;
  totalWarnings: number;
  averageTimePerFileMs: number;
  memoryGrowthMB: number;
  peakMemoryMB: number;
}

/**
 * Measure current memory usage
 */
export function measureMemoryUsage(): MemorySnapshot {
  const mem = process.memoryUsage();
  return {
    timestamp: Date.now(),
    heapUsed: mem.heapUsed,
    heapTotal: mem.heapTotal,
    external: mem.external,
    rss: mem.rss,
    heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    externalMB: Math.round((mem.external / 1024 / 1024) * 100) / 100,
    rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
  };
}

/**
 * Track compilation metrics for a file
 */
export function trackCompilationMetrics(
  fileName: string,
  compileTimeMs: number,
  result: CompilationResult<SymbolTable> | undefined,
  fileSizeBytes: number,
): FileCompilationMetrics {
  if (!result) {
    return {
      fileName,
      compileTimeMs,
      symbolCount: 0,
      referenceCount: 0,
      scopeCount: 0,
      errorCount: 0,
      warningCount: 0,
      fileSizeBytes,
    };
  }

  const symbolTable = result.result;
  const symbolCount = symbolTable ? symbolTable.getAllSymbols().length : 0;
  const referenceCount = symbolTable
    ? symbolTable.getAllReferences().length
    : 0;
  const scopeCount = symbolTable
    ? symbolTable.getAllSymbols().filter((s) => s.kind === SymbolKind.Block)
        .length
    : 0;

  return {
    fileName,
    compileTimeMs,
    symbolCount,
    referenceCount,
    scopeCount,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    fileSizeBytes,
  };
}

/**
 * Find all Apex files in a directory recursively
 */
export function findApexFiles(
  dir: string,
  maxFiles?: number,
): { filePath: string; relativePath: string }[] {
  const files: { filePath: string; relativePath: string }[] = [];

  function walk(currentDir: string, baseDir: string): void {
    if (maxFiles && files.length >= maxFiles) {
      return;
    }

    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (maxFiles && files.length >= maxFiles) {
          break;
        }

        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (entry.isDirectory()) {
          // Skip node_modules, .git, and other common directories
          if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === '.sfdx' ||
            entry.name === 'dist' ||
            entry.name === 'out'
          ) {
            continue;
          }
          walk(fullPath, baseDir);
        } else if (
          entry.isFile() &&
          (entry.name.endsWith('.cls') || entry.name.endsWith('.trigger'))
        ) {
          files.push({ filePath: fullPath, relativePath });
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.warn(`Cannot read directory ${currentDir}: ${error}`);
    }
  }

  walk(dir, dir);
  return files;
}

/**
 * Check if EDA repository exists
 */
export function checkEDARepositoryExists(edaPath: string): boolean {
  const forceAppPath = path.join(edaPath, 'force-app');
  return fs.existsSync(edaPath) && fs.existsSync(forceAppPath);
}

/**
 * Clone EDA repository to specified path
 */
export function cloneEDARepository(
  targetPath: string,
  repoUrl: string = 'https://github.com/mshanemc/EDA.git',
  shallow: boolean = true,
): void {
  // Create parent directory if it doesn't exist
  const parentDir = path.dirname(targetPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  // Remove existing directory if it exists
  if (fs.existsSync(targetPath)) {
    console.log(`Removing existing directory: ${targetPath}`);
    fs.rmSync(targetPath, { recursive: true, force: true });
  }

  console.log(`Cloning EDA repository to ${targetPath}...`);
  try {
    const cloneArgs = shallow
      ? ['clone', '--depth', '1', '--single-branch', repoUrl, targetPath]
      : ['clone', repoUrl, targetPath];

    const result = spawnSync('git', cloneArgs, {
      stdio: 'inherit',
      cwd: parentDir,
      shell: false, // Use spawnSync without shell to avoid deprecation warning
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(`git clone failed with exit code ${result.status}`);
    }

    console.log('Repository cloned successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to clone EDA repository: ${errorMessage}`);
  }
}

/**
 * Ensure EDA repository exists, cloning if necessary
 */
export function ensureEDARepository(
  edaPath: string,
  repoUrl?: string,
  shallow?: boolean,
): void {
  if (!checkEDARepositoryExists(edaPath)) {
    cloneEDARepository(edaPath, repoUrl, shallow);
  } else {
    console.log(`EDA repository already exists at ${edaPath}`);
  }
}

/**
 * Generate performance report
 */
export function generatePerformanceReport(
  metrics: PerformanceMetrics,
  outputJson?: boolean,
): string {
  const report: string[] = [];

  report.push('\n' + '='.repeat(80));
  report.push('EDA WORKSPACE PERFORMANCE REPORT');
  report.push('='.repeat(80));

  // Summary
  report.push('\n## Summary');
  report.push(`Total Files Processed: ${metrics.totalFiles}`);
  report.push(
    `Total Compilation Time: ${metrics.totalTimeMs.toFixed(2)}ms (${(metrics.totalTimeMs / 1000).toFixed(2)}s)`,
  );
  report.push(
    `Average Time per File: ${metrics.averageTimePerFileMs.toFixed(2)}ms`,
  );

  // Memory Summary
  report.push('\n## Memory Usage');
  report.push(
    `Initial Heap: ${metrics.initialMemory.heapUsedMB}MB / ${metrics.initialMemory.heapTotalMB}MB`,
  );
  report.push(
    `Peak Heap: ${metrics.peakMemory.heapUsedMB}MB / ${metrics.peakMemory.heapTotalMB}MB`,
  );
  report.push(
    `Final Heap: ${metrics.finalMemory.heapUsedMB}MB / ${metrics.finalMemory.heapTotalMB}MB`,
  );
  report.push(`Memory Growth: ${metrics.memoryGrowthMB.toFixed(2)}MB`);
  report.push(`Peak RSS: ${metrics.peakMemory.rssMB}MB`);
  report.push(`Peak External: ${metrics.peakMemory.externalMB}MB`);

  // Compilation Metrics
  report.push('\n## Compilation Metrics');
  report.push(`Total Symbols: ${metrics.totalSymbols.toLocaleString()}`);
  report.push(`Total References: ${metrics.totalReferences.toLocaleString()}`);
  report.push(`Total Scopes: ${metrics.totalScopes.toLocaleString()}`);
  report.push(`Total Errors: ${metrics.totalErrors}`);
  report.push(`Total Warnings: ${metrics.totalWarnings}`);
  report.push(
    `Average Symbols per File: ${(metrics.totalSymbols / metrics.totalFiles).toFixed(1)}`,
  );
  report.push(
    `Average References per File: ${(metrics.totalReferences / metrics.totalFiles).toFixed(1)}`,
  );

  // Top 10 Slowest Files
  if (metrics.fileMetrics.length > 0) {
    const sortedFiles = [...metrics.fileMetrics].sort(
      (a, b) => b.compileTimeMs - a.compileTimeMs,
    );
    const top10 = sortedFiles.slice(0, 10);

    report.push('\n## Top 10 Slowest Files');
    top10.forEach((file, index) => {
      report.push(
        `${index + 1}. ${file.fileName} - ${file.compileTimeMs.toFixed(2)}ms ` +
          `(${file.symbolCount} symbols, ${file.referenceCount} references)`,
      );
    });
  }

  // Memory Timeline
  report.push('\n## Memory Timeline');
  report.push(`Start: ${metrics.initialMemory.heapUsedMB}MB`);
  report.push(
    `Peak: ${metrics.peakMemory.heapUsedMB}MB (at ${new Date(metrics.peakMemory.timestamp).toISOString()})`,
  );
  report.push(`End: ${metrics.finalMemory.heapUsedMB}MB`);

  report.push('\n' + '='.repeat(80));

  const reportText = report.join('\n');

  // Optionally write JSON report
  if (outputJson) {
    const jsonPath = path.join(
      __dirname,
      '../../test-artifacts/eda-performance-report.json',
    );
    const jsonDir = path.dirname(jsonPath);
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true });
    }
    fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));
    report.push(`\nJSON report written to: ${jsonPath}`);
  }

  return reportText;
}

/**
 * Calculate memory growth between two snapshots
 */
export function calculateMemoryGrowth(
  initial: MemorySnapshot,
  final: MemorySnapshot,
): number {
  return (
    Math.round(((final.heapUsed - initial.heapUsed) / 1024 / 1024) * 100) / 100
  );
}

/**
 * Find peak memory from multiple snapshots
 */
export function findPeakMemory(snapshots: MemorySnapshot[]): MemorySnapshot {
  return snapshots.reduce((peak, current) =>
    current.heapUsed > peak.heapUsed ? current : peak,
  );
}

/**
 * Metrics for measuring cost of adding SymbolTables to ApexSymbolManager
 */
export interface ManagerAdditionMetrics {
  totalTimeMs: number;
  timePerSymbolTableMs: number;
  timePerSymbolMs: number;
  timePerFileMs: number;
  memoryGrowthMB: number;
  memoryPerSymbolMB: number;
  memoryPerFileMB: number;
  symbolsAdded: number;
  filesProcessed: number;
  peakMemoryMB: number;
  initialMemory: MemorySnapshot;
  finalMemory: MemorySnapshot;
  peakMemory: MemorySnapshot;
}

/**
 * Measure CPU and memory cost of adding SymbolTables to ApexSymbolManager
 */
export async function measureManagerAdditionCost(
  symbolTables: Map<string, SymbolTable>,
  fileUris: string[],
): Promise<ManagerAdditionMetrics> {
  const initialMemory = measureMemoryUsage();
  const memorySnapshots: MemorySnapshot[] = [initialMemory];
  let peakMemory = initialMemory;

  // Create fresh ApexSymbolManager instance
  const manager = new ApexSymbolManager();

  const startTime = Date.now();

  // Add each SymbolTable to the manager
  for (let i = 0; i < fileUris.length; i++) {
    const fileUri = fileUris[i];
    const symbolTable = symbolTables.get(fileUri);

    if (!symbolTable) {
      continue;
    }

    // Add SymbolTable to manager
    await Effect.runPromise(manager.addSymbolTable(symbolTable, fileUri));

    // Take periodic memory snapshots (every 10 files or at end)
    if ((i + 1) % 10 === 0 || i === fileUris.length - 1) {
      const snapshot = measureMemoryUsage();
      memorySnapshots.push(snapshot);
      if (snapshot.heapUsed > peakMemory.heapUsed) {
        peakMemory = snapshot;
      }
    }
  }

  const endTime = Date.now();
  const finalMemory = measureMemoryUsage();
  memorySnapshots.push(finalMemory);

  // Update peak memory if final is higher
  if (finalMemory.heapUsed > peakMemory.heapUsed) {
    peakMemory = finalMemory;
  }

  // Calculate total symbols added
  let totalSymbols = 0;
  for (const symbolTable of symbolTables.values()) {
    totalSymbols += symbolTable.getAllSymbols().length;
  }

  const totalTimeMs = endTime - startTime;
  const filesProcessed = fileUris.length;
  const memoryGrowthMB = calculateMemoryGrowth(initialMemory, finalMemory);

  return {
    totalTimeMs,
    timePerSymbolTableMs: filesProcessed > 0 ? totalTimeMs / filesProcessed : 0,
    timePerSymbolMs: totalSymbols > 0 ? totalTimeMs / totalSymbols : 0,
    timePerFileMs: filesProcessed > 0 ? totalTimeMs / filesProcessed : 0,
    memoryGrowthMB,
    memoryPerSymbolMB: totalSymbols > 0 ? memoryGrowthMB / totalSymbols : 0,
    memoryPerFileMB: filesProcessed > 0 ? memoryGrowthMB / filesProcessed : 0,
    symbolsAdded: totalSymbols,
    filesProcessed,
    peakMemoryMB: peakMemory.heapUsedMB,
    initialMemory,
    finalMemory,
    peakMemory,
  };
}
