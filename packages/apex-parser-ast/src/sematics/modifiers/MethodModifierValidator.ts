/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

import {
  SymbolModifiers,
  SymbolVisibility,
  TypeSymbol,
} from '../../types/symbol.js';
import { ErrorReporter } from '../../utils/ErrorReporter.js';

/**
 * Static class providing validation logic for Apex method modifiers
 */
export class MethodModifierValidator {
  /**
   * Validate method modifiers for semantic errors
   */
  public static validateMethodModifiers(
    methodName: string,
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol | null,
    errorReporter: ErrorReporter,
  ): void {
    if (!currentTypeSymbol) return;

    // Validate method visibility first
    this.validateMethodVisibilityModifiers(
      methodName,
      modifiers,
      ctx,
      currentTypeSymbol,
      errorReporter,
    );

    // Check for conflicting modifiers
    if (modifiers.isAbstract && modifiers.isVirtual) {
      errorReporter.addError(
        `Method '${methodName}' cannot be both abstract and virtual`,
        ctx,
      );
    }

    if (modifiers.isAbstract && modifiers.isFinal) {
      errorReporter.addError(
        `Method '${methodName}' cannot be both abstract and final`,
        ctx,
      );
    }

    if (modifiers.isVirtual && modifiers.isFinal) {
      errorReporter.addError(
        `Method '${methodName}' cannot be both virtual and final`,
        ctx,
      );
    }

    if (modifiers.isAbstract && modifiers.isOverride) {
      errorReporter.addError(
        `Method '${methodName}' cannot be both abstract and override`,
        ctx,
      );
    }

    // Check for abstract methods in non-abstract classes
    if (
      modifiers.isAbstract &&
      currentTypeSymbol &&
      currentTypeSymbol.kind === 'class' &&
      !currentTypeSymbol.modifiers.isAbstract
    ) {
      errorReporter.addError(
        `Abstract method '${methodName}' cannot be declared in non-abstract class`,
        ctx,
      );
    }
  }

  /**
   * Validate method visibility modifiers for semantic errors
   */
  public static validateMethodVisibilityModifiers(
    methodName: string,
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol,
    errorReporter: ErrorReporter,
  ): void {
    // Methods cannot have wider visibility than their containing class
    if (
      // Private class can only have private methods
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Private &&
        modifiers.visibility !== SymbolVisibility.Private) ||
      // Default visibility class can have default or private methods
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Default &&
        modifiers.visibility !== SymbolVisibility.Default &&
        modifiers.visibility !== SymbolVisibility.Private) ||
      // Protected class can have protected, default, or private methods
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Protected &&
        modifiers.visibility !== SymbolVisibility.Protected &&
        modifiers.visibility !== SymbolVisibility.Default &&
        modifiers.visibility !== SymbolVisibility.Private) ||
      // Public class can have public, protected, default, or private methods
      (currentTypeSymbol.modifiers.visibility === SymbolVisibility.Public &&
        modifiers.visibility === SymbolVisibility.Global)
    ) {
      errorReporter.addError(
        `Method '${methodName}' cannot have wider visibility than its containing class`,
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

    // Check if webService is used with non-global visibility
    if (
      modifiers.isWebService &&
      modifiers.visibility !== SymbolVisibility.Global
    ) {
      errorReporter.addError(
        `Method '${methodName}' with 'webService' modifier must be declared as 'global'`,
        ctx,
      );
      // Autocorrect the visibility to global
      modifiers.visibility = SymbolVisibility.Global;
    }

    // Check if webService is used in a non-global class
    if (
      modifiers.isWebService &&
      currentTypeSymbol.modifiers.visibility !== SymbolVisibility.Global
    ) {
      errorReporter.addError(
        `Method '${methodName}' with 'webService' modifier must be in a global class`,
        ctx,
      );
    }

    // Check for protected access with method overrides (must maintain same or less restrictive access)
    if (
      modifiers.isOverride &&
      modifiers.visibility === SymbolVisibility.Private
    ) {
      errorReporter.addWarning(
        `Override method '${methodName}' with 'private' visibility may not be correctly overriding a parent method`,
        ctx,
      );
    }

    // Virtual methods cannot be private
    if (
      modifiers.isVirtual &&
      modifiers.visibility === SymbolVisibility.Private
    ) {
      errorReporter.addError(
        `Virtual method '${methodName}' cannot be declared as 'private'`,
        ctx,
      );
      // Upgrade to protected as a reasonable default
      modifiers.visibility = SymbolVisibility.Protected;
    }
  }

  /**
   * Validate interface method modifiers
   */
  public static validateInterfaceMethodModifiers(
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    errorReporter: ErrorReporter,
  ): void {
    // Interface methods cannot have any explicit modifiers

    // Check for any explicit visibility modifiers
    if (modifiers.visibility !== SymbolVisibility.Default) {
      errorReporter.addError(
        'Interface methods cannot have explicit visibility modifiers',
        ctx,
      );
    }

    // No modifiers are allowed on interface methods
    const hasModifiers =
      modifiers.isStatic ||
      modifiers.isFinal ||
      modifiers.isAbstract ||
      modifiers.isVirtual ||
      modifiers.isOverride ||
      modifiers.isTransient ||
      modifiers.isTestMethod ||
      modifiers.isWebService;

    if (hasModifiers) {
      errorReporter.addError(
        'Modifiers are not allowed on interface methods',
        ctx,
      );
    }

    // Reset all modifiers - interface methods are implicitly public and abstract
    modifiers.visibility = SymbolVisibility.Public;
    modifiers.isAbstract = true;
    modifiers.isStatic = false;
    modifiers.isFinal = false;
    modifiers.isVirtual = false;
    modifiers.isOverride = false;
    modifiers.isTransient = false;
    modifiers.isTestMethod = false;
    modifiers.isWebService = false;
  }

  /**
   * Convert visibility enum to string representation
   */
  private static visibilityToString(visibility: SymbolVisibility): string {
    switch (visibility) {
      case SymbolVisibility.Public:
        return 'public';
      case SymbolVisibility.Private:
        return 'private';
      case SymbolVisibility.Protected:
        return 'protected';
      case SymbolVisibility.Global:
        return 'global';
      default:
        return 'default';
    }
  }

  /**
   * Validate method override semantics
   */
  public static validateMethodOverride(
    methodName: string,
    ctx: ParserRuleContext,
    errorReporter: ErrorReporter,
  ): void {
    // In a real implementation, we would check that:
    // 1. The parent class actually has a method with this name
    // 2. The method signatures are compatible
    // 3. The overridden method is virtual or abstract

    // For now, just add a placeholder warning
    errorReporter.addWarning(
      `Override method '${methodName}' should ensure a parent class has a compatible virtual or abstract method`,
      ctx,
    );
  }

  /**
   * Validate constructor visibility modifiers for semantic errors
   */
  public static validateConstructorVisibilityModifiers(
    constructorName: string,
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol,
    errorReporter: ErrorReporter,
  ): void {
    // Constructor visibility must match or be more restrictive than the class
    const classVisibility = currentTypeSymbol.modifiers.visibility;

    // Constructor cannot be more visible than the class
    if (
      (classVisibility === SymbolVisibility.Private &&
        modifiers.visibility !== SymbolVisibility.Private) ||
      (classVisibility === SymbolVisibility.Protected &&
        (modifiers.visibility === SymbolVisibility.Public ||
          modifiers.visibility === SymbolVisibility.Global)) ||
      (classVisibility === SymbolVisibility.Public &&
        modifiers.visibility === SymbolVisibility.Global)
    ) {
      errorReporter.addError(
        `Constructor for '${constructorName}' cannot be more visible than its class`,
        ctx,
      );
      // Adjust visibility to match class
      modifiers.visibility = classVisibility;
    }

    // Constructor cannot have certain modifiers
    if (modifiers.isAbstract) {
      errorReporter.addError(
        `Constructor for '${constructorName}' cannot be declared as 'abstract'`,
        ctx,
      );
      modifiers.isAbstract = false;
    }

    if (modifiers.isVirtual) {
      errorReporter.addError(
        `Constructor for '${constructorName}' cannot be declared as 'virtual'`,
        ctx,
      );
      modifiers.isVirtual = false;
    }

    if (modifiers.isOverride) {
      errorReporter.addError(
        `Constructor for '${constructorName}' cannot be declared as 'override'`,
        ctx,
      );
      modifiers.isOverride = false;
    }

    // WebService and global constructors must be in global classes
    if (
      modifiers.isWebService ||
      modifiers.visibility === SymbolVisibility.Global
    ) {
      if (currentTypeSymbol.modifiers.visibility !== SymbolVisibility.Global) {
        errorReporter.addError(
          `Constructor with '${modifiers.isWebService ? 'webService' : 'global'}' modifier must be in a global class`,
          ctx,
        );
      }
    }
  }
}
