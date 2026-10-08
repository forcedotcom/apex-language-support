/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/** Standard-LSP commands that provide document-scoped Apex debugger metadata. */
export const APEX_DEBUGGER_COMMANDS = {
  lineBreakpoints: 'apex.debugger.lineBreakpoints',
  exceptionBreakpoints: 'apex.debugger.exceptionBreakpoints',
} as const;

/** Opaque debugger metadata for one Apex type declared in a source document. */
export interface LineBreakpointInfo {
  readonly uri: string;
  readonly typeref: string;
  readonly lines: readonly number[];
}

/** Opaque debugger metadata for a user-defined or system Apex exception. */
export interface ExceptionBreakpointInfo {
  readonly uri?: string | null;
  readonly typeref: string;
  readonly label: string;
}

/** Extract the sole canonical document URI accepted by debugger commands. */
export const getDebuggerCommandUri = (arguments_: unknown): string => {
  if (
    !Array.isArray(arguments_) ||
    arguments_.length !== 1 ||
    typeof arguments_[0] !== 'string'
  ) {
    throw new Error(
      'Apex debugger command requires exactly one document URI string argument',
    );
  }
  return arguments_[0];
};
