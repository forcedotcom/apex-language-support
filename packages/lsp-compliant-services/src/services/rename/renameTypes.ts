/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Shared rename result types and guards used by the local, field and method
 * rename units.
 */

import type { WorkspaceEdit } from 'vscode-languageserver-protocol';
import { READONLY_SYNTHETIC_SCHEMES } from '@salesforce/apex-lsp-shared';
import { type ApexSymbol } from '@salesforce/apex-lsp-parser-ast';

/**
 * The rename result is a standard LSP `WorkspaceEdit` (re-exported by
 * `vscode-languageserver`, the protocol type `RenameProcessingService` uses).
 * renameLocal only ever touches one file — a local's declaration and usages are
 * all in the same file — so `changes` has a single key, but the shape
 * generalizes to the cross-file kinds later. Type-only import: erased at
 * compile time, so no worker-bundle weight is added.
 */
export type WorkspaceEditResult = WorkspaceEdit;

/**
 * Error result shape for rename validation failures (W-23631080). The worker
 * returns this when the newName is invalid, and the LCSAdapter handler converts
 * it to an LSP ResponseError.
 */
export type RenameErrorResult = {
  error: {
    code: number;
    message: string;
  };
};

/**
 * Check whether a local can be renamed (W-23631080 guard).
 *
 * For locals (variables/parameters) this is ALWAYS true — a local from a
 * standalone parse of the user's open file is always user-sourced, never stdlib.
 * The guard exists for extension by later rename groups (fields/methods/types),
 * which CAN resolve into the standard library (e.g. `String.valueOf`) and must
 * reject rename attempts on those (check whether the declaration's fileUri falls
 * under `STANDARD_APEX_LIBRARY_URI`).
 *
 * @param declaration The local's declaring symbol.
 * @returns `true` for locals; extension-ready for the stdlib-aware later groups.
 */
export function canBeRenamed(_declaration: ApexSymbol): boolean {
  // For locals, always true. Later groups: check
  // `declaration.location?.uri.startsWith(STANDARD_APEX_LIBRARY_URI)` → false.
  return true;
}

/**
 * A rename target must live in a USER-OWNED (editable) Apex source (W-23631087
 * review). A declaration in a synthetic, READ-ONLY URI — stdlib (`apexlib://`) or
 * generated SObject (`apex-sobject://`) — is not editable and must never be
 * offered for rename or edited via a virtual-resource URI.
 *
 * Rejects the CLOSED set of server-generated read-only schemes
 * (`READONLY_SYNTHETIC_SCHEMES`) rather than allow-listing editable schemes: the
 * editable set is open-ended (the four `MUTABLE_DOCUMENT_SCHEMES` defaults PLUS
 * any `apex.environment.additionalDocumentSchemes` a client configures, which
 * apply to all capabilities by default) and those custom schemes are not synced
 * to the worker. A positive allowlist therefore wrongly declined editable
 * documents on a configured scheme (e.g. `orgtest://`), making rename behave
 * inconsistently by symbol kind vs. renameLocal — the issue this blocklist fixes
 * (W-23631087 re-review). The synthetic schemes are ones the SERVER mints, so a
 * blocklist over that set stays authoritative.
 */
// Resolved on first use, not at module load, so importing this module never
// depends on the shared package's exports being available yet.
let readonlyUriSchemes: ReadonlySet<string> | undefined;
const getReadonlyUriSchemes = (): ReadonlySet<string> =>
  (readonlyUriSchemes ??= new Set(READONLY_SYNTHETIC_SCHEMES));

export const isUserOwnedApexUri = (uri: string | undefined): boolean => {
  if (!uri) return false;
  const colon = uri.indexOf(':');
  if (colon <= 0) return false;
  return !getReadonlyUriSchemes().has(uri.slice(0, colon).toLowerCase());
};
