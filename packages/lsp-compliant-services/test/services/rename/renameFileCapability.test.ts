/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  extractWorkspaceEditCapabilities,
  selectTypeRenameStrategy,
  supportsRenameFile,
} from '../../../src/services/rename/renameFileCapability';

describe('renameFileCapability (W-23631139)', () => {
  it('supports RenameFile only with documentChanges AND rename resourceOperation', () => {
    expect(
      supportsRenameFile({
        documentChanges: true,
        resourceOperations: ['create', 'rename'],
      }),
    ).toBe(true);
    expect(
      supportsRenameFile({ documentChanges: true, resourceOperations: [] }),
    ).toBe(false);
    expect(
      supportsRenameFile({
        documentChanges: false,
        resourceOperations: ['rename'],
      }),
    ).toBe(false);
    expect(supportsRenameFile({ resourceOperations: ['rename'] })).toBe(false);
    expect(supportsRenameFile(undefined)).toBe(false);
  });

  it('selects text-edits-only when the client lacks support', () => {
    expect(selectTypeRenameStrategy(undefined)).toBe('text-edits-only');
    expect(
      selectTypeRenameStrategy({
        documentChanges: true,
        resourceOperations: ['delete'],
      }),
    ).toBe('text-edits-only');
    expect(
      selectTypeRenameStrategy({
        documentChanges: true,
        resourceOperations: ['rename'],
      }),
    ).toBe('with-file-rename');
  });

  it('extracts the workspaceEdit slice from client capabilities', () => {
    expect(extractWorkspaceEditCapabilities(undefined)).toBeUndefined();
    expect(extractWorkspaceEditCapabilities({ workspace: {} })).toBeUndefined();
    expect(
      extractWorkspaceEditCapabilities({
        workspace: {
          workspaceEdit: {
            documentChanges: true,
            resourceOperations: ['rename'],
          },
        },
      }),
    ).toEqual({ documentChanges: true, resourceOperations: ['rename'] });
  });
});
