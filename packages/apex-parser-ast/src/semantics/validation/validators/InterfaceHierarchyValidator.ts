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
 * Validates interface hierarchy correctness.
 *
 * This validator checks for:
 * 1. Circular inheritance in interfaces (interface A extends B extends A)
 * 2. Duplicate interfaces in extends clause (interface A extends B, B)
 * 3. Classes implementing all required methods from interfaces
 *
 * Examples:
 * - Circular: `interface A extends B { }` and `interface B extends A { }`
 * - Duplicate: `interface A extends B, B { }`
 * - Unimplemented: `class C implements I { }` missing method from I
 *
 * This is a TIER 2 (THOROUGH) validation that may require artifact loading
 * to resolve interface definitions from other files.
 *
 * Error Messages:
 * - "Interface '{name}' has circular inheritance hierarchy"
 * - "Interface '{name}' extends '{parent}' multiple times"
 * - "Class '{name}' does not implement method '{method}' from interface '{interface}'"
 *
 * @see SEMANTIC_SYMBOL_RULES.md (interface hierarchy rules)
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #9
 */
export const InterfaceHierarchyValidator: Validator = {
  id: 'interface-hierarchy',
  name: 'Interface Hierarchy Validator',
  tier: ValidationTier.THOROUGH,
  priority: 1,

  validate: (symbolTable: SymbolTable, _options: ValidationOptions) =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Filter to interface and class symbols
      const interfaces = allSymbols.filter(
        (symbol) => symbol.kind === SymbolKind.Interface,
      ) as TypeSymbol[];

      const classes = allSymbols.filter(
        (symbol) => symbol.kind === SymbolKind.Class,
      ) as TypeSymbol[];

      // Check 1: Circular inheritance in interfaces
      for (const iface of interfaces) {
        const circularPath = detectCircularInheritance(
          iface,
          interfaces,
          [],
          new Set(),
        );
        if (circularPath) {
          errors.push({
            message:
              `Interface '${iface.name}' has circular inheritance hierarchy: ` +
              circularPath.join(' -> '),
            location: iface.location,
            code: 'CIRCULAR_INHERITANCE',
          });
        }
      }

      // Check 2: Duplicate extends
      for (const iface of interfaces) {
        const duplicates = findDuplicateExtends(iface);
        for (const dup of duplicates) {
          errors.push({
            message: `Interface '${iface.name}' extends '${dup}' multiple times`,
            location: iface.location,
            code: 'DUPLICATE_EXTENDS',
          });
        }
      }

      // Check 3: Class interface implementation
      // First pass: identify missing interfaces
      const missingInterfaces: string[] = [];
      for (const cls of classes) {
        if (cls.modifiers.isAbstract) {
          continue;
        }

        const implementedInterfaces = cls.interfaces || [];
        for (const ifaceName of implementedInterfaces) {
          const iface = interfaces.find(
            (i) => i.name.toLowerCase() === ifaceName.toLowerCase(),
          );

          if (!iface && !missingInterfaces.includes(ifaceName)) {
            missingInterfaces.push(ifaceName);
          }
        }
      }

      // Try to load missing interfaces if artifact loading is available
      let loadedInterfaces: TypeSymbol[] = [];
      if (missingInterfaces.length > 0 && _options.symbolManager) {
        yield* Effect.logDebug(
          `Found ${missingInterfaces.length} missing interfaces, ` +
            'attempting to load from symbol manager',
        );

        const helper = yield* ArtifactLoadingHelper;
        const loadResult = yield* helper.loadMissingArtifacts(
          missingInterfaces,
          _options,
        );

        // Get loaded interfaces from symbol manager
        const symbolManager = yield* ISymbolManager;
        for (const typeName of [
          ...loadResult.loaded,
          ...loadResult.alreadyLoaded,
        ]) {
          const symbols = symbolManager.findSymbolByName(typeName);
          const ifaceSymbol = symbols.find(
            (s: ApexSymbol) => s.kind === SymbolKind.Interface,
          ) as TypeSymbol | undefined;

          if (ifaceSymbol) {
            loadedInterfaces.push(ifaceSymbol);
            yield* Effect.logDebug(
              `Loaded interface '${typeName}' from symbol manager`,
            );
          }
        }
      }

      // Combine local and loaded interfaces for validation
      const allInterfaces = [...interfaces, ...loadedInterfaces];

      // Second pass: validate with potentially loaded interfaces
      for (const cls of classes) {
        // Skip abstract classes (they can have unimplemented methods)
        if (cls.modifiers.isAbstract) {
          continue;
        }

        const implementedInterfaces = cls.interfaces || [];
        for (const ifaceName of implementedInterfaces) {
          // Find the interface (check both local and loaded)
          const iface = allInterfaces.find(
            (i) => i.name.toLowerCase() === ifaceName.toLowerCase(),
          );

          if (!iface) {
            // Interface not found even after attempting to load
            warnings.push({
              message:
                `Interface '${ifaceName}' implemented by class '${cls.name}' ` +
                'not found in current file or symbol manager',
              location: cls.location,
              code: 'MISSING_INTERFACE',
            });
            continue;
          }

          // Get all methods required by the interface (including inherited)
          const requiredMethods = getAllInterfaceMethods(
            iface,
            allInterfaces,
            allSymbols,
          );

          // Get all methods implemented by the class
          const classMethods = allSymbols.filter(
            (s) => s.kind === SymbolKind.Method && s.parentId === cls.id,
          ) as MethodSymbol[];

          // Check each required method is implemented
          for (const requiredMethod of requiredMethods) {
            const implemented = classMethods.some((m) =>
              isMethodImplemented(m, requiredMethod),
            );

            if (!implemented) {
              errors.push({
                message:
                  `Class '${cls.name}' does not implement method ` +
                  `'${requiredMethod.name}' from interface '${ifaceName}'`,
                location: cls.location,
                code: 'MISSING_INTERFACE_METHOD',
              });
            }
          }
        }
      }

      yield* Effect.logDebug(
        `InterfaceHierarchyValidator: checked ${interfaces.length} interfaces ` +
          `and ${classes.length} classes, found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};

/**
 * Detect circular inheritance in interface hierarchy.
 *
 * @param iface - The interface to check
 * @param allInterfaces - All interfaces in the symbol table
 * @param visited - Path of interfaces visited so far
 * @param visitedSet - Set for O(1) lookup
 * @returns The circular path if found, null otherwise
 */
function detectCircularInheritance(
  iface: TypeSymbol,
  allInterfaces: TypeSymbol[],
  visited: string[],
  visitedSet: Set<string>,
): string[] | null {
  const ifaceName = iface.name.toLowerCase();

  // Check if we've seen this interface before in the current path
  if (visitedSet.has(ifaceName)) {
    // Found a cycle - return the path from the cycle point
    const cycleStart = visited.findIndex((v) => v.toLowerCase() === ifaceName);
    return [...visited.slice(cycleStart), iface.name];
  }

  // Add to visited
  visited.push(iface.name);
  visitedSet.add(ifaceName);

  // Check all interfaces this one extends
  const extendedInterfaces = iface.interfaces || [];
  for (const extendedName of extendedInterfaces) {
    const extended = allInterfaces.find(
      (i) => i.name.toLowerCase() === extendedName.toLowerCase(),
    );

    if (extended) {
      const cycle = detectCircularInheritance(
        extended,
        allInterfaces,
        visited,
        visitedSet,
      );
      if (cycle) {
        return cycle;
      }
    }
  }

  // Remove from visited (backtrack)
  visited.pop();
  visitedSet.delete(ifaceName);

  return null;
}

/**
 * Find duplicate interface names in extends clause.
 *
 * @param iface - The interface to check
 * @returns Array of duplicate interface names
 */
function findDuplicateExtends(iface: TypeSymbol): string[] {
  const extendedInterfaces = iface.interfaces || [];
  const seen = new Map<string, number>();
  const duplicates: string[] = [];

  for (const ifaceName of extendedInterfaces) {
    const lowerName = ifaceName.toLowerCase();
    const count = seen.get(lowerName) || 0;

    if (count > 0 && !duplicates.includes(ifaceName)) {
      duplicates.push(ifaceName);
    }

    seen.set(lowerName, count + 1);
  }

  return duplicates;
}

/**
 * Get all methods required by an interface, including inherited methods.
 *
 * @param iface - The interface to get methods for
 * @param allInterfaces - All interfaces in the symbol table
 * @param allSymbols - All symbols in the symbol table
 * @returns Array of all required methods
 */
function getAllInterfaceMethods(
  iface: TypeSymbol,
  allInterfaces: TypeSymbol[],
  allSymbols: ApexSymbol[],
): MethodSymbol[] {
  const methods = new Map<string, MethodSymbol>();
  const visited = new Set<string>();

  function collectMethods(currentIface: TypeSymbol) {
    const ifaceName = currentIface.name.toLowerCase();
    if (visited.has(ifaceName)) {
      return; // Avoid infinite loops
    }
    visited.add(ifaceName);

    // Add methods from this interface (stored as child symbols)
    const ifaceMethods = allSymbols.filter(
      (s) => s.kind === SymbolKind.Method && s.parentId === currentIface.id,
    ) as MethodSymbol[];

    for (const method of ifaceMethods) {
      // Use method signature as key to avoid duplicates
      const signature = getMethodSignature(method);
      if (!methods.has(signature)) {
        methods.set(signature, method);
      }
    }

    // Recursively collect from extended interfaces
    const extendedInterfaces = currentIface.interfaces || [];
    for (const extendedName of extendedInterfaces) {
      const extended = allInterfaces.find(
        (i) => i.name.toLowerCase() === extendedName.toLowerCase(),
      );
      if (extended) {
        collectMethods(extended);
      }
    }
  }

  collectMethods(iface);
  return Array.from(methods.values());
}

/**
 * Get a unique signature for a method (for deduplication).
 *
 * @param method - The method to get signature for
 * @returns A unique signature string
 */
function getMethodSignature(method: MethodSymbol): string {
  const paramTypes = method.parameters.map((p) => p.type.name.toLowerCase());
  return `${method.name.toLowerCase()}(${paramTypes.join(',')})`;
}

/**
 * Check if a class method implements a required interface method.
 *
 * Methods match if they have the same name (case-insensitive) and
 * same parameter signature.
 *
 * @param classMethod - The method in the class
 * @param interfaceMethod - The required method from the interface
 * @returns True if the class method implements the interface method
 */
function isMethodImplemented(
  classMethod: MethodSymbol,
  interfaceMethod: MethodSymbol,
): boolean {
  // Compare names (case-insensitive)
  if (classMethod.name.toLowerCase() !== interfaceMethod.name.toLowerCase()) {
    return false;
  }

  // Compare parameter counts
  if (classMethod.parameters.length !== interfaceMethod.parameters.length) {
    return false;
  }

  // Compare parameter types
  for (let i = 0; i < classMethod.parameters.length; i++) {
    const classParamType = classMethod.parameters[i].type.name.toLowerCase();
    const ifaceParamType =
      interfaceMethod.parameters[i].type.name.toLowerCase();

    if (classParamType !== ifaceParamType) {
      return false;
    }
  }

  return true;
}
