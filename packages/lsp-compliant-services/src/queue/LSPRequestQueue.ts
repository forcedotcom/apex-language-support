/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import type { Priority } from '@salesforce/apex-lsp-shared';

/**
 * LSP request types with their priority levels
 */
export type LSPRequestType =
  | 'hover'
  | 'completion'
  | 'definition'
  | 'references'
  | 'documentSymbol'
  | 'workspaceSymbol'
  | 'diagnostics'
  | 'codeAction'
  | 'signatureHelp'
  | 'rename'
  | 'documentOpen'
  | 'documentSave'
  | 'documentChange'
  | 'documentClose'
  | 'findMissingArtifact';

/**
 * LSP request task interface
 */
export interface LSPRequestTask {
  readonly id: string;
  readonly type: LSPRequestType;
  readonly priority: Priority;
  readonly params: any;
  readonly symbolManager: ISymbolManager;
  readonly timestamp: number;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly maxRetries: number;
  readonly callback?: (result: any) => void;
  readonly errorCallback?: (error: Error) => void;
}

/**
 * LSP request result
 */
export interface LSPRequestResult<T = any> {
  readonly taskId: string;
  readonly type: LSPRequestType;
  readonly result: T;
  readonly processingTime: number;
  readonly timestamp: number;
}

/**
 * Queue statistics
 */
export interface LSPQueueStats {
  readonly immediateQueueSize: number;
  readonly highPriorityQueueSize: number;
  readonly normalPriorityQueueSize: number;
  readonly lowPriorityQueueSize: number;
  readonly totalProcessed: number;
  readonly totalFailed: number;
  readonly averageProcessingTime: number;
  readonly activeWorkers: number;
}
