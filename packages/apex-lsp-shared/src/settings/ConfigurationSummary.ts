/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexLanguageServerSettings } from '../server/ApexLanguageServerSettings';
import type { ExtendedServerCapabilities } from '../capabilities/ApexLanguageServerCapabilities';

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

  // Environment
  const env = settings.apex.environment;
  summary.push(
    `  Platform: ${env.runtimePlatform} | Server Mode: ${serverMode}`,
  );
  const logLevel = settings.apex.logLevel || 'error';
  const workerLogLevel = settings.apex.worker?.logLevel || 'error';
  summary.push(
    `  Log Level: ${logLevel} | Worker Log Level: ${workerLogLevel}`,
  );
  if (env.profilingMode && env.profilingMode !== 'none') {
    summary.push(`  Profiling: ${env.profilingMode} (${env.profilingType})`);
  }
  if (env.jsHeapSizeGB !== undefined) {
    summary.push(`  JS Heap: ${env.jsHeapSizeGB}GB`);
  }
  if (env.vscodeVersion || env.extensionVersion) {
    const vscode = env.vscodeVersion ? `VSCode ${env.vscodeVersion}` : '';
    const ext = env.extensionVersion ? `Extension ${env.extensionVersion}` : '';
    summary.push(`  Versions: ${[vscode, ext].filter(Boolean).join(', ')}`);
  }
  if (env.workspaceFileCount !== undefined || env.apexFileCount !== undefined) {
    const ws =
      env.workspaceFileCount !== undefined
        ? `${env.workspaceFileCount} workspace`
        : '';
    const apex =
      env.apexFileCount !== undefined ? `${env.apexFileCount} Apex` : '';
    summary.push(`  Files: ${[ws, apex].filter(Boolean).join(', ')}`);
  }

  summary.push('  Features:');

  // Comment collection
  const cc = settings.apex.commentCollection;
  const ccStatus = cc.enableCommentCollection ? 'enabled' : 'disabled';
  const ccDetail = cc.associateCommentsWithSymbols
    ? ' (associate with symbols)'
    : '';
  summary.push(`    - Comment Collection: ${ccStatus}${ccDetail}`);

  // Load workspace
  const lw = settings.apex.loadWorkspace;
  if (lw) {
    const lwStatus = lw.enabled ? 'enabled' : 'disabled';
    summary.push(
      `    - Load Workspace: ${lwStatus}, concurrency=${lw.maxConcurrency}`,
    );
  }

  // Symbol graph
  const sg = settings.apex.symbolGraph;
  if (sg !== undefined) {
    const sgStatus = sg.enabled ? 'enabled' : 'disabled';
    const sgNamespaces =
      sg.preloadNamespaces.length > 0
        ? ` [${sg.preloadNamespaces.join(', ')}]`
        : '';
    summary.push(`    - Symbol Graph: ${sgStatus}${sgNamespaces}`);
  }

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

  // Document schemes
  const builtInSchemes = [
    'file',
    'apexlib',
    'vscode-test-web',
    'memfs',
    'reefs',
  ];
  const extraSchemes =
    settings.apex.environment?.additionalDocumentSchemes?.map(
      (s) => s.scheme,
    ) ?? [];
  const allSchemes =
    extraSchemes.length > 0
      ? [...new Set([...builtInSchemes, ...extraSchemes])]
      : builtInSchemes;
  summary.push(`  Document schemes: ${allSchemes.join(', ')}`);

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

  // Log level changes
  if (previous.apex.logLevel !== current.apex.logLevel) {
    changes.push(
      `  Log Level: ${previous.apex.logLevel} → ${current.apex.logLevel}`,
    );
  }

  if (previous.apex.worker?.logLevel !== current.apex.worker?.logLevel) {
    changes.push(
      `  Worker Log Level: ${previous.apex.worker?.logLevel} → ${current.apex.worker?.logLevel}`,
    );
  }

  // Environment changes
  const prevEnv = previous.apex.environment;
  const currEnv = current.apex.environment;

  if (prevEnv.runtimePlatform !== currEnv.runtimePlatform) {
    changes.push(
      `  Platform: ${prevEnv.runtimePlatform} → ${currEnv.runtimePlatform}`,
    );
  }

  if (prevEnv.serverMode !== currEnv.serverMode) {
    changes.push(
      `  Server Mode: ${prevEnv.serverMode} → ${currEnv.serverMode}`,
    );
  }

  if (prevEnv.profilingMode !== currEnv.profilingMode) {
    changes.push(
      `  Profiling Mode: ${prevEnv.profilingMode} → ${currEnv.profilingMode}`,
    );
  }

  if (prevEnv.profilingType !== currEnv.profilingType) {
    changes.push(
      `  Profiling Type: ${prevEnv.profilingType} → ${currEnv.profilingType}`,
    );
  }

  if (prevEnv.jsHeapSizeGB !== currEnv.jsHeapSizeGB) {
    const fmtHeap = (v: number | undefined) =>
      v !== undefined && v !== null ? `${v}GB` : 'default';
    changes.push(
      `  JS Heap: ${fmtHeap(prevEnv.jsHeapSizeGB)} → ${fmtHeap(currEnv.jsHeapSizeGB)}`,
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

  // Load workspace changes
  const prevLW = previous.apex.loadWorkspace;
  const currLW = current.apex.loadWorkspace;

  if (prevLW && currLW) {
    if (prevLW.enabled !== currLW.enabled) {
      changes.push(
        `  Load Workspace: ${prevLW.enabled ? 'enabled' : 'disabled'} → ${currLW.enabled ? 'enabled' : 'disabled'}`,
      );
    }

    if (prevLW.maxConcurrency !== currLW.maxConcurrency) {
      changes.push(
        `  Load Workspace Concurrency: ${prevLW.maxConcurrency} → ${currLW.maxConcurrency}`,
      );
    }
  }

  // Symbol graph changes
  const prevSG = previous.apex.symbolGraph;
  const currSG = current.apex.symbolGraph;

  if (prevSG?.enabled !== currSG?.enabled) {
    changes.push(
      `  Symbol Graph: ${prevSG?.enabled ? 'enabled' : 'disabled'} → ${currSG?.enabled ? 'enabled' : 'disabled'}`,
    );
  }

  if (
    prevSG &&
    currSG &&
    JSON.stringify(prevSG.preloadNamespaces) !==
      JSON.stringify(currSG.preloadNamespaces)
  ) {
    changes.push(
      `  Symbol Graph Namespaces: [${prevSG.preloadNamespaces.join(', ')}] → [${currSG.preloadNamespaces.join(', ')}]`,
    );
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
  const prevQP = previous.apex.queueProcessing?.maxConcurrency;
  const currQP = current.apex.queueProcessing?.maxConcurrency;

  if (prevQP && currQP && prevQP.CRITICAL !== currQP.CRITICAL) {
    changes.push(
      `  Queue CRITICAL Concurrency: ${prevQP.CRITICAL} → ${currQP.CRITICAL}`,
    );
  }

  if (prevQP && currQP && prevQP.HIGH !== currQP.HIGH) {
    changes.push(`  Queue HIGH Concurrency: ${prevQP.HIGH} → ${currQP.HIGH}`);
  }

  if (prevQP && currQP && prevQP.NORMAL !== currQP.NORMAL) {
    changes.push(
      `  Queue NORMAL Concurrency: ${prevQP.NORMAL} → ${currQP.NORMAL}`,
    );
  }

  // Missing artifact finder changes
  const prevMAF = previous.apex.findMissingArtifact;
  const currMAF = current.apex.findMissingArtifact;

  if (prevMAF && currMAF && prevMAF.enabled !== currMAF.enabled) {
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
    prevPerf &&
    currPerf &&
    prevPerf.commentCollectionMaxFileSize !==
      currPerf.commentCollectionMaxFileSize
  ) {
    const prevSize = Math.round(prevPerf.commentCollectionMaxFileSize / 1024);
    const currSize = Math.round(currPerf.commentCollectionMaxFileSize / 1024);
    changes.push(`  Max Comment File Size: ${prevSize}KB → ${currSize}KB`);
  }

  if (
    prevPerf &&
    currPerf &&
    prevPerf.documentChangeDebounceMs !== currPerf.documentChangeDebounceMs
  ) {
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

/**
 * Generate a capabilities summary for alwaysLog.
 * Lists the key LSP features that are enabled/disabled for the current mode and platform.
 * @param capabilities The active server capabilities (already filtered for platform)
 * @param additionalSchemes Any extra document schemes beyond the built-in defaults
 */
export function generateCapabilitiesSummary(
  capabilities: ExtendedServerCapabilities,
  additionalSchemes?: string[],
): string {
  const lines: string[] = ['Apex Language Server capabilities'];

  const on = (v: unknown) => v !== undefined && v !== false;
  const flag = (b: boolean) => (b ? 'enabled' : 'disabled');

  lines.push('  Language features:');
  lines.push(
    `    - Completion:        ${flag(on(capabilities.completionProvider))}`,
  );
  lines.push(
    `    - Hover:             ${flag(on(capabilities.hoverProvider))}`,
  );
  lines.push(
    `    - Definition:        ${flag(on(capabilities.definitionProvider))}`,
  );
  lines.push(
    `    - Implementation:    ${flag(on(capabilities.implementationProvider))}`,
  );
  lines.push(
    `    - Document Symbols:  ${flag(on(capabilities.documentSymbolProvider))}`,
  );
  lines.push(
    `    - Folding Ranges:    ${flag(on(capabilities.foldingRangeProvider))}`,
  );
  lines.push(
    `    - Code Lens:         ${flag(on(capabilities.codeLensProvider))}`,
  );

  const pushDiag = on(
    (capabilities as { publishDiagnostics?: boolean }).publishDiagnostics,
  );
  const pullDiag = on(capabilities.diagnosticProvider);
  const diagMode =
    pushDiag && pullDiag
      ? 'push+pull'
      : pushDiag
        ? 'push'
        : pullDiag
          ? 'pull'
          : null;
  lines.push(
    `    - Diagnostics:       ${diagMode ? `enabled (${diagMode})` : 'disabled'}`,
  );

  if (on(capabilities.experimental?.profilingProvider)) {
    lines.push('    - Profiling:         enabled');
  }

  if (on(capabilities.experimental?.findMissingArtifactProvider)) {
    lines.push('    - Missing Artifact:  enabled');
  }

  const builtInSchemes = [
    'file',
    'apexlib',
    'vscode-test-web',
    'memfs',
    'reefs',
  ];
  const allSchemes =
    additionalSchemes && additionalSchemes.length > 0
      ? [...new Set([...builtInSchemes, ...additionalSchemes])]
      : builtInSchemes;
  lines.push(`  Document schemes: ${allSchemes.join(', ')}`);

  return lines.join('\n');
}
