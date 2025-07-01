/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

import { SymbolModifiers, TypeSymbol } from '../../types/symbol';
import { ErrorReporter } from '../../utils/ErrorReporter';
import { BaseModifierValidator } from './BaseModifierValidator';

/**
 * Static class providing validation logic for Apex field modifiers
 */
export class FieldModifierValidator {
  /**
   * Validate field visibility modifiers for semantic errors
   */
  public static validateFieldVisibilityModifiers(
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol,
    errorReporter: ErrorReporter,
  ): void {
    const typeKind = currentTypeSymbol.kind;

    // Check if field is in interface
    if (
      !BaseModifierValidator.validateNotInInterface(
        typeKind,
        ctx,
        errorReporter,
        'Fields',
      )
    ) {
      return;
    }

    // Validate common modifiers
    BaseModifierValidator.validateNotAbstract(
      typeKind,
      modifiers,
      ctx,
      errorReporter,
      'Field',
    );
    BaseModifierValidator.validateVisibilityNotWiderThanClass(
      modifiers,
      currentTypeSymbol,
      ctx,
      errorReporter,
      'Field',
    );
    BaseModifierValidator.validateWebServiceModifier(
      modifiers,
      currentTypeSymbol,
      ctx,
      errorReporter,
      'Field',
    );
    BaseModifierValidator.validateNotOverride(
      modifiers,
      ctx,
      errorReporter,
      'Field',
    );

    // Field-specific validations
    // Virtual fields are not allowed
    if (modifiers.isVirtual) {
      errorReporter.addError("Field cannot be declared as 'virtual'", ctx);
      modifiers.isVirtual = false;
    }
  }
}
