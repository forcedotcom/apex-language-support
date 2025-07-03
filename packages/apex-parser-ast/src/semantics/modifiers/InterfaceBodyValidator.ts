/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

import { SymbolKind, SymbolModifiers, TypeSymbol } from '../../types/symbol';
import { ErrorReporter } from '../../utils/ErrorReporter';

/**
 * Static class providing validation logic for Apex interface body declarations.
 * Ensures that only valid method declarations are present in interface bodies.
 */
export class InterfaceBodyValidator {
  /**
   * Validates that field declarations are not allowed in interface bodies.
   * Fields (properties/variables) are only allowed in classes, not interfaces.
   * @param modifiers The field modifiers
   * @param ctx The parser context for error reporting
   * @param currentTypeSymbol The interface symbol containing the field
   * @param errorReporter The error reporter to use for reporting validation errors
   */
  public static validateFieldInInterface(
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol,
    errorReporter: ErrorReporter,
  ): void {
    if (currentTypeSymbol.kind === SymbolKind.Interface) {
      errorReporter.addError(
        'Fields are not allowed in interfaces. Interfaces can only contain method declarations',
        ctx,
      );
    }
  }

  /**
   * Validates that property declarations are not allowed in interface bodies.
   * Properties are only allowed in classes, not interfaces.
   * @param modifiers The property modifiers
   * @param ctx The parser context for error reporting
   * @param currentTypeSymbol The interface symbol containing the property
   * @param errorReporter The error reporter to use for reporting validation errors
   */
  public static validatePropertyInInterface(
    modifiers: SymbolModifiers,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol,
    errorReporter: ErrorReporter,
  ): void {
    if (currentTypeSymbol.kind === SymbolKind.Interface) {
      errorReporter.addError(
        'Properties are not allowed in interfaces. Interfaces can only contain method declarations',
        ctx,
      );
    }
  }

  /**
   * Validates that constructor declarations are not allowed in interface bodies.
   * Constructors are only allowed in classes, not interfaces.
   * @param constructorName The name of the constructor
   * @param ctx The parser context for error reporting
   * @param currentTypeSymbol The interface symbol containing the constructor
   * @param errorReporter The error reporter to use for reporting validation errors
   */
  public static validateConstructorInInterface(
    constructorName: string,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol | null,
    errorReporter: ErrorReporter,
  ): void {
    if (currentTypeSymbol && currentTypeSymbol.kind === SymbolKind.Interface) {
      errorReporter.addError(
        `Constructor '${constructorName}' is not allowed in interfaces. ` +
          'Interfaces can only contain method declarations',
        ctx,
      );
    }
  }

  /**
   * Validates that enum declarations are not allowed in interface bodies.
   * Enums are only allowed in classes or as top-level declarations, not in interfaces.
   * @param enumName The name of the enum
   * @param ctx The parser context for error reporting
   * @param currentTypeSymbol The interface symbol containing the enum
   * @param errorReporter The error reporter to use for reporting validation errors
   */
  public static validateEnumInInterface(
    enumName: string,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol | null,
    errorReporter: ErrorReporter,
  ): void {
    if (currentTypeSymbol && currentTypeSymbol.kind === SymbolKind.Interface) {
      errorReporter.addError(
        `Enum '${enumName}' is not allowed in interfaces. Interfaces can only contain method declarations`,
        ctx,
      );
    }
  }

  /**
   * Validates that class declarations are not allowed in interface bodies.
   * Inner classes are only allowed in classes, not interfaces.
   * @param className The name of the class
   * @param ctx The parser context for error reporting
   * @param currentTypeSymbol The interface symbol containing the class
   * @param errorReporter The error reporter to use for reporting validation errors
   */
  public static validateClassInInterface(
    className: string,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol | null,
    errorReporter: ErrorReporter,
  ): void {
    if (currentTypeSymbol && currentTypeSymbol.kind === SymbolKind.Interface) {
      errorReporter.addError(
        `Inner class '${className}' is not allowed in interfaces. Interfaces can only contain method declarations`,
        ctx,
      );
    }
  }

  /**
   * Validates that interface declarations are not allowed in interface bodies.
   * Inner interfaces are only allowed in classes, not interfaces.
   * @param interfaceName The name of the interface
   * @param ctx The parser context for error reporting
   * @param currentTypeSymbol The interface symbol containing the interface
   * @param errorReporter The error reporter to use for reporting validation errors
   */
  public static validateInterfaceInInterface(
    interfaceName: string,
    ctx: ParserRuleContext,
    currentTypeSymbol: TypeSymbol | null,
    errorReporter: ErrorReporter,
  ): void {
    if (currentTypeSymbol && currentTypeSymbol.kind === SymbolKind.Interface) {
      errorReporter.addError(
        `Inner interface '${interfaceName}' is not allowed in interfaces. ` +
          'Interfaces can only contain method declarations',
        ctx,
      );
    }
  }
}
