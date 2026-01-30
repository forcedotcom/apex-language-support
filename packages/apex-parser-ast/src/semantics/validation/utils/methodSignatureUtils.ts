/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Shared utility functions for method signature validation.
 *
 * Architecture:
 * - Listeners (during compilation): Synchronous, TIER 1 (IMMEDIATE) checks only
 *   - Cannot call Effect-based validators directly
 *   - Use these utilities for same-file duplicate detection
 *   - Aligned with ValidationTier.IMMEDIATE (fast, same-file only)
 *
 * - Validators (during semantic validation): Effect-based, can do TIER 1 or TIER 2
 *   - Receive ValidationOptions.tier to know which phase they're in
 *   - TIER 1: Same-file checks (like listeners)
 *   - TIER 2: Cross-file checks with artifact loading
 *   - Use these utilities for consistent signature comparison
 *
 * This ensures:
 * 1. No code duplication between listener and validator
 * 2. Consistent duplicate detection logic
 * 3. Listener stays synchronous (no Effect dependencies)
 * 4. Validators can adapt behavior based on options.tier
 */

import type { MethodSymbol, ApexSymbol } from '../../../types/symbol';
import { isMethodSymbol } from '../../../utils/symbolNarrowing';
import { ValidationTier } from '../ValidationTier';

/**
 * Check if two methods have identical signatures.
 *
 * Signatures are identical if:
 * 1. Method names are equal (case-insensitive) - Apex is case-insensitive
 * 2. Parameter counts are equal
 * 3. Parameter types are equal
 *
 * Type comparison behavior depends on the validation tier:
 * - TIER 1 (IMMEDIATE): Uses originalTypeString comparison only (exact match).
 *   If originalTypeString doesn't match exactly, it's NOT considered a duplicate
 *   (conservative approach). This is fast and avoids hardcoding namespace knowledge.
 * - TIER 2 (THOROUGH): Uses resolved type information (type.name) to determine
 *   semantic equality. This catches cases like String vs System.String but requires
 *   full type resolution.
 *
 * This function is used by validators during semantic validation.
 *
 * @param method1 - First method to compare
 * @param method2 - Second method to compare
 * @param tier - Validation tier (IMMEDIATE or THOROUGH)
 * @returns True if the methods have identical signatures
 */
export function areMethodSignaturesIdentical(
  method1: MethodSymbol | ApexSymbol,
  method2: MethodSymbol | ApexSymbol,
  tier: ValidationTier = ValidationTier.IMMEDIATE,
): boolean {
  // Ensure both are MethodSymbols
  if (!isMethodSymbol(method1) || !isMethodSymbol(method2)) {
    return false;
  }

  // 1. Compare names (case-insensitive) - Apex is case-insensitive
  if (method1.name.toLowerCase() !== method2.name.toLowerCase()) {
    return false;
  }

  // 2. Compare parameter counts
  const params1 = method1.parameters || [];
  const params2 = method2.parameters || [];
  if (params1.length !== params2.length) {
    return false;
  }

  // 3. Compare parameter types based on tier
  for (let i = 0; i < params1.length; i++) {
    let param1Type: string;
    let param2Type: string;

    if (tier === ValidationTier.THOROUGH) {
      // TIER 2: Use resolved type information (type.name) for semantic equality
      // This catches cases like String vs System.String through type resolution
      param1Type =
        params1[i].type?.name?.toLowerCase() ||
        params1[i].type?.originalTypeString?.toLowerCase() ||
        '';
      param2Type =
        params2[i].type?.name?.toLowerCase() ||
        params2[i].type?.originalTypeString?.toLowerCase() ||
        '';
    } else {
      // TIER 1: Use originalTypeString only (exact match, conservative)
      // If originalTypeString doesn't match exactly, it's NOT a duplicate
      param1Type = params1[i].type?.originalTypeString?.toLowerCase() || '';
      param2Type = params2[i].type?.originalTypeString?.toLowerCase() || '';

      // If either originalTypeString is missing, fall back to name
      // (but this should be rare - originalTypeString should always be set)
      if (!param1Type && params1[i].type?.name) {
        param1Type = params1[i].type.name.toLowerCase();
      }
      if (!param2Type && params2[i].type?.name) {
        param2Type = params2[i].type.name.toLowerCase();
      }
    }

    if (param1Type !== param2Type) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a method signature matches an existing method by comparing
 * name and parameter types from string representations.
 *
 * This is used by the listener during compilation when we have:
 * - Existing method symbols (with type info)
 * - Current method being parsed (with parameter type strings from context)
 *
 * @param existingMethod - Method symbol already in symbol table
 * @param methodName - Name of method being checked (case-insensitive comparison)
 * @param parameterTypeStrings - Array of parameter type strings from parser context
 * @returns True if signatures match
 */
export function doesMethodSignatureMatch(
  existingMethod: ApexSymbol,
  methodName: string,
  parameterTypeStrings: string[],
): boolean {
  if (!isMethodSymbol(existingMethod)) {
    return false;
  }

  // 1. Compare names (case-insensitive)
  if (existingMethod.name.toLowerCase() !== methodName.toLowerCase()) {
    return false;
  }

  // 2. Compare parameter counts
  const existingParams = existingMethod.parameters || [];
  if (existingParams.length !== parameterTypeStrings.length) {
    return false;
  }

  // 3. Compare parameter types (case-insensitive)
  // Listener is always TIER 1, so use originalTypeString comparison only (exact match)
  // This is conservative: if originalTypeString doesn't match exactly, it's NOT a duplicate
  for (let i = 0; i < existingParams.length; i++) {
    const existingType =
      existingParams[i].type?.originalTypeString?.toLowerCase() ||
      existingParams[i].type?.name?.toLowerCase() ||
      '';
    const currentType = parameterTypeStrings[i]?.toLowerCase() || '';

    if (existingType !== currentType) {
      return false;
    }
  }

  return true;
}
