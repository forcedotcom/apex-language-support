/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

import {
  SymbolKind,
  SymbolModifiers,
  SymbolVisibility,
  TypeSymbol,
} from '../../types/symbol';
import { ErrorReporter } from '../../utils/ErrorReporter';

/**
 * Static class providing validation logic for Apex field modifiers
 */
export class FieldModifierValidator {
  /**
   * Validate field/property visibility modifiers for semantic errors
   */
  public static validateFieldVisibilityModifiers(
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol,
    errorReporter: ErrorReporter,
  ): void {
    const typeKind = currentTypeSymbol.kind;

    // Fields are not allowed in interfaces (only method declarations)
    if (typeKind === SymbolKind.Interface) {
      errorReporter.addError(
        'Fields are not allowed in interfaces. Interfaces can only contain method declarations',
        ctx,
      );
      return;
    }

    // Fields in concrete types cannot be abstract
    if (typeKind === SymbolKind.Class && modifiers.isAbstract) {
      errorReporter.addError("Field cannot be declared as 'abstract'", ctx);
      modifiers.isAbstract = false;
    }

    // Field visibility cannot be wider than containing class visibility
    if (
      // Private class can only have private fields
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Private &&
        modifiers.visibility !== SymbolVisibility.Private) ||
      // Default visibility class can have default or private fields
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Default &&
        modifiers.visibility !== SymbolVisibility.Default &&
        modifiers.visibility !== SymbolVisibility.Private) ||
      // Protected class can have protected, default, or private fields
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Protected &&
        modifiers.visibility !== SymbolVisibility.Protected &&
        modifiers.visibility !== SymbolVisibility.Default &&
        modifiers.visibility !== SymbolVisibility.Private) ||
      // Public class can have public, protected, default, or private fields
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Public &&
        modifiers.visibility === SymbolVisibility.Global)
    ) {
      errorReporter.addError(
        'Field cannot have wider visibility than its containing class',
        ctx,
      );
      // Adjust to most permissive valid visibility for this class
      const classVisibility = currentTypeSymbol.modifiers.visibility;

      if (classVisibility === SymbolVisibility.Private) {
        modifiers.visibility = SymbolVisibility.Private;
      } else if (classVisibility === SymbolVisibility.Default) {
        modifiers.visibility = SymbolVisibility.Default;
      } else if (classVisibility === SymbolVisibility.Protected) {
        modifiers.visibility = SymbolVisibility.Protected;
      } else if (classVisibility === SymbolVisibility.Public) {
        modifiers.visibility = SymbolVisibility.Public;
      }
      // Global class can have any visibility - no adjustment needed
    }

    // WebService fields must be global
    if (
      modifiers.isWebService &&
      modifiers.visibility !== SymbolVisibility.Global
    ) {
      errorReporter.addError(
        "Field with 'webService' modifier must be declared as 'global'",
        ctx,
      );
      // Correct the visibility
      modifiers.visibility = SymbolVisibility.Global;
    }

    // WebService fields must be in global classes
    if (
      modifiers.isWebService &&
      currentTypeSymbol.modifiers.visibility !== SymbolVisibility.Global
    ) {
      errorReporter.addError(
        "Field with 'webService' modifier must be in a global class",
        ctx,
      );
    }

    // Virtual fields are not allowed
    if (modifiers.isVirtual) {
      errorReporter.addError("Field cannot be declared as 'virtual'", ctx);
      modifiers.isVirtual = false;
    }

    // Override fields are not allowed
    if (modifiers.isOverride) {
      errorReporter.addError("Field cannot be declared as 'override'", ctx);
      modifiers.isOverride = false;
    }
  }
}
