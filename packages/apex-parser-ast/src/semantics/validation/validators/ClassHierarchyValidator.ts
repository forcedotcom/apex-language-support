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
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import type {
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import type { Validator } from '../ValidatorRegistry';
import {
  ArtifactLoadingHelper,
  ISymbolManager,
} from '../ArtifactLoadingHelper';
import { ErrorCodes } from '../ErrorCodes';
import { I18nSupport } from '../../../i18n/I18nSupport';

/**
 * Validates class hierarchy correctness.
 *
 * This validator checks for:
 * 1. Circular inheritance in class hierarchies (class A extends B extends A)
 * 2. Missing superclasses (the extended class doesn't exist)
 * 3. Final class extension (a class cannot extend a final class)
 * 4. Invalid superclass types (superclass must be a class, not interface/enum)
 *
 * Examples:
 * - Circular: `class A extends B { }` and `class B extends A { }`
 * - Missing: `class Child extends NonExistentParent { }`
 * - Final: `class Parent { }` (final by default) and `class Child extends Parent { }` → Error
 * - Virtual: `virtual class Parent { }` and `class Child extends Parent { }` → Valid
 * - Invalid: `class Child extends SomeInterface { }` → Error
 *
 * This is a TIER 2 (THOROUGH) validation that may require artifact loading
 * to resolve class definitions from other files.
 *
 * Error Messages:
 * - "Class '{name}' has circular inheritance hierarchy"
 * - "Class '{name}' cannot extend final class '{superClass}'"
 * - "Class '{name}' cannot extend '{superClass}' (expected class, found {kind})"
 *
 * @see SEMANTIC_SYMBOL_RULES.md (class hierarchy rules)
 */
export const ClassHierarchyValidator: Validator = {
  id: 'class-hierarchy',
  name: 'Class Hierarchy Validator',
  tier: ValidationTier.THOROUGH,
  priority: 1,
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: true,
    requiresCrossFileResolution: true,
  },

  validate: (symbolTable: SymbolTable, options: ValidationOptions) =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Filter to class symbols
      const classes = allSymbols.filter(
        (symbol) => symbol.kind === SymbolKind.Class,
      ) as TypeSymbol[];

      // Check 1: Missing superclasses and invalid types (first pass)
      const missingSuperclasses: string[] = [];
      for (const cls of classes) {
        if (!cls.superClass) {
          continue; // No extends clause
        }

        // Find superclass in current file
        const superClass = classes.find(
          (c) => c.name.toLowerCase() === cls.superClass!.toLowerCase(),
        );

        if (!superClass) {
          // Superclass not found - may need artifact loading
          if (!missingSuperclasses.includes(cls.superClass)) {
            missingSuperclasses.push(cls.superClass);
          }
        } else {
          // Check 3: Cannot extend non-virtual (final-by-default) class
          // In Apex, classes are final by default. Only virtual or abstract classes can be extended.
          // Note: The 'final' keyword cannot be used on classes in Apex.
          if (
            !superClass.modifiers.isVirtual &&
            !superClass.modifiers.isAbstract
          ) {
            errors.push({
              message: I18nSupport.getLabel(
                ErrorCodes.INVALID_FINAL_SUPER_TYPE,
                superClass.name,
              ),
              location: cls.location,
              code: ErrorCodes.INVALID_FINAL_SUPER_TYPE,
            });
          }

          // Check 4: Superclass must be a class (not interface/enum)
          // This is already enforced by finding in classes array, but validate explicitly
          if (superClass.kind !== SymbolKind.Class) {
            errors.push({
              message:
                `Class '${cls.name}' cannot extend '${superClass.name}' ` +
                `(expected class, found ${superClass.kind})`,
              location: cls.location,
              code: 'INVALID_SUPERCLASS_TYPE',
            });
          }
        }
      }

      // Try to find missing superclasses in symbol manager first (from opened documents)
      let loadedClasses: TypeSymbol[] = [];
      if (missingSuperclasses.length > 0 && options.symbolManager) {
        const symbolManager = yield* ISymbolManager;

        // First, check if classes are already in symbol manager (from opened documents)
        const foundInManager: TypeSymbol[] = [];
        const stillMissing: string[] = [];

        for (const typeName of missingSuperclasses) {
          const symbols = symbolManager.findSymbolByName(typeName);
          const classSymbol = symbols.find(
            (s: ApexSymbol) => s.kind === SymbolKind.Class,
          ) as TypeSymbol | undefined;

          if (classSymbol) {
            foundInManager.push(classSymbol);
            yield* Effect.logDebug(
              `Found class '${typeName}' already in symbol manager`,
            );
          } else {
            stillMissing.push(typeName);
          }
        }

        loadedClasses.push(...foundInManager);

        // Only attempt artifact loading for classes not found in symbol manager
        if (stillMissing.length > 0) {
          yield* Effect.logDebug(
            `Found ${stillMissing.length} missing superclasses, ` +
              'attempting to load from artifact loader',
          );

          const helper = yield* ArtifactLoadingHelper;
          const loadResult = yield* helper.loadMissingArtifacts(
            stillMissing,
            options,
          );

          // Get newly loaded classes from symbol manager
          for (const typeName of [
            ...loadResult.loaded,
            ...loadResult.alreadyLoaded,
          ]) {
            const symbols = symbolManager.findSymbolByName(typeName);
            const classSymbol = symbols.find(
              (s: ApexSymbol) => s.kind === SymbolKind.Class,
            ) as TypeSymbol | undefined;

            if (classSymbol && !foundInManager.includes(classSymbol)) {
              loadedClasses.push(classSymbol);
              yield* Effect.logDebug(
                `Loaded class '${typeName}' from artifact loader`,
              );
            }
          }
        }
      }

      // Combine local and loaded classes for validation
      // Also include classes already in symbol manager (from opened documents)
      let allClasses = [...classes, ...loadedClasses];
      if (options.symbolManager) {
        const symbolManager = yield* ISymbolManager;
        // Get all symbols from symbol manager and filter to classes
        // Use getAllSymbolsForCompletion() which is available on ISymbolManager interface
        const allSymbolsFromManager =
          symbolManager.getAllSymbolsForCompletion();
        const managerClasses = allSymbolsFromManager.filter(
          (s: ApexSymbol) => s.kind === SymbolKind.Class,
        ) as TypeSymbol[];

        // Merge with current classes, avoiding duplicates
        const classNames = new Set(allClasses.map((c) => c.name.toLowerCase()));
        for (const mgrClass of managerClasses) {
          if (!classNames.has(mgrClass.name.toLowerCase())) {
            allClasses.push(mgrClass);
            classNames.add(mgrClass.name.toLowerCase());
          }
        }
      }

      // Get classes from symbol manager for cross-file circular detection
      const allClassesForCircularCheck = [...allClasses];

      // Check 2: Circular inheritance in class hierarchies
      // Check AFTER artifact loading so we have all classes available
      // Check each local class for circular inheritance (using allClassesForCircularCheck for cross-file detection)
      for (const cls of classes) {
        const circularPath = detectCircularInheritance(
          cls,
          allClassesForCircularCheck,
          [],
          new Set(),
        );
        if (circularPath) {
          errors.push({
            message: I18nSupport.getLabel(
              ErrorCodes.CIRCULAR_INHERITANCE,
              cls.name,
            ),
            location: cls.location,
            code: ErrorCodes.CIRCULAR_INHERITANCE,
          });
        }
      }

      // Second pass: validate with potentially loaded classes
      for (const cls of classes) {
        if (!cls.superClass) {
          continue;
        }

        // Find the superclass (check both local and loaded)
        const superClass = allClasses.find(
          (c) => c.name.toLowerCase() === cls.superClass!.toLowerCase(),
        );

        if (!superClass) {
          // Superclass not found even after attempting to load
          warnings.push({
            message:
              `Superclass '${cls.superClass}' extended by class '${cls.name}' ` +
              'not found in current file or symbol manager',
            location: cls.location,
            code: 'MISSING_SUPERCLASS',
          });
          continue;
        }

        // Check final class extension (re-check with loaded classes)
        // In Apex, classes are final by default. Only virtual or abstract classes can be extended.
        // Note: The 'final' keyword cannot be used on classes in Apex.
        if (
          !superClass.modifiers.isVirtual &&
          !superClass.modifiers.isAbstract
        ) {
          errors.push({
            message: I18nSupport.getLabel(
              ErrorCodes.INVALID_FINAL_SUPER_TYPE,
              superClass.name,
            ),
            location: cls.location,
            code: ErrorCodes.INVALID_FINAL_SUPER_TYPE,
          });
        }

        // Check invalid type (shouldn't happen if loaded correctly, but validate)
        if (superClass.kind !== SymbolKind.Class) {
          errors.push({
            message:
              `Class '${cls.name}' cannot extend '${superClass.name}' ` +
              `(expected class, found ${superClass.kind})`,
            location: cls.location,
            code: 'INVALID_SUPERCLASS_TYPE',
          });
        }
      }

      yield* Effect.logDebug(
        `ClassHierarchyValidator: checked ${classes.length} classes, ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};

/**
 * Detect circular inheritance in class hierarchy.
 * Similar to interface circular detection but for classes.
 *
 * @param cls - The class to check
 * @param allClasses - All classes in the symbol table
 * @param visited - Path of classes visited so far
 * @param visitedSet - Set for O(1) lookup
 * @returns The circular path if found, null otherwise
 */
function detectCircularInheritance(
  cls: TypeSymbol,
  allClasses: TypeSymbol[],
  visited: string[],
  visitedSet: Set<string>,
): string[] | null {
  const className = cls.name.toLowerCase();

  // Check if we've seen this class before in the current path
  if (visitedSet.has(className)) {
    // Found a cycle - return the path from the cycle point
    const cycleStart = visited.findIndex((v) => v.toLowerCase() === className);
    return [...visited.slice(cycleStart), cls.name];
  }

  // Add to visited
  visited.push(cls.name);
  visitedSet.add(className);

  // Check the superclass
  if (cls.superClass) {
    const superClass = allClasses.find(
      (c) => c.name.toLowerCase() === cls.superClass!.toLowerCase(),
    );

    if (superClass) {
      const cycle = detectCircularInheritance(
        superClass,
        allClasses,
        visited,
        visitedSet,
      );
      if (cycle) {
        return cycle;
      }
    }
    // If superclass is not found in allClasses, we can't continue the cycle detection
    // This is expected when classes are missing (not compiled yet)
    // The cycle detection will be incomplete, but that's okay - we can only detect
    // cycles for classes that are available
  }

  // Remove from visited (backtrack)
  visited.pop();
  visitedSet.delete(className);

  return null;
}
