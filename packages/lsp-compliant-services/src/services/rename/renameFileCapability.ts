/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Client capability negotiation for renameType (W-23631139).
 *
 * Renaming a top-level type must also rename its `.cls` and `.cls-meta.xml`
 * files. That needs `RenameFile` resource operations, which are only legal when
 * the client advertised BOTH `workspace.workspaceEdit.documentChanges` (the
 * versioned `documentChanges` WorkspaceEdit shape that carries them) AND
 * `resourceOperations` containing `'rename'`. Earlier rename kinds use the plain
 * `changes` map and need neither.
 */

import type { ClientCapabilities } from 'vscode-languageserver-protocol';

/**
 * The slice of `workspace.workspaceEdit` client capabilities the worker needs.
 * Small and structured-clone friendly so it can cross the worker wire.
 */
export type WorkspaceEditCapabilities = {
  documentChanges?: boolean;
  resourceOperations?: readonly string[];
};

/**
 * Narrow full client capabilities to {@link WorkspaceEditCapabilities}.
 * Returns `undefined` when the client never advertised `workspaceEdit`.
 */
export const extractWorkspaceEditCapabilities = (
  capabilities: ClientCapabilities | undefined,
): WorkspaceEditCapabilities | undefined => {
  const edit = capabilities?.workspace?.workspaceEdit;
  if (!edit) return undefined;
  return {
    documentChanges: edit.documentChanges,
    resourceOperations: edit.resourceOperations
      ? [...edit.resourceOperations]
      : undefined,
  };
};

/**
 * Whether the client can apply `RenameFile` operations. Unknown capabilities
 * (undefined) are treated as unsupported: never assume a client can rename files.
 */
export const supportsRenameFile = (
  caps: WorkspaceEditCapabilities | undefined,
): boolean =>
  caps?.documentChanges === true &&
  (caps.resourceOperations?.includes('rename') ?? false);

/**
 * How renameType should shape its edit for this client:
 * - `'with-file-rename'`: emit `documentChanges` including both `RenameFile` ops.
 * - `'text-edits-only'`: rename in-file references only and skip the file
 *   rename (the user renames the file manually); callers should log a warning.
 */
export type TypeRenameStrategy = 'with-file-rename' | 'text-edits-only';

export const selectTypeRenameStrategy = (
  caps: WorkspaceEditCapabilities | undefined,
): TypeRenameStrategy =>
  supportsRenameFile(caps) ? 'with-file-rename' : 'text-edits-only';
