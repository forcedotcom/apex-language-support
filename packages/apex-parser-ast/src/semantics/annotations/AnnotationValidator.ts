/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4ts';

import {
  ApexSymbol,
  SymbolKind,
  TypeSymbol,
  Annotation,
} from '../../types/symbol';
import { ErrorReporter } from '../../utils/ErrorReporter';

/**
 * Types of targets where annotations can be applied
 */
export enum AnnotationTarget {
  Class = 'class',
  Interface = 'interface',
  Method = 'method',
  Property = 'property',
  Field = 'field',
  Parameter = 'parameter',
  Any = 'any',
}

/**
 * Information about an annotation and its allowed targets
 */
export interface AnnotationInfo {
  /** The name of the annotation */
  name: string;
  /** Valid targets for this annotation */
  validTargets: AnnotationTarget[];
  /** Whether the annotation requires specific parameters */
  requiredParameters?: string[];
  /** Optional parameters for this annotation */
  optionalParameters?: string[];
  /** Flag to indicate if the annotation requires at least one parameter */
  requiresAnyParameter?: boolean;
  /** Description of the annotation */
  description: string;
}

/**
 * Static class providing validation logic for Apex annotations
 */
export class AnnotationValidator {
  /**
   * Known annotations and their valid targets
   */
  private static readonly ANNOTATIONS: AnnotationInfo[] = [
    {
      name: 'isTest',
      validTargets: [AnnotationTarget.Class, AnnotationTarget.Method],
      optionalParameters: ['seeAllData', 'isParallel'],
      description: 'Identifies a class or method as a test',
    },
    {
      name: 'RestResource',
      validTargets: [AnnotationTarget.Class],
      requiredParameters: ['urlMapping'],
      description: 'Exposes an Apex class as a REST resource',
    },
    {
      name: 'AuraEnabled',
      validTargets: [AnnotationTarget.Method, AnnotationTarget.Property],
      optionalParameters: ['cacheable'],
      description:
        'Enables a method or property to be used in Aura and LWC components',
    },
    {
      name: 'InvocableMethod',
      validTargets: [AnnotationTarget.Method],
      optionalParameters: ['label', 'description', 'category'],
      description: 'Allows a method to be invoked from flows and processes',
    },
    {
      name: 'InvocableVariable',
      validTargets: [AnnotationTarget.Field],
      optionalParameters: [
        'label',
        'description',
        'required',
        'defaultValue',
        'placeholderText',
      ],
      description:
        'Marks a field as an input or output variable for invocable methods',
    },
    {
      name: 'RemoteAction',
      validTargets: [AnnotationTarget.Method],
      description:
        'Exposes a method for use in Visualforce through JavaScript remoting',
    },
    {
      name: 'TestSetup',
      validTargets: [AnnotationTarget.Method],
      description:
        'Indicates a method that runs once before all test methods in a test class',
    },
    {
      name: 'Future',
      validTargets: [AnnotationTarget.Method],
      optionalParameters: ['callout'],
      description: 'Marks a method to be executed asynchronously',
    },
    {
      name: 'ReadOnly',
      validTargets: [AnnotationTarget.Method],
      description:
        "Indicates a method that doesn't make DML operations or calls to methods that make DML operations",
    },
    {
      name: 'TestVisible',
      validTargets: [AnnotationTarget.Property, AnnotationTarget.Method],
      description:
        'Makes a private or protected method or property accessible to test methods',
    },
    {
      name: 'Deprecated',
      validTargets: [
        AnnotationTarget.Class,
        AnnotationTarget.Method,
        AnnotationTarget.Property,
      ],
      optionalParameters: ['message'],
      description:
        'Indicates that a feature is deprecated and may be removed in a future release',
    },
    {
      name: 'SuppressWarnings',
      validTargets: [AnnotationTarget.Any],
      requiredParameters: ['value'],
      description: 'Suppresses specific compiler warnings',
    },
    {
      name: 'HttpGet',
      validTargets: [AnnotationTarget.Method],
      description:
        'Exposes a method as a REST API that responds to HTTP GET requests',
    },
    {
      name: 'HttpPost',
      validTargets: [AnnotationTarget.Method],
      description:
        'Exposes a method as a REST API that responds to HTTP POST requests',
    },
    {
      name: 'HttpPut',
      validTargets: [AnnotationTarget.Method],
      description:
        'Exposes a method as a REST API that responds to HTTP PUT requests',
    },
    {
      name: 'HttpDelete',
      validTargets: [AnnotationTarget.Method],
      description:
        'Exposes a method as a REST API that responds to HTTP DELETE requests',
    },
    {
      name: 'HttpPatch',
      validTargets: [AnnotationTarget.Method],
      description:
        'Exposes a method as a REST API that responds to HTTP PATCH requests',
    },
  ];

  /**
   * Get annotation info by name
   */
  public static getAnnotationInfo(name: string): AnnotationInfo | undefined {
    return this.ANNOTATIONS.find(
      (a) => a.name.toLowerCase() === name.toLowerCase(),
    );
  }

  /**
   * Validate all annotations for a symbol
   * @param symbol The symbol to validate
   * @param ctx The parser context for error reporting
   * @param errorReporter The error reporter for reporting validation errors
   */
  public static validateAnnotations(
    symbol: ApexSymbol,
    ctx: ParserRuleContext,
    errorReporter: ErrorReporter,
  ): void {
    if (
      symbol.kind !== SymbolKind.Class &&
      symbol.kind !== SymbolKind.Interface &&
      symbol.kind !== SymbolKind.Method &&
      symbol.kind !== SymbolKind.Property &&
      symbol.kind !== SymbolKind.Parameter
    ) {
      // Not a symbol type that can have annotations
      return;
    }

    // Only TypeSymbols have annotations for now
    if (
      symbol.kind === SymbolKind.Class ||
      symbol.kind === SymbolKind.Interface
    ) {
      const typeSymbol = symbol as TypeSymbol;
      const annotations = typeSymbol.annotations || [];

      // Validate each annotation
      for (const annotation of annotations) {
        this.validateAnnotation(symbol, annotation, ctx, errorReporter);
      }

      // Check for conflicting annotations
      this.validateAnnotationConflicts(symbol, annotations, ctx, errorReporter);
    }
  }

  /**
   * Validate a single annotation for a symbol
   * @param symbol The symbol with the annotation
   * @param annotation The annotation to validate
   * @param ctx The parser context for error reporting
   * @param errorReporter The error reporter for reporting validation errors
   */
  private static validateAnnotation(
    symbol: ApexSymbol,
    annotation: Annotation,
    ctx: ParserRuleContext,
    errorReporter: ErrorReporter,
  ): void {
    const annotationInfo = this.getAnnotationInfo(annotation.name);
    if (!annotationInfo) {
      // Unknown annotation - we don't validate unknown annotations
      return;
    }

    // Check if the annotation is valid for this symbol type
    if (!this.isValidTarget(symbol, annotationInfo.validTargets)) {
      const validTargetsStr = annotationInfo.validTargets
        .filter((t) => t !== AnnotationTarget.Any)
        .join(', ');

      errorReporter.addError(
        `The annotation @${annotation.name} cannot be used on a ${symbol.kind}. ` +
          `Valid targets are: ${validTargetsStr}.`,
        ctx,
      );
      return;
    }

    // Validate required parameters
    if (
      annotationInfo.requiredParameters &&
      annotationInfo.requiredParameters.length > 0
    ) {
      const missingParams = this.getMissingRequiredParameters(
        annotation,
        annotationInfo.requiredParameters,
      );

      if (missingParams.length > 0) {
        errorReporter.addError(
          `The annotation @${annotation.name} is missing required parameter(s): ${missingParams.join(', ')}.`,
          ctx,
        );
      }
    }

    // Validate that the annotation has at least one parameter if required
    if (
      annotationInfo.requiresAnyParameter &&
      (!annotation.parameters || annotation.parameters.length === 0)
    ) {
      errorReporter.addError(
        `The annotation @${annotation.name} requires at least one parameter.`,
        ctx,
      );
    }

    // Validate that all parameters are recognized
    if (annotation.parameters && annotation.parameters.length > 0) {
      const validParams = [
        ...(annotationInfo.requiredParameters || []),
        ...(annotationInfo.optionalParameters || []),
      ];

      if (validParams.length > 0) {
        // Only check named parameters (positional parameters don't have names)
        const unrecognizedParams = annotation.parameters
          .filter((p) => p.name)
          .filter(
            (p) =>
              !validParams.some(
                (validParam) =>
                  validParam.toLowerCase() === p.name?.toLowerCase(),
              ),
          )
          .map((p) => p.name);

        if (unrecognizedParams.length > 0) {
          errorReporter.addWarning(
            `The annotation @${annotation.name} contains unrecognized parameter(s): ` +
              `${unrecognizedParams.join(', ')}. Valid parameters are: ${validParams.join(', ')}.`,
            ctx,
          );
        }
      }
    }
  }

  /**
   * Check for conflicting annotations
   * @param symbol The symbol to check
   * @param annotations The annotations to validate
   * @param ctx The parser context for error reporting
   * @param errorReporter The error reporter for reporting validation errors
   */
  private static validateAnnotationConflicts(
    symbol: ApexSymbol,
    annotations: Annotation[],
    ctx: ParserRuleContext,
    errorReporter: ErrorReporter,
  ): void {
    // Check for multiple HTTP method annotations (HttpGet, HttpPost, etc.)
    const httpMethodAnnotations = annotations.filter(
      (a) =>
        a.name.toLowerCase().startsWith('http') &&
        a.name.toLowerCase() !== 'http',
    );

    if (httpMethodAnnotations.length > 1) {
      const methodNames = httpMethodAnnotations.map((a) => a.name).join(', ');
      errorReporter.addError(
        `Multiple HTTP method annotations found: @${methodNames}. ` +
          'Only one HTTP method annotation can be used on a method.',
        ctx,
      );
    }

    // Check for conflicting test-related annotations
    if (
      this.hasAnnotation(annotations, 'isTest') &&
      this.hasAnnotation(annotations, 'AuraEnabled')
    ) {
      errorReporter.addError(
        'The annotations @isTest and @AuraEnabled cannot be used together.',
        ctx,
      );
    }

    // Check for conflicting transaction control annotations
    if (
      this.hasAnnotation(annotations, 'Future') &&
      this.hasAnnotation(annotations, 'ReadOnly')
    ) {
      errorReporter.addError(
        'The annotations @Future and @ReadOnly cannot be used together.',
        ctx,
      );
    }
  }

  /**
   * Check if a symbol is a valid target for the given annotation targets
   * @param symbol The symbol to check
   * @param validTargets Valid targets for the annotation
   */
  private static isValidTarget(
    symbol: ApexSymbol,
    validTargets: AnnotationTarget[],
  ): boolean {
    // If Any is a valid target, then any symbol is valid
    if (validTargets.includes(AnnotationTarget.Any)) {
      return true;
    }

    switch (symbol.kind) {
      case SymbolKind.Class:
        return validTargets.includes(AnnotationTarget.Class);
      case SymbolKind.Interface:
        return validTargets.includes(AnnotationTarget.Interface);
      case SymbolKind.Method:
        return validTargets.includes(AnnotationTarget.Method);
      case SymbolKind.Property:
        return validTargets.includes(AnnotationTarget.Property);
      case SymbolKind.Field:
        return validTargets.includes(AnnotationTarget.Field);
      case SymbolKind.Parameter:
        return validTargets.includes(AnnotationTarget.Parameter);
      default:
        return false;
    }
  }

  /**
   * Get missing required parameters for an annotation
   * @param annotation The annotation to check
   * @param requiredParams Required parameters for the annotation
   */
  private static getMissingRequiredParameters(
    annotation: Annotation,
    requiredParams: string[],
  ): string[] {
    if (!annotation.parameters || annotation.parameters.length === 0) {
      return requiredParams;
    }

    return requiredParams.filter(
      (requiredParam) =>
        !annotation.parameters?.some(
          (p) => p.name?.toLowerCase() === requiredParam.toLowerCase(),
        ),
    );
  }

  /**
   * Check if annotations include a specific annotation by name
   */
  private static hasAnnotation(
    annotations: Annotation[],
    name: string,
  ): boolean {
    return annotations.some((a) => a.name.toLowerCase() === name.toLowerCase());
  }
}
