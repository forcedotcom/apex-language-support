/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexLanguageServerSettings } from '../server/ApexLanguageServerSettings';

/**
 * Generate startup configuration summary for alwaysLog
 * Displays key configuration settings that are always visible regardless of log level
 */
export function generateStartupSummary(
  settings: ApexLanguageServerSettings,
  serverMode: string,
): string {
  const summary: string[] = [];

  summary.push('Apex Language Server initialized');
  summary.push(`  Server Mode: ${serverMode}`);
  summary.push(`  Log Level: ${settings.apex.logLevel || 'info'}`);
  summary.push('  Features:');

  // Comment collection
  const cc = settings.apex.commentCollection;
  const ccStatus = cc.enableCommentCollection ? 'enabled' : 'disabled';
  const ccDetail = cc.associateCommentsWithSymbols
    ? ' (associate with symbols)'
    : '';
  summary.push(`    - Comment Collection: ${ccStatus}${ccDetail}`);

  // Deferred references
  const dr = settings.apex.deferredReferenceProcessing;
  if (dr) {
    summary.push(
      `    - Deferred References: batch=${dr.deferredBatchSize}, retries=${dr.maxRetryAttempts}`,
    );
  }

  // Queue concurrency (show top 3 priority levels)
  const qp = settings.apex.queueProcessing.maxConcurrency;
  summary.push(
    `    - Queue Concurrency: CRITICAL=${qp.CRITICAL}, HIGH=${qp.HIGH}, NORMAL=${qp.NORMAL}`,
  );

  // Missing artifact finder
  const maf = settings.apex.findMissingArtifact;
  const mafStatus = maf.enabled ? 'enabled' : 'disabled';
  summary.push(`    - Missing Artifact Finder: ${mafStatus}`);

  // Performance
  summary.push('  Performance:');
  const perf = settings.apex.performance;
  const fileSize = Math.round(perf.commentCollectionMaxFileSize / 1024);
  summary.push(`    - Max Comment File Size: ${fileSize}KB`);
  summary.push(
    `    - Document Change Debounce: ${perf.documentChangeDebounceMs}ms`,
  );

  return summary.join('\n');
}

/**
 * Generate configuration change summary for alwaysLog
 * Only shows what actually changed (before → after format)
 */
export function generateChangeSummary(
  previous: ApexLanguageServerSettings,
  current: ApexLanguageServerSettings,
): string {
  const changes: string[] = [];

  changes.push('Configuration updated');

  // Log level change
  if (previous.apex.logLevel !== current.apex.logLevel) {
    changes.push(
      `  Log Level: ${previous.apex.logLevel} → ${current.apex.logLevel}`,
    );
  }

  // Comment collection changes
  const prevCC = previous.apex.commentCollection;
  const currCC = current.apex.commentCollection;

  if (prevCC.enableCommentCollection !== currCC.enableCommentCollection) {
    const prevCCEnabled = prevCC.enableCommentCollection
      ? 'enabled'
      : 'disabled';
    const currCCEnabled = currCC.enableCommentCollection
      ? 'enabled'
      : 'disabled';
    changes.push(`  Comment Collection: ${prevCCEnabled} → ${currCCEnabled}`);
  }

  if (
    prevCC.associateCommentsWithSymbols !== currCC.associateCommentsWithSymbols
  ) {
    const prevCCAssoc = prevCC.associateCommentsWithSymbols ? 'on' : 'off';
    const currCCAssoc = currCC.associateCommentsWithSymbols ? 'on' : 'off';
    changes.push(`  Associate Comments: ${prevCCAssoc} → ${currCCAssoc}`);
  }

  // Deferred reference processing changes
  const prevDR = previous.apex.deferredReferenceProcessing;
  const currDR = current.apex.deferredReferenceProcessing;

  if (prevDR && currDR) {
    if (prevDR.deferredBatchSize !== currDR.deferredBatchSize) {
      changes.push(
        `  Deferred Batch Size: ${prevDR.deferredBatchSize} → ${currDR.deferredBatchSize}`,
      );
    }

    if (prevDR.maxRetryAttempts !== currDR.maxRetryAttempts) {
      changes.push(
        `  Max Retry Attempts: ${prevDR.maxRetryAttempts} → ${currDR.maxRetryAttempts}`,
      );
    }
  }

  // Queue processing changes
  const prevQP = previous.apex.queueProcessing.maxConcurrency;
  const currQP = current.apex.queueProcessing.maxConcurrency;

  if (prevQP.CRITICAL !== currQP.CRITICAL) {
    changes.push(
      `  Queue CRITICAL Concurrency: ${prevQP.CRITICAL} → ${currQP.CRITICAL}`,
    );
  }

  if (prevQP.HIGH !== currQP.HIGH) {
    changes.push(`  Queue HIGH Concurrency: ${prevQP.HIGH} → ${currQP.HIGH}`);
  }

  if (prevQP.NORMAL !== currQP.NORMAL) {
    changes.push(
      `  Queue NORMAL Concurrency: ${prevQP.NORMAL} → ${currQP.NORMAL}`,
    );
  }

  // Missing artifact finder changes
  const prevMAF = previous.apex.findMissingArtifact;
  const currMAF = current.apex.findMissingArtifact;

  if (prevMAF.enabled !== currMAF.enabled) {
    const prevMAFEnabled = prevMAF.enabled ? 'enabled' : 'disabled';
    const currMAFEnabled = currMAF.enabled ? 'enabled' : 'disabled';
    changes.push(
      `  Missing Artifact Finder: ${prevMAFEnabled} → ${currMAFEnabled}`,
    );
  }

  // Performance changes
  const prevPerf = previous.apex.performance;
  const currPerf = current.apex.performance;

  if (
    prevPerf.commentCollectionMaxFileSize !==
    currPerf.commentCollectionMaxFileSize
  ) {
    const prevSize = Math.round(prevPerf.commentCollectionMaxFileSize / 1024);
    const currSize = Math.round(currPerf.commentCollectionMaxFileSize / 1024);
    changes.push(`  Max Comment File Size: ${prevSize}KB → ${currSize}KB`);
  }

  if (prevPerf.documentChangeDebounceMs !== currPerf.documentChangeDebounceMs) {
    changes.push(
      `  Document Change Debounce: ${prevPerf.documentChangeDebounceMs}ms → ${currPerf.documentChangeDebounceMs}ms`,
    );
  }

  // If no specific changes detected, show generic message
  if (changes.length === 1) {
    changes.push('  (settings synchronized)');
  }

  return changes.join('\n');
}
