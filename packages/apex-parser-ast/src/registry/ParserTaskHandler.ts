/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Priority } from '@salesforce/apex-lsp-shared';
import { ApexSymbolManager } from '../symbols/ApexSymbolManager';
import { ApexSymbolGraph } from '../symbols/ApexSymbolGraph';
import { ParserTaskType } from './ParserTaskType';

/**
 * Context for parser task processing
 */
export interface ParserTaskContext {
  symbolManager: ApexSymbolManager;
  symbolGraph?: ApexSymbolGraph;
}

/**
 * Generic parser task handler interface
 */
export interface ParserTaskHandler<T = any, R = any> {
  readonly taskType: ParserTaskType;
  readonly priority: Priority;
  readonly timeout: number;
  readonly maxRetries: number;
  process(params: T, context: ParserTaskContext): Promise<R>;
}
