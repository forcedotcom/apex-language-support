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
 * - Final: `final class Parent { }` and `class Child extends Parent { }` → Error
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
          // Check 3: Cannot extend final class
          if (superClass.modifiers.isFinal) {
            errors.push({
              message: `Class '${cls.name}' cannot extend final class '${superClass.name}'`,
              location: cls.location,
              code: 'EXTEND_FINAL_CLASS',
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

      // Try to load missing superclasses if artifact loading is available
      let loadedClasses: TypeSymbol[] = [];
      if (missingSuperclasses.length > 0 && options.symbolManager) {
        yield* Effect.logDebug(
          `Found ${missingSuperclasses.length} missing superclasses, ` +
            'attempting to load from symbol manager',
        );

        const helper = yield* ArtifactLoadingHelper;
        const loadResult = yield* helper.loadMissingArtifacts(
          missingSuperclasses,
          options,
        );

        // Get loaded classes from symbol manager
        const symbolManager = yield* ISymbolManager;
        for (const typeName of [
          ...loadResult.loaded,
          ...loadResult.alreadyLoaded,
        ]) {
          const symbols = symbolManager.findSymbolByName(typeName);
          const classSymbol = symbols.find(
            (s: ApexSymbol) => s.kind === SymbolKind.Class,
          ) as TypeSymbol | undefined;

          if (classSymbol) {
            loadedClasses.push(classSymbol);
            yield* Effect.logDebug(
              `Loaded class '${typeName}' from symbol manager`,
            );
          }
        }
      }

      // Combine local and loaded classes for validation
      const allClasses = [...classes, ...loadedClasses];

      // Get classes from symbol manager for cross-file circular detection
      let allClassesForCircularCheck = [...allClasses];
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
            allClassesForCircularCheck.push(mgrClass);
            classNames.add(mgrClass.name.toLowerCase());
          }
        }
      }

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
            message:
              `Class '${cls.name}' has circular inheritance hierarchy: ` +
              circularPath.join(' -> '),
            location: cls.location,
            code: 'CIRCULAR_INHERITANCE',
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
        if (superClass.modifiers.isFinal) {
          errors.push({
            message: `Class '${cls.name}' cannot extend final class '${superClass.name}'`,
            location: cls.location,
            code: 'EXTEND_FINAL_CLASS',
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
