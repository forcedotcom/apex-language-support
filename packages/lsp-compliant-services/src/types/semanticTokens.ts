/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Position } from 'vscode-languageserver-protocol';
import type {
  SemanticTokenModifier,
  SemanticTokenType,
} from '../utils/semanticTokenLegend';

/** A parser-owned, already-classified single-line LSP span. */
export interface SemanticTokenSpan {
  readonly start: Position;
  readonly end: Position;
  readonly tokenType: SemanticTokenType;
  readonly tokenModifiers: readonly SemanticTokenModifier[];
  /** Higher values win collisions after declaration precedence. */
  readonly precedence: number;
}
