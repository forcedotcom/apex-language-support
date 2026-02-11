/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type {
  SymbolTable,
  TypeSymbol,
  Annotation,
} from '../../../types/symbol';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';
import { SymbolKind } from '../../../types/symbol';
import { AnnotationValidator } from '../../annotations/AnnotationValidator';

/**
 * Validates that annotations are known/recognized annotations.
 *
 * Reports unknown annotations that are not in the list of known annotations
 * from Salesforce public documentation. This validator does not determine
 * if an annotation is valid for a specific org, only if it's a recognized
 * annotation in the Apex language.
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 */
export const UnknownAnnotationValidator: Validator = {
  id: 'unknown-annotation',
  name: 'Unknown Annotation Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 4, // Run before AnnotationPropertyValidator
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false,
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Check annotations on all symbol types that can have annotations
      for (const symbol of allSymbols) {
        let annotations: Annotation[] | undefined;

        // Extract annotations based on symbol type
        if (
          symbol.kind === SymbolKind.Class ||
          symbol.kind === SymbolKind.Interface
        ) {
          const typeSymbol = symbol as TypeSymbol;
          annotations = typeSymbol.annotations;
        } else if (
          symbol.kind === SymbolKind.Method ||
          symbol.kind === SymbolKind.Property ||
          symbol.kind === SymbolKind.Field ||
          symbol.kind === SymbolKind.Parameter
        ) {
          // Methods, properties, fields, and parameters can have annotations
          annotations = symbol.annotations;
        } else {
          continue;
        }

        if (!annotations || annotations.length === 0) {
          continue;
        }

        // Check each annotation against the known list
        for (const annotation of annotations) {
          const annotationInfo = AnnotationValidator.getAnnotationInfo(
            annotation.name,
          );

          // If annotation is in the known list, skip
          if (annotationInfo) {
            continue;
          }

          const location = annotation.location || symbol.location;

          // TIER 2: Try to resolve as custom annotation (e.g., namespace.Annotation)
          // If not found, report INVALID_UNRESOLVED_ANNOTATION ("Annotation does not exist")
          if (
            options.tier === ValidationTier.THOROUGH &&
            options.symbolManager
          ) {
            const annotationName = annotation.name;
            const symbols =
              options.symbolManager.findSymbolByName(annotationName);
            const typeSymbol = symbols?.find(
              (s: { kind: string }) =>
                s.kind === 'Class' || s.kind === 'Interface',
            );
            if (!typeSymbol) {
              const fqnSymbol =
                options.symbolManager.findSymbolByFQN(annotationName);
              if (!fqnSymbol) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_UNRESOLVED_ANNOTATION,
                    annotationName,
                  ),
                  location,
                  code: ErrorCodes.INVALID_UNRESOLVED_ANNOTATION,
                });
                continue;
              }
            }
          }

          // TIER 1 or resolution failed: report as unknown
          errors.push({
            message: localizeTyped(
              ErrorCodes.ANNOTATION_UNKNOWN,
              annotation.name,
            ),
            location,
            code: ErrorCodes.ANNOTATION_UNKNOWN,
          });
        }
      }

      yield* Effect.logDebug(
        `UnknownAnnotationValidator: checked annotations, found ${errors.length} unknown annotations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
