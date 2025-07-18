/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

import { SymbolKind, SymbolModifiers, SymbolVisibility, TypeSymbol } from '../../types/symbol';
import { ErrorReporter } from '../../utils/ErrorReporter';

/**
 * Base class providing common validation logic for Apex modifiers
 */
export class BaseModifierValidator {
  /**
   * Validate that the member is not declared in an interface
   */
  public static validateNotInInterface(
    typeKind: SymbolKind,
    ctx: ParserRuleContext,
    errorReporter: ErrorReporter,
    memberType: string,
  ): boolean {
    if (typeKind === SymbolKind.Interface) {
      errorReporter.addError(
        `${memberType} are not allowed in interfaces. Interfaces can only contain method declarations`,
        ctx,
      );
      return false;
    }
    return true;
  }

  /**
   * Validate that the member is not abstract in concrete classes
   */
  public static validateNotAbstract(
    typeKind: SymbolKind,
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    errorReporter: ErrorReporter,
    memberType: string,
  ): void {
    if (typeKind === SymbolKind.Class && modifiers.isAbstract) {
      errorReporter.addError(`${memberType} cannot be declared as 'abstract'`, ctx);
      modifiers.isAbstract = false;
    }
  }

  /**
   * Validate that member visibility is not wider than containing class visibility
   */
  public static validateVisibilityNotWiderThanClass(
    modifiers: SymbolModifiers,
    currentTypeSymbol: TypeSymbol,
    ctx: ParserRuleContext,
    errorReporter: ErrorReporter,
    memberType: string,
  ): void {
    if (
      // Private class can only have private members
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Private &&
        modifiers.visibility !== SymbolVisibility.Private) ||
      // Default visibility class can have default or private members
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Default &&
        modifiers.visibility !== SymbolVisibility.Default &&
        modifiers.visibility !== SymbolVisibility.Private) ||
      // Protected class can have protected, default, or private members
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Protected &&
        modifiers.visibility !== SymbolVisibility.Protected &&
        modifiers.visibility !== SymbolVisibility.Default &&
        modifiers.visibility !== SymbolVisibility.Private) ||
      // Public class can have public, protected, default, or private members
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Public &&
        modifiers.visibility === SymbolVisibility.Global)
    ) {
      errorReporter.addError(`${memberType} cannot have wider visibility than its containing class`, ctx);
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
  }

  /**
   * Validate webService modifier requirements
   */
  public static validateWebServiceModifier(
    modifiers: SymbolModifiers,
    currentTypeSymbol: TypeSymbol,
    ctx: ParserRuleContext,
    errorReporter: ErrorReporter,
    memberType: string,
  ): void {
    // WebService members must be global
    if (modifiers.isWebService && modifiers.visibility !== SymbolVisibility.Global) {
      errorReporter.addError(`${memberType} with 'webService' modifier must be declared as 'global'`, ctx);
      // Correct the visibility
      modifiers.visibility = SymbolVisibility.Global;
    }

    // WebService members must be in global classes
    if (modifiers.isWebService && currentTypeSymbol.modifiers.visibility !== SymbolVisibility.Global) {
      errorReporter.addError(`${memberType} with 'webService' modifier must be in a global class`, ctx);
    }
  }

  /**
   * Validate that the member is not override
   */
  public static validateNotOverride(
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    errorReporter: ErrorReporter,
    memberType: string,
  ): void {
    if (modifiers.isOverride) {
      errorReporter.addError(`${memberType} cannot be declared as 'override'`, ctx);
      modifiers.isOverride = false;
    }
  }
}
