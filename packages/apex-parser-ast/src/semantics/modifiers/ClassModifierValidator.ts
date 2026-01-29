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
  Annotation,
} from '../../types/symbol';
import { ErrorReporter } from '../../utils/ErrorReporter';

/**
 * Static class providing validation logic for Apex class modifiers.
 * Handles validation of class visibility, abstract/final modifiers,
 * and ensures proper modifier combinations for both outer and inner classes.
 */
export class ClassModifierValidator {
  /**
   * Check if annotations contain @isTest annotation
   * @param annotations The annotations to check
   * @returns True if @isTest annotation is present
   */
  private static hasIsTestAnnotation(annotations: Annotation[]): boolean {
    return annotations.some(
      (annotation) => annotation.name.toLowerCase() === 'istest',
    );
  }

  /**
   * Validates class visibility modifiers for semantic errors.
   * Ensures proper visibility rules for both outer and inner classes.
   * @param className The name of the class being validated
   * @param modifiers The modifiers to validate
   * @param ctx The parser context for error reporting
   * @param isInnerClass Whether this is an inner class
   * @param currentTypeSymbol The type symbol containing the class (for inner classes)
   * @param annotations The annotations on the class (to check for @isTest)
   * @param errorReporter The error reporter to use for reporting validation errors
   */
  public static validateClassVisibilityModifiers(
    className: string,
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    isInnerClass: boolean,
    currentTypeSymbol: TypeSymbol | null,
    annotations: Annotation[],
    errorReporter: ErrorReporter,
  ): void {
    // 'final' keyword is not allowed on classes in Apex
    // Classes are final by default and cannot use the 'final' keyword
    if (modifiers.isFinal) {
      errorReporter.addError(
        `The 'final' keyword cannot be used on class declarations. ` +
          `Classes are final by default in Apex. Use 'virtual' to make a class extensible.`,
        ctx,
      );
      // Remove the invalid modifier
      modifiers.isFinal = false;
    }

    // webService modifier is not allowed on classes
    if (modifiers.isWebService) {
      errorReporter.addError(
        `Class '${className}' cannot have 'webService' modifier. ` +
          'This modifier is only valid for methods and properties',
        ctx,
      );
      // Remove the invalid modifier
      modifiers.isWebService = false;
    }

    // Validate visibility for outer classes
    if (!isInnerClass) {
      // Check if this is a test class with @isTest annotation
      const isTestClass = this.hasIsTestAnnotation(annotations);

      // Outer classes can only be public, global, or default
      // Exception: @isTest classes can be private for test isolation
      if (modifiers.visibility === SymbolVisibility.Private && !isTestClass) {
        errorReporter.addError(
          `Outer class '${className}' cannot be declared as 'private'. ` +
            'Outer classes can only be public, global, or default visibility. ' +
            'Exception: Test classes with @isTest annotation may be private.',
          ctx,
        );
        // Correct to default visibility
        modifiers.visibility = SymbolVisibility.Default;
      }

      if (modifiers.visibility === SymbolVisibility.Protected) {
        errorReporter.addError(
          `Outer class '${className}' cannot be declared as 'protected'. ` +
            'Outer classes can only be public, global, or default visibility',
          ctx,
        );
        // Correct to default visibility
        modifiers.visibility = SymbolVisibility.Default;
      }
    } else {
      // For inner classes, all visibilities are allowed
      // But check for visibility relative to outer class
      if (currentTypeSymbol) {
        // Check if inner class visibility is wider than outer class
        if (
          (currentTypeSymbol.modifiers.visibility ===
            SymbolVisibility.Private &&
            modifiers.visibility !== SymbolVisibility.Private) ||
          (currentTypeSymbol.modifiers.visibility ===
            SymbolVisibility.Default &&
            modifiers.visibility !== SymbolVisibility.Default &&
            modifiers.visibility !== SymbolVisibility.Private) ||
          (currentTypeSymbol.modifiers.visibility ===
            SymbolVisibility.Protected &&
            modifiers.visibility === SymbolVisibility.Public) ||
          (currentTypeSymbol.modifiers.visibility !== SymbolVisibility.Global &&
            modifiers.visibility === SymbolVisibility.Global)
        ) {
          errorReporter.addError(
            `Inner class '${className}' cannot have wider visibility than its containing class`,
            ctx,
          );
          // Adjust visibility to match containing class as a reasonable default
          modifiers.visibility = currentTypeSymbol.modifiers.visibility;
        }
      }
    }

    // If there are abstract methods, the class must be declared abstract or interface
    // This check would be more appropriately done as a post-processing step after all methods are collected
  }

  /**
   * Validate interface visibility modifiers for semantic errors
   */
  public static validateInterfaceVisibilityModifiers(
    interfaceName: string,
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    isInnerInterface: boolean,
    currentTypeSymbol: TypeSymbol | null,
    errorReporter: ErrorReporter,
  ): void {
    // Interfaces can only be top-level declarations
    if (isInnerInterface) {
      errorReporter.addError(
        `Interface '${interfaceName}' cannot be declared as an inner interface. ` +
          'Interfaces are only allowed as top-level declarations',
        ctx,
      );
    }

    // Interfaces can only have public or global visibility
    if (
      modifiers.visibility !== SymbolVisibility.Public &&
      modifiers.visibility !== SymbolVisibility.Global
    ) {
      errorReporter.addError(
        `Interface '${interfaceName}' must be declared as 'public' or 'global'. ` +
          'Other visibility modifiers are not allowed for interfaces',
        ctx,
      );
      // Correct to public visibility
      modifiers.visibility = SymbolVisibility.Public;
    }

    // Check for invalid modifiers on interfaces
    if (modifiers.isFinal) {
      errorReporter.addError(
        `Interface '${interfaceName}' cannot be declared as 'final'`,
        ctx,
      );
      modifiers.isFinal = false;
    }

    if (modifiers.isVirtual) {
      errorReporter.addError(
        `Interface '${interfaceName}' cannot be declared as 'virtual'`,
        ctx,
      );
      modifiers.isVirtual = false;
    }

    // Interfaces are implicitly abstract, so explicit abstract is redundant
    if (modifiers.isAbstract) {
      errorReporter.addWarning(
        `Interface '${interfaceName}' has redundant 'abstract' modifier, interfaces are implicitly abstract`,
        ctx,
      );
    }
  }
}
