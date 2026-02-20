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
  ApexSymbol,
  TypeSymbol,
  MethodSymbol,
  ScopeSymbol,
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import { isMethodSymbol, isBlockSymbol } from '../../../utils/symbolNarrowing';
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
import { areMethodSignaturesIdentical } from '../utils/methodSignatureUtils';

/**
 * Find parent class in the same file (TIER 1 only)
 */
function findParentClassInSameFile(
  childClass: TypeSymbol,
  allSymbols: ApexSymbol[],
): TypeSymbol | null {
  if (!childClass.superClass) {
    return null;
  }

  const superClassName = childClass.superClass.trim().toLowerCase();
  const childFileUri = childClass.fileUri;

  const allClasses = allSymbols.filter(
    (s) => s.kind === SymbolKind.Class && s.fileUri === childFileUri,
  ) as TypeSymbol[];

  // Check if child class is an inner class extending its outer class
  if (childClass.parentId) {
    // parentId may point to class block (scope) or directly to outer class
    let outerClass = allClasses.find((s) => s.id === childClass.parentId) as
      | TypeSymbol
      | undefined;

    if (!outerClass) {
      // parentId points to class block; find class containing that block
      const block = allSymbols.find(
        (s) =>
          isBlockSymbol(s) &&
          s.scopeType === 'class' &&
          s.id === childClass.parentId,
      );
      if (block) {
        outerClass = allClasses.find((s) => s.id === block.parentId) as
          | TypeSymbol
          | undefined;
      }
    }

    if (outerClass && outerClass.name.toLowerCase() === superClassName) {
      return outerClass;
    }
  }

  // Search for parent class by name
  const parentClass = allClasses.find(
    (s) => s.name.toLowerCase() === superClassName,
  ) as TypeSymbol | undefined;

  return parentClass || null;
}

/**
 * Find all methods in a class (including inherited from parent if in same file)
 */
function findMethodsInClass(
  classSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
  tier: ValidationTier,
): MethodSymbol[] {
  const methods: MethodSymbol[] = [];

  // Find the class block (methods have parentId pointing to class block, not class symbol)
  const classBlock = allSymbols.find(
    (s) =>
      isBlockSymbol(s) &&
      s.scopeType === 'class' &&
      s.parentId === classSymbol.id,
  ) as ScopeSymbol | undefined;

  // Get methods directly in this class
  for (const symbol of allSymbols) {
    if (
      isMethodSymbol(symbol) &&
      symbol.kind === SymbolKind.Method &&
      (symbol.parentId === classBlock?.id || symbol.parentId === classSymbol.id)
    ) {
      methods.push(symbol);
    }
  }

  // For TIER 1, also check parent class methods if parent is in same file
  if (tier === ValidationTier.IMMEDIATE && classSymbol.superClass) {
    const parentClass = findParentClassInSameFile(classSymbol, allSymbols);
    if (parentClass) {
      // Recursively get parent methods (for same-file inheritance chain)
      const parentMethods = findMethodsInClass(parentClass, allSymbols, tier);
      methods.push(...parentMethods);
    }
  }

  return methods;
}

/**
 * Get all abstract methods from a class and its parent classes (same-file only for TIER 1)
 */
function getAllAbstractMethods(
  classSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
  tier: ValidationTier,
): MethodSymbol[] {
  const abstractMethods: MethodSymbol[] = [];

  // Get all methods in this class
  const methods = findMethodsInClass(classSymbol, allSymbols, tier);

  // Filter to abstract methods
  for (const method of methods) {
    if (method.modifiers?.isAbstract) {
      abstractMethods.push(method);
    }
  }

  // Recursively get abstract methods from parent classes (same-file only for TIER 1)
  if (classSymbol.superClass) {
    const parentClass = findParentClassInSameFile(classSymbol, allSymbols);
    if (parentClass) {
      const parentAbstractMethods = getAllAbstractMethods(
        parentClass,
        allSymbols,
        tier,
      );
      abstractMethods.push(...parentAbstractMethods);
    }
  }

  return abstractMethods;
}

/**
 * Check if a method implements an abstract method (signature match)
 */
function isMethodImplemented(
  implementingMethod: MethodSymbol,
  abstractMethod: MethodSymbol,
): boolean {
  return areMethodSignaturesIdentical(
    implementingMethod,
    abstractMethod,
    ValidationTier.IMMEDIATE,
  );
}

/**
 * Validates that concrete classes implement all abstract methods from parent classes.
 *
 * Rules:
 * - Concrete classes must implement all abstract methods from parent classes
 * - Abstract classes can have unimplemented abstract methods
 *
 * IMPORTANT LIMITATION: In Apex, superclasses are typically in separate files.
 * This TIER 1 validator only checks same-file cases, which include:
 * - Inner classes extending their outer class
 * - Inner classes extending other inner classes in the same file
 * - Multiple top-level classes in the same file (uncommon)
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 */
export const AbstractMethodImplementationValidator: Validator = {
  id: 'abstract-method-implementation',
  name: 'Abstract Method Implementation Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 11, // Run after MethodCallValidator
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false, // TIER 1: same-file only
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      const allSymbols = symbolTable.getAllSymbols();
      const tier = options.tier || ValidationTier.IMMEDIATE;

      // Get all classes in the file
      const classes = allSymbols.filter(
        (symbol) => symbol.kind === SymbolKind.Class,
      ) as TypeSymbol[];

      // Check each concrete class
      for (const cls of classes) {
        // Skip abstract classes (they can have unimplemented abstract methods)
        if (cls.modifiers.isAbstract) {
          continue;
        }

        // Get all abstract methods from parent classes (same-file only for TIER 1)
        const abstractMethods = getAllAbstractMethods(cls, allSymbols, tier);

        if (abstractMethods.length === 0) {
          continue; // No abstract methods to implement
        }

        // Get all methods implemented by this class
        const classBlock = allSymbols.find(
          (s) =>
            isBlockSymbol(s) &&
            s.scopeType === 'class' &&
            s.parentId === cls.id,
        ) as ScopeSymbol | undefined;

        const classMethods = allSymbols.filter((s) => {
          if (s.kind !== SymbolKind.Method) {
            return false;
          }
          return (
            s.parentId === cls.id ||
            (classBlock && s.parentId === classBlock.id)
          );
        }) as MethodSymbol[];

        // Check each abstract method is implemented
        for (const abstractMethod of abstractMethods) {
          const implemented = classMethods.some((m) =>
            isMethodImplemented(m, abstractMethod),
          );

          if (!implemented) {
            const code = ErrorCodes.CLASS_MUST_IMPLEMENT_ABSTRACT_METHOD;
            errors.push({
              message: localizeTyped(code, cls.name, abstractMethod.name),
              location: cls.location,
              code,
            });
          }
        }
      }

      yield* Effect.logDebug(
        `AbstractMethodImplementationValidator: checked ${classes.length} classes, ` +
          `found ${errors.length} missing abstract method implementations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
