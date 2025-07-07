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
 * Static class providing validation logic for Apex property modifiers
 */
export class PropertyModifierValidator {
  /**
   * Validate property visibility modifiers for semantic errors
   */
  public static validatePropertyVisibilityModifiers(
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol,
    errorReporter: ErrorReporter,
  ): void {
    const typeKind = currentTypeSymbol.kind;

    // Check if property is in interface
    if (
      !BaseModifierValidator.validateNotInInterface(
        typeKind,
        ctx,
        errorReporter,
        'Properties',
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
      'Property',
    );
    BaseModifierValidator.validateVisibilityNotWiderThanClass(
      modifiers,
      currentTypeSymbol,
      ctx,
      errorReporter,
      'Property',
    );
    BaseModifierValidator.validateWebServiceModifier(
      modifiers,
      currentTypeSymbol,
      ctx,
      errorReporter,
      'Property',
    );
    BaseModifierValidator.validateNotOverride(
      modifiers,
      ctx,
      errorReporter,
      'Property',
    );

    // Property-specific validations
    // TestMethod properties are not allowed
    if (modifiers.isTestMethod) {
      errorReporter.addError(
        "Property cannot be declared as 'testMethod'",
        ctx,
      );
      modifiers.isTestMethod = false;
    }

    // Virtual properties are allowed (for inheritance)
    // No validation needed for virtual properties
  }
}
