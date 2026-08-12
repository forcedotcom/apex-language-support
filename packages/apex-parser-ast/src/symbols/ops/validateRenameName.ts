/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolKind } from '../../types/symbol';
import { IdentifierValidator } from '../../semantics/validation/IdentifierValidator';
import { ValidationScope } from '../../semantics/validation/ValidationResult';
import { DEFAULT_SALESFORCE_API_VERSION } from '../../constants/constants';

/**
 * Result of name validation: either valid or invalid with a message.
 */
export type ValidateRenameNameResult =
  { ok: true } | { ok: false; message: string };

/**
 * Validate a rename newName according to Apex identifier rules.
 *
 * Wraps {@link IdentifierValidator.validateIdentifier} with a standard
 * ValidationScope and simplifies the result shape for rename error reporting.
 *
 * For locals (variables/parameters), `isTopLevel` is always false. The caller
 * specifies the SymbolKind so later rename groups (fields/methods/types) can
 * reuse this helper with their appropriate kind.
 *
 * @param newName The proposed new identifier name to validate.
 * @param kind The kind of symbol being renamed (Variable, Parameter, Field, etc).
 * @returns Either `{ ok: true }` or `{ ok: false; message: string }` where
 *   `message` contains the localized validation error suitable for displaying
 *   to the user in an LSP ResponseError.
 */
export function validateRenameName(
  newName: string,
  kind: SymbolKind,
): ValidateRenameNameResult {
  // For locals (and most rename targets), isTopLevel is false. The validation
  // scope is configured to match typical server-side validation: long
  // identifiers supported, current API version, file-based.
  const scope: ValidationScope = {
    supportsLongIdentifiers: true,
    version: DEFAULT_SALESFORCE_API_VERSION,
    isFileBased: true,
  };

  const result = IdentifierValidator.validateIdentifier(
    newName,
    kind,
    false, // isTopLevel
    scope,
  );

  if (result.isValid) {
    return { ok: true };
  }

  // Concatenate all validation errors into a single message. The
  // IdentifierValidator localizes error messages, so they're ready for display.
  const message = result.errors.join('; ');
  return { ok: false, message };
}
