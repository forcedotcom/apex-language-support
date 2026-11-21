/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Wire-request shapes shared by the references and rename services. Pure
 * structural types, so this is a leaf module.
 */

export type PositionReq = {
  textDocument: { uri: string };
  position: { line: number; character: number };
  content?: string;
  documentVersion?: number;
};
export type RefsReq = PositionReq & {
  context: { includeDeclaration: boolean };
};
export type RenameReq = PositionReq & {
  newName: string;
};
