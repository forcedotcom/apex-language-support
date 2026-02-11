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
  MethodSymbol,
  TypeSymbol,
  ApexSymbol,
  ScopeSymbol,
} from '../../../types/symbol';
import { SymbolKind, SymbolVisibility } from '../../../types/symbol';
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
 * Compare visibility levels for override validation
 * Returns: -1 if vis1 < vis2, 0 if equal, 1 if vis1 > vis2
 * Visibility order: private < protected < public < global
 */
function compareVisibility(
  vis1: SymbolVisibility,
  vis2: SymbolVisibility,
): number {
  const order: Record<SymbolVisibility, number> = {
    [SymbolVisibility.Private]: 0,
    [SymbolVisibility.Protected]: 1,
    [SymbolVisibility.Public]: 2,
    [SymbolVisibility.Global]: 3,
    [SymbolVisibility.Default]: 1, // Default is treated as protected
  };

  const v1 = order[vis1] ?? -1;
  const v2 = order[vis2] ?? -1;

  return v1 - v2;
}

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

  // Normalize superClass name (trim whitespace, handle potential array brackets, etc.)
  const superClassName = childClass.superClass.trim().toLowerCase();

  // Ensure we only check symbols from the same file
  const childFileUri = childClass.fileUri;

  // Get all classes in the same file
  const allClasses = allSymbols.filter(
    (s) => s.kind === SymbolKind.Class && s.fileUri === childFileUri, // Same file check
  ) as TypeSymbol[];

  // First, check if child class is an inner class extending its outer class
  // If childClass has a parentId, it's an inner class
  // Check if the parent class matches the superClass name
  if (childClass.parentId) {
    const outerClass = allClasses.find((s) => s.id === childClass.parentId) as
      | TypeSymbol
      | undefined;

    if (outerClass) {
      // Check if outer class name matches superClass name
      if (outerClass.name.toLowerCase() === superClassName) {
        return outerClass;
      }
    }
  }

  // Otherwise, search for parent class by name
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
  // Methods can have parentId pointing to either the class block or the class symbol
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
 * Find a method in parent class hierarchy (same-file only for TIER 1)
 *
 * Note: This only checks same-file parent classes. In Apex, superclasses
 * are typically in separate files, so this will only catch:
 * - Inner classes extending outer classes
 * - Multiple classes in the same file (uncommon)
 */
function findParentMethod(
  method: MethodSymbol,
  childClass: TypeSymbol,
  allSymbols: ApexSymbol[],
  tier: ValidationTier,
): MethodSymbol | null {
  if (!childClass.superClass) {
    return null;
  }

  // Only check same-file parent (TIER 1 limitation)
  const parentClass = findParentClassInSameFile(childClass, allSymbols);
  if (!parentClass) {
    return null; // Parent not in same file - skip for TIER 1
  }

  // Find method in parent class with matching signature
  const parentMethods = findMethodsInClass(parentClass, allSymbols, tier);
  for (const parentMethod of parentMethods) {
    if (
      areMethodSignaturesIdentical(method, parentMethod, tier) &&
      parentMethod.kind === SymbolKind.Method
    ) {
      return parentMethod;
    }
  }

  // Recursively check parent's parent (for same-file inheritance chain)
  return findParentMethod(method, parentClass, allSymbols, tier);
}

/**
 * Validates method override semantics.
 *
 * Rules:
 * - Methods with @Override must actually override a parent method
 * - Methods that override parent methods must have @Override
 * - Override methods cannot reduce visibility
 * - Cannot override non-virtual, non-abstract methods
 *
 * IMPORTANT LIMITATION: In Apex, superclasses are typically in separate files
 * (e.g., Parent.cls and Child.cls). This TIER 1 validator only checks same-file
 * cases, which include:
 * - Inner classes extending their outer class (confirmed valid in Apex)
 *   (e.g., `public class Inner extends OuterClass` where OuterClass is the containing class)
 * - Inner classes extending other inner classes in the same file
 *   (e.g., `InnerClass2 extends InnerClass1` where both are inner classes)
 * - Multiple top-level classes in the same file (uncommon)
 *
 * WARNING: This validator has limited utility as a TIER 1 validator because:
 * 1. Typical Apex inheritance is cross-file (Parent.cls extends Grandparent.cls)
 * 2. Same-file inheritance scenarios are less common than cross-file inheritance
 * 3. The validator will miss the vast majority of override validation scenarios
 *
 * For practical override validation, TIER 2 (THOROUGH) validation with cross-file
 * resolution is required. This TIER 1 validator catches same-file override issues
 * (including inner classes extending outer classes) but will miss cross-file scenarios.
 *
 * @see prioritize-missing-validations.md Phase 2.2
 */
export const MethodOverrideValidator: Validator = {
  id: 'method-override',
  name: 'Method Override Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 9, // Run after ExpressionTypeValidator
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

      // Get all methods
      const methods = allSymbols.filter(
        (symbol) => isMethodSymbol(symbol) && symbol.kind === SymbolKind.Method,
      ) as MethodSymbol[];

      // For each method, check override rules
      for (const method of methods) {
        // Find the class containing this method
        // Methods have parentId pointing to class blocks, not class symbols
        // So we need to find the block first, then get its parent class
        let containingClass: TypeSymbol | undefined;

        // First, try direct match (in case parentId points to class symbol)
        containingClass = classes.find((c) => c.id === method.parentId);

        // If not found, method.parentId points to a class block
        if (!containingClass) {
          const methodBlock = allSymbols.find(
            (s) => isBlockSymbol(s) && s.id === method.parentId,
          ) as ScopeSymbol | undefined;

          if (methodBlock && methodBlock.scopeType === 'class') {
            // Class block's parentId points to the class symbol
            containingClass = classes.find(
              (c) => c.id === methodBlock.parentId,
            );
          }
        }

        if (!containingClass) {
          continue; // Method not in a class (shouldn't happen)
        }

        // Check 1: Method has @Override but doesn't override anything
        if (method.modifiers.isOverride) {
          const parentMethod = findParentMethod(
            method,
            containingClass,
            allSymbols,
            tier,
          );

          if (!parentMethod) {
            // @Override specified but no matching parent method found in same file
            // Check if parent class exists in same file - if it does, this is an error
            const parentClass = findParentClassInSameFile(
              containingClass,
              allSymbols,
            );
            if (parentClass) {
              // Parent class exists in same file but method doesn't override anything
              errors.push({
                message: localizeTyped(
                  ErrorCodes.METHOD_DOES_NOT_OVERRIDE,
                  method.name,
                ),
                location: method.location,
                code: ErrorCodes.METHOD_DOES_NOT_OVERRIDE,
              });
            }
            // Skip other checks for this method
            continue;
          }

          // Check 2: Cannot override static methods
          if (parentMethod.modifiers.isStatic) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.CANNOT_OVERRIDE_STATIC_METHOD,
                parentMethod.name,
                method.name,
              ),
              location: method.location,
              code: ErrorCodes.CANNOT_OVERRIDE_STATIC_METHOD,
            });
            // Skip other checks for this method
            continue;
          }

          // Check 3: Cannot override non-virtual, non-abstract methods
          if (
            !parentMethod.modifiers.isVirtual &&
            !parentMethod.modifiers.isAbstract
          ) {
            // Find parent class to check if it's virtual
            const parentClass = findParentClassInSameFile(
              containingClass,
              allSymbols,
            );

            if (
              parentClass &&
              !parentClass.modifiers.isVirtual &&
              !parentClass.modifiers.isAbstract
            ) {
              // Parent class is not virtual/abstract, so cannot override any methods in it
              errors.push({
                message: localizeTyped(
                  ErrorCodes.NON_VIRTUAL_METHODS_CANNOT_OVERRIDE,
                ),
                location: method.location,
                code: ErrorCodes.NON_VIRTUAL_METHODS_CANNOT_OVERRIDE,
              });
            } else {
              // Parent class is virtual, but the specific method is not virtual/abstract
              // So @Override doesn't actually override anything
              errors.push({
                message: localizeTyped(
                  ErrorCodes.METHOD_DOES_NOT_OVERRIDE,
                  method.name,
                ),
                location: method.location,
                code: ErrorCodes.METHOD_DOES_NOT_OVERRIDE,
              });
            }
            // Skip other checks for this method
            continue;
          }

          // Check 4: Cannot reduce visibility in override
          const methodVisibility = method.modifiers.visibility;
          const parentVisibility = parentMethod.modifiers.visibility;

          if (compareVisibility(methodVisibility, parentVisibility) < 0) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.CANNOT_REDUCE_METHOD_VISIBILITY_OVERRIDE,
                method.name,
              ),
              location: method.location,
              code: ErrorCodes.CANNOT_REDUCE_METHOD_VISIBILITY_OVERRIDE,
            });
          }
        } else {
          // Check 5: Method overrides parent but doesn't have @Override
          const parentMethod = findParentMethod(
            method,
            containingClass,
            allSymbols,
            tier,
          );

          if (parentMethod) {
            // Check if parent method is static - cannot override static methods
            if (parentMethod.modifiers.isStatic) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.CANNOT_OVERRIDE_STATIC_METHOD,
                  parentMethod.name,
                  method.name,
                ),
                location: method.location,
                code: ErrorCodes.CANNOT_OVERRIDE_STATIC_METHOD,
              });
            } else {
              // Method overrides parent but missing @Override
              errors.push({
                message: localizeTyped(
                  ErrorCodes.METHODS_MUST_OVERRIDE,
                  method.name,
                ),
                location: method.location,
                code: ErrorCodes.METHODS_MUST_OVERRIDE,
              });
            }
          }
        }
      }

      yield* Effect.logDebug(
        `MethodOverrideValidator: checked ${methods.length} methods, found ${errors.length} override violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
