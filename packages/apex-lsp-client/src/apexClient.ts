/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  ExceptionBreakpointInfo,
  LineBreakpointInfo,
} from '@salesforce/apex-lsp-shared';
import type { ApexServerFeatureState } from './serverFeatureState';

/** Public Apex language-server client contract for extension consumers. */
export type ApexClient = {
  getLineBreakpointInfo(uri: string): Promise<LineBreakpointInfo[]>;
  getExceptionBreakpointInfo(uri: string): Promise<ExceptionBreakpointInfo[]>;
  /** Returns false/false for feature names the server did not define. */
  getFeatureState(feature: string): ApexServerFeatureState;
};
