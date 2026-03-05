/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  Annotation,
  ApexSymbol,
  SymbolKind,
  TypeSymbol,
} from '../types/symbol';

/**
 * Helper utilities for working with Apex annotations
 */
export class AnnotationUtils {
  /**
   * Check if a symbol has a specific annotation
   * @param symbol The symbol to check
   * @param annotationName The name of the annotation to look for
   * @returns True if the symbol has the annotation, false otherwise
   */
  public static hasAnnotation(
    symbol: ApexSymbol,
    annotationName: string,
  ): boolean {
    if (
      (symbol.kind === SymbolKind.Class ||
        symbol.kind === SymbolKind.Interface ||
        symbol.kind === SymbolKind.Trigger) &&
      (symbol as TypeSymbol).annotations
    ) {
      const typeSymbol = symbol as TypeSymbol;
      return (
        typeSymbol.annotations?.some(
          (annotation) =>
            annotation.name.toLowerCase() === annotationName.toLowerCase(),
        ) || false
      );
    }

    // Fallback for MethodSymbol, VariableSymbol, etc. (all have annotations on ApexSymbol)
    return (
      (symbol.annotations ?? []).some(
        (annotation) =>
          annotation.name.toLowerCase() === annotationName.toLowerCase(),
      ) || false
    );
  }

  /**
   * Get a specific annotation from a symbol
   * @param symbol The symbol to check
   * @param annotationName The name of the annotation to get
   * @returns The annotation if found, undefined otherwise
   */
  public static getAnnotation(
    symbol: ApexSymbol,
    annotationName: string,
  ): Annotation | undefined {
    if (
      (symbol.kind === SymbolKind.Class ||
        symbol.kind === SymbolKind.Interface ||
        symbol.kind === SymbolKind.Trigger) &&
      (symbol as TypeSymbol).annotations
    ) {
      const typeSymbol = symbol as TypeSymbol;
      return typeSymbol.annotations?.find(
        (annotation) =>
          annotation.name.toLowerCase() === annotationName.toLowerCase(),
      );
    }

    return undefined;
  }

  /**
   * Get a parameter value from an annotation
   * @param annotation The annotation to extract from
   * @param paramName The parameter name to look for (optional for positional params)
   * @param index Optional index for positional parameters
   * @returns The parameter value as a string if found, undefined otherwise
   */
  public static getAnnotationParameter(
    annotation: Annotation,
    paramName?: string,
    index: number = 0,
  ): string | undefined {
    if (!annotation.parameters) {
      return undefined;
    }

    if (paramName) {
      // Find by name
      const param = annotation.parameters.find(
        (p) => p.name?.toLowerCase() === paramName.toLowerCase(),
      );
      return param?.value;
    } else {
      // Find by position (for positional parameters)
      const positionalParams = annotation.parameters.filter((p) => !p.name);
      return positionalParams[index]?.value;
    }
  }

  /**
   * Check if a symbol is a test class (has @isTest annotation)
   * @param symbol The symbol to check
   * @returns True if the symbol is a test class, false otherwise
   */
  public static isTestClass(symbol: ApexSymbol): boolean {
    return this.hasAnnotation(symbol, 'isTest');
  }

  /**
   * Check if a symbol is a REST resource (has @RestResource annotation)
   * @param symbol The symbol to check
   * @returns True if the symbol is a REST resource, false otherwise
   */
  public static isRestResource(symbol: ApexSymbol): boolean {
    return this.hasAnnotation(symbol, 'RestResource');
  }

  /**
   * Get the URL mapping from a REST resource class
   * @param symbol The REST resource class symbol
   * @returns The URL mapping if found, undefined otherwise
   */
  public static getRestResourceUrlMapping(
    symbol: ApexSymbol,
  ): string | undefined {
    const annotation = this.getAnnotation(symbol, 'RestResource');
    if (annotation) {
      return this.getAnnotationParameter(annotation, 'urlMapping');
    }
    return undefined;
  }
}
