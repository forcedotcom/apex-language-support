/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Wire-request shapes for the LSP dispatch handlers. Pure structural types (plus
 * one trivial projection helper), so this is a leaf module every layer may
 * import without creating a cycle.
 *
 * Imported with an explicit .ts extension for tsx-in-worker resolution (see
 * runtimeContext.ts for the rationale).
 */

import type { PositionReq } from '@salesforce/apex-lsp-compliant-services';

export type {
  PositionReq,
  RefsReq,
  RenameReq,
} from '@salesforce/apex-lsp-compliant-services';

export type DocOnlyReq = {
  textDocument: { uri: string };
  content?: string;
};
export type DocWithContentReq = {
  textDocument: { uri: string };
  content?: string;
};
export type CompletionReq = PositionReq & {
  context?: { triggerKind: number; triggerCharacter?: string };
};

export function completionResultForWire(result: {
  readonly items: unknown[];
  readonly isIncomplete: boolean;
}): { readonly items: unknown[]; readonly isIncomplete: boolean } {
  return {
    items: result.items,
    isIncomplete: result.isIncomplete,
  };
}
export type SignatureHelpReq = PositionReq & { context?: unknown };
export type CodeActionReq = {
  textDocument: { uri: string };
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  content?: string;
  context?: unknown;
};
